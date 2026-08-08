import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  DELTAV_BUILD_REVISION,
  DELTAV_BUILD_SERIES,
  DELTAV_BUILD_VERSION,
  formatDeltaVBuildVersion
} from "../../src/buildVersion";

describe("public build version", () => {
  it("formats the current build as a decimal series plus a hexadecimal revision", () => {
    expect(DELTAV_BUILD_SERIES).toBe(7);
    expect(DELTAV_BUILD_REVISION).toBe(2);
    expect(DELTAV_BUILD_VERSION).toBe("072");
  });

  it("continues from decimal revisions into hexadecimal revisions", () => {
    expect(formatDeltaVBuildVersion(7, 9)).toBe("079");
    expect(formatDeltaVBuildVersion(7, 10)).toBe("07A");
    expect(formatDeltaVBuildVersion(7, 15)).toBe("07F");
    expect(formatDeltaVBuildVersion(8, 1)).toBe("081");
  });

  it("keeps the build label mounted outside the replaceable app root", () => {
    const mainSource = readFileSync(join(process.cwd(), "src/main.ts"), "utf8");
    const styles = readFileSync(join(process.cwd(), "public/legal.css"), "utf8");

    expect(mainSource).toContain("document.body.append(label)");
    expect(mainSource).toContain('label.className = "deltav-build-version"');
    expect(styles).toContain(".deltav-build-version");
    expect(styles).toContain("position: fixed");
  });
});
