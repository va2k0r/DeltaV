import { describe, expect, it } from "vitest";
import {
  constrainChaseDistanceByWheelTarget,
  resolveArrivalOrbitHandoffDistance,
  resolveArrivalOrbitHandoffProgress,
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

  it("eases an arrival handoff without moving either endpoint", () => {
    expect(resolveArrivalOrbitHandoffProgress(0, 920)).toBe(0);
    expect(resolveArrivalOrbitHandoffProgress(460, 920)).toBe(0.5);
    expect(resolveArrivalOrbitHandoffProgress(920, 920)).toBe(1);
    expect(resolveArrivalOrbitHandoffProgress(1_400, 920)).toBe(1);
  });

  it("keeps the orbital close-up proportional to the ship zoom", () => {
    const close = resolveArrivalOrbitHandoffDistance({
      shipDetailProgress: 1,
      minimumShipDetailProgress: 0.38,
      closeDistance: 72,
      wideDistance: 168
    });
    const medium = resolveArrivalOrbitHandoffDistance({
      shipDetailProgress: 0.69,
      minimumShipDetailProgress: 0.38,
      closeDistance: 72,
      wideDistance: 168
    });
    const wide = resolveArrivalOrbitHandoffDistance({
      shipDetailProgress: 0.38,
      minimumShipDetailProgress: 0.38,
      closeDistance: 72,
      wideDistance: 168
    });

    expect(close).toBe(72);
    expect(medium).toBeGreaterThan(close);
    expect(medium).toBeLessThan(wide);
    expect(wide).toBe(168);
  });
});
