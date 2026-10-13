import type {
  AuthorityRule,
  QueueItem,
  QueueStatus,
  SeatStatus,
  Task,
  Track,
  Workflow,
  WorkflowStep,
} from "@hq/shared";
import { type Change, ruleFor } from "./authority";
import { int, pick, type Rng, seeded } from "./random";

/** The Sr. Manager: items for this seat wait for you. Everything else the simulator decides. */
export const PLAYER_SEAT = "mgr-01";

/** A seat the simulator can give work to. */
export type SimSeat = { id: string; track: Track; workflows: string[]; label: string };

/** What the simulator wants written to the vault. The engine itself never writes. */
export type Effect =
  | {
      type: "seat";
      seat: string;
      status: SeatStatus;
      workingOn: string;
      currentWorkflow: string | null;
      currentStep: string | null;
    }
  | { type: "item"; item: QueueItem; slug: string }
  | { type: "task"; task: Task }
  | { type: "log"; text: string }
  | { type: "decide"; id: string; by: string; action: "approve" | "send-back"; note?: string };

type SeatEffect = Extract<Effect, { type: "seat" }>;

/** Fictional suppliers from the program (procurement-domain skill), with reserved .example mail. */
const SUPPLIERS = [
  { name: "Luzon Precision Components Corp.", mail: "orders@luzonprecision.example" },
  { name: "MetroPack Industrial Supplies Inc.", mail: "sales@metropack.example" },
  { name: "Bayanihan Logistics Services", mail: "dispatch@bayanihanlogistics.example" },
  { name: "Batangas Metalcraft Industries", mail: "orders@batangasmetalcraft.example" },
] as const;
const SERVICES = [
  "cleanroom maintenance",
  "forklift preventive maintenance",
  "ESD floor recoating",
  "calibration of test equipment",
];
const GOODS = [
  "anti-static packaging",
  "ESD trays",
  "label stock",
  "nitrile gloves",
  "spare pump seals",
];

/** Simulated day: new work starts until 17:00, breaks around 10:00 and 15:00 (merienda). */
const DAY_START = 8 * 60;
const LAST_START = 17 * 60;
const BREAKS = [10 * 60, 15 * 60];
const DIGEST_AT = 16 * 60 + 30;

type CaseData = {
  supplier: (typeof SUPPLIERS)[number];
  po: string;
  prs: number;
  service: string;
  goods: string;
  rfq: string;
  change: Change;
  /** The CM a rule sends a price change to. */
  cm: string;
  /** The CM who endorsed the PRs, for an Ops case that came over the bridge. */
  from?: string;
  /** A second missed ship date: the follow-up names a consequence, so it needs you. */
  escalate: boolean;
};

type Case = {
  workflow: Workflow;
  index: number;
  until: number;
  waiting: string | null;
  heldUntil: number | null;
  data: CaseData;
  task: Task;
};

type SeatRun = {
  seat: SimSeat;
  current: Case | null;
  /** Work handed to this seat, like PRs endorsed over the bridge. */
  inbox: { workflow: string; from: string; prs: number }[];
  idleUntil: number;
  breakUntil: number;
};

/**
 * One seeded working day for the team. `advance` moves the clock minute by minute and returns
 * what to write. Pure logic, so the same seed and the same decisions replay the same day.
 */
export class DemoDayEngine {
  readonly seed: number;
  readonly date: string;
  minute = DAY_START;
  private readonly rng: Rng;
  private readonly workflows: Map<string, Workflow>;
  private readonly rules: AuthorityRule[];
  private readonly seats: SeatRun[];
  private readonly cms: string[];
  private readonly ops: string[];
  private readonly autoDecide: { id: string; at: number; by: string }[] = [];
  /** Items this engine created and their status as it last knew it. */
  private readonly known = new Map<string, QueueStatus>();
  private nextItem = 1001;
  private nextTask = 1001;
  private digestDone = false;

