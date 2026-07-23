import { describe, expect, it } from "vitest";

import { easeAdaptiveRewindProgress, getAdaptiveRewindDurationMs } from "../../src/ui/replayPacing";

describe("adaptive replay rewind pacing", () => {
  it("keeps short rewinds visible and increases total duration sublinearly", () => {
    const shortDuration = getAdaptiveRewindDurationMs(1);
    const mediumDuration = getAdaptiveRewindDurationMs(4);
    const longDuration = getAdaptiveRewindDurationMs(16);

    expect(shortDuration).toBeGreaterThanOrEqual(700);
    expect(mediumDuration).toBeGreaterThan(shortDuration);
    expect(longDuration).toBeGreaterThan(mediumDuration);
    expect(mediumDuration / 4).toBeLessThan(shortDuration);
    expect(longDuration / 16).toBeLessThan(mediumDuration / 4);
    expect(getAdaptiveRewindDurationMs(100)).toBeLessThanOrEqual(2200);
  });

  it("starts gently, then accelerates toward the rewind target", () => {
    expect(easeAdaptiveRewindProgress(0)).toBe(0);
    expect(easeAdaptiveRewindProgress(0.25)).toBeLessThan(0.25);
    expect(easeAdaptiveRewindProgress(0.5)).toBe(0.25);
    expect(easeAdaptiveRewindProgress(1)).toBe(1);
  });

  it("handles empty and out-of-range inputs safely", () => {
    expect(getAdaptiveRewindDurationMs(0)).toBe(0);
    expect(getAdaptiveRewindDurationMs(Number.NaN)).toBe(0);
    expect(easeAdaptiveRewindProgress(-1)).toBe(0);
    expect(easeAdaptiveRewindProgress(2)).toBe(1);
  });
});
