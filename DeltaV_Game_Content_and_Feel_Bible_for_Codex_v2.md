# DeltaV Game Content and Feel Bible for Codex v2

## 0. How Codex must use this document

This is an AI-facing game content directive.

It is not a traditional creative document for a human design team. It is written to constrain an AI coding agent so it does not invent generic space-game content, add unwanted systems, or drift away from the minimal DeltaV ruleset.

When implementing game content, UI labels, data files, scenarios, tooltips, event logs, tutorials, balance configs or placeholder assets, Codex must treat this document as the source of truth for the vanilla game identity.

This document defines:

- game identity
- world premise
- fixed content invariants
- map content
- faction philosophy
- economy model
- ship model
- weapon model
- defeat model
- UX and game-feel constraints
- visual direction
- naming direction
- forbidden additions for v1
- parameters that must remain tunable

This document does not define:

- code architecture
- TypeScript module structure
- renderer implementation
- test framework
- packaging
- deployment
- repository setup

Those belong to the technical architecture directive.

Codex must not treat missing numbers as permission to invent final balance. Missing numerical values must become external tunable parameters.

Codex must not add content because it is common in strategy games. If a feature is not explicitly allowed here, leave it out.

---

## 1. One-line identity

DeltaV is a deterministic hard-science-fiction orbital strategy game set in a near-future AI and tritium-powered economy, where post-Silicon-Valley tech oligarchs fight beyond the Moon for control of the Solar System's tritium supply.

Core mantra:

> A ship is a ship. Tritium is delta-v. Delta-v is life.

Player promise:

> Every loss must be readable. Every victory must be earned through position, timing and mobility denial. Every maneuver must matter because mobility is finite.

Italian formulation:

> DeltaV è uno strategico orbitale hard sci-fi deterministico, ambientato in un prossimo futuro in cui oligarchi tecnologici nati dall'economia AI e trizio-powered si combattono oltre la Luna per il controllo del trizio nel Sistema Solare.

---

## 2. Core fantasy

The player is not a pilot.

The player is a corporate military operations commander allocating scarce mobility, timing, ships and tritium across the Solar System.

The player fantasy is:

- read orbital opportunity
- commit scarce delta-v
- control production nodes
- force enemy movement
- deny tritium extraction
- exploit immobility
- win by making the opponent unable to recover mobility

The player should feel like they are commanding a cold, technical, expensive, deniable corporate war beyond the reach of terrestrial law.

The player should not feel like they are dogfighting, building an empire, managing colonies, choosing hero abilities, or trading damage with hit-point bars.

---

## 3. Game references and how to interpret them

Codex must not copy these games mechanically. These references define feel and direction.

### 3.1 Kerbal Space Program

Use for:

- orbital intuition
- transfer planning
- delta-v as meaningful constraint
- satisfaction of understanding orbital movement

Do not copy:

- manual piloting as core gameplay
- comedic tone
- engineering sandbox complexity

### 3.2 Children of a Dead Earth

Use for:

- hard sci-fi combat logic
- technical brutality
- geometry, timing, fuel and weapon physics as strategic reality
- no romanticized space warfare

Do not copy:

- excessive engineering opacity
- overwhelming subsystem simulation
- unreadable combat resolution

### 3.3 The Expanse

Use for:

- near-future Solar System tension
- resource conflict
- industrial realism
- ships as fragile, high-value assets
- distance, fuel and timing deciding life or death
- understated space conflict

Do not copy:

- cinematic or fantasy-like technology
- heroic crew drama as the center of the game
- space opera escalation

### 3.4 Starfield and NASApunk

Use for:

- grounded and relatable space hardware
- functional industrial equipment
- plausible evolution of present-day aerospace design
- lived-in technical surfaces

Do not copy:

- RPG adventure tone
- exploration fantasy
- decorative sci-fi excess

### 3.5 Starminer

Use for:

- space as industrial extraction space
- mining and infrastructure as the reason for expansion
- resource control as the economic basis of conflict

Do not copy:

- real-time sandbox base-building
- alien threat framing
- construction-game complexity

