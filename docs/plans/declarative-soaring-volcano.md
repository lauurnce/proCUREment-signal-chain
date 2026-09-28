# P4.2 Name tags, status and selection (plan)

## Context
The 26 helpers sit at their desks, but you cannot tell who is who, see their status, or pick one. The Lab already has the tag pill (`ui/NameTag.tsx`), the per-frame placement (`scene/tags/TagProjector.tsx`) and a tested nudge (`scene/tags/layout.ts`). We reuse those in the office and add selection, so the panel can use it after the merge.

## What you will see
- A pill over each helper: track badge, name ("CM 03 helper"), status dot. Role line: the track name ("Category Manager"), as the NameTag doc says when there is no job nickname.
- Zoomed out: dot and name only. Zoomed in past 1.5x the Overview zoom: the role line too. A small gap between the in and out points, so tags never flicker at the edge.
- Off-duty helpers show no tag (skill rule). Tags that leave the screen or sit under the view card, title or note hide, like the zone labels.
- Overlaps: the existing nudge, a tag behind steps up above the tag in front.
- Click a helper: the camera eases to them (800 ms, fade and cut with reduced motion), a soft ring shows on the floor under their chair, their tag gets a navy outline. Esc clears. A drag never counts as a click.
- Status always comes from `/api/state` and the live events (the store's `seats`).

## New files, all in `scene/characters/`
1. `selection.ts`: a small zustand store just for selection. Exposes `selectSeat(seatId | null)`, `onSeatSelected(listener) => unsubscribe` (fires with `{ seatId, source: "click" | "api" }`), and `useSelectedSeat()`. It also holds the camera focus request. Own store, so no edit to `state/store.ts`, which the panel worktree may change.
2. `tags.ts` (pure, tested): seats to tag data, anchor points (2.4 m above the seat, D-045), the compact switch with its gap.
3. `OfficeTagLayer.tsx` (page, outside the canvas) and `OfficeTagProjector.tsx` (in the canvas). Reuse `NameTag` and `nudgeTags`. Each tag holds a compact and a full pill, and the projector switches between them through the DOM when the zoom crosses the line. No React state per frame.
4. `SeatPicker.tsx`: one invisible instanced box per helper (0.8 x 1.6 x 0.8 m) as the larger click area, 0 extra draw calls. Pointer cursor on hover. The selection ring: 1 small mesh.

## Edits outside my folder (need your OK)
- `scene/Scene.tsx`: make one tag registry and mount `OfficeTagLayer` next to the zone labels, plus the projector and picker inside the canvas. About 6 lines.
- `scene/camera/OfficeCamera.tsx`: follow a focus request from `selection.ts`, with the same tween, drag cancel and reduced-motion fade that views use. A view key (1 to 5) still wins. About 20 lines.
- `apps/web/e2e/smoke.spec.ts` and `shots.spec.ts`: the new test and the 2 new shots.
- No edits to `ui/**`, `state/**` or `packages/shared/**`. NameTag is used as it is.

## Tests
- Vitest: tag data from seats (off-duty hidden, names and roles), the compact switch and its gap, `selectSeat` and `onSeatSelected` (fires once, unsubscribe works, unknown seat ignored), focus framing.
- Playwright smoke: click a helper, the tag gets the selected state and `onSeatSelected` fired, Esc clears. Budget test still passes.
- Screenshots: existing office shots (tags now show), plus 2 new ones: a wing zoomed in with roles, and a selected helper.

## Verification
`pnpm check`, `pnpm e2e`, `pnpm shots`, look at every office shot myself, then PROGRESS and DECISIONS, and stop at the gate.
