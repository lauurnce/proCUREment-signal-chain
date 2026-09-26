---
name: adi-theme
description: The ADI-inspired visual language of SignalChain HQ, including color roles, screen type scale, spacing, radii, elevation, status colors, track accents, 3D world palette, motion tokens, copy rules and logo safety. Use whenever you create or change UI, design tokens, 3D materials, colors, fonts, or any user-facing text.
---

# ADI theme for SignalChain HQ

Source of truth for the base palette and font: the program deck theme, measured from "PPT Part One.pptx" on 8 Sep 2026. Full spec: [reference/deck-theme-spec.md](reference/deck-theme-spec.md). This skill adapts it for screens and 3D.

Status of screen-only additions: **approved** by Lawrence on 26 Sep 2026 (D-011). Full list with contrast and limits: `docs/design/SCREEN_EXCEPTIONS.md`.

## 1. Base palette (from the decks, final)

| Token | Hex | Role |
|---|---|---|
| `navy` | #12284C | Titles, dark panels, night backdrop base, emphasis text |
| `accent` | #0067B9 | Accent bars, primary buttons, links, selected tab, key highlights |
| `blue-mid` | #8FB8DD | Diagram mid tone, subtle fills, connectors |
| `blue-light` | #A8C0DE | Text on navy only, never on white |
| `panel` | #F2F4F7 | Card and panel fills on white |
| `ink` | #1A1A1A | Body text on white |
| `footer` | #98A2B3 | Tiny decorative meta only (fails text contrast, see below) |
| `hairline` | #D9E3F0 | 1 px borders and dividers |

Role rules: navy and accent never swap roles. Light blue appears only on navy. Panel grey is the only card fill on white. UI chrome has no gradients.

## 2. Screen-only additions (approved, D-011)

| Token | Hex | Why |
|---|---|---|
| `ink-muted` | #4B5565 | Secondary text. `footer` #98A2B3 is only 2.58:1 on white, too low for text |
| `status-working` | #1A7F50 filled dot, also the Approve button | About 5.0:1 on white. Was #1E8E5A (4.14:1, failed for button text), changed by D-026 |
| `status-waiting` | #B45309 filled dot with "!" | "Waiting on you", 5.02:1 |
| `status-meeting` | #0067B9 pair of dots (big and small) | "In a meeting", own shape so it differs from "working" |
| `status-break` | #0067B9 hollow ring | "On break", shape differs from meeting |
| `status-off` | #98A2B3 hollow ring plus text label | "Off duty", always with text |
| `track-mgr` | #12284C, star badge | Sr. Manager |
| `track-lead` | #0067B9, triangle badge | Leads |
| `track-cm` | UI #A8841A (3.51:1), world #C9A227, diamond badge | Category Managers (gold, as in the program roadmap) |
| `track-ops` | #1F8A8A (4.15:1), square badge | Ops Buyers (teal, shifted from the roadmap's green so it never clashes with "working") |
| `shadow-float` | `0 8px 24px rgba(18, 40, 76, 0.12)` | One shadow, only for panels floating over the 3D scene |

Rule: status and track are never shown by color alone. Always pair with a shape, icon, or text.

## 3. Typography

