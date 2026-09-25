import { z } from "zod";
import { Id } from "./common";

export const ZoneKind = z.enum([
  "entrance",
  "office",
  "desks",
  "handoff",
  "station",
  "room",
  "pantry",
  "landmark",
]);

export const Zone = z.object({
  id: Id,
  name: z.string().min(1),
  kind: ZoneKind,
  purpose: z.string().min(1),
  seats: z.array(Id).optional(),
  pods: z.record(Id, z.array(Id)).optional(),
});
export type Zone = z.infer<typeof Zone>;

export const ZonesFile = z.object({
  version: z.literal(1),
  note: z.string().optional(),
  zones: z.array(Zone),
});
export type ZonesFile = z.infer<typeof ZonesFile>;
