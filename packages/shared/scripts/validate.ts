import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { AppState } from "../src/index";
import { loadVault } from "../src/vault/index";

// Checks the committed files in data/ and vault.sample/. The local roster is left out on purpose.
const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");

const state = await loadVault({
  vaultDir: join(root, "vault.sample"),
  dataDir: join(root, "data"),
  includeLocalRoster: false,
});

const shape = AppState.safeParse(state);
const problems = [...state.warnings];
if (!shape.success)
  problems.push(`The combined state does not match AppState: ${shape.error.message}`);
if (state.seats.length === 0) problems.push("No seats were loaded from data/roster.template.json");

if (problems.length > 0) {
  console.error(`Validate: ${problems.length} problem(s) in data/ or vault.sample/`);
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

console.log(
  `Validate: OK. ${state.seats.length} seats, ${state.queue.length} queue items, ${state.tasks.length} tasks, ` +
    `${state.workflows.length} workflows, ${state.office.zones.length} zones, ${state.office.accessories.length} props.`,
);
