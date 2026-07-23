export type SolarBloomViewportInput = Readonly<{
  x: number;
  y: number;
  radius: number;
  width: number;
  height: number;
  maximumStrength: number;
}>;

export type CinematicBloomStrengthInput = Readonly<{
  globalIntensity: number;
}>;

export type ApparentBodyBloomSourceGainInput = Readonly<{
  baseGain: number;
  minimumGain: number;
  apparentRadiusPixels: number;
  referenceRadiusPixels: number;
  falloffExponent: number;
}>;

const solarBloomEdgeContactFactor = 0.03;
const solarBloomApproachViewportRatio = 0.075;
const solarBloomFullOverlapViewportRatio = 0.18;

export function computeLocalizedSunBloomStrength(input: SolarBloomViewportInput): number {
  const width = Math.max(1, input.width);
  const height = Math.max(1, input.height);
  const viewportMinimum = Math.min(width, height);
  const radius = Math.max(1, input.radius);
  const maximumStrength = Math.max(0, input.maximumStrength);
  const outsideX = input.x < 0 ? -input.x : input.x > width ? input.x - width : 0;
  const outsideY = input.y < 0 ? -input.y : input.y > height ? input.y - height : 0;
  const outsideDistance = Math.hypot(outsideX, outsideY);
  const approachFeather = Math.max(
    24,
    viewportMinimum * solarBloomApproachViewportRatio,
    radius * 0.35
  );
  const viewportFactor = computeSolarViewportFactor(
    outsideDistance,
    radius,
    approachFeather,
    viewportMinimum
  );
  const radiusProgress = smootherStep(0.006, 0.07, radius / viewportMinimum);
  const apparentSizeFactor = lerp(0.28, 1, radiusProgress);

  return maximumStrength * viewportFactor * apparentSizeFactor;
}

export function computeCinematicBloomStrength(input: CinematicBloomStrengthInput): number {
  return Math.max(0, input.globalIntensity);
}

export function computeApparentBodyBloomSourceGain(
  input: ApparentBodyBloomSourceGainInput
): number {
  const baseGain = Math.max(0, input.baseGain);
  const minimumGain = clamp(input.minimumGain, 0, baseGain);
  const apparentRadiusPixels = Math.max(0, input.apparentRadiusPixels);
  const referenceRadiusPixels = Math.max(1, input.referenceRadiusPixels);

  if (apparentRadiusPixels <= referenceRadiusPixels) {
    return baseGain;
  }

  const radiusRatio = referenceRadiusPixels / apparentRadiusPixels;
  const compensatedGain = baseGain * radiusRatio ** Math.max(0.01, input.falloffExponent);
  return clamp(compensatedGain, minimumGain, baseGain);
}

function computeSolarViewportFactor(
  outsideDistance: number,
  radius: number,
  approachFeather: number,
  viewportMinimum: number
): number {
  if (outsideDistance >= radius + approachFeather) {
    return 0;
  }

  if (outsideDistance >= radius) {
    const approachProgress = 1 - smootherStep(radius, radius + approachFeather, outsideDistance);
    return solarBloomEdgeContactFactor * approachProgress;
  }

  const overlapDepth = radius - outsideDistance;
  const fullBloomDepth = Math.max(
    1,
    Math.min(radius, viewportMinimum * solarBloomFullOverlapViewportRatio)
  );
  const overlapProgress = smootherStep(0, fullBloomDepth, overlapDepth);

  return lerp(solarBloomEdgeContactFactor, 1, overlapProgress);
}

function smootherStep(edge0: number, edge1: number, value: number): number {
  if (edge1 <= edge0) {
    return value >= edge1 ? 1 : 0;
  }

  const progress = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

function lerp(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
