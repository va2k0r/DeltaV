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

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
