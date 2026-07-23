import { describe, expect, it } from "vitest";
import { isPresentationLikelyExternallyCapped } from "../../src/renderers/cinematic3d/performancePacing";

describe("cinematic 3D performance pacing", () => {
  it("reports likely external pacing even when Safari has no GPU timer extension", () => {
    expect(
      isPresentationLikelyExternallyCapped({
        estimatedFps: 30.36,
        averageCpuMs: 9.09,
        maxCpuMs: 15.84,
        averageGpuMs: null
      })
    ).toBe(true);
    expect(
      isPresentationLikelyExternallyCapped({
        estimatedFps: 30.36,
        averageCpuMs: 18,
        maxCpuMs: 24,
        averageGpuMs: null
      })
    ).toBe(false);
  });
});
