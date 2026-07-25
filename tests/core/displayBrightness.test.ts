import { describe, expect, it } from "vitest";
import {
  defaultDisplayBrightness,
  formatDisplayBrightnessLabel,
  normalizeDisplayBrightness,
  parseStoredDisplayBrightness
} from "../../src/ui/displayBrightness";

describe("display brightness", () => {
  it("defaults malformed and missing persisted values to neutral brightness", () => {
    expect(parseStoredDisplayBrightness(null)).toBe(defaultDisplayBrightness);
    expect(parseStoredDisplayBrightness("")).toBe(defaultDisplayBrightness);
    expect(parseStoredDisplayBrightness("not-a-number")).toBe(defaultDisplayBrightness);
  });

  it("clamps and snaps brightness to the menu slider range", () => {
    expect(normalizeDisplayBrightness(0.2)).toBe(0.6);
    expect(normalizeDisplayBrightness(0.83)).toBe(0.85);
    expect(normalizeDisplayBrightness(2)).toBe(1.4);
  });

  it("formats a compact terminal readout", () => {
    expect(formatDisplayBrightnessLabel(1)).toBe("LUMINANCE 100%");
    expect(formatDisplayBrightnessLabel(1.2)).toBe("LUMINANCE 120%");
  });
});
