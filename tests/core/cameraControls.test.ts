import { describe, expect, it } from "vitest";
import { resolveDampedCameraControlVelocity } from "../../src/renderers/cinematic3d/cameraControls";

const baseOptions = {
  accelerationTimeConstantMs: 48,
  releaseTimeConstantMs: 115,
  stopEpsilon: 0.0005
} as const;

describe("cinematic camera controls", () => {
  it("accelerates toward held input without a first-frame velocity jump", () => {
    const next = resolveDampedCameraControlVelocity({
      ...baseOptions,
      current: 0,
      target: 0.36,
      deltaSeconds: 1 / 120
    });

    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(0.36);
  });

  it("eases out after release instead of snapping velocity to zero", () => {
    const firstReleaseFrame = resolveDampedCameraControlVelocity({
      ...baseOptions,
      current: 0.36,
      target: 0,
      deltaSeconds: 1 / 120
    });
    const secondReleaseFrame = resolveDampedCameraControlVelocity({
      ...baseOptions,
      current: firstReleaseFrame,
      target: 0,
      deltaSeconds: 1 / 120
    });

    expect(firstReleaseFrame).toBeGreaterThan(0);
    expect(firstReleaseFrame).toBeLessThan(0.36);
    expect(secondReleaseFrame).toBeGreaterThan(0);
    expect(secondReleaseFrame).toBeLessThan(firstReleaseFrame);
  });

  it("settles tiny release tails exactly at zero", () => {
    expect(
      resolveDampedCameraControlVelocity({
        ...baseOptions,
        current: 0.00051,
        target: 0,
        deltaSeconds: 1 / 60
      })
    ).toBe(0);
  });
});
