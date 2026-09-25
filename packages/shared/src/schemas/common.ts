import { z } from "zod";

/** Lowercase kebab case, like "cm-03" or "q-0012". */
export const Id = z
  .string()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase kebab case, like cm-03");

export const Track = z.enum(["MGR", "LEAD", "CM", "OPS"]);
export type Track = z.infer<typeof Track>;

/** Date and time with a time zone offset, like 2026-09-25T08:40:00+08:00. */
export const IsoDateTime = z.iso.datetime({ offset: true });

/** Calendar date, like 2026-09-25. */
export const IsoDate = z.iso.date();
