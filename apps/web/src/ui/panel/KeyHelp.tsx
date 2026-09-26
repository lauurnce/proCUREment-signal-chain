import { useEffect, useRef } from "react";
import { typeStyle } from "../../theme/style";

const GROUPS: { title: string; keys: [string, string][] }[] = [
  {
    title: "In the panel",
    keys: [
      ["J and K", "Next and previous item"],
      ["Enter", "Open the item"],
      ["Esc", "Back to the list, or close this list"],
      ["A", "Approve"],
      ["H", "Hold"],
      ["S", "Send back to the helper"],
      ["I", "Write an instruction"],
      ["U", "Undo, while the undo bar shows"],
      ["[ and ]", "Previous and next tab"],
      ["Left and right arrows", "Move between tabs, when a tab has focus"],
    ],
  },
  {
    title: "In walk mode (Phase 4)",
    keys: [
      ["W A S D", "Walk"],
      ["Esc", "Stop walking"],
    ],
  },
  { title: "Anywhere", keys: [["?", "Show or hide this list"]] },
];

/** The key list (?). Letter keys only work while the panel has focus (WCAG 2.1.4). */
export function KeyHelp({ onClose }: { onClose: () => void }) {
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => closeRef.current?.focus(), []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="keys-title"
      data-testid="key-help"
      className="absolute inset-0 z-30 flex flex-col gap-4 overflow-auto bg-white px-5 py-4"
    >
      <div className="flex items-center justify-between">
        <h2 id="keys-title" className="m-0" style={typeStyle("sectionTitle")}>
          Keyboard shortcuts
        </h2>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          className="rounded-button border border-hairline px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}
        >
          Close (Esc)
        </button>
      </div>
      {GROUPS.map((g) => (
        <section key={g.title} className="flex flex-col gap-1">
          <h3 className="m-0" style={typeStyle("label", "inkMuted")}>
            {g.title}
          </h3>
          <dl className="m-0 grid grid-cols-[140px_1fr] gap-y-1">
            {g.keys.map(([k, what]) => (
              <div key={`${g.title}-${k}`} className="contents">
                <dt style={{ ...typeStyle("small", "navy"), fontWeight: 700 }}>{k}</dt>
                <dd className="m-0" style={typeStyle("small", "ink")}>
                  {what}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p className="m-0" style={typeStyle("small")}>
        Decision keys work when the panel has focus. Click the panel or press Tab to get there. No
        shortcut works while you type in a box.
      </p>
    </div>
  );
}