  constructor(options: {
    seed: number;
    date: string;
    seats: SimSeat[];
    workflows: Workflow[];
    rules: AuthorityRule[];
  }) {
    this.seed = options.seed;
    this.date = options.date;
    this.rng = seeded(options.seed);
    this.workflows = new Map(options.workflows.map((w) => [w.id, w]));
    this.rules = options.rules;
    const workers = options.seats.filter((s) => s.id !== PLAYER_SEAT);
    this.cms = workers.filter((s) => s.track === "CM").map((s) => s.id);
    this.ops = workers.filter((s) => s.track === "OPS").map((s) => s.id);
    // Everyone arrives between 08:00 and 08:30, so the morning does not start in one burst.
    this.seats = workers.map((seat) => ({
      seat,
      current: null,
      inbox: [],
      idleUntil: DAY_START + int(this.rng, 0, 30),
      breakUntil: 0,
    }));
  }

  /** "2026-10-13T09:42:00+08:00" for a minute of the day (Manila time). */
  iso(minute = this.minute): string {
    const h = String(Math.floor(minute / 60)).padStart(2, "0");
    const m = String(minute % 60).padStart(2, "0");
    return `${this.date}T${h}:${m}:00+08:00`;
  }

  /** Effects for the start of the day: every helper at its desk, clearing the inbox. */
  start(): Effect[] {
    return [
      { type: "log", text: `Demo Day started (seed ${this.seed})` },
      ...this.seats.map((s) => idle(s.seat.id)),
    ];
  }

  /**
   * Moves the clock to `toMinute`. `statuses` holds the vault status of items this engine made,
   * so your decisions in the panel move the work on.
   */
  advance(toMinute: number, statuses: Map<string, QueueStatus>): Effect[] {
    const out: Effect[] = [];
    for (const [id, status] of statuses) if (this.known.has(id)) this.known.set(id, status);
    while (this.minute < toMinute) {
      this.minute++;
      this.tick(out);
    }
    return out;
  }

  private tick(out: Effect[]) {
    const m = this.minute;
    // A CM, Ops Buyer or Lead decides their own items after a while, so the day keeps moving.
    for (const due of this.autoDecide.filter((a) => a.at <= m)) {
      this.autoDecide.splice(this.autoDecide.indexOf(due), 1);
      if (this.known.get(due.id) !== "needs-you") continue;
      const sendBack = this.rng() < 0.1;
      this.known.set(due.id, sendBack ? "sent-back" : "approved");
      out.push({
        type: "decide",
        id: due.id,
        by: due.by,
        action: sendBack ? "send-back" : "approve",
        ...(sendBack ? { note: "Please add the missing details and send it again." } : {}),
      });
    }
    if (m === DIGEST_AT && !this.digestDone) this.digest(out);
    for (const run of this.seats) this.tickSeat(run, out);
  }

  private tickSeat(run: SeatRun, out: Effect[]) {
    const m = this.minute;
    const id = run.seat.id;
    if (run.breakUntil) {
      if (m < run.breakUntil) return;
      run.breakUntil = 0;
      run.idleUntil = m;
      out.push(idle(id));
      return;
    }
    const c = run.current;
    if (!c) {
      if (m < run.idleUntil || m >= LAST_START) return;
      if (BREAKS.some((b) => m >= b && m < b + 20) && this.rng() < 0.3) {
        run.breakUntil = m + 15;
        out.push({ ...idle(id), status: "on-break", workingOn: "Recharging at Merienda Corner" });
        return;
      }
      this.startCase(run, out);
      return;
    }
    if (c.waiting) {
      const status = this.known.get(c.waiting) ?? "needs-you";
      if (status === "needs-you") return;
      if (status === "held") {
        c.heldUntil ??= m + 45;
        if (m < c.heldUntil) return;
      }
      const decided = c.waiting;
      c.waiting = null;
      c.heldUntil = null;
      if (status === "sent-back") {
        // Rework the same step, then ask again.
        c.until = m + int(this.rng, 10, 20);
        out.push(this.seatOn(id, c, `Reworking ${this.stepOf(c).label.toLowerCase()}`));
        return;
      }
      this.afterDecision(run, c, decided, out);
      this.enterStep(run, c.index + 1, out);
      return;
    }
    if (m < c.until) return;
    const step = this.stepOf(c);
    if (step.needsHuman) this.decisionPoint(run, c, step, out);
    else this.enterStep(run, c.index + 1, out);
  }

