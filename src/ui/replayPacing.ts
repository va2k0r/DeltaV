import { replayTimelineSecondsPerTurn } from "../renderers/cinematic3d/replayDestructionTimeline";

export const fixedTimelineReviewReplayTurnDurationMs = replayTimelineSecondsPerTurn * 1_000;
export const fixedTimelineReviewRewindTurnDurationMs = fixedTimelineReviewReplayTurnDurationMs;
export const acceleratedTimelineReviewProgressExponent = 2;
export const acceleratedTimelineReviewMinimumDurationScale = 0.45;
export const acceleratedTimelineReviewLogarithmicDurationScale = 0.18;
export const acceleratedTimelineReviewMaximumDurationScale = 1.65;

export function getFixedTimelineReviewDurationMs(
  startPosition: number,
  targetPosition: number,
  turnDurationMs = fixedTimelineReviewReplayTurnDurationMs
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
  turnDurationMs = fixedTimelineReviewReplayTurnDurationMs
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

export function getAcceleratedTimelineReviewDurationMs(
  startPosition: number,
  targetPosition: number,
  turnDurationMs = fixedTimelineReviewReplayTurnDurationMs
): number {
  if (
    !Number.isFinite(startPosition) ||
    !Number.isFinite(targetPosition) ||
    !Number.isFinite(turnDurationMs) ||
    turnDurationMs <= 0
  ) {
    return 0;
  }

  const turnDistance = Math.abs(targetPosition - startPosition);
  const minimumDurationMs = turnDurationMs * acceleratedTimelineReviewMinimumDurationScale;

  if (turnDistance <= 1) {
    return turnDistance * minimumDurationMs;
  }

  return Math.min(
    turnDurationMs * acceleratedTimelineReviewMaximumDurationScale,
    minimumDurationMs +
      Math.log2(turnDistance) * turnDurationMs * acceleratedTimelineReviewLogarithmicDurationScale
  );
}

export function sampleAcceleratedTimelineReviewPosition(
  startPosition: number,
  targetPosition: number,
  elapsedMs: number,
  turnDurationMs = fixedTimelineReviewReplayTurnDurationMs
): number {
  const durationMs = getAcceleratedTimelineReviewDurationMs(
    startPosition,
    targetPosition,
    turnDurationMs
  );

  if (durationMs <= 0) {
    return targetPosition;
  }

  const linearProgress = Math.min(1, Math.max(0, elapsedMs / durationMs));
  const acceleratedProgress = linearProgress ** acceleratedTimelineReviewProgressExponent;
  return startPosition + (targetPosition - startPosition) * acceleratedProgress;
}
