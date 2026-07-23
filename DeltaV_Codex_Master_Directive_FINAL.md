# DeltaV Codex Master Directive

Use this document as the first high-level directive for Codex when creating or modifying the DeltaV project. It combines the technical architecture constraints and the game content constraints that must remain stable throughout development.

This is not a request to build the whole game in one pass. Codex must first create a clean, testable, web-first project structure and then implement DeltaV milestone by milestone.

---

## 0. Primary instruction to Codex

You are working on DeltaV, a deterministic hard-science-fiction orbital strategy game.

Your first responsibility is not to make a visually impressive prototype. Your first responsibility is to create a durable software architecture that prevents scope creep, keeps the core simulation testable, and allows the game to grow safely.

Before coding, create and maintain the project documents listed in this directive. The repository must remember the project through files, tests, schemas and decision logs, not through chat memory.

Implement only the requested milestone. Do not add unrequested game systems.

---

## 1. Product definition

DeltaV is a deterministic hard-sci-fi orbital strategy game set in a near-future AI and tritium-powered economy.

Post-Silicon-Valley tech oligarchs and megacorporations fight beyond the Moon for control of the Solar System's tritium supply.

The player is not a pilot. The player is a corporate military operations commander allocating scarce mobility, ships, timing and orbital position.

Core statement:

```text
A ship is a ship.
Tritium is delta-v.
Delta-v is life.
Nodes produce, ships control.
Victory is mobility denial.
```

---

## 2. Reference feel

DeltaV sits between these references:

```text
Kerbal Space Program:
Orbital intuition, transfer planning, delta-v, the pleasure of understanding movement through gravity.

Children of a Dead Earth:
Hard sci-fi combat logic, cold technical brutality, no romanticized space warfare.

The Expanse:
Near-future Solar System tension, corporate and geopolitical conflict, fragile high-value ships, distance, fuel and timing as life-or-death constraints.

Starfield / NASApunk:
Grounded, technical, believable, lived-in space hardware. Do not copy space fantasy.

Starminer:
Industrial space, extraction, infrastructure and mining as aesthetic references. Do not copy its sandbox/base-building systems.

Endless Space / Stellaris:
Only as high-level zoom-out map readability references. Do not copy 4X systems.
```

DeltaV must feel cold, technical, industrial, military, corporate, sober and plausible.

Avoid arcade dogfighting, heroic pilots, colorful space fantasy, random hit chances, tech trees, diplomacy systems, fantasy weapons, aliens, interstellar travel and excessive lore exposition.

---

## 3. Non-negotiable technical principles

### 3.1 Core simulation is independent

The core simulation must not depend on:

```text
DOM
Canvas
Three.js
browser APIs
renderer code
UI code
audio code
localStorage
mouse/touch/controller events
```

The core must run headless in tests and command-line simulations.

Correct architecture:

```text
Input adapter
↓
Intent / UI action
↓
Gameplay command
↓
Core simulation
↓
Game state
↓
Event log
↓
Snapshot / view model
↓
2D renderer, 3D renderer, UI, audio
```

### 3.2 Renderer is presentation only

Renderers must never decide gameplay outcomes.

Renderers may show:

```text
orbits
bodies
ships
missile warnings
trajectory previews
delta-v costs
node ownership
turn summaries
```

Renderers must not decide:

```text
movement cost
missile hit result
evasion cost
node control
production
faction elimination
AI command choice
```

### 3.3 2D Tactical View is permanent

DeltaV must remain fully playable in 2D Tactical View even if the 3D renderer is disabled.

The 2D view is not a temporary debug feature. It is the strategic command view, the main debugging surface, the accessibility fallback and the future mobile/low-performance baseline.

### 3.4 3D Cinematic View is future presentation

A 3D layer may be added later using Three.js or another web-friendly renderer, but it must only consume snapshots from the core and must not contain gameplay logic.

The game must not become a 3D physics simulation.

### 3.5 Web-first, portable later

Start as a web-first TypeScript project for fast Codex preview and iteration.

