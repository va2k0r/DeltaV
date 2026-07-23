import { tutorialOpeningOriginNodeId } from "./constants";
import type { TutorialRuntimeState } from "./runtimeTypes";

export function isTutorialTargetInputAllowed(
  tutorial: Pick<TutorialRuntimeState, "phase" | "inputLocked" | "autoAdvanceActive"> | null,
  targetKey: string
): boolean {
  if (tutorial?.inputLocked === true || tutorial?.autoAdvanceActive === true) {
    return false;
  }

  return (
    tutorial?.phase !== "awaitingInitialSelection" ||
    targetKey === `node:${tutorialOpeningOriginNodeId}`
  );
}

export function getTutorialRequiredShipSelectionRecoveryTargetKey(
  tutorial: Pick<TutorialRuntimeState, "phase"> | null,
  selectedTargetKey: string | null,
  requiredNodeId: string | null
): string | null {
  if (
    tutorial === null ||
    selectedTargetKey !== null ||
    requiredNodeId === null ||
    tutorial.phase === "awaitingInitialSelection"
  ) {
    return null;
  }

  return `node:${requiredNodeId}`;
}
