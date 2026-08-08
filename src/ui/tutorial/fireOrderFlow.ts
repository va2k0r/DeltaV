import type { TutorialRuntimeState } from "./runtimeTypes";

export type TutorialFireOrderReference = Readonly<{
  factionId: string;
  originNodeId: string;
  targetNodeId: string;
  targetFactionId: string;
}>;

export type TutorialQueuedFireLesson = Readonly<{
  queuedPhase: "shipyardFireQueued" | "shipyardContestedFireQueued";
  promptPhase: "shipyardFirePrompt" | "shipyardContestedFirePrompt";
  originNodeId: string;
  targetNodeId: string;
  frozenLiveHintLogKey: string;
  liveHintKeyPrefix: string;
}>;

type TutorialFireLessonRuntimeState = Pick<
  TutorialRuntimeState,
  "phase" | "shipyardLessonNodeId" | "shipyardEnemyDestinationNodeId" | "shipyardSupportFireNodeId"
>;

export function getTutorialQueuedFireLesson(
  tutorial: TutorialFireLessonRuntimeState,
  contestedTargetNodeId: string | null
): TutorialQueuedFireLesson | null {
  if (tutorial.phase === "shipyardFireQueued" && tutorial.shipyardEnemyDestinationNodeId !== null) {
    return {
      queuedPhase: "shipyardFireQueued",
      promptPhase: "shipyardFirePrompt",
      originNodeId: tutorial.shipyardLessonNodeId,
      targetNodeId: tutorial.shipyardEnemyDestinationNodeId,
      frozenLiveHintLogKey: "tutorial:shipyard-fire-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-shipyard-fire"
    };
  }

  if (
    tutorial.phase === "shipyardContestedFireQueued" &&
    tutorial.shipyardSupportFireNodeId !== null &&
    contestedTargetNodeId !== null
  ) {
    return {
      queuedPhase: "shipyardContestedFireQueued",
      promptPhase: "shipyardContestedFirePrompt",
      originNodeId: tutorial.shipyardSupportFireNodeId,
      targetNodeId: contestedTargetNodeId,
      frozenLiveHintLogKey: "tutorial:shipyard-contested-fire-live-hints-frozen",
      liveHintKeyPrefix: "tutorial:live-confirm-shipyard-contested-fire"
    };
  }

  return null;
}

export function isOrderForTutorialQueuedFireLesson(
  order: TutorialFireOrderReference,
  lesson: TutorialQueuedFireLesson
): boolean {
  return (
    order.factionId === "player" &&
    order.targetFactionId === "opponent" &&
    order.originNodeId === lesson.originNodeId &&
    order.targetNodeId === lesson.targetNodeId
  );
}

export function findTutorialQueuedFireOrder<TOrder extends TutorialFireOrderReference>(
  tutorial: TutorialFireLessonRuntimeState,
  contestedTargetNodeId: string | null,
  pendingOrders: readonly TOrder[]
): TOrder | undefined {
  const lesson = getTutorialQueuedFireLesson(tutorial, contestedTargetNodeId);

  if (lesson === null) {
    return undefined;
  }

  return pendingOrders.find((order) => isOrderForTutorialQueuedFireLesson(order, lesson));
}

export function recoverTutorialQueuedFireLessonAfterCancellation(
  tutorial: TutorialRuntimeState,
  contestedTargetNodeId: string | null,
  cancelledOrder: TutorialFireOrderReference,
  promptStartedAt: number
): TutorialQueuedFireLesson | null {
  const lesson = getTutorialQueuedFireLesson(tutorial, contestedTargetNodeId);

  if (lesson === null || !isOrderForTutorialQueuedFireLesson(cancelledOrder, lesson)) {
    return null;
  }

  tutorial.phase = lesson.promptPhase;
  tutorial.inputLocked = false;
  tutorial.autoAdvanceActive = false;

  if (lesson.promptPhase === "shipyardFirePrompt") {
    tutorial.shipyardEnemyFireImpactTurn = null;
    tutorial.shipyardEnemyEvadeObserved = false;
    tutorial.shipyardFirePromptStartedAt = promptStartedAt;
  } else {
    tutorial.shipyardSupportFirePromptStartedAt = promptStartedAt;
  }

  return lesson;
}

export function removeTutorialFireLiveHintRowsAfterCancellation<
  TRow extends Readonly<{ key?: string }>
>(rows: readonly TRow[], lesson: TutorialQueuedFireLesson): readonly TRow[] {
  return rows.filter((row) => row.key?.startsWith(lesson.liveHintKeyPrefix) !== true);
}
