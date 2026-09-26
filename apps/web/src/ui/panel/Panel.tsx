import type { AppState } from "@hq/shared";
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import type { ConnectionStatus } from "../../state/store";
import { typeStyle } from "../../theme/style";
import type { Decision } from "../DecisionButton";
import { audiences as allAudiences } from "./audience";
import { BoardTab } from "./BoardTab";
import { InstructionBox } from "./InstructionBox";
import { ItemDetail } from "./ItemDetail";
import { reference, suggestion } from "./itemView";
import { KeyHelp } from "./KeyHelp";
import { isField, panelAction } from "./keys";
import { NeedsYouTab } from "./NeedsYouTab";
import { OfficeTab } from "./OfficeTab";
import { PanelHeader } from "./PanelHeader";
import { PanelTabs, TABS, type TabId } from "./PanelTabs";
import { decidingAs, helperName, needsYou, type QueueFilter } from "./queue";
import { TeamTab } from "./TeamTab";
import { clockTime } from "./time";
import { UndoBar } from "./UndoBar";

type Props = {
  data: AppState;
  connection: ConnectionStatus;
  now: Date;
  /** Tells the page how many items wait on the Sr. Manager, for the HUD and the title. */
  onNeedsCount: (n: number) => void;
  /** Screenshots can open a tab or an item directly. */
  initial?: { tab?: TabId; openFirst?: boolean };
};

type Undo = { itemId: string | null; message: string };

/**
 * The HQ panel (P2.5 Lab version). Decisions stay in this component: nothing is written to the
 * vault and nothing is sent. Keys work only while focus is inside the panel (D-031).
 */