Do not start in Godot or Unity. A future port is allowed only if the core rules have already been validated.

Possible future packaging:

```text
Tauri or Electron for desktop and Steam
Capacitor or PWA for mobile experiments
Godot port only after the game proves itself
```

Do not implement packaging, Steamworks or mobile deployment in early milestones.

---

## 4. Required stack for the initial project

Use:

```text
TypeScript
Vite
Vitest
Zod
Canvas 2D for initial Tactical View
ESLint or equivalent linting
Prettier or equivalent formatting
```

Initial scripts must include only commands that actually work:

```text
npm install
npm run dev
npm test
npm run typecheck
npm run lint
npm run build
npm run verify
```

`npm run verify` should run tests, typecheck, lint and build once those scripts exist.

TypeScript must be strict:

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## 5. Required repository documents

Create these files in the repository.

```text
AGENTS.md
README.md
docs/TECHNICAL_ARCHITECTURE.md
docs/GAME_CONTENT_BIBLE.md
docs/ROADMAP.md
docs/DECISIONS.md
docs/DATA_SCHEMA.md
docs/TESTING.md
docs/MODDING.md
docs/BALANCING.md
docs/SECURITY.md
```

### 5.1 AGENTS.md must be short

`AGENTS.md` is not the whole design bible. It must be short, operational and hard to ignore.

It must contain:

```text
setup commands
test commands
architecture invariants
anti-scope-creep rules
required verification steps
```

It must tell Codex to read the longer documents when needed.

### 5.2 DECISIONS.md is mandatory

Every architectural or gameplay decision must be logged in `docs/DECISIONS.md`.

Format:

```text
Decision 0001: Web-first TypeScript prototype
Date: YYYY-MM-DD
Status: Active
Context:
Decision:
Consequences:
```

---

## 6. Required project structure

Create an initial structure like this.

```text
deltav/
  package.json
  tsconfig.json
  vite.config.ts
  index.html
  AGENTS.md
  README.md

  docs/
    TECHNICAL_ARCHITECTURE.md
    GAME_CONTENT_BIBLE.md
    ROADMAP.md
    DECISIONS.md
    DATA_SCHEMA.md
    TESTING.md
    MODDING.md
    BALANCING.md
    SECURITY.md

  src/
    core/
      state/
      commands/
      phases/
      simulation/
      movement/
      missiles/
      production/
      control/
      elimination/
      ai/
      rng/
      hashing/
      replay/
      save/

    data/
      schemas/
      loaders/
      validators/
      contentHash/

    renderers/
      tactical2d/
      cinematic3d_placeholder/

    ui/
      viewModels/
      panels/
      input/
      tutorialHooks/

    tools/
      balanceRunner/
      scenarioRunner/
      replayRunner/
      assetValidator/

  public/
    content/
      vanilla/
        data/
          bodies.json
          factions.json
          balance.json
          scenarios.json
          ui_text.json
        assets/
          ships/
          bodies/
          ui/
        audio/
          music/
          sfx/
        licenses/
          credits.json

  tests/
    core/
    data/
    golden/
    replay/
    scenarios/
```

Do not add unnecessary dependencies or frameworks.

---

## 7. Determinism requirements

DeltaV must be deterministic.

Same initial state plus same command log plus same content data must produce the same final state.

Rules:

```text
Do not use Math.random in gameplay logic.
Use a seeded RNG only if randomness is explicitly required.
Prefer integers or fixed-point values inside the core.
Do not let rendering frame rate affect gameplay.
Resolve event order deterministically.
Sort IDs deterministically before resolving simultaneous effects.
Produce a stable state hash after each turn.
```

Every replay and save must include:

```text
gameVersion
saveVersion
rulesVersion
contentHash
modList
seed
turn
commandLog or enough state to resume deterministically
```

---

## 8. Command and event architecture

All gameplay changes must happen through serializable gameplay commands.

Examples:

```text
MOVE_SHIP
LAUNCH_MISSILE
EVADE_INCOMING_MISSILES
ADVANCE_TURN
```

