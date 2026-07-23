import type { Bounds, Vec2 } from "../../core";

export type ViewportSize = Readonly<{
  width: number;
  height: number;
}>;

export type CameraState = Readonly<{
  center: Vec2;
  zoom: number;
  minZoom: number;
  maxZoom: number;
}>;

export function createCameraState(overrides: Partial<CameraState> = {}): CameraState {
  return {
    center: overrides.center ?? { x: 0, y: 0 },
    zoom: overrides.zoom ?? 1,
    minZoom: overrides.minZoom ?? 0.2,
    maxZoom: overrides.maxZoom ?? 4
  };
}

export function clampZoom(zoom: number, camera: Pick<CameraState, "minZoom" | "maxZoom">): number {
  return Math.min(camera.maxZoom, Math.max(camera.minZoom, zoom));
}

export function worldToScreen(world: Vec2, camera: CameraState, viewport: ViewportSize): Vec2 {
  return {
    x: (world.x - camera.center.x) * camera.zoom + viewport.width / 2,
    y: (world.y - camera.center.y) * camera.zoom + viewport.height / 2
  };
}

export function screenToWorld(screen: Vec2, camera: CameraState, viewport: ViewportSize): Vec2 {
  return {
    x: (screen.x - viewport.width / 2) / camera.zoom + camera.center.x,
    y: (screen.y - viewport.height / 2) / camera.zoom + camera.center.y
  };
}

export function zoomTowardScreenPoint(
  camera: CameraState,
  viewport: ViewportSize,
  screenPoint: Vec2,
  zoomFactor: number
): CameraState {
  const worldBefore = screenToWorld(screenPoint, camera, viewport);
  const nextZoom = clampZoom(camera.zoom * zoomFactor, camera);
  const nextCenter = {
    x: worldBefore.x - (screenPoint.x - viewport.width / 2) / nextZoom,
    y: worldBefore.y - (screenPoint.y - viewport.height / 2) / nextZoom
  };

  return {
    ...camera,
    center: nextCenter,
    zoom: nextZoom
  };
}

export function panCameraByScreenDelta(camera: CameraState, delta: Vec2): CameraState {
  return {
    ...camera,
    center: {
      x: camera.center.x - delta.x / camera.zoom,
      y: camera.center.y - delta.y / camera.zoom
    }
  };
}

export function fitBoundsToViewport(
  bounds: Bounds,
  viewport: ViewportSize,
  camera: Pick<CameraState, "minZoom" | "maxZoom">
): CameraState {
  const width = Math.max(1, bounds.maxX - bounds.minX);
  const height = Math.max(1, bounds.maxY - bounds.minY);
  const padding = 0.9;
  const zoom = clampZoom(
    Math.min(viewport.width / width, viewport.height / height) * padding,
    camera
  );

  return {
    center: {
      x: bounds.minX + width / 2,
      y: bounds.minY + height / 2
    },
    zoom,
    minZoom: camera.minZoom,
    maxZoom: camera.maxZoom
  };
}
