# World palette (P2.2)

Status: approved by Lawrence on 26 Sep 2026 (D-011). Written by the world-artist for Direction A, Warm Diorama with B's rules (D-025). Includes the navy slab edge and the capiz-style lamp (D-029). The keys below are the camelCase names for the `world` object in `apps/web/src/theme/tokens.ts`. Tune final values in the Lab, then log them in `docs/DECISIONS.md`.

Existing keys keep their values: `floorWood`, `floorWoodAlt`, `backdropDay`, `backdropNight`, `skyLight`, `keyLight`, `gridLine`. Nothing was changed. One note: `gridLine` is for the dev grid only and never shows in the finished scene.

Where a value repeats a base palette color (navy, accent, blue mid, hairline, and so on), the code should point to `color.navy` and the others instead of copying the hex. That keeps one source.

## 1. Tokens

### Floor and slab

| Key | Hex | Opacity | Where it is used |
|---|---|---|---|
| `floorWood` | #E6D3B3 | 1 | Main oak planks (about 70 percent of planks) |
| `floorWoodAlt` | #D8C29C | 1 | Plank variation (about 25 percent), set per instance by seed |
| `floorWoodDeep` | #CFB68D | 1 | Rare darker plank (about 5 percent), adds life without noise |
| `slabSide` | #CBAE84 | 1 | The thick oak body of the diorama slab (0.35 m), front and side faces |
| `slabEdge` | #12284C | 1 | Navy band on the top rim of the slab, 0.06 m tall and 0.04 m proud (D-029). Same as `color.navy` |
| `gridLine` | #D8C29C | 1 | Dev grid only (kept) |

### Zone floor tints

Tints are thin rugs (a plane 0.005 m above the floor, soft 0.08 m rounded corners), fully opaque. No transparency, so no sorting cost.

| Key | Hex | Opacity | Where it is used |
|---|---|---|---|
| `zoneCm` | #F4EBD3 | 1 | CM Wing rug, warm cream |
| `zoneOps` | #E3F0EE | 1 | Ops Wing rug, pale sea glass |
| `zoneLeads` | #E6EEF8 | 1 | Leads' Row and Sr. Manager's Office rug, pale blue |
| `zoneShared` | #EFE6D6 | 1 | Optional rug for Huddle, Negotiation and Contract Corner |
| `zoneMerienda` | #EADCC8 | 1 | Merienda Corner floor, a warm tile tone |
| `bridgeSeam` | #8FB8DD | 1 | Mid blue floor strip under the Endorsement Bridge, 0.5 m wide, runs the depth of the counter plus 1 m each side. Same as `color.blueMid` |

### Walls, trim, glass, windows

| Key | Hex | Opacity | Where it is used |
|---|---|---|---|
| `wall` | #F5F2EC | 1 | Back walls and room partitions, warm off-white |
| `wallCap` | #12284C | 1 | Top face of the cut walls, 0.12 m thick. Frames the cutaway like the slab edge |
| `wallTrim` | #12284C | 1 | Skirting (0.1 m tall), window frames, door frames, glass mullions |
| `door` | #D8C29C | 1 | Door leaves, light oak |
| `glass` | #CFE0F1 | 0.35 | Office glass (Sr. Manager, Negotiation, Huddle) |
| `glassNight` | #CFE0F1 | 0.2 | Same glass at night, so warm rooms read through it |
| `windowDay` | #EAF2FB | 1 | Window panes in day, a flat pale sky |
| `windowGlow` | #FFE2A8 | 1 | Window panes at night, emissive (see section 2) |
| `sunPatch` | #FFF1D6 | 0.22 | Fake window light stripes on the floor in day and late afternoon. A flat plane, no extra light |

### Furniture

