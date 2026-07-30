# Decisions

Decision 0001: Web-first TypeScript prototype
Date: 2026-06-02
Status: Active
Context:
DeltaV needs a fast, portable prototype environment that Codex can iterate on safely before
any engine or platform commitment.
Decision:
Use Vite and TypeScript for the initial web-first prototype.
Consequences:
The prototype can run in a browser, test core logic headlessly, and later package for desktop
or mobile only after the rules prove themselves.

Decision 0002: Strict TypeScript from the start
Date: 2026-06-02
Status: Active
Context:
The game depends on deterministic state, serializable data, and clear boundaries between core
logic and presentation.
Decision:
Enable strict TypeScript, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
Consequences:
Early code must be explicit about missing data and optional fields. This raises the cost of
loose scaffolding but protects later simulation work.

Decision 0003: Canvas 2D placeholder only in Milestone 0
Date: 2026-06-02
Status: Active
Context:
The 2D Tactical View is permanent, but Milestone 0 must not implement the map or gameplay.
Decision:
Create only a static Canvas 2D placeholder renderer.
Consequences:
The browser entry point proves the rendering surface exists while avoiding gameplay, map,
camera, ship, or combat implementation.

Decision 0004: Vanilla content staged as external content
Date: 2026-06-02
Status: Active
Context:
Future content must be data-driven and validated, and vanilla content should behave like the
built-in content package.
Decision:
Create `public/content/vanilla/` with data, asset, and license folders during Milestone 0.
Consequences:
Future milestones can add validated JSON and assets without hardcoding gameplay content into
core or renderer modules.

Decision 0005: Deterministic 2D map state before gameplay systems
Date: 2026-06-02
Status: Active
Context:
Milestone 1 needs a visible Solar System map and turn advancement, but must not introduce
ships, factions, production, movement, combat, AI, victory, defeat, audio, or 3D gameplay.
Decision:
Load v10 Solar System body/node data from external JSON, validate it with Zod, derive body
positions from content plus turn number, expose renderer snapshots, and keep camera state in
presentation code.
Consequences:
The app can show a deterministic Tactical 2D map and advance orbital positions while keeping
core state headless and free of gameplay systems reserved for later milestones.

Decision 0006: 3D planetarium is presentation-only
Date: 2026-06-02
Status: Active
Context:
Milestone 1.1 asks for a 3D-first player presentation and refined art direction without
adding ships, factions, production, movement commands, missiles, evasion, AI, victory,
defeat, or 3D gameplay.
Decision:
Add a Three.js cinematic planetarium renderer that consumes the existing deterministic
snapshot and owns only visual effects, labels, and presentation camera state. Keep the 2D
Tactical View available as fallback/debug/accessibility.
Consequences:
The player-facing map can move toward a cold hard-sci-fi planetarium while preserving the
headless core and renderer-independent simulation boundary.

Decision 0007: High-fidelity 3D strategic planetarium art direction
Date: 2026-06-03
Status: Active
Context:
DeltaV's player-facing interface is 3D-first. The current 3D view works but reads too much
like a flat tactical map. The game needs a cold, cinematic, hard-sci-fi Solar System
presentation with the Sun as an intense light source, readable operational node orbits, and
restrained technical overlays.
Decision:
The 3D view will use a dark strategic planetarium style: living central Sun, hard solar
lighting, sparse starfield, depth-aware orbit rails, node rings as empty operational orbits,
animated tritium gas surfaces, restrained shipyard surface lights, and operational billboard
labels. All effects are presentation-only.
Consequences:
The visual renderer becomes more sophisticated, but core simulation remains headless and
renderer-independent. Gameplay meaning remains on node rings, labels, billboards, and
overlays. Visuals must remain readable and must not become arcade, fantasy, or neon.

Decision 0008: Tuned orbital pacing and visual turn transitions
Date: 2026-06-03
Status: Active
Context:
DeltaV needs orbital motion to change strategic geometry over a short prototype match
without using real Solar System ratios. Next Turn should feel cinematic, but the core state
must remain deterministic and turn-based.
Decision:
Use gameplay-tuned orbital periods in vanilla data, uniform 14-turn active moon periods, and
expanded moon orbit radii for local-system readability. Render Next Turn as a visual-only
orbital arc transition between deterministic snapshots. Node/body labels appear only on
hover instead of being permanently visible. Right drag owns the controlled orbit camera,
left drag pans, wheel zoom stays center/focus based, and coarse noise overlays must remain
disabled or refined into subtle dither.
Consequences:
The map is more readable and less cluttered while preserving deterministic core state.
Orbital pacing remains data-driven and tunable after playtesting. Camera behavior is
preserved, but its mouse binding changes.

