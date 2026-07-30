import * as THREE from "three";
import type { BodySnapshot, BurnPlan, NodeSnapshot, SolarSystemSnapshot } from "../../core";

const mapPlaneUp = new THREE.Vector3(0, 1, 0);

const burnTransferVerticalHeightScale = 0.8;
const activeBurnNodeOrbitHeightOffset = 0.42;
const missileTrajectoryBaseHeightScale = 0.46;
const missileTrajectoryExtraLiftScale = 0.68;
const activeBurnBodyClearanceMultiplier = 1.18;
const activeBurnBodyClearancePadding = 1.2;
const activeBurnBodyClearanceVerticalLiftMultiplier = 0.08;
const burnPreviewSharpTurnLimitRadians = THREE.MathUtils.degToRad(44);
const burnPreviewEndpointSharpTurnLimitRadians = THREE.MathUtils.degToRad(28);
const burnPreviewTurnSofteningPassCount = 4;
const burnPreviewEndpointTangentPreservePointCount = 3;
const burnPreviewMidspanBowPower = 0.86;
const burnPreviewMinimumPlanarBowRatio = 0.1;
const burnPreviewMaximumPlanarBowRatio = 0.24;
const burnPreviewRadialToPlanarBowRatio = 0.92;
const firePreviewMidspanBowPower = 0.92;
const missilePreviewLiftPower = 0.96;
const missilePreviewSupportingLiftPower = 1.62;
const burnPreviewOrbitClearancePaddingRatio = 0.018;
const burnPreviewOrbitClearanceMinimumPadding = 0.025;
const burnPreviewOrbitClearanceMaximumPadding = 0.6;
const burnPreviewEndpointOrbitClearanceSpan = 0.16;

export type ActiveBurnFlightPath = Readonly<{
  transferPoints: readonly THREE.Vector3[];
  insertionPoints: readonly THREE.Vector3[];
  insertionStart: number;
}>;

export type BurnTrajectoryDashAnimationState = Readonly<{
  phase: number;
  cycle: number;
  elapsed: number;
}>;

// Presentation animation must not catch up an entire main-thread stall in one rendered frame.
// AI turn planning can briefly block the menu demo; advancing the full wall-clock gap makes every
// BURN dash teleport at once even though its trajectory geometry and camera stayed continuous.
export const burnTrajectoryDashMaximumFrameDeltaSeconds = 1 / 30;

export function rebaseBurnTrajectoryDashAnimationState(
  previous: BurnTrajectoryDashAnimationState | null,
  nextCycle: number,
  initialPhase: number,
  elapsed: number
): BurnTrajectoryDashAnimationState {
  const safeNextCycle = Math.max(0.001, nextCycle);

  if (previous === null || !isFiniteBurnTrajectoryDashAnimationState(previous)) {
    return {
      phase: positiveModulo(initialPhase, safeNextCycle),
      cycle: safeNextCycle,
      elapsed
    };
  }

  // A turn transition rebuilds the preview spline every frame. Its measured length, and thus its
  // dash cycle, changes while the bodies move. Preserve the normalized phase across that resize;
  // recomputing `elapsed % nextCycle` would move every lit dash to an unrelated position.
  const normalizedPhase = positiveModulo(previous.phase, previous.cycle) / previous.cycle;

  return {
    phase: normalizedPhase * safeNextCycle,
    cycle: safeNextCycle,
    elapsed: previous.elapsed
  };
}

export function advanceBurnTrajectoryDashAnimationState(
  previous: BurnTrajectoryDashAnimationState,
  elapsed: number,
  nextCycle: number,
  phaseSpeed: number
): BurnTrajectoryDashAnimationState {
  const rebased = rebaseBurnTrajectoryDashAnimationState(
    previous,
    nextCycle,
    previous.phase,
    elapsed
  );
  const elapsedDelta = Math.min(
    burnTrajectoryDashMaximumFrameDeltaSeconds,
    Math.max(0, elapsed - rebased.elapsed)
  );

  return {
    phase: positiveModulo(rebased.phase + elapsedDelta * Math.max(0, phaseSpeed), rebased.cycle),
    cycle: rebased.cycle,
    elapsed
  };
}

function isFiniteBurnTrajectoryDashAnimationState(
  state: BurnTrajectoryDashAnimationState
): boolean {
  return (
    Number.isFinite(state.phase) &&
    Number.isFinite(state.cycle) &&
    state.cycle > 0 &&
    Number.isFinite(state.elapsed)
  );
}