| Key | Hex | Opacity | Where it is used |
|---|---|---|---|
| `deskTop` | #F7F4EE | 1 | Desk surfaces, warm off-white |
| `deskEdge` | #D8C29C | 1 | 0.03 m oak edge band on desk tops, so desks separate from the floor |
| `deskLeg` | #98A2B3 | 1 | Legs and metal parts. Same as `color.footer` |
| `deskDivider` | #D9E3F0 | 1 | Low pod dividers, 1.1 m max. Same as `color.hairline` |
| `chairSeat` | #12284C | 1 | Seat and back. Same as `color.navy` |
| `chairAccent` | #0067B9 | 1 | Thin stripe on the chair back. Same as `color.accent` |
| `chairBase` | #4B5565 | 1 | Star base and gas lift. Same as `color.inkMuted` |
| `monitorBody` | #12284C | 1 | Monitor bezel and stand |
| `screenGlow` | #8FB8DD | 1 | Monitor screens, emissive. Same as `color.blueMid` |
| `shelf` | #CBAE84 | 1 | Shelves, cabinets, counters in oak |
| `sofa` | #8FB8DD | 1 | Reception sofa and bench cushions |
| `plantLeaf` | #5E8C6A | 1 | Main leaf tone |
| `plantLeafLight` | #7FA88A | 1 | Second leaf tone, for top leaves and small plants |
| `plantPot` | #E8DFD0 | 1 | Pots, off-white clay |
| `paper` | #FBF8F2 | 1 | Papers, envelopes, folder bodies, cards on boards |

### Landmarks

| Key | Hex | Opacity | Where it is used |
|---|---|---|---|
| `bridgeCounter` | #CBAE84 | 1 | Endorsement Bridge counter body, oak, 2.4 x 0.6 x 1.0 m |
| `bridgeCounterTop` | #F7F4EE | 1 | Counter top |
| `bridgeTray` | #12284C | 1 | Two-sided tray rack on the counter |
| `folderBody` | #FBF8F2 | 1 | Folder that crosses the bridge |
| `folderTabCm` | #C9A227 | 1 | Gold diamond tab (CM side). Same as world `track-cm` |
| `folderTabOps` | #1F8A8A | 1 | Teal square tab (Ops side). Same as `track-ops` |
| `mailCubby` | #12284C | 1 | Mail Dock pigeonhole cabinet, navy inside the cubbies |
| `mailFrame` | #CBAE84 | 1 | Mail Dock cabinet frame, oak |
| `envelope` | #FBF8F2 | 1 | Envelopes in cubbies and in flight |
| `envelopeStripe` | #0067B9 | 1 | Thin stripe on outgoing envelopes, so "leaving" reads |
| `capizShell` | #F3EBDD | 1 | Capiz-style pendant shell in Merienda Corner, pearly off-white. Built as a stack of flat square tiles on a cone, original geometry |
| `capizGlow` | #FFD9A0 | 1 | Emissive warm glow of the capiz lamp (and the Bridge pendant) |
| `lampCord` | #12284C | 1 | Pendant cords and lamp caps |
| `dashPanel` | #12284C | 1 | Sr. Manager's dashboard wall panels |
| `dashGlow` | #8FB8DD | 1 | Emissive bars and lines on the dashboard wall. A few small bars may use `accent` #0067B9 |
| `truck` | #F5F2EC | 1 | Loading dock truck body, with a `color.accent` stripe. No logos or text |
| `pallet` | #CBAE84 | 1 | Pallets and cardboard boxes (boxes may use `floorWoodAlt`) |

### Characters

Track badges and lanyards (shape plus color, never color alone):

| Key | Hex | Shape |
|---|---|---|
| `badgeMgr` | #12284C | Star |
| `badgeLead` | #0067B9 | Triangle |
| `badgeCm` | #C9A227 | Diamond |
| `badgeOps` | #1F8A8A | Square |

Skin tone set (`skinTones`, 8). Picked by seed. The middle tones are weighted a little higher because most of the team is in the Philippines and Thailand, but every tone appears.

| Index | Hex | Weight |
|---|---|---|
| 0 | #F6DCC7 | 1 |
| 1 | #EBC6A4 | 2 |
| 2 | #DDAE86 | 3 |
| 3 | #C9956B | 3 |
| 4 | #B27A52 | 2 |
| 5 | #95613D | 2 |
| 6 | #74472B | 1 |
| 7 | #563320 | 1 |

Hair color set (`hairColors`, 7). Dark hair weighted higher for the same reason.

| Index | Hex | Name | Weight |
|---|---|---|---|
| 0 | #1B1613 | Soft black | 4 |
| 1 | #2C211B | Black brown | 3 |
| 2 | #3F2C21 | Dark brown | 3 |
| 3 | #5C3F2C | Brown | 2 |
| 4 | #85603F | Light brown | 1 |
| 5 | #6A3B2E | Auburn brown | 1 |
| 6 | #B9B3AB | Silver grey | 1 |

Outfit tops (`topColors`, 8), all from the palette or its warm neutrals: #12284C, #0067B9, #8FB8DD, #F5F2EC, #D8C29C, #7FA88A, #4B5565, #E6D3B3.

