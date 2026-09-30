import { useStore } from "../../state/store";
import { typeStyle } from "../../theme/style";
import type { TagBox } from "./tags";
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
  /** Read aloud by screen readers when the helper in reach changes. */
  live: null as HTMLElement | null,
  /** Where "You" and the Talk hint sit on screen this frame, so name tags flow around them. */
  boxes: [] as TagBox[],
};

const PILL = "invisible absolute top-0 left-0 whitespace-nowrap rounded-pill will-change-transform";

/**
 * Walk around mode, in the page over the canvas: a short line on how to move, the "You"
 * marker, and the Talk hint. Nothing here blocks a click on the office.
 */
export function TalkHintLayer() {
  const active = useWalk((s) => s.active);
  // A navy pill is lost on the navy night scene, so "You" turns white with navy text.
  const night = useStore((state) => state.light === "night");
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
        className={`${PILL} px-2.5 py-0.5 ${night ? "border border-hairline bg-white" : "bg-navy"}`}
        style={typeStyle("tagName", night ? "navy" : "white")}
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
          className="rounded-chip border border-hairline px-1.5 font-mono"
          style={typeStyle("label", "navy")}
        >
          E
        </kbd>
      </div>
      <p
        ref={(el) => {
          hint.live = el;
        }}
        data-testid="walk-live"
        aria-live="polite"
        className="sr-only"
      />
      {active && (
        <p
          data-testid="walk-help"
          role="status"
          // Just above the Walk around pill, centered in the office area left of the docked
          // panel (P45), so neither the panel nor the stats cover it.
          className="absolute bottom-[84px] left-1/2 m-0 -translate-x-1/2 whitespace-nowrap rounded-pill border border-hairline bg-white px-4 py-1.5 shadow-float min-[960px]:left-[calc((100%-clamp(440px,36vw,600px)-12px)/2)]"
          style={typeStyle("small", "ink")}
        >
          Walk around: WASD, arrow keys or a click to move. E to talk. Esc to leave.
        </p>
      )}
    </div>
  );
}