function positiveModulo(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

export type ActiveBurnBodyClearance = Readonly<{
  bodyId: string;
  position: THREE.Vector3;
  radius: number;
}>;

export type TransferVisualProfile = Pick<
  BurnPlan,
  | "transferCategory"
  | "transferWindowQuality"
  | "motionRelation"
  | "visualArcType"
  | "visualArcHeight"
>;

export type DepartureOrbitRenderData = Readonly<{
  center: THREE.Vector3;
  startAngle: number;
  targetAngle: number;
  direction: -1 | 1;
  radius: number;
  heightOffset: number;
  transferAnchor: THREE.Vector3;
}>;

export type DisplayNodeRenderData = Readonly<{
  node: NodeSnapshot;
  body: BodySnapshot;
  center: THREE.Vector3;
  bodyPosition: THREE.Vector3;
  parentBodyPosition?: THREE.Vector3;
  bodyRadius: number;
  ringRadius: number;
  departureDirection?: THREE.Vector3;
  departureOrbit?: DepartureOrbitRenderData;
  snapshot: SolarSystemSnapshot;
}>;

type LocalTransferFrame = Readonly<{
  startParent: THREE.Vector3;
  endParent: THREE.Vector3;
}>;

type TransferPreviewStyle = "burn" | "fire";

type TransferPreviewOptions = Readonly<{
  includeDepartureContinuity?: boolean;
  lockArcBranch?: boolean;
  style?: TransferPreviewStyle;
}>;

type TransferEndpointCandidate = Readonly<{
  point: THREE.Vector3;
  arcDirection: -1 | 1;
  tangent?: THREE.Vector3;
  tangentLocked?: boolean;
}>;

type TransferEndpointTangents = Readonly<{
  startTangent?: THREE.Vector3;
  endTangent?: THREE.Vector3;
  startTangentLocked?: boolean;
  endTangentLocked?: boolean;
}>;

const transferPreviewTangentDirections = [1, -1] as const;

export function createLaunchOriginRenderData(context: {
  baseOrigin: DisplayNodeRenderData;
  destination: DisplayNodeRenderData;
  capturedLaunchPosition: THREE.Vector3 | undefined;
  launchAngle: number;
  currentTurn: number;
  etaTurns: number;
  orbitDirection?: -1 | 1;
  profile?: TransferVisualProfile;
  transferArcDirection?: -1 | 1;
  lockTransferAnchor?: boolean;
}): DisplayNodeRenderData | null {
  const arcDirection =
    context.transferArcDirection ??
    getTransferArcDirection(
      context.baseOrigin,
      context.destination,
      context.currentTurn,
      context.etaTurns,
      context.profile
    );
  const fallbackRadius = context.baseOrigin.ringRadius * 1.13;
  const launchPosition =
    context.capturedLaunchPosition?.clone() ??
    context.baseOrigin.center
      .clone()
      .add(
        new THREE.Vector3(
          Math.cos(context.launchAngle) * fallbackRadius,
          activeBurnNodeOrbitHeightOffset,
          Math.sin(context.launchAngle) * fallbackRadius
        )
      );
  launchPosition.y = context.baseOrigin.center.y + activeBurnNodeOrbitHeightOffset;
  const localLaunchOffset = launchPosition.clone().sub(context.baseOrigin.center);
  const launchRadius = Math.max(
    0.001,
    Math.hypot(localLaunchOffset.x, localLaunchOffset.z) || fallbackRadius
  );
  const startAngle =
    launchRadius <= 0.001
      ? context.launchAngle
      : Math.atan2(localLaunchOffset.z, localLaunchOffset.x);
  const transferAnchor =
    context.orbitDirection === undefined || context.lockTransferAnchor === true
      ? getTransferNodeTangentPoint(context.baseOrigin, context.destination, arcDirection)
      : getLaunchTransferAnchor(
          context.baseOrigin,
          context.destination,
          startAngle,
          arcDirection,
          context.orbitDirection
        );
  const localAnchorOffset = transferAnchor.clone().sub(context.baseOrigin.center);
  const targetAngle =
    localAnchorOffset.lengthSq() <= 0.0001
      ? startAngle
      : Math.atan2(localAnchorOffset.z, localAnchorOffset.x);
  const departureVector = transferAnchor.clone().sub(launchPosition);
  const departureDistance = departureVector.length();

  if (departureDistance <= 0.001) {
    return null;
  }

  return {
    ...context.baseOrigin,
    center: launchPosition,
    bodyPosition: context.baseOrigin.bodyPosition.clone(),
    ...(context.baseOrigin.parentBodyPosition === undefined
      ? {}
      : { parentBodyPosition: context.baseOrigin.parentBodyPosition.clone() }),
    bodyRadius: 1,
    ringRadius: departureDistance,
    departureDirection: departureVector.normalize(),
    departureOrbit: {
      center: context.baseOrigin.center.clone(),
      startAngle,
      targetAngle,
      direction:
        context.orbitDirection ?? chooseShortestNodeOrbitDirection(startAngle, targetAngle),
      radius: launchRadius,
      heightOffset: launchPosition.y - context.baseOrigin.center.y,
      transferAnchor: transferAnchor.clone()
    }
  };
}

function buildLocalOrbitalTransferPreview(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  currentTurn: number,
  etaTurns: number,
  profile: TransferVisualProfile | undefined,
  style: TransferPreviewStyle,
  arcDirection: -1 | 1,
  lockArcBranch: boolean
): THREE.Vector3[] | null {
  const frame = getLocalTransferFrame(origin, destination, profile);

  if (frame === null) {
    return null;
  }

  const transferTurns = Math.max(1, etaTurns, destination.snapshot.turn - currentTurn);
  if (style === "burn") {
    const startCandidates = getLocalNodeOrbitTangentCandidates(origin, destination, arcDirection);
    const endCandidates = getLocalNodeOrbitTangentCandidates(
      destination,
      origin,
      arcDirection,
      "arrival"
    );

    if (!lockArcBranch) {
      return buildMostReadableSingleSpanTransferPreview(
        startCandidates,
        endCandidates,
        profile,
        transferTurns,
        arcDirection,
        style,
        origin.center,
        destination.center
      );
    }

    return buildLockedTangentSingleSpanTransferPreview(
      startCandidates,
      endCandidates,
      profile,
      transferTurns,
      arcDirection,
      style,
      origin.center,
      destination.center
    );
  }

  const start = getTransferNodeTangentPoint(origin, destination, arcDirection);
  // FIRE is a firing solution, not an orbital insertion. Ending the main spline at the
  // impact point avoids the visible change of curvature caused by a separate terminal leg.
  const end = destination.center.clone();
  const startAngle = getLocalTransferAngle(start, frame.startParent, end);
  const endAngle = getLocalTransferAngle(end, frame.endParent, start);
  const signedArc = resolveNodeOrbitArcForDirection(startAngle, endAngle, arcDirection);
  return buildReadableSingleSpanTransferPreview(
    start,
    end,
    profile,
    transferTurns,
    signedArc === 0 ? arcDirection : signedArc < 0 ? -1 : 1,
    style
  );
}

function getLocalTransferFrame(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  profile?: TransferVisualProfile
): LocalTransferFrame | null {
  if (!isLocalTransferVisualProfile(profile)) {
    return null;
  }

  if (
    origin.body.parentId !== null &&
    origin.body.parentId === destination.body.parentId &&
    origin.parentBodyPosition !== undefined &&
    destination.parentBodyPosition !== undefined
  ) {
    return {
      startParent: origin.parentBodyPosition.clone(),
      endParent: destination.parentBodyPosition.clone()
    };
  }

  if (
    destination.body.parentId === origin.body.id &&
    destination.parentBodyPosition !== undefined
  ) {
    return {
      startParent: origin.bodyPosition.clone(),
      endParent: destination.parentBodyPosition.clone()
    };
  }

  if (origin.body.parentId === destination.body.id && origin.parentBodyPosition !== undefined) {
    return {
      startParent: origin.parentBodyPosition.clone(),
      endParent: destination.bodyPosition.clone()
    };
  }

  return null;
}

function isLocalTransferVisualProfile(profile: TransferVisualProfile | undefined): boolean {
  return profile?.transferCategory === "local" || profile?.visualArcType === "local-hop";
}

export function getTransferArcDirection(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  currentTurn: number,
  etaTurns: number,
  profile?: TransferVisualProfile
): -1 | 1 {
  const frame = getLocalTransferFrame(origin, destination, profile);

  if (frame !== null) {
    const startAngle = getLocalTransferAngle(origin.center, frame.startParent, destination.center);
    const endAngle = getLocalTransferAngle(destination.center, frame.endParent, origin.center);
    return chooseShortestNodeOrbitDirection(startAngle, endAngle);
  }

  return getTransferArcGeometry(origin, destination, currentTurn, etaTurns).arcDirection;
}

export function getTransferArcDirectionFromPositions(
  originPosition: THREE.Vector3,
  destinationPosition: THREE.Vector3,
  currentTurn: number,
  etaTurns: number
): -1 | 1 {
  return getTransferArcGeometryFromPositions(
    originPosition,
    destinationPosition,
    currentTurn,
    etaTurns,
    currentTurn + etaTurns
  ).arcDirection;
}

function getTransferNodeTangentPoint(
  nodeRenderData: DisplayNodeRenderData,
  otherNodeRenderData: DisplayNodeRenderData,
  arcDirection: -1 | 1,
  endpoint: "departure" | "arrival" = "departure"
): THREE.Vector3 {
  if (hasPinnedTransferTangent(nodeRenderData)) {
    return getNodeOrbitTangentPoint(nodeRenderData, arcDirection);
  }

  const routeDirection = getStableTransferRouteDirection(
    nodeRenderData,
    otherNodeRenderData,
    endpoint
  );
  const orbitRadial = getNodeOrbitRadialForTangent(routeDirection).multiplyScalar(arcDirection);
  const point = nodeRenderData.center
    .clone()
    .addScaledVector(orbitRadial, nodeRenderData.ringRadius);
  point.y = nodeRenderData.center.y;
  return point;
}

function getStableTransferRouteDirection(
  nodeRenderData: DisplayNodeRenderData,
  otherNodeRenderData: DisplayNodeRenderData,
  endpoint: "departure" | "arrival"
): THREE.Vector3 {
  const routeDirection = new THREE.Vector3(
    otherNodeRenderData.node.position.x - nodeRenderData.node.position.x,
    0,
    otherNodeRenderData.node.position.y - nodeRenderData.node.position.y
  );

  if (routeDirection.lengthSq() <= 0.0001) {
    routeDirection.copy(otherNodeRenderData.center).sub(nodeRenderData.center);
    routeDirection.y = 0;
  }

  if (routeDirection.lengthSq() <= 0.0001) {
    routeDirection.set(1, 0, 0);
  } else {
    routeDirection.normalize();
  }

  return endpoint === "arrival" ? routeDirection.multiplyScalar(-1) : routeDirection;
}

function getLaunchTransferAnchor(
  nodeRenderData: DisplayNodeRenderData,
  otherNodeRenderData: DisplayNodeRenderData,
  startAngle: number,
  preferredArcDirection: -1 | 1,
  orbitDirection: -1 | 1
): THREE.Vector3 {
  const preferredPoint = getTransferNodeTangentPoint(
    nodeRenderData,
    otherNodeRenderData,
    preferredArcDirection
  );
  const alternatePoint = getTransferNodeTangentPoint(
    nodeRenderData,
    otherNodeRenderData,
    preferredArcDirection === 1 ? -1 : 1
  );
  const preferredScore = scoreLaunchTransferAnchor(
    nodeRenderData,
    otherNodeRenderData,
    startAngle,
    preferredPoint,
    orbitDirection,
    0.04
  );
  const alternateScore = scoreLaunchTransferAnchor(
    nodeRenderData,
    otherNodeRenderData,
    startAngle,
    alternatePoint,
    orbitDirection,
    0
  );

  return alternateScore > preferredScore ? alternatePoint : preferredPoint;
}

function scoreLaunchTransferAnchor(
  nodeRenderData: DisplayNodeRenderData,
  otherNodeRenderData: DisplayNodeRenderData,
  startAngle: number,
  point: THREE.Vector3,
  orbitDirection: -1 | 1,
  preferredBonus: number
): number {
  const localOffset = point.clone().sub(nodeRenderData.center);
  localOffset.y = 0;

  if (localOffset.lengthSq() <= 0.0001) {
    return Number.NEGATIVE_INFINITY;
  }

  const targetAngle = Math.atan2(localOffset.z, localOffset.x);
  const orbitArc = Math.abs(
    resolveNodeOrbitArcForDirection(startAngle, targetAngle, orbitDirection)
  );
  const localTangent = getLocalOrbitTangent(targetAngle, orbitDirection);
  const desiredTransferDirection = otherNodeRenderData.center.clone().sub(point);
  desiredTransferDirection.y = 0;

  if (desiredTransferDirection.lengthSq() <= 0.0001) {
    return preferredBonus - orbitArc * 0.45;
  }

  desiredTransferDirection.normalize();
  return localTangent.dot(desiredTransferDirection) * 1.35 - orbitArc * 0.45 + preferredBonus;
}

function getLocalNodeOrbitTangentCandidates(
  nodeRenderData: DisplayNodeRenderData,
  otherNodeRenderData: DisplayNodeRenderData,
  preferredArcDirection: -1 | 1,
  endpoint: "departure" | "arrival" = "departure"
): TransferEndpointCandidate[] {
  return getTransferNodeTangentCandidates(
    nodeRenderData,
    otherNodeRenderData,
    preferredArcDirection,
    endpoint
  );
}

function getLocalTransferAngle(
  point: THREE.Vector3,
  parentCenter: THREE.Vector3,
  fallbackPoint: THREE.Vector3
): number {
  const offset = point.clone().sub(parentCenter);
  offset.y = 0;

  if (offset.lengthSq() > 0.0001) {
    return Math.atan2(offset.z, offset.x);
  }

  const fallbackOffset = fallbackPoint.clone().sub(parentCenter);
  fallbackOffset.y = 0;

  if (fallbackOffset.lengthSq() > 0.0001) {
    return Math.atan2(fallbackOffset.z, fallbackOffset.x);
  }

  return 0;
}

export function buildZoomStableBurnPreviewTrajectory(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  currentTurn: number,
  etaTurns: number,
  profile: TransferVisualProfile | undefined,
  arcDirection: -1 | 1,
  options: TransferPreviewOptions = {}
): THREE.Vector3[] {
  const style = options.style ?? "burn";
  const localPreview = buildLocalOrbitalTransferPreview(
    origin,
    destination,
    currentTurn,
    etaTurns,
    profile,
    style,
    arcDirection,
    options.lockArcBranch === true
  );
  const transferTurns = Math.max(1, etaTurns, destination.snapshot.turn - currentTurn);

  if (localPreview !== null) {
    const continuousLocalTransfer =
      options.includeDepartureContinuity === true &&
      (origin.departureOrbit !== undefined || origin.departureDirection !== undefined) &&
      origin.ringRadius > 0.001
        ? createContinuousDepartureTransferPoints(origin, localPreview)
        : localPreview;
    const finalLocalTransfer =
      style === "burn"
        ? enforceBurnPreviewEndpointOrbitClearance(
            softenImpossibleBurnPreviewTurns(continuousLocalTransfer),
            origin,
            destination
          )
        : continuousLocalTransfer;

    return finalLocalTransfer.map((point) => point.clone());
  }

  const singleSpan =
    style === "burn"
      ? buildBurnTransferPreviewSpan(
          origin,
          destination,
          profile,
          transferTurns,
          arcDirection,
          options.lockArcBranch === true
        )
      : buildReadableSingleSpanTransferPreview(
          getTransferNodeTangentPoint(origin, destination, arcDirection),
          destination.center.clone(),
          profile,
          transferTurns,
          arcDirection,
          style
        );
  const continuousTransfer =
    options.includeDepartureContinuity === true &&
    (origin.departureOrbit !== undefined || origin.departureDirection !== undefined) &&
    origin.ringRadius > 0.001
      ? createContinuousDepartureTransferPoints(origin, singleSpan)
      : singleSpan;
  const finalTransfer =
    style === "burn"
      ? enforceBurnPreviewEndpointOrbitClearance(
          softenImpossibleBurnPreviewTurns(continuousTransfer),
          origin,
          destination
        )
      : continuousTransfer;

  return finalTransfer.map((point) => point.clone());
}

function buildBurnTransferPreviewSpan(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  profile: TransferVisualProfile | undefined,
  transferTurns: number,
  arcDirection: -1 | 1,
  lockArcBranch: boolean
): THREE.Vector3[] {
  const startCandidates = getTransferNodeTangentCandidates(origin, destination, arcDirection);
  const endCandidates = getTransferNodeTangentCandidates(
    destination,
    origin,
    arcDirection,
    "arrival"
  );

  if (!lockArcBranch) {
    return buildMostReadableSingleSpanTransferPreview(
      startCandidates,
      endCandidates,
      profile,
      transferTurns,
      arcDirection,
      "burn",
      origin.center,
      destination.center
    );
  }

  return buildLockedTangentSingleSpanTransferPreview(
    startCandidates,
    endCandidates,
    profile,
    transferTurns,
    arcDirection,
    "burn",
    origin.center,
    destination.center
  );
}

function buildLockedTangentSingleSpanTransferPreview(
  startCandidates: readonly TransferEndpointCandidate[],
  endCandidates: readonly TransferEndpointCandidate[],
  profile: TransferVisualProfile | undefined,
  transferTurns: number,
  arcDirection: -1 | 1,
  style: TransferPreviewStyle,
  originCenter: THREE.Vector3,
  destinationCenter: THREE.Vector3
): THREE.Vector3[] {
  const startPoint = startCandidates[0]?.point ?? originCenter;
  const endPoint = endCandidates[0]?.point ?? destinationCenter;
  const planarDirection = endPoint.clone().sub(startPoint);
  planarDirection.y = 0;

  if (planarDirection.lengthSq() <= 0.0001) {
    planarDirection.copy(destinationCenter).sub(originCenter);
    planarDirection.y = 0;
  }

  if (planarDirection.lengthSq() <= 0.0001) {
    planarDirection.set(1, 0, 0);
  } else {
    planarDirection.normalize();
  }

  const startCandidate = getForwardTransferEndpointCandidate(
    startCandidates,
    planarDirection,
    arcDirection
  );
  const endCandidate = getForwardTransferEndpointCandidate(
    endCandidates,
    planarDirection,
    arcDirection
  );
  return buildReadableSingleSpanTransferPreview(
    startCandidate?.point ?? originCenter,
    endCandidate?.point ?? destinationCenter,
    profile,
    transferTurns,
    arcDirection,
    style,
    getTransferEndpointTangents(startCandidate, endCandidate)
  );
}

function getForwardTransferEndpointCandidate(
  candidates: readonly TransferEndpointCandidate[],
  planarDirection: THREE.Vector3,
  preferredArcDirection: -1 | 1
): TransferEndpointCandidate | undefined {
  let bestCandidate = candidates[0];
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const tangent = getPlanarTransferTangent(candidate.tangent);
    const forwardAlignment = tangent?.dot(planarDirection) ?? 0;
    const score =
      forwardAlignment +
      (candidate.arcDirection === preferredArcDirection ? Number.EPSILON * 16 : 0);

    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate;
}

function getTransferNodeTangentCandidates(
  nodeRenderData: DisplayNodeRenderData,
  otherNodeRenderData: DisplayNodeRenderData,
  preferredArcDirection: -1 | 1,
  endpoint: "departure" | "arrival" = "departure"
): TransferEndpointCandidate[] {
  const point = getTransferNodeTangentPoint(
    nodeRenderData,
    otherNodeRenderData,
    preferredArcDirection,
    endpoint
  );

  if (hasPinnedTransferTangent(nodeRenderData)) {
    return [getTransferEndpointCandidate(nodeRenderData, point, preferredArcDirection)];
  }

  return getOrderedTransferPreviewDirections(preferredArcDirection).map((arcDirection) =>
    getTransferEndpointCandidate(nodeRenderData, point, arcDirection)
  );
}

function getTransferEndpointCandidate(
  nodeRenderData: DisplayNodeRenderData,
  point: THREE.Vector3,
  arcDirection: -1 | 1
): TransferEndpointCandidate {
  const tangent = getTransferEndpointTangentForPoint(nodeRenderData, point, arcDirection);

  return {
    point,
    arcDirection,
    ...(tangent === undefined ? {} : { tangent }),
    ...(tangent === undefined || !hasPinnedTransferTangent(nodeRenderData)
      ? {}
      : { tangentLocked: true })
  };
}

function getTransferEndpointTangentForPoint(
  nodeRenderData: DisplayNodeRenderData,
  point: THREE.Vector3,
  arcDirection: -1 | 1
): THREE.Vector3 | undefined {
  if (nodeRenderData.departureOrbit !== undefined) {
    return getLocalOrbitTangent(
      nodeRenderData.departureOrbit.targetAngle,
      nodeRenderData.departureOrbit.direction
    );
  }

  if (
    nodeRenderData.departureDirection !== undefined &&
    nodeRenderData.departureDirection.lengthSq() > 0.0001
  ) {
    return nodeRenderData.departureDirection.clone().normalize();
  }

  const localOffset = point.clone().sub(nodeRenderData.center);
  localOffset.y = 0;

  if (localOffset.lengthSq() <= 0.0001) {
    return undefined;
  }

  return getLocalOrbitTangent(Math.atan2(localOffset.z, localOffset.x), arcDirection);
}

function getTransferEndpointTangents(
  startCandidate: TransferEndpointCandidate | undefined,
  endCandidate: TransferEndpointCandidate | undefined
): TransferEndpointTangents {
  return {
    ...(startCandidate?.tangent === undefined ? {} : { startTangent: startCandidate.tangent }),
    ...(endCandidate?.tangent === undefined ? {} : { endTangent: endCandidate.tangent }),
    ...(startCandidate?.tangentLocked === true ? { startTangentLocked: true } : {}),
    ...(endCandidate?.tangentLocked === true ? { endTangentLocked: true } : {})
  };
}

function getPlanarTransferTangent(tangent: THREE.Vector3 | undefined): THREE.Vector3 | null {
  if (tangent === undefined) {
    return null;
  }

  const planarTangent = new THREE.Vector3(tangent.x, 0, tangent.z);

  if (planarTangent.lengthSq() <= 0.0001) {
    return null;
  }

  return planarTangent.normalize();
}

function getOrderedTransferPreviewDirections(preferredArcDirection: -1 | 1): readonly (-1 | 1)[] {
  return preferredArcDirection === 1
    ? transferPreviewTangentDirections
    : [...transferPreviewTangentDirections].reverse();
}

function hasPinnedTransferTangent(nodeRenderData: DisplayNodeRenderData): boolean {
  return (
    nodeRenderData.departureOrbit !== undefined ||
    (nodeRenderData.departureDirection !== undefined &&
      nodeRenderData.departureDirection.lengthSq() > 0.0001)
  );
}

function buildMostReadableSingleSpanTransferPreview(
  startCandidates: readonly TransferEndpointCandidate[],
  endCandidates: readonly TransferEndpointCandidate[],
  profile: TransferVisualProfile | undefined,
  transferTurns: number,
  preferredArcDirection: -1 | 1,
  style: TransferPreviewStyle,
  originCenter: THREE.Vector3,
  destinationCenter: THREE.Vector3
): THREE.Vector3[] {
  let bestPoints: THREE.Vector3[] | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const startCandidate of startCandidates) {
    for (const endCandidate of endCandidates) {
      for (const arcDirection of getOrderedTransferPreviewDirections(preferredArcDirection)) {
        const points = buildReadableSingleSpanTransferPreview(
          startCandidate.point,
          endCandidate.point,
          profile,
          transferTurns,
          arcDirection,
          style,
          getTransferEndpointTangents(startCandidate, endCandidate)
        );
        const score = scoreTransferPreviewCurvature({
          points,
          start: startCandidate.point,
          end: endCandidate.point,
          originCenter,
          destinationCenter,
          arcDirection,
          preferredArcDirection
        });

        if (score > bestScore) {
          bestScore = score;
          bestPoints = points;
        }
      }
    }
  }

  return (
    bestPoints ??
    buildReadableSingleSpanTransferPreview(
      startCandidates[0]?.point ?? originCenter,
      endCandidates[0]?.point ?? destinationCenter,
      profile,
      transferTurns,
      preferredArcDirection,
      style,
      getTransferEndpointTangents(startCandidates[0], endCandidates[0])
    )
  );
}

