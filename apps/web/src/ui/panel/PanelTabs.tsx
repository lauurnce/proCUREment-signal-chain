import { type KeyboardEvent, useRef } from "react";
import { typeStyle } from "../../theme/style";

export type TabId = "needs" | "team" | "board" | "office" | "mail";

export const TABS: { id: TabId; label: string }[] = [
  { id: "needs", label: "Needs you" },
  { id: "team", label: "Team" },
  { id: "board", label: "Board" },
  { id: "office", label: "Office" },
  { id: "mail", label: "Mail" },
];

/** The five tabs. Arrows, Home and End move between them when a tab has focus. */
export function PanelTabs({
  current,
  needsCount,
  onChange,
}: {
  current: TabId;
  needsCount: number;
  onChange: (tab: TabId) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  function onKeyDown(e: KeyboardEvent) {
    const index = TABS.findIndex((t) => t.id === current);
    const moves: Record<string, number> = {
      ArrowRight: (index + 1) % TABS.length,
      ArrowLeft: (index - 1 + TABS.length) % TABS.length,
      Home: 0,
      End: TABS.length - 1,
    };
    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    e.stopPropagation();
    const tab = TABS[next];
    if (!tab) return;
    onChange(tab.id);
    refs.current[next]?.focus();
  }

  const aria =
    needsCount === 0
      ? "Needs you, nothing waiting"
      : `Needs you, ${needsCount} item${needsCount === 1 ? "" : "s"}`;

  return (
    <div
      role="tablist"
      aria-label="Panel sections"
      className="flex h-12 shrink-0 items-stretch gap-1 border-b border-hairline px-3"
      onKeyDown={onKeyDown}
    >
      {TABS.map((t, i) => {
        const selected = t.id === current;
        return (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={selected}
            aria-controls={`panel-${t.id}`}
            aria-label={t.id === "needs" ? aria : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(t.id)}
            className={`flex items-center gap-1.5 border-b-2 px-2.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent ${selected ? "border-accent" : "border-transparent"}`}
            style={{
              ...typeStyle("label", selected ? "navy" : "inkMuted"),
              fontWeight: selected ? 700 : 500,
            }}
          >
            {t.label}
            {t.id === "needs" && (
              <span
                className={`rounded-pill px-1.5 tabular-nums ${needsCount > 0 ? "bg-status-waiting" : "border border-hairline"}`}
                style={typeStyle("label", needsCount > 0 ? "white" : "inkMuted")}
              >
                {needsCount > 99 ? "99+" : needsCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
