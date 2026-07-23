import type { TutorialRuntimeState } from "./runtimeTypes";

export function createTutorialRuntimeDiagnosticDump(
  tutorialState: TutorialRuntimeState | null
): Readonly<Record<string, unknown>> | null {
  if (tutorialState === null) {
    return null;
  }

  const { loggedKeys, timers, ...tutorial } = tutorialState;

  return {
    ...tutorial,
    timerCount: timers.length,
    timers: [...timers],
    loggedKeys: [...loggedKeys].sort()
  };
}
