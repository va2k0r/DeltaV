import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { createSolarSystemSnapshot, type SolarSystemSnapshot, type Vec2 } from "../../src/core";
import {
  STRATEGIC_MAP_PRESET_ID,
  getMapPreset,
  parseSolarSystemData,
  type SolarSystemData
} from "../../src/data";
import {
  SYSTEM_PRESENTATION_FOCUS_TARGET_KEY,
  createCinematicDisplayState,
  createOrbitalTransitionSnapshot,
  defaultCinematic3dVisualTuning
} from "../../src/renderers/cinematic3d";

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);
const minDistance = 70;
const zoomOutDistance = 1500;
const requestedZoomOutBodyScaleRatios = new Map([
  ["sun", 5.225],
  ["jupiter", 3.9235],
  ["saturn", 3.249],
  ["uranus", 1.998],
  ["neptune", 1.998],
  ["earth", 0.95],
  ["venus", 0.931],
  ["mars", 0.684],
  ["mercury", 0.506],
  ["pluto", 0.399],
  ["ganymede", 0.684],
  ["titan", 0.665],
  ["callisto", 0.627],
  ["io", 0.522],
  ["moon", 0.468],
  ["europa", 0.45],
  ["triton", 0.46],
  ["titania", 0.4232],
  ["oberon", 0.414],
  ["iapetus", 0.3696],
  ["charon", 0.3128],
  ["phobos", 0.2464],
  ["deimos", 0.2112]
]);
const requestedZoomInBodyScaleRatios = new Map([
  ["sun", 7.8],
  ["jupiter", 5.15],
  ["saturn", 4.45],
  ["uranus", 2.12],
  ["neptune", 2.12],
  ["earth", 1],
  ["venus", 0.95],
  ["mars", 0.6],
  ["mercury", 0.4],
  ["pluto", 0.26],
  ["ganymede", 0.43],
  ["titan", 0.42],
  ["callisto", 0.39],
  ["io", 0.35],
  ["moon", 0.31],
  ["europa", 0.3],
  ["triton", 0.3],
  ["titania", 0.27],
  ["oberon", 0.27],
  ["iapetus", 0.23],
  ["charon", 0.17],
  ["phobos", 0.095],
  ["deimos", 0.076]
]);
const requestedZoomOutMoonOrbitScales = new Map([
  ["moon", 1.15 * 0.92],
  ["phobos", 1.2 * 0.92],
  ["deimos", 1.3 * 0.92],
  ["io", 1.3 * 0.92],
  ["europa", 1.6 * 0.92],
  ["ganymede", 1.7 * 0.92],
  ["callisto", 1.8 * 0.92],
  ["titan", 1.4 * 0.92],
  ["iapetus", 1.8 * 0.92 * 0.65],
  ["titania", 1.4 * 0.92],
  ["oberon", 1.7 * 0.92 * 0.75],
  ["triton", 1.35 * 0.92],
  ["charon", 1.3 * 0.92]
]);
const previousZoomOutHeliocentricSpacingMultipliers = new Map([
  ["mercury", 1.1],
  ["venus", 1.0183],
  ["earth", 1.0134],
  ["mars", 1.05],
  ["jupiter", 1.08],
  ["saturn", 1.1],
  ["uranus", 1.1424],
  ["neptune", 1.1742],
  ["pluto", 1.2064]
]);

const expectedMoonOrbitGroups = [
  ["phobos", "deimos"],
  ["europa", "ganymede", "callisto"]
] as const;
const requestedZoomInMoonOrbitRadiusRatios = new Map([
  ["moon", 4.9],
  ["phobos", 4.4],
  ["deimos", 4.4],
  ["io", 3.2],
  ["europa", 5.1],
  ["ganymede", 5.1],
  ["callisto", 5.1],
  ["titan", 4.4],
  ["iapetus", 6.6],
  ["titania", 4.1],
  ["oberon", 5.9],
  ["triton", 4.5],
  ["charon", 3.2]
]);

function loadContent(): SolarSystemData {
  return parseSolarSystemData(JSON.parse(readFileSync(bodiesJsonUrl, "utf8")));
}

function loadStrategicContent(): SolarSystemData {
  const preset = getMapPreset(STRATEGIC_MAP_PRESET_ID);

  if (preset.content === undefined) {
    throw new Error("Expected strategic map preset content.");
  }

  return preset.content;
}

function createDisplayState(
  snapshot: SolarSystemSnapshot,
  focusedTargetKey: string | null,
  distance = zoomOutDistance,
  visualTurn?: number
) {
  return createCinematicDisplayState(snapshot, {
    focusedTargetKey,
    distance,
    zoomOutDistance,
    minDistance,
    tuning: defaultCinematic3dVisualTuning,
    ...(visualTurn === undefined ? {} : { visualTurn })
  });
}

function findBody(snapshot: SolarSystemSnapshot, bodyId: string) {
  const body = snapshot.bodies.find((candidate) => candidate.id === bodyId);

  if (body === undefined) {
    throw new Error(`Expected body "${bodyId}".`);
  }

  return body;
}

function findNode(snapshot: SolarSystemSnapshot, nodeId: string) {
  const node = snapshot.nodes.find((candidate) => candidate.id === nodeId);

  if (node === undefined) {
    throw new Error(`Expected node "${nodeId}".`);
  }

  return node;
}

