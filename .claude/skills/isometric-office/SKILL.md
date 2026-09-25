---
name: isometric-office
description: Conventions for the 3D isometric office in React Three Fiber, including units, camera, the layout and accessories files, zones, voxel characters, name tags, movement, lighting, day and night, walk mode, and performance budgets. Use when building or reviewing anything in the 3D scene.
paths:
  - "apps/web/src/scene/**"
  - "vault/office/**"
  - "vault.sample/office/**"
---

# Isometric office conventions

These are starting values. The Design Council tunes them in Phase 2 and the approved values are written back here.

## Units and axes
- 1 unit = 1 meter. Y is up. The floor is at y = 0. The office floor starts at (0, 0) and grows along +X and +Z.
- Navigation grid cell: 0.5 m.
- Typical sizes: desk 1.4 x 0.7 x 0.74, chair seat 0.45, monitor 0.55 wide, walkway at least 1.2 wide, door 1.0 wide, wall height 2.8 (walls on the two back sides only, front is open like a dollhouse).

## Camera
- Orthographic camera, true isometric direction: the camera sits along (1, 1, 1) from its target, elevation about 35.26 degrees, azimuth 45 degrees.
- Use drei `CameraControls`: polar angle fixed, zoom with the wheel toward the cursor, pan with drag or arrow keys, optional 90 degree rotation snaps (Q and E) with smooth transitions.
- Zoom range about 20 (whole floor) to 90 (one desk). Pan limited to the floor bounds plus a small margin.
- Presets with keyboard shortcuts: 1 Overview, 2 CM Wing, 3 Ops Wing, 4 Sr. Manager's Office. Transitions 700 to 900 ms, eased. With reduced motion, cut with a short fade instead.

## Source-of-truth files
The committed masters live in `vault.sample/office/`. The server copies any missing file into your live `vault/office/` (gitignored), and the app reads and watches the live copy. To make a live change permanent, copy it back to `vault.sample/office/` and commit.
- `zones.json`: zone list (ids, names, purpose). Already seeded.
- `layout.json`: created in Phase 3. Floor size, zone rectangles `[x, z, width, depth]`, walls, doors, windows, desk slots `{ id, seat, pod, pos: [x, z], rot }`, and landmark positions. Validated by a zod schema in `packages/shared`.
- `accessories.json`: decorative props `{ id, kind, zone, pos?, rot?, label?, enabled }`. The server watches it and pushes `office.updated`, so editing and saving the live file updates the office without a reload.

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
- Built in code from rounded boxes, no external rigs: head, hair, torso, arms, legs, plus a lanyard or badge in the track accent. About 1.5 units tall with a big head for charm.
- Variation from a seed per seat: skin tone, hair style and color, top color, one accessory (glasses, headset, mug). Same seed, same look, every time.
- Track shown by badge shape plus color: star (Sr. Manager), triangle (Lead), diamond (CM), square (Ops).
- Procedural animation in `useFrame` with refs: idle breathing, typing, walking (leg and arm swing with a small bob), raise hand for "waiting on you", sit, turn before walking.
- Behavior is a small state machine per seat: `atDesk`, `walking`, `atZone`, `onBreak`, `inMeeting`, `waitingOnYou`, `offDuty`. The server sends the logical status and current step, the client animates it.
- Movement: A* on the navigation grid with path smoothing. Speed about 1.2 m/s. Characters avoid furniture, not each other (keep it simple, add light separation if they overlap).
- Selection: an invisible, larger hit area per character. Selected character gets a soft ring on the floor and the camera eases toward them.

## Name tags
- drei `Html` pills above heads: status dot, name (Quattrocento Sans bold), role (IBM Plex Mono). Tokens from the adi-theme skill.
- Zoomed out: dot and name only. Zoomed in: add the role. Off-duty seats show no tag.
- Avoid ugly overlaps with a simple vertical nudge. Tags do not block camera drags, only clicks on the tag itself.

## Lighting and look (starting recipe)
- Day: hemisphere light (sky #F5F8FF, ground #E6D3B3, intensity about 0.9) plus one warm directional key light (#FFF4E0, about 1.4) from high front-left with soft shadows. Contact shadows under furniture and people.
- Night: navy backdrop #0E1F3B, hemisphere dimmed to about 0.25, emissive windows #FFE2A8, a few desk lamps. No more than 4 real point lights.
- Matte materials, colors from tokens only. Optional subtle post effects (ambient occlusion, very light bloom at night) only if the frame budget allows.
- Theme changes blend over about 1.2 s.

## Walk around mode
The player controls the Sr. Manager avatar (seat `mgr-01`) with WASD or arrow keys, or click-to-move. The camera follows with damping. Near a teammate (under 1.5 m) show a small "Talk" hint, pressing E or clicking opens their card in the panel. Esc returns to the overview camera.

## Performance budget
- 60 fps on a MacBook Pro M4 Pro at 1440p. 45 fps or better on an average Windows laptop.
- Overview camera: under 150 draw calls, under 250k triangles.
- Instancing for repeated furniture. Shared geometries and materials. No large textures. DPR limited to [1, 2] with `AdaptiveDpr`. `PerformanceMonitor` turns off post effects when frames drop.
- Never `setState` in `useFrame`.

## Do and don't
- Do keep every important fact available in the panel too. The 3D world is for mood and orientation.
- Do make every zone findable from the overview.
- Don't copy or trace any reference image, stock illustration, character, or logo.
- Don't show real names or anything that tracks real people.
