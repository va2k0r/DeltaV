export type MissileImpactCameraDistanceOptions = Readonly<{
  aspect: number;
  bodyRadius: number;
  currentDistance: number;
  fovRadians: number;
  maximumDistance: number;
  minimumDistance: number;
  orbitRadius: number;
  pitch: number;
}>;

export function getMissileImpactCameraTravelDurationMs(
  turnDurationMs: number,
  impactProgress: number
): number {
  const impactAtMs = Math.max(1, turnDurationMs) * clamp(impactProgress, 0, 1);
  return Math.min(620, Math.max(1, impactAtMs * 0.58));
}

export function getPredictedMissileImpactElapsed(options: {
  durationMs: number;
  impactProgress: number;
  now: number;
  presentationElapsed: number;
  transitionStartedAt: number;
}): number {
  const delaySeconds = Math.max(0, options.transitionStartedAt - options.now) / 1000;
  const flightSeconds =
    (Math.max(0, options.durationMs) * clamp(options.impactProgress, 0, 1)) / 1000;
  return options.presentationElapsed + delaySeconds + flightSeconds;
}

export function getMissileImpactCameraDistance(
  options: MissileImpactCameraDistanceOptions
): number {
  const visibleRadius = Math.max(
    4,
    Math.max(0, options.bodyRadius) * 1.25,
    Math.max(0, options.orbitRadius) * 1.8
  );
  const fovTangent = Math.max(0.001, Math.tan(Math.max(0.001, options.fovRadians) * 0.5));
  const aspectScale = Math.max(0.45, Math.min(1, options.aspect));
  const pitchScale = Math.max(0.4, Math.sin(options.pitch));
  const requiredDistance = (visibleRadius * 1.55) / (fovTangent * aspectScale * pitchScale);

  return clamp(
    Math.max(options.currentDistance, requiredDistance),
    options.minimumDistance,
    options.maximumDistance
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