  private startCase(run: SeatRun, out: Effect[]) {
    const r = this.rng;
    const handoff = run.inbox.shift();
    // Ops PR to PO work only starts from PRs endorsed over the bridge.
    const own = run.seat.workflows.filter((w) => !this.workflows.get(w)?.handoffFrom);
    const workflowId = handoff?.workflow ?? (own.length ? pick(r, own) : null);
    const workflow = workflowId ? this.workflows.get(workflowId) : undefined;
    if (!workflow) {
      run.idleUntil = this.minute + 60;
      return;
    }
    const supplier = pick(r, SUPPLIERS);
    const roll = r();
    const percent = Math.round((0.5 + r() * 8.5) * 10) / 10;
    const change: Change =
      roll < 0.15
        ? { type: "quantity-change" }
        : roll < 0.25
          ? { type: "commercial-terms" }
          : { type: "price-change", percent, amount: int(r, 3, 60) * 100 };
    const data: CaseData = {
      supplier,
      po: `PO-45${int(r, 1000, 9999)}`,
      prs: handoff?.prs ?? int(r, 6, 18),
      service: pick(r, SERVICES),
      goods: pick(r, GOODS),
      rfq: `RFQ-${int(r, 2600, 2999)}`,
      change,
      cm: pick(r, this.cms),
      escalate: r() < 0.35,
      ...(handoff ? { from: handoff.from } : {}),
    };
    const task: Task = {
      id: `t-${this.nextTask++}`,
      title: taskTitle(workflow.id, data),
      owner: run.seat.id,
      workflow: workflow.id,
      status: "doing",
      created: this.iso(),
      due: this.date,
      links: [],
      body: "Created by Demo Day. Fictional data.",
    };
    out.push({ type: "task", task });
    run.current = { workflow, index: -1, until: 0, waiting: null, heldUntil: null, data, task };
    this.enterStep(run, 0, out);
  }

  private enterStep(run: SeatRun, index: number, out: Effect[]) {
    const c = run.current;
    if (!c) return;
    if (index >= c.workflow.steps.length) {
      out.push({
        type: "task",
        task: { ...c.task, status: "done", completed: this.iso() },
      });
      out.push({ type: "log", text: `${run.seat.id} finished: ${c.task.title}` });
      out.push(idle(run.seat.id));
      run.current = null;
      // Leads look in less often, so the review queue does not flood.
      const gap = run.seat.track === "LEAD" ? [60, 120] : [5, 25];
      run.idleUntil = this.minute + int(this.rng, gap[0] as number, gap[1] as number);
      return;
    }
    c.index = index;
    const step = this.stepOf(c);
    c.until = this.minute + (step.needsHuman ? int(this.rng, 8, 20) : int(this.rng, 15, 40));
    out.push(this.seatOn(run.seat.id, c, step.label));
  }