Bottoms (`bottomColors`, 3): #2E3A4E, #4B5565, #CBAE84.

Face: `eye` #1A1A1A (two dots, same as `color.ink`). No mouth, no blush.

### Backdrop and light

| Key | Hex | Intensity | Where it is used |
|---|---|---|---|
| `backdropDay` | #E9EEF5 | | Background in day (kept) |
| `backdropDusk` | #EFE7DC | | Background in late afternoon |
| `backdropNight` | #0E1F3B | | Background at night (kept) |
| `skyLight` | #F5F8FF | 0.9 | Day hemisphere sky (kept) |
| `groundLight` | #E6D3B3 | | Day hemisphere ground |
| `keyLight` | #FFF4E0 | 1.4 | Day key light, high front left, elevation about 55 degrees (kept) |
| `skyLightDusk` | #F3ECE2 | 0.75 | Late afternoon hemisphere sky |
| `groundLightDusk` | #E2C9A4 | | Late afternoon hemisphere ground |
| `keyLightDusk` | #FFD6A3 | 1.25 | Late afternoon key, lower, elevation about 30 degrees, from the window side. Longer, softer shadows |
| `skyLightNight` | #3A5A8C | 0.25 | Night hemisphere sky |
| `groundLightNight` | #12284C | | Night hemisphere ground |
| `keyLightNight` | #A8C0DE | 0.3 | Night key (cool moon fill), still the only shadow caster |
| `lampLight` | #FFD9A0 | 3 (distance 5, decay 2) | Night point lights. Max 4: capiz lamp, Bridge pendant, Sr. Manager's desk, Reception |
| `contactShadow` | #12284C | opacity 0.35 day, 0.5 night | Contact shadows, navy tinted instead of black, blur about 2.5 |

Intensities assume three.js physical light units and neutral tone mapping. Check them in the Lab, as renderer settings change the result.

## 2. Material rules

- One shared `MeshStandardMaterial` per token. No per-object materials. Repeated props are instanced, and plank and outfit variation uses instance colors, not extra materials.
- Matte everywhere: metalness 0. Roughness 0.9 for floor, walls and rugs. 0.85 for furniture and characters. 0.8 for desk tops, screens and paper.
- Glass is the only transparent material: roughness 0.2, metalness 0, `depthWrite` off. No transmission or refraction (too costly).
- No textures, except an optional tiny baked plank noise if the floor looks flat. No normal maps.
- Tone mapping: use Neutral (or AgX if Neutral is not available) so token colors stay close to their hex. Colors are sRGB hex and three.js converts them.
- Shadows: one shadow-casting key light (PCF soft, map 2048, small negative bias). Characters and furniture cast. Rugs and the slab only receive. Contact shadows render once, not every frame, except under walking helpers.
- Emissive for glow, not extra lights. These use `emissive` equal to their own color:

| Material | Day emissive intensity | Night emissive intensity |
|---|---|---|
| `windowGlow` (night panes) | 0 (pane shows `windowDay`) | 1.2 |
| `screenGlow` | 0.15 | 0.7 |
| `capizGlow` | 0.2 | 1.4 |
| `dashGlow` | 0.2 | 1.0 |
| `bridgeSeam` | 0 | 0.25 (a faint path of light between wings) |
| Desk lamp shades (`capizGlow`) | 0 | 0.9 |

- Very light bloom only at night, threshold about 0.9, so only the emissive items above glow. Turn it off when `PerformanceMonitor` drops.
- Theme blends (about 1.2 s) lerp material colors, emissive intensity and light values in `useFrame` through refs. Never `setState` in `useFrame`.

## 3. Warm world, calm chrome

- The world is warm: oak, cream and off-white carry about 80 percent of the scene, and warm light does the rest. The panel stays flat navy, white and accent blue, so the two never fight.
- Every cool color in the world comes from the ADI-inspired base palette: navy for the slab edge, wall caps, trim, chairs and monitors; accent blue for small stripes; mid blue for the bridge seam, screens and sofa. No new blues were added.
- Gold #C9A227 and teal #1F8A8A are allowed only as small track accents: badges, lanyards, desk pennants and the two folder tabs. Never on walls, floors, rugs, furniture bodies or large props. A rough limit: no gold or teal piece bigger than 0.2 m.
- Green lives only in plants and one outfit tone, so it never reads as a status color.
- The capiz lamp, windows and screens are the only warm glows at night, so the night scene reads calm and cozy, never spooky.
