# Brand guardian point of view (P2.1)

My goal: SignalChain HQ should feel like it sits next to the program decks. It should also be clearly an unofficial prototype.

## 1. Borrow from the references (patterns, not pixels)

- **ref-01, ref-03, ref-05:** white name pills that float over the scene. Each has a bold name, a small role line and a status dot. Our version: navy name, `ink-muted` mono role, radius 999, and a track badge shape next to the dot.
- **ref-04:** big number over a tiny UPPERCASE mono label. It fits our type scale well (28 px bold navy over an 11 px mono label).
- **ref-02, ref-06, ref-09:** mono UPPERCASE tabs with a count badge, and flat list rows on a grey fill. This matches the deck rule "panel grey is the only card fill".
- **ref-08:** the label and value grid in item detail, and four decision buttons with four clearly different styles.
- **ref-07:** an honest empty state that names its data source.
- **ref-12:** navy walls. This is the one reference that already uses our palette.
- **ref-11:** flat, clean shading and window light for the world only.

## 2. Avoid

- The terracotta red and the olive green of the demo. Red suggests errors, and those colors belong to someone else's brand.
- Long titles in UPPERCASE mono (ref-08). Titles stay in sentence case Quattrocento Sans.
- ISO dates like "2026-09-21" in the UI. We write "21 Sep 2026".
- Wall signs with a logo, as in ref-12 ("Company office name"). We have no logo on any wall, desk or screen.
- Soft shadows on every card. Only panels that float over the 3D scene get `shadow-float`.
- Status shown by color alone.
- `footer` grey #98A2B3 on any text someone needs to read (2.58:1).

## 3. Three ideas: premium, cozy, true to the work

1. **Deck DNA in the panel.** Every panel title gets the 28 x 3 px accent bar. Cards are panel grey with a 2 px accent rule on top. Lists use small accent squares as bullets. The team sees these patterns in the program decks every week. The app will feel familiar and premium without copying any ADI asset.
2. **Real paperwork, fictional numbers.** Each Needs You card shows the document the work is really about: PR, PO, SOW, quote table or amendment. It has a mono ID chip, the workflow step ("STEP 2 OF 3 · REVIEW") and the track badge. When the authority rule applies, show it as one navy line on a panel callout. Email drafts show a "DRAFT" mono tag and the unofficial footer line. A CM or an Ops Buyer will recognize their day.
3. **Warm world, calm chrome.** The warmth lives in the 3D world: wood floor, plants, Merienda Corner, and `window-glow` at night. The UI stays flat navy, white and accent blue. Night mode is a full navy scene with light blue text. This nods to the Sr. Manager's "Procurement360" command center idea.

## 4. Risks and non-negotiables

- **No ADI logo, no "Analog Devices" wordmark, no "Ahead of What's Possible" tagline.** Not in the UI, the 3D world, favicons, emails or screenshots.
- **Logo lookalike risk:** the Leads badge is a triangle. Never draw a white triangle inside a filled square, because that looks close to the ADI mark. Use an outline triangle that points up and has no square behind it. The favicon also stays away from that shape.
- **Unofficial label:** "Unofficial prototype · Fictional data" appears in the About area and in the footer of every email, in `ink-muted` (7.54:1), not in `footer` grey.
- **Name:** always "SignalChain HQ". Never "ADI HQ" or anything with "ADI" in a title.
- **Contrast fix needed:** white text on Approve green #1E8E5A is 4.14:1. That fails at 15 px bold. Proposed: #1A7F50 (about 5.0:1). I will ask before changing it.
- **Track colors are not text colors.** CM gold #A8841A (3.51:1) and Ops teal #1F8A8A (4.15:1) are for badges and bars only.
- **Palette roles stay fixed:** navy for titles and dark panels, accent for bars and key actions. Light blue only on navy. No gradients. No hex values outside the theme folder.
- **Copy:** plain English, sentence case buttons, no em dashes, and no "monitoring", "tracking" or "productivity" about people.
- **Screen-only additions** stay "proposed" until Lawrence approves D-011.
