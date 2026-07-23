import type { BodySnapshot, Bounds, NodeSnapshot, SolarSystemSnapshot, Vec2 } from "../../core";
import type { Cinematic3dVisualTuning } from "./visualTuning";

export const SYSTEM_PRESENTATION_FOCUS_TARGET_KEY = "system:presentation";

const systemPresentationFocusedBodyId = "__system_presentation__";
const moonVisualDegreesPerTurn = 42;
// Presentation-only orbital cadence: close enough to a ~3 day turn that short burn previews
// do not imply outer planets sprinting around the Sun.
const defaultPlanetVisualDegreesPerTurn = 1.45;
const planetVisualDegreesPerTurnByBodyId: Readonly<Record<string, number>> = {
  mercury: 18,
  venus: 15.5,
  earth: 10,
  mars: 8,
  jupiter: 6.5,
  saturn: 5,
  uranus: 4,
  neptune: 3.5,
  pluto: 3,
  pluto_charon: 3
};
const zoomOutMoonOrbitDistanceMultiplier = 0.92;
const zoomOutFirstMoonOrbitDistanceMultiplier = 0.92;
const zoomOutMoonOrbitBandGapMultiplier = 4.2;
const strategicNodeRingBodyPaddingMultiplier = 1.18;
const moonSeparationOrbitMemoryMultiplier = 0.65;
const orbitRailIntersectionGap = 10;
const previousZoomOutMarsHeliocentricSpacingMultiplier = 1.05;
const postMarsGapLockedBodyIds = new Set([
  "jupiter",
  "saturn",
  "uranus",
  "neptune",
  "pluto",
  "pluto_charon"
]);

const moonOrbitGroupByBodyId: Readonly<Record<string, string>> = {
  phobos: "mars:single",
  deimos: "mars:single",
  io: "jupiter:inner",
  europa: "jupiter:outer",
  ganymede: "jupiter:outer",
  callisto: "jupiter:outer",
  titan: "saturn:inner",
  iapetus: "saturn:outer",
  titania: "uranus:inner",
  oberon: "uranus:outer"
};

const moonOrbitGroupOrderByParentId: Readonly<Record<string, readonly string[]>> = {
  mars: ["mars:single"],
  jupiter: ["jupiter:inner", "jupiter:outer"],
  saturn: ["saturn:inner", "saturn:outer"],
  uranus: ["uranus:inner", "uranus:outer"]
};

const zoomOutBodyScaleRatiosToEarth: Readonly<Record<string, number>> = {
  sun: 5.225,
  mercury: 0.506,
  venus: 0.931,
  earth: 0.95,
  mars: 0.684,
  jupiter: 3.9235,
  saturn: 3.249,
  uranus: 1.998,
  neptune: 1.998,
  pluto: 0.399,
  pluto_charon: 0.399,
  ganymede: 0.684,
  titan: 0.665,
  callisto: 0.627,
  io: 0.522,
  moon: 0.468,
  europa: 0.45,
  triton: 0.46,
  titania: 0.4232,
  oberon: 0.414,
  iapetus: 0.3696,
  charon: 0.3128,
  phobos: 0.2464,
  deimos: 0.2112
};

const zoomInBodyScaleRatiosToEarth: Readonly<Record<string, number>> = {
  sun: 7.8,
  mercury: 0.4,
  venus: 0.95,
  earth: 1,
  mars: 0.6,
  jupiter: 5.15,
  saturn: 4.45,
  uranus: 2.12,
  neptune: 2.12,
  pluto: 0.26,
  pluto_charon: 0.26,
  ganymede: 0.43,
  titan: 0.42,
  callisto: 0.39,
  io: 0.35,
  moon: 0.31,
  europa: 0.3,
  triton: 0.3,
  titania: 0.27,
  oberon: 0.27,
  iapetus: 0.23,
  charon: 0.17,
  phobos: 0.095,
  deimos: 0.076
};

const zoomOutSunGlowRatioToEarth = 10.9;
const zoomInSunGlowRatioToEarth = 16;

const zoomInMoonOrbitRadiusRatiosToParent: Readonly<Record<string, number>> = {
  moon: 4.9,
  phobos: 4.4,
  deimos: 4.4,
  io: 3.2,
  europa: 5.1,
  ganymede: 5.1,
  callisto: 5.1,
  titan: 4.4,
  iapetus: 6.6,
  titania: 4.1,
  oberon: 5.9,
  triton: 4.5,
  charon: 3.2
};

const zoomOutHeliocentricSpacingMultipliers: Readonly<Record<string, number>> = {
  mercury: 1.155,
  venus: 1.171045,
  earth: 1.21608,
  mars: 1.365,
  jupiter: 1.08,
  saturn: 1.1,
  uranus: 1.1424,
  neptune: 1.1742,
  pluto: 1.2064,
  pluto_charon: 1.2064
};

const zoomOutMoonOrbitSpacingMultipliers: Readonly<Record<string, number>> = {
  moon: 1.15 * zoomOutMoonOrbitDistanceMultiplier,
  phobos: 1.2 * zoomOutMoonOrbitDistanceMultiplier,
  deimos: 1.3 * zoomOutMoonOrbitDistanceMultiplier,
  io: 1.3 * zoomOutMoonOrbitDistanceMultiplier,
  europa: 1.6 * zoomOutMoonOrbitDistanceMultiplier,
  ganymede: 1.7 * zoomOutMoonOrbitDistanceMultiplier,
  callisto: 1.8 * zoomOutMoonOrbitDistanceMultiplier,
  titan: 1.4 * zoomOutMoonOrbitDistanceMultiplier,
  iapetus: 1.8 * zoomOutMoonOrbitDistanceMultiplier * 0.65,
  titania: 1.4 * zoomOutMoonOrbitDistanceMultiplier,
  oberon: 1.7 * zoomOutMoonOrbitDistanceMultiplier * 0.75,
  triton: 1.35 * zoomOutMoonOrbitDistanceMultiplier,
  charon: 1.3 * zoomOutMoonOrbitDistanceMultiplier
};

