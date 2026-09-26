import { typeStyle } from "../../theme/style";
import { world } from "../../theme/tokens";
import { SwatchCard } from "../SwatchCard";
import { swatchGroups } from "../swatches";

const WORLD_PREVIEW: (keyof typeof world)[] = [
  "floorWood",
  "floorWoodAlt",
  "slabSide",
  "slabEdge",
  "zoneCm",
  "zoneOps",
  "zoneLeads",
  "bridgeSeam",
  "wall",
  "deskTop",
  "plantLeaf",
  "capizShell",
  "capizGlow",
  "windowGlow",
  "backdropDay",
  "backdropNight",
];

export function SwatchesSection() {
  return (
    <div className="flex flex-col gap-8">
      {swatchGroups.map((g) => (
        <div key={g.title} className="flex flex-col gap-3">
          <h3 className="m-0" style={typeStyle("sectionTitle")}>
            {g.title}
          </h3>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3">
            {g.swatches.map((s) => (
              <SwatchCard key={s.key} swatch={s} screenOnly={g.screenOnly} />
            ))}
          </div>
        </div>
      ))}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="m-0" style={typeStyle("sectionTitle")}>
            3D world, a preview
          </h3>
          <span className="rounded-chip bg-panel px-1.5 py-0.5" style={typeStyle("label")}>
            Screen only, approved (D-011)
          </span>
        </div>
        <p className="m-0" style={typeStyle("small")}>
          16 of the world colors. The full list is in docs/design/WORLD_PALETTE.md. We judge them in
          the 3D study (P2.3), because light changes how they look.
        </p>
        <div className="grid grid-cols-[repeat(auto-fill,minmax(112px,1fr))] gap-2">
          {WORLD_PREVIEW.map((k) => (
            <div key={k} className="flex flex-col gap-1">
              <div
                className="h-10 rounded-chip border border-hairline"
                style={{ background: world[k] }}
              />
              <span style={typeStyle("small", "ink")}>{k}</span>
              <span style={typeStyle("label", "inkMuted")}>{world[k]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