UI actions are not gameplay commands.

Examples of UI actions:

```text
SELECT_OBJECT
OPEN_CONTEXT_MENU
HOVER_TRAJECTORY
TOGGLE_TACTICAL_VIEW
CONFIRM_PREVIEW
CANCEL_PREVIEW
```

Gameplay commands must produce structured events.

Examples:

```text
SHIP_TRANSFER_STARTED
SHIP_ARRIVED
MISSILE_LAUNCHED
MISSILE_WARNING_ISSUED
EVASION_BURN_EXECUTED
SHIP_DESTROYED
NODE_CONTROL_CHANGED
TRITIUM_PRODUCED
SHIP_PRODUCTION_PROGRESS_ADDED
SHIP_DEPLOYED
FACTION_ELIMINATED
```

The event log must be readable enough to explain what happened to the player.

---

## 9. Game phases

Implement explicit game phases before adding complex behavior.

Initial phases may be:

```text
PlanningPhase
ResolutionPhase
ProductionPhase
TurnSummaryPhase
```

Potential later phase:

```text
ReactionPhase
```

Commands must be legal only in the correct phase.

Illegal commands must fail with a clear error.

---

## 10. Data-driven design

No gameplay content should be hardcoded in the core or renderer.

Load from external data files:

```text
bodies
factions
balance parameters
scenario setup
UI labels
asset manifests
future mods
```

Use Zod for runtime validation.

Every invalid data file must fail loudly with a useful error.

Examples of useful errors:

```text
Invalid body config: body "mars" has unknown nodeType "shipyardd".
Invalid balance config: evasionBurnCost cannot be negative.
Invalid scenario: starting ship references unknown body "ceres".
```

---

## 11. Game content invariants

These are hard rules for the first playable version.

### 11.1 Factions

Factions are mechanically equivalent.

They may differ only by:

```text
name
color
starting conditions
logo or visual pattern
ship visual design
UI accent
```

Do not add faction-specific bonuses, techs, abilities, economies, special ships or special weapons in v1.

Faction count is a match setup parameter, not fixed lore.

### 11.2 Naming direction

Corporation names should feel like tech oligarch brands from an AI, tritium and platform economy.

They should be short, brandable and plausible.

Avoid generic sci-fi corporate suffixes:

```text
Industries
Dynamics
Logistics
Systems
Resource Group
Mining
Aerospace
Strategic
Interplanetary
```

Better direction:

```text
Meta
Tesla
Amazon
Google
OpenAI
Nvidia
Palantir
Anthropic
xAI
```

Use this as naming inspiration, not literal names.

Prefer names that could have started as tech companies and become geopolitical powers.

### 11.3 Resources

There is only one spendable resource:

```text
tritium
```

Tritium is the global delta-v pool.

It powers interplanetary fusion drives and is compact enough that logistics do not need to be simulated at the game level.

Do not add credits, minerals, population, food, metal, energy, logistics capacity, upkeep or multiple fuel types in v1.

### 11.4 Ships

A ship is a ship.

All ships have the same gameplay capabilities in v1.

Every ship can:

```text
occupy orbit around a celestial body
move by spending global tritium / delta-v
control a productive node if uncontested or otherwise legally controlled
launch missiles
perform evasion burns against incoming missiles
be destroyed by one successful missile hit
```

Do not add ship classes, HP, armor, roles, tankers, scouts, frigates, carriers, builders, troop ships, upgrades or loadouts in v1.

### 11.5 Production

Production is node-based, not ship-based.

Ships do not produce.

A faction receives production from a productive celestial body when it controls that node.

Control requires at least one friendly ship in orbit unless later rules define a contested state.

Additional ships on the same node do not stack production.

Node types:

```text
tritium node: produces tritium for the controlling faction
factory node: produces ship production progress for the controlling faction
non-productive node: produces nothing
```

Factory nodes represent access to minerals and construction infrastructure, but minerals are not a separate playable resource.

