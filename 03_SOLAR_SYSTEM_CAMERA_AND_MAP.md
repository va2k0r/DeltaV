# DeltaV / AV Solar System, Camera and Map Specification v10

This file updates the older v5 map specification for the v10 planets-and-moons-only map.

## 1. Principle

```text
The map is a spatial presentation of a deterministic 2D orbital game state.
The planet is the gravity anchor. The moon is the tactical ground. The orbit is the war clock.
```

The player-facing map must feel like a living Solar System, not a flat board.

## 2. Active node rule

A node is an operational orbit around a real celestial body.

v10 baseline uses only:

- real planets;
- real moons;
- Earth/Moon as protected/transit exceptions.

v10 baseline does not use active asteroids, Trojans, or Kuiper objects.

## 3. Do not activate all moons

The Solar System has hundreds of moons and the count changes with new discoveries.

DeltaV should not add every moon as an active barren node.

Design rule:

```text
Every active moon must create a decision.
If a moon only gives another place to hide or run, it should be visual/background, not an active node.
```

Recommended active node count:

```text
18 nodes = clean baseline
20 nodes = rich but manageable
24 nodes = scenario upper limit
30+ nodes = likely too much for the core game
```

Inactive moons may still be shown visually, dimmed, unnamed at far zoom, or used as scale/beauty objects.

## 4. Planetary system shipyard rule

```text
Each planetary system may contain 0 or 1 active shipyard.
No planetary system may contain more than 1 active shipyard.
```

A system may have zero shipyards.

This prevents every gas giant system from becoming a complete self-contained province.

## 5. Gas giant tritium rule

```text
Gas/ice giants are tritium nodes.
```

In v10 baseline:

```text
Jupiter = Tritium
Saturn = Tritium
Uranus = Tritium
Neptune = Tritium
```

They produce:

```text
+2 dV per Work
```

They also have deep gravity wells:

```text
Jupiter: +3
Saturn: +3
Uranus: +2
Neptune: +2
```

Interpretation:

```text
Gas giants are rich fuel anchors, but they trap ships in expensive gravity wells.
```

## 6. Rocky planet and moon roles

Rocky planets may be:

- Shipyard;
- Barren / staging;
- Protected / transit if Earth/Moon.

Moons may be:

- Shipyard;
- Barren / staging.

Moons are tactical ground: support, Fire, Intercept, staging, contested pressure, and retreat.

## 7. Hybrid system constraint

If a gas/ice giant tritium system also contains a shipyard moon, it must be treated as a dangerous hotspot and compensated.

Compensations:

```text
shipyard WORK may be 5 instead of 4
tritium planet ↔ shipyard moon travel time should be at least 2 turns
the key barren/staging moon must be contestable from outside
higher gravity / worse exit costs may apply
```

v10 baseline intentionally has one hybrid system:

```text
Saturn = tritium
Titan = shipyard
Iapetus = barren/staging
```

If Saturn proves too strong, patch Titan first:

```text
Titan shipyard: 5 WORK
Saturn ↔ Titan: minimum 2 turns
```

## 8. Canon v10 baseline map: 18 active nodes

```text
PROTECTED
Earth
Moon

TRITIUM
Jupiter
Saturn
Uranus
Neptune

SHIPYARD
Mercury
Mars
Titan
Pluto/Charon

BARREN / STAGING
Venus
Deimos
Callisto
Iapetus
Oberon
Triton
Nix
Hydra
```

Counts:

```text
18 total nodes
2 protected
4 tritium
4 shipyard
8 barren/staging
```

This map intentionally has fewer productive nodes than earlier candidates. The point is to make tritium and shipyard access matter.

## 9. Optional 20-node advanced variant

Add two additional moons if the baseline feels too sparse:

```text
Io — hazardous barren / Jupiter system
Titania — shipyard or barren / Uranus system
```

If Titania is a shipyard:

```text
Uranus system becomes hybrid
Titania should use 5 WORK or Uranus ↔ Titania should be at least 2 turns
```

## 10. Node details

### Protected

```text
Earth
Type: protected / political center
Productive: no
Combat: no
```

```text
Moon
Type: protected / transit / tutorial staging
Productive: no
Combat: no by default
```

### Inner

```text
Mercury
Type: shipyard
Gravity: +1
Shipyard: 4 WORK
Role: fast exposed inner industry
```

```text
Venus
Type: barren / staging
Gravity: +1
Role: inner pressure node, not tritium in v10
```

```text
Mars
Type: shipyard
Gravity: +1
Shipyard: 4 WORK
Role: central-inner industry
```

```text
Deimos
Type: barren / staging
Gravity: 0
Role: Mars support and bridge toward Jupiter
```

### Jupiter

