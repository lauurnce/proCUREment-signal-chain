import { cp, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppState } from "../schemas/events";
import { parseFrontmatter } from "./frontmatter";
import { loadVault } from "./load";

const repoRoot = resolve(import.meta.dirname, "../../../..");
const dataDir = join(repoRoot, "data");
let vaultDir: string;

beforeEach(async () => {
  vaultDir = await mkdtemp(join(tmpdir(), "hq-vault-"));
  await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
});
afterEach(async () => {
  await rm(vaultDir, { recursive: true, force: true });
});

const load = () => loadVault({ vaultDir, dataDir, includeLocalRoster: false });

describe("loadVault", () => {
  it("reads the sample vault with no warnings and a valid AppState", async () => {
    const state = await load();
    expect(state.warnings).toEqual([]);
    expect(() => AppState.parse(state)).not.toThrow();
    expect(state.seats).toHaveLength(26);
  });

  it("keeps unquoted dates in frontmatter as strings", () => {
    const { data, body } = parseFrontmatter(
      "---\nupdated: 2026-09-25T09:30:00+08:00\n---\n\n# Hi\n",
    );
    expect(data.updated).toBe("2026-09-25T09:30:00+08:00");
    expect(body).toBe("# Hi\n");
  });

  it("skips a broken file with a plain-English warning instead of crashing", async () => {
    await writeFile(
      join(vaultDir, "board", "t-0099.md"),
      "---\nid: t-0099\nstatus: nonsense\n---\n",
    );
    const state = await load();
    expect(state.tasks).toHaveLength(5);
    expect(state.warnings).toHaveLength(1);
    expect(state.warnings[0]).toBe(
      'Skipped board/t-0099.md: "title" is missing, "owner" is missing, "workflow" is missing, and 4 more.',
    );
  });

  it("describes bad YAML in one line with the line number and no full path", async () => {
    await writeFile(join(vaultDir, "board", "t-0097.md"), "---\nid: t-0097\ntitle: [oops\n---\n");
    const [warning] = (await load()).warnings;
    expect(warning).toMatch(/^Skipped board\/t-0097\.md: the frontmatter is not valid YAML/);
    expect(warning).not.toContain(vaultDir);
    expect(warning).not.toContain("\n");
  });

  it("one broken zones file gives one warning, not a flood of follow-on problems", async () => {
    await writeFile(join(vaultDir, "office", "zones.json"), "{ not json");
    expect((await load()).warnings).toEqual(["Skipped office/zones.json: it is not valid JSON."]);
  });

  it("a missing file says it is missing, without the full path", async () => {
    await rm(join(vaultDir, "office", "accessories.json"));
    expect((await load()).warnings).toEqual([
      "Skipped office/accessories.json: the file is missing.",
    ]);
  });

  it("warns when a record points to a seat that does not exist", async () => {
    await writeFile(
      join(vaultDir, "board", "t-0098.md"),
      '---\nid: "t-0098"\ntitle: "x"\nowner: "cm-99"\nworkflow: "cm-rfq-process"\nstatus: "todo"\n' +
        'created: "2026-09-25T08:00:00+08:00"\ndue: "2026-09-26"\nlinks: []\n---\n',
    );
    const state = await load();
    expect(state.warnings).toEqual([
      'Task t-0098 points to seat "cm-99", which is not in the roster',
    ]);
  });

  it("seats without a profile show as off duty", async () => {
    await rm(join(vaultDir, "team", "ops-10"), { recursive: true });
    const state = await load();
    expect(state.seats.find((s) => s.id === "ops-10")?.status).toBe("off-duty");
  });
});