### 3.6 Endless Space 2 and Stellaris

Use only for:

- strategic clarity at high zoom levels
- macro map readability
- high-level faction and node status
- contextual abstraction as zoom changes

Do not copy:

- 4X tech trees
- diplomacy-heavy empire simulation
- colonization management
- many resource types
- heroes or commanders

---

## 4. Four sacred design pillars

These four pillars are non-negotiable.

### 4.1 Tritium is delta-v

Tritium is the only spendable resource.

Tritium represents the faction's global operational delta-v capacity.

Delta-v is not merely fuel. It is:

- mobility
- defense
- evasion
- initiative
- recovery potential
- strategic life

A faction without recoverable access to tritium is effectively dead even if it still has ships.

The fiction explanation is that tritium powers high-performance fusion-based interplanetary engines and also feeds the AI-powered terrestrial economy. Tritium is valuable enough to justify conflict, but compact enough that its transport is not a gameplay logistics problem. A tiny amount of usable fusion fuel can represent enormous operational value.

Therefore the global tritium pool is an intentional abstraction, not a logistics simulation.

### 4.2 A ship is a ship

In the first version, all ships are mechanically identical.

No ship classes.
No frigates.
No destroyers.
No carriers.
No scouts.
No tankers.
No armor.
No hit points.
No special abilities.

A ship is a control, projection and denial asset.

Each ship can:

- orbit a celestial body
- move by spending global tritium
- control a node if in orbit and not contested by future rules
- launch missiles
- perform evasion burns against incoming missiles if the faction can spend tritium
- be destroyed by one successful hit

Do not implement ship roles or classes unless explicitly requested in a later design revision.

### 4.3 Nodes produce, ships control

Ships do not produce.

Ships control nodes.
Nodes produce.

A faction receives production from a productive celestial body when it controls that body. Control requires at least one friendly ship in orbit unless a later contested-control rule is explicitly defined.

Additional ships in orbit do not stack production.

A productive node has exactly one production role:

- Tritium node: produces tritium
- Factory node: produces ship production progress

A non-productive node has no production structure. It may still matter because of position, orbit, missile geometry, travel timing or future scenario logic, but it is not a separate formal tactical category in v1.

### 4.4 Defeat is loss of recoverable mobility

A faction is eliminated when it has no realistic way to regain access to tritium extraction and therefore no way to restore useful movement.

Defeat is not simply:

- all ships destroyed
- capital captured
- hit points depleted

Defeat is:

- no controlled tritium node
- insufficient tritium to reach or contest any tritium node
- no viable recovery path through movement or remaining ships

The UI must explain this clearly. If the game declares a faction dead, the player must understand why.

---

## 5. Fixed map content

The vanilla alpha map is always the Solar System.

Do not present a small or incomplete system map as the default game identity. The map may support future additions such as asteroids, minor bodies or modded nodes, but the vanilla strategic frame is the Solar System.

### 5.1 Celestial hierarchy

The alpha Solar System contains 15 bodies:

Sole

- Mercurio
- Venere
- Terra
  - Luna
- Marte
- Giove
  - Ganimede
  - Callisto
  - Europa
- Saturno
  - Titano
  - Encelado
- Urano
- Nettuno
  - Tritone

### 5.2 Production roles

Factory nodes:

- Mercurio
- Venere
- Marte
- Ganimede
- Callisto

Tritium nodes:

- Giove
- Saturno
- Urano
- Nettuno
- Titano

Non-productive nodes:

- Terra
- Luna
- Europa
- Encelado
- Tritone

### 5.3 Fictional justification

Tritium nodes represent access to giant-planet-system tritium extraction. The primary fiction is that tritium is extracted from giant planets and their associated industrial systems. Titan remains a tritium node because it represents the Saturn system's accessible tritium logistics and extraction infrastructure, not necessarily literal surface mining of Titan itself.

Factory nodes represent access to minerals and industrial conditions suitable for ship construction. The gameplay does not track minerals as a resource. Mineral extraction is abstracted into factory node ownership and ship production time.

