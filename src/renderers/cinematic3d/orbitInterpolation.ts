import type {
  ActiveBurnTransit,
  ActiveMissile,
  BodySnapshot,
  NodeOccupancy,
  SolarSystemSnapshot,
  Vec2
} from "../../core";

const fullTurnRadians = Math.PI * 2;
export const missileImpactVisualProgress = 0.965;

export function alignMissileFlightProgressToImpactPresentation(
  missile: Pick<ActiveMissile, "issuedTurn" | "missileEtaTurns">,
  fromTurn: number,
  toTurn: number,
  visualTurn: number
): number {
  const normalProgress = clamp(
    (visualTurn - missile.issuedTurn) / Math.max(1, missile.missileEtaTurns),
    0,
    1
  );
  const turnSpan = toTurn - fromTurn;

  if (turnSpan <= 0.001) {
    return normalProgress;
  }

  const transitionProgress = clamp((visualTurn - fromTurn) / turnSpan, 0, 1);
  const startProgress = clamp(
    (fromTurn - missile.issuedTurn) / Math.max(1, missile.missileEtaTurns),
    0,
    1
  );
  const impactProgress = clamp(transitionProgress / missileImpactVisualProgress, 0, 1);
  return startProgress + (1 - startProgress) * impactProgress;
}

export function createOrbitalTransitionSnapshot(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number,
  presentationStateProgress = progress
): SolarSystemSnapshot {
  const easedProgress = clamp(progress, 0, 1);
  const stateProgress = clamp(presentationStateProgress, 0, 1);
  const fromBodiesById = new Map(from.bodies.map((body) => [body.id, body]));
  const toBodiesById = new Map(to.bodies.map((body) => [body.id, body]));
  const interpolatedPositions = new Map<string, Vec2>();

  function computeInterpolatedPosition(bodyId: string): Vec2 {
    const existing = interpolatedPositions.get(bodyId);

    if (existing !== undefined) {
      return existing;
    }

    const toBody = toBodiesById.get(bodyId);
    const fromBody = fromBodiesById.get(bodyId);

    if (toBody === undefined) {
      throw new Error(`Cannot interpolate unknown body "${bodyId}".`);
    }

    if (fromBody === undefined || toBody.parentId === null) {
      const rootPosition =
        fromBody === undefined
          ? toBody.position
          : interpolateVec2(fromBody.position, toBody.position, easedProgress);
      interpolatedPositions.set(bodyId, rootPosition);
      return rootPosition;
    }

    const parentPosition = computeInterpolatedPosition(toBody.parentId);
    const angle = interpolateOrbitAngle(fromBody, toBody, from.turn, to.turn, easedProgress);
    const position = {
      x: parentPosition.x + Math.cos(angle) * toBody.orbitRadius,
      y: parentPosition.y + Math.sin(angle) * toBody.orbitRadius
    };
    interpolatedPositions.set(bodyId, position);
    return position;
  }

  const bodies = to.bodies.map((body): BodySnapshot => {
    return {
      ...body,
      position: computeInterpolatedPosition(body.id)
    };
  });
  const positionsByBodyId = new Map(bodies.map((body) => [body.id, body.position]));
  const nodes = to.nodes.map((node) => {
    return {
      ...node,
      position: positionsByBodyId.get(node.bodyId) ?? node.position
    };
  });

  return {
    turn: to.turn,
    ...(to.gameMode === undefined ? {} : { gameMode: to.gameMode }),
    ...(to.factions === undefined ? {} : { factions: to.factions }),
    factionDv: to.factionDv,
    bounds: to.bounds,
    bodies,
    nodes,
    nodeOccupancies: getInterpolatedNodeOccupancies(from, to, stateProgress),
    shipyardProgress: to.shipyardProgress,
    mandatoryLaunches: to.mandatoryLaunches,
    // `to` can already contain the AI plans for the following turn.  Showing those plans while
    // bodies are still interpolating from the previous turn makes their trajectory anchors pop
    // ahead for a frame, then snap back to the launch presentation.  Orders resolving this turn
    // are represented by the active BURN / missile transition instead; hold all new previews
    // until the visual turn has actually completed.
    pendingBurnOrders: getPresentationPendingBurnOrders(to, stateProgress),
    pendingFireOrders: getPresentationPendingFireOrders(to, stateProgress),
    activeBurnTransits: getPresentationActiveBurnTransits(from, to, stateProgress),
    activeMissiles: getPresentationActiveMissiles(from, to, stateProgress),
    debugEvents: to.debugEvents
  };
}

