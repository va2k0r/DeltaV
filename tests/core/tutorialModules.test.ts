import { describe, expect, it } from "vitest";

import { applyTutorialCameraHintDisplayLimits } from "../../src/ui/tutorial/cameraHintDisplay";
import { findFirstTutorialEnemyKillResolutionEvent } from "../../src/ui/tutorial/firstEnemyKillReplay";
import {
  getTutorialRequiredShipSelectionRecoveryTargetKey,
  isTutorialTargetInputAllowed
} from "../../src/ui/tutorial/selectionGate";
import {
  createTutorialConfirmTransferBurnLiveRows,
  createTutorialEnemyContactVictoryWarningRows,
  createTutorialOpeningCameraControlLiveRows,
  createTutorialOverlayLiveHintRow,
  createTutorialPostVictoryActionRows,
  createTutorialPostVictoryAutomaticBehaviorRows,
  createTutorialSelectShipLiveRows,
  createTutorialShipyardContestedRuleRows,
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
  shouldInterruptTutorialForMandatoryLaunch,
  shouldRestoreTutorialAutoAdvanceLock
} from "../../src/ui/tutorial/runtimeState";

describe("tutorial row modules", () => {
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
        parts: [{ text: "Left click on the orbit to select a ship." }],
        className: "hint-class",
        key: "tutorial:test-select"
      },
      createTutorialSpacerRow("tutorial:test-select:spacer")
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
        "Mouse wheel to zoom in / out.",
        "Right click and drag to orbit.",
        "Left click and drag to pan.",
        "Double click to focus."
      )
    ).toEqual([
      {
        parts: [{ text: "Mouse wheel to zoom in / out." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:zoom"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:zoom-spacer"),
      {
        parts: [{ text: "Right click and drag to orbit." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:orbit"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:orbit-spacer"),
      {
        parts: [{ text: "Left click and drag to pan." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:pan"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:pan-spacer"),
      {
        parts: [{ text: "Double click to focus." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-opening-camera:focus"
      },
      createTutorialSpacerRow("tutorial:test-opening-camera:select-spacer")
    ]);

    expect(
      createTutorialZoomFocusLiveRows(
        "hint-class",
        "tutorial:test-zoom-focus",
        "Mouse wheel to zoom in / out.",
        "Double click to focus."
      )
    ).toEqual([
      {
        parts: [{ text: "Mouse wheel to zoom in / out." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-zoom-focus:zoom"
      },
      createTutorialSpacerRow("tutorial:test-zoom-focus:spacer"),
      {
        parts: [{ text: "Double click to focus." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-zoom-focus:focus"
      }
    ]);

    expect(
      createTutorialZoomFocusLiveRows(
        tutorialLiveHintClassName,
        "tutorial:test-live-zoom-focus",
        "Mouse wheel to zoom in / out.",
        "Double click to focus."
      )
    ).toEqual([
      {
        parts: [{ text: "Mouse wheel to zoom in / out." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-live-zoom-focus:zoom"
      },
      createTutorialSpacerRow("tutorial:test-live-zoom-focus:spacer"),
      {
        parts: [{ text: "Double click to focus." }],
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
          zoomHintText: "Mouse wheel to zoom in / out.",
          cameraPanOrbitHintText: "Left click and drag to pan. Right click and drag to orbit."
        }
      )
    ).toEqual([
      {
        parts: [{ text: "Mouse wheel to zoom in / out." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-confirm-burn:zoom-hint"
      },
      createTutorialSpacerRow("tutorial:test-confirm-burn:zoom-hint-spacer"),
      {
        parts: [{ text: "Left click and drag to pan. Right click and drag to orbit." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:test-confirm-burn:camera-pan-orbit-hint"
      },
      createTutorialSpacerRow("tutorial:test-confirm-burn:camera-pan-orbit-hint-spacer"),
      {
        parts: [
          { text: "Left click to confirm transfer " },
          { text: "BURN", className: "player-highlight" },
          { text: "." }
        ],
        className: tutorialDelayedLiveHintClassName,
        key: "tutorial:test-confirm-burn"
      }
    ]);
  });

  it("builds the post-replay enemy contact warning with only the warning prefix in red", () => {
    expect(createTutorialEnemyContactVictoryWarningRows()).toEqual([
      createTutorialSpacerRow("tutorial:first-enemy-kill-victory-warning:before"),
      {
        parts: [
          { text: "WARNING:", className: "command-console__event-contested" },
          { text: " enemy contact." }
        ],
        className: tutorialLineClassName
      },
      createTutorialSpacerRow("tutorial:first-enemy-kill-victory-warning:spacer"),
      {
        parts: [
          { text: "Remain the last faction with operational tritium extracting capabilities." }
        ],
        className: tutorialLineClassName
      }
    ]);
  });

  it("builds the post-victory action reminder with semantic action colors", () => {
    expect(createTutorialPostVictoryActionRows("player-highlight")).toEqual([
      createTutorialSpacerRow("tutorial:post-victory-actions:before"),
      {
        parts: [{ text: "Every ship can act once every turn." }],
        className: tutorialLineClassName,
        key: "tutorial:post-victory-actions:intro"
      },
      createTutorialSpacerRow("tutorial:post-victory-actions:between-actions"),
      {
        parts: [
          { text: "Either " },
          { text: "BURN", className: "player-highlight" },
          { text: ", " },
          { text: "FIRE", className: "player-highlight" },
          { text: ", " },
          { text: "WORK", className: "player-highlight" },
          { text: " or " },
          { text: "EVADE", className: "player-highlight" },
          { text: "." }
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
          { text: "." }
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
          { text: "Ships will automatically " },
          { text: "EVADE", className: "player-highlight" },
          { text: " or " },
          { text: "WORK", className: "player-highlight" },
          { text: " to extract Tritium or advance production if they don't " },
          { text: "BURN", className: "player-highlight" },
          { text: " or " },
          { text: "FIRE", className: "player-highlight" },
          { text: "." }
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
      "Ships will automatically EVADE or WORK to extract Tritium or advance production if they don't BURN or FIRE."
    );
  });

  it("places the orbit reminder between blank rows before the shipyard execute prompt", () => {
    expect(createTutorialShipyardProductionRows("player-highlight").slice(-3)).toEqual([
      createTutorialSpacerRow(),
      {
        parts: [{ text: "Right click and drag to orbit." }],
        className: tutorialLineClassName
      },
      createTutorialSpacerRow()
    ]);
  });

  it("explains how to disengage from a contested shipyard orbit", () => {
    const rows = createTutorialShipyardContestedRuleRows("player-highlight");

    expect(rows.at(-1)).toEqual({
      parts: [
        { text: "To disengage, " },
        { text: "BURN", className: "player-highlight" },
        { text: " to any other orbit." }
      ],
      className: tutorialLineClassName
    });

    const expandedRows = expandTutorialSentenceRows(rows, "tutorial:test-contested");
    const disengageRowIndex = expandedRows.findIndex((row) => {
      return (
        row.parts.map((part) => part.text).join("") === "To disengage, BURN to any other orbit."
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
        parts: [{ text: "Mouse wheel to zoom in / out." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:live-zoom-focus-hint:zoom"
      },
      createTutorialSpacerRow("tutorial:live-zoom-focus-hint:spacer"),
      {
        parts: [{ text: "Double click to focus." }],
        className: tutorialCompleteHintClassName,
        key: "tutorial:live-zoom-focus-hint:focus"
      },
      {
        parts: [{ text: "Left click and drag to pan. Right click and drag to orbit." }],
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
      promptPhase: "shipyardFirePrompt"
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
      promptPhase: "shipyardContestedFirePrompt"
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