Non-productive nodes have no tritium extraction infrastructure and no ship production infrastructure in the vanilla game. They may matter for orbit geometry, staging, missile timing, neutrality, protected zones, or future content, but they do not produce anything.

Terra and Luna are politically protected and off-limits for corporate warfare. They remain visible because the game is set in the actual Solar System, but they are not normal production nodes.

Tritone is non-productive in the alpha map.

Europa and Encelado are non-productive in the alpha map. Do not add a separate tactical body category in data unless the technical architecture wants a generic tag system for future expansion.

---

## 6. Economy model

The vanilla economy has one spendable resource:

- Tritium

There are no credits.
There is no money resource.
There are no minerals as player-managed resources.
There is no population.
There is no food.
There is no maintenance currency.
There is no tech resource.

### 6.1 Tritium

Tritium is:

- the strategic reason for the war
- the fuel basis of interplanetary military operations
- the global delta-v pool
- the only resource the player spends

Tritium is spent to move and evade.

Exact costs are not fixed in this document. They must be external tunable parameters.

### 6.2 Factory production

Factory nodes produce ships through time, not through spending tritium.

A factory controlled by a faction accumulates ship production progress. When progress reaches the configured threshold, a new ship is deployed in orbit of that factory node or through whatever deployment rule is later chosen.

The exact number of turns required to produce a ship is not fixed in this document. It must be an external tunable parameter.

### 6.3 No stacking

Multiple friendly ships around the same productive node do not multiply production.

One ship is enough to establish control and trigger node production.

Additional ships can matter for defense, denial, threat, missile pressure, staging or redundancy, but not for production output.

---

## 7. Faction model

Factions are mechanically equivalent in the first version.

Do not add faction bonuses.
Do not add unique abilities.
Do not add unique ships.
Do not add unique weapons.
Do not add faction tech trees.

Faction differences come from match setup and readability:

- starting positions
- initial ship count
- initial tritium
- color
- name
- logo or symbol
- optional visual ship identity
- optional UI accent

The number of factions is a match setup parameter, not fixed lore. The MVP may use two factions for testing, but the system should not assume that two is the only possible match configuration.

### 7.1 Faction identity purpose

Faction identity exists to improve at-a-glance readability.

A player should immediately understand:

- which ships belong to which faction
- which nodes are controlled by which faction
- which missiles are incoming from whom
- which faction is close to losing mobility

Visual identity is allowed. Mechanical asymmetry is not allowed in v1.

### 7.2 Naming direction

Corporations should not sound like generic sci-fi mining companies.

Avoid suffixes such as:

- Industries
- Logistics
- Dynamics
- Aerospace
- Mining
- Strategic Systems
- Resource Group
- Interplanetary Holdings

The inspiration is post-Silicon-Valley tech oligarchs that grew out of AI, data, compute, platforms, automation, energy and tritium-powered infrastructure.

Names should feel short, brandable and slightly abstract, closer in naming logic to Meta, Tesla, Amazon, Google, OpenAI, Nvidia, Palantir, Anthropic or xAI than to fictional industrial conglomerates.

The player may rename factions.

A procedural name generator is acceptable, but it must follow this naming direction.

Acceptable name style examples:

- Vanta
- Loom
- Tensor
- Arc
- Grid
- Kora
- Halo
- Morrow
- Vale
- Nova if not overused

Bad name style examples:

- Asterion Resource Group
- Helion Dynamics
- Meridian Fusion Logistics
- Vesta Strategic Systems
- Outer Planet Mining Corporation

---

## 8. Ship model

A ship is a ship.

Every ship has the same base capabilities.

The first version must not include ship specialization.

### 8.1 Ship capabilities

A ship can:

- occupy orbit around a celestial body
- receive movement orders
- spend global tritium through its faction
- control nodes
- launch missiles
- perform evasion burns
- be destroyed by one hit

### 8.2 Ship destruction

A ship hit by a missile is destroyed.

There are no hit points.
There is no armor value.
There is no damage roll.
There is no percentage chance to survive.

### 8.3 Ship value

Ships should feel scarce and expensive even if they do not cost a spendable resource.

A ship represents:

