import { z } from "zod";
import { Id, IsoDateTime, Track } from "./common";

export const SeatStatus = z.enum([
  "working",
  "waiting-on-you",
  "in-meeting",
  "on-break",
  "off-duty",
]);
export type SeatStatus = z.infer<typeof SeatStatus>;

export const Site = z.enum(["PH", "TH", "TBD"]);

const Helper = z.object({
  name: z.string().nullable(),
  bio: z.string().nullable(),
});

/** Seat identity and desk placement, from data/roster.template.json. */
export const RosterSeat = z.object({
  id: Id,
  track: Track,
  displayName: z.string().min(1),
  roleTitle: z.string().min(1),
  isPlayer: z.boolean(),
  zone: Id,
  pod: Id.nullable(),
  site: Site,
  helper: Helper,
  workflows: z.array(Id),
  defaultApprover: Id.nullable(),
  avatarSeed: z.int(),
  placeholder: z.boolean(),
});
export type RosterSeat = z.infer<typeof RosterSeat>;

export const RosterFile = z.object({
  version: z.literal(1),
  note: z.string().optional(),
  source: z.string().optional(),
  counts: z.record(z.string(), z.int()),
  tracks: z.record(Track, z.object({ label: z.string(), badge: z.string() })),
  seats: z.array(RosterSeat),
});
export type RosterFile = z.infer<typeof RosterFile>;

/** Optional local overrides from data/roster.local.json (gitignored). */
export const RosterLocalFile = z.object({
  note: z.string().optional(),
  overrides: z.record(
    Id,
    z.object({
      displayName: z.string().min(1).optional(),
      roleTitle: z.string().min(1).optional(),
      site: Site.optional(),
      helper: Helper.partial().optional(),
    }),
  ),
});
export type RosterLocalFile = z.infer<typeof RosterLocalFile>;

/** Live status of a seat's AI helper, from vault/team/<seat>/profile.md frontmatter. */
export const SeatProfile = z.object({
  seat: Id,
  status: SeatStatus,
  workingOn: z.string().optional(),
  currentWorkflow: Id.nullable().optional(),
  currentStep: Id.nullable().optional(),
  updated: IsoDateTime,
});
export type SeatProfile = z.infer<typeof SeatProfile>;

/** Roster seat merged with local overrides and the live profile. */
export const Seat = RosterSeat.extend({
  status: SeatStatus,
  workingOn: z.string().optional(),
  currentWorkflow: Id.nullable().optional(),
  currentStep: Id.nullable().optional(),
});
export type Seat = z.infer<typeof Seat>;
