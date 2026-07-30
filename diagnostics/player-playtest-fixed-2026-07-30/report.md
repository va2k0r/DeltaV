# Player playtest — fix verification and tutorial edge-case pass

Date: 2026-07-30
Build under test: local production build served by `vite preview` at
`http://127.0.0.1:4173/?debug=1`

The preview was built once before each pass and served without Vite hot reload, so source edits
could not reset or mutate the running game.

## Final result

All six findings from the previous deployed-build playtest are closed. The first post-fix pass
found two residual variants of the replay/timer defects; both were captured, fixed, rebuilt, and
retested in the same player-style workflow. No unresolved tutorial blocker, rules defect, or visual
regression remains from this pass.

## Previous findings

| Finding | Result | Player-style verification |
| --- | --- | --- |
| EDGE-001 — tutorial opponent ΔV silently reset to 50 | Fixed | The opponent entered at its actual current ΔV and continued from 48/45/41/39/37 instead of being topped up. |
| EDGE-002 — glossary intercepted the mandatory replay cue | Fixed | Click 1 on `SIGNAL LOST` opened context; click 2 on the different token `CREW LOST` rewound; click 3 on `Mars` resumed. The console returned to live `TURN 22`. |
| EDGE-003 — orphaned `ΔV` in long BURN rows | Fixed | Cost and `ΔV` stayed together in all tutorial BURN rows. The formatter also has a targeted non-breaking-space test. |
| EDGE-004 — broken missile solution shown as crew death | Fixed | `MISSILE_SOLUTION_BROKEN` now renders `MISSILE SOLUTION BROKEN — TARGET ESCAPED`; actual destruction still renders `SIGNAL LOST — CREW LOST`. This branch did not occur naturally in the tutorial seed and was verified by the formatter test. |
| EDGE-005 — game menu did not pause the planning timer | Fixed | A 10-second timer remained at `00:10` after 4.5 seconds in the menu. Opening the menu during turn resolution and leaving it open for 5 seconds also kept the following turn paused at `00:10`. |
| EDGE-006 — capture and work looked like duplicate WORK | Fixed | The tutorial showed `CAPTURE Mars Shipyard 2/5`, then a distinct `WORK Mars Shipyard 3/5`. |

## Stress actions

- Double-clicked `EXECUTE` to check idempotence.
- Opened and closed glossary context while a command was queued.
- Repeatedly advanced automatic WORK turns into MANDATORY LAUNCH.
- Used a tutorial seed where Deimos was barren and Phobos was the productive shipyard.
- Entered and exited the game menu during both countdown and resolution.
- Clicked three different glossary tokens on the replay cue instead of the same word.
- Confirmed the post-replay command console returned to the live turn.

## Regressions captured and fixed during the pass

### REGRESSION-001 — replay cue across different glossary tokens

The first implementation only allowed the same token to close its context. Clicking another word
on the same cue reopened the glossary, and the live console could remain scrolled to `TURN 01`.
The cue now treats the entire replay row as one contextual activation and explicitly scrolls back
to the live end after resume.

- GameState: `states/REGRESSION-001-replay-token-resume.json`
- Screenshot: `screens/REGRESSION-001-console-stuck-turn-01.png`
- Fixed checkpoint: `states/tutorial-complete-fixed.json`
- Fixed screenshot: `screens/tutorial-replay-fixed.png`

### REGRESSION-002 — menu opened during resolution

The timer paused correctly during planning/countdown, but if the menu opened while a turn was
resolving, the next turn's timer started behind the menu. Timer restarts now inherit the open-menu
pause state.

- GameState: `states/REGRESSION-002-menu-during-resolution-timer.json`
- Screenshot: `screens/REGRESSION-002-menu-during-resolution-timer.png`

## Verification

- `npm run verify`
- 47 test files passed
- 565 tests passed
- TypeScript typecheck passed
- ESLint and Prettier passed
- Production build passed

Vite still reports its existing advisory that some minified chunks exceed 500 kB; this does not
affect the tested gameplay behavior.