function scoreTransferPreviewCurvature(context: {
  points: readonly THREE.Vector3[];
  start: THREE.Vector3;
  end: THREE.Vector3;
  originCenter: THREE.Vector3;
  destinationCenter: THREE.Vector3;
  arcDirection: -1 | 1;
  preferredArcDirection: -1 | 1;
}): number {
  const centerChord = context.destinationCenter.clone().sub(context.originCenter);
  centerChord.y = 0;

  if (centerChord.lengthSq() <= 0.0001) {
    centerChord.copy(context.end).sub(context.start);
    centerChord.y = 0;
  }

  if (centerChord.lengthSq() <= 0.0001) {
    return 0;
  }

  const centerChordLength = centerChord.length();
  const centerDirection = centerChord.normalize();
  const sideAxis = new THREE.Vector3(-centerDirection.z, 0, centerDirection.x);
  let maxDeviation = 0;
  let totalDeviation = 0;

  for (const point of context.points) {
    const offset = point.clone().sub(context.originCenter);
    offset.y = 0;
    const deviation = Math.abs(offset.dot(sideAxis));
    maxDeviation = Math.max(maxDeviation, deviation);
    totalDeviation += deviation;
  }

  const averageDeviation =
    context.points.length === 0 ? 0 : totalDeviation / Math.max(1, context.points.length);
  const startSide = context.start.clone().sub(context.originCenter).dot(sideAxis);
  const endSide = context.end.clone().sub(context.destinationCenter).dot(sideAxis);
  const endpointSidePenalty =
    Math.abs(startSide) + Math.abs(endSide) + (startSide * endSide > 0 ? 1.2 : 0);
  const preferredDirectionTieBreak =
    context.arcDirection === context.preferredArcDirection ? 0.001 : 0;
  const midspanArcScore = scoreTransferPreviewMidspanArcShape(
    context.points,
    context.originCenter,
    centerDirection,
    sideAxis,
    centerChordLength
  );
  const endpointCoherencePenalty = scoreTransferPreviewEndpointCoherence(
    context.points,
    centerDirection,
    centerChordLength
  );
  const sharpTurnPenalty = scoreTransferPreviewSharpTurnPenalty(context.points, centerChordLength);

  return (
    midspanArcScore +
    maxDeviation * 0.22 +
    averageDeviation * 0.16 +
    preferredDirectionTieBreak -
    endpointSidePenalty * 0.06 -
    endpointCoherencePenalty -
    sharpTurnPenalty
  );
}

