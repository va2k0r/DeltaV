# Testing

Repository verification proves the development cage:

- `npm test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- `npm run verify`

More than 300 automated tests now cover schemas, canonical content, deterministic core state,
turn resolution, BURN, FIRE, Work, contested nodes, Evade, AI diagnostics, render-boundary
architecture, and replay-oriented invariants.

Future tests must keep gameplay independent from renderer, camera, browser, audio, and input
systems.

High-priority regression areas include:

- Procedural Balanced default selection, tutorial inheritance, and canonical v10 node roles
- command legality and one-action-per-ship guarantees
- replay determinism and stable state hashing
- AI planner immutability and order-bias diagnostics
- renderer batching boundaries and browser runtime smoke tests
- portable release packaging and launcher smoke tests