Decision 0009: Hierarchical display scale is presentation-only
Date: 2026-06-03
Status: Active
Context:
The 3D planetarium needs stronger visual hierarchy than the compact deterministic core map:
heliocentric distances should feel large, local moon systems should stay compact, the Sun
needs its own bounded display scale, and future ships should read as tiny operational
points.
Decision:
Add renderer-owned display scaling for body positions, body radii, Sun radius, node ring
scale, and fit-system bounds. Core snapshots, JSON orbital data, turn advancement, and
gameplay semantics remain unchanged.
Consequences:
The map can become more readable and cinematic without contaminating simulation logic.
Tests must cover the presentation transform so future visual work does not flatten the
Solar System hierarchy or promote ship-scale policy into gameplay.

Decision 0010: Moon bodies stay small while moon node rings stay readable
Date: 2026-06-03
Status: Active
Context:
The 3D map needs planets to dominate their moon systems, but small moon bodies made their
operational node rings too easy to lose in zoomed-out views.
Decision:
Reduce moon body display radii relative to planets, keep local moon offsets compact, and
give moon node rings a separate minimum display radius and scale multiplier. Zoom/focus may
expand heliocentric spacing strongly, but local moon systems expand only slightly.
Consequences:
Moons read as satellites instead of mini-planets, while their operational rings remain
readable/selectable. This remains a renderer-only transform and does not add ships,
production, factions, combat, or any gameplay rules.

Decision 0011: 3D readability fixes stay in presentation code
Date: 2026-06-03
Status: Active
Context:
The 3D map needs close-zoom pan to feel responsive, local node rings to avoid visual
intersections, focused zoom to keep its target centered, hover labels to clear reliably, and
poorly lit bodies to remain locatable without flattening the hard solar lighting.
Decision:
Keep these fixes in the cinematic renderer and renderer helper modules. Use adaptive
left-drag pan speed, display-only node ring separation, tracked focus recentering during
zoom, root-level hover picking, and a restrained dark-side silhouette rim in the existing
body shader.
Consequences:
3D usability improves without changing core state, right-drag orbit constraints, wheel zoom
semantics, JSON data, or gameplay systems.

Decision 0012: Body and node picking share operational targets
Date: 2026-06-03
Status: Active
Context:
The player should not need to distinguish between clicking a celestial body and clicking the
operational node orbit around it. Persistent labels also create clutter and make selection
state look like gameplay ownership.
Decision:
For bodies with operational nodes, the body mesh, expanded body picker, and expanded node
orbit picker all resolve to the node target. Labels are hover-only. Node ring materials may
reduce opacity only where the ring is projectively occluded by the body disk, so the orbit
segment hidden by the body reads as less visually dominant.
Consequences:
Hover/click behavior becomes unambiguous while remaining presentation-only. Selection and
focus can still exist for UI controls, but they do not make labels persist and they do not
alter core simulation.

Decision 0013: Contextual focus and nonlinear overview scale
Date: 2026-06-03
Status: Active
Context:
The 3D map needs click focus to feel direct, focused bodies must remain centered during
visual turn interpolation, and zoomed-out overviews should not force every planet into a
tiny unreadable dot.
Decision:
Single left click focuses the clicked body/node target with a fast smooth pan that preserves
the current zoom distance. During visual turn transitions, a tracked focus target recenters
the presentation camera every frame. Heliocentric spacing compresses at zoom-out and expands
at close/focused zoom. Planet display radii use a nonlinear presentation scale that makes
distant planet sizes more comparable and close planet sizes more differentiated.
Consequences:
The planetarium is easier to read and navigate without changing core positions, turn
resolution, node data, or gameplay rules. Left-drag pan and right-drag orbit/freecam
bindings remain unchanged.

Decision 0014: Milestone 1.5 implements node occupancy and BURN preview only
Date: 2026-06-04
Status: Active
Context:
The first ship-facing interaction pass needs to show where player ships occupy operational
nodes and how a BURN order would travel, without expanding into FIRE, combat, production,
AI, or win/loss systems.
Decision:
Nodes remain the primary interaction objects. Ships are tiny visual occupancy markers on
node rings and are not primary click targets. At close zoom they render as very small
cylindrical/cigar-like 3D craft with electric engine glow and a blinking nose light; at
zoom-out they collapse to a rhythmic luminous point that moves clockwise along the node
orbit. Player-occupied rings use the restrained blue-white player faction color, are
slightly thicker, and receive an additional subtle selected-origin highlight. Selecting an
occupied player node enters BURN origin context. Hovering another node shows a BURN preview
with cost, integer ETA, arrival turn, a raised technical trajectory arc, a translucent ghost
of the destination body at the predicted arrival-turn position, and equal-turn dots along
the destination body's orbital path between current and future position. Transfer curves
start and end on tangent points of the origin/destination node rings. Clicking a destination
creates or updates a pending BURN order that resolves only on Next Turn. Single-click panning
must preserve the current display focus scale and camera distance, including for the Sun.
Consequences:
The core now owns deterministic node occupancy, pending BURN orders, active BURN transits,
and the placeholder BURN cost/ETA helper. Planet-to-moon and moon-to-planet BURN plans take
one turn; other ETAs are integer values proportional to current distance. The 3D renderer
owns only the visual rings, ship models, collapsed pips, arcs, labels, ghost bodies, future
markers, timing dots, and transit markers. FIRE preview, FIRE orders, missiles, combat,
evade, contested rules, production, AI, victory, and defeat remain outside this milestone.

