# DeltaV / AV Roadmap and Milestones v5

## Milestone 0: Repository foundation

Goal:

Create stable web-first development environment.

Must include:

- Vite/TypeScript project
- Vitest
- Zod
- lint/typecheck/build scripts
- `npm run verify`
- basic folder architecture
- no gameplay scope creep

## Milestone 1: Canonical 2D Simulation Plane + Spatial Map Foundation + Camera

Goal:

Create the deterministic map foundation.

This milestone is not combat, not economy and not full UI.

Must include:

- data-driven bodies/nodes
- Zod validation
- deterministic body positions by turn
- canonical 2D coordinates
- spatial map renderer
- one camera, no orbit
- right-drag pan
- wheel zoom to cursor
- fit/focus controls
- bounded zoom
- sparse glowing stars
- hard-lit bodies
- faint planetary orbit rails
- node rails
- ship orbit rail rendering placeholder if ships are stubbed
- UI anchor architecture
- debug 2D view optional

Do not include:

- full combat
- missiles
- production
- AI
- ship classes
- real transfer rules
- full economy
- audio
- final UI polish

## Milestone 2: Nodes, ownership and ship presence

Goal:

Make nodes operational.

Must include:

- node selection
- ship presence on node orbit rails
- faction-colored ship orbit rails
- ship glimmer moving along rail
- ship occlusion behind bodies
- protected transit rules for Earth/Moon
- no contested visuals on Earth/Moon
- node hover/focus basics

## Milestone 3: Transfers and dV preview

Goal:

Implement node-to-node transfer orders.

Must include:

- select occupied origin node/ship
- hover target node
- transfer arc preview
- trajectory pill `T+X / Δv -Y`
- out-of-range pill
- click to queue transfer
- update reserve chart projection
- visual-only departure choreography based on current ship glimmer phase
- transfer logic independent of phase
- no transfer windows

## Milestone 4: Tritium reserve chart and economy stub

Goal:

Make the resource trajectory visible.

Must include:

- historical reserve chart
- projected final segment
- green/red/neutral projected change
- order updates change projection
- end turn commits projected point to history

## Milestone 5: Contested nodes

Goal:

Represent conflict geometrically.

Must include:

- two crossed faction-colored rails
- rail thickness/opacity increase
- neutral node center
- contested micro-flashes only on contested nodes
- no effects on Earth/Moon

## Milestone 6: Missiles

Goal:

Implement v1 weapon model.

Must include:

- fire missile order
- missile path
- T- countdown pill
- evade interaction
- deterministic resolution

## Later

- AI
- campaign/lore
- polish
- audio integration
- Steam demo
- publisher pitch vertical slice
