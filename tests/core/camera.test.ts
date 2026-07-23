import { describe, expect, it } from "vitest";
import { createInitialGameState } from "../../src/core";
import {
  clampZoom,
  createCameraState,
  panCameraByScreenDelta,
  screenToWorld,
  worldToScreen,
  zoomTowardScreenPoint
} from "../../src/ui/input/camera";

describe("Tactical camera", () => {
  it("clamps zoom to min and max", () => {
    const camera = createCameraState({ minZoom: 0.5, maxZoom: 3 });

    expect(clampZoom(0.1, camera)).toBe(0.5);
    expect(clampZoom(8, camera)).toBe(3);
  });

  it("preserves the world point under the cursor when zooming toward cursor", () => {
    const viewport = { width: 1200, height: 800 };
    const camera = createCameraState({
      center: { x: 100, y: -50 },
      zoom: 1.2,
      minZoom: 0.25,
      maxZoom: 5
    });
    const cursor = { x: 742, y: 315 };
    const before = screenToWorld(cursor, camera, viewport);
    const zoomed = zoomTowardScreenPoint(camera, viewport, cursor, 1.7);
    const after = screenToWorld(cursor, zoomed, viewport);

    expect(after.x).toBeCloseTo(before.x, 8);
    expect(after.y).toBeCloseTo(before.y, 8);
  });

  it("round-trips world and screen coordinates", () => {
    const viewport = { width: 960, height: 540 };
    const camera = createCameraState({
      center: { x: -20, y: 44 },
      zoom: 0.75
    });
    const world = { x: 122, y: -74 };
    const screen = worldToScreen(world, camera, viewport);

    expect(screenToWorld(screen, camera, viewport)).toEqual(world);
  });

  it("pan changes camera state only, not core state", () => {
    const state = createInitialGameState();
    const camera = createCameraState({ center: { x: 10, y: 12 }, zoom: 2 });
    const panned = panCameraByScreenDelta(camera, { x: 20, y: -10 });

    expect(panned.center).toEqual({ x: 0, y: 17 });
    expect(state.turn).toBe(0);
  });
});
