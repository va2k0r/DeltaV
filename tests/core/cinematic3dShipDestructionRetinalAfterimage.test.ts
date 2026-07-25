import { describe, expect, it } from "vitest";
import {
  getShipDestructionBloomProfile,
  getShipDestructionRetinalAfterimageFrame,
  shipDestructionRetinalAfterimageDurationSeconds
} from "../../src/renderers/cinematic3d/shipDestructionRetinalAfterimage";

describe("cinematic ship-destruction retinal afterimage", () => {
  it("exists only for its short camera-space lifetime", () => {
    expect(getShipDestructionRetinalAfterimageFrame(-0.01)).toBeNull();
    expect(getShipDestructionRetinalAfterimageFrame(0)).not.toBeNull();
    expect(
      getShipDestructionRetinalAfterimageFrame(
        shipDestructionRetinalAfterimageDurationSeconds - 0.01
      )
    ).not.toBeNull();
    expect(
      getShipDestructionRetinalAfterimageFrame(shipDestructionRetinalAfterimageDurationSeconds)
    ).toBeNull();
  });

  it("imprints quickly, then fades smoothly over several seconds", () => {
    const peak = getShipDestructionRetinalAfterimageFrame(0.08);
    const firstSecond = getShipDestructionRetinalAfterimageFrame(1);
    const late = getShipDestructionRetinalAfterimageFrame(2.7);
    const finalTrace = getShipDestructionRetinalAfterimageFrame(3.55);

    expect(peak).not.toBeNull();
    expect(firstSecond).not.toBeNull();
    expect(late).not.toBeNull();
    expect(finalTrace).not.toBeNull();
    expect(peak!.opacity).toBeGreaterThan(firstSecond!.opacity);
    expect(firstSecond!.opacity).toBeGreaterThan(late!.opacity);
    expect(late!.opacity).toBeGreaterThan(finalTrace!.opacity);
    expect(finalTrace!.opacity).toBeLessThan(0.01);
  });

  it("remains a screen-space stain while its halo slowly expands", () => {
    const early = getShipDestructionRetinalAfterimageFrame(0.08);
    const late = getShipDestructionRetinalAfterimageFrame(2.7);

    expect(early).not.toBeNull();
    expect(late).not.toBeNull();
    expect(late!.scale).toBeGreaterThan(early!.scale);
    expect(late!.haloOpacity).toBeLessThan(early!.haloOpacity);
  });

  it("keeps HIGH cinematic while LOW strongly restrains the explosion halo", () => {
    const high = getShipDestructionBloomProfile(false);
    const low = getShipDestructionBloomProfile(true);

    expect(high).toEqual({
      glareSizeScale: 1,
      glareOpacityScale: 1,
      coreSizeScale: 1,
      coreOpacityScale: 1,
      retinalSizeScale: 1,
      retinalOpacityScale: 1,
      whiteoutOpacityScale: 1
    });
    expect(low.glareSizeScale).toBeLessThan(low.coreSizeScale);
    expect(low.glareOpacityScale).toBeLessThan(low.coreOpacityScale);
    expect(low.retinalOpacityScale).toBeLessThan(0.5);
    expect(low.whiteoutOpacityScale).toBeLessThan(0.6);
  });
});
