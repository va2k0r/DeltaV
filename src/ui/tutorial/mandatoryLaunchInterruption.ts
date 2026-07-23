import type { TutorialPhase } from "./runtimeTypes";

/**
 * A mandatory launch may be created while a tutorial sequence is auto-resolving turns.
 * Keep that interruption distinct from the launch the tutorial has already queued, so a
 * second shipyard output cannot be skipped accidentally.
 */
export function isTutorialMandatoryLaunchHandlingPhase(phase: TutorialPhase): boolean {
  return phase === "mandatoryLaunch" || phase === "mandatoryLaunchQueued";
}

export function shouldInterruptTutorialForMandatoryLaunch(options: {
  phase: TutorialPhase;
  activeMandatoryLaunchId: string | null;
  nextMandatoryLaunchId: string | null;
}): boolean {
  if (options.nextMandatoryLaunchId === null) {
    return false;
  }

  return (
    !isTutorialMandatoryLaunchHandlingPhase(options.phase) ||
    options.activeMandatoryLaunchId !== options.nextMandatoryLaunchId
  );
}

export function getTutorialMandatoryLaunchResumePhase(
  currentPhase: TutorialPhase,
  existingResumePhase: TutorialPhase | null
): TutorialPhase | null {
  if (existingResumePhase !== null || isTutorialMandatoryLaunchHandlingPhase(currentPhase)) {
    return existingResumePhase;
  }

  return currentPhase;
}

/**
 * A turn resolver owns the temporary skip lock only while its tutorial phase is unchanged.
 * Interrupting into a manual prompt must not re-apply that stale lock on return.
 */
export function shouldRestoreTutorialAutoAdvanceLock(
  phaseBeforeTurn: TutorialPhase,
  phaseAfterTurn: TutorialPhase
): boolean {
  return phaseBeforeTurn === phaseAfterTurn;
}
