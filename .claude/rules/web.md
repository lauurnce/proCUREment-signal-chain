---
paths:
  - "apps/web/**"
---

# Web app rules

- React 19 function components, TypeScript strict, one component per file, named exports.
- Styling: Tailwind v4 utilities backed by CSS variables from `apps/web/src/theme/`. No hard-coded hex values or font names outside the theme folder.
- State: zustand store in `apps/web/src/state/`, split into slices, read with selectors. Server data comes only from `GET /api/state` and the SSE stream.
- 3D code lives in `apps/web/src/scene/` and follows the `isometric-office` skill. Panel and HUD code lives in `apps/web/src/ui/`.
- Animation: `motion` for DOM, `useFrame` with refs for 3D. Respect `prefers-reduced-motion`.
- Accessibility: real buttons, labels, visible focus, keyboard shortcuts listed in a help sheet.
- Add `data-testid` to anything Playwright needs. Set `window.__HQ_READY__ = true` when the scene has rendered its first full frame.
- User-facing text: plain English, sentence case, no em dashes.
