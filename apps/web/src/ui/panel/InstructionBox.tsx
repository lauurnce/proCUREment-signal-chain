import type { Ref } from "react";
import { typeStyle } from "../../theme/style";
import type { Audience } from "./audience";

type Props = {
  audiences: Audience[];
  audienceId: string;
  onAudience: (id: string) => void;
  text: string;
  onText: (text: string) => void;
  /** The item this instruction is about, like "PO-452114". */
  about: string | null;
  onDetach: () => void;
  placeholder: string;
  onSend: () => void;
  /** Lab only: what would have been sent. */
  preview: string | null;
  textRef: Ref<HTMLTextAreaElement>;
  /** Offline: Send waits until the server is back. */
  paused?: boolean;
  /** Says that nothing is sent yet. Defaults to the Lab wording. */
  note?: string;
  /**
   * While an item is open, the box shrinks to a one line bar, so the Summary has room
   * (council, 29 Sep 2026). A click on the bar, or the I key, opens it.
   */
  collapsed?: boolean;
  onExpand?: () => void;
};

export const LAB_NOTE = "Lab only, nothing is saved or sent.";

const GROUP_ORDER = ["One helper", "A pod", "A wing", "Everyone"];

/**
 * Pinned at the bottom of the panel. The send button always names who gets the instruction,
 * and "To" never starts on everyone.
 */
export function InstructionBox(p: Props) {
  const audience = p.audiences.find((a) => a.id === p.audienceId);
  const ready = Boolean(audience && p.text.trim()) && !p.paused;
  const buttonLabel = audience ? `Send to ${audience.label}` : "Send";
  const hint = p.paused
    ? "Send when back online."
    : !audience
      ? "Pick who gets it first."
      : !p.text.trim()
        ? "Write an instruction first."
        : undefined;

  if (p.collapsed) {
    return (
      <section
        aria-label="Give an instruction"
        data-testid="instruction-box"
        data-collapsed="true"
        className="flex h-12 shrink-0 items-center border-t border-hairline bg-white px-4"
      >
        <button
          type="button"
          onClick={p.onExpand}
          aria-keyshortcuts="I"
          className="flex w-full items-center justify-between rounded-button px-2 py-1.5 hover:bg-panel focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <span style={typeStyle("label", "inkMuted")}>Give an instruction</span>
          <span
            aria-hidden="true"
            className="rounded-chip border border-hairline px-1 font-mono text-[11px] leading-[14px] text-ink-muted"
          >
            I
          </span>
        </button>
      </section>
    );
  }

  return (
    <section
      aria-label="Give an instruction"
      data-testid="instruction-box"
      className="flex shrink-0 flex-col gap-2 border-t border-hairline bg-white px-4 py-3"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span style={typeStyle("label", "inkMuted")}>Give an instruction</span>
        <label className="ml-auto flex items-center gap-1.5">
          <span style={typeStyle("small", "ink")}>To</span>
          <select
            value={p.audienceId}
            onChange={(e) => p.onAudience(e.target.value)}
            className="max-w-56 rounded-chip border border-hairline bg-white px-1.5 py-1 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
            style={typeStyle("small", "ink")}
          >
            <option value="">Pick who gets it</option>
            {GROUP_ORDER.map((g) => (
              <optgroup key={g} label={g}>
                {p.audiences
                  .filter((a) => a.group === g)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label.charAt(0).toUpperCase() + a.label.slice(1)}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </label>
        {p.about && (
          <span
            className="flex items-center gap-1 rounded-chip border border-hairline bg-panel pl-1.5"
            style={typeStyle("label")}
          >
            About {p.about}
            <button
              type="button"
              onClick={p.onDetach}
              aria-label={`Remove ${p.about}`}
              className="grid size-6 place-items-center focus-visible:outline-2 focus-visible:outline-accent"
            >
              ×
            </button>
          </span>
        )}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          ref={p.textRef}
          value={p.text}
          onChange={(e) => p.onText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (ready) p.onSend();
            }
          }}
          rows={2}
          placeholder={p.placeholder}
          aria-label="Instruction"
          className="min-h-11 flex-1 resize-none rounded-button border border-hairline px-2.5 py-2 placeholder:text-ink-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          style={typeStyle("small", "ink")}
        />
        <button
          type="button"
          onClick={() => ready && p.onSend()}
          aria-disabled={!ready}
          aria-describedby={hint && p.text.trim() ? "instruction-hint" : undefined}
          title={hint}
          // Ready: accent fill. Not ready: a white outline button, clearly different.
          className={`min-h-11 max-w-44 rounded-button border px-3 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${ready ? "border-accent bg-accent" : "border-hairline bg-white"}`}
          style={{ ...typeStyle("small", ready ? "white" : "inkMuted"), fontWeight: 700 }}
        >
          {buttonLabel}
        </button>
      </div>
      {hint && p.text.trim() && (
        <p id="instruction-hint" className="m-0" style={typeStyle("small")}>
          {hint}
        </p>
      )}
      {p.preview && (
        <p className="m-0" role="status" style={typeStyle("small")}>
          {p.preview} {p.note ?? LAB_NOTE}
        </p>
      )}
    </section>
  );
}
