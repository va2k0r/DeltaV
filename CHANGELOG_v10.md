# DeltaV Changelog v10

## Major updates from v8/v9 design discussion

- Replaced earlier mixed asteroid/Trojan/Kuiper map candidates with a planets-and-moons-only baseline.
- Gas/ice giants are now tritium nodes by map principle.
- Active baseline map is 18 nodes, not all moons.
- Added rule: every active moon must create a decision; otherwise it remains visual/background.
- Added rule: each planetary system may contain 0 or 1 active shipyard; never more than 1.
- Fixed tritium yield: +2 dV per worked tritium node.
- Fixed shipyard production: 1 ship every 4 Work turns.
- Fixed Evade formula: 2 + active missile solutions.
- Fixed contested upkeep: 2 dV.
- Fixed minimum missile travel: 2 turns.
- Fixed minimum local ship travel: 1 turn.
- Added timing rule: missile impacts resolve before same-turn ship arrivals.
- Added UI rule: Evade is automatic/default when possible.
- Added preventive Evade rule.
- Confirmed shipyard progress is stealable and node-based.
- Added v10 map, balance JSON, and balance status.

## v10 baseline map

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

## Known open issues

- Test whether Saturn/Titan is too powerful as the only hybrid system.
- Test whether 4 shipyards are enough.
- Test hard start with no starting tritium vs standard start with starting tritium.
- Test whether Io/Titania should be added for a 20-node advanced map.
