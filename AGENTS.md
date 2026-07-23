# AGENTS

Read `00_CURRENT_CANON.md` first. v10 files override older notes.

## Setup

- `npm install`
- `npm run dev`

## Test

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify`

## Architecture Invariants

- Core simulation must stay headless.
- Renderers, UI, browser APIs, Canvas, and 3D cannot own gameplay logic.
- Art effects, lighting, shadows, starfields, labels, camera state, and animation never enter
  core logic.
- 3D Planetarium is player-facing; 2D Tactical is fallback/debug/accessibility.
- Vanilla content must live under `public/content/vanilla/`.
- JSON content must be validated with Zod before use.
- TypeScript strictness must stay enabled.

## Anti-Scope-Creep

- Do not modify the controlled orbit/freecam camera behavior without an explicit camera request.
- Current 3D mouse bindings: right drag orbits, left drag pans, wheel zooms toward current
  focus/screen center.
- Single left click selects; double left click focuses.
- Do not add gameplay, ships, factions, production, movement, combat,
  missiles, evasion, AI, victory, defeat, audio, 3D gameplay, Steam, mobile, packaging, or mod
  loading without an explicit milestone request.

## Required Verification

- Run `npm install` after dependency changes.
- Run `npm run verify` before reporting completion.
- Report any command that cannot run and why.
