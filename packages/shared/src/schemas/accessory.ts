import { z } from "zod";
import { Id } from "./common";

/** A decorative prop. Position is [x, z] in meters, added in Phase 3. */
export const Accessory = z.object({
  id: Id,
  kind: Id,
  zone: Id,
  label: z.string().optional(),
  enabled: z.boolean(),
  pos: z.tuple([z.number(), z.number()]).optional(),
  rot: z.number().optional(),
});
export type Accessory = z.infer<typeof Accessory>;

export const AccessoriesFile = z.object({
  version: z.literal(1),
  note: z.string().optional(),
  accessories: z.array(Accessory),
});
export type AccessoriesFile = z.infer<typeof AccessoriesFile>;
