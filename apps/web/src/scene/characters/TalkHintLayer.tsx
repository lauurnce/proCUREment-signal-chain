import { typeStyle } from "../../theme/style";
import { useWalk } from "./walk";

/**
 * The page elements Walk around mode moves every frame (WalkControls): the "You" marker over
 * the avatar and the Talk hint over the helper in reach. Held here by reference, so moving
 * them never re-renders React.
 */
export const hint = {
  you: null as HTMLElement | null,
  talk: null as HTMLElement | null,
  talkText: null as HTMLElement | null,
  talkKey: null as HTMLElement | null,
  /** "Card coming soon" shows until this time (performance.now), after E. */
  noteUntil: 0,
};

const PILL = "invisible absolute top-0 left-0 whitespace-nowrap rounded-pill will-change-transform";

/**
 * Walk around mode, in the page over the canvas: a short line on how to move, the "You"
 * marker, and the Talk hint. Nothing here blocks a click on the office.
 */
export function TalkHintLayer() {
  const active = useWalk((s) => s.active);
  return (
    <div
      data-testid="walk-layer"
      className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
    >
      <div
        ref={(el) => {
          hint.you = el;
        }}
        data-testid="walk-you"
        className={`${PILL} bg-navy px-2.5 py-0.5`}
        style={typeStyle("tagName", "white")}
      >
        You
      </div>
      <div
        ref={(el) => {
          hint.talk = el;
        }}
        data-testid="talk-hint"
        className={`${PILL} flex items-center gap-2 border border-hairline bg-white py-1 pr-1.5 pl-3 shadow-float`}
      >
        <span
          ref={(el) => {
            hint.talkText = el;
          }}
          style={typeStyle("tagName")}
        />
        <kbd
          ref={(el) => {
            hint.talkKey = el;
          }}
          className="rounded-chip border border-hairline px-1.5 font-mono"
          style={typeStyle("label", "navy")}
        >
          E
        </kbd>
      </div>
      {active && (
        <p
          data-testid="walk-help"
          role="status"
          className="absolute top-4 left-1/2 m-0 -translate-x-1/2 rounded-pill border border-hairline bg-white px-4 py-1.5 shadow-float"
          style={typeStyle("small", "ink")}
        >
          Walk around: WASD, arrow keys or a click to move. E to talk. Esc to leave.
        </p>
      )}
    </div>
  );
}
