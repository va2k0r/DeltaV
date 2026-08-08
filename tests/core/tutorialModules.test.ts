import { describe, expect, it } from "vitest";

import {
  applyTutorialCameraHintDisplayLimits,
  removeTutorialCameraHintRows
} from "../../src/ui/tutorial/cameraHintDisplay";
import { shouldPanTutorialTarget } from "../../src/ui/tutorial/cameraPolicy";
import {
  tutorialCameraFocusHintText,
  tutorialCameraOrbitHintText,
  tutorialCameraPanHintText,
  tutorialCameraZoomHintText,
  tutorialConfirmCameraPanOrbitHintText
} from "../../src/ui/tutorial/constants";
import { findFirstTutorialEnemyKillResolutionEvent } from "../../src/ui/tutorial/firstEnemyKillReplay";
import { isTutorialSupportProductionDestinationAllowed } from "../../src/ui/tutorial/productiveBurnDestination";
import {
  getTutorialRequiredShipSelectionRecoveryTargetKey,
  isTutorialTargetInputAllowed
} from "../../src/ui/tutorial/selectionGate";
import {
  createTutorialConfirmTransferBurnLiveRows,
  createTutorialEnemyContactVictoryRows,
  createTutorialEnterFireModeLiveRows,
  createTutorialFirstBurnTimeCostRows,
  createTutorialLogbookIntroductionLiveRow,
  createTutorialOpeningCameraControlLiveRows,
  createTutorialOverlayLiveHintRow,
  createTutorialPostVictoryActionRows,
  createTutorialPostVictoryAutomaticBehaviorRows,
  createTutorialSelectShipLiveRows,
  createTutorialShipyardContestedRuleRows,
  createTutorialShipyardFirePromptRows,
  createTutorialShipyardProductionRows,
  createTutorialSpacerRow,
  createTutorialZoomFocusLiveRows,
  expandTutorialSentenceRows,
  freezeTutorialLiveHintClassName,
  getTutorialDelayedLiveHintClassName,
  tutorialCompleteHintClassName,
  tutorialDelayedLiveHintClassName,
  tutorialLineClassName,
  tutorialLiveHintClassName,
  tutorialSpacerClassName
} from "../../src/ui/tutorial/commandRows";
import {
  createTutorialRuntimeDiagnosticDump,
  createTutorialRuntimeState,
  findTutorialQueuedFireOrder,
  getTutorialQueuedFireLesson,
  getTutorialMandatoryLaunchResumePhase,
  isOrderForTutorialQueuedFireLesson,
  recoverTutorialQueuedFireLessonAfterCancellation,
  removeTutorialFireLiveHintRowsAfterCancellation,
  shouldInterruptTutorialForMandatoryLaunch,
  shouldRestoreTutorialAutoAdvanceLock
} from "../../src/ui/tutorial/runtimeState";
import { getTutorialAiPlanningFactionIds } from "../../src/ui/tutorial/turnControl";

describe("tutorial support production destinations", () => {
  const emptyAlternateShipyard = {
    originNodeId: "deimos_node",
    destinationNodeId: "titan_node",
    contestedShipyardNodeId: "mars_node",
    destinationType: "shipyard",
    isDestinationContested: false,
    hasOpponentShip: false,
    wouldPlayerStack: false
  };

  it("accepts an empty alternate shipyard", () => {
    expect(isTutorialSupportProductionDestinationAllowed(emptyAlternateShipyard)).toBe(true);
  });

  it("rejects the enemy shipyard named as the contested lesson target", () => {
    expect(
      isTutorialSupportProductionDestinationAllowed({
        ...emptyAlternateShipyard,
        destinationNodeId: "mars_node"
      })
    ).toBe(false);
  });

  it("rejects destinations that cannot produce an uncontested support ship", () => {
    expect(
      isTutorialSupportProductionDestinationAllowed({
        ...emptyAlternateShipyard,
        hasOpponentShip: true
      })
    ).toBe(false);
    expect(
      isTutorialSupportProductionDestinationAllowed({
        ...emptyAlternateShipyard,
        isDestinationContested: true
      })
    ).toBe(false);
    expect(
      isTutorialSupportProductionDestinationAllowed({
        ...emptyAlternateShipyard,
        destinationType: "barren"
      })
    ).toBe(false);
    expect(
      isTutorialSupportProductionDestinationAllowed({
        ...emptyAlternateShipyard,
        wouldPlayerStack: true
      })
    ).toBe(false);
  });
});

