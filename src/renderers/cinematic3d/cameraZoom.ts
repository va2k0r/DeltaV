export const wheelZoomMinimumDistanceSettleEpsilon = 0.8;

export type WheelZoomStepInput = Readonly<{
  factor: number;
  distance: number;
  pendingTargetDistance: number | null;
  minimumDistance: number;
  zoomOutLimit: number;
  zoomOutDistanceEpsilon: number;
}>;

export type WheelZoomStep = Readonly<{
  baseDistance: number;
  nextDistance: number;
  isZoomingInAtMinimumDistance: boolean;
  isAtZoomOutLimit: boolean;
  isZoomingOutInOverview: boolean;
  isDistanceNoop: boolean;
}>;

export type ArrivalOrbitHandoffDistanceInput = Readonly<{
  shipDetailProgress: number;
  minimumShipDetailProgress: number;
  closeDistance: number;
  wideDistance: number;
}>;

export function resolveWheelZoomStep(input: WheelZoomStepInput): WheelZoomStep {
  const isZoomingInAtMinimumDistance =
    input.factor < 1 &&
    input.distance <= input.minimumDistance + wheelZoomMinimumDistanceSettleEpsilon;
  const pendingWheelDistance = input.pendingTargetDistance ?? input.distance;
  const baseDistance = isZoomingInAtMinimumDistance
    ? input.minimumDistance
    : input.factor < 1
      ? Math.min(pendingWheelDistance, input.distance)
      : Math.max(pendingWheelDistance, input.distance);
  const nextDistance = clamp(
    baseDistance * input.factor,
    input.minimumDistance,
    input.zoomOutLimit
  );
  const isAtZoomOutLimit =
    input.factor > 1 && baseDistance >= input.zoomOutLimit - input.zoomOutDistanceEpsilon;
  const isZoomingOutInOverview =
    input.factor > 1 && baseDistance >= input.zoomOutLimit * 0.88 && nextDistance >= baseDistance;

  return {
    baseDistance,
    nextDistance,
    isZoomingInAtMinimumDistance,
    isAtZoomOutLimit,
    isZoomingOutInOverview,
    isDistanceNoop: Math.abs(nextDistance - baseDistance) <= input.zoomOutDistanceEpsilon
  };
}

export function constrainChaseDistanceByWheelTarget(
  nextDistance: number,
  currentDistance: number,
  pendingTargetDistance: number | null
): number {
  if (pendingTargetDistance !== null && pendingTargetDistance < currentDistance) {
    return Math.min(nextDistance, currentDistance);
  }

  return nextDistance;
}

export function resolveArrivalOrbitHandoffProgress(elapsedMs: number, durationMs: number): number {
  const progress = clamp(elapsedMs / Math.max(1, durationMs), 0, 1);
  return progress * progress * progress * (progress * (progress * 6 - 15) + 10);
}

export function resolveArrivalOrbitHandoffDistance(
  input: ArrivalOrbitHandoffDistanceInput
): number {
  const closeDistance = Math.max(0, input.closeDistance);
  const wideDistance = Math.max(closeDistance, input.wideDistance);
  const detailRange = Math.max(0.001, 1 - input.minimumShipDetailProgress);
  const normalizedDetail = clamp(
    (input.shipDetailProgress - input.minimumShipDetailProgress) / detailRange,
    0,
    1
  );
  const easedDetail =
    normalizedDetail *
    normalizedDetail *
    normalizedDetail *
    (normalizedDetail * (normalizedDetail * 6 - 15) + 10);
  return wideDistance + (closeDistance - wideDistance) * easedDetail;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
