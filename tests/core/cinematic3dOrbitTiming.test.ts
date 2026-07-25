import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  clipOrbitTimingPolylineStartToClearance,
  getFutureOrbitTimingSampleTurns,
  getOrbitTimingEndpointClearance
} from "../../src/renderers/cinematic3d";

describe("Cinematic 3D future orbit timing", () => {
  it("rebuilds the remaining samples from the current visual turn", () => {
    const initial = getFutureOrbitTimingSampleTurns(4, 4, 8);
    const advanced = getFutureOrbitTimingSampleTurns(4.4, 4, 8);

    expect(initial[0]).toBe(4.167);
    expect(advanced[0]).toBe(4.564);
    expect(advanced.every((sampleTurn) => sampleTurn > 4.401)).toBe(true);
  });

  it("removes crossed samples while retaining future whole-turn timing points", () => {
    const samples = getFutureOrbitTimingSampleTurns(5.2, 4, 8);

    expect(samples.every((sampleTurn) => sampleTurn > 5.201)).toBe(true);
    expect(samples).toContain(6);
    expect(samples).toContain(7);
    expect(samples).not.toContain(5);
    expect(samples).not.toContain(8);
  });

  it("returns no residual segment once the destination turn is reached", () => {
    expect(getFutureOrbitTimingSampleTurns(8, 4, 8)).toEqual([]);
    expect(getFutureOrbitTimingSampleTurns(9, 4, 8)).toEqual([]);
  });

  it("swallows every timing point covered by the advancing planet", () => {
    const clipped = clipOrbitTimingPolylineStartToClearance(
      [0, 0.4, 0.8, 2, 3].map((x) => new THREE.Vector3(x, 0, 0)),
      new THREE.Vector3(0, 0, 0),
      1
    );

    expect(clipped.map((point) => point.x)).toEqual([1, 2, 3]);
  });

  it("drops a stale source segment that already trails behind the advancing orbit", () => {
    const clipped = clipOrbitTimingPolylineStartToClearance(
      [-1, 0, 1, 2].map((x) => new THREE.Vector3(x, 0, 0)),
      new THREE.Vector3(0.2, 0, 0),
      0.3
    );

    expect(clipped.map((point) => point.x)).toEqual([0.5, 1, 2]);
  });

  it("clips orbit-to-ghost links at the orbit ring instead of leaving an inner segment", () => {
    expect(getOrbitTimingEndpointClearance({ bodyRadius: 1, ringRadius: 3 })).toBeCloseTo(
      3 * 1.035 + 0.16
    );
    expect(getOrbitTimingEndpointClearance({ bodyRadius: 4, ringRadius: 2 })).toBeCloseTo(
      4 * 1.035 + 0.16
    );
  });

  it("keeps the visible line pinned to a constant surface clearance between samples", () => {
    const surfaceClearance = 0.2;
    const targetX = 3;
    const starts = [0, 0.5, 0.9, 1.01];
    const visibleLengths = starts.map((startX) => {
      const points = [
        new THREE.Vector3(startX, 0, 0),
        ...[1, 2, targetX].filter((x) => x > startX).map((x) => new THREE.Vector3(x, 0, 0))
      ];
      const clipped = clipOrbitTimingPolylineStartToClearance(
        points,
        new THREE.Vector3(startX, 0, 0),
        surfaceClearance
      );

      expect(clipped[0]?.x).toBeCloseTo(startX + surfaceClearance);
      return (clipped.at(-1)?.x ?? startX) - (clipped[0]?.x ?? startX);
    });

    expect(visibleLengths).toEqual([...visibleLengths].sort((first, second) => second - first));
  });
});
