# DeltaV / AV — Balance Simulation Pass v0

Status: **simulation-derived baseline, not final shipped balance**.

Purpose: fix a first coherent numeric baseline starting from the v6 canon, rather than continuing with ad-hoc values.

## 1. Simulation assumptions

This pass keeps the current v6 map grammar:

- transfers are node-to-node;
- Earth and Moon are passable but demilitarized protected transit nodes;
- no transfer windows as player decisions;
- ship visual phase has no effect on transfer cost;
- contested dV is paid before other actions;
- ships in contested cannot Evade and cannot Fire external targets;
- multiple missiles may target the same ship;
- one Evade cancels all missiles aimed at that ship.

The simulation uses **gameplay-accelerated orbital periods**. Outer planets move much faster than reality so that the solar system geometry changes meaningfully over a 30–60 turn campaign window.

## 2. Current node assignment

```text
PROTECTED TRANSIT
Earth
Moon

SHIPYARD
Mars
Ganymede
Callisto
Titan
Triton

TRITIUM
Mercury
Venus
Jupiter
Europa
Saturn
Enceladus
Uranus
Neptune
```

## 3. Recommended numeric baseline v0

```text
Initial dV reserve per faction: 42
Contested cost: -4 dV per faction per contested node per turn
Evade cost: -8 dV
Missile fire cost: 0 dV
Missile countdown: T-3
Ship production cost: -30 dV
Ship production time: 4 turns
Prototype ship cap: 5 ships per faction
```

## 4. Tritium yield per turn

```text
Mercury   +4
Venus     +6
Jupiter   +7
Europa    +4
Saturn    +7
Enceladus +4
Uranus    +6
Neptune   +7
```

Reasoning:

- starting tritium income is close but not identical;
- Jupiter and Saturn are high-value anchors;
- small moons are useful but not sufficient by themselves;
- Mercury has a reason to exist without becoming central;
- Uranus/Neptune are high enough to justify outer-system risk.

Candidate starting economic positions:

```text
Faction A: Mars shipyard + Venus tritium = +6 / turn
Faction B: Ganymede shipyard + Jupiter tritium = +7 / turn
Faction C: Titan shipyard + Saturn tritium = +7 / turn
```

## 5. Transfer cost formula v0

```text
cost = round(2 + 0.68 * distance^0.92)
if long-haul route: cost *= 0.90
max cost = 45
```

Transfer duration:

```text
T+ = ceil(dV cost / 8)
min T+1
max T+5
```

This makes local moves cheap, mid-system commitments painful but common, and deep outer-system moves possible but expensive.

## 6. Route sanity table

Values below are averaged across 60 accelerated turns.

| Route | Avg dV | Range | Median time |
|---|---:|---:|---:|
| Earth → Moon | 2 | 2–2 | T+1 |
| Earth → Mars | 6.3 | 4–10 | T+1 |
| Venus → Mercury | 5.7 | 3–8 | T+1 |
| Mars → Venus | 8.7 | 5–11 | T+2 |
| Mars → Jupiter | 8.9 | 6–14 | T+1 |
| Mercury → Jupiter | 11.9 | 10–14 | T+2 |
| Jupiter → Europa | 3 | 3–3 | T+1 |
| Jupiter → Ganymede | 3 | 3–3 | T+1 |
| Jupiter → Saturn | 14.2 | 10–18 | T+2 |
| Ganymede → Saturn | 14.3 | 10–19 | T+2 |
| Mars → Titan | 15.8 | 10–20 | T+2 |
| Saturn → Titan | 3 | 3–3 | T+1 |
| Saturn → Neptune | 32 | 28–34 | T+4 |
| Titan → Triton | 32 | 27–35 | T+4 |
| Neptune → Triton | 3 | 3–3 | T+1 |

Global cost distribution across all node pairs and 60 turns:

```text
Median dV: 14
Mean dV: 15.8
Min dV: 2
Max dV: 35
```

## 7. Why these values fit the current map

### Inner system

Mercury and Venus are cheap enough to matter. Mercury as tritium is justified because it is not a dead node, but it does not overpower the map.

### Earth/Moon

Earth/Moon remain passable but sterile. They are not special routing shortcuts. Their value is mostly lore, transit and visual contrast. The `WEAPONS OFFLINE` rule is enough.

### Mars

Mars is the first true military-industrial node beyond the protected corridor. It is cheap enough to connect to Venus/Mercury and reasonably close to Jupiter.

### Jupiter cluster

Jupiter remains the natural strategic magnet because it combines high tritium with nearby shipyards. This is desirable, as long as it does not become the only meaningful battleground.

### Saturn cluster

Saturn/Titan create the second major front. Jupiter → Saturn at roughly 10–18 dV is expensive enough to hurt but common enough to keep the mid-game alive.

### Outer system

Neptune/Triton are expensive commitments. Their high value is necessary because otherwise the outer edge dies. T+4 deep transfers make the outer system feel strategically distant without making it unreachable.

## 8. Combat/evasion values

### Missile

```text
Missile fire cost: 0 dV
Countdown: T-3
```

Missiles are pressure tools. Their cost is not paid in dV; their counterplay is time, Evade and positioning.

### Evade

```text
Evade cost: -8 dV
One Evade cancels all missiles aimed at that ship.
Evade cannot be used while contested.
```

Why 8:

- it is roughly one strong tritium turn;
- it is close to a meaningful local transfer;
- it is expensive enough that missile salvos still matter;
- because it cancels all incoming missiles, it must not be too cheap.

### Contested

```text
Contested: -4 dV per faction per turn.
```

This makes contested expensive enough to matter without instantly forcing disengagement. If playtests show contested states last too long, escalation can be enabled later:

```text
Turn 1: -4
Turn 2: -6
Turn 3+: -8 cap
```

Escalation remains disabled in v0.

## 9. Ship production

```text
Ship cost: -30 dV
Build time: 4 turns
Prototype cap: 5 ships per faction
```

Why:

- with one major tritium node, a faction can build roughly every 4–5 turns if it avoids heavy maneuvering;
- with two tritium nodes, production becomes a real advantage;
- producing ships competes directly with transfers, contested costs and Evade.

## 10. Current warnings

These values are good enough for a first real prototype, but not final.

Watch in playtests/simulations:

1. Jupiter dominance.
2. Outer system deadness.
3. Whether T+4 deep transfers feel too slow.
4. Whether Evade at 8 dV is too punishing because it consumes a major economic beat.
5. Whether ship production at 30 dV / 4 turns creates enough new assets without flooding the map.
6. Whether contested at -4 stays tense or becomes a long stalemate.

## 11. One-line baseline

```text
Initial reserve 42; local moves 3–9 dV; mid moves 10–18 dV; deep moves 28–35 dV; contested -4; evade -8; ships cost 30 over 4 turns; missiles are T-3 pressure with 0 dV fire cost.
```
