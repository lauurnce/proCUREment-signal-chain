# ADI AI Enablement, deck theme specification (copy for reference)

Copied from the program's project notes (`DECK_THEME_SPEC.md`, 13 Sep 2026). Every value was read directly out of `PPT Part One.pptx`. SignalChain HQ adapts it for screens in `../SKILL.md`. When the two disagree for slides, this file wins. For screens, `../SKILL.md` wins.

Slide size is 16:9 widescreen, 13.333 x 7.5 inches.

## 1. Colour palette

| Hex | Name | Role |
|---|---|---|
| `#12284C` | Navy | Titles, dark panels, title and divider backgrounds, emphasis text |
| `#0067B9` | Accent blue | The bar under every title, bullet squares, card top rules, closing lines |
| `#8FB8DD` | Mid blue | Diagram mid tone, timeline connector |
| `#A8C0DE` | Light blue | Subtitle text on navy backgrounds only |
| `#F2F4F7` | Panel grey | Card and panel fills on white slides |
| `#1A1A1A` | Body text | All body copy on white |
| `#98A2B3` | Footer grey | Footer only |
| `#D9E3F0` | Hairline | Table and diagram borders, 0.75pt |

Rules that keep it looking like one deck: navy and accent blue never swap roles. Light blue `#A8C0DE` is only ever used on a navy background, never on white. Panel grey `#F2F4F7` is the only fill for cards on white slides. No gradients, no shadows, no fifth blue.

## 2. Typography

The deck font is Quattrocento Sans (free Google font).

| Use | Size | Weight | Colour |
|---|---|---|---|
| Title slide headline | 54pt | Bold | `#FFFFFF` |
| Section divider headline | 54pt | Bold | `#FFFFFF` |
| Divider subtitle | 22pt | Regular | `#A8C0DE` |
| Content slide title | 38pt | Bold | `#12284C` |
| Content title, long ones only | 32pt | Bold | `#12284C` |
| Body bullet | 26pt | Regular | `#1A1A1A` |
| Panel heading | 25pt | Bold | `#12284C` |
| Closing line at slide bottom | 24pt | Bold | `#0067B9` |
| Standalone bottom statement | 22pt | Regular | `#1A1A1A` |
| Card heading | 21pt | Bold | `#12284C` |
| Text inside a panel | 19pt | Regular | `#1A1A1A` |
| Card subtext | 17pt | Regular | `#1A1A1A` |
| Table body | 15pt | Regular | `#1A1A1A` |
| Footer | 11pt | Regular | `#98A2B3` |

Never shrink body text to fit more words, cut the words instead.

## 3. Signature details worth echoing on screen

- The accent bar under every title (1.53 x 0.07 in, `#0067B9`). On screen: a short 3 px accent bar under panel titles.
- Small `#0067B9` squares as bullets. On screen: small square markers in lists.
- Panel grey cards with a thin `#0067B9` rule along the top edge.
- Section dividers on full navy with light blue subtitles. On screen: night mode and the onboarding tour.

## 4. Deck prompt block (for slides, not for the app)

```
Font: Quattrocento Sans throughout. Slide size 16:9.
Colours, use only these: navy #12284C, accent blue #0067B9, mid blue #8FB8DD,
light blue #A8C0DE, panel grey #F2F4F7, body text #1A1A1A, footer grey #98A2B3,
hairline #D9E3F0.
No icons, no clip art, no stock photos, no gradients, no shadows, no em dashes.
```