Decision 0015: Zoomed-out moon and planet readability floors
Date: 2026-06-06
Status: Active
Context:
At maximum zoom-out, small moons could collapse into dots and moon node rings could become
too close to their parent planet node rings, weakening strategic readability.
Decision:
Add renderer-only minimum display radii for planets and moons, with a stronger parent/moon
node-ring separation gap than the generic sibling gap. Keep moon bodies visibly smaller than
planets while preventing them from becoming unreadable at overview scale.
Consequences:
The planetarium remains readable at the zoom-out limit without changing core orbital data,
turn logic, node semantics, movement, production, combat, AI, or any other gameplay system.

Decision 0016: Mandatory launch is a hard sequencing lock
Date: 2026-06-06
Status: Active
Context:
Shipyard completion temporarily creates a second equivalent ship at the working shipyard
node, but canonical rules require that produced ship to launch immediately because two ships
cannot remain stacked on the same operational node.
Decision:
When one or more player shipyards complete, the next unresolved mandatory launch becomes a
hard interaction lock. The UI selects and centers that shipyard node, disables Next Turn and
focus-changing controls, and allows only choosing a BURN destination. If multiple shipyards
complete in the same turn, mandatory launches are resolved one at a time. Core `ADVANCE_TURN`
also refuses to advance while any mandatory launch remains unresolved, and BURN assignment
rejects occupied or already-targeted same-faction destinations.
Consequences:
Mandatory launch cannot be bypassed by UI focus changes, Escape, repeated clicks, or direct
core command calls. The rule remains limited to ship production and BURN sequencing; it does
not add combat, missiles, evasion, AI, victory, or defeat logic.

Decision 0017: Minimal FIRE and missile layer
Date: 2026-06-06
Status: Active
Context:
The first combat-facing milestone needs FIRE orders, visible missiles, target filtering, and
destructive impact while preserving the existing BURN flow and avoiding evasion, contested
rules, AI, or victory logic.
Decision:
Add headless pending FIRE orders and active missile state. FIRE costs 0 dV, uses the
equivalent BURN ETA plus one turn, launches on Next Turn, prevents the firing ship from
Working or also taking BURN that turn, and destroys one static enemy ship at impact. The
renderer owns only the FIRE mode marker, target de-emphasis, red dashed trajectories,
missile cone/blinking-light presentation, T-X labels, and impact glow. Two static opponent
ships are present on unoccupied nodes as test targets.
Consequences:
The prototype now has a minimal missile loop that can be play-tested without implementing
evasion, contested nodes, moving enemy ships, AI, victory, or defeat. Fire solutions include
target ship keys so future movement can cancel pending or active solutions when a target
ship leaves its node.

Decision 0018: The command log is the tutorial knowledge interface
Date: 2026-07-30
Status: Active
Context:
World-relative tutorial help competed with the map and explained only the object under the
cursor. The player instead needs every meaningful command-log term, year, body name, resource
value, turn index, ETA, progress fraction, and control verb to expose the rules that produced it.
Decision:
Remove the world-hover tutorial explanation. Command-log terms are data-driven hypertext.
After a short dwell, a brief typed explanation appears without a box in a matching column to
the left, vertically aligned with the hovered log line. Clicking or keyboard activation types
a dense explanation below EXECUTE in one fixed log-width column. That column ends at the
bottom of the viewport, never scrolls, and cannot be text-selected. Player-facing glossary
labels reuse the selected term and do not add slash headers. Astronomical body entries combine
stable physical data with explicitly separated DeltaV node and 2079 canon; unspecified
geopolitical or economic facts remain identified as unspecified.
Consequences:
Tutorial knowledge is contextual to the command chronology rather than the 3D world. The
glossary remains UI-only and cannot own or change simulation, camera, content, cost, ETA,
legality, or resolution state. Dense entries must be edited to fit the fixed column instead of
adding scrolling, cards, panels, or new visual syntax.
