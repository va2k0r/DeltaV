# DeltaV deployed player playtest

- Date: 2026-07-30
- Target: https://va2k0r.github.io/DeltaV/?debug=1
- Deployed revision observed: `06e877a`
- Method: black-box interaction through the visible 3D UI; DOM, screen, command log, console warnings, and exported GameState are checked after meaningful actions.
- Policy: defects do not stop the run. Each defect or relevant edge case is recorded, its GameState is exported, and testing resumes from the closest recoverable state.

## Run summary

- Confirmed findings: `6` (`2` high, `3` medium, `1` low).
- Tested modes: tutorial, normal two-faction player-versus-AI, and normal three-faction match.
- Browser console at the end of the run: no warnings or errors.
- Every confirmed finding has a full exported GameState; visual findings also include screenshots.

## EDGE-001 — Tutorial silently restores ENEMY ΔV during mandatory launch

- Classification: rule/log inconsistency
- Severity: medium
- Status: confirmed on deployed build
- First visible at: command-console Turn 16 → Turn 17
- Saved GameState: `states/EDGE-001-enemy-dv-jump.json`
- Dump hash: `da4d666b`
- Dump state turn: `19` (the player-facing console displays Turn 20)

### Reproduction

1. Start the tutorial.
2. Complete the opening Moon → Venus and Venus → Mars burns.
3. Let Mars Shipyard reach 2/5.
4. FIRE from Mars at Deimos while the enemy is in transit.
5. Continue through EVADE and the return burn that contests Mars.
6. Disengage from Mars to Deimos, then burn Deimos → Saturn.
7. Let the enemy capture Mars production and reach the mandatory launch.
8. Inspect the faction ΔV rows and the mandatory launch burn.

### Observed

- The player-facing log shows ENEMY at `43 ΔV` before the mandatory launch.
- The mandatory launch burns Mars → Deimos for `-2 ΔV`.
- The following faction row shows ENEMY at `48 ΔV`, with no income or other positive ΔV event in the command log.
- The exported replay is more explicit: the Turn 16 burn begins with ENEMY at `50 ΔV` and ends at `48 ΔV`.
- The saved state contains no occupied Tritium node and reports `dvIncomeThisTurn: 0`.

### Expected

ENEMY should retain its shared faction reserve and pay the `-2 ΔV` burn cost. Starting from `43 ΔV`, the resulting reserve should be `41 ΔV`, unless the tutorial explicitly declares and logs a resource grant.

### Diagnostic evidence

- `summary.factionDv.opponent` is `48`.
- `summary.dvIncomeThisTurn` is `0`.
- Replay entry `replay-event:16:BURN_DEPARTED:Burn cost -2 ΔV:33` has:
  - start reserve: `opponent: 50`
  - end reserve: `opponent: 48`
- The recent debug-event sequence contains the mandatory launch and burn, but no Tritium income or other resource grant.

### Likely source

The tutorial helper `ensureTutorialOpponentFaction` tops up an already-present opponent with:

```ts
opponent: Math.max(getFactionDv(nextState, "opponent"), 50)
```

Because the helper is reused during tutorial phase transitions, it silently restores resources and makes the command log inconsistent with the shared-ΔV rule taught to the player.

## EDGE-002 — The mandatory replay cue is intercepted by glossary tokens

- Classification: tutorial interaction blocker / input conflict
- Severity: high
- Status: confirmed on deployed build
- First visible at: command-console Turn 34 after the first enemy ship is destroyed
- Saved GameState: `states/EDGE-002-signal-lost-replay-blocked.json`
- Dump hash: `49b213e4`
- Dump state turn: `33`
- Tutorial phase: `firstEnemyKillReplayCue`

### Reproduction

1. Continue the tutorial until Mars becomes contested.
2. FIRE from Saturn at Mars while the enemy ship cannot EVADE because the node is contested.
3. Advance through `SIGNAL LOST — CREW LOST at Mars`.
4. Follow the tutorial instruction: “Left click the blinking log line to rewind to that point in time.”
5. Click the visible blinking `SIGNAL LOST — CREW LOST at Mars` line.

