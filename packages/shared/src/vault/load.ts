import { access } from "node:fs/promises";
import { join } from "node:path";
import { AccessoriesFile } from "../schemas/accessory";
import { AuthorityRulesFile } from "../schemas/authority-rule";
import type { AppState, Stats } from "../schemas/events";
import { QueueItem } from "../schemas/queue-item";
import {
  RosterFile,
  RosterLocalFile,
  type RosterSeat,
  type Seat,
  SeatProfile,
} from "../schemas/seat";
import { Task } from "../schemas/task";
import { WorkflowsFile } from "../schemas/workflow";
import { ZonesFile } from "../schemas/zone";
import { listFolders, listMarkdown, readJson, readMarkdown } from "./read";
import { findReferenceProblems } from "./references";

export interface LoadOptions {
  /** Folder with markdown and JSON records, like vault/ or vault.sample/. */
  vaultDir: string;
  /** Folder with roster, workflows and authority rules, usually data/. */
  dataDir: string;
  /** Merge data/roster.local.json when it exists. Off for validation of committed files. */
  includeLocalRoster: boolean;
  /** Used for generatedAt. Tests pass a fixed date. */
  now?: Date;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

function applyOverrides(seat: RosterSeat, local: RosterLocalFile | null): RosterSeat {
  const override = local?.overrides[seat.id];
  if (!override) return seat;
  return {
    ...seat,
    displayName: override.displayName ?? seat.displayName,
    roleTitle: override.roleTitle ?? seat.roleTitle,
    site: override.site ?? seat.site,
    helper: { ...seat.helper, ...override.helper },
  };
}

function countStats(seats: Seat[], state: Pick<AppState, "queue" | "tasks">): Stats {
  return {
    working: seats.filter((seat) => seat.status === "working").length,
    onBreak: seats.filter((seat) => seat.status === "on-break").length,
    inMeeting: seats.filter((seat) => seat.status === "in-meeting").length,
    needsYou: state.queue.filter((item) => item.status === "needs-you").length,
    openTasks: state.tasks.filter((task) => task.status !== "done").length,
  };
}

/**
 * Reads the whole vault plus data/ into one AppState.
 * A broken file never throws. It is skipped and described in `warnings`.
 */
export async function loadVault(options: LoadOptions): Promise<AppState> {
  const { vaultDir, dataDir } = options;
  const warnings: string[] = [];
  const take = <T>(result: { ok: true; value: T } | { ok: false; warning: string }): T | null => {
    if (result.ok) return result.value;
    warnings.push(result.warning);
    return null;
  };

  const roster = take(
    await readJson(join(dataDir, "roster.template.json"), "data/roster.template.json", RosterFile),
  );
  const localPath = join(dataDir, "roster.local.json");
  const local =
    options.includeLocalRoster && (await exists(localPath))
      ? take(await readJson(localPath, "data/roster.local.json", RosterLocalFile))
      : null;
  const workflows = take(
    await readJson(join(dataDir, "workflows.json"), "data/workflows.json", WorkflowsFile),
  );
  const rules = take(
    await readJson(
      join(dataDir, "authority-rules.template.json"),
      "data/authority-rules.template.json",
      AuthorityRulesFile,
    ),
  );
  const zones = take(
    await readJson(join(vaultDir, "office/zones.json"), "office/zones.json", ZonesFile),
  );
  const accessories = take(
    await readJson(
      join(vaultDir, "office/accessories.json"),
      "office/accessories.json",
      AccessoriesFile,
    ),
  );

  const profiles = new Map<string, SeatProfile>();
  for (const folder of await listFolders(join(vaultDir, "team"))) {
    const label = `team/${folder}/profile.md`;
    const profile = take(await readMarkdown(join(vaultDir, label), label, SeatProfile, false));
    if (!profile) continue;
    if (profile.seat !== folder) {
      warnings.push(`Skipped ${label}: "seat" is ${profile.seat} but the folder is ${folder}.`);
      continue;
    }
    profiles.set(profile.seat, profile);
  }

  const queue: QueueItem[] = [];
  for (const name of await listMarkdown(join(vaultDir, "queue"))) {
    const item = take(
      await readMarkdown(join(vaultDir, "queue", name), `queue/${name}`, QueueItem, true),
    );
    if (item) queue.push(item);
  }

  const tasks: Task[] = [];
  for (const name of await listMarkdown(join(vaultDir, "board"))) {
    const task = take(
      await readMarkdown(join(vaultDir, "board", name), `board/${name}`, Task, true),
    );
    if (task) tasks.push(task);
  }

  const seats: Seat[] = (roster?.seats ?? []).map((rosterSeat) => {
    const seat = applyOverrides(rosterSeat, local);
    const profile = profiles.get(seat.id);
    return {
      ...seat,
      status: profile?.status ?? "off-duty",
      workingOn: profile?.workingOn,
      currentWorkflow: profile?.currentWorkflow,
      currentStep: profile?.currentStep,
    };
  });

  const office = { zones: zones?.zones ?? [], accessories: accessories?.accessories ?? [] };
  const workflowList = workflows?.workflows ?? [];

  warnings.push(
    ...findReferenceProblems({
      seats,
      profiles: [...profiles.values()],
      queue,
      tasks,
      office,
      workflows: workflowList,
      authorityRules: rules?.rules ?? [],
      broken: {
        roster: roster === null,
        zones: zones === null,
        workflows: workflows === null,
        rules: rules === null,
      },
    }),
  );

  return {
    generatedAt: (options.now ?? new Date()).toISOString().replace("Z", "+00:00"),
    seats,
    queue,
    tasks,
    office,
    workflows: workflowList,
    authorityRules: rules?.rules ?? [],
    stats: countStats(seats, { queue, tasks }),
    warnings,
  };
}