export type CinematicDisplayState = Readonly<{
  bodyPositions: ReadonlyMap<string, Vec2>;
  bodyRadii: ReadonlyMap<string, number>;
  nodeRingScales: ReadonlyMap<string, number>;
  orbitRadii: ReadonlyMap<string, number>;
  bounds: Bounds;
  heliocentricScale: number;
  sunGlowScale: number;
}>;

export type CinematicBodyScaleAuditEntry = Readonly<{
  bodyId: string;
  zoomOutScale: number | null;
  zoomInScale: number | null;
  actualRenderedScale: number;
}>;

export type CinematicMoonOrbitAuditEntry = Readonly<{
  moonId: string;
  parentId: string;
  tier: string;
  orbitRadius: number | null;
  actualRenderedRadius: number;
}>;

export type CinematicDisplayScaleContext = Readonly<{
  focusedTargetKey: string | null;
  distance: number;
  zoomOutDistance: number;
  minDistance: number;
  tuning: Cinematic3dVisualTuning;
  visualTurn?: number;
}>;

export function createCinematicDisplayState(
  snapshot: SolarSystemSnapshot,
  context: CinematicDisplayScaleContext
): CinematicDisplayState {
  return applyZoomedOutStrategicPresentation(
    snapshot,
    context,
    createBaseCinematicDisplayState(snapshot, context)
  );
}

export function getCinematicBodyScaleAuditEntry(
  bodyId: string,
  actualRenderedScale: number
): CinematicBodyScaleAuditEntry {
  return {
    bodyId,
    zoomOutScale: zoomOutBodyScaleRatiosToEarth[bodyId] ?? null,
    zoomInScale: zoomInBodyScaleRatiosToEarth[bodyId] ?? null,
    actualRenderedScale
  };
}

export function getCinematicMoonOrbitAuditEntry(
  moon: BodySnapshot,
  orbitRadius: number | null,
  actualRenderedRadius: number
): CinematicMoonOrbitAuditEntry {
  return {
    moonId: moon.id,
    parentId: moon.parentId ?? "",
    tier: getMoonOrbitTier(moon),
    orbitRadius,
    actualRenderedRadius
  };
}

function createBaseCinematicDisplayState(
  snapshot: SolarSystemSnapshot,
  context: CinematicDisplayScaleContext
): CinematicDisplayState {
  const bodiesById = new Map(snapshot.bodies.map((body) => [body.id, body]));
  const nodeById = new Map(snapshot.nodes.map((node) => [node.id, node]));
  const nodesByBodyId = new Map(snapshot.nodes.map((node) => [node.bodyId, node]));
  const focusedBodyId = resolveFocusedBodyId(context.focusedTargetKey, bodiesById, nodeById);
  const visualTurn = context.visualTurn ?? snapshot.turn;
  const zoomProgress = computeZoomProgress(
    context.distance,
    context.zoomOutDistance,
    context.minDistance
  );
  const heliocentricScale = computeHeliocentricScale(context.tuning, zoomProgress, focusedBodyId);
  const bodyPositions = new Map<string, Vec2>();
  const bodyRadii = new Map<string, number>();
  const bodyBaseRadii = new Map<string, number>();
  const nodeRingScales = new Map<string, number>();
  const orbitRadii = new Map<string, number>();

  for (const body of snapshot.bodies) {
    const baseRadius = computeBodyDisplayRadius(body, focusedBodyId, zoomProgress, context.tuning);
    bodyBaseRadii.set(body.id, baseRadius);
    bodyRadii.set(body.id, baseRadius);
  }

  for (const node of snapshot.nodes) {
    const body = bodiesById.get(node.bodyId);
    const bodyRadius = bodyBaseRadii.get(node.bodyId) ?? node.nodeOrbitRadius;
    nodeRingScales.set(
      node.id,
      computeNodeRingScale(node, body, bodyRadius, zoomProgress, context.tuning)
    );
  }

  const defaultVisualOrbitDegrees = createDefaultVisualOrbitDegrees(snapshot.bodies);

  function computeBodyDisplayPosition(body: BodySnapshot): Vec2 {
    const existing = bodyPositions.get(body.id);

    if (existing !== undefined) {
      return existing;
    }

    if (body.parentId === null) {
      bodyPositions.set(body.id, body.position);
      return body.position;
    }

    const parent = bodiesById.get(body.parentId);

    if (parent === undefined) {
      bodyPositions.set(body.id, body.position);
      return body.position;
    }

    const parentPosition = computeBodyDisplayPosition(parent);
    const baseScale =
      body.kind === "moon"
        ? computeLocalMoonScale(body, focusedBodyId, bodiesById, context.tuning)
        : heliocentricScale;
    const orbitRadius = body.orbitRadius * baseScale;
    const offset = computeVisualOrbitOffset(
      body,
      visualTurn,
      orbitRadius,
      defaultVisualOrbitDegrees
    );
    const displayPosition = {
      x: parentPosition.x + offset.x,
      y: parentPosition.y + offset.y
    };

    bodyPositions.set(body.id, displayPosition);
    orbitRadii.set(body.id, body.orbitRadius * baseScale);
    return displayPosition;
  }

  for (const body of snapshot.bodies) {
    computeBodyDisplayPosition(body);
  }

  applyNodeRingSeparation(
    snapshot.bodies,
    nodesByBodyId,
    bodyPositions,
    orbitRadii,
    bodyRadii,
    nodeRingScales,
    context.tuning,
    0
  );
  applyOrbitRailConstraints(
    snapshot.bodies,
    nodesByBodyId,
    bodyPositions,
    orbitRadii,
    bodyRadii,
    nodeRingScales,
    context.tuning,
    1
  );
  applyReadableOrbitalMotion(snapshot.bodies, bodyPositions, orbitRadii, visualTurn);

  return {
    bodyPositions,
    bodyRadii,
    nodeRingScales,
    orbitRadii,
    bounds: computeDisplayBounds(
      snapshot.bodies,
      nodesByBodyId,
      bodyPositions,
      bodyRadii,
      nodeRingScales
    ),
    heliocentricScale,
    sunGlowScale: 1
  };
}

