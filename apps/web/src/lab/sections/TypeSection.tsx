import { type TypeKey, typeStyle } from "../../theme/style";
import { type } from "../../theme/tokens";

const SAMPLES: { key: TypeKey; name: string; sample: string }[] = [
  { key: "appTitle", name: "App title", sample: "SignalChain HQ" },
  { key: "panelTitle", name: "Panel title", sample: "Needs you" },
  {
    key: "sectionTitle",
    name: "Section title",
    sample: "Price change of 6.5 percent on PO-452114",
  },
  {
    key: "body",
    name: "Body",
    sample: "The invoice is above the PO price. The helper checked each line and the freight.",
  },
  { key: "small", name: "Small", sample: "PO amendments · Step 3 of 4 · 25 Sep 2026, 9:20 AM" },
  { key: "label", name: "Label (mono)", sample: "Handoffs today" },
  { key: "bigNumber", name: "Big number", sample: "12" },
  { key: "tagName", name: "Name tag name", sample: "CM 03 helper" },
  { key: "tagRole", name: "Name tag role (mono)", sample: "Quote table" },
];

export function TypeSection() {
  return (
    <div className="flex flex-col divide-y divide-hairline">
      {SAMPLES.map(({ key, name, sample }) => {
        const t = type[key];
        return (
          <div
            key={key}
            className="grid grid-cols-[260px_1fr] items-baseline gap-6 py-3 first:pt-0"
          >
            <div className="flex flex-col">
              <span style={typeStyle("tagName")}>{name}</span>
              <span style={typeStyle("label", "inkMuted")}>
                {t.size} / {t.lineHeight} · {t.weight} ·{" "}
                {t.font === "mono" ? "Plex Mono" : "Quattrocento"}
              </span>
            </div>
            <span style={typeStyle(key)}>{sample}</span>
          </div>
        );
      })}
    </div>
  );
}
