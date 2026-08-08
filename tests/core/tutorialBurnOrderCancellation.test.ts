import { describe, expect, it } from "vitest";

import {
  createTutorialRuntimeState,
  recoverTutorialQueuedBurnLessonAfterCancellation,
  removeTutorialBurnLiveHintRowsAfterCancellation
} from "../../src/ui/tutorial/runtimeState";

function createRuntime() {
  return createTutorialRuntimeState({
    startedAt: 100,
    shipyardLessonNodeId: "shipyard_node"
  });
}

describe("tutorial BURN cancellation recovery", () => {
  it("restores a cancelled mandatory launch without losing its interrupted continuation", () => {
    const tutorial = createRuntime();
    tutorial.phase = "mandatoryLaunchQueued";
    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = true;
    tutorial.activeMandatoryLaunchId = "launch:player:shipyard:T12:0";
    tutorial.mandatoryLaunchResumePhase = "shipyardProductionCompletion";
    tutorial.tutorialBurnDestinationNodeId = "venus_node";
    tutorial.tutorialBurnArrivalTurn = 17;

    const lesson = recoverTutorialQueuedBurnLessonAfterCancellation(tutorial, {
      openingOriginNodeId: "moon_node",
      contestedTargetNodeId: null,
      cancelledOrder: {
        factionId: "player",
        originNodeId: "shipyard_node",
        destinationNodeId: "venus_node",
        mandatoryLaunchId: "launch:player:shipyard:T12:0"
      },
      promptStartedAt: 500
    });

    expect(lesson).toMatchObject({
      queuedPhase: "mandatoryLaunchQueued",
      promptPhase: "mandatoryLaunch"
    });
    expect(tutorial).toMatchObject({
      phase: "mandatoryLaunch",
      inputLocked: false,
      autoAdvanceActive: false,
      activeMandatoryLaunchId: "launch:player:shipyard:T12:0",
      mandatoryLaunchResumePhase: "shipyardProductionCompletion",
      tutorialBurnDestinationNodeId: null,
      tutorialBurnArrivalTurn: null
    });
  });

  it("does not let an unrelated cancellation take ownership of a mandatory launch", () => {
    const tutorial = createRuntime();
    tutorial.phase = "mandatoryLaunchQueued";
    tutorial.activeMandatoryLaunchId = "launch:expected";
    tutorial.mandatoryLaunchResumePhase = "autoAdvancingToShipyardEnemyArrival";
    tutorial.tutorialBurnDestinationNodeId = "venus_node";

    expect(
      recoverTutorialQueuedBurnLessonAfterCancellation(tutorial, {
        openingOriginNodeId: "moon_node",
        contestedTargetNodeId: null,
        cancelledOrder: {
          factionId: "player",
          originNodeId: "other_node",
          destinationNodeId: "venus_node",
          mandatoryLaunchId: "launch:unrelated"
        },
        promptStartedAt: 500
      })
    ).toBeNull();
    expect(tutorial.phase).toBe("mandatoryLaunchQueued");
    expect(tutorial.mandatoryLaunchResumePhase).toBe("autoAdvancingToShipyardEnemyArrival");
  });

  it("rewinds opening and productive transfers to a clean selection prompt", () => {
    const first = createRuntime();
    first.phase = "firstBurnQueued";
    first.firstBurnDestinationNodeId = "mars_node";
    first.firstBurnArrivalTurn = 4;
    first.tutorialBurnDestinationNodeId = "mars_node";
    first.tutorialBurnArrivalTurn = 4;

    const firstLesson = recoverTutorialQueuedBurnLessonAfterCancellation(first, {
      openingOriginNodeId: "moon_node",
      contestedTargetNodeId: null,
      cancelledOrder: {
        factionId: "player",
        originNodeId: "moon_node",
        destinationNodeId: "mars_node"
      },
      promptStartedAt: 250
    });

    expect(first.phase).toBe("awaitingFirstBurnPreview");
    expect(first.firstBurnDestinationNodeId).toBeNull();
    expect(first.firstBurnArrivalTurn).toBeNull();
    expect(first.firstBurnReselectionStartedAt).toBe(250);
    expect(first.tutorialBurnDestinationNodeId).toBeNull();
    expect(
      firstLesson === null
        ? []
        : removeTutorialBurnLiveHintRowsAfterCancellation(
            [
              { key: "tutorial:live-confirm-first-burn" },
              { key: "tutorial:live-confirm-first-burn:camera-pan-orbit-hint" },
              { key: "tutorial:first-burn-time-cost" }
            ],
            firstLesson
          )
    ).toEqual([{ key: "tutorial:first-burn-time-cost" }]);

    const productive = createRuntime();
    productive.phase = "productiveBurnQueued";
    productive.productiveBurnOriginNodeId = "mars_node";
    productive.productiveBurnDestinationNodeId = "saturn_node";
    productive.productiveBurnArrivalTurn = 8;
    productive.tutorialBurnDestinationNodeId = "saturn_node";
    productive.tutorialBurnArrivalTurn = 8;

    recoverTutorialQueuedBurnLessonAfterCancellation(productive, {
      openingOriginNodeId: "moon_node",
      contestedTargetNodeId: null,
      cancelledOrder: {
        factionId: "player",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      promptStartedAt: 600
    });

    expect(productive).toMatchObject({
      phase: "awaitingProductiveBurnPreview",
      productiveBurnOriginNodeId: "mars_node",
      productiveBurnDestinationNodeId: null,
      productiveBurnArrivalTurn: null,
      productiveBurnPromptStartedAt: 600,
      tutorialBurnDestinationNodeId: null,
      tutorialBurnArrivalTurn: null
    });
  });

  it("restores every downstream queued BURN decision and clears its stale route", () => {
    const counterContest = createRuntime();
    counterContest.phase = "shipyardCounterContestBurnQueued";
    counterContest.shipyardCounterContestOriginNodeId = "venus_node";
    counterContest.shipyardCounterContestArrivalTurn = 24;
    counterContest.shipyardCounterContestAutoAdvanceConsumed = true;
    counterContest.tutorialBurnDestinationNodeId = "mars_node";
    recoverTutorialQueuedBurnLessonAfterCancellation(counterContest, {
      openingOriginNodeId: "moon_node",
      contestedTargetNodeId: "mars_node",
      cancelledOrder: {
        factionId: "player",
        originNodeId: "venus_node",
        destinationNodeId: "mars_node"
      },
      promptStartedAt: 700
    });
    expect(counterContest).toMatchObject({
      phase: "shipyardCounterContestBurnPrompt",
      shipyardCounterContestArrivalTurn: null,
      shipyardCounterContestAutoAdvanceConsumed: false,
      tutorialBurnDestinationNodeId: null
    });

    const enemy = createRuntime();
    enemy.phase = "enemyBurnQueued";
    enemy.enemyNodeId = "enemy_node";
    enemy.contestedNodeId = "enemy_node";
    enemy.tutorialBurnDestinationNodeId = "enemy_node";
    recoverTutorialQueuedBurnLessonAfterCancellation(enemy, {
      openingOriginNodeId: "moon_node",
      contestedTargetNodeId: null,
      cancelledOrder: {
        factionId: "player",
        originNodeId: "venus_node",
        destinationNodeId: "enemy_node"
      },
      promptStartedAt: 900
    });
    expect(enemy).toMatchObject({
      phase: "enemyBurnTarget",
      contestedNodeId: null,
      tutorialBurnDestinationNodeId: null
    });

    const burnOut = createRuntime();
    burnOut.phase = "burnOutQueued";
    burnOut.defensivePlayerNodeId = "earth_node";
    burnOut.defensiveEscapeNodeId = "moon_node";
    burnOut.tutorialBurnDestinationNodeId = "moon_node";
    recoverTutorialQueuedBurnLessonAfterCancellation(burnOut, {
      openingOriginNodeId: "moon_node",
      contestedTargetNodeId: null,
      cancelledOrder: {
        factionId: "player",
        originNodeId: "earth_node",
        destinationNodeId: "moon_node"
      },
      promptStartedAt: 1000
    });
    expect(burnOut).toMatchObject({
      phase: "awaitingBurnOut",
      defensiveEscapeNodeId: null,
      tutorialBurnDestinationNodeId: null
    });
  });
});