function applyZoomedOutStrategicPresentation(
  snapshot: SolarSystemSnapshot,
  context: CinematicDisplayScaleContext,
  baselineState: CinematicDisplayState
): CinematicDisplayState {
  const bodiesById = new Map(snapshot.bodies.map((body) => [body.id, body]));
  const nodesByBodyId = new Map(snapshot.nodes.map((node) => [node.bodyId, node]));
  const visualTurn = context.visualTurn ?? snapshot.turn;
  const zoomProgress = computeZoomProgress(
    context.distance,
    context.zoomOutDistance,
    context.minDistance
  );
  const zoomCurve = smoothZoomCurve(zoomProgress);
  const earthReferenceRadius = computeEarthReferenceRadius(baselineState, context.tuning);
  const postMarsGapOffset = computePostMarsGapLockedOrbitOffset(baselineState, zoomCurve);
  const bodyPositions = new Map<string, Vec2>();
  const bodyRadii = new Map<string, number>();
  const orbitRadii = new Map<string, number>();

  for (const body of snapshot.bodies) {
    bodyRadii.set(
      body.id,
      computeStrategicBodyRadius(body, baselineState, earthReferenceRadius, zoomCurve)
    );
  }

  const nodeRingScales = new Map<string, number>();

  for (const node of snapshot.nodes) {
    const body = bodiesById.get(node.bodyId);
    const bodyRadius = bodyRadii.get(node.bodyId) ?? baselineState.bodyRadii.get(node.bodyId);
    nodeRingScales.set(
      node.id,
      computeStrategicNodeRingScale(
        node,
        body,
        bodyRadius ?? node.nodeOrbitRadius,
        baselineState,
        context.tuning
      )
    );
  }

  const defaultVisualOrbitDegrees = createDefaultVisualOrbitDegrees(snapshot.bodies);

  function computeAdjustedBodyPosition(body: BodySnapshot): Vec2 {
    const existing = bodyPositions.get(body.id);

    if (existing !== undefined) {
      return existing;
    }

    const baselinePosition = baselineState.bodyPositions.get(body.id) ?? body.position;

    if (body.parentId === null) {
      bodyPositions.set(body.id, baselinePosition);
      return baselinePosition;
    }

    const parent = bodiesById.get(body.parentId);

    if (parent === undefined) {
      bodyPositions.set(body.id, baselinePosition);
      return baselinePosition;
    }

    const parentPosition = computeAdjustedBodyPosition(parent);
    const parentBaselinePosition = baselineState.bodyPositions.get(parent.id) ?? parent.position;
    const multiplier =
      body.kind === "moon"
        ? getZoomedOutMultiplier(zoomOutMoonOrbitSpacingMultipliers, body.id, zoomCurve)
        : getZoomedOutMultiplier(zoomOutHeliocentricSpacingMultipliers, body.id, zoomCurve);
    const baselineOrbitRadius =
      baselineState.orbitRadii.get(body.id) ?? distance(parentBaselinePosition, baselinePosition);
    const adjustedOrbitRadius =
      baselineOrbitRadius * multiplier +
      (body.kind !== "moon" && postMarsGapLockedBodyIds.has(body.id) ? postMarsGapOffset : 0);
    const offset = computeVisualOrbitOffset(
      body,
      visualTurn,
      adjustedOrbitRadius,
      defaultVisualOrbitDegrees
    );
    const displayPosition = {
      x: parentPosition.x + offset.x,
      y: parentPosition.y + offset.y
    };

    bodyPositions.set(body.id, displayPosition);
    orbitRadii.set(body.id, adjustedOrbitRadius);
    return displayPosition;
  }

  for (const body of snapshot.bodies) {
    computeAdjustedBodyPosition(body);
  }

  applyNodeRingSeparation(
    snapshot.bodies,
    nodesByBodyId,
    bodyPositions,
    orbitRadii,
    bodyRadii,
    nodeRingScales,
    context.tuning,
    (1 - zoomCurve) * moonSeparationOrbitMemoryMultiplier
  );
  applyOrbitRailConstraints(
    snapshot.bodies,
    nodesByBodyId,
    bodyPositions,
    orbitRadii,
    bodyRadii,
    nodeRingScales,
    context.tuning,
    zoomCurve
  );
  applyReadableOrbitalMotion(snapshot.bodies, bodyPositions, orbitRadii, visualTurn);

  return {
    bodyPositions,
    bodyRadii,
    nodeRingScales,
    orbitRadii,
    bounds: computeDisplayBounds(
      snapshot.bodies,
      nodesByBodyId,
      bodyPositions,
      bodyRadii,
      nodeRingScales
    ),
    heliocentricScale: baselineState.heliocentricScale,
    sunGlowScale: computeSunGlowScale(zoomCurve, context.tuning)
  };
}

function computeHeliocentricScale(
  tuning: Cinematic3dVisualTuning,
  zoomProgress: number,
  focusedBodyId: string | null
): number {
  const zoomCurve = smoothZoomCurve(zoomProgress);
  const zoomOutScale =
    tuning.heliocentricScaleBase * Math.max(0.1, tuning.heliocentricScaleZoomOutCompression);
  const zoomInScale = tuning.heliocentricScaleBase * tuning.heliocentricScaleZoomMultiplier;
  const zoomScale = mix(zoomOutScale, zoomInScale, zoomCurve);
  return focusedBodyId === null || focusedBodyId === "sun"
    ? zoomScale
    : zoomScale * tuning.heliocentricScaleFocusMultiplier;
}

function createDefaultVisualOrbitDegrees(
  bodies: readonly BodySnapshot[]
): ReadonlyMap<string, number> {
  const degreesByBodyId = new Map<string, number>();

  for (const body of bodies) {
    if (body.parentId === null) {
      continue;
    }

    degreesByBodyId.set(
      body.id,
      body.kind === "moon"
        ? moonVisualDegreesPerTurn
        : (planetVisualDegreesPerTurnByBodyId[body.id] ?? defaultPlanetVisualDegreesPerTurn)
    );
  }

  return degreesByBodyId;
}

