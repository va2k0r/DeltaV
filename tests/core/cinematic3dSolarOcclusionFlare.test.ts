import { describe, expect, it } from "vitest";
import {
  advanceSolarOcclusionTransientState,
  computeSolarDiscOcclusionCoverage,
  computeSolarLimbGlintStrength,
  computeSolarOcclusionDistanceVisibility,
  computeSolarReemergencePulse,
  createInitialSolarOcclusionTransientState
} from "../../src/renderers/cinematic3d/solarOcclusionFlare";

describe("cinematic 3D solar occlusion flare", () => {
  it("reports no coverage for separated screen discs", () => {
    expect(
      computeSolarDiscOcclusionCoverage(
        { x: 100, y: 100, radius: 20 },
        { x: 180, y: 100, radius: 25 }
      )
    ).toBe(0);
  });

  it("reports total coverage when a larger body contains the solar disc", () => {
    expect(
      computeSolarDiscOcclusionCoverage(
        { x: 100, y: 100, radius: 20 },
        { x: 102, y: 100, radius: 30 }
      )
    ).toBe(1);
  });

  it("limits a centered small occluder to its relative disc area", () => {
    expect(
      computeSolarDiscOcclusionCoverage(
        { x: 100, y: 100, radius: 20 },
        { x: 100, y: 100, radius: 10 }
      )
    ).toBeCloseTo(0.25);
  });

  it("computes a continuous partial eclipse", () => {
    const coverage = computeSolarDiscOcclusionCoverage(
      { x: 100, y: 100, radius: 20 },
      { x: 120, y: 100, radius: 20 }
    );

    expect(coverage).toBeGreaterThan(0.35);
    expect(coverage).toBeLessThan(0.45);
  });

  it("keeps a visible limb glint while the sun peeks out from behind a body", () => {
    expect(computeSolarLimbGlintStrength(0)).toBe(0);
    expect(computeSolarLimbGlintStrength(0.01)).toBe(0);
    expect(computeSolarLimbGlintStrength(0.7)).toBeGreaterThan(0.9);
    expect(computeSolarLimbGlintStrength(0.96)).toBeGreaterThan(0);
    expect(computeSolarLimbGlintStrength(1)).toBe(0);
  });

  it("arms on a deep eclipse and emits the flare while the sun is still mostly covered", () => {
    const initial = createInitialSolarOcclusionTransientState();
    const armed = advanceSolarOcclusionTransientState(initial, {
      elapsed: 1,
      coverage: 0.92,
      durationSeconds: 0.6
    });
    const earlyReemergence = advanceSolarOcclusionTransientState(armed, {
      elapsed: 1.05,
      coverage: 0.74,
      durationSeconds: 0.6
    });
    const released = advanceSolarOcclusionTransientState(armed, {
      elapsed: 1.1,
      coverage: 0.66,
      durationSeconds: 0.6
    });
    const decaying = advanceSolarOcclusionTransientState(released, {
      elapsed: 1.3,
      coverage: 0,
      durationSeconds: 0.6
    });

    expect(armed.armed).toBe(true);
    expect(earlyReemergence.flareStartedAt).toBeNull();
    expect(released.armed).toBe(false);
    expect(released.flareStartedAt).toBe(1.1);
    expect(decaying.flareStrength).toBeGreaterThan(0);
  });

  it("does not flash for a grazing overlap that never becomes an eclipse", () => {
    const initial = createInitialSolarOcclusionTransientState();
    const grazing = advanceSolarOcclusionTransientState(initial, {
      elapsed: 1,
      coverage: 0.78,
      durationSeconds: 0.6
    });
    const released = advanceSolarOcclusionTransientState(grazing, {
      elapsed: 1.1,
      coverage: 0,
      durationSeconds: 0.6
    });

    expect(released.flareStartedAt).toBeNull();
    expect(released.flareStrength).toBe(0);
  });

  it("uses a quick attack and completes the re-emergence pulse", () => {
    expect(computeSolarReemergencePulse(0, 0.6)).toBe(0);
    expect(computeSolarReemergencePulse(0.05, 0.6)).toBeGreaterThan(0.8);
    expect(computeSolarReemergencePulse(0.3, 0.6)).toBeGreaterThan(0);
    expect(computeSolarReemergencePulse(0.6, 0.6)).toBe(0);
  });

  it("fades the optical effect out at overview distance", () => {
    expect(computeSolarOcclusionDistanceVisibility(800, 1200, 2600)).toBe(1);
    expect(computeSolarOcclusionDistanceVisibility(1900, 1200, 2600)).toBeCloseTo(0.5);
    expect(computeSolarOcclusionDistanceVisibility(3000, 1200, 2600)).toBe(0);
  });
});
