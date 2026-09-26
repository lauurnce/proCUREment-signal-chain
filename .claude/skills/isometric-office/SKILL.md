---
name: isometric-office
description: Conventions for the 3D isometric office in React Three Fiber, including units, camera, the layout and accessories files, zones, voxel characters, name tags, movement, lighting, day and night, walk mode, and performance budgets. Use when building or reviewing anything in the 3D scene.
paths:
  - "apps/web/src/scene/**"
  - "vault/office/**"
  - "vault.sample/office/**"
---

# Isometric office conventions

Status: **approved values**, end of Phase 2 (27 Sep 2026). They come from the Lab studies (`/lab/diorama`, `/lab/floorplan`, `/lab/panel`) and the council review. Decisions D-034 to D-047 in `docs/DECISIONS.md`.

## Units and axes
- 1 unit = 1 meter. Y is up. The floor is at y = 0. The office floor starts at (0, 0) and grows along +X and +Z.
- Navigation grid cell: 0.5 m.
- Typical sizes: desk 1.4 x 0.7 x 0.74, chair seat 0.45, monitor 0.55 wide, walkway at least 1.2 wide, door 1.0 wide, wall height 2.8 (walls on the two back sides only, front is open like a dollhouse).

## Camera
- Orthographic camera, true isometric direction: the camera sits along (1, 1, 1) from its target, elevation about 35.26 degrees, azimuth 45 degrees.
- Use drei `CameraControls`: polar angle fixed, zoom with the wheel toward the cursor, pan with drag or arrow keys, optional 90 degree rotation snaps (Q and E) with smooth transitions.
- Zoom range about 20 (whole floor) to 90 (one desk). Pan limited to the floor bounds plus a small margin.
- Presets with keyboard shortcuts: 1 Overview, 2 CM Wing, 3 Ops Wing, 4 Sr. Manager's Office. Transitions 800 ms, move easing. With reduced motion, cut with a short fade instead.
- Docked panel: the canvas fills the window and never resizes for the panel. The camera uses a view offset (`camera.setViewOffset`) of half the covered width, so the scene centers in the free space. The offset eases over 360 ms. The camera refits only when the panel space changes, never on a plain resize (D-047). Reference: `apps/web/src/lab/diorama/DioramaCamera.tsx`.
- Diorama study framing (one pod): zoom fits the slab with room for tags, range 40 to 260.

## Source-of-truth files
The committed masters live in `vault.sample/office/`. The server copies any missing file into your live `vault/office/` (gitignored), and the app reads and watches the live copy. To make a live change permanent, copy it back to `vault.sample/office/` and commit.
- `zones.json`: zone list (ids, names, purpose). Already seeded.
- `layout.json`: created in Phase 3. Floor size, zone rectangles `[x, z, width, depth]`, walls, doors, windows, desk slots `{ id, seat, pod, pos: [x, z], rot }`, and landmark positions. Validated by a zod schema in `packages/shared`.
- `accessories.json`: decorative props `{ id, kind, zone, pos?, rot?, label?, enabled }`. The server watches it and pushes `office.updated`, so editing and saving the live file updates the office without a reload.

## Floor plan (approved, D-037)
- Option 1, Central Bridge: 28 x 18 m. The Endorsement Bridge sits at the floor center with a ring walkway. CM Wing on the screen left, Ops Wing on the screen right, so every handoff reads as one flat line. Sr. Manager's Office in the back corner, facing the bridge. One Leads' Row, 3 m clear of the bridge (D-038).
- The exact zone rectangles, 26 desk slots, walkway graph and doors are in `apps/web/src/lab/floorplan/plans.ts` (option "1"). Phase 3 turns it into `vault.sample/office/layout.json`.
- Phase 3 fixes from `docs/design/reviews/2026-09-26-floorplan.md`: Contract Corner next to the Negotiation Room, Reception and the Negotiation Room low (glass or 1.0 m walls), a clear view from her desk to the bridge, and a bridge rect of [12.5, 7, 3, 4].

## Zones (from the real workflows)
Sr. Manager's Office, Leads' Row, CM Wing (pods of 4, 4, 3), Ops Wing (pods of 4, 4, 2), Endorsement Bridge (hero landmark between CM and Ops), SAP Station, Mail Dock, Contract Corner, Negotiation Room, Huddle Room, Merienda Corner, Logistics Window with a small loading dock outside, Reception. Each zone has one landmark readable from the overview camera.

## Folder structure in `apps/web/src/scene/`
```
Scene.tsx            Canvas, providers, performance monitor
camera/              IsoCamera, presets, walk-mode follow camera
world/               Floor, Walls, Windows, ZoneTint, landmarks/
furniture/           DeskPod, Chair, Monitor, Plant (instanced where repeated)
characters/          rig, generator (seeded), behaviors, pathfinding
tags/                NameTag and label layout
lighting/            DayLights, NightLights, theme transitions
debug/               perf overlay, leva controls (dev only)
```

