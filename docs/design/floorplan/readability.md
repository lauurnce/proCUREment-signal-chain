# Floor plan readability, round 1

Author: ux-architect. Status: draft for P2.4, 26 Sep 2026. Read with `adjacency.md` (procurement-sme). Floor about 28 x 18 m, 1 unit = 1 m, floor from (0, 0) along +x and +z.

## 0. How the camera sees the floor

The camera sits along (1, 1, 1) from its target. So on screen:

| Floor point | Where it lands on screen |
|---|---|
| (0, 0), the back corner | top center. Both walls meet here. Never hidden by anything. |
| (28, 0), end of the long back wall | right corner, closest to the panel |
| (0, 18), end of the short back wall | left corner |
| (28, 18), the front corner | bottom center, closest to the viewer |

Two handy numbers: a point moves right on screen as (x minus z) grows, and moves down as (x plus z) grows. The +x edge (lower right) and the +z edge (lower left) are open, like a dollhouse.

Scale at Overview. The floor diamond is about 32.5 m wide on screen. With the panel at 35 percent and 40 px margins, the free area is about 860 px at 1440 x 900 (about 26 px per m) and about 1170 px at 1920 x 1080 (about 36 px per m). 1440 x 900 is the tight case. Design for it.

## 1. Reading from the fixed view

**The hero.** Put the Endorsement Bridge near the floor center, about x 12 to 16, z 7 to 11. The floor center projects to the middle of the diamond, so at Overview the bridge lands in the middle of the free area, left of the panel, a little above the vertical middle once the walls are added. Keep about 3 m around the bridge free of desks, so its folder slide and its tag never fight with seat tags.

**Handoff reads left to right.** Put the CM Wing on the screen left (low x minus z) and the Ops Wing on the screen right. A folder then moves left to right, the way we read, toward the panel where decisions live.

**The back.** The back corner (0, 0) is the safest, most visible spot. It suits the Sr. Manager's Office: a flat desk against the back walls, the dashboard wall on the wall behind her (glows at night), a window that faces the bridge. No raised floor and no glass box that looks down over pods (trust rule in `adjacency.md`).

**Tall things.** An object of height h hides the floor behind it for about 1.4 x h meters along the view line (toward the back corner). A 2.8 m wall hides about 4 m. A seated helper hides about 1.7 m.
- Tall things (over 1.2 m: shelves, dashboard wall, big plants, vending, room walls) go only against the back walls x = 0 or z = 0, or near the back corner.
- Room walls that face the viewer (the +x and +z sides of a room) are cut to 1.0 m or are glass. The Negotiation Room and Huddle Room follow this.
- Nothing over 0.9 m in the front band (x plus z over about 36), except characters.
- Nothing tall directly in front of (toward the viewer from) the bridge, the Needs You tray, or any pod.

**Outside is only visible at the open edges.** Anything outside a back wall is hidden. So the Logistics Window loading dock must sit off an open edge. Prefer the +z edge (lower left, away from the panel), or the +x edge only if it stays clear of the panel margin.

**The panel side.** The right corner (28, 0) sits nearest the panel. Put calm, low-traffic things there, never the hero or the Needs You tray.

## 2. Walkways

- **Main loop:** 2.0 m wide, one closed ring around the bridge that touches every zone door. Two helpers and the avatar can pass without bumping.
- **Aisles:** at least 1.2 m. Behind chairs: 1.2 m from the desk edge. Room doors: 1.2 m (the skill minimum is 1.0, we want room for the avatar).
- All widths in steps of 0.5 m, to match the navigation grid.
- **Every seat within 1.5 m of a walkway cell,** so the "Talk" hint works from the aisle. Pods of 2 x 2 do this. Avoid 2 x 3 blocks.
- **Entrances:** one main entrance at Reception, on an open edge near the front corner (the +z edge is best, lower left in the free area). A supplier can reach the Negotiation Room from Reception without passing the CM desks.
- **Walk mode feel.** Keys move relative to the screen: W is up the screen, which is diagonal on the floor. W plus D walks along -z, S plus D along +x. So the avatar slides along walls instead of sticking, and click-to-move is always on. The follow camera keeps the avatar in the center of the free area (not the viewport center), zoom about 55, with a small dead zone. Because tall things stay at the back, the avatar never disappears behind furniture. If it ever does, show a soft outline. Zone floor tints plus one landmark per zone keep her oriented. Esc returns to Overview. The avatar starts in her office.

## 3. Camera presets

The target always lands in the center of the free area, never under the panel. Presets reset any Q or E rotation to the default view. With reduced motion, cut with a short fade.

| Key | Preset | Frames | Zoom (1440 wide) |
|---|---|---|---|
| 1 | Overview | Whole floor, both walls and the navy slab edge, 40 px margins. Bridge near center. | fit, about 26 |
| 2 | CM Wing | All 3 CM pods (11 seats), the bridge at the right edge of the frame, Contract Corner and Negotiation Room if near. | about 45 |
| 3 | Ops Wing | All 3 Ops pods (10 seats), the bridge at the left edge, SAP Station and Mail Dock. | about 45 |
| 4 | Sr. Manager's Office | Her desk, the Needs You tray, the dashboard wall, and a glimpse of Leads' Row and the bridge. | about 70 |

Presets 2 and 3 use the same zoom and both show the bridge, so switching between them feels like one move across the seam.

## 4. Name tag density

Sizes at Overview: a name pill is about 110 x 26 px, a track badge about 18 px. At 26 px per m, two tags collide unless their centers differ by at least:
- **Pills:** 2.8 m in (x plus z), or 6 m in (x minus z).
- **Badges:** 2.3 m in (x plus z), or 1.3 m in (x minus z).

What this means for the plan:
- Inside a 2 x 2 pod, badges fit. Full pills do not. So at Overview, one pod shows at most one pill. If 2 or more seats in a pod wait on her, show one pod pill with a count ("CM pod B · 2 waiting").
- **Pod pitch:** at least 4.5 m between pod centers along an axis. Never place two pods on the same (x plus z) line unless they are 6 m or more apart in (x minus z). Pods along a screen-horizontal line are the risky case.
- Leads' Row seats keep 3 m from the bridge center, so the hero tag stays clean.
- **Budget at Overview:** full pills only for waiting, hovered or selected helpers, at most 8. Everyone else shows a badge. Walking helpers (max 6) show a badge while moving, unless selected. Zone names appear on hover or in walk mode, not always.

## 5. Checklist for the two options

1. The bridge lands in the middle of the free area at Overview at 1440 x 900 with a 35 percent panel.
2. CM is on the screen left, Ops on the screen right. The handoff reads left to right.
3. No object over 1.2 m stands in front of the bridge, the Needs You tray, or any pod. Room walls facing the viewer are 1.0 m or glass.
4. The Sr. Manager's Office is at the back, flat, facing the bridge, not overlooking pods.
5. One main loop of 2.0 m touches every zone. Aisles are 1.2 m or more. Every seat is within 1.5 m of a walkway.
6. The entrance and the loading dock sit on open edges, visible at Overview, not under the panel.
7. Pod centers pass the tag rule (2.8 m in x plus z, or 6 m in x minus z). No pill collisions at Overview with the worst case of 8 pills.
8. Every zone has one landmark you can find at Overview without reading a label.
9. Presets 2 and 3 frame a full wing plus the bridge at the same zoom. Preset 4 shows the tray.
10. The busiest routes (Ops: bridge, SAP Station, desk, Mail Dock) stay short and do not cross the pantry or the visitor path.