- time spent producing it
- position
- node control
- future access
- threat projection
- recovery potential

Losing a ship should hurt because it removes control and future options, not because it subtracts hit points.

---

## 9. Weapon model

The first version has one weapon type:

- Missiles

Do not add railguns in v1.
Do not add lasers in v1.
Do not add drones in v1 unless explicitly requested later.
Do not add weapon classes in v1.

Missiles may be nuclear in fiction.

This is why corporate war is forbidden near Earth and Luna.

### 9.1 Missile combat intent

Missile combat is not damage trading.

Missile combat is about:

- forcing evasion burns
- spending enemy tritium
- denying node control
- destroying ships that cannot or do not evade
- making the opponent lose recoverable mobility

### 9.2 Evasion burn

The defensive answer to incoming missiles is an evasion burn.

An evasion burn is a local maneuver that changes the intercept geometry enough to defeat the incoming volley.

The ship does not need to leave orbit of the current celestial body to evade.

Evasion costs global tritium.

If the faction cannot or chooses not to spend the required tritium, the missile can hit and destroy the ship.

Right-clicking or otherwise selecting incoming missiles should eventually allow the player to issue an evasion command, but exact UI input belongs to the technical document.

### 9.3 Why missiles, not railguns

Missiles and autonomous kinetic/nuclear interceptors are the first weapon model because they fit better with orbital interception, warning windows, evasion burns and strategic delta-v expenditure.

Railguns are visually appealing but risk pushing the game toward a less plausible and less strategically clean model for the first version. They may be reconsidered only after the missile model is proven.

---

## 10. Defeat and victory

The primary elimination concept is loss of recoverable mobility.

A faction is eliminated when it cannot plausibly restore tritium access.

The implementation must be careful and explainable.

The game should not simply hide the logic. It must show why a faction is unrecoverable.

Possible explanation elements:

- no controlled tritium nodes
- no available tritium reserve
- no ship can reach a tritium node
- no ship can contest a tritium node
- no factory path can restore mobility in time

All final thresholds and formal detection rules must be validated through simulation and testing. Do not hardcode a vague defeat check without explainability.

---

## 11. World premise

The world is near-future hard sci-fi.

The Earth economy is powered by AI and tritium.

Tritium is vital for:

- high-performance interplanetary propulsion
- commercially meaningful travel times
- military projection beyond the Moon
- huge AI server infrastructure on Earth
- clean high-density energy systems

Nation states still exist.

Major terrestrial blocs include, at minimum as worldbuilding references:

- United States of America
- United States of Europe
- Asian Conglomerate

These blocs retain the monopoly of force on Earth, in Earth orbit and around the Moon.

Corporate warfare on Earth would be unacceptable. A private corporate battle on Earth would trigger immediate state crackdown.

Corporate warfare near Earth or the Moon would risk:

- debris falling toward Earth
- nuclear escalation
- atmospheric consequences
- damage to civilian infrastructure
- state-level conflict

Therefore Earth orbit and lunar orbit are off-limits to corporate war.

Beyond lunar enforcement range, states lack the economic, military and technological power to police the whole Solar System.

Corporations operate independently through:

- private fleets
- contractors
- security forces
- intelligence networks
- deniable operations
- resource protection forces

The war is known on Earth, but information is filtered. Telescopes can observe large movements and detonations, but operational detail is controlled by corporations. There are no embedded journalists in the meaningful military sense.

Corporations do not use bombastic military propaganda. They maintain a sober, understated public tone that acknowledges and downplays the reality of interplanetary conflict.

---

## 12. Tone

Tone keywords:

- cold
- technical
- industrial
- corporate
- understated
- plausible
- expensive
- deniable
- orbital
- strategic
- unforgiving

Avoid:

- heroic military melodrama
- fantasy empires
- aliens
- space magic
- romantic dogfighting
- colorful arcade laser battles
- comic relief tone
- goofy faction names
- conventional 4X empire fantasy

The game should feel like an operational interface for a real corporate war that everyone knows exists but no one officially describes honestly.

---

## 13. Information hierarchy and UI feel

The player must always understand:

