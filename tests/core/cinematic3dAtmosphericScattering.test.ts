import { describe, expect, it } from "vitest";
import { getAtmosphericScatteringProfile } from "../../src/renderers/cinematic3d/atmosphericScattering";

describe("cinematic 3D atmospheric scattering profiles", () => {
  it("gives Earth a cool atmospheric limb", () => {
    const profile = getAtmosphericScatteringProfile({
      id: "earth",
      visualClass: "protected"
    });

    expect(profile).not.toBeNull();
    expect(profile?.color).toBe(0x67cfff);
    expect(profile?.intensityMultiplier).toBe(1);
  });

  it("distinguishes dense and thin rocky atmospheres", () => {
    const venus = getAtmosphericScatteringProfile({ id: "venus", visualClass: "rocky" });
    const mars = getAtmosphericScatteringProfile({ id: "mars", visualClass: "rocky" });

    expect(venus).not.toBeNull();
    expect(mars).not.toBeNull();
    expect(venus!.thicknessMultiplier).toBeGreaterThan(mars!.thicknessMultiplier);
    expect(venus!.intensityMultiplier).toBeGreaterThan(mars!.intensityMultiplier);
  });

  it("uses cold scattering for ice giants", () => {
    const uranus = getAtmosphericScatteringProfile({
      id: "uranus",
      visualClass: "iceGiant"
    });
    const neptune = getAtmosphericScatteringProfile({
      id: "neptune",
      visualClass: "iceGiant"
    });

    expect(uranus).not.toBeNull();
    expect(neptune).not.toBeNull();
    expect(uranus?.color).not.toBe(neptune?.color);
  });

  it("does not invent substantial atmospheres for airless bodies", () => {
    expect(getAtmosphericScatteringProfile({ id: "mercury", visualClass: "rocky" })).toBeNull();
    expect(
      getAtmosphericScatteringProfile({ id: "moon", visualClass: "protectedMoon" })
    ).toBeNull();
    expect(getAtmosphericScatteringProfile({ id: "pluto", visualClass: "dwarfBinary" })).toBeNull();
  });
});
