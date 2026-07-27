import { describe, expect, it } from "vitest";
import { advanceSunRelativeCameraYaw } from "../../src/renderers/cinematic3d/cameraReference";

describe("cinematic camera reference", () => {
  it("preserves the camera angle relative to a moving Sun bearing", () => {
    expect(advanceSunRelativeCameraYaw(0.4, 0.2, 0.7)).toBeCloseTo(0.9);
    expect(advanceSunRelativeCameraYaw(-0.8, 0.6, 0.1)).toBeCloseTo(-1.3);
  });

  it("crosses the angular wrap without a full-revolution snap", () => {
    const degrees = (value: number): number => (value * Math.PI) / 180;

    expect(advanceSunRelativeCameraYaw(0, degrees(179), degrees(-179))).toBeCloseTo(degrees(2));
    expect(advanceSunRelativeCameraYaw(0, degrees(-179), degrees(179))).toBeCloseTo(degrees(-2));
  });
});