export function Panel({ data, connection, now, onNeedsCount, initial }: Props) {
  const { seats, queue, workflows, tasks } = data;
  const [tab, setTab] = useState<TabId>(initial?.tab ?? "needs");
  const [filter, setFilter] = useState<QueueFilter>("mine");
  const [decided, setDecided] = useState<Record<string, Decision>>({});
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(Boolean(initial?.openFirst));
  const [undo, setUndo] = useState<Undo | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);
  const [audienceId, setAudienceId] = useState("");
  const [about, setAbout] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const textRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const audienceList = useMemo(() => allAudiences(seats), [seats]);

  const open = queue.filter((q) => !decided[q.id]);
  const items = needsYou(open, filter);
  const counts = {
    mine: needsYou(open, "mine").length,
    team: needsYou(open, "team").length - needsYou(open, "mine").length,
  };
  const focused = items.find((q) => q.id === focusedId) ?? items[0] ?? null;
  const index = focused ? items.indexOf(focused) : -1;

  useEffect(() => onNeedsCount(counts.mine), [counts.mine, onNeedsCount]);

  // With a focused Needs you card, "To" is the helper it came from, and the item is attached.
  // On the other tabs "To" starts empty, and it never starts on everyone (panel spec, section 4).
  useEffect(() => {
    if (tab === "needs" && focused) {
      setAudienceId(`seat:${focused.from}`);
      setAbout(reference(focused) ?? focused.id);
    } else {
      setAudienceId("");
      setAbout(null);
    }
  }, [focused, tab]);

  function move(step: number) {
    if (items.length === 0) return;
    const next = items[(index + step + items.length) % items.length];
    if (next) setFocusedId(next.id);
  }

  function decide(action: Decision) {
    if (!focused) return;
    if (action === "instruct") {
      setAudienceId(`seat:${focused.from}`);
      setAbout(reference(focused) ?? focused.id);
      textRef.current?.focus();
      return;
    }
    const at = clockTime(now);
    const helper = helperName(seats, focused.from);
    const as = decidingAs(seats, focused);
    const demo = as ? ` as ${as} (demo)` : "";
    const message =
      action === "approve"
        ? as
          ? `Approved${demo}, ${at}.`
          : `Approved by you, ${at}.`
        : action === "hold"
          ? as
            ? `Put on hold${demo}, ${at}.`
            : `On hold, ${at}.`
          : `Sent back to ${helper}${demo}, ${at}.`;
    const next = items[index + 1] ?? items[index - 1] ?? null;
    setDecided((d) => ({ ...d, [focused.id]: action }));
    setFocusedId(next?.id ?? null);
    setUndo({ itemId: focused.id, message });
    setAnnounce(`${message} Undo for 5 seconds, press U.`);
    if (!next) setDetailOpen(false);
  }

  function undoLast() {
    if (!undo) return;
    const { itemId } = undo;
    if (itemId) {
      setDecided((d) => {
        const { [itemId]: _, ...rest } = d;
        return rest;
      });
      setFocusedId(itemId);
      setAnnounce("Undone. The item is back in Needs you.");
    } else {
      setPreview(null);
      setAnnounce("Undone. The instruction was not sent.");
    }
    setUndo(null);
  }

  function send() {
    const audience = audienceList.find((a) => a.id === audienceId);
    if (!audience || !text.trim()) return;
    const message = `Instruction sent to ${audience.label}, ${clockTime(now)}.`;
    setPreview(`This would go to ${audience.label}: "${text.trim()}"`);
    setText("");
    setUndo({ itemId: null, message });
    setAnnounce(message);
  }

  function onKeyDown(e: KeyboardEvent) {
    const action = panelAction({
      key: e.key,
      metaKey: e.metaKey,
      ctrlKey: e.ctrlKey,
      altKey: e.altKey,
      inField: isField(e.target),
    });
    if (!action) return;
    // Buttons keep their own Enter. The panel only opens items from the list or the page.
    if (action === "open" && e.target instanceof HTMLButtonElement) return;
    e.preventDefault();
    if (action === "back") {
      if (helpOpen) setHelpOpen(false);
      else if (isField(e.target)) rootRef.current?.focus();
      else if (detailOpen) setDetailOpen(false);
      return;
    }
    if (action === "help") return setHelpOpen((h) => !h);
    if (action === "undo") return undoLast();
    if (action === "tabNext" || action === "tabPrev") {
      const i = TABS.findIndex((t) => t.id === tab);
      const n = (i + (action === "tabNext" ? 1 : -1) + TABS.length) % TABS.length;
      return setTab(TABS[n]?.id ?? "needs");
    }
    if (tab !== "needs") return;
    if (action === "next") return move(1);
    if (action === "prev") return move(-1);
    if (action === "open") return focused && setDetailOpen(true);
    const decisions = {
      approve: "approve",
      hold: "hold",
      sendBack: "send-back",
      instruct: "instruct",
    } as const;
    decide(decisions[action]);
  }

  const placeholder =
    tab === "needs" && focused
      ? (suggestion(focused) ?? `Tell ${helperName(seats, focused.from)} what to do.`)
      : "Tell the helpers what to do. For example: Ask Luzon Precision for a firm ship date by 29 Sep 2026.";

  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: the panel root catches keys for its shortcuts (D-031)
    <div
      ref={rootRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      data-testid="hq-panel"
      className="relative flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-white outline-none"
    >
      <PanelHeader
        connection={connection}
        seatCount={seats.length}
        onKeys={() => setHelpOpen(true)}
      />
      <PanelTabs current={tab} needsCount={counts.mine} onChange={setTab} />
      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto"
        style={{ scrollPaddingBottom: 120 }}
      >
        {tab === "needs" &&
          (detailOpen && focused ? (
            <ItemDetail
              item={focused}
              seats={seats}
              workflows={workflows}
              position={`${index + 1} of ${items.length}`}
              onBack={() => setDetailOpen(false)}
              onPrev={() => move(-1)}
              onNext={() => move(1)}
              onDecide={decide}
            />
          ) : (
            <NeedsYouTab
              items={items}
              counts={counts}
              filter={filter}
              focusedId={focused?.id ?? null}
              seats={seats}
              workflows={workflows}
              now={now}
              onFilter={setFilter}
              onFocus={setFocusedId}
              onOpen={(id) => {
                setFocusedId(id);
                setDetailOpen(true);
              }}
              onDecide={decide}
            />
          ))}
        {tab === "team" && <TeamTab seats={seats} queue={open} workflows={workflows} />}
        {tab === "board" && (
          <BoardTab
            tasks={tasks}
            seats={seats}
            workflows={workflows}
            today={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now)}
          />
        )}
        {tab === "office" && <OfficeTab />}
      </div>
      {undo && (
        <UndoBar
          key={undo.message}
          message={undo.message}
          onUndo={undoLast}
          onExpire={() => setUndo(null)}
        />
      )}
      <InstructionBox
        audiences={audienceList}
        audienceId={audienceId}
        onAudience={setAudienceId}
        text={text}
        onText={setText}
        about={about}
        onDetach={() => setAbout(null)}
        placeholder={placeholder}
        onSend={send}
        preview={preview}
        textRef={textRef}
      />
      {helpOpen && <KeyHelp onClose={() => setHelpOpen(false)} />}
      <p aria-live="polite" className="sr-only">
        {announce}
      </p>
      <span className="sr-only" style={typeStyle("small")}>
        Lab only, nothing is saved or sent.
      </span>
    </div>
  );
}
