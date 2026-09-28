# P5.1 Shell and HUD: the real HQ panel in the office

## Context
The approved panel lives only in the Lab (`/lab/panel`), with its state inside one component. P5.1 puts it in the real office at `/`, fed by live data, so P5.2 and P5.3 can build on it. Decisions stay mocked: nothing is written, nothing is sent.

Your answers: small additive edit in `state/` for GET /api/state; the Walk pill shows a note for now; `/lab/panel` keeps working untouched.

## What I will build
1. **Data in** (`state/connection.ts`, additive): fetch `GET /api/state` at start and after each reconnect, parse with the shared `AppState` schema, then SSE keeps it live. On a drop, the last data stays on screen.
2. **Panel store** (new `ui/panel/panelStore.ts`, zustand): tab, filter, focused item, detail open, mocked decisions, undo, instruction draft and audience. Plain selectors for counts (Needs you, Drafts to review, Waiting on others, D-042), unit tested.
3. **Panel uses the store**: move the `useState` calls in `ui/panel/Panel.tsx` into the store. Same props, so `/lab/panel` still renders as before. Keys (D-031, D-039), focus rules (D-048) and undo (D-047) stay as approved.
4. **Office screen** (`ui/OfficeScreen.tsx`): panel docked right, `clamp(440px, 36vw, 600px)`, 12 px from the edges, registered as an overlay so the camera frames the office in the free area (no scene edits). The panel shell renders from the first frame with skeletons, so nothing jumps when data lands.
   - Top left: the stats HUD (`StatsCard`). "Needs you" becomes a button that opens that tab. Skeleton bars while loading, never a fake 0.
   - Bottom center: the Walk around pill with the note "Walk around comes with the team update. Press Esc to close."
   - Bottom right: the existing view card (Go to and Light). Bottom left: the About note.
   - The title pill goes away: the panel header now carries "SignalChain HQ".
   - Page title: "Needs you (3) · SignalChain HQ".
5. **States from the spec**: offline banner with "Try again", decisions paused while offline, "Reconnecting" in the header, a "Skip to Needs you" link, and under 960 px the panel goes full width with a "Show office" button.
6. **Honest demo line**: the office panel says "Demo: decisions are not saved yet" (sr-only and in the undo bar), instead of the Lab wording.

## Motion and focus
Motion tokens only (`theme/tokens.ts`): panel and HUD fade in with `enter` easing, undo bar 220 ms slide, the reduced-motion versions from the spec. Focus ring 2 px accent, 2 px offset; white on navy.

## Files
- New: `ui/panel/panelStore.ts`, `ui/panel/panelStore.test.ts`, `ui/panel/OfficePanel.tsx` (store plus live data), `ui/WalkPill.tsx`, `ui/panel/OfflineBanner.tsx`
- Changed: `ui/panel/Panel.tsx`, `ui/OfficeScreen.tsx`, `ui/StatsCard.tsx`, `ui/panel/PanelHeader.tsx`, `state/connection.ts` (additive only)
- Not touched: `scene/**`, `lab/**`, `packages/shared` (no schema change needed for P5.1)

## Check
- `pnpm check` (types, lint, unit tests). Store tests: counts, mocked decide and undo, offline pauses decisions.
- Playwright smoke: office loads, panel shows items from `/api/state`, J/K and A move focus and show undo, `[` and `]` switch tabs, Walk pill note opens and closes with Esc.
- `pnpm shots` at 1280, 1440 and 1920, day and night, plus offline and 900 px. I review every shot, and check the office still frames in the free area at 120 fps.
- Update `docs/PROGRESS.md` and `docs/DECISIONS.md`, then stop at the gate.

## Risk
If the camera frames before the panel's size is known, the office could sit under the panel. The always-rendered panel shell should prevent it. If not, the fix is in `scene/camera`, and I will stop and ask.
