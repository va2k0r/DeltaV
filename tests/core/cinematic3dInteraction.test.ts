import { describe, expect, it } from "vitest";
import {
  clampMapPlaneFocusToBounds,
  computeAdaptivePanWorldUnitsPerPixel,
  computeFocusedPanReferenceDistance,
  defaultCinematic3dVisualTuning,
  getBurnPreviewLaunchKey,
  getCanonicalBodyTargetKey,
  isPlayerOccupiedNodeTarget,
  resolveCameraDistanceOutsideSpheres,
  shouldShowCinematicLabel
} from "../../src/renderers/cinematic3d";

describe("Cinematic 3D interaction helpers", () => {
  it("slows pan progressively at extreme close zoom while preserving normal response", () => {
    const extremeClose = computeAdaptivePanWorldUnitsPerPixel({
      distance: 70,
      viewportHeight: 720,
      tuning: defaultCinematic3dVisualTuning
    });
    const close = computeAdaptivePanWorldUnitsPerPixel({
      distance: 140,
      viewportHeight: 720,
      tuning: defaultCinematic3dVisualTuning
    });
    const normal = computeAdaptivePanWorldUnitsPerPixel({
      distance: 420,
      viewportHeight: 720,
      tuning: defaultCinematic3dVisualTuning
    });
    const far = computeAdaptivePanWorldUnitsPerPixel({
      distance: 5000,
      viewportHeight: 720,
      tuning: defaultCinematic3dVisualTuning
    });

    expect(extremeClose).toBeLessThan(70 / 720);
    expect(close).toBeLessThan(140 / 720);
    expect(extremeClose).toBeLessThan(close);
    expect(close).toBeLessThan(normal);
    expect(normal).toBeCloseTo(420 / 720);
    expect(far).toBeLessThanOrEqual(defaultCinematic3dVisualTuning.panMaxWorldUnitsPerPixel);
    expect(extremeClose).toBeGreaterThanOrEqual(
      defaultCinematic3dVisualTuning.panMinWorldUnitsPerPixel
    );
  });

  it("calibrates pan from the camera distance to the focused object", () => {
    const focusedDistance = computeFocusedPanReferenceDistance({
      cameraPosition: { x: 0, y: 12, z: 0 },
      focusedTargetPosition: { x: 9, y: 0, z: 40 },
      fallbackDistance: 70
    });
    const fallbackDistance = computeFocusedPanReferenceDistance({
      cameraPosition: { x: 0, y: 12, z: 0 },
      focusedTargetPosition: null,
      fallbackDistance: 70
    });

    expect(focusedDistance).toBeCloseTo(Math.hypot(9, 12, 40));
    expect(focusedDistance).not.toBe(70);
    expect(fallbackDistance).toBe(70);
  });

  it("moves a low-pitch focus camera beyond the surface when its endpoint is inside a body", () => {
    const distance = resolveCameraDistanceOutsideSpheres({
      focus: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0.05, z: 0 },
      distance: 40,
      spheres: [{ center: { x: 0, y: 0, z: 0 }, radius: 100 }],
      exitPadding: 2
    });

    expect(distance).toBeCloseTo(102);
  });

  it("leaves an already safe focus camera distance unchanged", () => {
    const distance = resolveCameraDistanceOutsideSpheres({
      focus: { x: -200, y: 0, z: 0 },
      direction: { x: -1, y: 0, z: 0 },
      distance: 40,
      spheres: [{ center: { x: 0, y: 0, z: 0 }, radius: 100 }],
      exitPadding: 2
    });

    expect(distance).toBe(40);
  });

  it("clears overlapping celestial safety volumes in one focus move", () => {
    const distance = resolveCameraDistanceOutsideSpheres({
      focus: { x: 0, y: 0, z: 0 },
      direction: { x: 1, y: 0, z: 0 },
      distance: 20,
      spheres: [
        { center: { x: 0, y: 0, z: 0 }, radius: 50 },
        { center: { x: 48, y: 0, z: 0 }, radius: 20 }
      ],
      exitPadding: 1
    });

    expect(distance).toBeCloseTo(69);
  });

  it("clamps map-plane pan before the full system can leave the viewport", () => {
    const bounds = { minX: 0, minY: 0, maxX: 100, maxY: 80 };
    const stable = clampMapPlaneFocusToBounds({
      bounds,
      focus: { x: 50, y: 40 },
      minimumVisibleFraction: defaultCinematic3dVisualTuning.panMinVisibleSystemFraction,
      right: { x: 1, y: 0 },
      up: { x: 0, y: 1 },
      visibleHalfWidth: 30,
      visibleHalfHeight: 20
    });
    const pushed = clampMapPlaneFocusToBounds({
      bounds,
      focus: { x: 180, y: -80 },
      minimumVisibleFraction: defaultCinematic3dVisualTuning.panMinVisibleSystemFraction,
      right: { x: 1, y: 0 },
      up: { x: 0, y: 1 },
      visibleHalfWidth: 30,
      visibleHalfHeight: 20
    });

    expect(stable).toEqual({ x: 50, y: 40 });
    expect(pushed.x).toBeCloseTo(86.8);
    expect(pushed.y).toBeCloseTo(8.8);
  });

  it("keeps a meaningful system slice visible with a tiny close-zoom viewport", () => {
    const clamped = clampMapPlaneFocusToBounds({
      bounds: { minX: 0, minY: 0, maxX: 100, maxY: 80 },
      focus: { x: 180, y: -80 },
      minimumVisibleFraction: defaultCinematic3dVisualTuning.panMinVisibleSystemFraction,
      right: { x: 1, y: 0 },
      up: { x: 0, y: 1 },
      visibleHalfWidth: 5,
      visibleHalfHeight: 4
    });

    expect(clamped.x).toBeCloseTo(97.8);
    expect(clamped.y).toBeCloseTo(1.76);
  });

  it("shows cinematic labels only for the current hover target", () => {
    expect(
      shouldShowCinematicLabel({
        targetKey: "body:jupiter",
        hoveredTargetKey: "body:jupiter",
        selectedTargetKey: null,
        focusedTargetKey: null
      })
    ).toBe(true);
    expect(
      shouldShowCinematicLabel({
        targetKey: "body:jupiter",
        hoveredTargetKey: null,
        selectedTargetKey: "body:jupiter",
        focusedTargetKey: null
      })
    ).toBe(false);
    expect(
      shouldShowCinematicLabel({
        targetKey: "body:jupiter",
        hoveredTargetKey: null,
        selectedTargetKey: null,
        focusedTargetKey: "body:jupiter"
      })
    ).toBe(false);
    expect(
      shouldShowCinematicLabel({
        targetKey: "body:jupiter",
        hoveredTargetKey: null,
        selectedTargetKey: null,
        focusedTargetKey: null
      })
    ).toBe(false);
  });

  it("uses node targets for bodies that have an operational node", () => {
    expect(getCanonicalBodyTargetKey("jupiter", "jupiter")).toBe("node:jupiter");
    expect(getCanonicalBodyTargetKey("sun", undefined)).toBe("body:sun");
  });

  it("keeps the burn launch preview stable when a hovered route becomes a pending order", () => {
    const hoveredRoute = {
      originNodeId: "saturn",
      destinationNodeId: "jupiter",
      issuedTurn: 1,
      arrivalTurn: 5
    };
    const pendingOrder = {
      ...hoveredRoute,
      id: "burn-player-17"
    };

    expect(getBurnPreviewLaunchKey(hoveredRoute)).toBe(getBurnPreviewLaunchKey(pendingOrder));
  });

  it("treats player-occupied nodes as BURN origins without ship hitboxes", () => {
    expect(
      isPlayerOccupiedNodeTarget(
        {
          turn: 0,
          factionDv: { player: 10, opponent: 10 },
          bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
          bodies: [],
          nodes: [],
          nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
          shipyardProgress: [],
          mandatoryLaunches: [],
          pendingBurnOrders: [],
          pendingFireOrders: [],
          activeBurnTransits: [],
          activeMissiles: [],
          debugEvents: []
        },
        "node:mars_node"
      )
    ).toBe(true);
    expect(
      isPlayerOccupiedNodeTarget(
        {
          turn: 0,
          factionDv: { player: 10, opponent: 10 },
          bounds: { minX: -1, minY: -1, maxX: 1, maxY: 1 },
          bodies: [],
          nodes: [],
          nodeOccupancies: [{ nodeId: "mars_node", factionId: "opponent", shipCount: 1 }],
          shipyardProgress: [],
          mandatoryLaunches: [],
          pendingBurnOrders: [],
          pendingFireOrders: [],
          activeBurnTransits: [],
          activeMissiles: [],
          debugEvents: []
        },
        "node:mars_node"
      )
    ).toBe(false);
  });
});
