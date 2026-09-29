import type { AppState } from "@hq/shared";
import { AnimatePresence, MotionConfig } from "motion/react";
import { type KeyboardEvent, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { ConnectionStatus } from "../../state/store";
import type { Decision } from "../DecisionButton";
import { audiences as allAudiences } from "./audience";
import { BoardTab } from "./BoardTab";
import { InstructionBox, LAB_NOTE } from "./InstructionBox";
import { ItemDetail } from "./ItemDetail";
import { reference, suggestion } from "./itemView";
import { KeyHelp } from "./KeyHelp";
import { isField, panelAction } from "./keys";
import { useLinkState } from "./linkState";
import { NeedsYouTab } from "./NeedsYouTab";
import { OfficeTab } from "./OfficeTab";
import { OfflineBanner } from "./OfflineBanner";
import { PanelHeader } from "./PanelHeader";
import { PanelTabs, TABS, type TabId } from "./PanelTabs";
import {
  decisionMessage,
  openItems,
  type PanelCounts,
  panelCounts,
  usePanelStore,
} from "./panelStore";
import { decidingAs, helperName, needsYou, type QueueFilter } from "./queue";
import { TeamTab } from "./TeamTab";
import { clockTime } from "./time";
import { UndoBar } from "./UndoBar";

export type { PanelCounts } from "./panelStore";

type Props = {
  data: AppState;
  connection: ConnectionStatus;
  now: Date;
  /** Live counts for the stats card and the page title (D-042). */
  onCounts?: (counts: PanelCounts) => void;
  /** Screenshots can open a tab or an item directly. */
  initial?: { tab?: TabId; openFirst?: boolean; filter?: QueueFilter };
  /** Says that nothing is saved or sent yet. Defaults to the Lab wording. */
  note?: string;
  /** "Try again" in the offline banner. */
  onRetry?: () => void;
  /** Narrow screens only: hides the panel so the office shows. */
  onShowOffice?: () => void;
};

/** Room at the end of the list while the undo bar floats over it, so the last card can scroll clear. */
const UNDO_SPACE = 72;

/**
 * The HQ panel. Its state lives in the panel store (panelStore.ts), so the HUD and the page
 * title read the same numbers. Decisions are mocked: nothing is written to the vault and
 * nothing is sent. Keys work only while focus is inside the panel (D-031).
 */
export function Panel({
  data,
  connection,
  now,
  onCounts,
  initial,
  note = LAB_NOTE,
  onRetry,
  onShowOffice,
}: Props) {
  const { seats, queue, workflows, tasks, authorityRules } = data;
  const s = usePanelStore(
    useShallow((p) => ({
      tab: p.tab,
      filter: p.filter,
      decided: p.decided,
      focusedId: p.focusedId,
      detailOpen: p.detailOpen,
      undo: p.undo,
      helpOpen: p.helpOpen,
      audienceId: p.audienceId,
      about: p.about,
      text: p.text,
      preview: p.preview,
      announce: p.announce,
      focusRequest: p.focusRequest,
    })),
  );
  const act = usePanelStore.getState();
  const link = useLinkState(connection);
  const paused = connection !== "live";
  const textRef = useRef<HTMLTextAreaElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const bannerRef = useRef<HTMLElement>(null);
  const audienceList = useMemo(() => allAudiences(seats), [seats]);

  // A fresh panel for each page, before the first paint. The initial values are for screenshots.
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs once, on mount
  useLayoutEffect(() => act.start(initial), []);

  // The time of the last data from the server, for the offline banner and tooltip.
  const nowRef = useRef(now);
  nowRef.current = now;
  const [lastUpdate, setLastUpdate] = useState(() => clockTime(now));
  // biome-ignore lint/correctness/useExhaustiveDependencies: data is the trigger
  useEffect(() => setLastUpdate(clockTime(nowRef.current)), [data]);

  const open = openItems(queue, s.decided);
  const items = needsYou(open, s.filter);
  const counts = useMemo(() => panelCounts(queue, s.decided), [queue, s.decided]);
  const tabCounts = { mine: counts.needsYou, team: counts.waitingOnOthers };
  const focused = items.find((q) => q.id === s.focusedId) ?? items[0] ?? null;
  const index = focused ? items.indexOf(focused) : -1;

  useEffect(() => onCounts?.(counts), [counts, onCounts]);

  // Keyboard focus never falls out of the panel: after a decision it moves to the next card,
  // after Undo to the restored card, and on Enter to the item title (D-048).
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs after the render that shows the target
  useEffect(() => {
    const request = s.focusRequest;
    if (!request) return;
    const root = rootRef.current;
    const id = request.id ?? focused?.id;
    const el =
      request.target === "panel" || !id
        ? root
        : root?.querySelector<HTMLElement>(`[data-focus-id="${request.target}-${id}"]`);
    (el ?? root)?.focus({ preventScroll: request.quiet });
    act.requestFocus(null);
  }, [s.focusRequest]);

  // With a focused Needs you card, "To" is the helper it came from, and the item is attached.
  // On the other tabs "To" starts empty, and it never starts on everyone (panel spec, section 4).
  // biome-ignore lint/correctness/useExhaustiveDependencies: store actions are stable
  useEffect(() => {
    if (s.tab === "needs" && focused)
      act.attach(`seat:${focused.from}`, reference(focused) ?? focused.id);
    else act.attach("", null);
  }, [focused, s.tab]);

  function move(step: number) {
    if (items.length === 0) return;
    const next = items[(index + step + items.length) % items.length];
    if (!next) return;
    act.focusCard(next.id, { target: s.detailOpen ? "detail" : "card", id: next.id });
  }

  function decide(action: Decision) {
    if (!focused) return;
    if (paused) {
      // Offline: point to the banner instead (panel spec, section 6).
      act.say("Decisions are paused until the server is back.");
      bannerRef.current?.focus();
      return;
    }
    if (action === "instruct") {
      act.attach(`seat:${focused.from}`, reference(focused) ?? focused.id);
      textRef.current?.focus();
      return;
    }
    const message = decisionMessage(
      action,
      helperName(seats, focused.from),
      decidingAs(seats, focused),
      clockTime(now),
    );
    const next = items[index + 1] ?? items[index - 1] ?? null;
    act.decide(focused.id, action, message, next?.id ?? null);
  }

  function send() {
    const audience = audienceList.find((a) => a.id === s.audienceId);
    if (paused || !audience || !s.text.trim()) return;
    act.send(
      `This would go to ${audience.label}: "${s.text.trim()}"`,
      `Instruction sent to ${audience.label}, ${clockTime(now)}.`,
    );
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
      if (s.helpOpen) act.setHelpOpen(false);
      else if (s.detailOpen && !isField(e.target)) act.setDetailOpen(false);
      // Back to the last card: from a text box, from the detail, or after closing the key list.
      act.requestFocus(s.tab === "needs" ? { target: "card" } : { target: "panel" });
      return;
    }
    if (action === "help") return act.setHelpOpen(!s.helpOpen);
    if (action === "undo") return act.undoLast();
    if (action === "tabNext" || action === "tabPrev") {
      const i = TABS.findIndex((t) => t.id === s.tab);
      const n = (i + (action === "tabNext" ? 1 : -1) + TABS.length) % TABS.length;
      return act.setTab(TABS[n]?.id ?? "needs");
    }
    if (s.tab !== "needs") return;
    if (action === "next") return move(1);
    if (action === "prev") return move(-1);
    if (action === "open") {
      if (!focused) return;
      act.setDetailOpen(true);
      return act.requestFocus({ target: "detail", id: focused.id });
    }
    const decisions = {
      approve: "approve",
      hold: "hold",
      sendBack: "send-back",
      instruct: "instruct",
    } as const;
    decide(decisions[action]);
  }

  const placeholder =
    s.tab === "needs" && focused
      ? (suggestion(focused) ?? `Tell ${helperName(seats, focused.from)} what to do.`)
      : "Tell the helpers what to do. For example: Ask Luzon Precision for a firm ship date by 29 Sep 2026.";

  return (
    <MotionConfig reducedMotion="user">
      {/* biome-ignore lint/a11y/noStaticElementInteractions: the panel root catches keys for its shortcuts (D-031) */}
      <div
        ref={rootRef}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        data-testid="hq-panel"
        className="relative flex h-full flex-col overflow-hidden rounded-card border border-hairline bg-white outline-none"
      >
        <PanelHeader
          link={link}
          lastUpdate={lastUpdate}
          seatCount={seats.length}
          onKeys={() => act.setHelpOpen(true)}
          onShowOffice={onShowOffice}
        />
        <PanelTabs current={s.tab} needsCount={counts.needsYou} onChange={act.setTab} />
        {connection === "offline" && (
          <OfflineBanner ref={bannerRef} lastUpdate={lastUpdate} onRetry={() => onRetry?.()} />
        )}
        {/* The undo bar floats over the bottom of the tab body, so nothing above it moves. */}
        <div className="relative min-h-0 flex-1">
          <div
            role="tabpanel"
            id={`panel-${s.tab}`}
            aria-labelledby={`tab-${s.tab}`}
            className="h-full overflow-y-auto"
            // Taller than the sticky decision bar (and the undo bar while it shows), so they never
            // hide focus (WCAG 2.4.11).
            style={{
              scrollPaddingBottom: s.undo ? 230 : 160,
              paddingBottom: s.undo ? UNDO_SPACE : 0,
            }}
          >
            {s.tab === "needs" &&
              (s.detailOpen && focused ? (
                <ItemDetail
                  item={focused}
                  seats={seats}
                  workflows={workflows}
                  rules={authorityRules}
                  position={`${index + 1} of ${items.length}`}
                  onBack={() => {
                    act.setDetailOpen(false);
                    act.requestFocus({ target: "card" });
                  }}
                  onPrev={() => move(-1)}
                  onNext={() => move(1)}
                  onDecide={decide}
                  paused={paused}
                />
              ) : (
                <NeedsYouTab
                  items={items}
                  counts={tabCounts}
                  filter={s.filter}
                  focusedId={focused?.id ?? null}
                  seats={seats}
                  workflows={workflows}
                  rules={authorityRules}
                  now={now}
                  onFilter={act.setFilter}
                  onFocus={(id) => act.focusCard(id, { target: "card", id })}
                  onOpen={(id) => {
                    act.focusCard(id, { target: "detail", id });
                    act.setDetailOpen(true);
                  }}
                  onDecide={decide}
                  paused={paused}
                />
              ))}
            {s.tab === "team" && <TeamTab seats={seats} queue={open} workflows={workflows} />}
            {s.tab === "board" && (
              <BoardTab
                tasks={tasks}
                seats={seats}
                workflows={workflows}
                today={new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila" }).format(now)}
              />
            )}
            {s.tab === "office" && <OfficeTab />}
          </div>
          <AnimatePresence>
            {s.undo && (
              <UndoBar
                key={s.undo.message}
                message={s.undo.message}
                note={note}
                onUndo={act.undoLast}
                onExpire={act.expireUndo}
              />
            )}
          </AnimatePresence>
        </div>
        <InstructionBox
          audiences={audienceList}
          audienceId={s.audienceId}
          onAudience={act.setAudience}
          text={s.text}
          onText={act.setText}
          about={s.about}
          onDetach={act.detach}
          placeholder={placeholder}
          onSend={send}
          preview={s.preview}
          textRef={textRef}
          paused={paused}
          note={note}
        />
        {s.helpOpen && <KeyHelp onClose={() => act.setHelpOpen(false)} />}
        <p aria-live="polite" className="sr-only">
          {s.announce}
        </p>
        <span className="sr-only">{note}</span>
      </div>
    </MotionConfig>
  );
}
