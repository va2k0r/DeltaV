import * as THREE from "three";

export const canonicalFirePreviewGeometryEnabled = true;
export const canonicalFirePreviewTargetMode = "orbit-center" as const;
export const firePreviewImpactGapPixels = 1.8;

export type FirePreviewGeometry = Readonly<{
  flightPoints: readonly THREE.Vector3[];
  impactCenter: THREE.Vector3;
  reflectionPoints: readonly THREE.Vector3[];
}>;

export type FirePreviewGeometryOptions = Readonly<{
  departureDirection?: THREE.Vector3;
  etaTurns: number;
  impactCenter: THREE.Vector3;
  origin: THREE.Vector3;
}>;

const minimumSampleCount = 56;
const maximumSampleCount = 96;
const reflectionVerticalScale = 0.46;
const reflectionMinimumDepth = 3;
const reflectionMaximumDepth = 18;
const reflectionDistanceDepthRatio = 0.024;
const endpointConvergenceFraction = 0.18;

/**
 * Builds the complete FIRE preview from one canonical impact anchor.
 *
 * The flight ribbon and its low plane reflection are intentionally returned together. Keeping
 * those two paths in one geometry result prevents a post-process transform from moving the
 * visible reflection away from the impact marker.
 */
export function buildFirePreviewGeometry(options: FirePreviewGeometryOptions): FirePreviewGeometry {
  const origin = options.origin.clone();
  const impactCenter = options.impactCenter.clone();
  const chord = impactCenter.clone().sub(origin);
  const distance = Math.max(0.001, chord.length());
  const direct = getSafeDirection(chord, new THREE.Vector3(1, 0, 0));
  const planarDirect = getSafeDirection(
    new THREE.Vector3(chord.x, 0, chord.z),
    new THREE.Vector3(direct.x, 0, direct.z)
  );
  const departure = getReadableDepartureDirection(options.departureDirection, direct);
  const side = new THREE.Vector3(-planarDirect.z, 0, planarDirect.x).multiplyScalar(
    getStableArcDirection(origin, impactCenter)
  );
  const etaTurns = Math.max(1, options.etaTurns);
  const controlDistance = clamp(
    distance * (0.28 + Math.min(etaTurns, 7) * 0.008),
    1,
    distance * 0.42
  );
  const firstControl = origin.clone().addScaledVector(departure, controlDistance);
  const secondControl = impactCenter.clone().addScaledVector(direct, -controlDistance * 0.82);
  const height = clamp(distance * 0.1 + etaTurns * 1.45, 3.2, Math.max(4.8, distance * 0.28));
  const lateralBow = clamp(distance * 0.075, 0.6, Math.max(1.2, distance * 0.14));
  const sampleCount = Math.round(
    clamp(
      minimumSampleCount + etaTurns * 4 + distance * 0.035,
      minimumSampleCount,
      maximumSampleCount
    )
  );
  const flightPoints: THREE.Vector3[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const endpointSafeBow = Math.sin(Math.PI * progress) ** 2;
    flightPoints.push(
      sampleCubicBezier(origin, firstControl, secondControl, impactCenter, progress)
        .addScaledVector(side, lateralBow * endpointSafeBow)
        .addScaledVector(THREE.Object3D.DEFAULT_UP, height * endpointSafeBow)
    );
  }

  // Assign exact clones after sampling so floating-point interpolation can never move either
  // endpoint away from the rendered launcher or impact marker.
  flightPoints[0] = origin.clone();
  flightPoints[flightPoints.length - 1] = impactCenter.clone();

  const reflectionPoints = buildTrajectoryPlaneReflectionPoints(
    flightPoints,
    origin.y,
    impactCenter.y
  );

  return {
    flightPoints,
    impactCenter,
    reflectionPoints
  };
}

/**
 * Stops the rendered preview before its canonical impact anchor without changing the curve that
 * aims at that anchor. Active missile motion can keep using the complete path while preview
 * ribbons and particles leave the impact X unobstructed.
 */
export function trimFirePreviewPathBeforeImpact(
  points: readonly THREE.Vector3[],
  clearance: number
): THREE.Vector3[] {
  if (points.length < 2 || clearance <= 0) {
    return points.map((point) => point.clone());
  }

  const segmentLengths: number[] = [];
  let totalLength = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength =
      previous === undefined || current === undefined ? 0 : previous.distanceTo(current);
    segmentLengths.push(segmentLength);
    totalLength += segmentLength;
  }

  if (totalLength <= 0.0001) {
    return points.map((point) => point.clone());
  }

  const retainedLength = Math.max(totalLength * 0.1, totalLength - clearance);
  const trimmedPoints: THREE.Vector3[] = [points[0]?.clone() ?? new THREE.Vector3()];
  let traveled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const segmentLength = segmentLengths[index - 1] ?? 0;

    if (previous === undefined || current === undefined || segmentLength <= 0.0001) {
      continue;
    }

    const nextTraveled = traveled + segmentLength;

    if (nextTraveled < retainedLength) {
      trimmedPoints.push(current.clone());
      traveled = nextTraveled;
      continue;
    }

    const segmentProgress = clamp((retainedLength - traveled) / segmentLength, 0, 1);
    trimmedPoints.push(previous.clone().lerp(current, segmentProgress));
    break;
  }

  return trimmedPoints;
}