function computeVisualOrbitOffset(
  body: BodySnapshot,
  turn: number,
  orbitRadius: number,
  degreesByBodyId: ReadonlyMap<string, number>
): Vec2 {
  const degreesPerTurn = degreesByBodyId.get(body.id) ?? 0;
  const angle = degreesToRadians(body.initialAngle + turn * degreesPerTurn);

  return {
    x: Math.cos(angle) * orbitRadius,
    y: Math.sin(angle) * orbitRadius
  };
}

function applyReadableOrbitalMotion(
  bodies: readonly BodySnapshot[],
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>,
  visualTurn: number
): void {
  rebuildBodyPositionsForVisualOrbit(
    bodies,
    bodyPositions,
    orbitRadii,
    visualTurn,
    createDefaultVisualOrbitDegrees(bodies)
  );
}

function rebuildBodyPositionsForVisualOrbit(
  bodies: readonly BodySnapshot[],
  bodyPositions: Map<string, Vec2>,
  orbitRadii: ReadonlyMap<string, number>,
  visualTurn: number,
  degreesByBodyId: ReadonlyMap<string, number>
): void {
  const bodiesById = new Map(bodies.map((body) => [body.id, body]));
  bodyPositions.clear();

  function computePosition(body: BodySnapshot): Vec2 {
    const existing = bodyPositions.get(body.id);

    if (existing !== undefined) {
      return existing;
    }

    if (body.parentId === null) {
      bodyPositions.set(body.id, body.position);
      return body.position;
    }

    const parent = bodiesById.get(body.parentId);

    if (parent === undefined) {
      bodyPositions.set(body.id, body.position);
      return body.position;
    }

    const parentPosition = computePosition(parent);
    const offset = computeVisualOrbitOffset(
      body,
      visualTurn,
      getOrbitRadius(body, orbitRadii),
      degreesByBodyId
    );
    const position = {
      x: parentPosition.x + offset.x,
      y: parentPosition.y + offset.y
    };
    bodyPositions.set(body.id, position);
    return position;
  }

  for (const body of bodies) {
    computePosition(body);
  }
}

function getZoomedOutMultiplier(
  multipliers: Readonly<Record<string, number>>,
  bodyId: string,
  zoomCurve: number
): number {
  return mix(multipliers[bodyId] ?? 1, 1, zoomCurve);
}

function computePostMarsGapLockedOrbitOffset(
  baselineState: CinematicDisplayState,
  zoomCurve: number
): number {
  const marsBaselineOrbitRadius = baselineState.orbitRadii.get("mars");

  if (marsBaselineOrbitRadius === undefined) {
    return 0;
  }

  const newMarsMultiplier =
    zoomOutHeliocentricSpacingMultipliers.mars ?? previousZoomOutMarsHeliocentricSpacingMultiplier;
  const zoomedOutOffset =
    marsBaselineOrbitRadius *
    (newMarsMultiplier - previousZoomOutMarsHeliocentricSpacingMultiplier);

  return zoomedOutOffset * (1 - zoomCurve);
}

function computeSunGlowScale(zoomCurve: number, tuning: Cinematic3dVisualTuning): number {
  const sunDiskRatio = getInterpolatedBodyScaleRatio("sun", zoomCurve) ?? 1;
  const sunGlowRatio = mix(zoomOutSunGlowRatioToEarth, zoomInSunGlowRatioToEarth, zoomCurve);
  return sunGlowRatio / Math.max(0.001, sunDiskRatio * tuning.sunCoronaScale);
}

function computeStrategicBodyRadius(
  body: BodySnapshot,
  baselineState: CinematicDisplayState,
  earthReferenceRadius: number,
  zoomCurve: number
): number {
  const baselineRadius = baselineState.bodyRadii.get(body.id) ?? body.visualRadius;
  const targetRatio = getInterpolatedBodyScaleRatio(body.id, zoomCurve);

  return targetRatio === undefined ? baselineRadius : earthReferenceRadius * targetRatio;
}

function computeEarthReferenceRadius(
  baselineState: CinematicDisplayState,
  tuning: Cinematic3dVisualTuning
): number {
  return baselineState.bodyRadii.get("earth") ?? tuning.planetDisplayRadiusMin;
}

function getInterpolatedBodyScaleRatio(bodyId: string, zoomCurve: number): number | undefined {
  const zoomOutRatio = zoomOutBodyScaleRatiosToEarth[bodyId];
  const zoomInRatio = zoomInBodyScaleRatiosToEarth[bodyId];

  if (zoomOutRatio === undefined && zoomInRatio === undefined) {
    return undefined;
  }

  return mix(zoomOutRatio ?? zoomInRatio ?? 1, zoomInRatio ?? zoomOutRatio ?? 1, zoomCurve);
}

function computeLocalMoonScale(
  body: BodySnapshot,
  focusedBodyId: string | null,
  bodiesById: ReadonlyMap<string, BodySnapshot>,
  tuning: Cinematic3dVisualTuning
): number {
  const focusedBody = focusedBodyId === null ? undefined : bodiesById.get(focusedBodyId);
  const isFocusedLocalSystem =
    focusedBodyId === body.id ||
    focusedBodyId === body.parentId ||
    (focusedBody !== undefined && focusedBody.parentId === body.parentId);
  const focusedScale = isFocusedLocalSystem
    ? tuning.localMoonScaleBase * tuning.localMoonScaleFocusMultiplier
    : tuning.localMoonScaleBase;
  return Math.min(tuning.localMoonScaleMax, focusedScale);
}

