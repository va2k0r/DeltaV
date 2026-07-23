# DeltaV / AV Decisions and Open Issues v8

## Canon decisions as of v8

- Node types: Tritium, Shipyard, Barren, Neutral.
- Neutral = Earth/Moon only.
- Barren can do everything except Work; current draft gravity well 0.
- One active action per ship per turn: Burn, Fire or Evade.
- Work is automatic, not selected.
- A drifting ship can Fire, Evade or Burn again.
- Evade during drift does not delay trajectory.
- Fire costs 0 dV.
- One ship fires one salvo per turn.
- Multiple ships can Fire on the same target.
- Evade cost = 3 + number of active missile solutions targeting the ship.
- One Evade cancels all missile solutions targeting the ship.
- Missile hit destroys ship if not Evaded.
- Contested ships cannot Fire, Evade or Work.
- Contested upkeep baseline is -4 dV paid at start of turn.
- If contested upkeep cannot be paid, the ship is lost.
- Gravity applies to Burn out of origin node.
- No separate arrival/capture gravity cost.
- Intercept cancels transfer and creates contested until one side Burns out or dies.
- Normal node capacity: 1 ship.
- Contested capacity: 2 opposing ships.
- Third ship cannot enter contested.
- If a ship cannot enter a node because occupied, it stops at T-1 and can Fire or Evade.
- Enemy simultaneous arrival to empty node creates contested.
- Allied simultaneous arrival should be rejected in planning; fallback one enters, one T-1.
- Shipyard progress persists.
- Shipyard production requires a stationed available ship.
- Completed ship must Burn out or be destroyed.
- Earth/Moon: passable, neutral, weapons offline, non-contestable, non-productive.

## Open issues

### Map

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

Continue simulations from this candidate, but do not treat it as final.

### Gravity values

Gravity well table is TBD.

Known rule: gravity modifies Burn from origin only.

Question still open: should contested upkeep remain flat forever or include any gravity modifier? Current v8 baseline keeps it flat.

### Tritium yield

Current tested baseline: uniform +5 dV.

Still needs validation after map, capacity and barren/staging decisions.

### Shipyard build time

Current tested baseline: 3 WORK turns.

Needs validation with final map and starting setups.

### Starting setup

Need provisional balanced setups for:

- 2 players;
- 3 players;
- 4 players.

Setup requirements:

- no player should start with a clearly superior tritium+shipyard engine;
- each player needs plausible tritium access;
- each player needs plausible shipyard access;
- test with tryhard and archetype simulations.

### Win condition

Exact implementation TBD.

Design direction: elimination occurs when a player is trapped in a tritium death spiral and can no longer realistically produce dV.

Need to decide whether this uses:

- current active tritium production;
- reachability to future tritium;
- dV reserve threshold;
- turns without tritium;
- score/round cap fallback.

### Barren nodes

Barren nodes should not be filler.

They should only be used if they create one of these decisions:

- low-cost retreat from high-gravity contested node;
- staging near a contested hotspot;
- military pressure without economy;
- traffic/overflow relief under one-node-one-ship capacity.
