import type { AuthorityRule } from "../schemas/authority-rule";
import type { OfficeState } from "../schemas/events";
import type { QueueItem } from "../schemas/queue-item";
import type { Seat, SeatProfile } from "../schemas/seat";
import type { Task } from "../schemas/task";
import type { Workflow } from "../schemas/workflow";

export interface ReferenceInput {
  seats: Seat[];
  profiles: SeatProfile[];
  queue: QueueItem[];
  tasks: Task[];
  office: OfficeState;
  workflows: Workflow[];
  authorityRules: AuthorityRule[];
  /**
   * Source files that could not be read. Their checks are skipped, so one broken file
   * gives one warning instead of a long list of follow-on problems.
   */
  broken: { roster: boolean; zones: boolean; workflows: boolean; rules: boolean };
}

/** Checks that ids used in one file point to records that exist. Returns plain-English problems. */
export function findReferenceProblems(input: ReferenceInput): string[] {
  const problems: string[] = [];
  const { broken } = input;
  const seatIds = new Set(input.seats.map((seat) => seat.id));
  const zoneIds = new Set(input.office.zones.map((zone) => zone.id));
  const podIds = new Set(input.office.zones.flatMap((zone) => Object.keys(zone.pods ?? {})));
  const ruleIds = new Set(input.authorityRules.map((rule) => rule.id));
  const workflows = new Map(input.workflows.map((workflow) => [workflow.id, workflow]));

  const checkSeat = (id: string, where: string) => {
    if (broken.roster) return;
    if (!seatIds.has(id))
      problems.push(`${where} points to seat "${id}", which is not in the roster`);
  };
  const checkZone = (id: string, where: string) => {
    if (broken.zones) return;
    if (!zoneIds.has(id))
      problems.push(`${where} points to zone "${id}", which is not in office/zones.json`);
  };
  const checkStep = (workflowId: string, stepId: string | null | undefined, where: string) => {
    if (broken.workflows) return;
    const workflow = workflows.get(workflowId);
    if (!workflow) {
      problems.push(
        `${where} points to workflow "${workflowId}", which is not in data/workflows.json`,
      );
      return;
    }
    if (stepId && !workflow.steps.some((step) => step.id === stepId)) {
      problems.push(
        `${where} points to step "${stepId}", which is not in workflow "${workflowId}"`,
      );
    }
  };

  for (const seat of input.seats) {
    const where = `Seat ${seat.id}`;
    checkZone(seat.zone, where);
    if (seat.pod && !broken.zones && !podIds.has(seat.pod))
      problems.push(`${where} points to pod "${seat.pod}", which no zone has`);
    if (seat.defaultApprover) checkSeat(seat.defaultApprover, where);
    for (const workflowId of seat.workflows) checkStep(workflowId, null, where);
  }

  for (const profile of input.profiles) {
    const where = `team/${profile.seat}/profile.md`;
    checkSeat(profile.seat, where);
    if (profile.currentWorkflow) checkStep(profile.currentWorkflow, profile.currentStep, where);
  }

  for (const zone of input.office.zones) {
    for (const seatId of [...(zone.seats ?? []), ...Object.values(zone.pods ?? {}).flat()]) {
      checkSeat(seatId, `Zone ${zone.id}`);
    }
  }

  for (const accessory of input.office.accessories) {
    checkZone(accessory.zone, `Accessory ${accessory.id}`);
  }

  for (const workflow of input.workflows) {
    const where = `Workflow ${workflow.id}`;
    for (const step of workflow.steps) {
      if (step.zone !== "own-desk") checkZone(step.zone, `${where}, step ${step.id},`);
    }
    for (const linked of [workflow.handoffTo, workflow.handoffFrom]) {
      if (linked && !workflows.has(linked))
        problems.push(`${where} hands off to "${linked}", which does not exist`);
    }
  }

  for (const item of input.queue) {
    const where = `Queue item ${item.id}`;
    checkSeat(item.from, where);
    checkSeat(item.approver, where);
    checkStep(item.workflow, item.step, where);
    if (item.rule && !broken.rules && !ruleIds.has(item.rule)) {
      problems.push(`${where} points to rule "${item.rule}", which is not in the authority rules`);
    }
  }

  for (const task of input.tasks) {
    const where = `Task ${task.id}`;
    checkSeat(task.owner, where);
    checkStep(task.workflow, null, where);
  }

  return problems;
}