### 11.6 Weapons

The only weapon in v1 is the missile.

Missiles may be nuclear.

A successful missile hit destroys a ship in one hit.

No railguns, lasers, point defense, drones or weapon classes in v1.

Drones or other missile-like systems may be explored later only if the core missile game is already proven.

### 11.7 Evasion

Missile defense is an evasion burn.

An evasion burn spends global tritium / delta-v to invalidate incoming missile trajectories against the targeted ship.

The ship does not need to leave the orbit of the body to evade. This represents a local burn, timing change, trajectory correction or intercept window denial.

The UI must make this readable as a deliberate cost:

```text
Burn now to live, but spend future mobility.
```

### 11.8 Map

The base map is the Solar System. Do not show the player a deliberately incomplete Solar System as the main game.

Initial alpha body list:

```text
Sun
Mercury
Venus
Earth
Moon
Mars
Jupiter
Ganymede
Callisto
Europa
Saturn
Titan
Enceladus
Uranus
Neptune
Triton
```

The playable strategic body set is:

```text
Neutral / non-productive / off-limits:
Earth
Moon
Triton

Factory nodes:
Mercury
Venus
Mars
Ganymede
Callisto

Tritium nodes:
Jupiter
Saturn
Uranus
Neptune
Titan

Non-productive positional nodes:
Europa
Enceladus
```

There is no special mechanical distinction between neutral and tactical beyond whether the node produces something, is controllable, or is off-limits in the current rules.

Tritium is extracted from the gas giant systems. Titan represents access to Saturn-system tritium infrastructure, not literal tritium mining from Titan's surface.

Future versions may add asteroids, dwarf planets or minor bodies, but they must not be introduced before the base system is playable.

### 11.9 Defeat condition

A faction is eliminated when it has lost recoverable mobility.

This means it has no realistic way to regain access to tritium extraction and therefore no way to move ships to recover tritium production.

Do not define defeat as simply destroying every ship.

A faction may be dead even if it still has ships, if those ships cannot restore tritium access.

The UI must explain this clearly:

```text
Faction eliminated: no controlled tritium nodes and insufficient delta-v to reach or contest any tritium node.
```

Exact elimination thresholds must be tuned by simulation and tests, not guessed.

---

## 12. Fixed content versus tunable parameters

Hard rules are fixed.

Numerical values are tunable.

Do not hardcode balance values.

Tunable values include:

```text
tritium production per node
factory production time
starting tritium
starting ships
transfer cost formula
missile ETA
missile range if any
evasion burn cost
AI aggression
turn pacing
first-contact timing
elimination thresholds
```

All tunables must live in external config and be designed for simulation-driven tuning.

---

## 13. Worldbuilding constraints

The setting is near-future, not far-future space opera.

Tritium is indispensable because it powers:

```text
commercially meaningful interplanetary travel
military force projection beyond the Moon
huge AI server infrastructure on Earth
```

Earth still has strong states or state blocs, such as:

```text
United States of America
United States of Europe
Asian Conglomerate
```

States retain the monopoly of force on Earth, in Earth orbit and around the Moon.

Corporate warfare near Earth is unacceptable because of:

```text
orbital debris
nuclear escalation
atmospheric fallout risk
civilian infrastructure risk
state crackdown
```

Earth orbit and the Moon are off-limits for corporate war.

Beyond lunar orbit, state enforcement becomes weak. Corporations, contractors, free agents and private intelligence/military structures operate in a new frontier.

The war is known on Earth but reported through filtered, corporate-controlled information. The tone is sober and understated, not heroic propaganda.

---

## 14. Player promise

DeltaV promises the player:

```text
Every loss was readable.
Every victory was earned through positioning, timing and mobility denial.
Every maneuver mattered because mobility is finite.
Every missile threat was understandable before it became fatal.
Every defeat came from losing recoverable access to tritium, not from hidden dice rolls.
```

No hidden random chance may decide the outcome of a critical action.

---

## 15. UI and readability principles