function computeBodyDisplayRadius(
  body: BodySnapshot,
  focusedBodyId: string | null,
  zoomProgress: number,
  tuning: Cinematic3dVisualTuning
): number {
  const zoomCurve = smoothZoomCurve(zoomProgress);
  const zoomRadiusFactor =
    1 +
    (1 - zoomCurve) * tuning.bodyRadiusZoomOutBoost +
    Math.pow(zoomCurve, tuning.bodyScaleZoomExponent) * 0.16;

  if (body.visualClass === "star") {
    const focusScale =
      focusedBodyId === null || focusedBodyId === "sun" ? 1 : tuning.sunNonFocusScaleMultiplier;
    return clamp(
      tuning.sunDisplayRadiusBase * focusScale * zoomRadiusFactor,
      tuning.sunDisplayRadiusMin,
      tuning.sunDisplayRadiusMax
    );
  }

  if (body.kind === "moon") {
    const moonExponent = mix(
      tuning.moonRadiusZoomOutExponent,
      tuning.moonRadiusZoomInExponent,
      zoomCurve
    );
    const moonVisualRadius = normalizeDisplayRadius(
      body.visualRadius,
      tuning.moonRadiusReference,
      moonExponent
    );
    return Math.max(
      tuning.moonDisplayRadiusMin,
      moonVisualRadius * tuning.moonDisplayRadiusMultiplier * (1 + (zoomRadiusFactor - 1) * 0.35)
    );
  }

  const planetExponent = mix(
    tuning.bodyRadiusZoomOutExponent,
    tuning.bodyRadiusZoomInExponent,
    zoomCurve
  );
  const planetVisualRadius = normalizeDisplayRadius(
    body.visualRadius,
    tuning.bodyRadiusReference,
    planetExponent
  );
  const overviewRadiusFloor = tuning.planetDisplayRadiusMin * (1 - zoomCurve);
  return Math.max(
    overviewRadiusFloor,
    planetVisualRadius * tuning.planetDisplayRadiusMultiplier * zoomRadiusFactor
  );
}

function computeNodeRingScale(
  node: NodeSnapshot,
  body: BodySnapshot | undefined,
  bodyDisplayRadius: number,
  zoomProgress: number,
  tuning: Cinematic3dVisualTuning
): number {
  const zoomCurve = smoothZoomCurve(zoomProgress);
  let desiredRadius = bodyDisplayRadius * 1.42;

  if (body?.kind === "moon") {
    const zoomOutBoost = 1 + (1 - zoomProgress) * tuning.moonNodeRingZoomOutBoost;
    const moonMinRadius = mix(
      tuning.moonNodeRingMinRadius,
      tuning.moonNodeRingZoomInMinRadius,
      zoomCurve
    );
    desiredRadius =
      Math.max(
        desiredRadius,
        moonMinRadius,
        node.nodeOrbitRadius * tuning.moonNodeRingMinScreenScale
      ) *
      tuning.moonNodeScale *
      tuning.moonNodeRingScaleMultiplier *
      zoomOutBoost;
  } else if (body !== undefined && body.visualClass !== "star") {
    const planetMinRadius = mix(
      tuning.planetNodeRingMinRadius,
      tuning.planetNodeRingZoomInMinRadius,
      zoomCurve
    );
    desiredRadius =
      Math.max(bodyDisplayRadius * tuning.planetNodeRingScaleMultiplier, planetMinRadius) *
      tuning.planetNodeScale;
  }

  const desiredScale = desiredRadius / node.nodeOrbitRadius;

  return clamp(
    Math.max(tuning.nodeRingMinScreenScale, desiredScale),
    tuning.nodeRingMinScreenScale,
    tuning.nodeRingMaxScreenScale
  );
}

function computeStrategicNodeRingScale(
  node: NodeSnapshot,
  body: BodySnapshot | undefined,
  bodyDisplayRadius: number,
  baselineState: CinematicDisplayState,
  tuning: Cinematic3dVisualTuning
): number {
  const baselineScale = baselineState.nodeRingScales.get(node.id) ?? 1;

  if (body === undefined || body.kind === "moon" || body.visualClass === "star") {
    return baselineScale;
  }

  const baselineRadius = node.nodeOrbitRadius * baselineScale;
  const desiredRadius = Math.max(
    baselineRadius,
    bodyDisplayRadius * strategicNodeRingBodyPaddingMultiplier
  );

  return clamp(
    desiredRadius / node.nodeOrbitRadius,
    tuning.nodeRingMinScreenScale,
    tuning.nodeRingMaxScreenScale
  );
}

function applyNodeRingSeparation(
  bodies: readonly BodySnapshot[],
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>,
  bodyRadii: ReadonlyMap<string, number>,
  nodeRingScales: ReadonlyMap<string, number>,
  tuning: Cinematic3dVisualTuning,
  moonOrbitMemoryMultiplier: number
): void {
  const bodiesById = new Map(bodies.map((body) => [body.id, body]));
  const childrenByParentId = new Map<string, BodySnapshot[]>();
  const parentMoonGap = Math.max(tuning.nodeRingMinGap, tuning.parentMoonNodeRingMinGap);

  for (const body of bodies) {
    if (body.parentId === null) {
      continue;
    }

    const siblings = childrenByParentId.get(body.parentId) ?? [];
    siblings.push(body);
    childrenByParentId.set(body.parentId, siblings);
  }

  for (let iteration = 0; iteration < 8; iteration += 1) {
    for (const body of bodies) {
      if (body.parentId === null) {
        continue;
      }

      const parent = bodiesById.get(body.parentId);

      if (parent === undefined) {
        continue;
      }

      enforceBodyRingSeparation(
        parent,
        body,
        nodesByBodyId,
        childrenByParentId,
        bodyPositions,
        orbitRadii,
        bodyRadii,
        nodeRingScales,
        parentMoonGap,
        moonOrbitMemoryMultiplier
      );
    }

    for (const siblings of childrenByParentId.values()) {
      enforceSiblingRingSeparation(
        siblings,
        nodesByBodyId,
        childrenByParentId,
        bodyPositions,
        orbitRadii,
        nodeRingScales,
        tuning.nodeRingMinGap
      );
    }
  }
}

