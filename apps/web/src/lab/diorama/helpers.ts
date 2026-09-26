import type { Activity } from "../../scene/characters/motion";
import type { TagData } from "../../scene/tags/TagLayer";

export type Helper = TagData & { activity: Activity };

// One AI helper per track, in pod seat order: back left, back right, front left, front right.
// Fictional seats only. The id is also the seed for the helper's look.
export const HELPERS: Helper[] = [
  {
    id: "mgr-01",
    track: "MGR",
    name: "Sr. Manager helper",
    role: "Sr. Manager",
    status: "working",
    activity: "idle",
  },
  {
    id: "cm-03",
    track: "CM",
    name: "CM 03 helper",
    role: "Quote table",
    status: "working",
    activity: "typing",
  },
  {
    id: "lead-01",
    track: "LEAD",
    name: "Lead 01 helper",
    role: "Lead",
    status: "working",
    activity: "idle",
  },
  {
    id: "ops-07",
    track: "OPS",
    name: "Ops 07 helper",
    role: "Ops buyer",
    status: "working",
    activity: "typing",
  },
];