## Characters
- Built in code from rounded boxes, no external rigs: head, hair, torso, arms, legs, plus an ID card on a lanyard in the track color. About 1.5 m tall standing. Head 0.54 x 0.5 x 0.48 m, two dot eyes, no mouth.
- Seated scale (approved in the diorama): seat top 0.475 m, desk 1.4 x 0.7 x 0.74 m, chair back 0.3 m tall (low, so the body stays visible), monitor 0.56 m wide, pod divider 1.1 m max. Reference: `apps/web/src/scene/characters/Character.tsx`, `scene/furniture/`.
- Outfit tops never use navy (the chairs) or oak (the floor). Badge card 0.14 x 0.16 m.
- Variation from a seed per seat: skin tone, hair style and color, top color, one accessory (glasses, headset, mug). Same seed, same look, every time.
- Track shown by badge shape plus color: star (Sr. Manager), triangle (Lead), diamond (CM), square (Ops).
- Procedural animation in `useFrame` with refs: idle breathing, typing, walking (leg and arm swing with a small bob), raise hand for "waiting on you", sit, turn before walking.
- Behavior is a small state machine per seat: `atDesk`, `walking`, `atZone`, `onBreak`, `inMeeting`, `waitingOnYou`, `offDuty`. The server sends the logical status and current step, the client animates it.
- Movement: A* on the navigation grid with path smoothing. Speed about 1.2 m/s. Characters avoid furniture, not each other (keep it simple, add light separation if they overlap).
- Selection: an invisible, larger hit area per character. Selected character gets a soft ring on the floor and the camera eases toward them.

## Name tags
- Pills in the page, above the canvas (`scene/tags/TagLayer.tsx`), moved every frame by `TagProjector` through refs. Not drei `Html`, which breaks under React 19 Strict Mode (D-036).
- Anchor 2.4 m above the floor for a seated helper, 0.35 m above the hair (D-045).
- Overview: dot and name only (`compact`). Zoomed in: add the role. Off-duty seats show no tag.
- Tags never overlap: a tag behind steps up above the tag in front (`scene/tags/layout.ts`, tested).
- Status always comes from the vault (`withLiveStatus`), so the office shows "waiting on you" when an item really waits.
- Tags do not block camera drags.

## Lighting and look (look A, Soft daylight, chosen in P2.3, D-034)
- Values live in `worldLight` in `apps/web/src/theme/tokens.ts`. Neutral tone mapping, PCF shadows.
- Day: hemisphere light (sky #F5F8FF, ground #E6D3B3, 2.4) plus one warm key light (#FFF4E0, 2.4) high from the front right of the view (offset about [2, 10, 7] from the target), soft shadow radius 4.
- Night: navy backdrop #0E1F3B, hemisphere #3A5A8C over #12284C at 0.9, cool moon key #A8C0DE at 0.5, glowing windows #FFE2A8 (1.2), screens (0.45), and desk lamps. No more than 4 real point lights.
- Back walls never cast shadows (they are stage walls in a cutaway). Only torsos, heads, desk tops, chair seats and big plant parts cast shadows.
- Late afternoon (look B) is kept as a short warm blend on the way to night. Clay studio (look C, contact shadows only) is the fallback when frames drop.
- Matte materials, colors from tokens only. Optional subtle post effects (ambient occlusion, very light bloom at night) only if the frame budget allows.
- Theme changes blend over about 1.2 s.

## Walk around mode
The player controls the Sr. Manager avatar (seat `mgr-01`) with WASD or arrow keys, or click-to-move. The camera follows with damping. Near a teammate (under 1.5 m) show a small "Talk" hint, pressing E or clicking opens their card in the panel. Esc returns to the overview camera.

## Performance budget
- 60 fps on a MacBook Pro M4 Pro at 1440p. 45 fps or better on an average Windows laptop.
- Overview camera: under 150 draw calls, under 250k triangles. **Gate (D-044):** at the start of Phase 4, before any seat goes in, helper cost must not grow per seat (instanced body parts, one shared rounded box). Measured in the Phase 2 diorama: 60 fps on the M4 Pro, but about 221 draw calls for 4 helpers.
- Instancing for repeated furniture. Shared geometries and materials. No large textures. DPR limited to [1, 2] with `AdaptiveDpr`. `PerformanceMonitor` turns off post effects when frames drop.
- Never `setState` in `useFrame`.

## Do and don't
- Do keep every important fact available in the panel too. The 3D world is for mood and orientation.
- Do make every zone findable from the overview.
- Don't copy or trace any reference image, stock illustration, character, or logo.
- Don't show real names or anything that tracks real people.