function distance(first: Vec2, second: Vec2): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function mix(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function smoothZoomCurve(value: number): number {
  const x = Math.min(1, Math.max(0, value));
  return x * x * (3 - 2 * x);
}

function relativeDisplayAngleDegrees(
  display: ReturnType<typeof createDisplayState>,
  bodyId: string,
  parentBodyId: string
): number {
  const body = display.bodyPositions.get(bodyId);
  const parent = display.bodyPositions.get(parentBodyId);

  if (body === undefined || parent === undefined) {
    throw new Error(`Expected display positions for "${bodyId}" and "${parentBodyId}".`);
  }

  const angle = (Math.atan2(body.y - parent.y, body.x - parent.x) * 180) / Math.PI;
  return (angle + 360) % 360;
}

function angularDeltaDegrees(from: number, to: number): number {
  return (to - from + 360) % 360;
}

function nodeRingRadius(
  snapshot: SolarSystemSnapshot,
  nodeId: string,
  display: ReturnType<typeof createDisplayState>
): number {
  const node = findNode(snapshot, nodeId);
  return node.nodeOrbitRadius * display.nodeRingScales.get(node.id)!;
}

function displayOrbitRadius(
  display: ReturnType<typeof createDisplayState>,
  bodyId: string
): number {
  const orbitRadius = display.orbitRadii.get(bodyId);

  if (orbitRadius === undefined) {
    throw new Error(`Expected display orbit radius for "${bodyId}".`);
  }

  return orbitRadius;
}

function displayHeliocentricRadius(
  display: ReturnType<typeof createDisplayState>,
  bodyId: string
): number {
  return distance(display.bodyPositions.get("sun")!, display.bodyPositions.get(bodyId)!);
}

function localOrbitEnvelope(
  snapshot: SolarSystemSnapshot,
  display: ReturnType<typeof createDisplayState>,
  bodyId: string
): number {
  let envelope = 0;

  for (const body of snapshot.bodies) {
    if (body.parentId === bodyId) {
      envelope = Math.max(envelope, displayOrbitRadius(display, body.id));
    }
  }

  return envelope;
}

function previousFinalHeliocentricRadii(
  snapshot: SolarSystemSnapshot,
  display: ReturnType<typeof createDisplayState>
): Map<string, number> {
  const radii = new Map<string, number>();
  const planets = snapshot.bodies
    .filter((body) => body.parentId === "sun")
    .sort((first, second) => first.orbitRadius - second.orbitRadius);
  let previousBodyId: string | null = null;
  let previousRadius = 0;

  for (const body of planets) {
    const multiplier = previousZoomOutHeliocentricSpacingMultipliers.get(body.id) ?? 1;
    let radius = body.orbitRadius * display.heliocentricScale * multiplier;

    if (previousBodyId !== null) {
      const minimumGap =
        Math.max(
          localOrbitEnvelope(snapshot, display, previousBodyId),
          localOrbitEnvelope(snapshot, display, body.id)
        ) + 10;
      radius = Math.max(radius, previousRadius + minimumGap);
    }

    radii.set(body.id, radius);
    previousBodyId = body.id;
    previousRadius = radius;
  }

  return radii;
}

function expectBodyScaleRatios(
  display: ReturnType<typeof createDisplayState>,
  expectedRatios: ReadonlyMap<string, number>
): void {
  const referenceEarthRadius = getReferenceEarthRadius(display, expectedRatios);

  for (const [bodyId, expectedRatio] of expectedRatios) {
    const bodyRadius = display.bodyRadii.get(bodyId);

    if (bodyRadius === undefined) {
      continue;
    }

    expect(bodyRadius / referenceEarthRadius).toBeCloseTo(expectedRatio, 3);
  }
}

function getReferenceEarthRadius(
  display: ReturnType<typeof createDisplayState>,
  expectedRatios: ReadonlyMap<string, number>
): number {
  const earthRadius = display.bodyRadii.get("earth");

  if (earthRadius === undefined) {
    throw new Error("Expected Earth display radius.");
  }

  return earthRadius / (expectedRatios.get("earth") ?? 1);
}

function sunGlowRatioToReferenceEarth(
  display: ReturnType<typeof createDisplayState>,
  expectedEarthRatio: number
): number {
  const earthRadius = display.bodyRadii.get("earth");
  const sunRadius = display.bodyRadii.get("sun");

  if (earthRadius === undefined || sunRadius === undefined) {
    throw new Error("Expected Earth and Sun display radii.");
  }

  const referenceEarthRadius = earthRadius / expectedEarthRatio;

  return (
    (sunRadius * defaultCinematic3dVisualTuning.sunCoronaScale * display.sunGlowScale) /
    referenceEarthRadius
  );
}

function expectSameDisplayOrbit(
  display: ReturnType<typeof createDisplayState>,
  bodyIds: readonly string[]
): void {
  const firstRadius = displayOrbitRadius(display, bodyIds[0]!);

  for (const bodyId of bodyIds.slice(1)) {
    expect(displayOrbitRadius(display, bodyId)).toBeCloseTo(firstRadius, 8);
  }
}

function expectIndependentOrbitRailsDoNotIntersect(
  snapshot: SolarSystemSnapshot,
  display: ReturnType<typeof createDisplayState>
): void {
  const circles = snapshot.bodies
    .filter((body) => body.parentId !== null)
    .map((body) => {
      const parentPosition = display.bodyPositions.get(body.parentId!);
      const radius = display.orbitRadii.get(body.id);

      if (parentPosition === undefined || radius === undefined) {
        throw new Error(`Expected display orbit circle for "${body.id}".`);
      }

      return {
        body,
        center: parentPosition,
        radius
      };
    });

  for (let firstIndex = 0; firstIndex < circles.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < circles.length; secondIndex += 1) {
      const first = circles[firstIndex]!;
      const second = circles[secondIndex]!;

      if (areParentChildOrbitRails(first.body, second.body)) {
        continue;
      }

      const centerDistance = distance(first.center, second.center);
      const outerSeparation = first.radius + second.radius;
      const innerSeparation = Math.abs(first.radius - second.radius);
      const intersects =
        centerDistance < outerSeparation - 0.001 && centerDistance > innerSeparation + 0.001;

      expect(intersects, `${first.body.id} orbit intersects ${second.body.id} orbit`).toBe(false);
    }
  }
}

function areParentChildOrbitRails(
  first: ReturnType<typeof findBody>,
  second: ReturnType<typeof findBody>
): boolean {
  return first.parentId === second.id || second.parentId === first.id;
}