function enforceBodyRingSeparation(
  parent: BodySnapshot,
  body: BodySnapshot,
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>,
  bodyRadii: ReadonlyMap<string, number>,
  nodeRingScales: ReadonlyMap<string, number>,
  gap: number,
  moonOrbitMemoryMultiplier: number
): void {
  const parentNode = nodesByBodyId.get(parent.id);
  const bodyNode = nodesByBodyId.get(body.id);

  if (bodyNode === undefined) {
    return;
  }

  const parentPosition = bodyPositions.get(parent.id) ?? parent.position;
  const bodyPosition = bodyPositions.get(body.id) ?? body.position;
  const parentClearanceRadius = Math.max(
    bodyRadii.get(parent.id) ?? parent.visualRadius,
    parentNode === undefined ? 0 : getNodeRingRadius(parentNode, nodeRingScales)
  );
  const requiredDistance =
    parentClearanceRadius + getNodeRingRadius(bodyNode, nodeRingScales) + gap;
  let targetDistance = requiredDistance;
  const currentDistance = distance(parentPosition, bodyPosition);

  if (currentDistance >= targetDistance) {
    orbitRadii.set(body.id, currentDistance);
    return;
  }

  if (body.kind === "moon" && currentDistance > 0 && moonOrbitMemoryMultiplier > 0) {
    targetDistance += currentDistance * moonOrbitMemoryMultiplier;
  }

  const direction = getDirection(parentPosition, bodyPosition, body.initialAngle);
  const nextPosition = {
    x: parentPosition.x + direction.x * targetDistance,
    y: parentPosition.y + direction.y * targetDistance
  };
  translateBodySubtree(
    body,
    nextPosition.x - bodyPosition.x,
    nextPosition.y - bodyPosition.y,
    childrenByParentId,
    bodyPositions
  );
  orbitRadii.set(body.id, targetDistance);
}

function enforceSiblingRingSeparation(
  siblings: readonly BodySnapshot[],
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>,
  nodeRingScales: ReadonlyMap<string, number>,
  gap: number
): void {
  const siblingsWithNodes = siblings.filter((body) => nodesByBodyId.has(body.id));

  for (let firstIndex = 0; firstIndex < siblingsWithNodes.length; firstIndex += 1) {
    for (
      let secondIndex = firstIndex + 1;
      secondIndex < siblingsWithNodes.length;
      secondIndex += 1
    ) {
      const first = siblingsWithNodes[firstIndex];
      const second = siblingsWithNodes[secondIndex];

      if (first === undefined || second === undefined) {
        continue;
      }

      const firstNode = nodesByBodyId.get(first.id);
      const secondNode = nodesByBodyId.get(second.id);

      if (firstNode === undefined || secondNode === undefined) {
        continue;
      }

      const firstPosition = bodyPositions.get(first.id) ?? first.position;
      const secondPosition = bodyPositions.get(second.id) ?? second.position;
      const requiredDistance =
        getNodeRingRadius(firstNode, nodeRingScales) +
        getNodeRingRadius(secondNode, nodeRingScales) +
        gap;
      const currentDistance = distance(firstPosition, secondPosition);

      if (currentDistance >= requiredDistance) {
        continue;
      }

      const direction = getDirection(secondPosition, firstPosition, first.initialAngle);
      const push = (requiredDistance - currentDistance) / 2;
      translateBodySubtree(
        first,
        direction.x * push,
        direction.y * push,
        childrenByParentId,
        bodyPositions
      );
      translateBodySubtree(
        second,
        -direction.x * push,
        -direction.y * push,
        childrenByParentId,
        bodyPositions
      );
      updateOrbitRadius(first, bodyPositions, orbitRadii);
      updateOrbitRadius(second, bodyPositions, orbitRadii);
    }
  }
}

function translateBodySubtree(
  body: BodySnapshot,
  deltaX: number,
  deltaY: number,
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  bodyPositions: Map<string, Vec2>
): void {
  const position = bodyPositions.get(body.id) ?? body.position;
  bodyPositions.set(body.id, {
    x: position.x + deltaX,
    y: position.y + deltaY
  });

  for (const child of childrenByParentId.get(body.id) ?? []) {
    translateBodySubtree(child, deltaX, deltaY, childrenByParentId, bodyPositions);
  }
}

function updateOrbitRadius(
  body: BodySnapshot,
  bodyPositions: ReadonlyMap<string, Vec2>,
  orbitRadii: Map<string, number>
): void {
  if (body.parentId === null) {
    return;
  }

  const parentPosition = bodyPositions.get(body.parentId);
  const bodyPosition = bodyPositions.get(body.id);

  if (parentPosition === undefined || bodyPosition === undefined) {
    return;
  }

  orbitRadii.set(body.id, distance(parentPosition, bodyPosition));
}

function applyOrbitRailConstraints(
  bodies: readonly BodySnapshot[],
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>,
  bodyRadii: ReadonlyMap<string, number>,
  nodeRingScales: ReadonlyMap<string, number>,
  tuning: Cinematic3dVisualTuning,
  zoomCurve: number
): void {
  const bodiesById = new Map(bodies.map((body) => [body.id, body]));
  const childrenByParentId = createChildrenByParentId(bodies);

  applyConcentricMoonOrbitGroups(
    childrenByParentId,
    bodiesById,
    nodesByBodyId,
    bodyPositions,
    orbitRadii,
    bodyRadii,
    nodeRingScales,
    tuning,
    zoomCurve
  );
  applyHeliocentricOrbitRailSeparation(
    bodies,
    bodiesById,
    childrenByParentId,
    bodyPositions,
    orbitRadii
  );
}

function createChildrenByParentId(bodies: readonly BodySnapshot[]): Map<string, BodySnapshot[]> {
  const childrenByParentId = new Map<string, BodySnapshot[]>();

  for (const body of bodies) {
    if (body.parentId === null) {
      continue;
    }

    const siblings = childrenByParentId.get(body.parentId) ?? [];
    siblings.push(body);
    childrenByParentId.set(body.parentId, siblings);
  }

  return childrenByParentId;
}