export function getTransitionDepartingBurnTransits(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot
): readonly ActiveBurnTransit[] {
  const previouslyActiveIds = new Set(from.activeBurnTransits.map((transit) => transit.id));
  const departingById = new Map<string, ActiveBurnTransit>();

  // AI planning happens inside advanceTurn(), so an AI order can be absent from
  // from.pendingBurnOrders and appear directly as an active transit in `to`.
  for (const transit of to.activeBurnTransits) {
    if (!previouslyActiveIds.has(transit.id)) {
      departingById.set(transit.id, transit);
    }
  }

  // Keep immediate arrivals in the launch presentation even though they never survive in
  // to.activeBurnTransits. Longer pre-planned orders are already covered by the loop above.
  for (const order of from.pendingBurnOrders) {
    if (order.arrivalTurn <= to.turn && !departingById.has(order.id)) {
      departingById.set(order.id, {
        ...order,
        departedTurn: from.turn
      });
    }
  }

  return [...departingById.values()];
}

export function getTransitionLaunchedMissiles(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot
): readonly ActiveMissile[] {
  const previouslyActiveIds = new Set(from.activeMissiles.map((missile) => missile.id));
  return to.activeMissiles.filter((missile) => !previouslyActiveIds.has(missile.id));
}

function getPresentationPendingBurnOrders(
  to: SolarSystemSnapshot,
  progress: number
): SolarSystemSnapshot["pendingBurnOrders"] {
  return progress >= 1 ? to.pendingBurnOrders : [];
}

function getPresentationPendingFireOrders(
  to: SolarSystemSnapshot,
  progress: number
): SolarSystemSnapshot["pendingFireOrders"] {
  return progress >= 1 ? to.pendingFireOrders : [];
}

function getInterpolatedNodeOccupancies(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number
): readonly NodeOccupancy[] {
  if (progress >= 1) {
    return to.nodeOccupancies;
  }

  let occupancies = [...to.nodeOccupancies];
  const restoredMissileTargetKeys = new Set<string>();

  if (progress < missileImpactVisualProgress) {
    for (const missile of from.activeMissiles) {
      if (missile.impactTurn > to.turn) {
        continue;
      }

      const targetKey = `${missile.targetNodeId}:${missile.targetFactionId}`;

      if (restoredMissileTargetKeys.has(targetKey)) {
        continue;
      }

      restoredMissileTargetKeys.add(targetKey);
      const fromOccupancy = from.nodeOccupancies.find((occupancy) => {
        return (
          occupancy.nodeId === missile.targetNodeId &&
          occupancy.factionId === missile.targetFactionId
        );
      });

      if (fromOccupancy === undefined) {
        continue;
      }

      const toShipCount =
        occupancies.find((occupancy) => {
          return (
            occupancy.nodeId === missile.targetNodeId &&
            occupancy.factionId === missile.targetFactionId
          );
        })?.shipCount ?? 0;
      const missingPresentationShips = fromOccupancy.shipCount - toShipCount;

      if (missingPresentationShips > 0) {
        occupancies = adjustOccupancyForPresentation(
          occupancies,
          missile.targetNodeId,
          missile.targetFactionId,
          missingPresentationShips
        );
      }
    }
  }

  for (const transit of from.activeBurnTransits) {
    if (transit.arrivalTurn > to.turn) {
      continue;
    }

    occupancies = adjustOccupancyForPresentation(
      occupancies,
      transit.destinationNodeId,
      transit.factionId,
      -transit.shipCount
    );
  }

  for (const order of from.pendingBurnOrders) {
    if (order.arrivalTurn > to.turn) {
      continue;
    }

    occupancies = adjustOccupancyForPresentation(
      occupancies,
      order.destinationNodeId,
      order.factionId,
      -order.shipCount
    );
  }

  return occupancies;
}