describe("tutorial row modules", () => {
  it("explains that BURN and FIRE markers point to future positions", () => {
    expect(createTutorialFirstBurnTimeCostRows("player-highlight")).toContainEqual({
      parts: [
        {
          text: "The destination marker shows where that orbit will be when the transfer ends, not where it is now. Compare ETA and cost before you confirm."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:first-burn-arrival-marker"
    });
    expect(createTutorialShipyardFirePromptRows()).toContainEqual({
      parts: [
        { text: "The X marks the target's predicted position at " },
        { text: "impact", className: "command-console__event-contested" },
        {
          text: ", not its current position. Confirm only after checking that ETA still creates useful pressure."
        }
      ],
      className: tutorialLineClassName,
      key: "tutorial:shipyard-fire-impact-marker"
    });
  });

  it("keeps arrival pans active after the opening turn", () => {
    expect(shouldPanTutorialTarget({ isFirstTurn: false, isArrival: true })).toBe(true);
    expect(shouldPanTutorialTarget({ isFirstTurn: false, isArrival: false })).toBe(false);
    expect(shouldPanTutorialTarget({ isFirstTurn: true, isArrival: false })).toBe(true);
  });

  it("never gives a human tutorial faction to the AI planner", () => {
    expect(
      getTutorialAiPlanningFactionIds([
        { id: "player", controlType: "human" },
        { id: "opponent", controlType: "ai" }
      ])
    ).toEqual(["opponent"]);
  });

  it("accepts only the player ship while the tutorial awaits its initial selection", () => {
    expect(
      isTutorialTargetInputAllowed(
        { phase: "awaitingInitialSelection", inputLocked: false, autoAdvanceActive: false },
        "node:moon_node"
      )
    ).toBe(true);
    expect(
      isTutorialTargetInputAllowed(
        { phase: "awaitingInitialSelection", inputLocked: false, autoAdvanceActive: false },
        "node:mars_node"
      )
    ).toBe(false);
    expect(
      isTutorialTargetInputAllowed(
        { phase: "awaitingFirstBurnPreview", inputLocked: false, autoAdvanceActive: false },
        "node:mars_node"
      )
    ).toBe(true);
    expect(isTutorialTargetInputAllowed(null, "node:mars_node")).toBe(true);
  });

  it("ignores target input while the tutorial skips turns", () => {
    expect(
      isTutorialTargetInputAllowed(
        { phase: "awaitingFirstArrival", inputLocked: true, autoAdvanceActive: true },
        "node:mars_node"
      )
    ).toBe(false);
    expect(
      isTutorialTargetInputAllowed(
        { phase: "awaitingFirstArrival", inputLocked: false, autoAdvanceActive: true },
        "node:mars_node"
      )
    ).toBe(false);
  });

  it("restores a required ship after a later tutorial prompt is deselected", () => {
    expect(
      getTutorialRequiredShipSelectionRecoveryTargetKey(
        { phase: "shipyardContestedBurnPrompt" },
        null,
        "mars_node"
      )
    ).toBe("node:mars_node");
    expect(
      getTutorialRequiredShipSelectionRecoveryTargetKey(
        { phase: "awaitingBurnOut" },
        null,
        "titan_node"
      )
    ).toBe("node:titan_node");
    expect(
      getTutorialRequiredShipSelectionRecoveryTargetKey(
        { phase: "awaitingInitialSelection" },
        null,
        "moon_node"
      )
    ).toBeNull();
    expect(
      getTutorialRequiredShipSelectionRecoveryTargetKey(
        { phase: "shipyardCounterContestBurnPrompt" },
        "node:callisto_node",
        "mars_node"
      )
    ).toBeNull();
  });

  it("keeps live hint class transitions deterministic", () => {
    expect(getTutorialDelayedLiveHintClassName(null)).toBe(tutorialCompleteHintClassName);
    expect(getTutorialDelayedLiveHintClassName(1200)).toBe(tutorialDelayedLiveHintClassName);

    const frozen = freezeTutorialLiveHintClassName(`${tutorialLiveHintClassName} custom-row`);

    expect(frozen).toBe(
      "command-console__line--tutorial custom-row command-console__line--tutorial-complete-hint"
    );
    expect(freezeTutorialLiveHintClassName("command-console__line--turn")).toBe(
      "command-console__line--turn"
    );
  });

  it("builds stable live hint rows through the public barrel", () => {
    expect(createTutorialSelectShipLiveRows("hint-class", "tutorial:test-select")).toEqual([
      {
        parts: [{ text: "Left-click the Moon orbit to select the ship." }],
        className: "hint-class",
        key: "tutorial:test-select"
      },
      createTutorialSpacerRow("tutorial:test-select:spacer")
    ]);

    expect(
      createTutorialEnterFireModeLiveRows(
        "hint-class",
        "tutorial:test-enter-fire",
        "player-highlight"
      )
    ).toEqual([
      {
        parts: [
          { text: "Right-click anywhere to enter " },
          { text: "FIRE", className: "player-highlight" },
          { text: " mode for the selected ship." }
        ],
        className: "hint-class",
        key: "tutorial:test-enter-fire"
      }
    ]);

    expect(createTutorialOverlayLiveHintRow("Overlay check")).toEqual({
      parts: [{ text: "Overlay check" }],
      className: "command-console__line--tutorial command-console__line--tutorial-overlay",
      key: "tutorial-overlay:Overlay check"
    });

    expect(createTutorialSpacerRow("tutorial:test-spacer")).toEqual({
      parts: [{ text: "" }],
      className: tutorialSpacerClassName,
      key: "tutorial:test-spacer"
    });

    expect(
      createTutorialOpeningCameraControlLiveRows(
        "tutorial:test-opening-camera",
        tutorialCameraZoomHintText,
        tutorialCameraOrbitHintText,
        tutorialCameraPanHintText,
        tutorialCameraFocusHintText
      )
    ).toEqual([
      {
        parts: [{ text: tutorialCameraZoomHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:zoom"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:zoom-spacer"),
      {
        parts: [{ text: tutorialCameraOrbitHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:orbit"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:orbit-spacer"),
      {
        parts: [{ text: tutorialCameraPanHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:pan"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:pan-spacer"),
      {
        parts: [{ text: tutorialCameraFocusHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:focus"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:select-spacer")
    ]);

    expect(createTutorialLogbookIntroductionLiveRow("Open a log term.", true)).toEqual({
      parts: [{ text: "Open a log term." }],
      className: tutorialLiveHintClassName,
      key: "tutorial:live-logbook-introduction"
    });

    expect(createTutorialLogbookIntroductionLiveRow("Open a log term.", false)).toEqual({
      parts: [{ text: "Open a log term." }],
      className: tutorialCompleteHintClassName,
      key: "tutorial:live-logbook-introduction"
    });

    expect(
      createTutorialZoomFocusLiveRows(
        "hint-class",
        "tutorial:test-zoom-focus",
        tutorialCameraZoomHintText,
        tutorialCameraFocusHintText
      )
    ).toEqual([
      {
        parts: [{ text: tutorialCameraZoomHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-zoom-focus:zoom"
      },
      createTutorialSpacerRow("tutorial:test-zoom-focus:spacer"),
      {
        parts: [{ text: tutorialCameraFocusHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-zoom-focus:focus"
      }
    ]);

    expect(
      createTutorialZoomFocusLiveRows(
        tutorialLiveHintClassName,
        "tutorial:test-live-zoom-focus",
        tutorialCameraZoomHintText,
        tutorialCameraFocusHintText
      )
    ).toEqual([
      {
        parts: [{ text: tutorialCameraZoomHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-live-zoom-focus:zoom"
      },
      createTutorialSpacerRow("tutorial:test-live-zoom-focus:spacer"),
      {
        parts: [{ text: tutorialCameraFocusHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-live-zoom-focus:focus"
      }
    ]);
  });

  it("keeps confirm helper rows static while the actionable confirm line blinks", () => {
    expect(
      createTutorialConfirmTransferBurnLiveRows(
        tutorialDelayedLiveHintClassName,
        "tutorial:test-confirm-burn",
        "player-highlight",
        {
          zoomHintText: tutorialCameraZoomHintText,
          cameraPanOrbitHintText: tutorialConfirmCameraPanOrbitHintText
        }
      )
    ).toEqual([
      {
        parts: [{ text: tutorialCameraZoomHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-confirm-burn:zoom-hint"
      },
      createTutorialSpacerRow("tutorial:test-confirm-burn:zoom-hint-spacer"),
      {
        parts: [{ text: tutorialConfirmCameraPanOrbitHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-confirm-burn:camera-pan-orbit-hint"
      },
      createTutorialSpacerRow("tutorial:test-confirm-burn:camera-pan-orbit-hint-spacer"),
      {
        parts: [
          { text: "Left-click the destination to confirm the " },
          { text: "BURN", className: "player-highlight" },
          { text: " transfer." }
        ],
        className: tutorialDelayedLiveHintClassName,
        key: "tutorial:test-confirm-burn"
      }
    ]);
  });

  it("continues the post-replay log with the victory rule and no tutorial handoff copy", () => {
    expect(createTutorialEnemyContactVictoryRows()).toEqual([
      createTutorialSpacerRow("tutorial:first-enemy-kill-victory:before"),
      {
        parts: [
          {
            text: "You win by remaining the only faction with a credible route to tritium. Protect your own access while denying rivals the plants, ΔV or ships needed to recover theirs."
          }
        ],
        className: tutorialLineClassName,
        key: "tutorial:first-enemy-kill-victory"
      }
    ]);
  });

  it("builds the post-victory action reminder with semantic action colors", () => {
    expect(createTutorialPostVictoryActionRows("player-highlight")).toEqual([
      createTutorialSpacerRow("tutorial:post-victory-actions:before"),
      {
        parts: [{ text: "Each ship resolves one operational outcome per turn." }],
        className: tutorialLineClassName,
        key: "tutorial:post-victory-actions:intro"
      },
      createTutorialSpacerRow("tutorial:post-victory-actions:between-actions"),
      {
        parts: [
          { text: "A ship may " },
          { text: "BURN", className: "player-highlight" },
          { text: ", " },
          { text: "FIRE", className: "player-highlight" },
          { text: " or remain in place; if it remains eligible, it will " },
          { text: "WORK", className: "player-highlight" },
          { text: " automatically. It will also " },
          { text: "EVADE", className: "player-highlight" },
          { text: " automatically when a missile impacts and the faction can pay." }
        ],
        className: tutorialLineClassName,
        key: "tutorial:post-victory-actions:actions"
      },
      createTutorialSpacerRow("tutorial:post-victory-actions:between-contested"),
      {
        parts: [
          { text: "CONTESTED", className: "command-console__event-contested" },
          { text: " ships cannot " },
          { text: "FIRE", className: "player-highlight" },
          { text: ", " },
          { text: "WORK", className: "player-highlight" },
          { text: " or " },
          { text: "EVADE", className: "player-highlight" },
          {
            text: ". They may stay and preserve the lock, or BURN out; a support ship outside the lock can still FIRE into it."
          }
        ],
        className: tutorialLineClassName,
        key: "tutorial:post-victory-actions:contested"
      }
    ]);
  });

  it("builds the following-turn automatic behavior reminder with semantic action colors", () => {
    const rows = createTutorialPostVictoryAutomaticBehaviorRows("player-highlight");

    expect(rows).toEqual([
      createTutorialSpacerRow("tutorial:post-victory-automatic-behavior:before"),
      {
        parts: [
          { text: "A stationary eligible ship performs " },
          { text: "WORK", className: "player-highlight" },
          { text: " automatically. When a missile impacts, it instead attempts to " },
          { text: "EVADE", className: "player-highlight" },
          {
            text: " automatically, paying 1 ΔV per missile. No separate WORK or EVADE order is required."
          }
        ],
        className: tutorialLineClassName,
        key: "tutorial:post-victory-automatic-behavior"
      }
    ]);
    expect(
      rows
        .flatMap((row) => row.parts)
        .map((part) => part.text)
        .join("")
    ).toBe(
      "A stationary eligible ship performs WORK automatically. When a missile impacts, it instead attempts to EVADE automatically, paying 1 ΔV per missile. No separate WORK or EVADE order is required."
    );
  });

  it("does not repeat camera guidance during the later shipyard lesson", () => {
    const rows = createTutorialShipyardProductionRows("player-highlight");
    const text = rows
      .flatMap((row) => row.parts)
      .map((part) => part.text)
      .join("");

    expect(text).not.toContain(tutorialCameraOrbitHintText);
    expect(rows.at(-1)).toEqual(createTutorialSpacerRow());
  });

  it("removes camera guidance rows and their spacers after the first tutorial turn", () => {
    const rows = [
      {
        parts: [{ text: tutorialCameraZoomHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test:zoom-hint"
      },
      createTutorialSpacerRow("tutorial:test:zoom-hint-spacer"),
      {
        parts: [{ text: tutorialCameraOrbitHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test:orbit"
      },
      createTutorialSpacerRow("tutorial:test:orbit-spacer"),
      {
        parts: [{ text: "Left click to confirm burn." }],
        className: tutorialDelayedLiveHintClassName,
        key: "tutorial:test:confirm"
      }
    ];

    expect(removeTutorialCameraHintRows(rows)).toEqual([
      {
        parts: [{ text: "Left click to confirm burn." }],
        className: tutorialDelayedLiveHintClassName,
        key: "tutorial:test:confirm"
      }
    ]);
  });

  it("explains how to disengage from a contested shipyard orbit", () => {
    const rows = createTutorialShipyardContestedRuleRows("player-highlight");

    expect(rows.at(-1)).toEqual({
      parts: [
        { text: "To disengage, " },
        { text: "BURN", className: "player-highlight" },
        {
          text: " to another orbit after paying upkeep. Holding can still be correct when it denies valuable production or lets an outside support ship attack."
        }
      ],
      className: tutorialLineClassName
    });

    const expandedRows = expandTutorialSentenceRows(rows, "tutorial:test-contested");
    const disengageRowIndex = expandedRows.findIndex((row) => {
      return (
        row.parts.map((part) => part.text).join("") ===
        "To disengage, BURN to another orbit after paying upkeep."
      );
    });

    expect(expandedRows[disengageRowIndex - 1]?.className).toBe(tutorialSpacerClassName);
    expect(expandedRows[disengageRowIndex + 1]?.className).toBe(tutorialSpacerClassName);
  });

  it("shows camera hint rows for two condition entries and then suppresses them", () => {
    const state = createTutorialRuntimeState({
      startedAt: 100,
      shipyardLessonNodeId: "shipyard_a"
    });
    const rows = [
      {
        parts: [{ text: tutorialCameraZoomHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:live-zoom-focus-hint:zoom"
      },
      createTutorialSpacerRow("tutorial:live-zoom-focus-hint:spacer"),
      {
        parts: [{ text: tutorialCameraFocusHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:live-zoom-focus-hint:focus"
      },
      {
        parts: [{ text: tutorialConfirmCameraPanOrbitHintText }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-confirm:camera-pan-orbit-hint"
      },
      createTutorialSpacerRow("tutorial:test-confirm:camera-pan-orbit-hint-spacer"),
      {
        parts: [{ text: "Left click to confirm burn." }],
        className: tutorialDelayedLiveHintClassName,
        key: "tutorial:test-confirm"
      }
    ];

    expect(applyTutorialCameraHintDisplayLimits(rows, state)).toEqual(rows);
    expect(state.cameraZoomFocusHintDisplayCount).toBe(1);
    expect(state.cameraPanOrbitHintDisplayCount).toBe(1);

    expect(applyTutorialCameraHintDisplayLimits(rows, state)).toEqual(rows);
    expect(state.cameraZoomFocusHintDisplayCount).toBe(1);
    expect(state.cameraPanOrbitHintDisplayCount).toBe(1);

    expect(applyTutorialCameraHintDisplayLimits([], state)).toEqual([]);
    expect(state.cameraZoomFocusHintVisible).toBe(false);
    expect(state.cameraPanOrbitHintVisible).toBe(false);

    expect(applyTutorialCameraHintDisplayLimits(rows, state)).toEqual(rows);
    expect(state.cameraZoomFocusHintDisplayCount).toBe(2);
    expect(state.cameraPanOrbitHintDisplayCount).toBe(2);

    expect(applyTutorialCameraHintDisplayLimits([], state)).toEqual([]);

    expect(applyTutorialCameraHintDisplayLimits(rows, state)).toEqual([
      {
        parts: [{ text: "Left click to confirm burn." }],
        className: tutorialDelayedLiveHintClassName,
        key: "tutorial:test-confirm"
      }
    ]);
    expect(state.cameraZoomFocusHintDisplayCount).toBe(2);
    expect(state.cameraPanOrbitHintDisplayCount).toBe(2);
  });

  it("adds tutorial spacers after each sentence while preserving styled parts", () => {
    expect(
      expandTutorialSentenceRows(
        [
          {
            parts: [
              { text: "First " },
              { text: "BURN", className: "player-highlight" },
              { text: " sentence. Second sentence." }
            ],
            className: tutorialLineClassName
          }
        ],
        "tutorial:test-sentences"
      )
    ).toEqual([
      {
        parts: [
          { text: "First " },
          { text: "BURN", className: "player-highlight" },
          { text: " sentence" },
          { text: "." }
        ],
        className: tutorialLineClassName,
        key: "tutorial:test-sentences:sentence-row:0:sentence:0"
      },
      createTutorialSpacerRow("tutorial:test-sentences:sentence-row:0:spacer:0"),
      {
        parts: [{ text: "Second sentence" }, { text: "." }],
        className: tutorialLineClassName,
        key: "tutorial:test-sentences:sentence-row:0:sentence:1"
      },
      createTutorialSpacerRow("tutorial:test-sentences:sentence-row:0:spacer:1")
    ]);
  });

  it("collapses manual tutorial spacers after generated sentence spacers", () => {
    expect(
      expandTutorialSentenceRows(
        [
          {
            parts: [{ text: "Manual spacer follows." }],
            className: tutorialLineClassName
          },
          createTutorialSpacerRow("tutorial:test-manual-spacer")
        ],
        "tutorial:test-collapse"
      )
    ).toEqual([
      {
        parts: [{ text: "Manual spacer follows" }, { text: "." }],
        className: tutorialLineClassName,
        key: "tutorial:test-collapse:sentence-row:0:sentence:0"
      },
      createTutorialSpacerRow("tutorial:test-collapse:sentence-row:0:spacer:0")
    ]);
  });
});

describe("tutorial runtime modules", () => {
  it("re-arms every FIRE lesson when its queued solution is cancelled", () => {
    const state = createTutorialRuntimeState({
      startedAt: 100,
      shipyardLessonNodeId: "shipyard_a"
    });
    state.shipyardEnemyDestinationNodeId = "enemy_destination";
    state.phase = "shipyardFireQueued";

    const firstLesson = getTutorialQueuedFireLesson(state, null);
    const firstOrder = {
      factionId: "player",
      targetFactionId: "opponent",
      originNodeId: "shipyard_a",
      targetNodeId: "enemy_destination"
    };

    expect(firstLesson).toMatchObject({
      queuedPhase: "shipyardFireQueued",
      promptPhase: "shipyardFirePrompt",
      frozenLiveHintLogKey: "tutorial:shipyard-fire-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-shipyard-fire"
    });
    expect(
      firstLesson === null ? false : isOrderForTutorialQueuedFireLesson(firstOrder, firstLesson)
    ).toBe(true);
    expect(findTutorialQueuedFireOrder(state, null, [firstOrder])).toBe(firstOrder);
    state.inputLocked = true;
    state.autoAdvanceActive = true;
    state.shipyardEnemyFireImpactTurn = 8;
    state.shipyardEnemyEvadeObserved = true;
    expect(recoverTutorialQueuedFireLessonAfterCancellation(state, null, firstOrder, 250)).toEqual(
      firstLesson
    );
    expect(state.phase).toBe("shipyardFirePrompt");
    expect(state.inputLocked).toBe(false);
    expect(state.autoAdvanceActive).toBe(false);
    expect(state.shipyardEnemyFireImpactTurn).toBeNull();
    expect(state.shipyardEnemyEvadeObserved).toBe(false);
    expect(state.shipyardFirePromptStartedAt).toBe(250);
    expect(
      firstLesson === null
        ? []
        : removeTutorialFireLiveHintRowsAfterCancellation(
            [
              { key: "tutorial:live-confirm-shipyard-fire" },
              { key: "tutorial:live-confirm-shipyard-fire:camera-pan-orbit-hint" },
              { key: "tutorial:shipyard-fire-work-choice" }
            ],
            firstLesson
          )
    ).toEqual([{ key: "tutorial:shipyard-fire-work-choice" }]);

    state.phase = "shipyardContestedFireQueued";
    state.shipyardSupportFireNodeId = "support_node";
    const contestedLesson = getTutorialQueuedFireLesson(state, "contested_node");
    const contestedOrder = {
      factionId: "player",
      targetFactionId: "opponent",
      originNodeId: "support_node",
      targetNodeId: "contested_node"
    };

    expect(contestedLesson).toMatchObject({
      queuedPhase: "shipyardContestedFireQueued",
      promptPhase: "shipyardContestedFirePrompt",
      frozenLiveHintLogKey: "tutorial:shipyard-contested-fire-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-shipyard-contested-fire"
    });
    expect(
      contestedLesson === null
        ? false
        : isOrderForTutorialQueuedFireLesson(contestedOrder, contestedLesson)
    ).toBe(true);
    expect(findTutorialQueuedFireOrder(state, "contested_node", [contestedOrder])).toBe(
      contestedOrder
    );
    expect(
      recoverTutorialQueuedFireLessonAfterCancellation(state, "contested_node", contestedOrder, 500)
    ).toEqual(contestedLesson);
    expect(state.phase).toBe("shipyardContestedFirePrompt");
    expect(state.shipyardSupportFirePromptStartedAt).toBe(500);
  });

  it("does not treat a missing or unrelated FIRE order as an executable tutorial solution", () => {
    const state = createTutorialRuntimeState({
      startedAt: 100,
      shipyardLessonNodeId: "shipyard_a"
    });
    state.phase = "shipyardContestedFireQueued";
    state.shipyardSupportFireNodeId = "support_node";

    expect(findTutorialQueuedFireOrder(state, "contested_node", [])).toBeUndefined();
    const unrelatedOrder = {
      factionId: "player",
      targetFactionId: "opponent",
      originNodeId: "support_node",
      targetNodeId: "different_node"
    };

    expect(findTutorialQueuedFireOrder(state, "contested_node", [unrelatedOrder])).toBeUndefined();
    expect(
      recoverTutorialQueuedFireLessonAfterCancellation(state, "contested_node", unrelatedOrder, 250)
    ).toBeNull();
    expect(state.phase).toBe("shipyardContestedFireQueued");
  });

  it("pauses a turn skip for a launch created by another shipyard", () => {
    expect(
      shouldInterruptTutorialForMandatoryLaunch({
        phase: "autoAdvancingToShipyardContestedSupport",
        activeMandatoryLaunchId: null,
        nextMandatoryLaunchId: "launch:secondary-shipyard"
      })
    ).toBe(true);

    expect(
      shouldInterruptTutorialForMandatoryLaunch({
        phase: "mandatoryLaunchQueued",
        activeMandatoryLaunchId: "launch:primary-shipyard",
        nextMandatoryLaunchId: "launch:secondary-shipyard"
      })
    ).toBe(true);

    expect(
      shouldInterruptTutorialForMandatoryLaunch({
        phase: "mandatoryLaunchQueued",
        activeMandatoryLaunchId: "launch:primary-shipyard",
        nextMandatoryLaunchId: "launch:primary-shipyard"
      })
    ).toBe(false);
  });

  it("retains the original tutorial continuation across chained mandatory launches", () => {
    expect(
      getTutorialMandatoryLaunchResumePhase("autoAdvancingToShipyardContestedSupport", null)
    ).toBe("autoAdvancingToShipyardContestedSupport");
    expect(
      getTutorialMandatoryLaunchResumePhase(
        "mandatoryLaunchQueued",
        "autoAdvancingToShipyardContestedSupport"
      )
    ).toBe("autoAdvancingToShipyardContestedSupport");
  });

  it("never reapplies a stale skip lock after a mandatory-launch interruption", () => {
    expect(
      shouldRestoreTutorialAutoAdvanceLock(
        "autoAdvancingToShipyardContestedSupport",
        "mandatoryLaunch"
      )
    ).toBe(false);
    expect(
      shouldRestoreTutorialAutoAdvanceLock(
        "autoAdvancingToShipyardContestedSupport",
        "autoAdvancingToShipyardContestedSupport"
      )
    ).toBe(true);
  });

  it("creates independent runtime state instances", () => {
    const first = createTutorialRuntimeState({
      startedAt: 100,
      shipyardLessonNodeId: "shipyard_a"
    });
    const second = createTutorialRuntimeState({
      startedAt: 200,
      shipyardLessonNodeId: "shipyard_b"
    });

    first.timers.push(42);
    first.loggedKeys.add("tutorial:b");
    first.loggedKeys.add("tutorial:a");

    expect(first.phase).toBe("awaitingInitialSelection");
    expect(first.shipyardLessonNodeId).toBe("shipyard_a");
    expect(first.firstSelectionAt).toBeNull();
    expect(first.enemySimpleAiEnabled).toBe(false);
    expect(first.activeMandatoryLaunchId).toBeNull();
    expect(first.mandatoryLaunchResumePhase).toBeNull();
    expect(first.shipyardCounterContestAutoAdvanceConsumed).toBe(false);
    expect(second.timers).toEqual([]);
    expect([...second.loggedKeys]).toEqual([]);
  });

  it("serializes runtime diagnostics without leaking mutable collections", () => {
    const state = createTutorialRuntimeState({
      startedAt: 100,
      shipyardLessonNodeId: "shipyard_a"
    });

    state.timers.push(7, 3);
    state.loggedKeys.add("tutorial:b");
    state.loggedKeys.add("tutorial:a");

    expect(createTutorialRuntimeDiagnosticDump(null)).toBeNull();
    expect(createTutorialRuntimeDiagnosticDump(state)).toMatchObject({
      segmentId: "TUTORIAL_SEGMENT_01",
      phase: "awaitingInitialSelection",
      timerCount: 2,
      timers: [7, 3],
      loggedKeys: ["tutorial:a", "tutorial:b"]
    });
  });
});

describe("tutorial first enemy kill replay", () => {
  it("selects the earliest enemy ship destruction regardless of node or event order", () => {
    const events = [
      {
        id: "later-kill",
        turn: 8,
        index: 1,
        type: "SIGNAL_LOST",
        actorFactionId: "opponent",
        nodeId: "mars_node",
        result: "SHIP_DESTROYED",
        criticality: "critical",
        sourceDebugEventTypes: ["SHIP_DESTROYED"],
        sourceDebugEventIndices: [0],
        mapCue: {
          kind: "SIGNAL_LOST",
          nodeIds: ["mars_node"],
          factionIds: [],
          missileIds: [],
          shipIds: []
        }
      },
      {
        id: "player-loss",
        turn: 3,
        index: 1,
        type: "SIGNAL_LOST",
        actorFactionId: "player",
        nodeId: "moon_node",
        result: "SHIP_DESTROYED",
        criticality: "critical",
        sourceDebugEventTypes: ["SHIP_DESTROYED"],
        sourceDebugEventIndices: [0],
        mapCue: {
          kind: "SIGNAL_LOST",
          nodeIds: ["moon_node"],
          factionIds: [],
          missileIds: [],
          shipIds: []
        }
      },
      {
        id: "first-enemy-kill",
        turn: 5,
        index: 2,
        type: "SIGNAL_LOST",
        actorFactionId: "opponent",
        nodeId: "callisto_node",
        result: "SHIP_DESTROYED",
        criticality: "critical",
        sourceDebugEventTypes: ["MISSILE_IMPACT", "SHIP_DESTROYED"],
        sourceDebugEventIndices: [1, 2],
        mapCue: {
          kind: "SIGNAL_LOST",
          nodeIds: ["callisto_node"],
          factionIds: [],
          missileIds: [],
          shipIds: []
        }
      }
    ] as const;

    expect(findFirstTutorialEnemyKillResolutionEvent(events)?.id).toBe("first-enemy-kill");
  });

  it("does not require a node id and ignores non-destruction signal losses", () => {
    const events = [
      {
        id: "missed-signal",
        turn: 4,
        index: 1,
        type: "SIGNAL_LOST",
        actorFactionId: "opponent",
        result: "MISSILE_MISSED",
        criticality: "notable",
        sourceDebugEventTypes: ["MISSILE_MISSED"],
        sourceDebugEventIndices: [0],
        mapCue: {
          kind: "SIGNAL_LOST",
          nodeIds: [],
          factionIds: [],
          missileIds: [],
          shipIds: []
        }
      },
      {
        id: "node-less-kill",
        turn: 6,
        index: 1,
        type: "SIGNAL_LOST",
        actorFactionId: "opponent",
        result: "SHIP_DESTROYED",
        criticality: "critical",
        sourceDebugEventTypes: ["SHIP_DESTROYED"],
        sourceDebugEventIndices: [1],
        mapCue: {
          kind: "SIGNAL_LOST",
          nodeIds: [],
          factionIds: [],
          missileIds: [],
          shipIds: []
        }
      }
    ] as const;

    expect(findFirstTutorialEnemyKillResolutionEvent(events)?.id).toBe("node-less-kill");
  });
});
