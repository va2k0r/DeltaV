# Prompt for Codex: Milestone 1

Implement Milestone 1: Canonical 2D Simulation Plane + Spatial Map Foundation + Camera.

Do not implement combat, production, AI, missiles, full transfers, audio, ship classes, tech trees or final UI.

## Critical design rules

- Gameplay positions are canonical 2D.
- Player-facing presentation is spatial 3D/2.5D.
- Flat 2D is debug-only.
- There is one player-facing camera.
- No orbit camera.
- Right mouse drag pans.
- Mouse wheel zooms toward cursor.
- Zoom is bounded.
- Planets and moons are not command objects.
- Nodes are operational orbits around bodies.
- Earth and Moon are protected transit nodes.
- No contested/war/nuke rules on Earth/Moon.
- Mercury is an open map-simulation issue, not a final barren node.

## Data

Create JSON content for bodies and nodes.

Use Zod schemas.

Invalid data fails loudly.

Data must support:

- body id/name/kind
- parent id
- orbit radius
- orbit period turns
- initial angle
- visual class
- optional moon relationship
- node id
- node body id
- node type
- contestable/controllable flags
- production flags
- protected no-war flags

Current node categories:

- tritium
- shipyard
- protectedTransit
- specialUtility/openIssue

Known assignments:

Tritium:

- Venus
- Jupiter
- Europa
- Saturn
- Enceladus
- Uranus
- Neptune

Shipyard:

- Mars
- Ganymede
- Callisto
- Titan
- Triton

Protected transit:

- Earth
- Moon

Mercury:

- keep unresolved/special/open for future simulation, do not finalize as dead barren

## Core simulation

Implement headless deterministic state:

- turn number
- body positions
- node references
- content hash/rules version

Body positions derive from data + turn number.

No renderer state in core.

## Spatial map

Implement minimal spatial view.

Render:

- black void
- very sparse glowing stars
- faint planetary orbit rails
- hard-lit bodies
- moon if present/readable
- node rails/placeholders
- labels only where necessary

Do not create a player-facing flat 2D tactical board.

## Camera

Implement:

- right mouse hold + drag pan
- wheel zoom toward cursor
- fit system
- focus object
- reset/clear focus where needed
- zoom bounds

Do not implement:

- orbit camera
- free camera
- roll
- manual rotation
- camera modes
- edge pan default

Disable browser context menu on main canvas.

## UI anchors

Create architecture for camera-agnostic UI anchors.

Objects expose world-space anchors.

Renderer projects them to screen-space.

Do not hardcode labels to a single camera angle.

## Tests

Add tests for:

- data schema validation
- invalid data rejection
- deterministic turn positions
- Earth/Moon protected transit flags
- core independence from renderer
- camera zoom bounds where practical

Ensure:

```text
npm run test
npm run typecheck
npm run build
npm run verify
```

all pass.

## v5 visual architecture hooks

Do not fully implement production/combat in Milestone 1, but data and rendering architecture must allow the following later without refactor:

- tritium body visual class with optional slow animated gas/fluid surface
- shipyard body visual class with sparse tiny surface grid lights
- node type metadata for tritium, shipyard, protectedTransit and special/openIssue
- production view model hooks for tritium dot-flow and shipyard segmented progress ring
- transfer trajectory view model with pill payload: T+ and dV
- invalid transfer pill payload: OUT OF RANGE and required/available dV
- missile trajectory view model with T- countdown and target faction color
- contested node view model with crossed faction rails, micro-flash activity hook and attrition pill values

Milestone 1 should not implement full gameplay systems, but it should name data fields and view-model concepts so these v5 map grammar decisions fit naturally later.
