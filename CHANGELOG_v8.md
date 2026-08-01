# Changelog v8

## Major gameplay changes

- Added formal node types: Tritium, Shipyard, Barren, Neutral.
- Set Neutral to Earth/Moon only.
- Added Barren as operational non-productive node type.
- Added one-node-one-ship capacity model.
- Added contested capacity: exactly two opposing ships.
- Third ship cannot enter contested.
- Ships blocked from entering occupied nodes stop at T-1 and remain targetable/active.
- Replaced older action language with active actions: Burn, Fire, Evade.
- Work is automatic at end of turn, not a selected active action.
- Drift can Fire, Evade or Burn again.
- Evade during drift does not delay trajectory.
- Fire remains 0 dV, one salvo per ship.
- Evade cost changed to 3 + active missile solutions targeting the ship.
- Contested ship cannot Fire, Evade or Work.
- Contested upkeep baseline: -4 dV at start of turn.
- Failure to pay contested upkeep destroys the ship.
- Gravity well applies only to Burn from origin; arrival cost removed.
- Shipyard progress persists; completed ship must Burn out or be destroyed.

## Map and balance

- Map moved back to TBD.
- Latest tested candidate recorded but not canonized.
- Gravity well table remains TBD.
- Tritium yield +5 and shipyard build time 3 remain tested baselines, not final lock.
- Starting setups and win condition remain open.

## Win condition

- Current direction: eliminate players when they enter a tritium death spiral.
- Exact implementation TBD.