```text
Jupiter
Type: tritium
Gravity: +3
Yield: +2 dV
Role: rich fuel anchor without local shipyard
```

```text
Callisto
Type: barren / staging
Gravity: 0
Role: tactical moon controlling Jupiter access
```

### Saturn

```text
Saturn
Type: tritium
Gravity: +3
Yield: +2 dV
Role: central heavy fuel anchor
```

```text
Titan
Type: shipyard
Gravity: +1
Shipyard: 4 WORK baseline, 5 WORK if Saturn is too strong
Role: central/outer industry and major conflict driver
```

```text
Iapetus
Type: barren / staging
Gravity: 0
Role: key support moon for Saturn/Titan
```

### Uranus

```text
Uranus
Type: tritium
Gravity: +2
Yield: +2 dV
Role: outer fuel without local shipyard
```

```text
Oberon
Type: barren / staging
Gravity: 0
Role: bridge toward Saturn/Neptune
```

### Neptune

```text
Neptune
Type: tritium
Gravity: +2
Yield: +2 dV
Role: deep outer fuel without local shipyard
```

```text
Triton
Type: barren / staging
Gravity: +1
Role: tactical moon controlling access to Neptune
```

### Pluto

```text
Pluto/Charon
Type: shipyard
Gravity: +2
Shipyard: 4 WORK
Role: remote outer industry, fuel-hungry
```

```text
Nix
Type: barren / staging
Gravity: 0
Role: Pluto support moon
```

```text
Hydra
Type: barren / staging
Gravity: 0
Role: far outer staging / escape / intercept node
```

## 11. Suggested starting positions

Hard / more interesting setup: nobody starts directly on tritium.

```text
Player A — Inner Industrial
Mercury — shipyard
Venus — barren
Deimos — barren

Player B — Central Pressure
Titan — shipyard
Callisto — barren
Iapetus — barren

Player C — Outer Industrial
Pluto/Charon — shipyard
Triton — barren
Nix — barren
```

This makes early turns a race for fuel.

Standard / easier setup:

```text
Player A
Mercury — shipyard
Venus — barren
Jupiter — tritium

Player B
Titan — shipyard
Iapetus — barren
Saturn — tritium

Player C
Pluto/Charon — shipyard
Triton — barren
Neptune — tritium
```

Use the hard setup for balance exploration. Use the standard setup if the opening is too punishing.

## 12. Local travel guidelines

```text
Minimum ship travel: 1 turn
Minimum missile travel: 2 turns
```

Missile impacts resolve before same-turn ship arrivals.

Suggested local links:

```text
Mars ↔ Deimos: 1 turn
Jupiter ↔ Callisto: 1 turn
Saturn ↔ Iapetus: 1 turn
Saturn ↔ Titan: 2 turns if Titan becomes too strong
Uranus ↔ Oberon: 1 turn
Neptune ↔ Triton: 1 turn
Pluto/Charon ↔ Nix: 1 turn
Nix ↔ Hydra: 1 turn
```

Inter-system travel varies by orbital phase.

## 13. Orbital rotation

Bodies move along deterministic orbital rails. Initial phase is seed-driven.

Orbital phase affects:

- dV cost;
- transfer duration;
- attack windows;
- outer/inner access timing.

It must be previewable.

The UI should show at least:

```text
cost now
travel time now
near-future route change / upcoming window
```

Orbital movement should make openings vary without turning the game into hidden chaos.

## 14. Important strategic windows

The map should generate windows around:

```text
Deimos ↔ Callisto/Jupiter
Callisto ↔ Iapetus/Saturn
Iapetus ↔ Oberon/Uranus
Oberon ↔ Triton/Neptune
Triton ↔ Pluto/Charon
```

## 15. Expected play patterns

```text
Inner player has industry but must reach fuel.
Outer player has Pluto/Charon shipyard but must reach Neptune/Uranus/Saturn fuel.
Jupiter is a rich but shipyard-less fuel anchor.
Saturn is the main hybrid hotspot.
Uranus and Neptune are fuel systems without local shipyards.
Moons decide Fire, Intercept, staging, and contested support.
```

## 16. Camera and visual hierarchy

Keep previous camera canon:

```text
Left click: select command objects
Right mouse hold + drag: pan across orbital plane
Mouse wheel: zoom toward cursor
Double click object: focus camera
F: fit system / overview
Space: focus selected
Esc: clear selection / exit focus
```

Command objects are nodes and ships, not raw bodies.

Node type should not be encoded primarily by color.

Use behavior:

```text
tritium: subtle extraction flow / gas giant fluid movement
shipyard: sparse infrastructure lights / progress ring
barren: quiet orbital rail / staging markers
protected: neutral low-emphasis route styling
```
