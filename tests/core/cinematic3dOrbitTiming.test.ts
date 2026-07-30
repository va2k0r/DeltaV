import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  closeBurnPreviewDestinationLoop,
  clipOrbitTimingPolylineStartToClearance,
  createOrbitTimingDottedTrackPoints,
  filterOrbitTimingDottedTrackPointsAroundPaths,
  getBurnPreviewDestinationLoopDirection,
  getFutureOrbitTimingSampleTurns,
  getOrbitTimingEndpointClearance,
  getOrbitTimingGhostCenterClearance
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

  it("extends a burn timing track from the orbit ring to the ghost center marker", () => {
    expect(getOrbitTimingGhostCenterClearance({ bodyRadius: 1 })).toBeCloseTo(1 * 1.035 + 0.16);
    expect(getOrbitTimingGhostCenterClearance({ bodyRadius: 4 })).toBeCloseTo(4 * 1.035 + 0.16);
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

  it("resamples an orbit-to-ghost connector as evenly spaced dots", () => {
    const dots = createOrbitTimingDottedTrackPoints(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(5, 0, 0), new THREE.Vector3(10, 0, 0)],
      2
    );
    const gaps = dots.slice(1).map((dot, index) => dot.distanceTo(dots[index] ?? dot));

    expect(dots).toHaveLength(6);
    expect(dots[0]?.x).toBeCloseTo(0);
    expect(dots.at(-1)?.x).toBeCloseTo(10);
    expect(gaps.every((gap) => Math.abs(gap - 2) < 0.0001)).toBe(true);
  });

  it("interrupts timing dots at a burn path and resumes them beyond it", () => {
    const dots = createOrbitTimingDottedTrackPoints(
      [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)],
      1
    );
    const visibleDots = filterOrbitTimingDottedTrackPointsAroundPaths(dots, [
      {
        points: [new THREE.Vector3(5, 4, -2), new THREE.Vector3(5, 4, 2)],
        clearanceWorld: 1.1
      }
    ]);

    expect(visibleDots.map((point) => point.x)).toEqual([0, 1, 2, 3, 7, 8, 9, 10]);
  });

  it("hides a dotted timing line inside a protected ship orbit and resumes beyond it", () => {
    const dots = createOrbitTimingDottedTrackPoints(
      [new THREE.Vector3(-8, 0, 0), new THREE.Vector3(8, 0, 0)],
      1
    );
    const visibleDots = filterOrbitTimingDottedTrackPointsAroundPaths(dots, [
      {
        points: [new THREE.Vector3(0, 0, 0)],
        clearanceWorld: 3.25
      }
    ]);

    expect(visibleDots.map((point) => point.x)).toEqual([-8, -7, -6, -5, -4, 4, 5, 6, 7, 8]);
  });

  it("closes the burn preview around its destination without moving the flight-path points", () => {
    const destinationCenter = new THREE.Vector3(0, 0, 0);
    const insertionStart = new THREE.Vector3(10, 0.2, 0);
    const flightPathPoints = [
      new THREE.Vector3(-20, 4, 0),
      insertionStart.clone(),
      new THREE.Vector3(0, 0.2, 10)
    ];
    const closedPreview = closeBurnPreviewDestinationLoop(
      flightPathPoints,
      destinationCenter,
      insertionStart,
      1
    );

    expect(closedPreview.length).toBeGreaterThan(flightPathPoints.length);
    expect(closedPreview.at(-1)).toEqual(insertionStart);
    expect(flightPathPoints.at(-1)).toEqual(new THREE.Vector3(0, 0.2, 10));
    expect(
      closedPreview
        .slice(flightPathPoints.length)
        .every((point) => Math.abs(Math.hypot(point.x, point.z) - 10) < 0.0001)
    ).toBe(true);
  });

  it("adds a full closed revolution when the hover preview has no insertion arc", () => {
    const destinationCenter = new THREE.Vector3(0, 0, 0);
    const loopStart = new THREE.Vector3(12, 0.2, 0);
    const previewPoints = [new THREE.Vector3(-20, 3, 0), loopStart.clone()];
    const closedPreview = closeBurnPreviewDestinationLoop(
      previewPoints,
      destinationCenter,
      loopStart,
      -1,
      true
    );

    expect(closedPreview).toHaveLength(previewPoints.length + 36);
    expect(closedPreview.at(-1)).toEqual(loopStart);
    expect(
      closedPreview
        .slice(previewPoints.length)
        .every((point) => Math.abs(Math.hypot(point.x, point.z) - 12) < 0.0001)
    ).toBe(true);
  });

  it("continues the hover transfer into the destination loop without reversing tangent", () => {
    const destinationCenter = new THREE.Vector3(0, 0, 0);
    const previous = new THREE.Vector3(-1, 0.2, 10);
    const arrival = new THREE.Vector3(0, 0.2, 10);
    const transferPoints = [new THREE.Vector3(-20, 3, 10), previous, arrival];
    const direction = getBurnPreviewDestinationLoopDirection(
      undefined,
      transferPoints,
      destinationCenter,
      1
    );
    const closedPreview = closeBurnPreviewDestinationLoop(
      transferPoints,
      destinationCenter,
      arrival,
      direction,
      true
    );
    const incoming = arrival.clone().sub(previous).normalize();
    const outgoing = (closedPreview[transferPoints.length] ?? arrival)
      .clone()
      .sub(arrival)
      .normalize();

    expect(direction).toBe(-1);
    expect(incoming.dot(outgoing)).toBeGreaterThan(0.99);
  });
});