function scoreTransferPreviewMidspanArcShape(
  points: readonly THREE.Vector3[],
  originCenter: THREE.Vector3,
  centerDirection: THREE.Vector3,
  sideAxis: THREE.Vector3,
  centerChordLength: number
): number {
  if (points.length < 4) {
    return 0;
  }

  let weightedMidspanDeviation = 0;
  let midspanWeight = 0;
  let endpointDeviation = 0;
  let endpointWeight = 0;
  let monotonicPenalty = 0;
  let previousAlong = Number.NEGATIVE_INFINITY;

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];

    if (point === undefined) {
      continue;
    }

    const progress = index / Math.max(1, points.length - 1);
    const offset = point.clone().sub(originCenter);
    offset.y = 0;
    const along = offset.dot(centerDirection);
    const deviation = Math.abs(offset.dot(sideAxis));
    const midspanEnvelope = Math.sin(Math.PI * progress) ** burnPreviewMidspanBowPower;
    const endpointEnvelope = 1 - smoothStep(0.06, 0.24, Math.min(progress, 1 - progress));

    weightedMidspanDeviation += deviation * midspanEnvelope;
    midspanWeight += midspanEnvelope;
    endpointDeviation += deviation * endpointEnvelope;
    endpointWeight += endpointEnvelope;

    if (along + centerChordLength * 0.012 < previousAlong) {
      monotonicPenalty += previousAlong - along;
    }

    previousAlong = Math.max(previousAlong, along);
  }

  const averageMidspanDeviation =
    midspanWeight <= 0.001 ? 0 : weightedMidspanDeviation / midspanWeight;
  const averageEndpointDeviation = endpointWeight <= 0.001 ? 0 : endpointDeviation / endpointWeight;

  return averageMidspanDeviation - averageEndpointDeviation * 0.42 - monotonicPenalty * 0.8;
}

function scoreTransferPreviewSharpTurnPenalty(
  points: readonly THREE.Vector3[],
  centerChordLength: number
): number {
  if (points.length < 4) {
    return 0;
  }

  let penalty = 0;

  for (let index = 1; index < points.length - 1; index += 1) {
    const progress = index / Math.max(1, points.length - 1);
    const endpointWeight = 1 - smoothStep(0.08, 0.24, Math.min(progress, 1 - progress));
    const localTurnLimit = THREE.MathUtils.lerp(
      burnPreviewSharpTurnLimitRadians,
      burnPreviewEndpointSharpTurnLimitRadians,
      endpointWeight
    );
    const excessTurn = Math.max(0, getTrajectoryTurnRadiansAt(points, index) - localTurnLimit);

    if (excessTurn <= 0) {
      continue;
    }

    penalty += excessTurn * excessTurn * (1 + endpointWeight * 2.4);
  }

  return penalty * centerChordLength * 0.18;
}

function scoreTransferPreviewEndpointCoherence(
  points: readonly THREE.Vector3[],
  centerDirection: THREE.Vector3,
  centerChordLength: number
): number {
  const startTangent = getPolylineStartTangent(points);
  const endTangent = getPolylineEndTangent(points);
  const startBacktrack = Math.max(0, -startTangent.dot(centerDirection));
  const endBacktrack = Math.max(0, -endTangent.dot(centerDirection));
  const startAlignmentShortfall = Math.max(0, 0.1 - startTangent.dot(centerDirection));
  const endAlignmentShortfall = Math.max(0, 0.56 - endTangent.dot(centerDirection));
  const endpointTurnPenalty = getEndpointTurnPenalty(points);

  return (
    (startBacktrack + endBacktrack) * centerChordLength * 0.22 +
    startAlignmentShortfall * centerChordLength * 0.08 +
    endAlignmentShortfall * centerChordLength * 0.34 +
    endpointTurnPenalty * centerChordLength * 0.1
  );
}

function getEndpointTurnPenalty(points: readonly THREE.Vector3[]): number {
  if (points.length < 5) {
    return 0;
  }

  const endpointWindow = Math.min(8, Math.floor(points.length / 3));
  let penalty = 0;

  for (let index = 1; index <= endpointWindow; index += 1) {
    penalty += getTrajectoryTurnRadiansAt(points, index) * (1 - index / (endpointWindow + 1));
  }

  for (let index = points.length - endpointWindow - 1; index < points.length - 1; index += 1) {
    penalty +=
      getTrajectoryTurnRadiansAt(points, index) *
      (1 - (points.length - 1 - index) / (endpointWindow + 1));
  }

  return penalty;
}

function getTrajectoryTurnRadiansAt(points: readonly THREE.Vector3[], index: number): number {
  const previous = points[index - 1];
  const current = points[index];
  const next = points[index + 1];

  if (previous === undefined || current === undefined || next === undefined) {
    return 0;
  }

  const incoming = current.clone().sub(previous);
  const outgoing = next.clone().sub(current);

  if (incoming.lengthSq() <= 0.0001 || outgoing.lengthSq() <= 0.0001) {
    return 0;
  }

  incoming.normalize();
  outgoing.normalize();
  return Math.acos(clamp(incoming.dot(outgoing), -1, 1));
}

function getPolylineStartTangent(points: readonly THREE.Vector3[]): THREE.Vector3 {
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];

    if (current === undefined || next === undefined) {
      continue;
    }

    const tangent = next.clone().sub(current);

    if (tangent.lengthSq() > 0.0001) {
      return tangent.normalize();
    }
  }

  return new THREE.Vector3(1, 0, 0);
}

function getReadableEndpointControlTangent(
  rawTangent: THREE.Vector3,
  planarDirection: THREE.Vector3,
  tangentWeight: number,
  minimumTangentWeight = 0
): THREE.Vector3 {
  const forwardAlignment = clamp(rawTangent.dot(planarDirection), -1, 1);
  const effectiveTangentWeight = Math.max(
    minimumTangentWeight,
    tangentWeight * THREE.MathUtils.lerp(0.18, 1, smoothStep(-0.15, 0.82, forwardAlignment))
  );
  const tangent = planarDirection
    .clone()
    .multiplyScalar(1 - effectiveTangentWeight)
    .addScaledVector(rawTangent, effectiveTangentWeight);

  if (tangent.lengthSq() <= 0.0001) {
    return planarDirection.clone();
  }

  return tangent.normalize();
}

function getForwardSafeBurnEndpointTangent(
  rawTangent: THREE.Vector3,
  planarDirection: THREE.Vector3
): THREE.Vector3 {
  const forwardAlignment = rawTangent.dot(planarDirection);

  if (forwardAlignment >= 0) {
    return rawTangent;
  }

  const tangent = rawTangent.clone().addScaledVector(planarDirection, -forwardAlignment + 0.04);
  return tangent.lengthSq() <= 0.0001 ? planarDirection.clone() : tangent.normalize();
}

function buildReadableSingleSpanTransferPreview(
  start: THREE.Vector3,
  end: THREE.Vector3,
  profile: TransferVisualProfile | undefined,
  transferTurns: number,
  arcDirection: -1 | 1,
  style: TransferPreviewStyle = "burn",
  endpointTangents: TransferEndpointTangents = {}
): THREE.Vector3[] {
  const chord = end.clone().sub(start);
  const chordLength = Math.max(0.001, chord.length());
  const planarDirection = new THREE.Vector3(chord.x, 0, chord.z);

  if (planarDirection.lengthSq() <= 0.0001) {
    planarDirection.set(1, 0, 0);
  }

  planarDirection.normalize();
  const sideDirection = new THREE.Vector3(-planarDirection.z, 0, planarDirection.x)
    .multiplyScalar(arcDirection)
    .normalize();
  const midpoint = start.clone().lerp(end, 0.5);
  const radialDirection = new THREE.Vector3(midpoint.x, 0, midpoint.z);

  if (radialDirection.lengthSq() <= 0.0001) {
    radialDirection.copy(sideDirection);
  } else {
    radialDirection.normalize();
  }

  const personality = getTransferPreviewPersonality(profile, style);
  const directProgressDistance = chordLength * 0.34;
  const rawStartTangent =
    getPlanarTransferTangent(endpointTangents.startTangent) ?? planarDirection;
  const rawEndTangent = getPlanarTransferTangent(endpointTangents.endTangent) ?? planarDirection;
  const startTangent = getReadableEndpointControlTangent(
    rawStartTangent,
    planarDirection,
    style === "fire" ? 0.54 : 0.62
  );
  const endTangent = getReadableEndpointControlTangent(
    rawEndTangent,
    planarDirection,
    style === "fire" ? 0.24 : 0.2
  );
  const enforcedStartTangent =
    style === "burn"
      ? getForwardSafeBurnEndpointTangent(rawStartTangent, planarDirection)
      : startTangent;
  const enforcedEndTangent =
    style === "burn"
      ? getForwardSafeBurnEndpointTangent(rawEndTangent, planarDirection)
      : endTangent;
  const lateralBow = clamp(
    chordLength * personality.lateralBend * (style === "fire" ? 5.5 : 2.25),
    chordLength * (style === "fire" ? 0.012 : 0.02),
    chordLength * (style === "fire" ? 0.16 : 0.24)
  );
  const radialBow = clamp(
    (chordLength * 0.12 + transferTurns * 1.15) * personality.radialBowMultiplier,
    2,
    chordLength * (style === "fire" ? 0.22 : 0.42)
  );
  const burnPlanarBow = clamp(
    Math.max(lateralBow, radialBow * burnPreviewRadialToPlanarBowRatio),
    chordLength * burnPreviewMinimumPlanarBowRatio,
    chordLength * burnPreviewMaximumPlanarBowRatio
  );
  // BURN bow is strictly perpendicular to the endpoint chord. Its envelope therefore cannot
  // reverse along-route progress or create a terminal hairpin; the Z-axis curve remains readable
  // without borrowing displacement from the longitudinal axis.
  const readableBow =
    style === "burn"
      ? sideDirection.clone().multiplyScalar(burnPlanarBow)
      : radialDirection
          .clone()
          .multiplyScalar(radialBow)
          .addScaledVector(sideDirection, lateralBow);
  const computedHeight =
    chordLength * (0.085 + clamp((transferTurns - 1) / 8, 0, 1.4) * 0.035) + transferTurns * 1.9;
  const requestedHeight = profile?.visualArcHeight ?? computedHeight;
  const height = clamp(
    THREE.MathUtils.lerp(computedHeight, requestedHeight, 0.5) *
      personality.heightMultiplier *
      burnTransferVerticalHeightScale,
    style === "fire" ? 3.2 : 3,
    Math.max(style === "fire" ? 5 : 4, chordLength * (style === "fire" ? 0.28 : 0.46))
  );
  const firstControl = start.clone().addScaledVector(enforcedStartTangent, directProgressDistance);
  const secondControl = end.clone().addScaledVector(enforcedEndTangent, -directProgressDistance);
  const sampleCount = Math.round(clamp(42 + transferTurns * 4 + chordLength * 0.1, 48, 96));
  const points: THREE.Vector3[] = [];

  for (let index = 0; index < sampleCount; index += 1) {
    const progress = sampleCount <= 1 ? 0 : index / (sampleCount - 1);
    const bowEnvelope = getTransferPreviewBowEnvelope(progress, style);
    points.push(
      sampleCubicBezier3(start, firstControl, secondControl, end, progress)
        .addScaledVector(readableBow, bowEnvelope)
        .addScaledVector(mapPlaneUp, height * bowEnvelope)
    );
  }

  points[0] = start.clone();
  points[points.length - 1] = end.clone();
  return points;
}