function getPresentationActiveBurnTransits(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number
): readonly ActiveBurnTransit[] {
  if (progress >= 1) {
    return to.activeBurnTransits;
  }

  const transitsById = new Map<string, ActiveBurnTransit>();

  for (const transit of to.activeBurnTransits) {
    transitsById.set(transit.id, transit);
  }

  for (const transit of from.activeBurnTransits) {
    if (transit.arrivalTurn > to.turn || transitsById.has(transit.id)) {
      continue;
    }

    transitsById.set(transit.id, transit);
  }

  for (const transit of getTransitionDepartingBurnTransits(from, to)) {
    if (transit.arrivalTurn <= to.turn && !transitsById.has(transit.id)) {
      transitsById.set(transit.id, transit);
    }
  }

  return [...transitsById.values()];
}

function getPresentationActiveMissiles(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number
): readonly ActiveMissile[] {
  if (progress >= missileImpactVisualProgress) {
    return to.activeMissiles;
  }

  const missileIds = new Set(to.activeMissiles.map((missile) => missile.id));
  const activeMissiles = [...to.activeMissiles];
  const evadedTargetKeys = new Set(
    to.debugEvents
      .filter(
        (event) =>
          (event.type === "EVADE" || event.type === "MISSILE_SOLUTION_BROKEN") &&
          event.nodeId !== undefined &&
          event.factionId !== undefined
      )
      .map((event) => `${event.nodeId}:${event.factionId}`)
  );

  for (const missile of from.activeMissiles) {
    const targetKey = `${missile.targetNodeId}:${missile.targetFactionId}`;

    if (evadedTargetKeys.has(targetKey)) {
      continue;
    }

    if (missile.impactTurn > to.turn || missileIds.has(missile.id)) {
      continue;
    }

    activeMissiles.push(missile);
    missileIds.add(missile.id);
  }

  return activeMissiles;
}

function adjustOccupancyForPresentation(
  occupancies: readonly NodeOccupancy[],
  nodeId: string,
  factionId: NodeOccupancy["factionId"],
  delta: number
): NodeOccupancy[] {
  const nextOccupancies: NodeOccupancy[] = [];
  let applied = false;

  for (const occupancy of occupancies) {
    if (occupancy.nodeId !== nodeId || occupancy.factionId !== factionId) {
      nextOccupancies.push(occupancy);
      continue;
    }

    applied = true;
    const shipCount = occupancy.shipCount + delta;

    if (shipCount > 0) {
      nextOccupancies.push({
        ...occupancy,
        shipCount
      });
    }
  }

  if (!applied && delta > 0) {
    nextOccupancies.push({
      nodeId,
      factionId,
      shipCount: delta
    });
  }

  return nextOccupancies;
}

export function interpolateOrbitAngle(
  fromBody: BodySnapshot,
  toBody: BodySnapshot,
  fromTurn: number,
  toTurn: number,
  progress: number
): number {
  const startAngle = computeOrbitAngleRadians(
    fromBody.initialAngle,
    fromBody.orbitPeriodTurns,
    fromTurn
  );
  const endAngle = computeOrbitAngleRadians(toBody.initialAngle, toBody.orbitPeriodTurns, toTurn);
  return startAngle + (endAngle - startAngle) * clamp(progress, 0, 1);
}

function computeOrbitAngleRadians(
  initialAngleDegrees: number,
  periodTurns: number,
  turn: number
): number {
  const initialAngle = (initialAngleDegrees / 180) * Math.PI;

  if (periodTurns === 0) {
    return initialAngle;
  }

  return initialAngle + (turn / periodTurns) * fullTurnRadians;
}

function interpolateVec2(from: Vec2, to: Vec2, progress: number): Vec2 {
  return {
    x: from.x + (to.x - from.x) * progress,
    y: from.y + (to.y - from.y) * progress
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
