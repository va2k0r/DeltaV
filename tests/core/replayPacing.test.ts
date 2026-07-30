import { describe, expect, it } from "vitest";

import {
  acceleratedTimelineReviewMaximumDurationScale,
  acceleratedTimelineReviewMinimumDurationScale,
  acceleratedTimelineReviewProgressExponent,
  fixedTimelineReviewReplayTurnDurationMs,
  fixedTimelineReviewRewindTurnDurationMs,
  getAcceleratedTimelineReviewDurationMs,
  getFixedTimelineReviewDurationMs,
  sampleAcceleratedTimelineReviewPosition,
  sampleFixedTimelineReviewPosition
} from "../../src/ui/replayPacing";

describe("mirrored replay pacing", () => {
  it("handles empty and out-of-range inputs safely", () => {
    expect(getFixedTimelineReviewDurationMs(2, 2)).toBe(0);
    expect(getFixedTimelineReviewDurationMs(Number.NaN, 2)).toBe(0);
    expect(sampleFixedTimelineReviewPosition(2, 8, -1)).toBe(2);
    expect(sampleFixedTimelineReviewPosition(2, 8, Number.POSITIVE_INFINITY)).toBe(8);
  });

  it("runs rewind and replay at the same mirrored presentation speed", () => {
    expect(getFixedTimelineReviewDurationMs(8, 2)).toBe(
      6 * fixedTimelineReviewRewindTurnDurationMs
    );
    expect(getFixedTimelineReviewDurationMs(2, 8)).toBe(
      6 * fixedTimelineReviewReplayTurnDurationMs
    );
    expect(sampleFixedTimelineReviewPosition(8, 2, fixedTimelineReviewRewindTurnDurationMs)).toBe(
      7
    );
    expect(sampleFixedTimelineReviewPosition(2, 8, fixedTimelineReviewReplayTurnDurationMs)).toBe(
      3
    );
    expect(fixedTimelineReviewReplayTurnDurationMs).toBe(1_450);
    expect(fixedTimelineReviewReplayTurnDurationMs).toBe(fixedTimelineReviewRewindTurnDurationMs);
  });

  it("starts accelerated review slowly and compresses long temporal travel", () => {
    const durationMs = getAcceleratedTimelineReviewDurationMs(0, 16);

    expect(durationMs).toBeCloseTo(1.17 * fixedTimelineReviewReplayTurnDurationMs);
    expect(durationMs).toBeLessThan(
      getFixedTimelineReviewDurationMs(0, 16, fixedTimelineReviewReplayTurnDurationMs)
    );
    expect(
      sampleAcceleratedTimelineReviewPosition(
        0,
        16,
        durationMs / 2,
        fixedTimelineReviewReplayTurnDurationMs
      )
    ).toBe(4);
    expect(acceleratedTimelineReviewProgressExponent).toBe(2);
    expect(getAcceleratedTimelineReviewDurationMs(0, 1)).toBe(
      acceleratedTimelineReviewMinimumDurationScale * fixedTimelineReviewReplayTurnDurationMs
    );
    expect(getAcceleratedTimelineReviewDurationMs(0, 1_000)).toBe(
      acceleratedTimelineReviewMaximumDurationScale * fixedTimelineReviewReplayTurnDurationMs
    );
  });

  it("mirrors accelerated pacing for rewind and fast-forward", () => {
    const durationMs = getAcceleratedTimelineReviewDurationMs(18, 2);

    expect(durationMs).toBe(getAcceleratedTimelineReviewDurationMs(2, 18));
    expect(
      sampleAcceleratedTimelineReviewPosition(
        18,
        2,
        durationMs / 2,
        fixedTimelineReviewRewindTurnDurationMs
      )
    ).toBe(14);
    expect(
      sampleAcceleratedTimelineReviewPosition(
        2,
        18,
        durationMs / 2,
        fixedTimelineReviewReplayTurnDurationMs
      )
    ).toBe(6);
  });

  it("handles invalid accelerated pacing inputs safely", () => {
    expect(getAcceleratedTimelineReviewDurationMs(Number.NaN, 2)).toBe(0);
    expect(getAcceleratedTimelineReviewDurationMs(2, 8, 0)).toBe(0);
    expect(sampleAcceleratedTimelineReviewPosition(2, 8, -1)).toBe(2);
    expect(sampleAcceleratedTimelineReviewPosition(2, 8, Number.POSITIVE_INFINITY)).toBe(8);
  });
});
