import { describe, expect, it } from "vitest";

import {
  commandLogWheelDeltaLineMode,
  commandLogWheelDeltaPageMode,
  commandLogWheelDeltaPixelMode,
  normalizeCommandLogWheelDelta
} from "../../src/ui/commandLogScroll";

describe("command log wheel normalization", () => {
  it("preserves pixel deltas and expands line and page deltas", () => {
    expect(normalizeCommandLogWheelDelta(-120, commandLogWheelDeltaPixelMode, 20, 400)).toBe(-120);
    expect(normalizeCommandLogWheelDelta(-3, commandLogWheelDeltaLineMode, 20, 400)).toBe(-60);
    expect(normalizeCommandLogWheelDelta(-1, commandLogWheelDeltaPageMode, 20, 400)).toBe(-400);
  });

  it("handles invalid and undersized metrics safely", () => {
    expect(normalizeCommandLogWheelDelta(Number.NaN, commandLogWheelDeltaPixelMode, 20, 400)).toBe(
      0
    );
    expect(normalizeCommandLogWheelDelta(2, commandLogWheelDeltaLineMode, 0, 400)).toBe(2);
    expect(normalizeCommandLogWheelDelta(2, commandLogWheelDeltaPageMode, 20, 0)).toBe(2);
  });
});
