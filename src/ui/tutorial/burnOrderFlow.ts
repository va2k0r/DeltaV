import type { TutorialRuntimeState } from "./runtimeTypes";

export type TutorialBurnOrderReference = Readonly<{
  factionId: string;
  originNodeId: string;
  destinationNodeId: string;
  mandatoryLaunchId?: string;
}>;

export type TutorialQueuedBurnLesson = Readonly<{
  queuedPhase:
    | "firstBurnQueued"
    | "productiveBurnQueued"
    | "mandatoryLaunchQueued"
    | "shipyardCounterContestBurnQueued"
    | "enemyBurnQueued"
    | "burnOutQueued";
  promptPhase:
    | "awaitingFirstBurnPreview"
    | "awaitingProductiveBurnPreview"
    | "mandatoryLaunch"
    | "shipyardCounterContestBurnPrompt"
    | "enemyBurnTarget"
    | "awaitingBurnOut";
  frozenLiveHintLogKey: string | null;
  liveHintKeyPrefix: string | null;
}>;

type TutorialBurnCancellationOptions = Readonly<{
  openingOriginNodeId: string;
  contestedTargetNodeId: string | null;
  cancelledOrder: TutorialBurnOrderReference;
  promptStartedAt: number;
}>;

function matchesDestination(cachedDestinationNodeId: string | null, actualNodeId: string): boolean {
  return cachedDestinationNodeId === null || cachedDestinationNodeId === actualNodeId;
}

function getTutorialQueuedBurnLesson(
  tutorial: TutorialRuntimeState,
  options: TutorialBurnCancellationOptions
): TutorialQueuedBurnLesson | null {
  const order = options.cancelledOrder;

  if (order.factionId !== "player") {
    return null;
  }

  if (
    tutorial.phase === "firstBurnQueued" &&
    order.originNodeId === options.openingOriginNodeId &&
    matchesDestination(tutorial.firstBurnDestinationNodeId, order.destinationNodeId)
  ) {
    return {
      queuedPhase: "firstBurnQueued",
      promptPhase: "awaitingFirstBurnPreview",
      frozenLiveHintLogKey: "tutorial:first-burn-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-first-burn"
    };
  }

  if (
    tutorial.phase === "productiveBurnQueued" &&
    order.originNodeId === tutorial.productiveBurnOriginNodeId &&
    matchesDestination(tutorial.productiveBurnDestinationNodeId, order.destinationNodeId)
  ) {
    return {
      queuedPhase: "productiveBurnQueued",
      promptPhase: "awaitingProductiveBurnPreview",
      frozenLiveHintLogKey: "tutorial:productive-burn-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-productive-burn"
    };
  }

  if (
    tutorial.phase === "mandatoryLaunchQueued" &&
    tutorial.activeMandatoryLaunchId !== null &&
    order.mandatoryLaunchId === tutorial.activeMandatoryLaunchId
  ) {
    return {
      queuedPhase: "mandatoryLaunchQueued",
      promptPhase: "mandatoryLaunch",
      frozenLiveHintLogKey: null,
      liveHintKeyPrefix: null
    };
  }

  if (
    tutorial.phase === "shipyardCounterContestBurnQueued" &&
    order.originNodeId === tutorial.shipyardCounterContestOriginNodeId &&
    options.contestedTargetNodeId !== null &&
    order.destinationNodeId === options.contestedTargetNodeId
  ) {
    return {
      queuedPhase: "shipyardCounterContestBurnQueued",
      promptPhase: "shipyardCounterContestBurnPrompt",
      frozenLiveHintLogKey: "tutorial:shipyard-counter-contest-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-counter-contest-burn"
    };
  }

  if (
    tutorial.phase === "enemyBurnQueued" &&
    tutorial.enemyNodeId !== null &&
    order.destinationNodeId === tutorial.enemyNodeId
  ) {
    return {
      queuedPhase: "enemyBurnQueued",
      promptPhase: "enemyBurnTarget",
      frozenLiveHintLogKey: null,
      liveHintKeyPrefix: "tutorial:live-confirm-enemy-burn"
    };
  }

  if (
    tutorial.phase === "burnOutQueued" &&
    order.originNodeId === tutorial.defensivePlayerNodeId &&
    matchesDestination(tutorial.defensiveEscapeNodeId, order.destinationNodeId)
  ) {
    return {
      queuedPhase: "burnOutQueued",
      promptPhase: "awaitingBurnOut",
      frozenLiveHintLogKey: null,
      liveHintKeyPrefix: "tutorial:live-confirm-burn-out"
    };
  }

  return null;
}

function resetSharedBurnTracking(tutorial: TutorialRuntimeState): void {
  tutorial.tutorialBurnDestinationNodeId = null;
  tutorial.tutorialBurnArrivalTurn = null;
  tutorial.inputLocked = false;
  tutorial.autoAdvanceActive = false;
}

/** Restore the exact tutorial decision that owned a player BURN cancelled before EXECUTE. */
export function recoverTutorialQueuedBurnLessonAfterCancellation(
  tutorial: TutorialRuntimeState,
  options: TutorialBurnCancellationOptions
): TutorialQueuedBurnLesson | null {
  const lesson = getTutorialQueuedBurnLesson(tutorial, options);

  if (lesson === null) {
    return null;
  }

  tutorial.phase = lesson.promptPhase;
  resetSharedBurnTracking(tutorial);

  switch (lesson.queuedPhase) {
    case "firstBurnQueued":
      tutorial.firstBurnPreviewDestinationNodeId = null;
      tutorial.firstBurnDestinationNodeId = null;
      tutorial.firstBurnArrivalTurn = null;
      tutorial.firstBurnReselectionStartedAt = options.promptStartedAt;
      break;
    case "productiveBurnQueued":
      tutorial.productiveBurnDestinationNodeId = null;
      tutorial.productiveBurnArrivalTurn = null;
      tutorial.productiveBurnPromptStartedAt = options.promptStartedAt;
      tutorial.productiveBurnReselectionStartedAt = null;
      break;
    case "shipyardCounterContestBurnQueued":
      tutorial.shipyardCounterContestArrivalTurn = null;
      tutorial.shipyardCounterContestAutoAdvanceConsumed = false;
      tutorial.shipyardContestedPromptStartedAt = options.promptStartedAt;
      break;
    case "enemyBurnQueued":
      if (tutorial.contestedNodeId === options.cancelledOrder.destinationNodeId) {
        tutorial.contestedNodeId = null;
      }
      break;
    case "burnOutQueued":
      tutorial.defensiveEscapeNodeId = null;
      break;
    case "mandatoryLaunchQueued":
      // Keep both the launch identity and its interrupted continuation. The core restores the same
      // mandatory launch when its pending BURN is cancelled.
      break;
  }

  return lesson;
}

export function removeTutorialBurnLiveHintRowsAfterCancellation<
  TRow extends Readonly<{ key?: string }>
>(rows: readonly TRow[], lesson: TutorialQueuedBurnLesson): readonly TRow[] {
  if (lesson.liveHintKeyPrefix === null) {
    return rows;
  }

  return rows.filter((row) => row.key?.startsWith(lesson.liveHintKeyPrefix ?? "") !== true);
}