### Observed

- Clicking visible words in the required line opens glossary panels such as `SIGNAL LOST`, `SHIPYARD`, or the numbered command-log token.
- Clicking the line through its exact visible text also opens the glossary instead of starting replay.
- Clicking the em dash or unused right-hand area of the row does not start replay.
- The tutorial remains input-locked in `firstEnemyKillReplayCue`.
- The GameState confirms `isReplayMode: false`, `inputLocked: true`, and identifies the intended event as `resolution:33:04:SHIP_DESTROYED:mars_node`.

### Expected

The required first click anywhere on the blinking cue row should rewind to the referenced event. A second click should resume, as the tutorial text promises. Glossary affordances must not make the mandatory tutorial action unreachable.

### Diagnostic evidence

- `runtime.isReplayMode` is `false` after repeated player-style clicks.
- `runtime.tutorial.phase` is `firstEnemyKillReplayCue`.
- `runtime.tutorial.inputLocked` is `true`.
- `runtime.tutorial.firstEnemyKillReplayEventId` is `resolution:33:04:SHIP_DESTROYED:mars_node`.
- The deployed UI removes the row's button semantics when glossary tokens are present, while glossary pointer handlers stop propagation for those tokens.

## EDGE-003 — Long command wraps the `ΔV` unit onto an orphan line

- Classification: visual layout defect
- Severity: low
- Status: confirmed on deployed build
- First visible at: normal match, command-console Turn 3
- Saved GameState: `states/EDGE-003-command-log-unit-wrap.json`
- Screenshot: `screens/EDGE-003-command-log-unit-wrap.png`
- Dump hash: `2724bc49`
- Dump state turn: `3`

### Reproduction

1. Start a normal two-faction game at the default 90-second timer.
2. Advance until the opponent issues `BURN Mercury → Callisto T+4 -3 ΔV`.
3. Inspect the command console at the normal deployed viewport (`1770 × 1239`).

### Observed

The long numbered command wraps immediately before the final `ΔV`. The unit is rendered alone at the left edge of the next visual line, between command `03` and command `04`, so it can be mistaken for a separate log entry.

### Expected

The cost and its unit should stay together (`-3 ΔV`). If the command must wrap, the continuation should remain visually attached and indented under the originating numbered command.

## EDGE-004 — Successful burn-away is reported as `CREW LOST`

- Classification: rule/log inconsistency
- Severity: high
- Status: confirmed on deployed build
- First visible at: normal match, Turn 4 resolution
- Saved GameState: `states/EDGE-004-destroyed-ship-burns.json`
- Screenshot: `screens/EDGE-004-destroyed-ship-burns.png`
- Dump hash: `711ea6b2`
- Dump state turn: `4`

### Reproduction

1. FIRE at a ship on Callisto.
2. Before the missile impact, order that target ship to BURN Callisto → Io.
3. Resolve the turn.

### Observed

- The command console prints `SIGNAL LOST — CREW LOST at Callisto`.
- The very next command executes `BURN Callisto → Io T+2 -2 ΔV`.
- No ship is destroyed: the GameState still reports three ships for each faction.
- The player ship is present in `activeBurnTransits` as `burn:player:callisto_node:io_node:T3`.
- The missile is correctly removed.
- The underlying resolution event is `MISSILE_SOLUTION_BROKEN`, whose diagnostic message says that burning away from Callisto broke the incoming missile solution.

### Expected

A successful burn-away should report that the missile lost its solution or target, not that the ship's crew was lost. `CREW LOST` should be reserved for actual ship destruction.

### Diagnostic evidence

- Resolution event: `resolution:4:01:MISSILE_SOLUTION_BROKEN:callisto_node`.
- `summary.shipsPerFaction`: player `3`, opponent `3`.
- `summary.missilesInFlight`: `0`.
- The formatter currently maps the normalized `SIGNAL_LOST` row to `SIGNAL LOST — CREW LOST` without distinguishing `MISSILE_SOLUTION_BROKEN` from destruction.

