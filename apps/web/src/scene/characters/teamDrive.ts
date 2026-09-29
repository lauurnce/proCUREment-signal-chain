import type { LayoutFile, Seat, Workflow } from "@hq/shared";
import { Matrix4, Quaternion, Vector3 } from "three";
import type { TagAnchor } from "../tags/TagProjector";
import { appearanceFor } from "./appearance";
import { Agent, goalFor } from "./behavior";
import type { CrowdDrive } from "./Crowd";
import type { CrowdMember } from "./crowdPlan";
import { type Pose, poseInto, STAND_CHEST } from "./motion";
import type { FloorPoint, NavGrid } from "./navGrid";
import type { Vec3 } from "./recipe";
import { SEATED_TAG_HEIGHT } from "./tags";
import { Avatar, held, isWalking, nearestInReach, talk, walker } from "./walk";

/** The avatar is a crowd member too, so it costs no extra draw call. */
export const AVATAR_ID = "sr-manager-avatar";

const Y_AXIS = new Vector3(0, 1, 0);
const turn = new Quaternion();
const at = new Vector3();
const ONE = new Vector3(1, 1, 1);
const NONE = new Vector3(0, 0, 0);

/** Where the avatar starts: just inside the Sr. Manager's Office door, facing the office. */
export function avatarHome(layout: LayoutFile, grid: NavGrid): FloorPoint {
  const node = layout.walkways.nodes["mgr-in"];
  const desk = layout.deskSlots.find((s) => s.seat === "mgr-01");
  const wanted: FloorPoint = node ?? (desk ? [desk.pos[0], desk.pos[1] + 1.4] : [2, 2]);
  const cell = grid.nearestFree(wanted);
  return cell ? grid.center(cell[0], cell[1]) : wanted;
}

/**
 * Moves the whole team: one Agent per helper (behavior.ts) and the Walk around avatar.
 * It drives the crowd (Crowd.tsx), and keeps the name tag anchors and the click areas on the
 * helpers as they walk. Everything per frame writes into existing objects, never React state.
 */
export class TeamDrive implements CrowdDrive {
  readonly agents: Agent[];
  readonly avatar: Avatar;
  /** One per helper, moved in place every frame. The tag projector reads them. */
  readonly anchors: TagAnchor[];
  /** Where each helper is, by seat id, moved in place. selectSeat frames the live spot. */
  readonly spots: Map<string, Vec3>;
  /** The crowd: every helper, then the avatar last. */
  readonly members: CrowdMember[];
  private readonly matrices: Matrix4[];

  constructor(helpers: CrowdMember[], grid: NavGrid, layout: LayoutFile, still: boolean) {
    this.agents = helpers.map(
      (m) =>
        new Agent(
          m.id,
          { x: m.position[0], z: m.position[2], heading: m.rotation },
          grid,
          appearanceFor(m.seed).phase,
          still,
        ),
    );
    const home = avatarHome(layout, grid);
    this.avatar = new Avatar(grid, home, 0);
    this.members = [
      ...helpers,
      {
        id: AVATAR_ID,
        seed: AVATAR_ID,
        track: "MGR",
        activity: "idle",
        position: [home[0], 0, home[1]],
        rotation: 0,
      },
    ];
    this.anchors = helpers.map((m) => ({
      id: m.id,
      position: [m.position[0], SEATED_TAG_HEIGHT, m.position[2]],
    }));
    this.spots = new Map(helpers.map((m) => [m.id, [...m.position] as Vec3]));
    this.matrices = this.members.map(() => new Matrix4());
  }

  /** New live status from the server. `first` places everyone at once, with no walk. */
  setGoals(
    seats: Seat[],
    workflows: Workflow[],
    layout: LayoutFile,
    grid: NavGrid,
    first: boolean,
  ) {
    const byId = new Map(seats.map((s) => [s.id, s]));
    for (const agent of this.agents) {
      const seat = byId.get(agent.id);
      if (seat) agent.setGoal(goalFor(seat, workflows, layout, grid), first);
    }
  }

  /**
   * Screenshots freeze the helpers so every run matches. The avatar still answers the keys,
   * so a test can walk it.
   */
  frozen = false;

  step(dt: number) {
    if (!this.frozen) for (const agent of this.agents) agent.step(dt);
    if (isWalking()) this.avatar.step(dt, held);
  }

  /** Runs the helpers for `seconds` at once, in 1/30 s steps (screenshots start mid day). */
  fastForward(seconds: number) {
    for (let t = 0; t < seconds; t += 1 / 30) {
      for (const agent of this.agents) agent.step(1 / 30);
    }
  }

  root(m: number): Matrix4 {
    const out = this.matrices[m] as Matrix4;
    const agent = this.agents[m];
    if (agent) {
      out.compose(
        at.set(agent.x, 0, agent.z),
        turn.setFromAxisAngle(Y_AXIS, agent.heading),
        agent.visible ? ONE : NONE,
      );
      // Keep the tag and the click area on the helper.
      const anchor = this.anchors[m] as TagAnchor;
      anchor.position[0] = agent.x;
      anchor.position[1] = SEATED_TAG_HEIGHT + agent.stand * STAND_CHEST;
      anchor.position[2] = agent.z;
      const spot = this.spots.get(agent.id);
      if (spot) {
        spot[0] = agent.x;
        spot[2] = agent.z;
      }
      return out;
    }
    // The avatar comes last, after every helper has moved this frame. It runs even when the
    // crowd is frozen for screenshots, so a test can place the avatar and see the Talk hint.
    const a = this.avatar;
    const walking = isWalking();
    talk.near = walking ? nearestInReach([a.x, a.z], this.agents) : null;
    walker.x = a.x;
    walker.z = a.z;
    return out.compose(
      at.set(a.x, 0, a.z),
      turn.setFromAxisAngle(Y_AXIS, a.heading),
      walking ? ONE : NONE,
    );
  }

  pose(m: number, time: number, out: Pose): Pose {
    const agent = this.agents[m];
    const input = agent ? agent.poseInput() : this.avatar.poseInput();
    poseInto(out, time, input);
    if (agent && !agent.visible) out.bubble = 0;
    return out;
  }

  /** Where helper `i` stands now, for its click area. */
  helper(i: number): Agent | undefined {
    return this.agents[i];
  }
}
