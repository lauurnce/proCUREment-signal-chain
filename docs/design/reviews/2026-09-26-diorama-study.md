# Diorama study review (P2.3)

Reviewer: world-artist. Date: 26 Sep 2026. Screens: `docs/qa/shots/2026-09-26/diorama-{a,b,c}-day-*.png` at 1440x900 and 1920x1080.

## 1. My favorite: A, Soft daylight

A is the best base for the full office. Here is why.
- It reads fastest. Every helper, desk and chair has a clear shadow on the floor, so things feel placed, not floating.
- Colors stay true. The CM light blue top, the Ops green top and the screens look like their tokens.
- It scales. One high key light gives short shadows, so 26 helpers will not paint the floor dark. One 2048 shadow map covers a 28 x 18 m floor well at this angle.

What each look does well and badly:

| Look | Good | Bad |
|---|---|---|
| A. Soft daylight | Clear, friendly, true colors, grounded furniture | The left wall is a muddy grey (the key light never hits it). A little plain, no "moment" |
| B. Late afternoon | The warmest and most cozy. Long plant shadow on the wall is lovely. Floor light stripes add life for free | Light comes from behind, so faces and screens sit in shade. Long shadows cover most of the front floor. With 26 helpers this turns into dark mush. Warm light shifts the CM light blue to grey, which hurts track reading. The window wall goes grey |
| C. Clay studio | Cheapest while still (no shadow pass). Clean and calm | Things float. The contact shadow is faint and only covers the pod. Hair blocks look flat. Once helpers walk, contact shadows must redraw every frame, so the cost comes back |

## 2. What to take from the other looks

- From B: the flat sun stripes (a few planes, almost no cost). Use them in A near the window at a lower opacity (0.15). Use B's warm colors (`keyLightDusk`, `backdropDusk`) only as a short "late afternoon" blend, about 4:30 to 5:30 PM Manila, on the way to night. Keep A's high key angle during that blend, not B's low sun.
- From C: the navy contact shadow as the fallback. When `PerformanceMonitor` drops, turn off the shadow map and render one `ContactShadows` pass (`frames={1}`) under the whole floor. C also shows that a bit more sky light keeps walls clean, see fix 3.

## 3. Art fixes, ranked

1. **Front-row helpers vanish into their chairs.** Lead 01 wears a navy top on a navy chair, and the 0.46 m chair back hides the torso. From behind you see a dark box. At overview about half the helpers face away, so this matters most.
   - `apps/web/src/scene/furniture/Chair.tsx`: chair back from `[0.44, 0.46, 0.06]` at y 0.74 to `[0.44, 0.30, 0.06]` at y 0.66. Move the accent stripe to y 0.76.
   - `apps/web/src/theme/tokens.ts` (`topColors`): remove #12284C (same as chairs) and #E6D3B3 (same as the floor). Replace with #A8C0DE and #CBAE84. Keep #4B5565 only if bottoms never use it on the same helper.
2. **Every head is the same dark helmet.** All four helpers have near-black hair, and from behind the hair slab covers the whole back of the head.
   - `tokens.ts` (`hairColors` weights): soft black 3, black brown 2, dark brown 3, brown 3, light brown 2, auburn brown 2, silver grey 1. Still mostly dark, but not a wall of black.
   - `apps/web/src/scene/characters/Hair.tsx`: back piece from 0.30 to 0.20 tall (position y 0.38), so a strip of neck skin shows. Add two silhouettes, a low ponytail (box 0.14 x 0.22 x 0.12 behind the head) and a side-part tuft (box 0.2 x 0.06 x 0.3 on one side of the cap). Shape changes read better than color at zoom 20.
3. **A: the left wall is muddy grey.** It shows about #B3ADA2 instead of warm off-white #F5F2EC. The key at offset `[-4, 10, 7]` points away from it.
   - `apps/web/src/lab/diorama/looks.ts`, look A: key offset to `[2, 10, 7]`, key intensity 2.6 to 2.4, sky intensity 2.1 to 2.4. Goal: the left wall reads within about 10 percent of the right wall. Shadows still fall back and away from the viewer.
4. **Draw calls will blow the budget.** One helper is about 22 meshes. 26 helpers means about 570 draw calls, and the shadow pass adds most of them again. The budget is 150.
   - `apps/web/src/scene/characters/Character.tsx`, `Hair.tsx`, `TrackBadge3D.tsx`: merge each helper's still parts into one geometry per material group (or instance body parts across helpers). Keep only the head, upper body and two hands as moving groups.
   - Only the torso, head and chair seat cast shadows. Eyes, shoes, hands, badges and lamps do not.
5. **The window almost disappears by day.** `windowDay` #EAF2FB on the #F5F2EC wall has almost no contrast. Only the mullion shows. This window becomes the Logistics Window landmark.
   - `tokens.ts`: `windowDay` to #D6E4F2. Add a 0.04 m navy frame on all four sides in `apps/web/src/scene/world/BackWalls.tsx` (today only the center bar and sill exist).
6. **Track badges are too small to see.** The card is 0.10 x 0.12 m and the shape 0.045 m. That is a few pixels at zoom 100 and nothing at overview.
   - `TrackBadge3D.tsx`: card to 0.14 x 0.16, shapes to about 0.07. Add a lanyard: two thin straps (0.03 wide) in the track color from the shoulders to the card. That stays under the 0.2 m gold and teal limit.

Note for the ux-architect: tags at `TAG_HEIGHT` 2.05 (`DioramaScene.tsx`) sit on the heads of back-row helpers (the CM 03 tag covers the Sr. Manager helper's hair). With 26 helpers, overview needs dot-only tags plus the vertical nudge.

## 4. What to check at night

- **The slab edge and chairs on the navy backdrop.** The navy slab band, wall caps and chairs are close to #0E1F3B. Check the diorama still has a clear outline. If not, let the warm window light the floor near the edge, or lift the slab side a little.
- **Faces under the moon.** The darkest skin tones (#74472B, #563320) and black hair can turn into flat shapes under a cool, dim light. Two dot eyes must still read.
- **Glow only where it should be.** The window, screens, and the 2 desk lamps glow. Nothing else should bloom. Screens at emissive 0.7 must still look mid blue, not white.
- **Shadows.** Moon shadows should be faint (key 0.5). If they look odd or cost too much, turn the shadow map off at night and use the contact shadow.
- **Values match the docs.** The code runs sky and key at about 2x the `WORLD_PALETTE.md` values (sky 2.1 vs 0.9). Log the final day and night numbers in `docs/DECISIONS.md` and update the palette doc.
- **Mood.** Calm and cozy, like the last people in a warm office. Never spooky, never too dark to find a zone.
