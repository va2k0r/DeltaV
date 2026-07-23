# DeltaV

DeltaV is a web-first prototype for a deterministic hard-sci-fi orbital strategy game.

Current canon: **v10**.

This repository contains the web prototype: Vite, TypeScript, Vitest, Zod, ESLint, Prettier,
project docs, validated vanilla content, headless core simulation, 2D tactical fallback, and
the player-facing 3D planetarium presentation.

## Setup

```sh
npm install
```

## Commands

```sh
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm run verify
npm run release:portable
```

`npm run release:portable` verifies the repository and creates a self-contained web alpha under
`release/`. Its macOS, Windows, and Linux launchers require Node.js 20 or newer and open DeltaV
on a local-only server. See `docs/RELEASE_READINESS.md` for the boundary between this portable
alpha and a future signed native executable.

## Source Of Truth

Read the root directive files first, especially `00_CURRENT_CANON.md`. The v10 files win
when older notes conflict with them.

Longer project memory lives in `docs/`.
