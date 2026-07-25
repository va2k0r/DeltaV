import { describe, expect, it } from "vitest";
import { computeFusionIgnitionPresentationTiming } from "../../src/renderers/cinematic3d/fusionIgnition";

describe("cinematic fusion-drive ignition", () => {
  it("keeps the ignition delay stable in turn time across different transfer ETAs", () => {
    const shortTransfer = computeFusionIgnitionPresentationTiming(2, 0.5);
    const longTransfer = computeFusionIgnitionPresentationTiming(7, 0.5);

    expect(shortTransfer.startProgress * 2).toBeCloseTo(longTransfer.startProgress * 7);
    expect(shortTransfer.rampDurationProgress * 2).toBeCloseTo(
      longTransfer.rampDurationProgress * 7
    );
    expect(shortTransfer.startProgress * 2).toBeGreaterThanOrEqual(0.48);
  });
});
