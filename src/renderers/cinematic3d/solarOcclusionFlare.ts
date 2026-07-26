export type SolarOcclusionScreenDisc = Readonly<{
  x: number;
  y: number;
  radius: number;
}>;

export type SolarOcclusionTransientState = Readonly<{
  armed: boolean;
  previousCoverage: number;
  peakCoverage: number;
  flareStartedAt: number | null;
  flareStrength: number;
}>;

export type SolarOcclusionTransientOptions = Readonly<{
  elapsed: number;
  coverage: number;
  durationSeconds: number;
  armCoverage?: number;
  releaseCoverage?: number;
}>;

const defaultArmCoverage = 0.82;
const defaultReleaseCoverage = 0.68;

export function createInitialSolarOcclusionTransientState(): SolarOcclusionTransientState {
  return {
    armed: false,
    previousCoverage: 0,
    peakCoverage: 0,
    flareStartedAt: null,
    flareStrength: 0
  };
}

export function computeSolarDiscOcclusionCoverage(
  sun: SolarOcclusionScreenDisc,
  occluder: SolarOcclusionScreenDisc
): number {
  const sunRadius = Math.max(0, sun.radius);
  const occluderRadius = Math.max(0, occluder.radius);

  if (sunRadius <= 0 || occluderRadius <= 0) {
    return 0;
  }

  const centerDistance = Math.hypot(occluder.x - sun.x, occluder.y - sun.y);

  if (centerDistance >= sunRadius + occluderRadius) {
    return 0;
  }

  const sunArea = Math.PI * sunRadius * sunRadius;

  if (centerDistance <= Math.abs(sunRadius - occluderRadius)) {
    const overlapRadius = Math.min(sunRadius, occluderRadius);
    return clamp((Math.PI * overlapRadius * overlapRadius) / sunArea, 0, 1);
  }

  const sunAngle = Math.acos(
    clamp(
      (centerDistance * centerDistance + sunRadius * sunRadius - occluderRadius * occluderRadius) /
        (2 * centerDistance * sunRadius),
      -1,
      1
    )
  );
  const occluderAngle = Math.acos(
    clamp(
      (centerDistance * centerDistance + occluderRadius * occluderRadius - sunRadius * sunRadius) /
        (2 * centerDistance * occluderRadius),
      -1,
      1
    )
  );
  const lensTriangleArea =
    0.5 *
    Math.sqrt(
      Math.max(
        0,
        (-centerDistance + sunRadius + occluderRadius) *
          (centerDistance + sunRadius - occluderRadius) *
          (centerDistance - sunRadius + occluderRadius) *
          (centerDistance + sunRadius + occluderRadius)
      )
    );
  const overlapArea =
    sunRadius * sunRadius * sunAngle +
    occluderRadius * occluderRadius * occluderAngle -
    lensTriangleArea;

  return clamp(overlapArea / sunArea, 0, 1);
}

export function computeSolarOcclusionDistanceVisibility(
  cameraDistance: number,
  fadeStart: number,
  fadeEnd: number
): number {
  return 1 - smoothStep(fadeStart, Math.max(fadeStart + 0.0001, fadeEnd), cameraDistance);
}

export function computeSolarLimbGlintStrength(coverage: number): number {
  const clampedCoverage = clamp(coverage, 0, 1);
  const eclipseContact = smoothStep(0.04, 0.52, clampedCoverage);
  const fullyHiddenFade = 1 - smoothStep(0.92, 0.995, clampedCoverage);

  return eclipseContact * fullyHiddenFade;
}

export function advanceSolarOcclusionTransientState(
  previous: SolarOcclusionTransientState,
  options: SolarOcclusionTransientOptions
): SolarOcclusionTransientState {
  const coverage = clamp(options.coverage, 0, 1);
  const armCoverage = clamp(options.armCoverage ?? defaultArmCoverage, 0, 1);
  const releaseCoverage = clamp(options.releaseCoverage ?? defaultReleaseCoverage, 0, armCoverage);
  const durationSeconds = Math.max(0.001, options.durationSeconds);
  let armed = previous.armed;
  let peakCoverage = previous.peakCoverage;
  let flareStartedAt = previous.flareStartedAt;

  if (coverage >= armCoverage) {
    armed = true;
    peakCoverage = Math.max(peakCoverage, coverage);
  }

  const isReemerging =
    armed &&
    previous.previousCoverage > releaseCoverage &&
    coverage <= releaseCoverage &&
    coverage < previous.previousCoverage;

  if (isReemerging) {
    flareStartedAt = options.elapsed;
    armed = false;
    peakCoverage = 0;
  }

  const flareStrength =
    flareStartedAt === null
      ? 0
      : computeSolarReemergencePulse(options.elapsed - flareStartedAt, durationSeconds);

  if (flareStrength <= 0 && flareStartedAt !== null && options.elapsed > flareStartedAt) {
    flareStartedAt = null;
  }

  if (!armed && coverage <= releaseCoverage && flareStartedAt === null) {
    peakCoverage = 0;
  }

  return {
    armed,
    previousCoverage: coverage,
    peakCoverage,
    flareStartedAt,
    flareStrength
  };
}

export function computeSolarReemergencePulse(
  elapsedSinceStart: number,
  durationSeconds: number
): number {
  const duration = Math.max(0.001, durationSeconds);
  const progress = elapsedSinceStart / duration;

  if (progress < 0 || progress >= 1) {
    return 0;
  }

  const attack = smoothStep(0, 0.075, progress);
  const decay = 1 - smoothStep(0.04, 1, progress);

  return attack * decay * decay;
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  const progress = clamp((value - edge0) / Math.max(0.0001, edge1 - edge0), 0, 1);
  return progress * progress * (3 - 2 * progress);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
