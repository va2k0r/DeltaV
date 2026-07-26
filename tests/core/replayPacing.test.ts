import { describe, expect, it } from "vitest";

import {
  fixedTimelineReviewReplayTurnDurationMs,
  fixedTimelineReviewRewindTurnDurationMs,
  getFixedTimelineReviewDurationMs,
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
});