The player must always understand:

```text
where my ships are
who controls each node
which nodes produce tritium
which nodes produce ships
how much tritium I have
where I can move
what it costs
when I arrive
which missiles threaten me
what evasion costs
which faction is close to elimination
what happens if I confirm this command
```

Every major command must have deterministic preview before confirmation:

```text
movement cost
ETA
arrival body
known risks
missile warning
evasion cost
node control consequence
production consequence
```

### 15.1 Zoom behavior

Map meaning should change with zoom.

```text
Zoom in:
more physical, orbital, Kerbal / Children of a Dead Earth influence.
Show bodies, orbits, trajectories, missile vectors, ship positions.

Zoom out:
more strategic, Endless Space / Stellaris influence.
Show ownership, production, faction reach, contested areas, macro state.
```

Do not import 4X mechanics just because zoom-out resembles 4X maps.

---

## 16. Tutorial and onboarding

The tutorial should be contextual during the first real match, not a separate campaign of special tutorial missions.

The tutorial itself may be implemented later, but the game must expose hooks for it early.

Track events such as:

```text
first ship selected
first movement preview opened
first movement confirmed
first tritium node controlled
first factory node controlled
first missile launched
first incoming missile warning
first evasion burn
first ship destroyed
first mobility-loss warning
first faction eliminated
```

Do not hardcode tutorial behavior into core simulation.

Tutorial text must live in external data files.

---

## 17. AI requirements

AI must use the same legal commands available to the player.

AI must not cheat unless a scenario or difficulty explicitly says so.

Every AI decision should be explainable in a reason log.

Example:

```text
AI selected MOVE_SHIP to Titan because:
- Titan is a tritium node
- current tritium reserve is low
- nearby enemy threat is acceptable
- transfer cost is affordable
```

Initial AI should be simple, deterministic and testable.

Do not build complex AI before the core loop works.

---

## 18. Modding constraints

The project must be moddable through data and assets, but not through arbitrary executable code in v1.

Allowed later:

```text
asset swaps
corporation names
colors
logos
ship visuals
body textures
music
SFX
balance configs
scenario setup
possibly additional data-defined bodies or presets
```

Not allowed in v1:

```text
arbitrary JavaScript mods
eval
mods accessing browser APIs directly
mods changing core logic through executable scripts
```

Mod loading must eventually support:

```text
mod id
version
compatible game version
compatible rules version
load order
dependencies
content hash
conflict detection
```

Even before full mod support, vanilla content must be structured as if it were a mod.

---

## 19. Asset and contributor pipeline

Prepare the project so future contributors can replace or add assets safely.

Every asset must eventually have metadata:

```text
id
author
license
source file
runtime file
version
notes
```

Separate source assets from runtime assets.

```text
assets_source: editable originals, not shipped
public/content/.../assets: optimized runtime assets
```

Do not require contributors to edit core code to add visuals, names, music or UI strings.

---

## 20. Testing requirements

At minimum, create tests for:

```text
data schema validation
body loading
faction loading
balance config loading
turn advancement
node control
node production
non-stacking production
movement command validation
missile command validation
evasion command validation
save/load roundtrip
replay determinism
state hash stability
```

Add invariant tests:

```text
production never stacks from multiple ships on same node
ships do not produce by themselves
only nodes produce
no faction-specific mechanics exist in v1
there is only one spendable resource
all ships use the same gameplay type
only missiles exist as weapons in v1
same command log gives same state hash
```

Golden tests must protect important outcomes.

---

## 21. Balance and simulation tools

Create headless tools before guessing final numbers.

Balance runner should eventually measure:

```text
turns to first meaningful command
turns to first visible consequence
turns to first missile exchange
turns to first ship loss
average tritium spent per turn
average evasion burns per match
average faction elimination turn
win rate by starting condition
frequency of mobility-lock situations
node control distribution over time
```

Long simulations must run through Node scripts or Web Workers, not directly on the UI thread.

Do not choose final balance values before simulations exist.

---