## EDGE-005 — Opening the game menu does not pause the planning timer

- Classification: timing / pause-state defect
- Severity: medium
- Status: confirmed on deployed build
- First visible at: normal match, player-facing Turn 6
- Saved GameState: `states/EDGE-005-menu-does-not-pause-timer.json`
- Screenshot after resume: `screens/EDGE-005-menu-does-not-pause-timer.png`
- Dump hash: `c5d239d6`
- Dump state turn: `5` (the player-facing console displays Turn 6)

### Reproduction

1. Start a normal two-faction game with the default 90-second planning timer.
2. During a planning turn, note the displayed countdown.
3. Press Escape to open the game menu.
4. Wait five seconds without interacting with the game.
5. Select `RESUME`.

### Observed

In a controlled measurement, the timer read `00:22` before opening the menu and `00:15` immediately after resuming five seconds later. The countdown continues while the player is inside the pause/options/debug menu and can force turn execution there.

### Expected

In a local player-versus-AI match, opening the game menu should pause the planning countdown, or the UI should explicitly warn that the match continues running behind the menu.

## EDGE-006 — Shipyard capture is displayed as two `WORK` actions

- Classification: rule/log ambiguity
- Severity: medium
- Status: confirmed on deployed build
- First visible at: normal match, Turn 6 resolution
- Saved GameState: `states/EDGE-006-shipyard-capture-shown-as-double-work.json`
- Screenshot: `screens/EDGE-006-shipyard-capture-shown-as-double-work.png`
- Dump hash: `8cd2a3b4`
- Dump state turn: `6`

### Reproduction

1. Accumulate `1/5` progress at Saturn Shipyard as the player.
2. Leave Saturn and allow one opponent ship to occupy it.
3. Let that single opponent ship work the captured shipyard on the following turn.

### Observed

- The command console prints two consecutive actions for the same ship and turn:
  - `WORK Saturn Shipyard 1/5`
  - `WORK Saturn Shipyard 2/5`
- The GameState confirms only one opponent ship at Saturn.
- The underlying debug events reveal that the first line is not work: it is `Saturn Shipyard progress captured from player by opponent`.
- The second event is the actual work that advances progress to `2/5`.

### Expected

The first line should be labeled as a capture or ownership transfer. Showing both events as `WORK` makes one ship appear to perform production twice in one turn and obscures the progress-capture rule.

## Verified paths without defects so far

- Tutorial Moon → Venus BURN, including preview, cost, transit, arrival, and first WORK.
- Venus → Mars BURN and Mars Shipyard progress.
- FIRE at the destination of an enemy transit.
- Enemy EVADE and its `-1 ΔV` cost.
- CONTESTED upkeep and player disengagement.
- Long transfer Deimos → Saturn and arrival at the support shipyard.
- Mandatory launch selection and execution.
- Supporting FIRE from Saturn into contested Mars.
- EVADE correctly blocked while the target node is CONTESTED.
- Ship destruction and `SIGNAL LOST` resolution.
- Normal two-faction game creation with the default 90-second planning timer.
- Normal-game BURN preview, projected faction cost, execution, transit, and Tritium income.
- FIRE against an arriving enemy ship and automatic EVADE with its `-1 ΔV` reaction cost.
- Multiple opponent orders in the same resolution and the resulting shared-reserve accounting.
- Burn-away correctly removes an incoming missile and preserves the escaping ship in simulation state.
- Planning timeout automatically resolves a turn with no submitted player order.
- Shipyard progress ownership transfers to the occupying faction and the saved progress continues from `1/5` to `2/5`.
- Three-faction setup, distinct faction reserves/colours, simultaneous AI orders, cross-faction BURN resolution, and per-faction income.

## Invalidated observation

An earlier apparent reset to the main menu occurred only on the local Vite URL while a source edit triggered hot reload. It did not reproduce on GitHub Pages and is not counted as a game defect.