- where their ships are
- who controls each productive node
- how much tritium each faction has if visible
- which nodes are tritium nodes
- which nodes are factory nodes
- which nodes are non-productive
- where missiles are going
- which ships are threatened
- what an evasion burn costs
- what movement costs
- when a transfer arrives
- why a faction is close to elimination

### 13.1 Zoom-dependent map identity

The map should change meaning with zoom.

Zoomed in:

- more physical
- more orbital
- more Kerbal and Children of a Dead Earth
- trajectories, bodies, orbits, missiles and local geometry matter

Zoomed out:

- more strategic
- more abstract
- closer to Endless Space 2 or Stellaris map readability
- ownership, production, threat and mobility state matter

Do not let visual beauty reduce tactical readability.

### 13.2 Preview before commitment

Before important player commands, the UI should eventually show deterministic previews:

- tritium cost
- ETA
- current node effect
- missile threat if known
- evasion cost if relevant
- likely loss of control if moving away
- projected consequence of confirmation

The player should blame themselves for a loss, not hidden rules.

---

## 14. MDA framing for Codex

Use this section to understand why simple mechanics matter.

### 14.1 Mechanics

- global tritium pool
- node control
- factory production over time
- one ship type
- one missile weapon
- evasion burns
- one-hit destruction
- orbital turn timing
- elimination through loss of recoverable mobility

### 14.2 Dynamics

- players contest tritium nodes to maintain mobility
- factory nodes matter only if the faction can still move meaningfully
- missile threats force evasion and drain tritium
- ships become valuable because they control nodes and create options
- overextension can strand a faction without recovery
- a faction can lose before every ship is destroyed

### 14.3 Aesthetics

The intended emotional effects are:

- cold pressure
- strategic dread
- satisfaction from foresight
- fear of wasting mobility
- orbital inevitability
- expensive loss
- clarity after defeat
- mastery through understanding

Example chain:

Mechanic: incoming missile plus evasion burn cost

Dynamic: the player can save the ship, but doing so may spend the tritium needed to reach a tritium node later

Aesthetic: the player feels that surviving now may consume their future

---

## 15. Tutorial direction

The tutorial should eventually be contextual during the first real game, not a separate tutorial campaign.

However, the game should track tutorial-relevant events from the beginning:

- first ship selected
- first tritium node inspected
- first factory node inspected
- first movement preview
- first transfer confirmed
- first missile launched
- first incoming missile
- first evasion burn
- first node lost
- first ship destroyed
- first near-elimination state

The tutorial content can be written later, but these hooks should exist so onboarding can be layered onto the real game.

Do not create special tutorial-only rules unless explicitly requested.

---

## 16. First 10 minutes target

The first 10 minutes should teach the game through play, not exposition.

Ideal early sequence:

1. The player sees the Solar System map.
2. Productive nodes are visually distinguishable from non-productive nodes.
3. The player selects a ship.
4. The player sees global tritium.
5. The player previews a transfer.
6. The player sees cost and ETA before confirming.
7. The player understands that leaving a node may lose control.
8. The player sees a missile warning.
9. The player performs or refuses an evasion burn.
10. The player understands that tritium depletion can kill a faction even with ships alive.

This does not need to be fully implemented in the first coding milestone, but the game should be built toward this experience.

---

## 17. Parameters that must remain tunable

Do not hardcode final balance values.

The following must live in external data/config files:

- tritium production per node
- ship production time per factory
- starting tritium
- starting ship count
- starting positions
- movement cost formula parameters
- evasion burn cost formula parameters
- missile ETA parameters
- missile range if any
- AI aggression values
- faction setup presets
- defeat detection thresholds if any
- pacing presets

These values must be tuned through testing and simulation.

The content bible defines principles, not final numbers.

---

## 18. Things not to add in v1

Do not add:

- ship classes
- hit points
- armor
- multiple weapons
- railguns
- lasers
- drones unless explicitly requested later
- crew management
- commanders or heroes
- experience levels
- tech trees
- diplomacy systems
- trade routes
- colonization systems
- population management
- money
- minerals as a managed player resource
- multiple fuel types
- espionage minigames
- aliens
- interstellar travel
- story campaign
- special faction abilities
- asymmetric faction mechanics
- logistics simulation for tritium transport
- stacking production by multiple ships
- random hit chances
- hidden dice rolls

