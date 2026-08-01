import { describe, expect, it } from "vitest";
import {
  getMissileImpactCameraDistance,
  getMissileImpactCameraTravelDurationMs,
  getPredictedMissileImpactElapsed
} from "../../src/renderers/cinematic3d/missileImpactCamera";

describe("focused missile impact camera", () => {
  it("finishes its travel well before the missile reaches impact", () => {
    const turnDurationMs = 1150;
    const impactProgress = 0.965;
    const travelDurationMs = getMissileImpactCameraTravelDurationMs(turnDurationMs, impactProgress);

    expect(travelDurationMs).toBeLessThan(turnDurationMs * impactProgress - 400);
  });

  it("predicts the impact clock after transition holds and orbital motion", () => {
    expect(
      getPredictedMissileImpactElapsed({
        durationMs: 1200,
        impactProgress: 0.965,
        now: 10_000,
        presentationElapsed: 42,
        transitionStartedAt: 10_240
      })
    ).toBeCloseTo(43.398, 6);
  });

  it("zooms out for a close camera but never zooms in an already wide view", () => {
    const closeDistance = getMissileImpactCameraDistance({
      aspect: 16 / 9,
      bodyRadius: 34,
      currentDistance: 90,
      fovRadians: Math.PI / 4,
      maximumDistance: 4000,
      minimumDistance: 40,
      orbitRadius: 48,
      pitch: Math.PI / 3
    });
    const wideDistance = getMissileImpactCameraDistance({
      aspect: 16 / 9,
      bodyRadius: 34,
      currentDistance: 900,
      fovRadians: Math.PI / 4,
      maximumDistance: 4000,
      minimumDistance: 40,
      orbitRadius: 48,
      pitch: Math.PI / 3
    });

    expect(closeDistance).toBeGreaterThan(90);
    expect(wideDistance).toBe(900);
  });
});
