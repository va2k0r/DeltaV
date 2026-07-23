# Technical Architecture

DeltaV starts as a web-first TypeScript prototype.

## Current Implementation

The current v10 alpha builds on the deterministic Solar System map foundation:

- external vanilla body/node JSON
- Zod validation
- headless deterministic core state
- turn counter and `ADVANCE_TURN`
- visual-only Next Turn orbital transitions
- 3D Planetarium as the default player-facing view
- 2D Tactical View as fallback, debug, and accessibility surface
- bounded presentation camera controls
- renderer-owned visual effects only
- player node occupancy as core snapshot state
- tiny renderer-owned ship occupancy markers on node rings
- player-occupied node rings with restrained faction color and slightly stronger width
- BURN preview cost, ETA, arrival turn, raised trajectory arc, future body ghost, and future
  destination marker
- pending BURN orders that resolve only when Next Turn advances state
- FIRE mode toggle on player-occupied nodes
- enemy test ships on unoccupied nodes
- pending FIRE orders that launch missiles on Next Turn
- active missile trajectories, countdown labels, and destructive impact against static targets
- Work and stealable five-step shipyard progress
- contested-node upkeep and mandatory departures
- Evade, deterministic AI planning, replay diagnostics, and elimination victory/defeat

Procedural Balanced is the default player-facing setup and is inherited by tutorial entry. The
canonical 18-node v10 map remains the fixed economy reference; Procedural Classic and Curated
remain explicit alternate/debug presets.

## Invariants

The core simulation must run headlessly. It must not depend on the DOM, Canvas, Three.js,
browser storage, renderer code, UI code, audio, input devices, or frame timing.

Renderers consume deterministic state snapshots. They never decide BURN cost, ETA, combat,
FIRE validity, missile ETA, production, node control, faction elimination, AI behavior,
victory, or defeat.

The 3D Planetarium is the player-facing presentation layer. The 2D Tactical View is
permanent fallback/debug/accessibility. Lighting, shadows, starfields, body materials, label
billboards, orbit rails, node-ring hover states, camera state, and animation are
renderer/UI-only and cannot affect simulation.

Node rings represent operational orbits around celestial bodies. They are where ships occupy
nodes; they are not surface bases or planet material. Gameplay readability belongs to node
rings, labels, billboards, and overlays. Ships render as tiny occupancy pips on or near node
rings and are not primary click targets. At close zoom a ship marker may render as a tiny
cylindrical/cigar-like 3D craft with engine glow and a blinking nose light. At far zoom it
collapses into a rhythmic luminous point that orbits clockwise along the node ring. This is
renderer-only presentation.

Milestone 1.5 BURN state stays headless. Core state owns node occupancy, pending BURN
orders, active BURN transits, the current turn, and the placeholder BURN cost/ETA helper.
BURN preview endpoints use the origin node position at turn T and the destination node's
predicted position at T + ETA. Planet-to-moon and moon-to-planet transfers take one turn;
other ETAs are integer values proportional to current distance. The renderer may draw raised
tangent arcs, translucent future body ghosts, equal-turn orbital dots, future destination
markers, and transit markers, but those visuals cannot decide cost, ETA, or arrival.

FIRE state stays headless. Core state owns pending FIRE orders, active missiles, missile ETA,
target faction/node, and impact resolution. FIRE costs 0 dV, but the firing ship is committed
for the turn and therefore cannot Work or also BURN. Missile ETA is the equivalent BURN ETA
plus one turn. Pending FIRE launches on Next Turn, active missiles count down by turn, and
impact removes one target ship from the locked target node in this milestone. The renderer may
draw red weapon markers, de-emphasized invalid targets, dashed missile arcs, missile cones or
collapsed red blinking lights, T-X labels, and red impact glows, but those visuals cannot
decide valid targets, ETA, or destruction.

Hierarchical display scaling is renderer-only. The 3D Planetarium may expand heliocentric
spacing, keep moon systems compact, scale the Sun independently, and keep future ships as
tiny operational points, but these presentation transforms must never alter core positions,
turn logic, JSON content semantics, or gameplay rules.

Zoom and focus use separate display scales. Interplanetary spacing compresses at zoom-out so
the full system can stay readable, then expands dramatically when zoomed or focused. Local
moon offsets expand only slightly so moons still read as satellites. Planet radii also use a
presentation-only nonlinear scale: distant overview views make planet sizes more comparable,
while close views amplify their differences. Moon body radii are intentionally much smaller
than planet radii, but both moon and planet bodies have display-only minimum radii so
zoomed-out views do not collapse important bodies into unreadable points. Moon node rings
may be oversized relative to their bodies so operational orbits remain readable in
zoomed-out views.

Node ring readability may adjust display geometry. Planet node rings remain visually larger
than moon node rings, and local node rings are separated by minimum display gaps so
parent/moon and sibling rings do not intersect. Parent/moon node-ring separation may use a
larger presentation gap than sibling rings because moon node orbits must never visually cut
into the planet's operational ring. Left-drag pan speed is adaptive to camera distance for
usability, while right-drag orbit constraints and wheel zoom targeting remain
presentation-camera behavior only.

Lighting and shadows are presentation only. Solar light direction, exaggerated shadow cones,
backlit rim effects, bloom, filmic tone mapping, and surface animation must not create
visibility rules, selection rules, movement rules, or any gameplay state.

Turn transitions are presentation only. The core advances from snapshot N to deterministic
snapshot N+1; the 3D renderer may interpolate orbital angles for bodies and moons while the
final rendered frame must exactly match snapshot N+1.

Camera state is presentation only. Right drag activates the controlled orbit/freecam
behavior, left drag pans, wheel zoom remains centered on the current focus/screen center, and
these inputs do not affect simulation state.

Single left click on a body or node selects and quick-pans without changing camera distance
or display focus scale. This is especially important for the Sun: selecting/centering the
Sun must not trigger Sun focus scaling, fit-system behavior, or an apparent zoom jump.
Double-click focus remains the explicit zooming interaction.

Node/body name and type labels are operational billboards shown only on hover. For bodies
with operational nodes, the body mesh and its node orbit resolve to the same node target so
hover and click behavior has no ambiguity. Node rings remain readable/selectable without
permanent text clutter.

## Initial Flow

```text
Input adapter
Intent / UI action
Gameplay command
Core simulation
Game state
Event log
Snapshot / view model
Renderer and UI
```

Milestone 1 implements the map-data-to-snapshot-to-renderer portion of this flow only.
Future gameplay commands must keep the same boundary.

## Data

Vanilla content is staged under `public/content/vanilla/` as if it were a built-in mod.
Future data files must be external JSON and validated with Zod before use.
