# DeltaV / AV Balance Status v8

This file supersedes the v7 `13_BALANCE_V0*` files for current implementation planning.

## Canon gameplay values

```text
Fire cost: 0 dV
Evade cost: 3 + active missile solutions targeting the ship
Contested upkeep baseline: -4 dV
Contested upkeep timing: start of turn
Failure to pay contested upkeep: ship lost
Shipyard production cost: no dV cost
Shipyard progress: persistent
Gravity: applies to Burn from origin only
Arrival gravity cost: none
```

## Tested but not final values

```text
Tritium yield candidate: +5 dV per Work
Shipyard build time candidate: 3 WORK turns
Barren gravity candidate: 0
```

These values should be validated again with the final map, node capacity, blocked-arrival and death-spiral rules.

## Map status

Map is TBD.

Latest tested candidate:

```text
TRITIUM
Venus
Jupiter
Saturn
Uranus
Neptune
Europa
Enceladus

SHIPYARD
Mercury
Mars
Callisto
Titan
Triton

NEUTRAL
Earth
Moon

REMOVED / NON-NODE
Ganymede
```

Do not treat this map as locked.

## Required next simulations

1. Map candidate with v8 capacity rules.
2. Barren/staging nodes near high-contest systems.
3. Blocked arrival to T-1 behavior.
5. Evade formula `3 + missile solutions`.
6. Death-spiral elimination scoring/reachability.
7. Balanced starting setups for 2P, 3P and 4P.
