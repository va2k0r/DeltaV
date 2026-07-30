import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { beautyPanZoomInputScale } from "../../src/renderers/cinematic3d/beautyMode";

describe("cinematic 3D beauty mode", () => {
  it("slows pan and zoom without changing the normal camera constants", () => {
    expect(beautyPanZoomInputScale).toBeGreaterThan(0);
    expect(beautyPanZoomInputScale).toBeLessThan(1);
  });

  it("does not add or remove decorative ships", () => {
    const source = readFileSync(join(process.cwd(), "src/renderers/cinematic3d/index.ts"), "utf8");

    expect(source).not.toContain("beautyShip");
    expect(source).not.toContain("pickBeautyOrbitAtScreenPoint");
    expect(source).not.toContain("createOrCycleBeautyShip");
  });

  it("hides the command log and only slows pan and zoom", () => {
    const rendererSource = readFileSync(
      join(process.cwd(), "src/renderers/cinematic3d/index.ts"),
      "utf8"
    );
    const uiSource = readFileSync(join(process.cwd(), "src/ui/index.ts"), "utf8");

    expect(uiSource).toContain('commandConsole.classList.add("is-hidden")');
    expect(uiSource).toContain("BEAUTY · CLEAN UI · SLOW PAN/ZOOM");
    expect(rendererSource).toContain("getPanZoomInputSpeedScale()");
    expect(rendererSource).toContain(
      "target: -orbitDirection * keyboardCinematicOrbitRadiansPerSecond"
    );
  });
});
