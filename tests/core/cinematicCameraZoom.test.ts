import { describe, expect, it } from "vitest";
import {
  constrainChaseDistanceByWheelTarget,
  resolveWheelZoomStep
} from "../../src/renderers/cinematic3d/cameraZoom";

describe("Cinematic camera wheel zoom", () => {
  it("stops at minimum distance when zooming in repeatedly", () => {
    const step = resolveWheelZoomStep({
      factor: 0.5,
      distance: 24,
      pendingTargetDistance: 24,
      minimumDistance: 24,
      zoomOutLimit: 800,
      zoomOutDistanceEpsilon: 0.001
    });

    expect(step.baseDistance).toBe(24);
    expect(step.nextDistance).toBe(24);
    expect(step.isZoomingInAtMinimumDistance).toBe(true);
    expect(step.isDistanceNoop).toBe(true);
  });

  it("keeps smooth zoom-in monotonic when a pending target already exists", () => {
    const step = resolveWheelZoomStep({
      factor: 0.8,
      distance: 120,
      pendingTargetDistance: 80,
      minimumDistance: 20,
      zoomOutLimit: 800,
      zoomOutDistanceEpsilon: 0.001
    });

    expect(step.baseDistance).toBe(80);
    expect(step.nextDistance).toBe(64);
    expect(step.isDistanceNoop).toBe(false);
  });

  it("keeps smooth zoom-out monotonic when a pending target already exists", () => {
    const step = resolveWheelZoomStep({
      factor: 1.25,
      distance: 120,
      pendingTargetDistance: 180,
      minimumDistance: 20,
      zoomOutLimit: 800,
      zoomOutDistanceEpsilon: 0.001
    });

    expect(step.baseDistance).toBe(180);
    expect(step.nextDistance).toBe(225);
    expect(step.isDistanceNoop).toBe(false);
  });

  it("does not let chase movement pull away from an active wheel zoom-in target", () => {
    expect(constrainChaseDistanceByWheelTarget(140, 120, 80)).toBe(120);
  });

  it("allows chase movement when the wheel is not pulling closer", () => {
    expect(constrainChaseDistanceByWheelTarget(140, 120, 180)).toBe(140);
    expect(constrainChaseDistanceByWheelTarget(140, 120, null)).toBe(140);
  });
});
