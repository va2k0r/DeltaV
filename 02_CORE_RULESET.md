# DeltaV / AV Core Ruleset v10

Gameplay rules only. Visual presentation is defined in separate files.

## 1. Game structure

DeltaV is deterministic, turn-based and simultaneously planned.

```text
Planning Phase
Resolution Phase
Economy Phase
Next Planning Phase
```

```text
1 turn = 1 abstract operational day
```

## 2. Factions and dV

dV/tritium is global per faction, not per ship.

The dV reserve of all factions is public and always visible.

dV is spent on:

- Burn;
- Evade;
- contested upkeep;
- other future rules only if explicitly added.

Fire costs 0 dV.

Shipyard production has no dV cost, but the produced ship must launch out of the shipyard.

Baseline:

```text
Starting dV: 10 per faction
```

## 3. Node types

### Tritium node

Produces dV if occupied by an available ship at Economy Phase and not contested.

Baseline:

```text
Tritium Work: +2 dV
```

### Shipyard node

Advances ship production if occupied by an available ship at Economy Phase and not contested.

Baseline:

```text
Shipyard Work: 4 Work turns to produce 1 ship
```

Shipyard progress is stored on the node and can be stolen.

### Barren / staging node

Operational but non-productive.

Barren nodes can be occupied, contested, transferred to, fired from, evaded from, and used as support positions. They cannot Work.

### Protected node

Earth and Moon are protected/transit nodes by default.

They cannot be owned, contested, fired from, fired upon, worked, or used as shipyards.

## 4. Node capacity

Normal node capacity:

```text
A non-contested node may contain 1 ship.
```

Contested capacity:

```text
A contested node may contain exactly 2 ships from opposing factions.
A third ship cannot enter a contested node.
```

If a ship attempts to arrive at an occupied node and cannot legally enter, it stops at T-1 outside the node.

T-1 holding state:

- targetable;
- can Evade;
- may Fire only into the node it is approaching or against ships contesting/defending that node, unless later range rules permit more.

Enemy simultaneous arrival to an empty node creates contested.

Allied simultaneous arrival should be rejected in planning; fallback is one ship enters and the other is held at T-1.

## 5. Turn resolution order

Canonical order:

```text
1. Contested upkeep
2. Missile impact + automatic/preventive Evade
3. Ship arrivals
4. Actions: Fire and Burn declarations resolve under action rules
5. Economy:
   a. Tritium income
   b. Shipyard progress/completion
   c. Mandatory launch of produced ships
```

Specific timing rule:

```text
Missile impacts resolve before same-turn ship arrivals.
A ship arriving on the same turn as a missile impact cannot prevent the target from Evading that missile.
To deny Evade through contested, the target must already be contested before the missile impact phase begins.
```

## 6. Active actions

Each ship may perform one active action per turn:

```text
BURN
FIRE
EVADE
```

WORK is not manually selected. It is automatically resolved for available ships on productive nodes.

A ship that Fired or Evaded does not Work.

A ship that Burned may Work only if it arrives at a productive destination in time and is otherwise available.

## 7. Burn

BURN changes trajectory.

Burn is used to:

- start a transfer;
- change direction while drifting;
- leave contested.

```text
Burn cost = route cost + origin gravity well modifier
```

There is no separate arrival gravity cost.

Local ship transfer minimum:

```text
Minimum ship travel time: 1 turn
```

Longer transfers vary by route, gravity, and orbital alignment.

## 8. Drift

A drifting ship is already on a transfer trajectory.

A drifting ship may:

- Fire;
- Evade;
- Burn again to change direction.

If a drifting ship Evades, it continues its current trajectory unless a future balance patch adds delay.

## 9. Fire and missiles

Fire costs 0 dV and consumes the ship's active action for the turn.

A salvo is a missile solution.

Multiple ships may Fire at the same target ship.

A single Evade by the target cancels all active missile solutions targeting that ship.