- UI font: Quattrocento Sans 400 and 700, self-hosted with `@fontsource/quattrocento-sans`.
- Label font (approved, D-011): IBM Plex Mono 500, only for small UPPERCASE labels, tabs, IDs and numbers (like the reference's status labels). `@fontsource/ibm-plex-mono`.

| Style | Size / line height | Weight | Color |
|---|---|---|---|
| App title | 20 / 28 | 700 | navy |
| Panel title | 22 / 28 | 700 | navy, with a 28 x 3 px accent bar below (echo of the deck's title bar) |
| Section title | 17 / 24 | 700 | navy |
| Body | 15 / 22 | 400 | ink |
| Small | 13 / 18 | 400 | ink-muted |
| Label (mono) | 11 / 14, letter spacing 0.08em, uppercase | 500 | navy or ink-muted |
| Big number (HUD) | 28 / 32 | 700 | navy |
| Name tag name | 13 / 16 | 700 | navy |
| Name tag role (mono) | 10 / 12 | 500 | ink-muted |

Never shrink text to fit. Cut words instead.

## 4. Space, shape, elevation

- Spacing: 4 px grid. Common steps 4, 8, 12, 16, 24, 32, 48.
- Radii: 6 (chips), 10 (buttons, inputs), 14 (cards), 20 (floating panels), 999 (pills and name tags).
- Borders: 1 px `hairline`.
- Elevation: UI is flat. Only panels that float over the 3D scene use `shadow-float`.
- Buttons: primary = accent fill, white text. Approve = `status-working` fill (#1A7F50), white text (about 5.0:1). Hold = panel fill, navy text. Send back = white fill, hairline border, navy text. Instruct = white fill, accent text, accent border.

## 5. Contrast reference (computed)

| Pair | Ratio |
|---|---|
| navy on white | 14.65 |
| accent on white | 5.77 |
| ink on white | 17.40 |
| ink-muted on white | 7.54 |
| ink-muted on panel | 6.84 |
| light blue on navy | 7.85 |
| white on accent | 5.77 |
| footer on white | 2.58 (decorative only) |
| blue-mid on white | 2.09 (fills only, never text) |

## 6. 3D world palette (approved, D-011). Full list: `docs/design/WORLD_PALETTE.md`, code: `world` in tokens.ts

| Token | Hex | Use |
|---|---|---|
| `floor-wood` | #E6D3B3 | Main floor |
| `floor-wood-alt` | #D8C29C | Plank variation |
| `zone-cm` | #F4EBD3 | Subtle CM Wing floor tint |
| `zone-ops` | #E3F0EE | Subtle Ops Wing floor tint |
| `zone-leads` | #E6EEF8 | Leads' Row and Sr. Manager Office tint |
| `wall` | #F5F2EC | Walls |
| `wall-trim` | #12284C | Skirting, window frames |
| `glass` | #CFE0F1 at 35% opacity | Office glass |
| `desk-top` | #FFFFFF or #F2F4F7 | Desk surfaces |
| `desk-leg` | #98A2B3 | Legs and metal parts |
| `chair` | #12284C seat, #0067B9 accent | Chairs |
| `screen-glow` | #8FB8DD | Monitor screens |
| `plant` | #5E8C6A and #7FA88A | Leaves |
| `backdrop-day` | #E9EEF5 | Background and ground in day mode |
| `backdrop-night` | #0E1F3B | Background in night mode |
| `window-glow` | #FFE2A8 | Warm light at night |

Materials are matte: roughness 0.8 to 0.9, metalness 0. Characters use a varied, respectful set of skin tones and hair colors chosen by seed.

## 7. Motion tokens (final, end of Phase 2)

Durations: instant 80 ms, fast 140 ms, base 220 ms, slow 360 ms, camera 800 ms (the code uses 800).
Easing: enter `cubic-bezier(0.2, 0.8, 0.2, 1)`, exit `cubic-bezier(0.4, 0, 1, 1)`, move `cubic-bezier(0.65, 0, 0.35, 1)`.
Springs: panel `{ stiffness: 260, damping: 26 }`, pop `{ stiffness: 420, damping: 18 }`.
Always provide a `prefers-reduced-motion` version.

Approved 26 Sep 2026 (D-030):
- At most 6 helpers walk at the same time.
- Undo bar stays 5 s after a normal decision. Email sends never get undo.
- Card content fades in 60 ms after the card opens.
- A folder slides across the Endorsement Bridge in 600 ms.
- Buttons scale to 0.97 in 80 ms when pressed.

Seated helper loops, approved 26 Sep 2026 (D-035), in `motion.character`:
- Breath: one slow breath every 4 s, chest rises about 1.2 cm. Each helper's timing is offset by its seed, so no two move in sync.
- Idle: a gentle head tilt of about 2 degrees.
- Typing: 7 taps a second, hands lift about 1.8 cm, a tiny nod, in bursts of 2.4 s typing and 1.2 s reading.
- Reduced motion: helpers hold still.

Panel motion, approved 27 Sep 2026 (D-047):
- The undo bar floats over the list, slides up 8 px and fades in 220 ms (enter easing), and leaves in 140 ms. Nothing above it moves.
- When the docked panel changes the free space, the 3D view eases its offset over 360 ms. A plain window resize keeps the user's pan and zoom.

## 8. Panel, stats card and name tags (final, end of Phase 2)

- Panel: docked on the right, `clamp(440px, 36vw, 600px)` wide, 12 px from the edges, white, 1 px hairline border, 14 px corner, no shadow (D-025, D-033). Full layout and keys: `docs/design/panel/spec.md`.
- Decision buttons: a 2 x 2 grid with 3fr and 2fr columns. Approve and Send back sit in the wide column. Labels may wrap to 2 lines, never shrink or cut.
- Stats card over the scene (D-042): big number over a mono label. "Needs you", "Drafts to review", "Waiting on others". "Handoffs today" is added once the handoff data exists. Items only, never people.
- Name tags (D-045): white pill with a track badge, the name ("CM 03 helper") and a status dot. The role line shows when zoomed in, and hides at overview (compact). Tags never overlap, and status always comes from the vault.
- Codes like PO-451208 never break across lines (non-breaking hyphen).

## 9. Copy rules

- Plain English, short sentences, common words. English is a second language for most users.
- Sentence case for buttons and titles ("Send back", "Needs you"). UPPERCASE only for tiny mono labels and tabs.
- No em dashes anywhere. Use commas or periods.
- Dates "25 Sep 2026", times "5:30 PM", time zone Asia/Manila unless stated.
- Never "monitoring", "tracking", or "productivity score" about people.
- Helpers, never people: "26 helpers", not "26 on the team". Say which kind of decision an item waits for ("Waiting for a CM decision"), never which seat, because a seat maps to a real person (D-046).
- Full copy deck for the panel: `docs/design/panel/copy.md`.

## 10. Logo and trademark safety

- Never draw, trace, embed, or import the ADI logo, the "Analog Devices" wordmark, or the "Ahead of What's Possible" tagline.
- The product is "SignalChain HQ". The About area and the footer of emails say "Unofficial prototype · Fictional data".
- If Lawrence later gets written approval to use ADI branding, record it in `docs/DECISIONS.md` first.

## 11. Where tokens live in code

`apps/web/src/theme/tokens.ts` is the single source. Tailwind v4 reads them through CSS variables in `apps/web/src/theme/theme.css`. 3D materials import from the same tokens. No hard-coded hex values outside the theme folder.
