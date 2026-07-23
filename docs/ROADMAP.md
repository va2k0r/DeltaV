# Roadmap

This is a historical milestone map. `00_CURRENT_CANON.md` is authoritative when an older
milestone description conflicts with the implemented v10 rules.

## Milestone 0: Repository Foundation

Create a stable web-first development environment:

- Vite and TypeScript
- strict TypeScript
- Vitest
- Zod
- lint, typecheck, build, and verify scripts
- required folder structure
- concise operational agent instructions
- project documentation

Status: complete.

## Milestone 1: Solar System Map Foundation

Load validated body/node data, compute deterministic positions, expose headless snapshots,
advance turns, and render the spatial map foundation.

Status: active foundation complete.

## Milestone 1.1: 3D UI Foundation And Art Direction

Keep this work inside presentation:

- 3D Planetarium is the default player-facing view.
- 2D Tactical remains available as fallback/debug/accessibility.
- Sun lighting, starfield, planet materials, node rings, orbit rails, labels, and camera
  feel are renderer/UI concerns only.
- No gameplay systems are added in this milestone.

Status: complete.

## Milestone 1.5: Node Occupancy And BURN Preview

Implement the first ship-facing BURN planning layer without expanding combat scope:

- nodes remain the primary interaction objects
- ships render as tiny 3D occupancy markers on node rings and collapse to pulsing dots at
  far zoom
- player-occupied node rings use the player faction color and a slightly thicker treatment
- selecting a player-occupied node enters BURN origin context
- BURN hover preview shows cost, ETA, arrival turn, a raised tangent arc, a translucent
  destination-body ghost, equal-turn orbital dots, and a future destination marker at T + ETA
- destination click creates a pending BURN order that resolves only on Next Turn
- active BURN transits advance fractionally by turn until arrival
- single-click Sun selection/pan preserves camera distance and avoids Sun focus scaling

Status: complete.

## Milestone FIRE: Minimal Missile Layer

Implement the first FIRE loop without adding AI, evasion, contested nodes, or victory logic:

- player node click toggles BURN/FIRE mode
- FIRE marker uses three red billboard triangles
- two static enemy test ships occupy unoccupied nodes
- valid FIRE targets are enemy-occupied nodes only
- FIRE pending orders launch missiles on Next Turn
- active missiles render as red cones or collapsed blinking lights with T-X labels
- missile impact removes the static target ship and clears the missile
- firing ships do not Work and cannot also BURN that turn

Status: complete.

## Current v10 Alpha Consolidation

The repository now also contains the later headless rule layers required by v10: Work,
stealable shipyard progress, contested upkeep, mandatory departures, Evade, deterministic AI,
diagnostics, and elimination victory/defeat. Current consolidation work focuses on conservative
performance improvements, the Procedural Balanced default, regression guards, and portable alpha
packaging.

Status: active.

## Later Milestones

Intercept, campaign, audio, signed native desktop packaging, and mod loading remain later
milestones. The portable alpha package is an interim local-browser distribution, not a native
application shell.
