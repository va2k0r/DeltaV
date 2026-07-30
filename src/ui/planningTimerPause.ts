export type PlanningTimerPausePhase = "disabled" | "planning" | "executeCountdown" | "resolving";

export type PlanningTimerDeadlines = Readonly<{
  deadlineAtMs: number;
  executeCountdownEndsAtMs: number;
}>;

export function shiftPlanningTimerDeadlinesAfterPause(
  phase: PlanningTimerPausePhase,
  deadlines: PlanningTimerDeadlines,
  pausedDurationMs: number
): PlanningTimerDeadlines {
  const offsetMs = Math.max(0, pausedDurationMs);

  if (
    offsetMs <= 0 ||
    phase === "disabled" ||
    phase === "resolving" ||
    deadlines.deadlineAtMs <= 0
  ) {
    return deadlines;
  }

  return {
    deadlineAtMs: deadlines.deadlineAtMs + offsetMs,
    executeCountdownEndsAtMs:
      phase === "executeCountdown" && deadlines.executeCountdownEndsAtMs > 0
        ? deadlines.executeCountdownEndsAtMs + offsetMs
        : deadlines.executeCountdownEndsAtMs
  };
}