  /** A step where a person decides: a Needs You item, or the authority rule routes it. */
  private decisionPoint(run: SeatRun, c: Case, step: WorkflowStep, out: Effect[]) {
    const id = run.seat.id;
    if (c.workflow.id === "ops-po-amendments" && step.id === "decide") {
      const rule = ruleFor(this.rules, c.data.change);
      const by = rule?.decidedBy ?? "CM";
      const what = changeText(c.data.change);
      if (by === "OPS") {
        out.push({
          type: "log",
          text: `${id} changed ${c.data.po} in SAP, ${what} (rule: ${rule?.id})`,
        });
        this.enterStep(run, c.index + 1, out);
        return;
      }
      if (by === "PLANNER") {
        out.push({
          type: "log",
          text: `${id} sent the quantity change on ${c.data.po} to the Planner (rule: ${rule?.id})`,
        });
        this.enterStep(run, c.index + 1, out);
        return;
      }
      out.push({
        type: "log",
        text: `${id} routed ${what} on ${c.data.po} to ${c.data.cm} (rule: ${rule?.id ?? "safer default"})`,
      });
      this.raise(run, c, step, c.data.cm, out, rule?.id);
      return;
    }
    // A follow-up that names a consequence, and a Lead's escalation, need the Sr. Manager.
    const toYou =
      (c.workflow.id === "ops-pr-to-po-stock-item" &&
        step.id === "acknowledge" &&
        c.data.escalate) ||
      (c.workflow.id === "lead-review" && step.id === "unblock");
    this.raise(run, c, step, toYou ? PLAYER_SEAT : id, out);
  }

  private raise(
    run: SeatRun,
    c: Case,
    step: WorkflowStep,
    approver: string,
    out: Effect[],
    rule?: string,
  ) {
    const id = `q-${this.nextItem++}`;
    const content = itemText(c.workflow.id, step.id, c.data, run.seat, approver === PLAYER_SEAT);
    const item: QueueItem = {
      id,
      title: content.title,
      kind: content.kind,
      status: "needs-you",
      from: run.seat.id,
      approver,
      track: run.seat.track,
      workflow: c.workflow.id,
      step: step.id,
      supplier: `${c.data.supplier.name} (fictional)`,
      ...(rule ? { rule } : {}),
      created: this.iso(),
      updated: this.iso(),
      ...(content.kind === "email-draft"
        ? {
            email: {
              to: [c.data.supplier.mail],
              cc: [],
              subject: content.subject ?? content.title,
            },
          }
        : {}),
      decision: null,
      body: content.body,
    };
    this.known.set(id, "needs-you");
    c.waiting = id;
    out.push({ type: "item", item, slug: `${run.seat.id}-${slugOf(content.title)}` });
    out.push({
      ...this.seatOn(run.seat.id, c, content.title),
      status: "waiting-on-you",
    });
    out.push({
      type: "log",
      text: `${run.seat.id} raised ${id}: ${content.title}${approver === PLAYER_SEAT ? ", needs you" : ""}`,
    });
    if (approver !== PLAYER_SEAT) {
      this.autoDecide.push({ id, at: this.minute + int(this.rng, 8, 30), by: approver });
    }
  }

  /** After a decision: the CM endorses the PRs to an Ops Buyer at the Endorsement Bridge. */
  private afterDecision(run: SeatRun, c: Case, _itemId: string, out: Effect[]) {
    if (c.workflow.id !== "cm-pr-stock-item-approval" || this.stepOf(c).id !== "endorse") return;
    const opsSeat = pick(this.rng, this.ops);
    const target = this.seats.find((s) => s.seat.id === opsSeat);
    target?.inbox.push({ workflow: "ops-pr-to-po-stock-item", from: run.seat.id, prs: c.data.prs });
    out.push({
      type: "log",
      text: `${run.seat.id} endorsed ${c.data.prs} PRs to ${opsSeat} at the Endorsement Bridge`,
    });
  }

  /** Late afternoon: a Lead drafts the daily digest for the Sr. Manager. */
  private digest(out: Effect[]) {
    this.digestDone = true;
    const lead = this.seats.find((s) => s.seat.track === "LEAD");
    if (!lead) return;
    const id = `q-${this.nextItem++}`;
    this.known.set(id, "needs-you");
    out.push({
      type: "item",
      slug: `${lead.seat.id}-daily-digest`,
      item: {
        id,
        title: "Daily digest draft for the Sr. Manager",
        kind: "report",
        status: "needs-you",
        from: lead.seat.id,
        approver: PLAYER_SEAT,
        track: "LEAD",
        workflow: "mgr-decisions",
        step: "digest",
        created: this.iso(),
        updated: this.iso(),
        decision: null,
        body: "## Summary\nToday's decisions, handoffs over the Endorsement Bridge, and what still waits, from the log. Approve to file it.\n\nAll data is fictional (Demo Day).",
      },
    });
    out.push({ type: "log", text: `${lead.seat.id} drafted the daily digest, needs you` });
  }

