import type { Bounds, SolarSystemSnapshot, Vec2 } from "../../core";
import type { Cinematic3dVisualTuning } from "./visualTuning";

export type AdaptivePanContext = Readonly<{
  distance: number;
  viewportHeight: number;
  tuning: Pick<
    Cinematic3dVisualTuning,
    | "panCloseSlowdownDistance"
    | "panCloseSlowdownMinimumMultiplier"
    | "panMinWorldUnitsPerPixel"
    | "panMaxWorldUnitsPerPixel"
  >;
}>;

export type FocusedPanReferenceContext = Readonly<{
  cameraPosition: Readonly<{ x: number; y: number; z: number }>;
  focusedTargetPosition: Readonly<{ x: number; y: number; z: number }> | null;
  fallbackDistance: number;
}>;

export type CameraClearanceSphere = Readonly<{
  center: Readonly<{ x: number; y: number; z: number }>;
  radius: number;
}>;

export type CameraClearanceContext = Readonly<{
  focus: Readonly<{ x: number; y: number; z: number }>;
  direction: Readonly<{ x: number; y: number; z: number }>;
  distance: number;
  spheres: readonly CameraClearanceSphere[];
  exitPadding?: number;
}>;

export type CinematicLabelVisibilityState = Readonly<{
  targetKey: string;
  hoveredTargetKey: string | null;
  selectedTargetKey: string | null;
  focusedTargetKey: string | null;
}>;

export type BurnPreviewRoute = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  issuedTurn: number;
  arrivalTurn: number;
}>;

export type MapPlanePanClampContext = Readonly<{
  bounds: Bounds;
  focus: Vec2;
  minimumVisibleFraction: number;
  right: Vec2;
  up: Vec2;
  visibleHalfHeight: number;
  visibleHalfWidth: number;
}>;

export function computeAdaptivePanWorldUnitsPerPixel(context: AdaptivePanContext): number {
  const baseScale = context.distance / Math.max(1, context.viewportHeight);
  const closeProgress = clamp(
    1 - context.distance / Math.max(1, context.tuning.panCloseSlowdownDistance),
    0,
    1
  );
  const easedCloseProgress = closeProgress * closeProgress * (3 - 2 * closeProgress);
  const closeMultiplier =
    1 - easedCloseProgress * (1 - context.tuning.panCloseSlowdownMinimumMultiplier);
  const adaptiveScale = baseScale * closeMultiplier;
  return clamp(
    adaptiveScale,
    context.tuning.panMinWorldUnitsPerPixel,
    context.tuning.panMaxWorldUnitsPerPixel
  );
}

export function computeFocusedPanReferenceDistance(context: FocusedPanReferenceContext): number {
  const target = context.focusedTargetPosition;

  if (target === null) {
    return context.fallbackDistance;
  }

  return Math.max(
    1,
    Math.hypot(
      context.cameraPosition.x - target.x,
      context.cameraPosition.y - target.y,
      context.cameraPosition.z - target.z
    )
  );
}

export function resolveCameraDistanceOutsideSpheres(context: CameraClearanceContext): number {
  const directionLength = Math.hypot(context.direction.x, context.direction.y, context.direction.z);

  if (directionLength <= 0.000001) {
    return Math.max(0, context.distance);
  }

  const direction = {
    x: context.direction.x / directionLength,
    y: context.direction.y / directionLength,
    z: context.direction.z / directionLength
  };
  const intervals = context.spheres.flatMap((sphere) => {
    const radius = Math.max(0, sphere.radius);

    if (radius <= 0) {
      return [];
    }

    const offsetX = context.focus.x - sphere.center.x;
    const offsetY = context.focus.y - sphere.center.y;
    const offsetZ = context.focus.z - sphere.center.z;
    const projectedOffset = offsetX * direction.x + offsetY * direction.y + offsetZ * direction.z;
    const discriminant =
      projectedOffset * projectedOffset -
      (offsetX * offsetX + offsetY * offsetY + offsetZ * offsetZ - radius * radius);

    if (discriminant < 0) {
      return [];
    }

    const root = Math.sqrt(discriminant);
    const entryDistance = -projectedOffset - root;
    const exitDistance = -projectedOffset + root;

    if (exitDistance < 0) {
      return [];
    }

    return [
      {
        entryDistance: Math.max(0, entryDistance),
        exitDistance
      }
    ];
  });
  const exitPadding = Math.max(0, context.exitPadding ?? 0);
  let distance = Math.max(0, context.distance);

  // Advancing past one body can place the camera inside a second overlapping clearance volume.
  // Iterate until the resolved point is outside every interval.
  for (let pass = 0; pass <= intervals.length; pass += 1) {
    let advanced = false;

    for (const interval of intervals) {
      if (
        distance >= interval.entryDistance - 0.000001 &&
        distance <= interval.exitDistance + 0.000001
      ) {
        distance = interval.exitDistance + exitPadding;
        advanced = true;
      }
    }

    if (!advanced) {
      break;
    }
  }

  return distance;
}

