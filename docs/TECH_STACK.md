# Tech stack

Goal: a smooth, game-like 3D office in the browser, a simple local server, data you can read in Obsidian, and a safe path to Outlook. Versions below were checked on npm on 25 Sep 2026. In Phase 1, Claude installs the latest stable versions and checks peer ranges.

## Your machine (macOS, Apple Silicon)

| Tool | Version | Install |
|---|---|---|
| Node.js | 24 LTS (`.nvmrc`) | `nvm install 24 && nvm use 24` (Node 26 becomes LTS in Oct 2026, we can move later) |
| pnpm | latest (12.x today) | `npm install -g pnpm` |
| git | any recent | Xcode Command Line Tools |
| GitHub CLI | latest | `brew install gh`, then `gh auth login` |
| Claude Code | latest | already installed and running in VS Code |
| VS Code | latest | recommended extensions in `.vscode/extensions.json` |
| Obsidian | optional | to open the vault like the reference does |

## The app

| Layer | Choice | Version today | Why |
|---|---|---|---|
| Monorepo | pnpm workspaces | pnpm 12.6 | One install, shared types, fast |
| Language | TypeScript, strict | 7.0 (fallback 6.0.3) | Safer code, better help from Claude. TypeScript 7 is the new native compiler. If a tool breaks with it, pin 6.0.3 for type checking and log a decision |
| Lint and format | Biome | 2.5 | One fast tool instead of ESLint plus Prettier, no TypeScript API dependency |
| Web build | Vite with `@vitejs/plugin-react` | 8.3 and 6.1 | Instant reloads, simple config |
| UI library | React | 19.3 | The ecosystem for React Three Fiber |
| 3D engine | three.js | 0.186 | The standard for 3D on the web |
| React 3D | `@react-three/fiber` | 9.8 (supports React 19.0 to 19.3) | Declarative 3D scenes in React, easy for Claude to build and change |
| 3D helpers | `@react-three/drei` | 10.7 | Camera controls, HTML name tags, instancing, soft shadows, performance helpers |
| 3D post effects | `@react-three/postprocessing` | 3.1 | Subtle ambient occlusion and night glow, only if the frame budget allows |
| State | zustand | 5.0 | Tiny, fast, works with React Three Fiber without re-rendering the scene |
| Styling | Tailwind CSS with `@tailwindcss/vite` | 4.3 | Utility classes backed by our theme tokens |
| DOM animation | motion (formerly Framer Motion) | 13.4 | Springs and layout animations for the panel |
| Fonts | `@fontsource/quattrocento-sans`, `@fontsource/ibm-plex-mono` | 5.3 | Self-hosted, no external font calls |
| Dev tools | leva, r3f-perf | 0.10, 7.2 | Live tuning of light and camera, frame rate overlay (dev only) |
| Server | Fastify | 5.12 | Fast, typed, simple plugins |
| Real-time | Server-Sent Events | built in | One-way live updates are all we need. Simpler than WebSockets |
| Files | chokidar, gray-matter | 5.0, 4.0 | Watch the vault, read markdown with frontmatter |
| Validation | zod | 4.6 | One schema for server, web, and files |
| Microsoft sign-in | `@azure/msal-node`, `@azure/msal-node-extensions` | 7.0, 5.5 | Official library, PKCE sign-in, Keychain token cache |
| Microsoft Graph | plain `fetch` | built in | Only a few mail calls, no heavy SDK needed |
| Scheduling | node-cron | 4.6 | Daily digest time |
| Unit tests | Vitest | 5.0 | Fast, works with Vite |
| End-to-end and screenshots | Playwright (Chromium) | 1.63 | Tests plus the screenshots the Design Council reviews |
| 3D assets | built in code (rounded boxes) | | Full control, on-brand, no license risk. Optional CC0 props from Kenney's Furniture Kit only with approval |

## Why React Three Fiber and not a 2D game engine
- True 3D gives the diorama look from the reference: real light, soft shadows, smooth zoom, and camera moves, from one scene.
- The panel and the world are both React, so one store, one language, one set of tokens.
- Characters and furniture can be built from code, so we are never blocked on art files.
- PixiJS or Phaser would need drawn isometric sprites for every object and angle. That is a lot of art work for a solo builder.

## Smoothness plan
- 60 fps target on your MacBook Pro, 45 fps or better on an average Windows laptop.
- Instancing, shared materials, limited lights, `AdaptiveDpr`, `PerformanceMonitor` to drop effects when needed.
- No React state updates inside the render loop.
- Panel animations only move transform and opacity.
- Playwright screenshots and an FPS readout at every checkpoint.

## Later options (not now)
- Desktop app: Tauri 2 (small, needs Rust) or Electron (heavier, JavaScript only). Decide after v0.1.0.
- Mobile layout: focus on Needs You decisions. After v0.1.0.
- AI drafting: Claude API for the personal prototype, Microsoft Copilot or Copilot Studio for anything ADI-facing.
