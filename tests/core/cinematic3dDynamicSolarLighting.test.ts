import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  computeDynamicSolarVisibilityAtPoint,
  dynamicSolarLightingEnabled,
  maxDynamicSolarOccluders,
  selectDynamicSolarOccluders
} from "../../src/renderers/cinematic3d/dynamicSolarLighting";

describe("cinematic 3D dynamic solar lighting", () => {
  const point = new THREE.Vector3(0, 0, 0);
  const sunPosition = new THREE.Vector3(100, 0, 0);

  it("keeps the full solar contribution without an occluder", () => {
    expect(
      computeDynamicSolarVisibilityAtPoint({
        point,
        sunPosition,
        sunRadius: 10,
        occluders: []
      })
    ).toBe(1);
  });

  it("produces a total eclipse when a larger apparent disc is aligned", () => {
    expect(
      computeDynamicSolarVisibilityAtPoint({
        point,
        sunPosition,
        sunRadius: 10,
        occluders: [{ position: new THREE.Vector3(50, 0, 0), radius: 10 }]
      })
    ).toBe(0);
  });

  it("preserves an annular solar contribution behind a smaller apparent disc", () => {
    const visibility = computeDynamicSolarVisibilityAtPoint({
      point,
      sunPosition,
      sunRadius: 10,
      occluders: [{ position: new THREE.Vector3(50, 0, 0), radius: 2 }]
    });

    expect(visibility).toBeGreaterThan(0.8);
    expect(visibility).toBeLessThan(0.9);
  });

  it("ignores bodies outside the solar disc or behind the receiver", () => {
    expect(
      computeDynamicSolarVisibilityAtPoint({
        point,
        sunPosition,
        sunRadius: 10,
        occluders: [
          { position: new THREE.Vector3(50, 40, 0), radius: 4 },
          { position: new THREE.Vector3(-10, 0, 0), radius: 4 }
        ]
      })
    ).toBe(1);
  });

  it("can be disabled as a single rollback switch", () => {
    expect(dynamicSolarLightingEnabled).toBe(true);
    expect(
      computeDynamicSolarVisibilityAtPoint({
        point,
        sunPosition,
        sunRadius: 10,
        occluders: [{ position: new THREE.Vector3(50, 0, 0), radius: 10 }],
        strength: 0
      })
    ).toBe(1);
  });

  it("selects only the most relevant bodies whose penumbra can reach the receiver", () => {
    const occluders = selectDynamicSolarOccluders({
      receiverId: "receiver",
      receiverPosition: point,
      receiverRadius: 4,
      sunPosition: new THREE.Vector3(1000, 0, 0),
      sunRadius: 50,
      bodies: [
        { id: "receiver", position: point, radius: 4 },
        { id: "a", position: new THREE.Vector3(100, 0, 0), radius: 4 },
        { id: "b", position: new THREE.Vector3(200, 1, 0), radius: 5 },
        { id: "c", position: new THREE.Vector3(300, -1, 0), radius: 6 },
        { id: "d", position: new THREE.Vector3(400, 2, 0), radius: 7 },
        { id: "e", position: new THREE.Vector3(500, -2, 0), radius: 8 },
        { id: "off-axis", position: new THREE.Vector3(300, 300, 0), radius: 3 },
        { id: "behind", position: new THREE.Vector3(-20, 0, 0), radius: 10 }
      ]
    });

    expect(occluders).toHaveLength(maxDynamicSolarOccluders);
    expect(occluders.map((occluder) => occluder.id)).not.toContain("off-axis");
    expect(occluders.map((occluder) => occluder.id)).not.toContain("behind");
    expect(occluders.map((occluder) => occluder.id)).not.toContain("receiver");
  });
});