  private stepOf(c: Case): WorkflowStep {
    return c.workflow.steps[c.index] as WorkflowStep;
  }

  private seatOn(seat: string, c: Case, doing: string): SeatEffect {
    return {
      type: "seat",
      seat,
      status: "working",
      workingOn: `${doing} (${c.task.title})`.slice(0, 140),
      currentWorkflow: c.workflow.id,
      currentStep: this.stepOf(c).id,
    };
  }
}

const idle = (seat: string): SeatEffect => ({
  type: "seat",
  seat,
  status: "working",
  workingOn: "Clearing the inbox",
  currentWorkflow: null,
  currentStep: null,
});

const slugOf = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");

function changeText(change: Change): string {
  if (change.type === "price-change") return `a ${change.percent} percent price change`;
  if (change.type === "quantity-change") return "a quantity change";
  return "a change to the commercial terms";
}

function taskTitle(workflow: string, d: CaseData): string {
  switch (workflow) {
    case "cm-pr-stock-item-approval":
      return `Approve and endorse ${d.prs} stock item PRs`;
    case "cm-contract-generation-conga":
      return `SOW for ${d.service} with ${d.supplier.name}`;
    case "cm-rfq-process":
      return `${d.rfq}: quotes for ${d.goods}`;
    case "ops-pr-to-po-stock-item":
      return `Convert ${d.prs} endorsed PRs to POs`;
    case "ops-erfq-to-po":
      return `Convert ${d.rfq} to a PO with ${d.supplier.name}`;
    case "ops-po-amendments":
      return `Amendment request on ${d.po}`;
    default:
      return "Weekly review of risks and blockers";
  }
}

type ItemText = {
  kind: QueueItem["kind"];
  title: string;
  body: string;
  subject?: string;
};