If Codex thinks one of these would make the game more fun, it must not implement it. It can only mention it as a future idea outside the code.

---

## 19. Agent implementation guidance

When Codex generates content, data schemas, config placeholders or UI copy, it must follow these rules.

### 19.1 Prefer explicit invariants

Good:

- nodeProductionType: tritium, factory, none
- shipClass: omitted because all ships are identical
- weaponType: missile only
- factionAbilities: omitted

Bad:

- adding class fields just in case
- adding armor fields just in case
- adding energy, minerals or credits just in case
- adding special faction bonuses just in case

### 19.2 Use placeholders honestly

If a value needs testing, mark it as tunable.

Do not imply a number is final.

Example:

- tritiumProductionBase: tunable placeholder
- shipProductionTurns: tunable placeholder
- evasionBurnCostMultiplier: tunable placeholder

### 19.3 Preserve minimalism

When unsure, choose the simpler system that preserves:

- one resource
- one ship type
- one weapon type
- node control
- deterministic outcomes
- explainable defeat

### 19.4 Separate lore flavor from mechanics

A factory node can be explained as mineral extraction and orbital construction infrastructure.

Do not create a minerals resource.

A corporation can have a logo, color and name.

Do not create faction bonuses.

Tritium can be transported easily in fiction.

Do not create a tritium logistics network.

### 19.5 No generic space-game filler

Codex must not add generic sci-fi content such as:

- plasma cannons
- shield generators
- starbases with upgrades
- admirals
- alien ruins
- hyperspace lanes
- empire morale
- rare crystals
- piracy systems

DeltaV is not that game.

---

## 20. Example UI and event-log tone

Tone should be precise, understated and operational.

Good examples:

- Tritium reserve insufficient for recovery burn.
- Incoming missile volley. Evasion burn available.
- Evasion burn confirmed. Tritium reserve reduced.
- Factory node controlled. Ship production progressing.
- Tritium node lost. Mobility recovery risk increased.
- Faction unrecoverable: no tritium access and no viable burn path.

Bad examples:

- Our brave pilots are under attack!
- The enemy empire has unleashed a devastating superweapon!
- Critical hit! Massive damage!
- Your heroic fleet has conquered the stars!
- Plasma shield overloaded!

The UI voice should sound like a military-industrial operations system, not a dramatic narrator.

---

## 21. Content acceptance checklist for Codex

Before creating or modifying DeltaV game content, Codex should check:

- Does this preserve one resource?
- Does this preserve one ship type?
- Does this preserve one weapon type for v1?
- Does this preserve node-based production?
- Does this avoid production stacking?
- Does this keep factions mechanically equivalent?
- Does this avoid generic sci-fi naming?
- Does this keep Earth and Moon politically protected?
- Does this explain tritium as both fuel and strategic economic resource?
- Does this keep defeat tied to recoverable mobility?
- Does this make losses readable?
- Does this avoid adding final balance numbers without marking them tunable?

If the answer is no, do not implement the content.

---

## 22. Canonical summary

DeltaV is a deterministic hard-sci-fi orbital strategy game.

The map is the Solar System.

The war is fought by post-Silicon-Valley corporate powers beyond the Moon.

States still control Earth and lunar space, but cannot enforce order across the outer Solar System.

Tritium powers interplanetary engines and the AI economy. It is compact enough to be globally abstracted as operational delta-v.

The game has one spendable resource: tritium.

Ships are identical.

Ships do not produce.

Ships control nodes.

Nodes produce.

Factory nodes produce ship progress.

Tritium nodes produce tritium.

Non-productive nodes produce nothing.

Additional ships do not stack production.

The first weapon is the missile.

Missiles force evasion burns or destroy ships.

A ship hit by a missile dies.

A faction dies when it loses recoverable access to tritium.

The game must be cold, technical, readable, minimal, deterministic and strategically cruel.

