# v10 Read First Note

This package has been updated to v10. Read `00_CURRENT_CANON.md` first. It overrides older v8/v9 notes when conflicts exist.

Key v10 changes: planets-and-moons-only map, gas giants as tritium nodes, 18 active-node baseline, tritium +2, shipyard 4 WORK, missile min 2, local ship travel min 1.

---

# DeltaV / AV Codex Package v8

This package is the current source of truth for implementing DeltaV / AV.

## Read order

1. `00_CURRENT_CANON.md`
2. `02_CORE_RULESET.md`
3. `12_MINIMAL_RULES_SUMMARY.md`
4. `10_DECISIONS_AND_OPEN_ISSUES.md`
5. `03_SOLAR_SYSTEM_CAMERA_AND_MAP.md`
6. `11_MAP_VISUAL_GRAMMAR.md`
7. `04_VISUAL_LANGUAGE_BIBLE.md`
8. `05_TECHNICAL_ARCHITECTURE.md`
9. `06_AUDIO_AND_MEDIA_BIBLE.md`
10. `07_ROADMAP_AND_MILESTONES.md`
11. `08_TESTING_AND_ACCEPTANCE.md`
12. `09_CODEX_PROMPT_MILESTONE_1.md`

## Conflict priority

If documents conflict:

1. `00_CURRENT_CANON.md` wins for all current design decisions.
2. `02_CORE_RULESET.md` wins for gameplay mechanics.
3. `12_MINIMAL_RULES_SUMMARY.md` wins as the short implementation summary.
4. `10_DECISIONS_AND_OPEN_ISSUES.md` wins for unresolved/TBD items.
5. `03_SOLAR_SYSTEM_CAMERA_AND_MAP.md` wins for camera/map presentation.
6. `11_MAP_VISUAL_GRAMMAR.md` wins for map visual grammar.
7. Older balance files are historical unless explicitly referenced by v8.

## Critical v8 corrections

- Map is TBD again. Do not treat v7 map/balance as final.
- Node types are Tritium, Shipyard, Barren and Neutral.
- Neutral = Earth/Moon only.
- Barren can do everything except Work; current draft gravity well 0.
- One active action per ship per turn: Burn, Fire or Evade.
- Work is automatic at end of turn, not a selected active action.
- Drift can Fire, Evade or Burn again.
- Evade during drift does not delay trajectory.
- Fire costs 0 dV and is one salvo per ship.
- Evade cost = 3 + active missile solutions targeting the ship.
- Contested ships cannot Fire, Evade or Work.
- Contested upkeep baseline is -4 dV, paid at start of turn; if unpaid, ship is lost.
- Gravity applies only to Burn from origin. No arrival gravity cost.
- Normal node capacity is 1 ship. Contested capacity is 2 opposing ships. Third ship cannot enter.
- Blocked arrivals stop at T-1 and can Fire/Evade.
- Shipyard progress persists. Completed ship must Burn out or be destroyed.
- Win condition is TBD: current direction is tritium death spiral elimination.

## Historical balance files

`13_BALANCE_V0.json`, `13_BALANCE_V0_REPORT.md` and `13_BALANCE_V0_ROUTE_TABLE.json` are historical v7 baseline artifacts.

They must not override v8 rules.

Use them only as references for previous simulation assumptions.

## Start point

Do not implement the whole game.

Start with Milestone 0 if the repository does not exist.

After Milestone 0, implement Milestone 1 exactly:

```text
Canonical 2D Simulation Plane + Spatial Map Foundation + Camera
```

Do not add unrequested systems.
