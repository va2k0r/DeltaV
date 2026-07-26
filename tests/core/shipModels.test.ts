import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  createShipMarkerObject,
  setRingHexShipRadiatorExtension,
  shouldForceStrategicShipMarkerLod
} from "../../src/renderers/cinematic3d/shipModels";
import { defaultCinematic3dVisualTuning } from "../../src/renderers/cinematic3d/visualTuning";

describe("ring-hex ship model", () => {
  it("never replaces a close-up hull with the strategic dot when performance mode changes", () => {
    expect(shouldForceStrategicShipMarkerLod(0, true)).toBe(true);
    expect(shouldForceStrategicShipMarkerLod(0.16, true)).toBe(true);
    expect(shouldForceStrategicShipMarkerLod(0.17, true)).toBe(false);
    expect(shouldForceStrategicShipMarkerLod(1, true)).toBe(false);
    expect(shouldForceStrategicShipMarkerLod(0, false)).toBe(false);
  });

  it("batches the radiator lattice without removing its close-up geometry", () => {
    const marker = createShipMarkerObject(
      defaultCinematic3dVisualTuning,
      defaultCinematic3dVisualTuning.playerFactionColor,
      "player",
      true,
      "ring-hex"
    );
    const radiatorLattice: number[] = [];
    const radiatorHinges: number[] = [];
    let renderableCount = 0;

    marker.traverse((object) => {
      if (
        object instanceof THREE.Mesh ||
        object instanceof THREE.Line ||
        object instanceof THREE.Points ||
        object instanceof THREE.Sprite
      ) {
        renderableCount += 1;
      }
      if (
        object instanceof THREE.InstancedMesh &&
        object.name.startsWith("ship-ring-hex-zigzag-radiator-")
      ) {
        radiatorLattice.push(object.count);
      }
      if (
        object instanceof THREE.InstancedMesh &&
        object.name.startsWith("ship-ring-hex-radiator-metal-hinges")
      ) {
        radiatorHinges.push(object.count);
      }
    });

    expect(radiatorLattice).toHaveLength(3);
    expect(radiatorLattice.reduce((total, count) => total + count, 0)).toBe(800);
    expect(radiatorHinges).toHaveLength(1);
    expect(radiatorHinges.reduce((total, count) => total + count, 0)).toBe(36);
    expect(renderableCount).toBeLessThanOrEqual(95);
  });

  it("updates the batched radiator pose without rebuilding its lattice", () => {
    const marker = createShipMarkerObject(
      defaultCinematic3dVisualTuning,
      defaultCinematic3dVisualTuning.playerFactionColor,
      "player",
      true,
      "ring-hex"
    );
    const assembly = marker.getObjectByName("ship-ring-hex-zigzag-radiator-assembly-array");
    const panels = marker.getObjectByName("ship-ring-hex-zigzag-radiator-panels");

    expect(assembly?.userData["shipAccordionRadiator"]).toBe(true);
    expect(panels).toBeInstanceOf(THREE.InstancedMesh);

    if (!(panels instanceof THREE.InstancedMesh)) {
      throw new Error("Expected the Ring Hex radiator panels to be instanced.");
    }

    const compactMatrix = new THREE.Matrix4();
    const extendedMatrix = new THREE.Matrix4();
    setRingHexShipRadiatorExtension(marker, 0);
    panels.getMatrixAt(panels.count - 1, compactMatrix);

    setRingHexShipRadiatorExtension(marker, 1);
    panels.getMatrixAt(panels.count - 1, extendedMatrix);

    expect(panels.count).toBe(200);
    expect(extendedMatrix.equals(compactMatrix)).toBe(false);
    expect(
      marker.getObjectByName("ship-ring-hex-zigzag-radiator-fold-segment-0-0")
    ).toBeUndefined();
  });

  it("uses one HDR bloom point at the engine exhaust instead of emissive ring geometry", () => {
    const marker = createShipMarkerObject(
      defaultCinematic3dVisualTuning,
      defaultCinematic3dVisualTuning.playerFactionColor,
      "player",
      false,
      "ring-hex"
    );
    const engineBloomPoint = marker.getObjectByName("ship-engine-bloom-point");

    expect(engineBloomPoint).toBeInstanceOf(THREE.Points);
    expect(marker.getObjectByName("ship-tritium-engine-ring")).toBeUndefined();
    expect(marker.getObjectByName("ship-ring-hex-exhaust-plasma-throat")).toBeUndefined();

    if (!(engineBloomPoint instanceof THREE.Points)) {
      throw new Error("Expected the ring-hex exhaust to have an HDR bloom point.");
    }

    expect(engineBloomPoint.material).toBeInstanceOf(THREE.PointsMaterial);
    expect(engineBloomPoint.userData["shipEngineHdrBloomPoint"]).toBe(true);

    if (!(engineBloomPoint.material instanceof THREE.PointsMaterial)) {
      throw new Error("Expected the engine bloom point to use PointsMaterial.");
    }

    expect(engineBloomPoint.material.toneMapped).toBe(false);
    expect(engineBloomPoint.material.color.r).toBeGreaterThan(1);
  });
});
