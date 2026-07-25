import { describe, expect, it } from "vitest";
import {
  computeApparentBodyBloomSourceGain,
  computeCinematicBloomRadius,
  computeCinematicBloomScreenSpaceSourceEnergyScale,
  computeCinematicBloomScreenSpaceSourceScale,
  computeCinematicBloomStrength,
  computeLocalizedSunBloomStrength
} from "../../src/renderers/cinematic3d/solarBloom";

const viewport = {
  width: 1000,
  height: 700,
  maximumStrength: 0.34
} as const;

describe("cinematic 3D solar bloom", () => {
  it("stays disabled while the solar glare is far outside the viewport", () => {
    expect(
      computeLocalizedSunBloomStrength({
        ...viewport,
        x: 1250,
        y: 350,
        radius: 80
      })
    ).toBe(0);
  });

  it("prewarms the post-processing path before the solar disk reaches the edge", () => {
    const approachStrength = computeLocalizedSunBloomStrength({
      ...viewport,
      x: 1095,
      y: 350,
      radius: 80
    });
    const contactStrength = computeLocalizedSunBloomStrength({
      ...viewport,
      x: 1080,
      y: 350,
      radius: 80
    });

    expect(approachStrength).toBeGreaterThan(0);
    expect(contactStrength).toBeGreaterThan(approachStrength);
    expect(contactStrength).toBeLessThan(viewport.maximumStrength * 0.04);
  });

  it("increases continuously as more of the disk enters the viewport", () => {
    const strengths = [1080, 1060, 1040, 1020, 1000, 960].map((x) =>
      computeLocalizedSunBloomStrength({
        ...viewport,
        x,
        y: 350,
        radius: 80
      })
    );

    for (let index = 1; index < strengths.length; index += 1) {
      expect(strengths[index]).toBeGreaterThanOrEqual(strengths[index - 1] ?? 0);
    }

    expect(strengths.at(-1)).toBeLessThanOrEqual(viewport.maximumStrength);
  });

  it("caps a huge on-screen sun at the configured maximum", () => {
    expect(
      computeLocalizedSunBloomStrength({
        ...viewport,
        x: 500,
        y: 350,
        radius: 900
      })
    ).toBeCloseTo(viewport.maximumStrength);
  });

  it("keeps global bloom at a stable configured strength", () => {
    expect(computeCinematicBloomStrength({ globalIntensity: 0.23 })).toBeCloseTo(0.23);
    expect(computeCinematicBloomStrength({ globalIntensity: -1 })).toBe(0);
  });

  it("reduces bloom radius proportionally with the low-intensity profile", () => {
    expect(computeCinematicBloomRadius({ radius: 0.1, intensityScale: 1 })).toBeCloseTo(0.1);
    expect(computeCinematicBloomRadius({ radius: 0.1, intensityScale: 0.5 })).toBeCloseTo(0.05);
    expect(computeCinematicBloomRadius({ radius: 0.1, intensityScale: -1 })).toBe(0);
  });

  it("keeps screen-space bloom sources stable across bloom buffer scales", () => {
    const rendererPixelRatio = 1.14;
    const highScale = computeCinematicBloomScreenSpaceSourceScale({
      bloomRenderScale: 0.4,
      rendererPixelRatio
    });
    const lowScale = computeCinematicBloomScreenSpaceSourceScale({
      bloomRenderScale: 0.2,
      rendererPixelRatio
    });

    expect((highScale * rendererPixelRatio) / 0.4).toBeCloseTo(1);
    expect((lowScale * rendererPixelRatio) / 0.2).toBeCloseTo(1);
    expect(lowScale).toBeCloseTo(highScale * 0.5);
  });

  it("does not let unresolved low-resolution points carry more bloom energy than high", () => {
    const highEnergy = computeCinematicBloomScreenSpaceSourceEnergyScale({
      bloomRenderScale: 0.4,
      pointSize: 2,
      referenceRenderScale: 0.4
    });
    const lowEnergy = computeCinematicBloomScreenSpaceSourceEnergyScale({
      bloomRenderScale: 0.2,
      pointSize: 2,
      referenceRenderScale: 0.4
    });
    const resolvedLowEnergy = computeCinematicBloomScreenSpaceSourceEnergyScale({
      bloomRenderScale: 0.2,
      pointSize: 20,
      referenceRenderScale: 0.4
    });

    expect(highEnergy).toBe(1);
    expect(lowEnergy).toBeCloseTo(0.25);
    expect(resolvedLowEnergy).toBe(1);
  });

  it("reduces body bloom as the apparent disk grows", () => {
    const gains = [24, 36, 72, 144, 720].map((apparentRadiusPixels) =>
      computeApparentBodyBloomSourceGain({
        baseGain: 2.05,
        minimumGain: 0.08,
        apparentRadiusPixels,
        referenceRadiusPixels: 36,
        falloffExponent: 1.1
      })
    );

    expect(gains[0]).toBeCloseTo(2.05);
    expect(gains[1]).toBeCloseTo(2.05);
    for (let index = 2; index < gains.length; index += 1) {
      expect(gains[index]).toBeLessThan(gains[index - 1] ?? Number.POSITIVE_INFINITY);
    }
    expect(gains.at(-1)).toBeGreaterThanOrEqual(0.08);
  });

  it("clamps close-up bloom at the configured minimum", () => {
    expect(
      computeApparentBodyBloomSourceGain({
        baseGain: 1,
        minimumGain: 0.4,
        apparentRadiusPixels: 5000,
        referenceRadiusPixels: 36,
        falloffExponent: 1.1
      })
    ).toBe(0.4);
  });
});