describe("Cinematic display scale", () => {
  it("expands heliocentric spacing while keeping moon systems local", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null);
    const sun = findBody(snapshot, "sun");
    const jupiter = findBody(snapshot, "jupiter");
    const callisto = findBody(snapshot, "callisto");
    const displaySun = display.bodyPositions.get("sun");
    const displayJupiter = display.bodyPositions.get("jupiter");
    const displayCallisto = display.bodyPositions.get("callisto");

    expect(displaySun).toBeDefined();
    expect(displayJupiter).toBeDefined();
    expect(displayCallisto).toBeDefined();

    const coreHeliocentricDistance = distance(sun.position, jupiter.position);
    const displayHeliocentricDistance = distance(displaySun!, displayJupiter!);
    const coreLocalDistance = distance(jupiter.position, callisto.position);
    const displayLocalDistance = distance(displayJupiter!, displayCallisto!);
    const localReadabilityAllowance =
      defaultCinematic3dVisualTuning.parentMoonNodeRingMinGap +
      defaultCinematic3dVisualTuning.moonNodeRingMinRadius +
      defaultCinematic3dVisualTuning.nodeRingMinGap;

    expect(displayHeliocentricDistance).toBeGreaterThan(coreHeliocentricDistance * 1.05);
    expect(displayLocalDistance).toBeLessThanOrEqual(
      (coreLocalDistance * defaultCinematic3dVisualTuning.localMoonScaleMax +
        localReadabilityAllowance) *
        requestedZoomOutMoonOrbitScales.get("callisto")!
    );
    expect(displayLocalDistance).toBeLessThan(displayHeliocentricDistance * 0.65);
  });

  it("expands focused local moon systems a little further without losing tactical bounds", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const overview = createDisplayState(snapshot, null);
    const focused = createDisplayState(snapshot, "body:jupiter", 220);
    const jupiter = findBody(snapshot, "jupiter");
    const callisto = findBody(snapshot, "callisto");
    const focusedLocalDistance = distance(
      focused.bodyPositions.get("jupiter")!,
      focused.bodyPositions.get("callisto")!
    );
    const coreLocalDistance = distance(jupiter.position, callisto.position);
    const overviewHeliocentricDistance = distance(
      overview.bodyPositions.get("sun")!,
      overview.bodyPositions.get("jupiter")!
    );
    const focusedHeliocentricDistance = distance(
      focused.bodyPositions.get("sun")!,
      focused.bodyPositions.get("jupiter")!
    );
    const heliocentricGrowth = focusedHeliocentricDistance / overviewHeliocentricDistance;
    const focusedCallistoRadiusRatio = focusedLocalDistance / focused.bodyRadii.get("jupiter")!;

    expect(focused.heliocentricScale).toBeGreaterThan(overview.heliocentricScale);
    expect(heliocentricGrowth).toBeGreaterThan(1.9);
    expect(focusedLocalDistance).toBeGreaterThan(
      coreLocalDistance * defaultCinematic3dVisualTuning.localMoonScaleBase
    );
    expect(focusedCallistoRadiusRatio).toBeGreaterThan(4.8);
    expect(focusedCallistoRadiusRatio).toBeLessThan(6.1);
    expect(heliocentricGrowth).toBeGreaterThan(2.1);
  });

  it("compresses heliocentric spacing at zoom-out and exaggerates it at zoom-in", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const zoomedOut = createDisplayState(snapshot, null, zoomOutDistance);
    const zoomedIn = createDisplayState(snapshot, null, 160);
    const outDistance = distance(
      zoomedOut.bodyPositions.get("sun")!,
      zoomedOut.bodyPositions.get("neptune")!
    );
    const inDistance = distance(
      zoomedIn.bodyPositions.get("sun")!,
      zoomedIn.bodyPositions.get("neptune")!
    );

    expect(zoomedOut.heliocentricScale).toBeLessThan(
      defaultCinematic3dVisualTuning.heliocentricScaleBase
    );
    expect(inDistance).toBeGreaterThan(outDistance * 1.3);
  });

  it("ramps heliocentric scale continuously without a final wheel-step explosion", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const displays = [zoomOutDistance, 1180, 840, 480, minDistance].map((distanceValue) =>
      createDisplayState(snapshot, null, distanceValue)
    );
    const scales = displays.map((display) => display.heliocentricScale);

    for (let index = 1; index < scales.length; index += 1) {
      expect(scales[index]).toBeGreaterThan(scales[index - 1]!);
    }

    expect(scales[1]! / scales[0]!).toBeGreaterThan(1.3);
    expect(scales[4]! / scales[0]!).toBeGreaterThan(4.2);
    expect(scales[4]! / scales[0]!).toBeLessThan(5.2);

    for (let index = 1; index < scales.length; index += 1) {
      expect(scales[index]! / scales[index - 1]!).toBeLessThan(1.95);
    }
  });

  it("keeps requested strategic zoom-out heliocentric spacing multipliers as minimums", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const scaledOrbitRatio = (bodyId: string) => {
      const body = findBody(snapshot, bodyId);
      return (
        distance(display.bodyPositions.get("sun")!, display.bodyPositions.get(bodyId)!) /
        Math.max(0.001, body.orbitRadius * display.heliocentricScale)
      );
    };

    expect(scaledOrbitRatio("mercury")).toBeGreaterThanOrEqual(1.155);
    expect(scaledOrbitRatio("venus")).toBeGreaterThanOrEqual(1.171045);
    expect(scaledOrbitRatio("earth")).toBeGreaterThanOrEqual(1.21608);
    expect(scaledOrbitRatio("mars")).toBeGreaterThanOrEqual(1.365);
    expect(scaledOrbitRatio("jupiter")).toBeGreaterThanOrEqual(1.08);
    expect(scaledOrbitRatio("saturn")).toBeGreaterThanOrEqual(1.1);
    expect(scaledOrbitRatio("uranus")).toBeGreaterThanOrEqual(1.1424);
    expect(scaledOrbitRatio("neptune")).toBeGreaterThanOrEqual(1.1742);
    expect(scaledOrbitRatio("pluto")).toBeGreaterThanOrEqual(1.2064);
  });

  it("keeps Mars-to-outer heliocentric gaps unchanged after moving Mars outward", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const previousRadii = previousFinalHeliocentricRadii(snapshot, display);
    const gapPairs = [
      ["mars", "jupiter"],
      ["jupiter", "saturn"],
      ["saturn", "uranus"],
      ["uranus", "neptune"],
      ["neptune", "pluto"]
    ] as const;

    for (const [innerId, outerId] of gapPairs) {
      const expectedGap = previousRadii.get(outerId)! - previousRadii.get(innerId)!;
      const actualGap =
        displayHeliocentricRadius(display, outerId) - displayHeliocentricRadius(display, innerId);

      expect(actualGap, `${innerId}-${outerId} gap`).toBeCloseTo(expectedGap, 3);
    }
  });

  it("applies requested absolute body scale ratios in zoom-out and zoom-in", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const zoomedOut = createDisplayState(snapshot, null, zoomOutDistance);
    const zoomedIn = createDisplayState(snapshot, null, minDistance);

    expectBodyScaleRatios(zoomedOut, requestedZoomOutBodyScaleRatios);
    expectBodyScaleRatios(zoomedIn, requestedZoomInBodyScaleRatios);
    expect(
      sunGlowRatioToReferenceEarth(zoomedOut, requestedZoomOutBodyScaleRatios.get("earth")!)
    ).toBeCloseTo(10.9, 3);
    expect(
      sunGlowRatioToReferenceEarth(zoomedIn, requestedZoomInBodyScaleRatios.get("earth")!)
    ).toBeCloseTo(16, 3);
  });

  it("interpolates requested body and glow scales by zoom level", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const zoomedOut = createDisplayState(snapshot, null, zoomOutDistance);
    const halfway = createDisplayState(snapshot, null, (zoomOutDistance + minDistance) / 2);
    const zoomedIn = createDisplayState(snapshot, null, minDistance);
    const halfwayZoomCurve = smoothZoomCurve(0.5);
    const halfwayEarthRatio = mix(
      requestedZoomOutBodyScaleRatios.get("earth")!,
      requestedZoomInBodyScaleRatios.get("earth")!,
      halfwayZoomCurve
    );
    const halfwayReferenceEarth = halfway.bodyRadii.get("earth")! / halfwayEarthRatio;

    expectBodyScaleRatios(zoomedOut, requestedZoomOutBodyScaleRatios);
    expectBodyScaleRatios(zoomedIn, requestedZoomInBodyScaleRatios);
    expect(halfway.bodyRadii.get("jupiter")! / halfwayReferenceEarth).toBeCloseTo(
      mix(3.9235, 5.15, halfwayZoomCurve),
      3
    );
    expect(sunGlowRatioToReferenceEarth(halfway, halfwayEarthRatio)).toBeCloseTo(
      mix(10.9, 16, halfwayZoomCurve),
      3
    );
  });

  it("keeps zoomed-out local systems readable without changing node ring scale", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const localDistance = (parentId: string, bodyId: string) =>
      distance(display.bodyPositions.get(parentId)!, display.bodyPositions.get(bodyId)!);
    const ioDistance = localDistance("jupiter", "io");

    expect(localDistance("mars", "phobos")).toBeCloseTo(localDistance("mars", "deimos"), 8);
    expect(ioDistance).toBeLessThan(localDistance("jupiter", "europa"));
    expect(localDistance("jupiter", "europa")).toBeGreaterThan(ioDistance * 1.15);
    expect(localDistance("jupiter", "ganymede")).toBeGreaterThan(ioDistance * 1.15);
    expect(localDistance("jupiter", "ganymede")).toBeCloseTo(
      localDistance("jupiter", "callisto"),
      8
    );
    expect(localDistance("jupiter", "europa")).toBeCloseTo(localDistance("jupiter", "callisto"), 8);
    expect(localDistance("saturn", "titan")).toBeLessThan(localDistance("saturn", "iapetus"));
    expect(localDistance("uranus", "titania")).toBeLessThan(localDistance("uranus", "oberon"));
    expect(localDistance("pluto", "charon")).toBeLessThan(localDistance("saturn", "iapetus"));
    expect(localDistance("pluto", "charon")).toBeLessThan(localDistance("jupiter", "callisto"));

    expect(display.nodeRingScales.get("io_node")).toBe(display.nodeRingScales.get("europa_node"));
    expect(display.nodeRingScales.get("ganymede_node")).toBe(
      display.nodeRingScales.get("callisto_node")
    );
  });

  it("keeps requested moon orbit groups concentric and separated", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const overview = createDisplayState(snapshot, null, zoomOutDistance);
    const focused = createDisplayState(snapshot, "body:jupiter", 180);

    for (const display of [overview, focused]) {
      for (const group of expectedMoonOrbitGroups) {
        expectSameDisplayOrbit(display, group);
      }

      expect(displayOrbitRadius(display, "io")).toBeLessThan(displayOrbitRadius(display, "europa"));
      expect(displayOrbitRadius(display, "phobos")).toBeCloseTo(
        displayOrbitRadius(display, "deimos"),
        8
      );
      expect(
        angularDeltaDegrees(
          relativeDisplayAngleDegrees(display, "phobos", "mars"),
          relativeDisplayAngleDegrees(display, "deimos", "mars")
        )
      ).toBeCloseTo(180, 8);
      expect(displayOrbitRadius(display, "titan")).toBeLessThan(
        displayOrbitRadius(display, "iapetus")
      );
      expect(displayOrbitRadius(display, "titania")).toBeLessThan(
        displayOrbitRadius(display, "oberon")
      );
    }
  });

  it("keeps zoom-in local moon orbit distances tied to parent body radius targets", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const display = createDisplayState(snapshot, null, minDistance);
    const bodiesById = new Map(snapshot.bodies.map((body) => [body.id, body]));

    for (const [moonId, targetRatio] of requestedZoomInMoonOrbitRadiusRatios) {
      const moon = bodiesById.get(moonId);

      if (moon === undefined || moon.parentId === null) {
        continue;
      }

      const parentRadius = display.bodyRadii.get(moon.parentId);

      if (parentRadius === undefined) {
        throw new Error(`Expected parent display radius for "${moon.parentId}".`);
      }

      const actualRatio = displayOrbitRadius(display, moonId) / parentRadius;
      expect(actualRatio, `${moonId} orbit ratio`).toBeGreaterThan(targetRatio - 0.12);
      expect(actualRatio, `${moonId} orbit ratio`).toBeLessThan(Math.max(targetRatio * 3.2, 18));
    }
  });

  it("keeps independent orbit rails from intersecting across representative zoom levels", () => {
    const contents = [loadContent(), loadStrategicContent()];
    const focusKeys = [null, "body:earth", "body:mars", "body:jupiter", "body:saturn"];
    const distances = [zoomOutDistance, 900, 420, 180, minDistance];

    for (const content of contents) {
      const snapshot = createSolarSystemSnapshot(content, 0);

      for (const focusKey of focusKeys) {
        for (const distanceValue of distances) {
          const display = createDisplayState(snapshot, focusKey, distanceValue);
          expectIndependentOrbitRailsDoNotIntersect(snapshot, display);
        }
      }
    }
  });

  it("keeps Mercury and Venus on distinct concentric lanes at max zoom-out", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const mercuryRadius = displayOrbitRadius(display, "mercury");
    const venusRadius = displayOrbitRadius(display, "venus");

    expect(mercuryRadius).toBeLessThan(venusRadius);
    expect(venusRadius - mercuryRadius).toBeGreaterThanOrEqual(10 - 0.001);
  });

  it("keeps the planet cadence ordered from the inner to the outer system", () => {
    const content = loadStrategicContent();
    const snapshot = createSolarSystemSnapshot(content, 0);
    const turnZero = createDisplayState(snapshot, null, zoomOutDistance);
    const turnOne = createDisplayState(
      createSolarSystemSnapshot(content, 1),
      null,
      zoomOutDistance
    );
    const planetIds = [
      "mercury",
      "venus",
      "earth",
      "mars",
      "jupiter",
      "saturn",
      "uranus",
      "neptune",
      "pluto"
    ] as const;
    const angularDeltas = new Map<string, number>();

    for (const bodyId of planetIds) {
      const currentPosition = turnZero.bodyPositions.get(bodyId);
      const nextPosition = turnOne.bodyPositions.get(bodyId);

      if (currentPosition === undefined || nextPosition === undefined) {
        throw new Error(`Expected display positions for "${bodyId}".`);
      }

      angularDeltas.set(
        bodyId,
        angularDeltaDegrees(
          relativeDisplayAngleDegrees(turnZero, bodyId, "sun"),
          relativeDisplayAngleDegrees(turnOne, bodyId, "sun")
        )
      );
    }

    expect(angularDeltas.get("mercury")!).toBeGreaterThan(angularDeltas.get("earth")!);
    expect(angularDeltas.get("earth")!).toBeGreaterThan(angularDeltas.get("jupiter")!);
    expect(angularDeltas.get("jupiter")!).toBeGreaterThan(angularDeltas.get("pluto")!);
    expect(angularDeltas.get("earth")!).toBeCloseTo(10, 8);
  });

  it("keeps every planet ghost roughly one node radius away per turn at max zoom-out", () => {
    const contents = [loadContent(), loadStrategicContent()];

    for (const content of contents) {
      for (let turn = 0; turn < 24; turn += 1) {
        const currentSnapshot = createSolarSystemSnapshot(content, turn);
        const nextSnapshot = createSolarSystemSnapshot(content, turn + 1);
        const current = createDisplayState(currentSnapshot, null, zoomOutDistance);
        const next = createDisplayState(nextSnapshot, null, zoomOutDistance);

        for (const node of currentSnapshot.nodes) {
          const body = findBody(currentSnapshot, node.bodyId);

          if (body.visualClass === "star" || body.kind === "moon") {
            continue;
          }

          const currentPosition = current.bodyPositions.get(body.id);
          const nextPosition = next.bodyPositions.get(body.id);

          if (currentPosition === undefined || nextPosition === undefined) {
            throw new Error(`Expected display positions for "${body.id}".`);
          }

          const currentNodeRadius =
            node.nodeOrbitRadius * (current.nodeRingScales.get(node.id) ?? 1);
          const nextNodeRadius = node.nodeOrbitRadius * (next.nodeRingScales.get(node.id) ?? 1);
          const requiredGhostSeparation = Math.max(currentNodeRadius, nextNodeRadius);

          expect(
            distance(currentPosition, nextPosition),
            `${body.id} at T${turn}`
          ).toBeGreaterThanOrEqual(requiredGhostSeparation * 0.9 - 0.1);
        }
      }
    }
  });

  it("keeps every moon's local orbital step roughly one node radius wide", () => {
    const contents = [loadContent(), loadStrategicContent()];

    for (const content of contents) {
      for (let turn = 0; turn < 24; turn += 1) {
        const currentSnapshot = createSolarSystemSnapshot(content, turn);
        const nextSnapshot = createSolarSystemSnapshot(content, turn + 1);
        const current = createDisplayState(currentSnapshot, null, zoomOutDistance);
        const next = createDisplayState(nextSnapshot, null, zoomOutDistance);

        for (const node of currentSnapshot.nodes) {
          const body = findBody(currentSnapshot, node.bodyId);

          if (body.kind !== "moon" || body.parentId === null) {
            continue;
          }

          const currentPosition = current.bodyPositions.get(body.id);
          const nextPosition = next.bodyPositions.get(body.id);
          const currentParentPosition = current.bodyPositions.get(body.parentId);
          const nextParentPosition = next.bodyPositions.get(body.parentId);

          if (
            currentPosition === undefined ||
            nextPosition === undefined ||
            currentParentPosition === undefined ||
            nextParentPosition === undefined
          ) {
            throw new Error(`Expected display positions for "${body.id}" and its parent.`);
          }

          const currentNodeRadius =
            node.nodeOrbitRadius * (current.nodeRingScales.get(node.id) ?? 1);
          const nextNodeRadius = node.nodeOrbitRadius * (next.nodeRingScales.get(node.id) ?? 1);
          const requiredLocalTravel = Math.max(currentNodeRadius, nextNodeRadius);
          const currentLocalPosition = {
            x: currentPosition.x - currentParentPosition.x,
            y: currentPosition.y - currentParentPosition.y
          };
          const nextLocalPosition = {
            x: nextPosition.x - nextParentPosition.x,
            y: nextPosition.y - nextParentPosition.y
          };

          expect(
            distance(currentLocalPosition, nextLocalPosition),
            `${body.id} at T${turn}`
          ).toBeGreaterThanOrEqual(requiredLocalTravel * 0.9 - 0.1);
        }
      }
    }
  });

  it("rotates moon presentation for ghost readability as rigid local systems", () => {
    const turnZero = createDisplayState(
      createSolarSystemSnapshot(loadStrategicContent(), 0),
      null,
      zoomOutDistance
    );
    const turnOne = createDisplayState(
      createSolarSystemSnapshot(loadStrategicContent(), 1),
      null,
      zoomOutDistance
    );
    const jovianMoons = ["io", "europa", "ganymede", "callisto"];

    const jovianDegreesPerTurn = angularDeltaDegrees(
      relativeDisplayAngleDegrees(turnZero, jovianMoons[0]!, "jupiter"),
      relativeDisplayAngleDegrees(turnOne, jovianMoons[0]!, "jupiter")
    );

    expect(jovianDegreesPerTurn).toBeGreaterThanOrEqual(42);

    for (const moonId of jovianMoons.slice(1)) {
      expect(
        angularDeltaDegrees(
          relativeDisplayAngleDegrees(turnZero, moonId, "jupiter"),
          relativeDisplayAngleDegrees(turnOne, moonId, "jupiter")
        )
      ).toBeCloseTo(jovianDegreesPerTurn, 8);
    }

    for (let index = 1; index < jovianMoons.length; index += 1) {
      const previousMoonId = jovianMoons[index - 1]!;
      const currentMoonId = jovianMoons[index]!;
      const turnZeroPhase = angularDeltaDegrees(
        relativeDisplayAngleDegrees(turnZero, previousMoonId, "jupiter"),
        relativeDisplayAngleDegrees(turnZero, currentMoonId, "jupiter")
      );
      const turnOnePhase = angularDeltaDegrees(
        relativeDisplayAngleDegrees(turnOne, previousMoonId, "jupiter"),
        relativeDisplayAngleDegrees(turnOne, currentMoonId, "jupiter")
      );

      expect(turnOnePhase).toBeCloseTo(turnZeroPhase, 8);
    }
  });

  it("interpolates visual moon rotation smoothly during turn transitions", () => {
    const content = loadStrategicContent();
    const from = createSolarSystemSnapshot(content, 0);
    const to = createSolarSystemSnapshot(content, 1);
    const midpoint = createOrbitalTransitionSnapshot(from, to, 0.5);
    const turnZero = createDisplayState(from, null, zoomOutDistance, 0);
    const halfway = createDisplayState(midpoint, null, zoomOutDistance, 0.5);
    const turnOne = createDisplayState(to, null, zoomOutDistance, 1);
    const jovianMoons = ["io", "europa", "ganymede", "callisto"];

    for (const moonId of jovianMoons) {
      const startAngle = relativeDisplayAngleDegrees(turnZero, moonId, "jupiter");
      const halfwayAngle = relativeDisplayAngleDegrees(halfway, moonId, "jupiter");
      const endAngle = relativeDisplayAngleDegrees(turnOne, moonId, "jupiter");
      const fullTurnAngle = angularDeltaDegrees(startAngle, endAngle);

      expect(angularDeltaDegrees(startAngle, halfwayAngle)).toBeCloseTo(fullTurnAngle / 2, 8);
      expect(angularDeltaDegrees(halfwayAngle, endAngle)).toBeCloseTo(fullTurnAngle / 2, 8);
      expect(
        distance(halfway.bodyPositions.get("jupiter")!, halfway.bodyPositions.get(moonId)!)
      ).toBeCloseTo(halfway.orbitRadii.get(moonId)!, 8);
    }

    for (let index = 1; index < jovianMoons.length; index += 1) {
      const previousMoonId = jovianMoons[index - 1]!;
      const currentMoonId = jovianMoons[index]!;
      const turnZeroPhase = angularDeltaDegrees(
        relativeDisplayAngleDegrees(turnZero, previousMoonId, "jupiter"),
        relativeDisplayAngleDegrees(turnZero, currentMoonId, "jupiter")
      );
      const halfwayPhase = angularDeltaDegrees(
        relativeDisplayAngleDegrees(halfway, previousMoonId, "jupiter"),
        relativeDisplayAngleDegrees(halfway, currentMoonId, "jupiter")
      );

      expect(halfwayPhase).toBeCloseTo(turnZeroPhase, 8);
    }
  });

  it("keeps requested zoom-out planet hierarchy legible", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const zoomedOut = createDisplayState(snapshot, null, zoomOutDistance);

    expect(zoomedOut.bodyRadii.get("jupiter")).toBeGreaterThan(zoomedOut.bodyRadii.get("saturn")!);
    expect(zoomedOut.bodyRadii.get("saturn")).toBeGreaterThan(zoomedOut.bodyRadii.get("uranus")!);
    expect(zoomedOut.bodyRadii.get("uranus")).toBeGreaterThan(zoomedOut.bodyRadii.get("earth")!);
    expect(zoomedOut.bodyRadii.get("earth")).toBeGreaterThan(zoomedOut.bodyRadii.get("mercury")!);
    expect(zoomedOut.bodyRadii.get("mars")).toBeGreaterThan(zoomedOut.bodyRadii.get("pluto")!);
  });

  it("keeps moons smaller than their major planets and node rings within readable scale bounds", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null);

    expect(display.bodyRadii.get("jupiter")).toBeGreaterThan(display.bodyRadii.get("callisto")!);
    expect(display.bodyRadii.get("saturn")).toBeGreaterThan(display.bodyRadii.get("titan")!);
    expect(display.bodyRadii.get("mars")).toBeGreaterThan(display.bodyRadii.get("deimos")!);
    expect(display.bodyRadii.get("deimos")).toBeGreaterThanOrEqual(
      defaultCinematic3dVisualTuning.moonDisplayRadiusMin
    );
    expect(display.bodyRadii.get("nix")).toBeGreaterThanOrEqual(
      defaultCinematic3dVisualTuning.moonDisplayRadiusMin
    );

    for (const scale of display.nodeRingScales.values()) {
      expect(scale).toBeGreaterThanOrEqual(defaultCinematic3dVisualTuning.nodeRingMinScreenScale);
      expect(scale).toBeLessThanOrEqual(defaultCinematic3dVisualTuning.nodeRingMaxScreenScale);
    }
  });

  it("oversizes moon node rings independently from tiny moon bodies", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const callistoNode = findNode(snapshot, "callisto_node");
    const titanNode = findNode(snapshot, "titan_node");
    const callistoRingRadius =
      callistoNode.nodeOrbitRadius * display.nodeRingScales.get(callistoNode.id)!;
    const titanRingRadius = titanNode.nodeOrbitRadius * display.nodeRingScales.get(titanNode.id)!;

    expect(display.bodyRadii.get("callisto")).toBeLessThan(callistoRingRadius * 0.36);
    expect(display.bodyRadii.get("titan")).toBeLessThan(titanRingRadius * 0.36);
    expect(callistoRingRadius).toBeGreaterThanOrEqual(
      defaultCinematic3dVisualTuning.moonNodeRingMinRadius
    );
    expect(titanRingRadius).toBeGreaterThanOrEqual(
      defaultCinematic3dVisualTuning.moonNodeRingMinRadius
    );
    expect(display.nodeRingScales.get(callistoNode.id)).toBeGreaterThan(
      defaultCinematic3dVisualTuning.moonNodeRingMinScreenScale
    );
  });

  it("keeps moon node rings more sober at close zoom than at max zoom-out", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const zoomedOut = createDisplayState(snapshot, null, zoomOutDistance);
    const zoomedIn = createDisplayState(snapshot, "body:jupiter", minDistance);

    expect(nodeRingRadius(snapshot, "callisto_node", zoomedIn)).toBeLessThan(
      nodeRingRadius(snapshot, "callisto_node", zoomedOut)
    );
    expect(nodeRingRadius(snapshot, "titan_node", zoomedIn)).toBeLessThan(
      nodeRingRadius(snapshot, "titan_node", zoomedOut)
    );
  });

  it("keeps planet node rings larger than moon node rings", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);

    expect(nodeRingRadius(snapshot, "earth_node", display)).toBeGreaterThan(
      nodeRingRadius(snapshot, "moon_node", display)
    );
    expect(nodeRingRadius(snapshot, "jupiter_node", display)).toBeGreaterThan(
      nodeRingRadius(snapshot, "callisto_node", display)
    );
    expect(nodeRingRadius(snapshot, "saturn_node", display)).toBeGreaterThan(
      nodeRingRadius(snapshot, "titan_node", display)
    );
  });

  it("keeps planet node rings noticeably larger than moon node rings at max zoom-out", () => {
    const contents = [loadContent(), loadStrategicContent()];

    for (const content of contents) {
      const snapshot = createSolarSystemSnapshot(content, 0);
      const bodiesById = new Map(snapshot.bodies.map((body) => [body.id, body]));
      const display = createDisplayState(snapshot, null, zoomOutDistance);
      const planetNodeRadii: number[] = [];
      const moonNodeRadii: number[] = [];

      for (const node of snapshot.nodes) {
        const body = bodiesById.get(node.bodyId);

        if (body === undefined) {
          continue;
        }

        const radius = nodeRingRadius(snapshot, node.id, display);

        if (body.kind === "moon") {
          moonNodeRadii.push(radius);
          continue;
        }

        if (body.visualClass !== "star") {
          planetNodeRadii.push(radius);
        }
      }

      expect(Math.min(...planetNodeRadii)).toBeGreaterThan(Math.max(...moonNodeRadii) * 1.18);
    }
  });

  it("separates local node rings so parent and moon rings do not intersect", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const nodesByBodyId = new Map(snapshot.nodes.map((node) => [node.bodyId, node]));

    for (const body of snapshot.bodies) {
      if (body.parentId === null) {
        continue;
      }

      const parentNode = nodesByBodyId.get(body.parentId);
      const bodyNode = nodesByBodyId.get(body.id);

      if (parentNode === undefined || bodyNode === undefined) {
        continue;
      }

      const parentPosition = display.bodyPositions.get(body.parentId)!;
      const bodyPosition = display.bodyPositions.get(body.id)!;
      const centerDistance = distance(parentPosition, bodyPosition);
      const requiredDistance =
        nodeRingRadius(snapshot, parentNode.id, display) +
        nodeRingRadius(snapshot, bodyNode.id, display) +
        defaultCinematic3dVisualTuning.parentMoonNodeRingMinGap;

      expect(centerDistance).toBeGreaterThanOrEqual(requiredDistance - 0.001);
    }
  });

  it("keeps child node rings clear of parent body silhouettes before any focus", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const mercury = findBody(snapshot, "mercury");
    const mercuryNode = findNode(snapshot, "mercury_node");
    const focusKeys = [null, "body:sun"];

    for (const focusKey of focusKeys) {
      const display = createDisplayState(snapshot, focusKey, zoomOutDistance);
      const centerDistance = distance(
        display.bodyPositions.get("sun")!,
        display.bodyPositions.get(mercury.id)!
      );
      const requiredDistance =
        defaultCinematic3dVisualTuning.sunDisplayRadiusBase *
          (1 + defaultCinematic3dVisualTuning.bodyRadiusZoomOutBoost) +
        mercuryNode.nodeOrbitRadius * display.nodeRingScales.get(mercuryNode.id)! +
        defaultCinematic3dVisualTuning.parentMoonNodeRingMinGap;

      expect(centerDistance).toBeGreaterThanOrEqual(requiredDistance - 0.001);
    }
  });

  it("matches initial system presentation scale to the first non-Sun node focus", () => {
    const snapshot = createSolarSystemSnapshot(loadStrategicContent(), 0);
    const bodiesById = new Map(snapshot.bodies.map((body) => [body.id, body]));
    const initial = createDisplayState(
      snapshot,
      SYSTEM_PRESENTATION_FOCUS_TARGET_KEY,
      zoomOutDistance
    );
    const firstNodeFocus = createDisplayState(snapshot, "node:mars_node", zoomOutDistance);

    expect(initial.heliocentricScale).toBe(firstNodeFocus.heliocentricScale);
    expect(initial.bodyRadii.get("sun")).toBe(firstNodeFocus.bodyRadii.get("sun"));

    for (const body of snapshot.bodies) {
      if (body.kind === "moon") {
        continue;
      }

      expect(initial.bodyPositions.get(body.id)).toEqual(firstNodeFocus.bodyPositions.get(body.id));
    }

    for (const node of snapshot.nodes) {
      const body = bodiesById.get(node.bodyId);

      if (body === undefined || body.kind === "moon") {
        continue;
      }

      expect(initial.nodeRingScales.get(node.id)).toBe(firstNodeFocus.nodeRingScales.get(node.id));
    }
  });

  it("keeps sibling local node rings distinct", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const display = createDisplayState(snapshot, null, zoomOutDistance);
    const nodesByBodyId = new Map(snapshot.nodes.map((node) => [node.bodyId, node]));
    const childrenByParentId = new Map<string, typeof snapshot.bodies>();

    for (const body of snapshot.bodies) {
      if (body.parentId === null || !nodesByBodyId.has(body.id)) {
        continue;
      }

      childrenByParentId.set(body.parentId, [
        ...(childrenByParentId.get(body.parentId) ?? []),
        body
      ]);
    }

    for (const siblings of childrenByParentId.values()) {
      for (let firstIndex = 0; firstIndex < siblings.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < siblings.length; secondIndex += 1) {
          const first = siblings[firstIndex]!;
          const second = siblings[secondIndex]!;
          const firstNode = nodesByBodyId.get(first.id)!;
          const secondNode = nodesByBodyId.get(second.id)!;
          const centerDistance = distance(
            display.bodyPositions.get(first.id)!,
            display.bodyPositions.get(second.id)!
          );
          const requiredDistance =
            nodeRingRadius(snapshot, firstNode.id, display) +
            nodeRingRadius(snapshot, secondNode.id, display) +
            defaultCinematic3dVisualTuning.nodeRingMinGap;

          expect(centerDistance).toBeGreaterThanOrEqual(requiredDistance - 0.001);
        }
      }
    }
  });

  it("keeps local node rings separated across representative zoom levels", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const nodesByBodyId = new Map(snapshot.nodes.map((node) => [node.bodyId, node]));
    const childrenByParentId = new Map<string, typeof snapshot.bodies>();
    const focusKeys = [null, "body:jupiter", "body:saturn", "body:mars", "body:pluto"];
    const distances = [zoomOutDistance, 900, 420, 180, minDistance];

    for (const body of snapshot.bodies) {
      if (body.parentId === null || !nodesByBodyId.has(body.id)) {
        continue;
      }

      childrenByParentId.set(body.parentId, [
        ...(childrenByParentId.get(body.parentId) ?? []),
        body
      ]);
    }

    for (const focusKey of focusKeys) {
      for (const distanceValue of distances) {
        const display = createDisplayState(snapshot, focusKey, distanceValue);

        for (const body of snapshot.bodies) {
          if (body.parentId === null) {
            continue;
          }

          const parentNode = nodesByBodyId.get(body.parentId);
          const bodyNode = nodesByBodyId.get(body.id);

          if (parentNode === undefined || bodyNode === undefined) {
            continue;
          }

          const centerDistance = distance(
            display.bodyPositions.get(body.parentId)!,
            display.bodyPositions.get(body.id)!
          );
          const requiredDistance =
            nodeRingRadius(snapshot, parentNode.id, display) +
            nodeRingRadius(snapshot, bodyNode.id, display) +
            defaultCinematic3dVisualTuning.parentMoonNodeRingMinGap;

          expect(centerDistance).toBeGreaterThanOrEqual(requiredDistance - 0.001);
        }

        for (const siblings of childrenByParentId.values()) {
          for (let firstIndex = 0; firstIndex < siblings.length; firstIndex += 1) {
            for (
              let secondIndex = firstIndex + 1;
              secondIndex < siblings.length;
              secondIndex += 1
            ) {
              const first = siblings[firstIndex]!;
              const second = siblings[secondIndex]!;
              const firstNode = nodesByBodyId.get(first.id)!;
              const secondNode = nodesByBodyId.get(second.id)!;
              const centerDistance = distance(
                display.bodyPositions.get(first.id)!,
                display.bodyPositions.get(second.id)!
              );
              const requiredDistance =
                nodeRingRadius(snapshot, firstNode.id, display) +
                nodeRingRadius(snapshot, secondNode.id, display) +
                defaultCinematic3dVisualTuning.nodeRingMinGap;

              expect(centerDistance).toBeGreaterThanOrEqual(requiredDistance - 0.001);
            }
          }
        }
      }
    }
  });

  it("keeps close Sun focus behavior after strategic zoom-out scale fades", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 0);
    const overview = createDisplayState(snapshot, null, minDistance);
    const sunFocused = createDisplayState(snapshot, "body:sun", minDistance);
    const planetFocused = createDisplayState(snapshot, "body:jupiter", minDistance);

    expect(sunFocused.bodyRadii.get("sun")).toBe(overview.bodyRadii.get("sun"));
    expect(planetFocused.bodyRadii.get("sun")).toBe(overview.bodyRadii.get("sun"));
    expect(sunFocused.bodyRadii.get("sun")! / sunFocused.bodyRadii.get("earth")!).toBeCloseTo(
      7.8,
      3
    );
  });

  it("keeps display scaling presentation-only and leaves core positions unchanged", () => {
    const snapshot = createSolarSystemSnapshot(loadContent(), 3);
    const beforePositions = snapshot.bodies.map((body) => body.position);

    createDisplayState(snapshot, "node:titan_node", 240);

    expect(snapshot.bodies.map((body) => body.position)).toEqual(beforePositions);
  });
});