export function clampMapPlaneFocusToBounds(context: MapPlanePanClampContext): Vec2 {
  const boundsCorners = [
    { x: context.bounds.minX, y: context.bounds.minY },
    { x: context.bounds.minX, y: context.bounds.maxY },
    { x: context.bounds.maxX, y: context.bounds.minY },
    { x: context.bounds.maxX, y: context.bounds.maxY }
  ];
  const rightSpan = projectBounds(boundsCorners, context.right);
  const upSpan = projectBounds(boundsCorners, context.up);
  const focusRight = projectPoint(context.focus, context.right);
  const focusUp = projectPoint(context.focus, context.up);
  const clampedRight = clampFocusProjectionToVisibleBounds(
    focusRight,
    rightSpan,
    context.visibleHalfWidth,
    context.minimumVisibleFraction
  );
  const clampedUp = clampFocusProjectionToVisibleBounds(
    focusUp,
    upSpan,
    context.visibleHalfHeight,
    context.minimumVisibleFraction
  );

  return {
    x: context.right.x * clampedRight + context.up.x * clampedUp,
    y: context.right.y * clampedRight + context.up.y * clampedUp
  };
}

export function shouldShowCinematicLabel(state: CinematicLabelVisibilityState): boolean {
  return state.targetKey === state.hoveredTargetKey;
}

export function getCanonicalBodyTargetKey(bodyId: string, nodeId: string | undefined): string {
  return nodeId === undefined ? `body:${bodyId}` : `node:${nodeId}`;
}

export function getBurnPreviewLaunchKey(route: BurnPreviewRoute): string {
  return `preview:${route.originNodeId}->${route.destinationNodeId}@${route.issuedTurn}->${route.arrivalTurn}`;
}

export function getNodeIdFromTargetKey(targetKey: string | null): string | null {
  if (targetKey === null) {
    return null;
  }

  const [targetType, targetId] = targetKey.split(":");

  if (targetType !== "node" || targetId === undefined) {
    return null;
  }

  return targetId;
}

export function isPlayerOccupiedNodeTarget(
  snapshot: SolarSystemSnapshot,
  targetKey: string | null
): boolean {
  const nodeId = getNodeIdFromTargetKey(targetKey);

  if (nodeId === null) {
    return false;
  }

  return snapshot.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.nodeId === nodeId && occupancy.factionId === "player" && occupancy.shipCount > 0
    );
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function projectBounds(
  points: readonly Vec2[],
  axis: Vec2
): Readonly<{ min: number; max: number }> {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (const point of points) {
    const projected = projectPoint(point, axis);
    min = Math.min(min, projected);
    max = Math.max(max, projected);
  }

  return { min, max };
}

function projectPoint(point: Vec2, axis: Vec2): number {
  return point.x * axis.x + point.y * axis.y;
}

function clampFocusProjectionToVisibleBounds(
  focusProjection: number,
  boundsProjection: Readonly<{ min: number; max: number }>,
  visibleHalfLength: number,
  minimumVisibleFraction: number
): number {
  const boundsLength = Math.max(0, boundsProjection.max - boundsProjection.min);
  const visibleLength = Math.max(0, visibleHalfLength * 2);
  const maximumOverlap = Math.min(boundsLength, visibleLength);

  if (maximumOverlap <= 0) {
    return clamp(focusProjection, boundsProjection.min, boundsProjection.max);
  }

  const requiredOverlap =
    maximumOverlap *
    clamp(Number.isFinite(minimumVisibleFraction) ? minimumVisibleFraction : 0, 0, 1);
  const minFocus = boundsProjection.min + requiredOverlap - visibleHalfLength;
  const maxFocus = boundsProjection.max - requiredOverlap + visibleHalfLength;

  if (minFocus > maxFocus) {
    return (boundsProjection.min + boundsProjection.max) / 2;
  }

  return clamp(focusProjection, minFocus, maxFocus);
}