export function buildTrajectoryPlaneReflectionPoints(
  flightPoints: readonly THREE.Vector3[],
  startPlaneHeight: number,
  endPlaneHeight: number
): THREE.Vector3[] {
  if (flightPoints.length < 2) {
    return [];
  }

  const distance = measurePolylineLength(flightPoints);
  const reflectionDepth = clamp(
    distance * reflectionDistanceDepthRatio,
    reflectionMinimumDepth,
    reflectionMaximumDepth
  );
  const reflectionPoints = flightPoints.map((point, index) => {
    const progress = flightPoints.length <= 1 ? 0 : index / (flightPoints.length - 1);
    const localPlaneHeight = THREE.MathUtils.lerp(startPlaneHeight, endPlaneHeight, progress);
    const heightAbovePlane = Math.max(0, point.y - localPlaneHeight);
    const reflectedHeight =
      localPlaneHeight - reflectionDepth - heightAbovePlane * reflectionVerticalScale;
    const endpointDistance = Math.min(progress, 1 - progress);
    const endpointConvergence = 1 - smootherStep(0, endpointConvergenceFraction, endpointDistance);
    return point.clone().setY(THREE.MathUtils.lerp(reflectedHeight, point.y, endpointConvergence));
  });

  reflectionPoints[0] = flightPoints[0]?.clone() ?? new THREE.Vector3();
  reflectionPoints[reflectionPoints.length - 1] =
    flightPoints[flightPoints.length - 1]?.clone() ?? new THREE.Vector3();
  return reflectionPoints;
}

function measurePolylineLength(points: readonly THREE.Vector3[]): number {
  let distance = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const point = points[index];

    if (previous !== undefined && point !== undefined) {
      distance += previous.distanceTo(point);
    }
  }

  return Math.max(0.001, distance);
}

function getReadableDepartureDirection(
  departureDirection: THREE.Vector3 | undefined,
  direct: THREE.Vector3
): THREE.Vector3 {
  if (departureDirection === undefined || departureDirection.lengthSq() <= 0.0001) {
    return direct.clone();
  }

  const departure = departureDirection.clone().normalize();
  const forwardWeight = THREE.MathUtils.lerp(
    0.34,
    0.68,
    smootherStep(-0.2, 0.86, departure.dot(direct))
  );
  return getSafeDirection(direct.clone().lerp(departure, forwardWeight), direct);
}

function getStableArcDirection(origin: THREE.Vector3, impactCenter: THREE.Vector3): -1 | 1 {
  const signedArea = origin.x * impactCenter.z - origin.z * impactCenter.x;

  if (Math.abs(signedArea) > 0.0001) {
    return signedArea < 0 ? -1 : 1;
  }

  return origin.x + origin.z <= impactCenter.x + impactCenter.z ? 1 : -1;
}

function getSafeDirection(vector: THREE.Vector3, fallback: THREE.Vector3): THREE.Vector3 {
  if (vector.lengthSq() > 0.0001) {
    return vector.clone().normalize();
  }

  if (fallback.lengthSq() > 0.0001) {
    return fallback.clone().normalize();
  }

  return new THREE.Vector3(1, 0, 0);
}

function sampleCubicBezier(
  start: THREE.Vector3,
  firstControl: THREE.Vector3,
  secondControl: THREE.Vector3,
  end: THREE.Vector3,
  progress: number
): THREE.Vector3 {
  const clampedProgress = clamp(progress, 0, 1);
  const inverse = 1 - clampedProgress;
  return start
    .clone()
    .multiplyScalar(inverse ** 3)
    .addScaledVector(firstControl, 3 * inverse ** 2 * clampedProgress)
    .addScaledVector(secondControl, 3 * inverse * clampedProgress ** 2)
    .addScaledVector(end, clampedProgress ** 3);
}

function smootherStep(minimum: number, maximum: number, value: number): number {
  const progress = clamp((value - minimum) / Math.max(0.0001, maximum - minimum), 0, 1);
  return progress ** 3 * (progress * (progress * 6 - 15) + 10);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}