/** The words of a Needs You item. Fictional numbers only, and plain English. */
function itemText(
  workflow: string,
  step: string,
  d: CaseData,
  seat: SimSeat,
  toYou: boolean,
): ItemText {
  const s = d.supplier.name;
  const note = "\n\nAll data is fictional (Demo Day).";
  const key = `${workflow}/${step}`;
  switch (key) {
    case "cm-pr-stock-item-approval/review": {
      const flagged = Math.max(1, Math.round(d.prs / 6));
      return {
        kind: "approval",
        title: `${d.prs} stock item PRs ready to approve, ${flagged} flagged`,
        body: `## Summary\nThe ${seat.label} helper checked ${d.prs} stock item PRs against the last price and supplier. ${flagged} have a price above the last PO and are flagged for a closer look.${note}`,
      };
    }
    case "cm-pr-stock-item-approval/endorse":
      return {
        kind: "approval",
        title: `Endorse ${d.prs} approved PRs to Ops`,
        body: `## Summary\nThe PR-PO list file for ${d.prs} approved PRs is ready. Approve to hand it to an Ops Buyer at the Endorsement Bridge.${note}`,
      };
    case "cm-contract-generation-conga/finalize":
      return {
        kind: "summary",
        title: `SOW for ${d.service}: 3 open points with ${s}`,
        body: `## Summary\nThe SOW draft for ${d.service} is back from ${s} (fictional) with 3 requested changes: the visit schedule, the response time, and the payment terms. Payment terms stay the Category Manager's call.${note}`,
      };
    case "cm-contract-generation-conga/route":
      return {
        kind: "approval",
        title: `Route the SOW for ${d.service} for signature`,
        body: `## Summary\nThe final SOW with ${s} (fictional) is ready to route in DocuSign. The helper prepared the routing note and the signer list.${note}`,
      };
    case "cm-rfq-process/negotiate":
      return {
        kind: "summary",
        title: `${d.rfq}: 3 quotes for ${d.goods}, award to decide`,
        body: `## Summary\nThe helper put 3 quotes for ${d.goods} in one table, commercial and technical. ${s} (fictional) is lowest on price with the same lead time. The negotiation brief and the award email draft are ready.${note}`,
      };
    case "ops-pr-to-po-stock-item/countercheck": {
      const mismatches = Math.max(1, Math.round(d.prs / 5));
      return {
        kind: "approval",
        title: `Countercheck: ${mismatches} mismatches in ${d.prs} PRs`,
        body: `## Summary\nThe ${seat.label} helper compared the ${d.prs} endorsed PRs with SAP line by line${d.from ? ` (endorsed by the ${d.from.toUpperCase().replace("-", " ")} helper)` : ""}. ${mismatches} lines differ in unit of measure or delivery date and need a look before conversion.${note}`,
      };
    }
    case "ops-pr-to-po-stock-item/acknowledge":
      return toYou
        ? {
            kind: "email-draft",
            title: `${s} missed a second firm date on ${d.po}: OK a firmer follow-up?`,
            subject: `${d.po}: second missed ship date, recovery plan needed`,
            body: `## Summary\n${s} (fictional) has missed two committed ship dates for ${d.po}. The helper drafted a firmer follow-up that asks for a recovery plan and names the next step if the date slips again. Because it names a consequence for the supplier, it needs your OK.\n\n## Draft email\nHello ${s} team,\n\nThis is the second committed ship date for ${d.po} that has moved. Please send a recovery plan with a firm date by end of day tomorrow.\n\nThank you.${note}`,
          }
        : {
            kind: "email-draft",
            title: `Follow-up to ${s}: confirm the ship date for ${d.po}`,
            subject: `${d.po}: please confirm the ship date`,
            body: `## Summary\n${s} (fictional) has not acknowledged ${d.po}. The helper drafted a polite follow-up that asks for a confirmed ship date.\n\n## Draft email\nHello ${s} team,\n\nCould you confirm the ship date for ${d.po}? A reply by end of day tomorrow helps us plan.\n\nThank you.${note}`,
          };
    case "ops-erfq-to-po/convert":
      return {
        kind: "approval",
        title: `${d.rfq} ready to convert to a PO with ${s}`,
        body: `## Summary\nThe quotation from ${s} (fictional) is valid, the vendor code is set up in SAP, and the PO details are prepared for review.${note}`,
      };
    case "ops-po-amendments/decide": {
      const what = changeText(d.change);
      return {
        kind: "approval",
        title: `${capitalize(what)} on ${d.po}: needs a Category Manager decision`,
        body: `## Summary\nThe Ops helper found ${what} on ${d.po} from ${s} (fictional). Under the authority rule (to confirm), this needs Category Manager approval, so it was routed here instead of being changed in SAP.${note}`,
      };
    }
    case "ops-po-amendments/amend":
      return {
        kind: "approval",
        title: `Amendment for ${d.po} ready to post in SAP`,
        body: `## Summary\nThe amendment summary for ${d.po} is ready. The Ops Buyer posts it in SAP after a last check.${note}`,
      };
    case "lead-review/review":
      return {
        kind: "report",
        title: "Review of what changed and what looks risky",
        body: `## Summary\nThe ${seat.label} helper summarized this morning's changes for its group: two late shipments and one supplier price increase to watch.${note}`,
      };
    case "lead-review/unblock":
      return {
        kind: "escalation",
        title: `Escalation: ${s} shipment for ${d.po} is late`,
        body: `## Summary\nThe inbound shipment from ${s} (fictional) for ${d.po} is late and a line is short next week. The ${seat.label} helper drafted the escalation note and two recovery options for you to choose from.${note}`,
      };
    default:
      return {
        kind: "approval",
        title: `${capitalize(step.replace(/-/g, " "))} on ${taskTitle(workflow, d)}`,
        body: `## Summary\nA step that needs a person's decision.${note}`,
      };
  }
}

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
