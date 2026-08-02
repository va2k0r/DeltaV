import { describe, expect, it } from "vitest";
import * as THREE from "three";
import {
  buildFirePreviewGeometry,
  buildTrajectoryPlaneReflectionPoints,
  canonicalFirePreviewGeometryEnabled,
  canonicalFirePreviewTargetMode,
  trimFirePreviewPathBeforeImpact
} from "../../src/renderers/cinematic3d/firePreviewGeometry";

describe("canonical FIRE preview geometry", () => {
  it("reflects only the supplied flight ribbon and keeps its plane-height anchors converged", () => {
    const flightPoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(5, 8, 0),
      new THREE.Vector3(10, 0, 0)
    ];
    const orbitPointsAtPlaneHeight = [new THREE.Vector3(10, 0, 1), new THREE.Vector3(9, 0, 0)];
    const reflectionPoints = buildTrajectoryPlaneReflectionPoints(flightPoints, 0, 0);

    expect(reflectionPoints).toHaveLength(flightPoints.length);
    expect(reflectionPoints[0]?.distanceTo(flightPoints[0] ?? new THREE.Vector3())).toBeLessThan(
      1e-9
    );
    expect(
      reflectionPoints.at(-1)?.distanceTo(flightPoints.at(-1) ?? new THREE.Vector3())
    ).toBeLessThan(1e-9);
    expect(reflectionPoints[1]?.y).toBeLessThan(0);
    expect(
      reflectionPoints.some((point) =>
        orbitPointsAtPlaneHeight.some((orbitPoint) => point.distanceTo(orbitPoint) < 1e-9)
      )
    ).toBe(false);
  });

  it("keeps the flight path and visible reflection on the exact same impact center", () => {
    const cases = [
      {
        etaTurns: 2,
        impactCenter: new THREE.Vector3(120, 0, 18),
        origin: new THREE.Vector3(12, 0.4, 18)
      },
      {
        etaTurns: 4,
        impactCenter: new THREE.Vector3(-35, 1.2, 128),
        origin: new THREE.Vector3(-35, 0.2, -42)
      },
      {
        etaTurns: 7,
        impactCenter: new THREE.Vector3(-96, -0.3, -72),
        origin: new THREE.Vector3(84, 0.8, 61)
      }
    ] as const;

    expect(canonicalFirePreviewGeometryEnabled).toBe(true);
    expect(canonicalFirePreviewTargetMode).toBe("orbit-center");

    for (const testCase of cases) {
      const geometry = buildFirePreviewGeometry({
        ...testCase,
        departureDirection: new THREE.Vector3(0.7, 0, 0.3)
      });
      const flightStart = geometry.flightPoints[0];
      const flightEnd = geometry.flightPoints[geometry.flightPoints.length - 1];
      const reflectionStart = geometry.reflectionPoints[0];
      const reflectionEnd = geometry.reflectionPoints[geometry.reflectionPoints.length - 1];

      expect(flightStart?.distanceTo(testCase.origin)).toBeLessThan(1e-9);
      expect(reflectionStart?.distanceTo(testCase.origin)).toBeLessThan(1e-9);
      expect(flightEnd?.distanceTo(testCase.impactCenter)).toBeLessThan(1e-9);
      expect(reflectionEnd?.distanceTo(testCase.impactCenter)).toBeLessThan(1e-9);
      expect(geometry.impactCenter.distanceTo(testCase.impactCenter)).toBeLessThan(1e-9);
      expect(
        [...geometry.flightPoints, ...geometry.reflectionPoints].every((point) => {
          return Number.isFinite(point.x) && Number.isFinite(point.y) && Number.isFinite(point.z);
        })
      ).toBe(true);
    }
  });

  it("aims at the X center but stops the visible path just before it", () => {
    const impactCenter = new THREE.Vector3(95, 0, -38);
    const geometry = buildFirePreviewGeometry({
      departureDirection: new THREE.Vector3(-0.2, 0, 1),
      etaTurns: 5,
      impactCenter,
      origin: new THREE.Vector3(-70, 0, 52)
    });

    for (const points of [geometry.flightPoints, geometry.reflectionPoints]) {
      const trimmed = trimFirePreviewPathBeforeImpact(points, 7);
      const previous = trimmed[trimmed.length - 2];
      const terminal = trimmed[trimmed.length - 1];
      const directionToCenter = impactCenter.clone().sub(terminal ?? impactCenter);
      const finalSegmentDirection = (terminal ?? impactCenter)
        .clone()
        .sub(previous ?? terminal ?? impactCenter);

      expect(previous).toBeDefined();
      expect(terminal).toBeDefined();
      expect(terminal?.distanceTo(impactCenter)).toBeGreaterThan(6);
      expect(terminal?.distanceTo(impactCenter)).toBeLessThan(8);
      expect(finalSegmentDirection.dot(directionToCenter)).toBeGreaterThan(0);
      expect(points.at(-1)?.distanceTo(impactCenter)).toBeLessThan(1e-9);
      expect(previous === terminal).toBe(false);
    }
  });

  it("is independent from camera zoom and preserves its canonical anchor at every world scale", () => {
    const scales = [0.15, 1, 18] as const;

    for (const scale of scales) {
      const origin = new THREE.Vector3(7, 0.4, -11).multiplyScalar(scale);
      const impactCenter = new THREE.Vector3(-42, 0.4, 86).multiplyScalar(scale);
      const geometry = buildFirePreviewGeometry({
        arcDirection: 1,
        etaTurns: 3,
        impactCenter,
        origin
      });

      expect(geometry.flightPoints.at(-1)?.distanceTo(impactCenter)).toBeLessThan(1e-9);
      expect(geometry.reflectionPoints.at(-1)?.distanceTo(impactCenter)).toBeLessThan(1e-9);
    }
  });

  it("keeps the selected orbital arc branch independent from transformed endpoint positions", () => {
    const origin = new THREE.Vector3(14, 0, -8);
    const impactCenter = new THREE.Vector3(-62, 0, 73);
    const positiveArc = buildFirePreviewGeometry({
      arcDirection: 1,
      etaTurns: 4,
      impactCenter,
      origin
    });
    const negativeArc = buildFirePreviewGeometry({
      arcDirection: -1,
      etaTurns: 4,
      impactCenter,
      origin
    });
    const positiveMidpoint =
      positiveArc.flightPoints[Math.floor(positiveArc.flightPoints.length / 2)];
    const negativeMidpoint =
      negativeArc.flightPoints[Math.floor(negativeArc.flightPoints.length / 2)];
    const planarDirect = impactCenter.clone().sub(origin).setY(0).normalize();
    const positiveSide = new THREE.Vector3(-planarDirect.z, 0, planarDirect.x);

    expect(positiveMidpoint).toBeDefined();
    expect(negativeMidpoint).toBeDefined();
    expect(
      (positiveMidpoint ?? origin)
        .clone()
        .sub(negativeMidpoint ?? origin)
        .dot(positiveSide)
    ).toBeGreaterThan(0);
  });
});
