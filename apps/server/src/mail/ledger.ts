import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { IsoDateTime, SentEntry } from "@hq/shared";
import { z } from "zod";
import { writeAtomic } from "../vault/write";

/** Mail's own record, in the vault's hidden .state/ folder (the watcher ignores it). */
export const LEDGER = ".state/mail.json";

export const Ledger = z.object({
  sends: z.array(SentEntry).default([]),
  inbox: z
    .object({
      lastCheck: IsoDateTime.nullable(),
      /** Email ids already turned into tasks, newest last. Never subjects or bodies. */
      seen: z.array(z.string()),
    })
    .default({ lastCheck: null, seen: [] }),
  digest: z
    .object({ lastDate: z.string().nullable(), lastAt: IsoDateTime.nullable() })
    .default({ lastDate: null, lastAt: null }),
  /** Helpers at the Mail Dock for an [HQ] email, and when they walk back. */
  visits: z
    .array(z.object({ seat: z.string(), until: z.number(), workingOn: z.string().optional() }))
    .default([]),
});
export type Ledger = z.infer<typeof Ledger>;

export async function readLedger(vaultDir: string): Promise<Ledger> {
  try {
    const parsed = Ledger.safeParse(JSON.parse(await readFile(join(vaultDir, LEDGER), "utf8")));
    if (parsed.success) return parsed.data;
  } catch {
    // Missing or broken: start fresh.
  }
  return Ledger.parse({});
}

export async function writeLedger(vaultDir: string, ledger: Ledger): Promise<void> {
  const trimmed: Ledger = {
    ...ledger,
    sends: ledger.sends.slice(-200),
    inbox: { ...ledger.inbox, seen: ledger.inbox.seen.slice(-500) },
  };
  await writeAtomic(vaultDir, LEDGER, `${JSON.stringify(trimmed, null, 2)}\n`);
}
