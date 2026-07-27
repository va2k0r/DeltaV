export type DampedCameraControlVelocityOptions = Readonly<{
  current: number;
  target: number;
  deltaSeconds: number;
  accelerationTimeConstantMs: number;
  releaseTimeConstantMs: number;
  stopEpsilon: number;
}>;

/**
 * Smooths held camera controls and, crucially, preserves a short release tail instead of changing
 * from full speed to zero in one frame.
 */
export function resolveDampedCameraControlVelocity(
  options: DampedCameraControlVelocityOptions
): number {
  const isReleasing = Math.abs(options.target) <= options.stopEpsilon;
  const timeConstantMs = isReleasing
    ? options.releaseTimeConstantMs
    : options.accelerationTimeConstantMs;
  const smoothing =
    options.deltaSeconds <= 0
      ? 0
      : 1 - Math.exp(-(options.deltaSeconds * 1000) / Math.max(1, timeConstantMs));
  const next = options.current + (options.target - options.current) * smoothing;

  return isReleasing && Math.abs(next) <= options.stopEpsilon ? 0 : next;
}
