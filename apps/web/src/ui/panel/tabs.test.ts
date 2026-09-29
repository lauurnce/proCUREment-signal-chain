import type { Accessory, OfficeLink, Task } from "@hq/shared";
import { describe, expect, it } from "vitest";
import { connectOffice, officeLink } from "../officeLink";
import { COLUMNS, columnTasks } from "./BoardTab";
import { propName } from "./propName";

const task = (id: string, status: Task["status"], completed?: string) =>
  ({ id, status, completed }) as Task;

describe("board columns", () => {
  const today = "2026-09-25";
  const tasks = [
    task("a", "todo"),
    task("b", "waiting"),
    task("c", "done", "2026-09-25T08:55:00+08:00"),
    task("d", "done", "2026-09-24T17:00:00+08:00"),
    task("e", "done"),
    // 11:30 PM UTC on the 24th is already the 25th in Manila.
    task("f", "done", "2026-09-24T23:30:00Z"),
  ];

  it("keeps Waiting first (D-041), with the P5.3 names", () => {
    expect(COLUMNS.map((c) => c.label)).toEqual([
      "Waiting on a decision",
      "Doing",
      "To do",
      "Done today",
    ]);
  });

  it("Done today holds only tasks finished today, in Manila time", () => {
    expect(columnTasks(tasks, "done", today).map((t) => t.id)).toEqual(["c", "f"]);
    expect(columnTasks(tasks, "todo", today).map((t) => t.id)).toEqual(["a"]);
  });
});

describe("office tab", () => {
  it("names props in plain words", () => {
    expect(propName({ kind: "plant-tall" } as Accessory)).toBe("Tall plant");
    expect(propName({ kind: "printer" } as Accessory)).toBe("Printer");
    expect(propName({ kind: "poster", label: "RACE poster" } as Accessory)).toBe("RACE poster");
  });
});

describe("office link", () => {
  it("is empty until the office connects, and unplugs cleanly", () => {
    expect(officeLink()).toBeNull();
    const link: OfficeLink = {
      selectSeat: () => true,
      onSeatSelected: () => () => {},
      enterWalkMode: () => {},
      onTalk: () => () => {},
    };
    const unplug = connectOffice(link);
    expect(officeLink()).toBe(link);
    unplug();
    expect(officeLink()).toBeNull();
  });
});
