const shortRewindDurationMs = 640;
const rewindDistanceGrowthMs = 190;
const maximumRewindDurationMs = 1800;

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
