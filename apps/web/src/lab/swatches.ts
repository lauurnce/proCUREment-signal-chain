import type { ColorKey } from "../theme/tokens";

/** One contrast check: the swatch color as text or shape on a background, or white text on the swatch. */
export type Check = {
  fg: ColorKey;
  bg: ColorKey;
  use: "text" | "shape";
  /** Why a failing pair is still OK. Without a note, a failing pair fails the unit test. */
  note?: string;
};

export type Swatch = { key: ColorKey; role: string; checks: Check[] };
export type SwatchGroup = { title: string; screenOnly: boolean; swatches: Swatch[] };

const onLight = (key: ColorKey): Check[] => [
  { fg: key, bg: "white", use: "text" },
  { fg: key, bg: "panel", use: "text" },
];
const shape = (key: ColorKey, note?: string): Check[] => [
  { fg: key, bg: "white", use: "shape", note },
];

export const swatchGroups: SwatchGroup[] = [
  {
    title: "Base palette, from the decks",
    screenOnly: false,
    swatches: [
      { key: "navy", role: "Titles, dark panels, emphasis text", checks: onLight("navy") },
      {
        key: "accent",
        role: "Primary buttons, links, accent bars",
        checks: [...onLight("accent"), { fg: "white", bg: "accent", use: "text" }],
      },
      { key: "ink", role: "Body text", checks: onLight("ink") },
      {
        key: "blueLight",
        role: "Text on navy only",
        checks: [{ fg: "blueLight", bg: "navy", use: "text" }],
      },
      { key: "blueMid", role: "Fills and connectors, never text", checks: [] },
      { key: "panel", role: "The only card fill on white", checks: [] },
      { key: "hairline", role: "1 px borders and dividers", checks: [] },
      { key: "footer", role: "Tiny decorative meta only", checks: [] },
      { key: "white", role: "Page and panel surface", checks: [] },
    ],
  },
  {
    title: "Text and status, screen only",
    screenOnly: true,
    swatches: [
      { key: "inkMuted", role: "Secondary text", checks: onLight("inkMuted") },
      {
        key: "statusWorking",
        role: "Working dot and the Approve button",
        checks: [...shape("statusWorking"), { fg: "white", bg: "statusWorking", use: "text" }],
      },
      {
        key: "statusWaiting",
        role: "Waiting on you, filled dot with !",
        checks: [...shape("statusWaiting"), { fg: "statusWaiting", bg: "white", use: "text" }],
      },
      { key: "statusMeeting", role: "In a meeting, filled dot", checks: shape("statusMeeting") },
      { key: "statusBreak", role: "On break, hollow ring", checks: shape("statusBreak") },
      {
        key: "statusOff",
        role: "Off duty, hollow ring plus label",
        checks: shape("statusOff", "Always shown with the words Off duty"),
      },
    ],
  },
  {
    title: "Track accents, screen only",
    screenOnly: true,
    swatches: [
      { key: "trackMgr", role: "Sr. Manager, star", checks: shape("trackMgr") },
      { key: "trackLead", role: "Leads, outline triangle", checks: shape("trackLead") },
      { key: "trackCm", role: "Category Managers, diamond. Never text", checks: shape("trackCm") },
      {
        key: "trackCmWorld",
        role: "Category Managers in the 3D world only",
        checks: shape("trackCmWorld", "3D world only, never on white UI"),
      },
      { key: "trackOps", role: "Ops Buyers, square. Never text", checks: shape("trackOps") },
    ],
  },
];