## 22. Performance constraints

Do not recompute expensive previews every render frame.

Recompute previews only when relevant state or input changes.

Keep the first playable version small and readable.

Initial performance assumptions:

```text
15 strategic bodies
2 to 4 factions depending on match setup
limited ship count during MVP
missiles only
2D renderer first
3D disabled until core proves stable
```

---

## 23. Things not to add in v1

Do not add:

```text
ship classes
HP bars
armor values
railguns
lasers
point defense
weapon tech trees
multiple resources
credits
minerals as spendable resource
population
colonies
diplomacy
trade routes
hero units
admirals
crew stats
manual piloting
real-time combat
aliens
interstellar travel
story campaign
faction-specific bonuses
random hit chances
complex espionage
planetary ground war
base building
terraforming
research trees
```

If tempted to add one of these, update `docs/DECISIONS.md` with a proposal and wait for explicit approval.

---

## 24. Milestone plan

### Milestone 0: Project cage

Goal: create the software and documentation cage before gameplay.

Must include:

```text
Vite + TypeScript project
strict TypeScript
Vitest setup
Zod setup
folder structure
AGENTS.md
README.md
docs files
empty or placeholder modules
npm scripts
basic verify script
first decision log entries
```

Acceptance criteria:

```text
npm install works
npm run dev works
npm test works
npm run typecheck works
npm run build works
AGENTS.md exists and is concise
DECISIONS.md contains initial decisions
No gameplay systems beyond placeholders
```

### Milestone 1: Solar System and data loading

Goal: load validated body data and render a minimal 2D Tactical View.

Must include:

```text
bodies.json
Zod schemas
body hierarchy
node type definitions
turn counter
headless simulation state
minimal Canvas 2D Tactical View
body labels
zoom/pan basic if simple
schema tests
turn advancement tests
```

Acceptance criteria:

```text
bodies are loaded from external data
invalid bodies fail validation
core can advance turns headlessly
renderer does not contain simulation logic
2D view shows the Solar System structure
No ships, combat, production or AI yet unless explicitly requested
```

### Milestone 1.5: First playable loop

Goal: create the smallest real DeltaV loop.

Suggested content:

```text
2 factions
one or more starting ships
one factory node
one tritium node
movement preview
movement confirmation
node control
tritium production
factory production progress
turn summary
```

Do not add missiles until this loop is readable.

### Milestone 2: Missiles and evasion

Goal: add the first combat loop.

Must include:

```text
launch missile command
incoming missile event
missile ETA or timing representation
evasion burn command
tritium cost preview
successful hit destroys ship
clear event log
no HP
no other weapons
```

### Milestone 3: Elimination and basic AI

Goal: make a match resolve.

Must include:

```text
recoverable mobility check
faction elimination warning
faction eliminated event
simple deterministic AI using legal commands
AI reason log
headless simulation metrics
```

---

## 25. First prompt Codex should execute

When first creating the project, Codex should be given this task:

```text
Create Milestone 0 only for DeltaV.

Read this directive carefully.
Do not implement gameplay yet.
Create a Vite + TypeScript + Vitest + Zod project with strict TypeScript, the required folder structure, AGENTS.md, README.md and the docs listed in this directive.

AGENTS.md must be concise and operational.
The longer design constraints must be placed in docs/TECHNICAL_ARCHITECTURE.md and docs/GAME_CONTENT_BIBLE.md.
Create docs/DECISIONS.md with the initial architectural decisions.

Add npm scripts for dev, test, typecheck, lint, build and verify, but only if they actually work.
Run the verification commands and report what passed.
Do not add ships, combat, production, AI, 3D, Steam, mobile, packaging or mod loading.
```

---

## 26. Final Codex rule

When unsure, Codex must choose the simpler system that preserves DeltaV's identity:

```text
one resource
one ship type
one weapon type
node-based production
deterministic preview
2D playable core
external data
headless tests
no hidden randomness
no feature creep
```

Do not make DeltaV more generic to make it feel more like other space strategy games.
