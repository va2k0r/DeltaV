import * as THREE from "three";
import { describe, expect, it } from "vitest";
import type { BodySnapshot, NodeSnapshot, SolarSystemSnapshot } from "../../src/core";
import {
  advanceBurnTrajectoryDashAnimationState,
  buildMissileTrajectoryPreview,
  buildZoomStableBurnPreviewTrajectory,
  burnTrajectoryDashMaximumFrameDeltaSeconds,
  getActiveBurnFlightPathDistanceProgress,
  rebaseBurnTrajectoryDashAnimationState,
  type DisplayNodeRenderData
} from "../../src/renderers/cinematic3d/trajectoryPreview";

describe("BURN trajectory preview", () => {
  it("keeps dash motion continuous while a turn morph changes the measured cycle", () => {
    let state = rebaseBurnTrajectoryDashAnimationState(null, 20, 7, 0);
    const frameSeconds = 1 / 60;
    const phaseSpeed = 10;

    for (let frame = 1; frame <= 180; frame += 1) {
      const elapsed = frame * frameSeconds;
      const nextCycle = 20 + frame * 0.025;
      const rebased = rebaseBurnTrajectoryDashAnimationState(state, nextCycle, 0, elapsed);
      const next = advanceBurnTrajectoryDashAnimationState(state, elapsed, nextCycle, phaseSpeed);
      const forwardStep = positiveModulo(next.phase - rebased.phase, nextCycle);

      expect(forwardStep).toBeCloseTo(frameSeconds * phaseSpeed, 8);
      state = next;
    }
  });

  it("rebases dash phase by cycle fraction instead of absolute elapsed modulo", () => {
    const previous = rebaseBurnTrajectoryDashAnimationState(null, 20, 15, 12);
    const rebased = rebaseBurnTrajectoryDashAnimationState(previous, 24, 0, 13);

    expect(rebased.phase).toBeCloseTo(18);
    expect(rebased.cycle).toBe(24);
    expect(rebased.elapsed).toBe(12);
  });

  it("does not catch up a blocked turn frame as one visible dash jump", () => {
    const phaseSpeed = 10;
    const previous = rebaseBurnTrajectoryDashAnimationState(null, 20, 7, 12);
    const next = advanceBurnTrajectoryDashAnimationState(previous, 14, 20, phaseSpeed);
    const forwardStep = positiveModulo(next.phase - previous.phase, next.cycle);

    expect(forwardStep).toBeCloseTo(burnTrajectoryDashMaximumFrameDeltaSeconds * phaseSpeed, 8);
    expect(next.elapsed).toBe(14);
  });

  it("maps active transfer and insertion timing onto one stable full-path distance", () => {
    const flightPath = {
      transferPoints: [new THREE.Vector3(0, 0, 0), new THREE.Vector3(10, 0, 0)],
      insertionPoints: [new THREE.Vector3(10, 0, 0), new THREE.Vector3(10, 0, 10)],
      insertionStart: 0.25
    };

    expect(getActiveBurnFlightPathDistanceProgress(flightPath, 0)).toBe(0);
    expect(getActiveBurnFlightPathDistanceProgress(flightPath, 0.125)).toBeCloseTo(0.25);
    expect(getActiveBurnFlightPathDistanceProgress(flightPath, 0.25)).toBeCloseTo(0.5);
    expect(getActiveBurnFlightPathDistanceProgress(flightPath, 0.625)).toBeCloseTo(0.75);
    expect(getActiveBurnFlightPathDistanceProgress(flightPath, 1)).toBe(1);
  });

  it("keeps its endpoint approach and departure tangent to and outside the node orbits", () => {
    const snapshot = { turn: 3 } as SolarSystemSnapshot;
    const routes = [
      {
        origin: new THREE.Vector3(24, 0, 12),
        destination: new THREE.Vector3(78, 0, 12),
        arcDirection: 1
      },
      {
        origin: new THREE.Vector3(-48, 0, 26),
        destination: new THREE.Vector3(18, 0, 96),
        arcDirection: -1
      },
      {
        origin: new THREE.Vector3(110, 0, -70),
        destination: new THREE.Vector3(-35, 0, -92),
        arcDirection: 1
      }
    ] as const;

    for (const [routeIndex, route] of routes.entries()) {
      const origin = createDisplayNode(`origin-${routeIndex}`, route.origin, snapshot);
      const destination = createDisplayNode(
        `destination-${routeIndex}`,
        route.destination,
        snapshot
      );
      const points = buildZoomStableBurnPreviewTrajectory(
        origin,
        destination,
        snapshot.turn,
        4,
        undefined,
        route.arcDirection,
        { lockArcBranch: true, style: "burn" }
      );
      const startTangent = points[1]
        ?.clone()
        .sub(points[0] ?? new THREE.Vector3())
        .normalize();
      const endTangent = points[points.length - 1]
        ?.clone()
        .sub(points[points.length - 2] ?? new THREE.Vector3())
        .normalize();

      expect(startTangent).toBeDefined();
      expect(endTangent).toBeDefined();
      expect(
        Math.abs(startTangent?.dot(getPlanarRadial(origin.center, points[0])) ?? 1)
      ).toBeLessThan(0.1);
      expect(
        Math.abs(
          endTangent?.dot(getPlanarRadial(destination.center, points[points.length - 1])) ?? 1
        )
      ).toBeLessThan(0.1);

      const endpointSegmentCount = Math.min(
        points.length - 1,
        Math.max(4, Math.ceil((points.length - 1) * 0.16))
      );
      const endpointRanges = [
        { node: origin, firstSegment: 1, lastSegment: endpointSegmentCount },
        {
          node: destination,
          firstSegment: points.length - endpointSegmentCount,
          lastSegment: points.length - 1
        }
      ];

      for (const { node, firstSegment, lastSegment } of endpointRanges) {
        for (let index = firstSegment; index <= lastSegment; index += 1) {
          const start = points[index - 1];
          const end = points[index];

          if (start === undefined || end === undefined) {
            continue;
          }

          const distance = getPlanarSegmentDistance(node.center, start, end);
          expect(distance).toBeGreaterThanOrEqual(node.ringRadius - 0.001);
        }
      }
    }
  });

  it("keeps the locked arrival tangent on the same orbital side across presentation zooms", () => {
    const snapshot = { turn: 3 } as SolarSystemSnapshot;
    const rawOrigin = new THREE.Vector3(28, 0, -18);
    const rawDestination = new THREE.Vector3(86, 0, 34);
    const presentations = [
      {
        origin: new THREE.Vector3(28, 0, -18),
        destination: new THREE.Vector3(86, 0, 34),
        originRingRadius: 5,
        destinationRingRadius: 5
      },
      {
        origin: new THREE.Vector3(-110, 0, 46),
        destination: new THREE.Vector3(42, 0, -208),
        originRingRadius: 13,
        destinationRingRadius: 16
      },
      {
        origin: new THREE.Vector3(310, 0, -44),
        destination: new THREE.Vector3(-74, 0, 122),
        originRingRadius: 2.5,
        destinationRingRadius: 3
      }
    ] as const;
    let expectedArrivalSide: THREE.Vector3 | null = null;

    for (const [index, presentation] of presentations.entries()) {
      const origin = createDisplayNode(`zoom-origin-${index}`, presentation.origin, snapshot, {
        rawPosition: rawOrigin,
        ringRadius: presentation.originRingRadius
      });
      const destination = createDisplayNode(
        `zoom-destination-${index}`,
        presentation.destination,
        snapshot,
        { rawPosition: rawDestination, ringRadius: presentation.destinationRingRadius }
      );
      const points = buildZoomStableBurnPreviewTrajectory(
        origin,
        destination,
        snapshot.turn,
        3,
        undefined,
        1,
        { lockArcBranch: true, style: "burn" }
      );
      const arrivalSide = getPlanarRadial(destination.center, points[points.length - 1]);

      if (expectedArrivalSide === null) {
        expectedArrivalSide = arrivalSide;
      } else {
        expect(arrivalSide.dot(expectedArrivalSide)).toBeGreaterThan(0.999);
      }
    }
  });
});

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

