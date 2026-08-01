# DeltaV Minimal Rules Summary v10

## Current baseline

```text
Starting dV: 10 per faction
Global dV reserve per faction
Tritium node Work: +2 dV
Shipyard: produces 1 ship every 4 Work turns
Shipyard progress is node-based and stealable
Ship production cost: 0 dV
Produced ship must Burn out or is destroyed
Fire cost: 0 dV
Minimum missile travel: 2 turns
Minimum local ship travel: 1 turn
Evade: 2 + active missile solutions
Evade cancels all missiles targeting that ship
Contested upkeep: 2 dV
```

## Turn order

```text
1. Contested upkeep
2. Missile impact + automatic/preventive Evade
3. Ship arrivals
4. Actions
5. Economy:
   a. Tritium income
   b. Shipyard progress/completion
   c. Mandatory launch
```

## Key timing rule

```text
Missile impacts resolve before same-turn ship arrivals.
A ship arriving on the same turn as a missile impact cannot prevent the target from Evading.
To deny Evade through contested, the target must already be contested before missile impact phase begins.
```

## Map v10

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

## Map principles

```text
Use planets and moons only in baseline.
Do not activate all moons.
Every active moon must create a decision.
A planetary system may contain 0 or 1 active shipyard.
Gas/ice giants are tritium nodes.
Moons are tactical ground.
```

## Victory

```text
Win by becoming the only faction with a viable path to tritium production.
```
