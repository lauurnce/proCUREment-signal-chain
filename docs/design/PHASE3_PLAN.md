# Phase 3 plan: the office world

Status: approved by Lawrence on 27 Sep 2026 (P3.1), with D-049 and D-050. Written with the r3f-engineer, the world-artist's floor plan review and the Contract Corner variants.

**Big idea:** one file, `layout.json`, describes the floor. The server checks it, the web draws it, and the camera presets come from it. Nothing about the room is hard-coded.

## 1. layout.json and its schema
- Schema: `packages/shared/src/schemas/layout.ts`. Fields: `floor`, `zones [{id, rect, anchor, labelAt}]`, `walls [{id, from, to, kind: full | low | glass}]` (2.8, 1.0 and 2.4 m), `doors`, `windows`, `deskSlots [{id, seat, pod, pos, facing}]`, `landmarks [{id, zone, kind, pos, rot}]`, `walkways {nodes, edges}`.
- Checks inside the file: unique ids, everything inside the floor, doors and windows on their walls, walkway edges point at real nodes.
- Checks against `zones.json` (`vault/references.ts`): every zone placed once, every seat at exactly one desk, pods match, desks and landmarks inside their zone.
- Content: Option 1, Central Bridge, variant 1a (D-049): Contract Corner at the front next to the Negotiation Room, CM pods in a 2 by 2 grid. Plus review fixes 2, 3, 4, 5 and 7: glass Negotiation Room, glass office with a view to the bridge, the Huddle Room corner cut, the smaller bridge, the To Planner tray, no dead ends. Fix 6 (one name tag for the Leads) comes with the tags in Phase 4. Fix 8 was done by the Lab route table. Fix 9 (dock on the front edge) was not taken.
- Server: `load.ts` reads it into `office.layout`. The vault seed already copies it. A broken file during a live edit keeps the last good layout, with a warning (D-050).

## 2. Components in `apps/web/src/scene/`
```
Scene.tsx        canvas, waits for the first state, zone label layer
layout/boxes.ts  pure builders: layout to box lists, seatSpot
batch/           InstancedBoxes: one draw call per box list
world/           OfficeWorld, Planks (the placeholder floor stays for a broken file)
labels/          zone labels in the page, fading in with zoom, moved through refs
camera/          OfficeCamera, presets (pure math)
lighting/        DayLights (look A for now, the full recipe in P3.3)
debug/           PerfOverlay (?perf=1), RenderInfo (?shots=1)
```

## 3. Instancing and budget
Every box is drawn in one instanced batch per material: plain (receive only), cast (desk edges and chair seats), screens, window panes, glass, plus the planks. Walls never cast shadows.

| Phase 3 world at Overview | Draw calls | Triangles |
|---|---|---|
| Target | 23 | 36k |
| Hard cap (Playwright test) | 40 | 50k |
| Measured, P3.2 | 7 | 9.6k |

## 4. Camera
- Presets from zone rects: Overview (the floor), CM Wing, Ops Wing, Sr. Manager's Office with the bridge. `?view=overview|cm|ops|mgr` opens on one.
- Zoom from 0.9 times the overview zoom up to 90. Pan stays over the floor plus 2 m.
- P3.3: 800 ms eased moves, keys 1 to 4 (never while typing, never in walk mode), a 140 ms fade with reduced motion.
- The docked panel arrives in Phase 5. `fitRects` already takes the covered width.

## 5. Tests
Unit: schema, the checks against `zones.json`, builders, fit math, label fade. Playwright: the budget, labels hidden at Overview and shown zoomed in, and shots of the Overview and each preset.
