import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { DELTAV_BUILD_NUMBER, DELTAV_BUILD_VERSION } from "../../src/buildVersion";

describe("public build version", () => {
  it("formats the progressive build number as three digits", () => {
    expect(DELTAV_BUILD_NUMBER).toBe(71);
    expect(DELTAV_BUILD_VERSION).toBe("071");
    expect(DELTAV_BUILD_VERSION).toMatch(/^\d{3}$/u);
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