function getTransferPreviewBowEnvelope(progress: number, style: TransferPreviewStyle): number {
  const clampedProgress = clamp(progress, 0, 1);
  const sineEnvelope = Math.sin(Math.PI * clampedProgress);

  if (sineEnvelope <= 0) {
    return 0;
  }

  if (style === "fire") {
    return sineEnvelope ** firePreviewMidspanBowPower;
  }

  // The extra smoothstep has a zero slope at both orbital contacts. The bow can still rise
  // decisively at mid-course without pulling either endpoint across its node orbit.
  return sineEnvelope ** burnPreviewMidspanBowPower * smoothStep(0, 1, sineEnvelope);
}

function softenImpossibleBurnPreviewTurns(points: readonly THREE.Vector3[]): THREE.Vector3[] {
  if (points.length < 4) {
    return points.map((point) => point.clone());
  }

  let softened = points.map((point) => point.clone());

  for (let pass = 0; pass < burnPreviewTurnSofteningPassCount; pass += 1) {
    const nextPoints = softened.map((point) => point.clone());

    for (let index = 1; index < softened.length - 1; index += 1) {
      if (
        index <= burnPreviewEndpointTangentPreservePointCount ||
        index >= softened.length - 1 - burnPreviewEndpointTangentPreservePointCount
      ) {
        continue;
      }

      const progress = index / Math.max(1, softened.length - 1);
      const endpointWeight = 1 - smoothStep(0.07, 0.22, Math.min(progress, 1 - progress));
      const localTurnLimit = THREE.MathUtils.lerp(
        burnPreviewSharpTurnLimitRadians,
        burnPreviewEndpointSharpTurnLimitRadians,
        endpointWeight
      );
      const turn = getTrajectoryTurnRadiansAt(softened, index);

      if (turn <= localTurnLimit) {
        continue;
      }

      const previous = softened[index - 1];
      const current = softened[index];
      const next = softened[index + 1];

      if (previous === undefined || current === undefined || next === undefined) {
        continue;
      }

      const smoothingTarget = previous.clone().lerp(next, 0.5);
      const smoothingStrength =
        clamp((turn - localTurnLimit) / Math.max(0.001, Math.PI - localTurnLimit), 0, 1) *
        THREE.MathUtils.lerp(0.34, 0.58, endpointWeight);
      nextPoints[index] = current.clone().lerp(smoothingTarget, smoothingStrength);
    }

    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];

    if (firstPoint !== undefined) {
      nextPoints[0] = firstPoint.clone();
    }

    if (lastPoint !== undefined) {
      nextPoints[nextPoints.length - 1] = lastPoint.clone();
    }

    softened = nextPoints;
  }

  return softened;
}

function enforceBurnPreviewEndpointOrbitClearance(
  points: readonly THREE.Vector3[],
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData
): THREE.Vector3[] {
  if (points.length < 3) {
    return points.map((point) => point.clone());
  }

  const adjustedPoints = points.map((point) => point.clone());
  const endpointPointCount = Math.min(
    adjustedPoints.length - 1,
    Math.max(4, Math.ceil((adjustedPoints.length - 1) * burnPreviewEndpointOrbitClearanceSpan))
  );

  // Launch-origin previews already include a short orbital departure arc and a tangent Bézier
  // bridge. Reapplying the generic rail guard over that composite segment creates a zoom-sized
  // hook, so only bare origins need this additional departure clearance.
  if (origin.departureOrbit === undefined) {
    enforceBurnPreviewEndpointOrbitClearanceWindow(
      adjustedPoints,
      getBurnPreviewEndpointOrbitClearance(origin),
      0,
      endpointPointCount,
      1
    );
  }
  enforceBurnPreviewEndpointOrbitClearanceWindow(
    adjustedPoints,
    getBurnPreviewEndpointOrbitClearance(destination),
    adjustedPoints.length - 1,
    adjustedPoints.length - 1 - endpointPointCount,
    -1
  );

  return adjustedPoints;
}

function getBurnPreviewEndpointOrbitClearance(
  nodeRenderData: DisplayNodeRenderData
): Readonly<{ center: THREE.Vector3; radius: number }> {
  const orbit = nodeRenderData.departureOrbit;
  return {
    center: (orbit?.center ?? nodeRenderData.center).clone(),
    radius: Math.max(0.001, orbit?.radius ?? nodeRenderData.ringRadius)
  };
}

function enforceBurnPreviewEndpointOrbitClearanceWindow(
  points: THREE.Vector3[],
  clearance: Readonly<{ center: THREE.Vector3; radius: number }>,
  anchorIndex: number,
  boundaryIndex: number,
  direction: -1 | 1
): void {
  const padding = clamp(
    clearance.radius * burnPreviewOrbitClearancePaddingRatio,
    burnPreviewOrbitClearanceMinimumPadding,
    burnPreviewOrbitClearanceMaximumPadding
  );

  for (
    let index = anchorIndex + direction;
    direction > 0 ? index <= boundaryIndex : index >= boundaryIndex;
    index += direction
  ) {
    const point = points[index];
    const anchoredPoint = points[index - direction];

    if (point === undefined || anchoredPoint === undefined) {
      continue;
    }

    pushPlanarPointOutsideOrbit(point, clearance, clearance.radius + padding);
    const segmentStart = direction > 0 ? anchoredPoint : point;
    const segmentEnd = direction > 0 ? point : anchoredPoint;

    if (
      getPlanarSegmentDistanceToPoint(clearance.center, segmentStart, segmentEnd) < clearance.radius
    ) {
      pushPlanarPointOutsideOrbit(
        point,
        clearance,
        getBurnPreviewOrbitSegmentClearanceDistance(clearance, segmentStart, segmentEnd, padding)
      );
    }
  }
}

function getBurnPreviewOrbitSegmentClearanceDistance(
  clearance: Readonly<{ center: THREE.Vector3; radius: number }>,
  first: THREE.Vector3,
  second: THREE.Vector3,
  padding: number
): number {
  const firstAngle = getPlanarAngle(first.clone().sub(clearance.center));
  const secondAngle = getPlanarAngle(second.clone().sub(clearance.center));
  const angleDifference = Math.abs(
    normalizePositiveAngle(secondAngle - firstAngle + Math.PI) - Math.PI
  );
  const cosine = Math.max(0.12, Math.cos(Math.min(angleDifference, Math.PI * 0.46)));
  return clearance.radius / cosine + padding;
}

function pushPlanarPointOutsideOrbit(
  point: THREE.Vector3,
  clearance: Readonly<{ center: THREE.Vector3; radius: number }>,
  requiredDistance: number
): void {
  const offsetX = point.x - clearance.center.x;
  const offsetZ = point.z - clearance.center.z;
  const planarDistance = Math.hypot(offsetX, offsetZ);

  if (planarDistance >= requiredDistance) {
    return;
  }

  const fallbackAngle = getPlanarAngle(point.clone().sub(clearance.center));
  const directionX = planarDistance <= 0.0001 ? Math.cos(fallbackAngle) : offsetX / planarDistance;
  const directionZ = planarDistance <= 0.0001 ? Math.sin(fallbackAngle) : offsetZ / planarDistance;
  point.x = clearance.center.x + directionX * requiredDistance;
  point.z = clearance.center.z + directionZ * requiredDistance;
}

function getPlanarSegmentDistanceToPoint(
  point: THREE.Vector3,
  start: THREE.Vector3,
  end: THREE.Vector3
): number {
  const segmentX = end.x - start.x;
  const segmentZ = end.z - start.z;
  const segmentLengthSq = segmentX * segmentX + segmentZ * segmentZ;

  if (segmentLengthSq <= 0.0001) {
    return Math.hypot(start.x - point.x, start.z - point.z);
  }

  const progress = clamp(
    ((point.x - start.x) * segmentX + (point.z - start.z) * segmentZ) / segmentLengthSq,
    0,
    1
  );
  return Math.hypot(
    start.x + segmentX * progress - point.x,
    start.z + segmentZ * progress - point.z
  );
}

