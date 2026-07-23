import type { SolarSystemSnapshot, Vec2 } from "../../core";
import type { CameraState, ViewportSize } from "./camera";

export function findFocusPosition(snapshot: SolarSystemSnapshot, target: string): Vec2 | null {
  const [targetType, targetId] = target.split(":");

  if (targetId === undefined) {
    return null;
  }

  if (targetType === "body") {
    return snapshot.bodies.find((body) => body.id === targetId)?.position ?? null;
  }

  if (targetType === "node") {
    return snapshot.nodes.find((node) => node.id === targetId)?.position ?? null;
  }

  return null;
}

export function findNearestSnapshotTarget(
  snapshot: SolarSystemSnapshot,
  camera: CameraState,
  viewport: ViewportSize,
  screenPoint: Vec2
): string | null {
  let nearestTarget: string | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of snapshot.nodes) {
    const screen = worldToScreenLocal(node.position, camera, viewport);
    const distance = Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y);

    if (distance < nearestDistance) {
      nearestTarget = `node:${node.id}`;
      nearestDistance = distance;
    }
  }

  for (const body of snapshot.bodies) {
    const screen = worldToScreenLocal(body.position, camera, viewport);
    const distance = Math.hypot(screen.x - screenPoint.x, screen.y - screenPoint.y);

    if (distance < nearestDistance) {
      nearestTarget = `body:${body.id}`;
      nearestDistance = distance;
    }
  }

  return nearestDistance <= 28 ? nearestTarget : null;
}

function worldToScreenLocal(world: Vec2, camera: CameraState, viewport: ViewportSize): Vec2 {
  return {
    x: (world.x - camera.center.x) * camera.zoom + viewport.width / 2,
    y: (world.y - camera.center.y) * camera.zoom + viewport.height / 2
  };
}
