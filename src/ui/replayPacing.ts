const shortRewindDurationMs = 720;
const rewindDistanceGrowthMs = 260;
const maximumRewindDurationMs = 2200;

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
  return clampedProgress * clampedProgress;
}