function applyConcentricMoonOrbitGroups(
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  bodiesById: ReadonlyMap<string, BodySnapshot>,
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>,
  bodyRadii: ReadonlyMap<string, number>,
  nodeRingScales: ReadonlyMap<string, number>,
  tuning: Cinematic3dVisualTuning,
  zoomCurve: number
): void {
  const firstOrbitMultiplier = getZoomedOutScalarMultiplier(
    zoomOutFirstMoonOrbitDistanceMultiplier,
    zoomCurve
  );
  const bandGapMultiplier = getZoomedOutScalarMultiplier(
    zoomOutMoonOrbitBandGapMultiplier,
    zoomCurve
  );

  for (const [parentId, children] of childrenByParentId) {
    const moons = children.filter((body) => body.kind === "moon");

    if (moons.length === 0) {
      continue;
    }

    const parentPosition = bodyPositions.get(parentId);
    const parent = bodiesById.get(parentId);

    if (parentPosition === undefined || parent === undefined) {
      continue;
    }

    const groups = new Map<string, BodySnapshot[]>();

    for (const moon of moons) {
      const groupKey = getMoonOrbitGroupKey(moon);
      groups.set(groupKey, [...(groups.get(groupKey) ?? []), moon]);
    }

    const orderedGroups = [...groups.entries()].sort((first, second) => {
      const firstOrder = getMoonOrbitGroupOrder(parentId, first[0]);
      const secondOrder = getMoonOrbitGroupOrder(parentId, second[0]);

      if (firstOrder !== secondOrder) {
        return firstOrder - secondOrder;
      }

      return (
        getMoonOrbitGroupRadius(parentPosition, first[1], bodyPositions, orbitRadii) -
        getMoonOrbitGroupRadius(parentPosition, second[1], bodyPositions, orbitRadii)
      );
    });

    let previousRadius = 0;
    let previousNaturalRadius = 0;

    for (const [, groupMoons] of orderedGroups) {
      const naturalRadius = getMoonOrbitGroupRadius(
        parentPosition,
        groupMoons,
        bodyPositions,
        orbitRadii
      );
      const zoomOutRadius =
        previousRadius <= 0
          ? naturalRadius * firstOrbitMultiplier
          : Math.max(
              naturalRadius,
              previousRadius +
                Math.max(orbitRailIntersectionGap, naturalRadius - previousNaturalRadius) *
                  bandGapMultiplier
            );
      const zoomInTargetRadius = getZoomInMoonOrbitTargetRadius(parent.id, groupMoons, bodyRadii);
      const minimumClearanceRadius = getMinimumMoonOrbitClearanceRadius(
        parent,
        groupMoons,
        nodesByBodyId,
        bodyRadii,
        nodeRingScales,
        tuning
      );
      const interpolatedRadius =
        zoomInTargetRadius === null
          ? zoomOutRadius
          : mix(zoomOutRadius, zoomInTargetRadius, zoomCurve);
      const radius = Math.max(
        interpolatedRadius,
        minimumClearanceRadius,
        previousRadius + (previousRadius <= 0 ? 0 : orbitRailIntersectionGap)
      );

      for (const moon of groupMoons) {
        setBodyOrbitRadius(
          moon,
          parentPosition,
          radius,
          childrenByParentId,
          bodyPositions,
          orbitRadii
        );
      }

      previousRadius = radius;
      previousNaturalRadius = naturalRadius;
    }
  }
}

function getZoomInMoonOrbitTargetRadius(
  parentId: string,
  moons: readonly BodySnapshot[],
  bodyRadii: ReadonlyMap<string, number>
): number | null {
  const parentRadius = bodyRadii.get(parentId);

  if (parentRadius === undefined) {
    return null;
  }

  let ratio = 0;

  for (const moon of moons) {
    ratio = Math.max(ratio, zoomInMoonOrbitRadiusRatiosToParent[moon.id] ?? 0);
  }

  return ratio <= 0 ? null : parentRadius * ratio;
}

function getMinimumMoonOrbitClearanceRadius(
  parent: BodySnapshot,
  moons: readonly BodySnapshot[],
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  bodyRadii: ReadonlyMap<string, number>,
  nodeRingScales: ReadonlyMap<string, number>,
  tuning: Cinematic3dVisualTuning
): number {
  const parentNode = nodesByBodyId.get(parent.id);
  const parentClearanceRadius = Math.max(
    bodyRadii.get(parent.id) ?? parent.visualRadius,
    parentNode === undefined ? 0 : getNodeRingRadius(parentNode, nodeRingScales)
  );
  const parentMoonGap = Math.max(tuning.nodeRingMinGap, tuning.parentMoonNodeRingMinGap);
  let minimumRadius = 0;

  for (const moon of moons) {
    const moonNode = nodesByBodyId.get(moon.id);

    if (moonNode === undefined) {
      continue;
    }

    minimumRadius = Math.max(
      minimumRadius,
      parentClearanceRadius + getNodeRingRadius(moonNode, nodeRingScales) + parentMoonGap
    );
  }

  return minimumRadius;
}

function getZoomedOutScalarMultiplier(multiplier: number, zoomCurve: number): number {
  return mix(multiplier, 1, zoomCurve);
}

function applyHeliocentricOrbitRailSeparation(
  bodies: readonly BodySnapshot[],
  bodiesById: ReadonlyMap<string, BodySnapshot>,
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>
): void {
  for (const parent of bodies) {
    if (parent.visualClass !== "star") {
      continue;
    }

    const parentPosition = bodyPositions.get(parent.id) ?? parent.position;
    const children = (childrenByParentId.get(parent.id) ?? [])
      .filter((body) => body.kind !== "moon")
      .sort((first, second) => first.orbitRadius - second.orbitRadius);
    let previousBody: BodySnapshot | undefined;
    let previousRadius = 0;

    for (const body of children) {
      let radius = getOrbitRadius(body, orbitRadii);

      if (previousBody !== undefined) {
        const minimumGap =
          Math.max(
            getLocalOrbitEnvelope(previousBody, childrenByParentId, orbitRadii),
            getLocalOrbitEnvelope(body, childrenByParentId, orbitRadii)
          ) + orbitRailIntersectionGap;
        const minimumRadius = previousRadius + minimumGap;

        if (radius < minimumRadius) {
          radius = minimumRadius;
          setBodyOrbitRadius(
            body,
            parentPosition,
            radius,
            childrenByParentId,
            bodyPositions,
            orbitRadii
          );
        }
      }

      previousBody = bodiesById.get(body.id) ?? body;
      previousRadius = radius;
    }
  }
}