function createContinuousDepartureTransferPoints(
  origin: DisplayNodeRenderData,
  transferPoints: readonly THREE.Vector3[]
): THREE.Vector3[] {
  const transferStart = transferPoints[0];
  const transferNext = transferPoints[1];

  if (origin.departureOrbit !== undefined) {
    return createOrbitalDepartureTransferPoints(origin, transferPoints);
  }

  if (
    transferStart === undefined ||
    transferNext === undefined ||
    origin.departureDirection === undefined
  ) {
    return Array.from(transferPoints, (point) => point.clone());
  }

  const start = origin.center.clone();
  const end = transferStart.clone();
  const distance = start.distanceTo(end);

  if (distance <= 0.001) {
    return Array.from(transferPoints, (point) => point.clone());
  }

  const startDirection = origin.departureDirection.clone().normalize();
  const endDirection = transferNext.clone().sub(transferStart);

  if (endDirection.lengthSq() <= 0.0001) {
    endDirection.copy(end).sub(start);
  }

  endDirection.normalize();
  const controlDistance = clamp(distance * 0.72, distance * 0.38, distance * 1.15);
  const firstControl = start.clone().addScaledVector(startDirection, controlDistance);
  const secondControl = end.clone().addScaledVector(endDirection, -controlDistance * 0.58);
  const sampleCount = Math.max(8, Math.ceil(clamp(distance * 0.18, 8, 18)));
  const departurePoints: THREE.Vector3[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const t = index / sampleCount;
    departurePoints.push(sampleCubicBezier3(start, firstControl, secondControl, end, t));
  }

  departurePoints[0] = start;
  departurePoints[departurePoints.length - 1] = end;
  return [...departurePoints, ...transferPoints.slice(1).map((point) => point.clone())];
}

function createOrbitalDepartureTransferPoints(
  origin: DisplayNodeRenderData,
  transferPoints: readonly THREE.Vector3[]
): THREE.Vector3[] {
  const departureOrbit = origin.departureOrbit;
  const transferStart = transferPoints[0];
  const transferNext = transferPoints[1];

  if (departureOrbit === undefined || transferStart === undefined || transferNext === undefined) {
    return Array.from(transferPoints, (point) => point.clone());
  }

  const start = origin.center.clone();
  const signedArcToTarget = resolveNodeOrbitArcForDirection(
    departureOrbit.startAngle,
    departureOrbit.targetAngle,
    departureOrbit.direction
  );
  const arcMagnitude = Math.abs(signedArcToTarget);
  const exitArcMagnitude = clamp(
    arcMagnitude * 0.58,
    Math.min(arcMagnitude, Math.PI * 0.08),
    Math.min(Math.max(arcMagnitude, Math.PI * 0.08), Math.PI * 0.46)
  );
  const exitArc =
    exitArcMagnitude *
    (signedArcToTarget < 0 || (signedArcToTarget === 0 && departureOrbit.direction < 0) ? -1 : 1);
  const orbitPointCount = Math.max(3, Math.ceil(exitArcMagnitude / (Math.PI / 26)));
  const orbitPoints: THREE.Vector3[] = [];

  for (let index = 0; index <= orbitPointCount; index += 1) {
    const progress = index / orbitPointCount;
    const angle = departureOrbit.startAngle + exitArc * progress;
    orbitPoints.push(
      departureOrbit.center
        .clone()
        .add(
          new THREE.Vector3(
            Math.cos(angle) * departureOrbit.radius,
            departureOrbit.heightOffset,
            Math.sin(angle) * departureOrbit.radius
          )
        )
    );
  }

  orbitPoints[0] = start;
  const orbitExit = orbitPoints[orbitPoints.length - 1] ?? start;
  const bridgeDistance = orbitExit.distanceTo(transferStart);

  if (bridgeDistance <= 0.001) {
    orbitPoints[orbitPoints.length - 1] = transferStart.clone();
    return [...orbitPoints, ...transferPoints.slice(1).map((point) => point.clone())];
  }

  const exitAngle = departureOrbit.startAngle + exitArc;
  const exitDirection = getLocalOrbitTangent(exitAngle, departureOrbit.direction);
  const transferDirection = transferNext.clone().sub(transferStart);

  if (transferDirection.lengthSq() <= 0.0001) {
    transferDirection.copy(transferStart).sub(orbitExit);
  }

  transferDirection.normalize();
  const controlDistance = clamp(bridgeDistance * 0.54, bridgeDistance * 0.22, bridgeDistance * 0.9);
  const firstControl = orbitExit.clone().addScaledVector(exitDirection, controlDistance);
  const secondControl = transferStart.clone().addScaledVector(transferDirection, -controlDistance);
  const bridgeSampleCount = Math.max(8, Math.ceil(clamp(bridgeDistance * 0.16, 8, 22)));
  const bridgePoints: THREE.Vector3[] = [];

  for (let index = 0; index <= bridgeSampleCount; index += 1) {
    const progress = index / bridgeSampleCount;
    bridgePoints.push(
      sampleCubicBezier3(orbitExit, firstControl, secondControl, transferStart, progress)
    );
  }

  bridgePoints[0] = orbitExit.clone();
  bridgePoints[bridgePoints.length - 1] = transferStart.clone();
  return [
    ...orbitPoints,
    ...bridgePoints.slice(1),
    ...transferPoints.slice(1).map((point) => point.clone())
  ];
}

export function sampleCubicBezier3(
  first: THREE.Vector3,
  second: THREE.Vector3,
  third: THREE.Vector3,
  fourth: THREE.Vector3,
  progress: number
): THREE.Vector3 {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  return first
    .clone()
    .multiplyScalar(inverse ** 3)
    .addScaledVector(second, 3 * inverse * inverse * t)
    .addScaledVector(third, 3 * inverse * t * t)
    .addScaledVector(fourth, t ** 3);
}

export function sampleCubicBezierTangent3(
  first: THREE.Vector3,
  second: THREE.Vector3,
  third: THREE.Vector3,
  fourth: THREE.Vector3,
  progress: number
): THREE.Vector3 {
  const t = clamp(progress, 0, 1);
  const inverse = 1 - t;
  return second
    .clone()
    .sub(first)
    .multiplyScalar(3 * inverse * inverse)
    .add(
      third
        .clone()
        .sub(second)
        .multiplyScalar(6 * inverse * t)
    )
    .add(
      fourth
        .clone()
        .sub(third)
        .multiplyScalar(3 * t * t)
    );
}

export function applyActiveBurnBodyClearance(
  points: readonly THREE.Vector3[],
  bodies: readonly ActiveBurnBodyClearance[]
): THREE.Vector3[] {
  if (points.length < 3 || bodies.length === 0) {
    return points.map((point) => point.clone());
  }

  return points.map((point, index) => {
    if (index === 0 || index === points.length - 1) {
      return point.clone();
    }

    return getActiveBurnBodyClearancePoint(point, bodies);
  });
}

function getActiveBurnBodyClearancePoint(
  point: THREE.Vector3,
  bodies: readonly ActiveBurnBodyClearance[]
): THREE.Vector3 {
  const adjusted = point.clone();

  for (const body of bodies) {
    const clearanceRadius =
      body.radius * activeBurnBodyClearanceMultiplier + activeBurnBodyClearancePadding;
    const offsetX = adjusted.x - body.position.x;
    const offsetZ = adjusted.z - body.position.z;
    const planarDistance = Math.hypot(offsetX, offsetZ);

    if (planarDistance >= clearanceRadius) {
      continue;
    }

    const fallbackDirection = hashBodySeed(body.bodyId) * Math.PI * 2;
    const directionX =
      planarDistance <= 0.001 ? Math.cos(fallbackDirection) : offsetX / planarDistance;
    const directionZ =
      planarDistance <= 0.001 ? Math.sin(fallbackDirection) : offsetZ / planarDistance;
    const clearanceProgress = 1 - planarDistance / Math.max(0.001, clearanceRadius);
    adjusted.x = body.position.x + directionX * clearanceRadius;
    adjusted.z = body.position.z + directionZ * clearanceRadius;
    adjusted.y = Math.max(
      adjusted.y,
      body.position.y +
        body.radius * activeBurnBodyClearanceVerticalLiftMultiplier * clearanceProgress
    );
  }

  return adjusted;
}

export function buildActiveBurnFlightPath(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  currentTurn: number,
  etaTurns: number,
  arrivalAngle: number,
  profile?: TransferVisualProfile,
  clearanceBodies: readonly ActiveBurnBodyClearance[] = [],
  transferArcDirection?: -1 | 1
): ActiveBurnFlightPath {
  const arcDirection =
    transferArcDirection ??
    getTransferArcDirection(origin, destination, currentTurn, etaTurns, profile);
  const transferPoints = applyActiveBurnBodyClearance(
    buildZoomStableBurnPreviewTrajectory(
      origin,
      destination,
      currentTurn,
      etaTurns,
      profile,
      arcDirection,
      { includeDepartureContinuity: true, lockArcBranch: true, style: "burn" }
    ),
    clearanceBodies
  );
  const transferEnd = transferPoints[transferPoints.length - 1];

  if (transferEnd === undefined) {
    return {
      transferPoints,
      insertionPoints: [],
      insertionStart: 1
    };
  }

  const insertionAngle = getPlanarAngle(transferEnd.clone().sub(destination.center));
  const incomingTangent = getPolylineEndTangent(transferPoints);
  const insertionDirection = chooseNodeOrbitDirectionFromIncomingTangent(
    destination.center,
    transferEnd,
    incomingTangent
  );
  const insertionPoints = applyActiveBurnBodyClearance(
    createNodeOrbitInsertionArcPoints(
      destination.center,
      transferEnd,
      insertionAngle,
      arrivalAngle,
      insertionDirection,
      destination.ringRadius * 1.13,
      activeBurnNodeOrbitHeightOffset
    ),
    clearanceBodies
  );
  const transferLength = measurePolylineLength(transferPoints);
  const insertionLength = measurePolylineLength(insertionPoints);
  const insertionStart =
    insertionLength <= 0
      ? 1
      : clamp(transferLength / Math.max(0.001, transferLength + insertionLength), 0, 1);

  return {
    transferPoints,
    insertionPoints,
    insertionStart
  };
}