describe("FIRE trajectory preview", () => {
  it("uses one smooth mortar-shaped spline through the impact point", () => {
    const snapshot = { turn: 3 } as SolarSystemSnapshot;
    const origin = createDisplayNode("fire-origin", new THREE.Vector3(24, 0, 12), snapshot);
    const target = createDisplayNode("fire-target", new THREE.Vector3(110, 0, 64), snapshot);
    const firePoints = buildMissileTrajectoryPreview(origin, target, snapshot.turn, 4);
    const burnPoints = buildZoomStableBurnPreviewTrajectory(
      origin,
      target,
      snapshot.turn,
      4,
      undefined,
      1,
      { lockArcBranch: true, style: "burn" }
    );
    const fireHeight = Math.max(...firePoints.map((point) => point.y));
    const burnHeight = Math.max(...burnPoints.map((point) => point.y));
    const firePlanarBow = getMaximumPlanarChordDeviation(firePoints);
    const burnPlanarBow = getMaximumPlanarChordDeviation(burnPoints);
    const fireChordLength = getPlanarDistance(
      firePoints[0] ?? origin.center,
      firePoints[firePoints.length - 1] ?? target.center
    );

    expect(firePoints[firePoints.length - 1]?.distanceTo(target.center)).toBeLessThan(0.001);
    expect(fireHeight).toBeGreaterThan(burnHeight + 4);
    expect(firePlanarBow).toBeGreaterThan(fireChordLength * 0.06);
    expect(firePlanarBow).toBeLessThan(burnPlanarBow);
    expect(getMaximumTrajectoryTurnRadians(firePoints)).toBeLessThan(THREE.MathUtils.degToRad(8));
  });
});

