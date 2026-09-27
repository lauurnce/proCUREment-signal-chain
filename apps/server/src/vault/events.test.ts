import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { eventForChange } from "./events";
import { VaultStore } from "./store";
import { EVERYTHING } from "./watch";

const repoRoot = resolve(import.meta.dirname, "../../../..");
let temp: string;
let vaultDir: string;
let store: VaultStore;

beforeEach(async () => {
  temp = await mkdtemp(join(tmpdir(), "hq-events-"));
  vaultDir = join(temp, "vault");
  await cp(join(repoRoot, "vault.sample"), vaultDir, { recursive: true });
  store = new VaultStore({ vaultDir, dataDir: join(repoRoot, "data") });
  await store.reload();
});
afterEach(async () => {
  await rm(temp, { recursive: true, force: true });
});

const accessoriesPath = () => join(vaultDir, "office", "accessories.json");

async function editAccessories(
  change: (file: { accessories: { id: string; enabled: boolean }[] }) => void,
) {
  const file = JSON.parse(await readFile(accessoriesPath(), "utf8"));
  change(file);
  await writeFile(accessoriesPath(), JSON.stringify(file));
}

describe("eventForChange", () => {
  it("an edit to accessories.json sends only office.updated, with the new props", async () => {
    const previous = store.state;
    await editAccessories((file) => {
      const sofa = file.accessories.find((a) => a.id === "sofa-reception");
      if (sofa) sofa.enabled = false;
    });
    const next = await store.reload();
    const event = eventForChange([join("office", "accessories.json")], previous, next);
    expect(event.type).toBe("office.updated");
    if (event.type !== "office.updated") return;
    expect(event.office.accessories.find((a) => a.id === "sofa-reception")?.enabled).toBe(false);
    expect(event.office.layout?.deskSlots).toHaveLength(26);
  });

  it("a broken office file sends a full snapshot, so the warning reaches the health badge", async () => {
    const previous = store.state;
    await writeFile(accessoriesPath(), "{ not json");
    const next = await store.reload();
    const event = eventForChange([join("office", "accessories.json")], previous, next);
    expect(event.type).toBe("state.snapshot");
  });

  it("changes outside office/ and a replaced vault folder send a full snapshot", async () => {
    const state = store.state;
    expect(eventForChange([join("board", "t-0001.md")], state, state).type).toBe("state.snapshot");
    expect(
      eventForChange([join("office", "layout.json"), join("queue", "q-1.md")], state, state).type,
    ).toBe("state.snapshot");
    expect(eventForChange([EVERYTHING], state, state).type).toBe("state.snapshot");
  });
});