function getTransferPreviewPersonality(
  profile: TransferVisualProfile | undefined,
  style: TransferPreviewStyle
): Readonly<{
  radialBowMultiplier: number;
  heightMultiplier: number;
  lateralBend: number;
}> {
  let radialBowMultiplier = style === "fire" ? 0.78 : 1.22;
  let heightMultiplier = style === "fire" ? 0.88 : 1.28;
  let lateralBend = style === "fire" ? 0.014 : 0.024;

  switch (profile?.visualArcType) {
    case "local-hop":
      radialBowMultiplier *= 0.72;
      heightMultiplier *= style === "fire" ? 0.86 : 0.78;
      lateralBend *= 0.52;
      break;
    case "clean-window":
      radialBowMultiplier *= 0.86;
      heightMultiplier *= 0.86;
      lateralBend *= 0.72;
      break;
    case "strained-window":
      radialBowMultiplier *= style === "fire" ? 1.04 : 1.3;
      heightMultiplier *= style === "fire" ? 1.04 : 1.28;
      lateralBend *= style === "fire" ? 1.18 : 1.72;
      break;
    case "cross-map":
      radialBowMultiplier *= style === "fire" ? 0.9 : 1.26;
      heightMultiplier *= style === "fire" ? 1.06 : 1.34;
      lateralBend *= style === "fire" ? 1.1 : 1.48;
      break;
    case "strategic-arc":
    default:
      break;
  }

  if (profile?.transferWindowQuality === "favorable") {
    radialBowMultiplier *= 0.9;
    heightMultiplier *= 0.88;
    lateralBend *= 0.74;
  } else if (profile?.transferWindowQuality === "unfavorable") {
    radialBowMultiplier *= 1.08;
    heightMultiplier *= 1.08;
    lateralBend *= 1.22;
  }

  if (profile?.motionRelation === "moving-away") {
    lateralBend *= 1.16;
  } else if (profile?.motionRelation === "moving-toward") {
    lateralBend *= 0.84;
  }

  return {
    radialBowMultiplier,
    heightMultiplier,
    lateralBend
  };
}

function getTransferArcGeometry(
  origin: DisplayNodeRenderData,
  destination: DisplayNodeRenderData,
  currentTurn: number,
  etaTurns: number
): Readonly<{ arcDirection: -1 | 1; centerArc: number; transferTurns: number }> {
  const originArcReference =
    origin.departureOrbit?.transferAnchor ??
    (origin.departureDirection === undefined
      ? origin.center
      : origin.center.clone().addScaledVector(origin.departureDirection, origin.ringRadius));
  return getTransferArcGeometryFromPositions(
    originArcReference,
    destination.center,
    currentTurn,
    etaTurns,
    destination.snapshot.turn
  );
}

function getTransferArcGeometryFromPositions(
  originPosition: THREE.Vector3,
  destinationPosition: THREE.Vector3,
  currentTurn: number,
  etaTurns: number,
  destinationTurn: number
): Readonly<{ arcDirection: -1 | 1; centerArc: number; transferTurns: number }> {
  const centerStartAngle = getPlanarAngle(originPosition);
  const centerEndAngle = getPlanarAngle(destinationPosition);
  const centerStartRadius = Math.max(1, getPlanarRadius(originPosition));
  const centerEndRadius = Math.max(1, getPlanarRadius(destinationPosition));
  const transferTurns = Math.max(1, etaTurns, destinationTurn - currentTurn);
  const centerArc = chooseLambertLiteArc(
    centerStartAngle,
    centerEndAngle,
    transferTurns,
    centerStartRadius,
    centerEndRadius
  );
  return {
    arcDirection: centerArc < 0 ? -1 : 1,
    centerArc,
    transferTurns
  };
}

export function buildMissileTrajectoryPreview(
  origin: DisplayNodeRenderData,
  target: DisplayNodeRenderData,
  currentTurn: number,
  etaTurns: number,
  profile?: TransferVisualProfile,
  options: TransferPreviewOptions = {}
): THREE.Vector3[] {
  const weaponProfile: TransferVisualProfile = {
    transferCategory: profile?.transferCategory ?? "intersystem",
    transferWindowQuality:
      profile?.transferWindowQuality === "favorable"
        ? "neutral"
        : (profile?.transferWindowQuality ?? "neutral"),
    motionRelation: profile?.motionRelation ?? "neutral",
    visualArcType:
      profile?.visualArcType === "local-hop"
        ? "strained-window"
        : (profile?.visualArcType ?? "strategic-arc"),
    visualArcHeight: (profile?.visualArcHeight ?? 18) * missileTrajectoryBaseHeightScale
  };
  const arcDirection = getTransferArcDirection(
    origin,
    target,
    currentTurn,
    etaTurns,
    weaponProfile
  );
  const points = buildZoomStableBurnPreviewTrajectory(
    origin,
    target,
    currentTurn,
    etaTurns,
    weaponProfile,
    arcDirection,
    options.includeDepartureContinuity === undefined
      ? { style: "fire" }
      : { includeDepartureContinuity: options.includeDepartureContinuity, style: "fire" }
  );
  const distance = getPlanarDistance(origin.center, target.center);
  const liftedPoints = points.map((point, index) => {
    const progress = points.length <= 1 ? 0 : index / (points.length - 1);
    const smoothMissileApex = Math.sin(Math.PI * progress) ** missilePreviewLiftPower;
    const supportingArc = Math.sin(Math.PI * progress) ** missilePreviewSupportingLiftPower;
    const mortarLift =
      (smoothMissileApex * Math.max(20, distance * 0.086) +
        supportingArc * Math.max(4.5, distance * 0.018) +
        smoothMissileApex * etaTurns * 1.35) *
      missileTrajectoryExtraLiftScale;
    return point.clone().setY(point.y + mortarLift);
  });

  return appendMissileTerminalIngressPoints(liftedPoints, target.center);
}

function appendMissileTerminalIngressPoints(
  points: readonly THREE.Vector3[],
  impactPoint: THREE.Vector3
): THREE.Vector3[] {
  const terminalStart = points[points.length - 1];
  const terminalPrevious = points[points.length - 2];

  if (terminalStart === undefined || terminalPrevious === undefined) {
    return Array.from(points);
  }

  const distance = terminalStart.distanceTo(impactPoint);

  if (distance <= 0.001) {
    return Array.from(points);
  }

  const startDirection = terminalStart.clone().sub(terminalPrevious);
  const endDirection = impactPoint.clone().sub(terminalStart);

  if (startDirection.lengthSq() <= 0.0001 || endDirection.lengthSq() <= 0.0001) {
    return [...points, impactPoint.clone()];
  }

  startDirection.normalize();
  endDirection.normalize();
  const controlDistance = clamp(distance * 0.42, distance * 0.18, distance * 0.68);
  const firstControl = terminalStart.clone().addScaledVector(startDirection, controlDistance);
  const secondControl = impactPoint.clone().addScaledVector(endDirection, -controlDistance);
  const sampleCount = Math.max(7, Math.ceil(clamp(distance * 0.12, 7, 16)));
  const terminalPoints: THREE.Vector3[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    terminalPoints.push(
      sampleCubicBezier3(
        terminalStart,
        firstControl,
        secondControl,
        impactPoint,
        index / sampleCount
      )
    );
  }

  terminalPoints[0] = terminalStart.clone();
  terminalPoints[terminalPoints.length - 1] = impactPoint.clone();
  return [...points, ...terminalPoints.slice(1)];
}

function getNodeOrbitTangentPoint(
  nodeRenderData: DisplayNodeRenderData,
  arcDirection: -1 | 1
): THREE.Vector3 {
  if (nodeRenderData.departureOrbit !== undefined) {
    return nodeRenderData.departureOrbit.transferAnchor.clone();
  }

  if (
    nodeRenderData.departureDirection !== undefined &&
    nodeRenderData.departureDirection.lengthSq() > 0.0001
  ) {
    const point = nodeRenderData.center
      .clone()
      .addScaledVector(
        nodeRenderData.departureDirection.clone().normalize(),
        nodeRenderData.ringRadius
      );
    point.y = nodeRenderData.center.y;
    return point;
  }

  const tangent = getHeliocentricTangent(
    getStableHeliocentricNodeAngle(nodeRenderData),
    arcDirection
  );
  const point = nodeRenderData.center
    .clone()
    .addScaledVector(getNodeOrbitRadialForTangent(tangent), nodeRenderData.ringRadius);
  point.y = nodeRenderData.center.y;
  return point;
}

function getStableHeliocentricNodeAngle(nodeRenderData: DisplayNodeRenderData): number {
  const position = nodeRenderData.node.position;

  if (Math.hypot(position.x, position.y) > 0.0001) {
    return Math.atan2(position.y, position.x);
  }

  return getPlanarAngle(nodeRenderData.center);
}

function getHeliocentricTangent(angle: number, arcDirection: -1 | 1): THREE.Vector3 {
  return new THREE.Vector3(-Math.sin(angle) * arcDirection, 0, Math.cos(angle) * arcDirection);
}

function getNodeOrbitRadialForTangent(tangent: THREE.Vector3): THREE.Vector3 {
  const radial = new THREE.Vector3(tangent.z, 0, -tangent.x);

  if (radial.lengthSq() <= 0.0001) {
    return new THREE.Vector3(1, 0, 0);
  }

  return radial.normalize();
}

function chooseLambertLiteArc(
  startAngle: number,
  endAngle: number,
  etaTurns: number,
  startRadius: number,
  endRadius: number
): number {
  const progradeArc = normalizePositiveAngle(endAngle - startAngle);
  const retrogradeArc = progradeArc - Math.PI * 2;
  const radialRatio =
    Math.abs(endRadius - startRadius) / Math.max(1, (startRadius + endRadius) / 2);
  const etaRatio = clamp((etaTurns - 1) / 8, 0, 1);
  const retrogradeIsMuchCleaner =
    Math.abs(retrogradeArc) < progradeArc * (0.72 - etaRatio * 0.18 + radialRatio * 0.08);

  if (retrogradeIsMuchCleaner && etaTurns <= 4 + radialRatio * 3) {
    return retrogradeArc;
  }

  if (progradeArc < 0.035 && etaTurns > 5) {
    return Math.PI * 2;
  }

  return progradeArc;
}

function normalizePositiveAngle(angle: number): number {
  const fullTurn = Math.PI * 2;
  return ((angle % fullTurn) + fullTurn) % fullTurn;
}

function chooseShortestNodeOrbitDirection(fromAngle: number, toAngle: number): -1 | 1 {
  const positiveArc = normalizePositiveAngle(toAngle - fromAngle);
  const negativeArc = positiveArc - Math.PI * 2;
  return Math.abs(positiveArc) <= Math.abs(negativeArc) ? 1 : -1;
}

