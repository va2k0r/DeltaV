const shortRewindDurationMs = 640;
const rewindDistanceGrowthMs = 190;
const maximumRewindDurationMs = 1800;
export const fixedTimelineReviewTurnDurationMs = 860;

export function getAdaptiveRewindDurationMs(distanceTurns: number): number {
  if (!Number.isFinite(distanceTurns) || distanceTurns <= 0) {
    return 0;
  }

  const durationMs =
    shortRewindDurationMs + rewindDistanceGrowthMs * (Math.sqrt(distanceTurns) - 1);

  return Math.min(maximumRewindDurationMs, Math.max(shortRewindDurationMs, durationMs));
}

export function easeAdaptiveRewindProgress(progress: number): number {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  return (
    clampedProgress *
    clampedProgress *
    clampedProgress *
    (clampedProgress * (clampedProgress * 6 - 15) + 10)
  );
}

export function getFixedTimelineReviewDurationMs(
  startPosition: number,
  targetPosition: number,
  turnDurationMs = fixedTimelineReviewTurnDurationMs
): number {
  if (
    !Number.isFinite(startPosition) ||
    !Number.isFinite(targetPosition) ||
    !Number.isFinite(turnDurationMs) ||
    turnDurationMs <= 0
  ) {
    return 0;
  }

  return Math.abs(targetPosition - startPosition) * turnDurationMs;
}

export function sampleFixedTimelineReviewPosition(
  startPosition: number,
  targetPosition: number,
  elapsedMs: number,
  turnDurationMs = fixedTimelineReviewTurnDurationMs
): number {
  const durationMs = getFixedTimelineReviewDurationMs(
    startPosition,
    targetPosition,
    turnDurationMs
  );

  if (durationMs <= 0) {
    return targetPosition;
  }

  const progress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return startPosition + (targetPosition - startPosition) * progress;
}