A ship cannot Fire if it:

- has already Burned or Evaded this turn;
- is contested;
- is on a protected node.

Missile minimum travel time:

```text
Minimum missile travel time: 2 turns
```

Missile travel should generally be at least 1 turn longer than the fastest local ship transfer for the same route.

If a missile solution hits and the target does not/cannot Evade, the target ship is destroyed.

Fire is a future tax, not an immediate disable.

```text
Fire = future Evade cost / Work denial / dV pressure
```

## 10. Evade

Evade cost:

```text
2 + number_of_active_missile_solutions_targeting_that_ship
```

Evade cancels all active missile solutions targeting the ship.

Evade is the default defensive response in UI.

If missiles impact and the faction can pay:

```text
ship automatically Evades
all missiles targeting that ship are cancelled
ship does not Work that turn
```

If the faction cannot pay, the ship cannot Evade and is destroyed by the impact.

Preventive Evade is legal:

```text
A ship may Evade active incoming missiles before impact, cancelling them early, but losing Work/action for that turn.
```

A ship cannot Evade if contested or on a protected node.

## 11. Contested

A node becomes contested when ships from opposing factions legally occupy the same node.

Contested upkeep:

```text
2 dV per contested ship/faction
```

Upkeep is paid at the start of turn resolution.

If a faction cannot pay contested upkeep, the contested ship is lost.

A contested ship cannot:

- Fire;
- Evade;
- Work;
- perform any action other than Stay or Burn out.

A contested ship may:

- Stay, paying upkeep and remaining contested;
- Burn out, paying upkeep first and then Burn/transfer cost.

If one ship Burns out and the other remains, the remaining ship may Work at Economy Phase if the node is productive and no longer contested.

Contested is strategically asymmetric when one faction has support nearby.

```text
A contested ship holds the target in place.
External support decides whether staying is safe.
```

## 12. Work

WORK resolves automatically in Economy Phase.

A ship Works if:

- it ends resolution on a Tritium or Shipyard node;
- the node is not contested;
- the ship is available under action-state rules.

A ship that Fired or Evaded does not Work.

A ship that Burned may Work only at destination if it arrived legally in time.

A ship on Barren cannot Work.

A ship on Protected cannot Work.

A contested ship cannot Work.

## 13. Tritium production

Baseline:

```text
Each worked tritium node produces +2 dV per turn.
```

Tritium production per turn is capped by the number of tritium nodes and available workers. This limits pure economic growth.

Current v10 map has 4 tritium nodes:

```text
Jupiter
Saturn
Uranus
Neptune
```

Maximum global tritium production if all are worked:

```text
4 nodes × 2 dV = 8 dV per turn across the map
```

## 14. Shipyard production

Shipyard production has no dV cost.

Baseline:

```text
4 WORK turns to build one ship
```

Shipyard progress is node-based and stealable.

Progress:

- persists if the worker leaves;
- persists if the worker Fires/Burns/Evades;
- persists if the node becomes contested;
- advances only with a valid worker;
- resets when a ship is completed.

When a ship is completed, the produced ship must Burn out of the shipyard during the Mandatory Launch step.

If it cannot pay or execute a legal Burn, the produced ship is destroyed.

## 15. Gravity well

Gravity well applies only to Burn from the origin node.

There is no arrival gravity cost.

Suggested v10 gravity:

```text
Rocky shipyard planets: +1
Gas giants Jupiter/Saturn: +3
Ice giants Uranus/Neptune: +2
Titan: +1
Pluto/Charon: +2
Barren moons: 0 unless specified
Triton: +1
```

## 16. Victory and elimination

Win condition:

```text
A faction wins when it is the only faction with a viable path to tritium production.
```

A faction is tritium-viable if it can produce, contest, or realistically restore access to tritium using current ships, dV, transfer windows, or imminent shipyard output.

Prototype check:

```text
At end of round, if only one faction is tritium-viable, that faction wins.
```