function chooseNodeOrbitDirectionFromIncomingTangent(
  center: THREE.Vector3,
  transferEnd: THREE.Vector3,
  incomingTangent: THREE.Vector3
): -1 | 1 {
  const planarIncoming = new THREE.Vector3(incomingTangent.x, 0, incomingTangent.z);

  if (planarIncoming.lengthSq() <= 0.0001) {
    return 1;
  }

  planarIncoming.normalize();
  const localOffset = transferEnd.clone().sub(center);
  localOffset.y = 0;

  if (localOffset.lengthSq() <= 0.0001) {
    return 1;
  }

  const insertionAngle = Math.atan2(localOffset.z, localOffset.x);
  const counterClockwise = getLocalOrbitTangent(insertionAngle, 1);
  const clockwise = getLocalOrbitTangent(insertionAngle, -1);
  return counterClockwise.dot(planarIncoming) >= clockwise.dot(planarIncoming) ? 1 : -1;
}

function getPolylineEndTangent(points: readonly THREE.Vector3[]): THREE.Vector3 {
  for (let index = points.length - 1; index > 0; index -= 1) {
    const current = points[index];
    const previous = points[index - 1];

    if (current === undefined || previous === undefined) {
      continue;
    }

    const tangent = current.clone().sub(previous);

    if (tangent.lengthSq() > 0.0001) {
      return tangent.normalize();
    }
  }

  return new THREE.Vector3(1, 0, 0);
}

function resolveNodeOrbitArcForDirection(
  fromAngle: number,
  toAngle: number,
  direction: -1 | 1
): number {
  return direction > 0
    ? normalizePositiveAngle(toAngle - fromAngle)
    : -normalizePositiveAngle(fromAngle - toAngle);
}

function getLocalOrbitTangent(angle: number, direction: -1 | 1): THREE.Vector3 {
  return new THREE.Vector3(
    -Math.sin(angle) * direction,
    0,
    Math.cos(angle) * direction
  ).normalize();
}

function getPlanarAngle(point: THREE.Vector3): number {
  return Math.atan2(point.z, point.x);
}

function getPlanarRadius(point: THREE.Vector3): number {
  return Math.hypot(point.x, point.z);
}

export function getPlanarDistance(first: THREE.Vector3, second: THREE.Vector3): number {
  return Math.hypot(second.x - first.x, second.z - first.z);
}

export function slicePolylineFromProgress(
  points: readonly THREE.Vector3[],
  progress: number
): THREE.Vector3[] {
  const distance = measurePolylineLength(points);
  return slicePolylineByDistance(points, distance * clamp(progress, 0, 1), distance);
}

export function sliceActiveBurnFlightPathFromProgress(
  flightPath: ActiveBurnFlightPath,
  progress: number
): THREE.Vector3[] {
  if (progress < flightPath.insertionStart) {
    const transferPoints = slicePolylineFromProgress(
      flightPath.transferPoints,
      getActiveBurnTransferProgress(progress, flightPath.insertionStart)
    );

    if (transferPoints.length === 0) {
      return Array.from(flightPath.insertionPoints, (point) => point.clone());
    }

    return [
      ...transferPoints,
      ...flightPath.insertionPoints.slice(1).map((point) => point.clone())
    ];
  }

  const localProgress =
    (progress - flightPath.insertionStart) / Math.max(0.001, 1 - flightPath.insertionStart);
  return slicePolylineFromProgress(flightPath.insertionPoints, clamp(localProgress, 0, 1));
}

export function getActiveBurnFlightPathDistanceProgress(
  flightPath: ActiveBurnFlightPath,
  progress: number
): number {
  const transferDistance = measurePolylineLength(flightPath.transferPoints);
  const insertionDistance = measurePolylineLength(flightPath.insertionPoints);
  const totalDistance = transferDistance + insertionDistance;

  if (totalDistance <= 0.001) {
    return 1;
  }

  if (progress < flightPath.insertionStart) {
    const transferProgress = getActiveBurnTransferProgress(progress, flightPath.insertionStart);
    return clamp((transferDistance * transferProgress) / totalDistance, 0, 1);
  }

  const insertionProgress = clamp(
    (progress - flightPath.insertionStart) / Math.max(0.001, 1 - flightPath.insertionStart),
    0,
    1
  );
  return clamp((transferDistance + insertionDistance * insertionProgress) / totalDistance, 0, 1);
}

export function getBurnTrajectoryPresentationVisibleStartProgress(
  flightPathVisibleStartProgress: number,
  flightPathDistance: number,
  presentationDistance: number
): number {
  return clamp(
    (clamp(flightPathVisibleStartProgress, 0, 1) * Math.max(0, flightPathDistance)) /
      Math.max(0.001, presentationDistance),
    0,
    1
  );
}

export function slicePolylineByDistance(
  points: readonly THREE.Vector3[],
  startDistance: number,
  endDistance: number
): THREE.Vector3[] {
  if (points.length < 2 || endDistance <= startDistance) {
    return [];
  }

  const distance = measurePolylineLength(points);
  const start = clamp(startDistance, 0, distance);
  const end = clamp(endDistance, start, distance);
  const slicedPoints: THREE.Vector3[] = [samplePolylineAtDistance(points, start).position];
  let traveled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const segmentLength = previous.distanceTo(current);
    const nextTraveled = traveled + segmentLength;

    if (nextTraveled > start && nextTraveled < end) {
      slicedPoints.push(current.clone());
    }

    traveled = nextTraveled;
  }

  slicedPoints.push(samplePolylineAtDistance(points, end).position);
  return slicedPoints;
}

function getActiveBurnTransferProgress(progress: number, completionProgress = 1): number {
  return clamp(progress / Math.max(0.001, completionProgress), 0, 1);
}

export function sampleActiveBurnPhysicalMotion(
  flightPath: ActiveBurnFlightPath,
  progress: number
): { position: THREE.Vector3; direction: THREE.Vector3 } {
  if (progress < flightPath.insertionStart) {
    return samplePolylineAtProgress(
      flightPath.transferPoints,
      getActiveBurnTransferProgress(progress, flightPath.insertionStart)
    );
  }

  const localProgress =
    (progress - flightPath.insertionStart) / Math.max(0.001, 1 - flightPath.insertionStart);
  return samplePolylineAtProgress(flightPath.insertionPoints, clamp(localProgress, 0, 1));
}

function createNodeOrbitInsertionArcPoints(
  center: THREE.Vector3,
  transferEnd: THREE.Vector3,
  fromAngle: number,
  toAngle: number,
  direction: -1 | 1,
  finalRadius: number,
  finalHeightOffset: number
): THREE.Vector3[] {
  const signedArc =
    direction < 0
      ? -normalizePositiveAngle(fromAngle - toAngle)
      : normalizePositiveAngle(toAngle - fromAngle);
  const sampleCount = Math.max(10, Math.ceil(Math.abs(signedArc) / (Math.PI / 18)));
  const startOffset = transferEnd.clone().sub(center);
  const startRadius = Math.max(0.001, Math.hypot(startOffset.x, startOffset.z));
  const startHeightOffset = startOffset.y;
  const points: THREE.Vector3[] = [];

  for (let index = 0; index <= sampleCount; index += 1) {
    const progress = index / sampleCount;
    const easedProgress = smoothStep(0, 1, progress);
    const angle = fromAngle + signedArc * progress;
    const radius = THREE.MathUtils.lerp(startRadius, finalRadius, easedProgress);
    const heightOffset = THREE.MathUtils.lerp(startHeightOffset, finalHeightOffset, easedProgress);
    points.push(
      center
        .clone()
        .add(new THREE.Vector3(Math.cos(angle) * radius, heightOffset, Math.sin(angle) * radius))
    );
  }

  points[0] = transferEnd.clone();
  points[points.length - 1] = center
    .clone()
    .add(
      new THREE.Vector3(
        Math.cos(toAngle) * finalRadius,
        finalHeightOffset,
        Math.sin(toAngle) * finalRadius
      )
    );
  return points;
}

export function samplePolylineAtProgress(
  points: readonly THREE.Vector3[],
  progress: number
): { position: THREE.Vector3; direction: THREE.Vector3 } {
  return samplePolylineAtDistance(points, measurePolylineLength(points) * clamp(progress, 0, 1));
}

function samplePolylineAtDistance(
  points: readonly THREE.Vector3[],
  targetDistance: number
): { position: THREE.Vector3; direction: THREE.Vector3 } {
  const first = points[0];

  if (first === undefined) {
    return {
      position: new THREE.Vector3(),
      direction: new THREE.Vector3(1, 0, 0)
    };
  }

  if (points.length === 1) {
    return {
      position: first.clone(),
      direction: new THREE.Vector3(1, 0, 0)
    };
  }

  const target = clamp(targetDistance, 0, measurePolylineLength(points));
  let traveled = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    const segmentLength = previous.distanceTo(current);

    if (segmentLength <= 0.0001) {
      continue;
    }

    const nextTraveled = traveled + segmentLength;

    if (target <= nextTraveled) {
      const segmentProgress = (target - traveled) / segmentLength;

      return {
        position: previous.clone().lerp(current, segmentProgress),
        direction: getSafeDirection(previous, current)
      };
    }

    traveled = nextTraveled;
  }

  const previous = points[points.length - 2] ?? first;
  const last = points[points.length - 1] ?? first;
  return {
    position: last.clone(),
    direction: getSafeDirection(previous, last)
  };
}

export function getSafeDirection(from: THREE.Vector3, to: THREE.Vector3): THREE.Vector3 {
  const direction = to.clone().sub(from);

  if (direction.lengthSq() <= 0.0001) {
    return new THREE.Vector3(1, 0, 0);
  }

  return direction.normalize();
}

export function measurePolylineLength(points: readonly THREE.Vector3[]): number {
  let length = 0;

  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];

    if (previous === undefined || current === undefined) {
      continue;
    }

    length += previous.distanceTo(current);
  }

  return Math.max(1, length);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function smoothStep(edge0: number, edge1: number, value: number): number {
  if (edge0 === edge1) {
    return value < edge0 ? 0 : 1;
  }

  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function hashBodySeed(id: string): number {
  let hash = 0;

  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) % 997;
  }

  return 0.2 + hash / 997;
}