function getMoonOrbitGroupKey(body: BodySnapshot): string {
  return moonOrbitGroupByBodyId[body.id] ?? `${body.parentId ?? "root"}:${body.id}`;
}

function getMoonOrbitTier(body: BodySnapshot): string {
  const groupKey = getMoonOrbitGroupKey(body);
  const tier = groupKey.split(":")[1];
  return tier ?? "single";
}

function getMoonOrbitGroupOrder(parentId: string, groupKey: string): number {
  const order = moonOrbitGroupOrderByParentId[parentId];
  const index = order?.indexOf(groupKey) ?? -1;

  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

function getMoonOrbitGroupRadius(
  parentPosition: Vec2,
  moons: readonly BodySnapshot[],
  bodyPositions: ReadonlyMap<string, Vec2>,
  orbitRadii: ReadonlyMap<string, number>
): number {
  let radius = 0;

  for (const moon of moons) {
    const moonPosition = bodyPositions.get(moon.id) ?? moon.position;
    radius = Math.max(radius, orbitRadii.get(moon.id) ?? distance(parentPosition, moonPosition));
  }

  return radius;
}

function getLocalOrbitEnvelope(
  body: BodySnapshot,
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  orbitRadii: ReadonlyMap<string, number>
): number {
  let envelope = 0;

  for (const child of childrenByParentId.get(body.id) ?? []) {
    envelope = Math.max(envelope, orbitRadii.get(child.id) ?? child.orbitRadius);
  }

  return envelope;
}

function getOrbitRadius(body: BodySnapshot, orbitRadii: ReadonlyMap<string, number>): number {
  return orbitRadii.get(body.id) ?? body.orbitRadius;
}

function setBodyOrbitRadius(
  body: BodySnapshot,
  parentPosition: Vec2,
  radius: number,
  childrenByParentId: ReadonlyMap<string, readonly BodySnapshot[]>,
  bodyPositions: Map<string, Vec2>,
  orbitRadii: Map<string, number>
): void {
  const bodyPosition = bodyPositions.get(body.id) ?? body.position;
  const direction = getDirection(parentPosition, bodyPosition, body.initialAngle);
  const nextPosition = {
    x: parentPosition.x + direction.x * radius,
    y: parentPosition.y + direction.y * radius
  };

  translateBodySubtree(
    body,
    nextPosition.x - bodyPosition.x,
    nextPosition.y - bodyPosition.y,
    childrenByParentId,
    bodyPositions
  );
  orbitRadii.set(body.id, radius);
}

function getNodeRingRadius(
  node: NodeSnapshot,
  nodeRingScales: ReadonlyMap<string, number>
): number {
  return node.nodeOrbitRadius * (nodeRingScales.get(node.id) ?? 1);
}

function getDirection(from: Vec2, to: Vec2, fallbackAngleDegrees: number): Vec2 {
  const delta = {
    x: to.x - from.x,
    y: to.y - from.y
  };
  const length = Math.hypot(delta.x, delta.y);

  if (length > 0.001) {
    return {
      x: delta.x / length,
      y: delta.y / length
    };
  }

  const angle = (fallbackAngleDegrees / 180) * Math.PI;
  return {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
}

function distance(first: Vec2, second: Vec2): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function computeDisplayBounds(
  bodies: readonly BodySnapshot[],
  nodesByBodyId: ReadonlyMap<string, NodeSnapshot>,
  bodyPositions: ReadonlyMap<string, Vec2>,
  bodyRadii: ReadonlyMap<string, number>,
  nodeRingScales: ReadonlyMap<string, number>
): Bounds {
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const body of bodies) {
    const position = bodyPositions.get(body.id) ?? body.position;
    const bodyRadius = bodyRadii.get(body.id) ?? body.visualRadius;
    const node = nodesByBodyId.get(body.id);
    const nodeRadius =
      node === undefined ? 0 : node.nodeOrbitRadius * (nodeRingScales.get(node.id) ?? 1);
    const radius = Math.max(bodyRadius, nodeRadius);
    minX = Math.min(minX, position.x - radius);
    minY = Math.min(minY, position.y - radius);
    maxX = Math.max(maxX, position.x + radius);
    maxY = Math.max(maxY, position.y + radius);
  }

  if (
    !Number.isFinite(minX) ||
    !Number.isFinite(minY) ||
    !Number.isFinite(maxX) ||
    !Number.isFinite(maxY)
  ) {
    return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  }

  const padding = 96;
  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding
  };
}

function computeZoomProgress(
  distance: number,
  zoomOutDistance: number,
  minDistance: number
): number {
  return clamp((zoomOutDistance - distance) / Math.max(1, zoomOutDistance - minDistance), 0, 1);
}

function normalizeDisplayRadius(
  visualRadius: number,
  referenceRadius: number,
  exponent: number
): number {
  return Math.pow(visualRadius, exponent) * Math.pow(referenceRadius, 1 - exponent);
}

function mix(start: number, end: number, progress: number): number {
  return start + (end - start) * progress;
}

function smoothZoomCurve(value: number): number {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function degreesToRadians(degrees: number): number {
  return (degrees / 180) * Math.PI;
}

function resolveFocusedBodyId(
  focusedTargetKey: string | null,
  bodiesById: ReadonlyMap<string, BodySnapshot>,
  nodeById: ReadonlyMap<string, NodeSnapshot>
): string | null {
  if (focusedTargetKey === null) {
    return null;
  }

  const [targetType, targetId] = focusedTargetKey.split(":");

  if (targetId === undefined) {
    return null;
  }

  if (targetType === "body" && bodiesById.has(targetId)) {
    return targetId;
  }

  if (focusedTargetKey === SYSTEM_PRESENTATION_FOCUS_TARGET_KEY) {
    return systemPresentationFocusedBodyId;
  }

  if (targetType === "node") {
    return nodeById.get(targetId)?.bodyId ?? null;
  }

  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