function createDisplayNode(
  id: string,
  center: THREE.Vector3,
  snapshot: SolarSystemSnapshot,
  options: Readonly<{ rawPosition?: THREE.Vector3; ringRadius?: number }> = {}
): DisplayNodeRenderData {
  const rawPosition = options.rawPosition ?? center;
  return {
    node: {
      id,
      bodyId: id,
      position: { x: rawPosition.x, y: rawPosition.z }
    } as NodeSnapshot,
    body: {
      id,
      parentId: null,
      position: { x: rawPosition.x, y: rawPosition.z }
    } as BodySnapshot,
    center,
    bodyPosition: center.clone(),
    bodyRadius: 1,
    ringRadius: options.ringRadius ?? 5,
    snapshot
  };
}

function getPlanarRadial(center: THREE.Vector3, point: THREE.Vector3 | undefined): THREE.Vector3 {
  const radial = (point ?? center).clone().sub(center);
  radial.y = 0;
  return radial.normalize();
}

function getPlanarSegmentDistance(
  center: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3
): number {
  const segmentX = end.x - start.x;
  const segmentZ = end.z - start.z;
  const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;

  if (segmentLengthSq <= 0.0001) {
    return Math.hypot(start.x - center.x, start.z - center.z);
  }

  const startToCenterX = center.x - start.x;
  const startToCenterZ = center.z - start.z;
  const progress = THREE.MathUtils.clamp(
    (startToCenterX * segmentX + startToCenterZ * segmentZ) / segmentLengthSq,
    0,
    1
  );
  return Math.hypot(
    start.x + segmentX * progress - center.x,
    start.z + segmentZ * progress - center.z
  );
}

function getMaximumPlanarChordDeviation(points: readonly THREE.Vector3[]): number {
  const start = points[0];
  const end = points[points.length - 1];

  if (start === undefined || end === undefined) {
    return 0;
  }

  const chordX = end.x - start.x;
  const chordZ = end.z - start.z;
  const chordLength = Math.hypot(chordX, chordZ);

  if (chordLength <= 0.001) {
    return 0;
  }

  return Math.max(
    ...points.map(
      (point) => Math.abs((point.x - start.x) * chordZ - (point.z - start.z) * chordX) / chordLength
    )
  );
}

function getMaximumTrajectoryTurnRadians(points: readonly THREE.Vector3[]): number {
  let maximumTurn = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    const next = points[index + 1];

    if (previous === undefined || current === undefined || next === undefined) {
      continue;
    }

    const incoming = current.clone().sub(previous).normalize();
    const outgoing = next.clone().sub(current).normalize();
    maximumTurn = Math.max(
      maximumTurn,
      Math.acos(THREE.MathUtils.clamp(incoming.dot(outgoing), -1, 1))
    );
  }

  return maximumTurn;
}

function getPlanarDistance(first: THREE.Vector3, second: THREE.Vector3): number {
  return Math.hypot(second.x - first.x, second.z - first.z);
}
