import { replayTimelineSecondsPerTurn } from "../renderers/cinematic3d/replayDestructionTimeline";

export const fixedTimelineReviewReplayTurnDurationMs = replayTimelineSecondsPerTurn * 1_000;
export const fixedTimelineReviewRewindTurnDurationMs = fixedTimelineReviewReplayTurnDurationMs;

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
