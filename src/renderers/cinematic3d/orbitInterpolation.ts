import type {
  ActiveBurnTransit,
  ActiveMissile,
  BodySnapshot,
  FactionId,
  NodeOccupancy,
  NodeSnapshot,
  SolarSystemSnapshot,
  TurnDebugEvent,
  Vec2
} from "../../core";

const fullTurnRadians = Math.PI * 2;
export const missileImpactVisualProgress = 0.965;
export const contestedUpkeepImpactVisualProgress = 0.08;
export const replayOrderLaunchVisualProgress = 0.18;
export const replayWorkVisualProgress = 0.58;
export const replayMandatoryLaunchVisualProgress = 0.72;
export const replayMissileDefenseVisualProgress = 0.78;
export const replayBurnArrivalVisualProgress = 0.9;

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

export function getMissileDefenseInterceptionFlightProgress(
  missile: Pick<ActiveMissile, "issuedTurn" | "missileEtaTurns">,
  fromTurn: number,
  toTurn: number
): number {
  const defenseVisualTurn = fromTurn + (toTurn - fromTurn) * replayMissileDefenseVisualProgress;
  return alignMissileFlightProgressToImpactPresentation(
    missile,
    fromTurn,
    toTurn,
    defenseVisualTurn
  );
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

/**
 * Builds the state used by fixed-speed time review.
 *
 * The ordinary turn animation intentionally holds and anticipates a few objects to make the live
 * resolution readable. Time review has a different contract: sampling the same timeline position
 * must always produce the same complete world state, regardless of whether the user reached it by
 * rewinding or replaying. Keep this reconstruction renderer-side so presentation timing never
 * becomes gameplay state.
 */
export function createReversibleReplaySnapshot(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number
): SolarSystemSnapshot {
  const stateProgress = clamp(progress, 0, 1);
  const orbitalSnapshot = createOrbitalTransitionSnapshot(from, to, stateProgress);

  if (stateProgress >= 1) {
    return {
      ...to,
      bodies: orbitalSnapshot.bodies,
      nodes: to.nodes.map((node) => {
        return {
          ...node,
          position:
            orbitalSnapshot.nodes.find((candidate) => candidate.id === node.id)?.position ??
            node.position
        };
      })
    };
  }

  const departures = getReplayDepartures(from, to);
  const pendingBurnOrders =
    stateProgress < replayOrderLaunchVisualProgress ? from.pendingBurnOrders : [];
  const pendingFireOrders =
    stateProgress < replayOrderLaunchVisualProgress ? from.pendingFireOrders : [];
  const activeBurnTransits = getReversibleReplayActiveBurnTransits(
    from,
    to,
    stateProgress,
    departures
  );
  const activeMissiles = getReversibleReplayActiveMissiles(from, to, stateProgress);
  const nodeOccupancies = getReversibleReplayNodeOccupancies(from, to, stateProgress, departures);
  const shipyardProgress =
    stateProgress < replayWorkVisualProgress ? from.shipyardProgress : to.shipyardProgress;
  const mandatoryLaunches = getReversibleReplayMandatoryLaunches(
    from,
    to,
    stateProgress,
    departures
  );
  const debugEvents = to.debugEvents.filter((event) => {
    return stateProgress >= getReplayEventVisualProgress(event, from, to);
  });
  const nodes = getReversibleReplayNodes({
    from,
    to,
    orbitalNodes: orbitalSnapshot.nodes,
    nodeOccupancies,
    shipyardProgress,
    pendingBurnOrders,
    pendingFireOrders,
    progress: stateProgress
  });

  return {
    ...orbitalSnapshot,
    turn: from.turn + (to.turn - from.turn) * stateProgress,
    factionDv: getReversibleReplayFactionDv(from, to, stateProgress),
    nodes,
    nodeOccupancies,
    shipyardProgress,
    mandatoryLaunches,
    pendingBurnOrders,
    pendingFireOrders,
    activeBurnTransits,
    activeMissiles,
    debugEvents
  };
}

export function getReplayEventVisualProgress(
  event: TurnDebugEvent,
  from?: SolarSystemSnapshot,
  to?: SolarSystemSnapshot
): number {
  if (
    event.type === "CONTESTED_UPKEEP_PAID" ||
    event.type === "CONTESTED_UPKEEP_FAILED" ||
    (event.type === "SHIP_DESTROYED" &&
      event.nodeId !== undefined &&
      event.factionId !== undefined &&
      to?.debugEvents.some((candidate) => {
        return (
          candidate.type === "CONTESTED_UPKEEP_FAILED" &&
          candidate.nodeId === event.nodeId &&
          candidate.factionId === event.factionId
        );
      }))
  ) {
    return contestedUpkeepImpactVisualProgress;
  }

  if (
    event.type === "TRITIUM_INCOME" ||
    event.type === "SHIPYARD_PROGRESS" ||
    event.type === "SHIP_PRODUCED" ||
    event.type === "SHIPYARD_PRODUCTION_CHECK" ||
    event.type === "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED"
  ) {
    return replayWorkVisualProgress;
  }

  if (event.type === "MANDATORY_LAUNCH") {
    return replayWorkVisualProgress;
  }

  if (
    event.type === "EVADE" ||
    event.type === "EVADE_BLOCKED" ||
    event.type === "MISSILE_SOLUTION_BROKEN"
  ) {
    return replayMissileDefenseVisualProgress;
  }

  if (
    event.type === "MISSILE_IMPACT" ||
    event.type === "MISSILE_MISSED" ||
    event.type === "WRECK_FIELD_CREATED" ||
    (event.type === "SHIP_DESTROYED" &&
      event.nodeId !== undefined &&
      event.factionId !== undefined &&
      to?.debugEvents.some((candidate) => {
        return (
          candidate.type === "MISSILE_IMPACT" &&
          candidate.nodeId === event.nodeId &&
          candidate.factionId === event.factionId
        );
      }))
  ) {
    return missileImpactVisualProgress;
  }

  if (event.type === "BURN_DEPARTED") {
    const isSameTurnProducedMandatoryLaunch =
      event.mandatoryLaunchId !== undefined &&
      !from?.pendingBurnOrders.some((order) => {
        return order.mandatoryLaunchId === event.mandatoryLaunchId;
      });
    return isSameTurnProducedMandatoryLaunch
      ? replayMandatoryLaunchVisualProgress
      : replayOrderLaunchVisualProgress;
  }

  if (event.type === "FIRE_LAUNCHED" || event.type === "BURN_FAILED") {
    return replayOrderLaunchVisualProgress;
  }

  if (event.type === "MANDATORY_LAUNCH_DESTROYED") {
    return replayMandatoryLaunchVisualProgress;
  }

  return replayOrderLaunchVisualProgress;
}

type ReplayDeparture = Readonly<{
  transit: ActiveBurnTransit;
  phase: number;
}>;

function getReplayDepartures(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot
): readonly ReplayDeparture[] {
  const departures = getTransitionDepartingBurnTransits(from, to).map((transit) => {
    const isSameTurnProducedMandatoryLaunch =
      transit.mandatoryLaunchId !== undefined &&
      !from.pendingBurnOrders.some((order) => order.id === transit.id);
    return {
      transit,
      phase: isSameTurnProducedMandatoryLaunch
        ? replayMandatoryLaunchVisualProgress
        : replayOrderLaunchVisualProgress
    };
  });
  const matchedEventKeys = new Set(
    departures.map(({ transit }) => {
      return createReplayBurnMatchKey(
        transit.originNodeId,
        transit.destinationNodeId,
        transit.factionId
      );
    })
  );

  for (const [eventIndex, event] of to.debugEvents.entries()) {
    if (
      event.type !== "BURN_DEPARTED" ||
      event.nodeId === undefined ||
      event.destinationNodeId === undefined ||
      event.factionId === undefined
    ) {
      continue;
    }

    const matchKey = createReplayBurnMatchKey(
      event.nodeId,
      event.destinationNodeId,
      event.factionId
    );

    if (matchedEventKeys.has(matchKey)) {
      continue;
    }

    matchedEventKeys.add(matchKey);
    const originNode = from.nodes.find((node) => node.id === event.nodeId);
    const destinationNode = to.nodes.find((node) => node.id === event.destinationNodeId);
    const etaTurns = Math.max(1, event.etaTurns ?? 1);
    const transit: ActiveBurnTransit = {
      id:
        event.mandatoryLaunchId ??
        `replay-burn:${to.turn}:${event.factionId}:${event.nodeId}:${event.destinationNodeId}:${eventIndex}`,
      originNodeId: event.nodeId,
      destinationNodeId: event.destinationNodeId,
      burnCost: Math.max(0, event.burnCost ?? 0),
      etaTurns,
      issuedTurn: from.turn,
      departedTurn: from.turn,
      arrivalTurn: from.turn + etaTurns,
      originPosition: originNode?.position ?? { x: 0, y: 0 },
      destinationPositionAtArrival: destinationNode?.position ?? { x: 0, y: 0 },
      factionId: event.factionId,
      shipCount: 1,
      ...(event.mandatoryLaunchId === undefined
        ? {}
        : { mandatoryLaunchId: event.mandatoryLaunchId })
    };
    departures.push({
      transit,
      phase:
        event.mandatoryLaunchId === undefined
          ? replayOrderLaunchVisualProgress
          : replayMandatoryLaunchVisualProgress
    });
  }

  return departures;
}

function createReplayBurnMatchKey(
  originNodeId: string,
  destinationNodeId: string,
  factionId: FactionId
): string {
  return `${originNodeId}:${destinationNodeId}:${factionId}`;
}

function getReversibleReplayActiveBurnTransits(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number,
  departures: readonly ReplayDeparture[]
): readonly ActiveBurnTransit[] {
  const transits = new Map(from.activeBurnTransits.map((transit) => [transit.id, transit]));

  for (const transit of to.activeBurnTransits) {
    if (transits.has(transit.id)) {
      transits.set(transit.id, transit);
    }
  }

  for (const departure of departures) {
    if (progress >= departure.phase) {
      transits.set(departure.transit.id, departure.transit);
    }
  }

  if (progress >= replayBurnArrivalVisualProgress) {
    for (const [id, transit] of transits) {
      if (transit.arrivalTurn <= to.turn) {
        transits.delete(id);
      }
    }
  }

  return [...transits.values()];
}

function getReversibleReplayActiveMissiles(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number
): readonly ActiveMissile[] {
  const missiles = new Map(from.activeMissiles.map((missile) => [missile.id, missile]));
  const fromIds = new Set(missiles.keys());

  // Start the physical launch at the beginning of the turn, as Execute does. The committed FIRE
  // order can remain visible until its resolution cue while the missile drifts from the launcher.
  for (const missile of to.activeMissiles) {
    if (!fromIds.has(missile.id)) {
      missiles.set(missile.id, missile);
    }
  }

  for (const missile of from.activeMissiles) {
    if (to.activeMissiles.some((candidate) => candidate.id === missile.id)) {
      continue;
    }

    const hasUpkeepTargetLoss = to.debugEvents.some((event) => {
      return (
        event.type === "CONTESTED_UPKEEP_FAILED" &&
        event.nodeId === missile.targetNodeId &&
        event.factionId === missile.targetFactionId
      );
    });
    const hasDefenseResolution = to.debugEvents.some((event) => {
      return (
        (event.type === "EVADE" || event.type === "MISSILE_SOLUTION_BROKEN") &&
        event.nodeId === missile.targetNodeId &&
        event.factionId === missile.targetFactionId &&
        (event.missileId === undefined || event.missileId === missile.id)
      );
    });
    const resolutionProgress = hasUpkeepTargetLoss
      ? contestedUpkeepImpactVisualProgress
      : hasDefenseResolution
        ? replayMissileDefenseVisualProgress
        : missileImpactVisualProgress;

    if (progress >= resolutionProgress) {
      missiles.delete(missile.id);
    }
  }

  return [...missiles.values()];
}

function getReversibleReplayNodeOccupancies(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number,
  departures: readonly ReplayDeparture[]
): readonly NodeOccupancy[] {
  let occupancies = [...from.nodeOccupancies];

  if (progress >= contestedUpkeepImpactVisualProgress) {
    for (const event of to.debugEvents) {
      if (
        event.type !== "CONTESTED_UPKEEP_FAILED" ||
        event.nodeId === undefined ||
        event.factionId === undefined
      ) {
        continue;
      }

      occupancies = setOccupancyForReplay(occupancies, event.nodeId, event.factionId, 0);
    }
  }

  for (const departure of departures) {
    if (progress < departure.phase) {
      continue;
    }

    occupancies = adjustOccupancyForPresentation(
      occupancies,
      departure.transit.originNodeId,
      departure.transit.factionId,
      -departure.transit.shipCount
    );
  }

  if (progress >= replayWorkVisualProgress) {
    for (const event of to.debugEvents) {
      if (
        event.type !== "SHIP_PRODUCED" ||
        event.nodeId === undefined ||
        event.factionId === undefined
      ) {
        continue;
      }

      occupancies = adjustOccupancyForPresentation(occupancies, event.nodeId, event.factionId, 1);
    }
  }

  if (progress >= replayBurnArrivalVisualProgress) {
    const arrivals = new Map<string, ActiveBurnTransit>();

    for (const transit of from.activeBurnTransits) {
      if (transit.arrivalTurn <= to.turn) {
        arrivals.set(transit.id, transit);
      }
    }

    for (const departure of departures) {
      if (departure.phase <= progress && departure.transit.arrivalTurn <= to.turn) {
        arrivals.set(departure.transit.id, departure.transit);
      }
    }

    for (const transit of arrivals.values()) {
      occupancies = adjustOccupancyForPresentation(
        occupancies,
        transit.destinationNodeId,
        transit.factionId,
        transit.shipCount
      );
    }
  }

  if (progress >= missileImpactVisualProgress) {
    for (const event of to.debugEvents) {
      if (
        event.type !== "MISSILE_IMPACT" ||
        event.nodeId === undefined ||
        event.factionId === undefined
      ) {
        continue;
      }

      occupancies = adjustOccupancyForPresentation(occupancies, event.nodeId, event.factionId, -1);
    }
  }

  if (progress >= replayMandatoryLaunchVisualProgress) {
    for (const event of to.debugEvents) {
      if (
        event.type !== "MANDATORY_LAUNCH_DESTROYED" ||
        event.nodeId === undefined ||
        event.factionId === undefined
      ) {
        continue;
      }

      const toCount =
        to.nodeOccupancies.find((occupancy) => {
          return occupancy.nodeId === event.nodeId && occupancy.factionId === event.factionId;
        })?.shipCount ?? 0;
      occupancies = setOccupancyForReplay(occupancies, event.nodeId, event.factionId, toCount);
    }
  }

  return normalizeReplayOccupancies(occupancies);
}

function getReversibleReplayMandatoryLaunches(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number,
  departures: readonly ReplayDeparture[]
): SolarSystemSnapshot["mandatoryLaunches"] {
  const launches = new Map(from.mandatoryLaunches.map((launch) => [launch.id, launch]));

  for (const departure of departures) {
    const mandatoryLaunchId = departure.transit.mandatoryLaunchId;

    if (progress >= departure.phase && mandatoryLaunchId !== undefined) {
      launches.delete(mandatoryLaunchId);
    }
  }

  if (progress >= replayWorkVisualProgress) {
    for (const launch of to.mandatoryLaunches) {
      launches.set(launch.id, launch);
    }
  }

  if (progress >= replayMandatoryLaunchVisualProgress) {
    const destroyedIds = new Set(
      to.debugEvents
        .filter((event) => event.type === "MANDATORY_LAUNCH_DESTROYED")
        .map((event) => event.mandatoryLaunchId)
        .filter((id): id is string => id !== undefined)
    );

    for (const id of destroyedIds) {
      launches.delete(id);
    }
  }

  return [...launches.values()];
}

function getReversibleReplayFactionDv(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  progress: number
): SolarSystemSnapshot["factionDv"] {
  const reserves: Record<string, number> = { ...from.factionDv };

  for (const event of to.debugEvents) {
    if (event.factionId === undefined || progress < getReplayEventVisualProgress(event, from, to)) {
      continue;
    }

    let delta = 0;

    if (event.type === "CONTESTED_UPKEEP_PAID" || event.type === "EVADE") {
      delta = event.amount ?? 0;
    } else if (event.type === "TRITIUM_INCOME") {
      delta = event.amount ?? 0;
    } else if (event.type === "BURN_DEPARTED") {
      delta = -Math.max(0, event.burnCost ?? 0);
    }

    reserves[event.factionId] = Math.max(0, (reserves[event.factionId] ?? 0) + delta);
  }

  return reserves;
}

function getReversibleReplayNodes(
  context: Readonly<{
    from: SolarSystemSnapshot;
    to: SolarSystemSnapshot;
    orbitalNodes: SolarSystemSnapshot["nodes"];
    nodeOccupancies: readonly NodeOccupancy[];
    shipyardProgress: SolarSystemSnapshot["shipyardProgress"];
    pendingBurnOrders: SolarSystemSnapshot["pendingBurnOrders"];
    pendingFireOrders: SolarSystemSnapshot["pendingFireOrders"];
    progress: number;
  }>
): readonly NodeSnapshot[] {
  const positions = new Map(context.orbitalNodes.map((node) => [node.id, node.position]));
  const pendingWorkKeys = new Set(
    [...context.pendingBurnOrders, ...context.pendingFireOrders].map((order) => {
      return `${order.originNodeId}:${order.factionId}`;
    })
  );

  return context.to.nodes.map((toNode) => {
    const fromNode = context.from.nodes.find((node) => node.id === toNode.id);
    const occupancies = context.nodeOccupancies.filter((occupancy) => {
      return occupancy.nodeId === toNode.id && occupancy.shipCount > 0;
    });
    const contestedFactionIds = [...new Set(occupancies.map((occupancy) => occupancy.factionId))];
    const isContested = contestedFactionIds.length > 1;
    const progressEntry = context.shipyardProgress.find((entry) => entry.nodeId === toNode.id);
    const workingOccupancy = occupancies.find((occupancy) => {
      return (
        (toNode.type === "tritium" || toNode.type === "shipyard") &&
        !isContested &&
        !pendingWorkKeys.has(`${toNode.id}:${occupancy.factionId}`)
      );
    });
    const stableNode =
      context.progress < replayWorkVisualProgress && fromNode !== undefined ? fromNode : toNode;
    const stableNodeWithoutOptionalState = { ...stableNode };
    delete stableNodeWithoutOptionalState.shipyardWorkerFactionId;
    delete stableNodeWithoutOptionalState.workingFactionId;

    return {
      ...stableNodeWithoutOptionalState,
      position: positions.get(toNode.id) ?? toNode.position,
      shipyardProgress: progressEntry?.progress ?? 0,
      ...(progressEntry?.workerFactionId === undefined
        ? {}
        : { shipyardWorkerFactionId: progressEntry.workerFactionId }),
      isWorking: workingOccupancy !== undefined,
      ...(workingOccupancy === undefined ? {} : { workingFactionId: workingOccupancy.factionId }),
      isContested,
      contestedFactionIds
    };
  });
}

function setOccupancyForReplay(
  occupancies: readonly NodeOccupancy[],
  nodeId: string,
  factionId: FactionId,
  shipCount: number
): NodeOccupancy[] {
  const filtered = occupancies.filter((occupancy) => {
    return occupancy.nodeId !== nodeId || occupancy.factionId !== factionId;
  });

  if (shipCount <= 0) {
    return filtered;
  }

  return [...filtered, { nodeId, factionId, shipCount }];
}

function normalizeReplayOccupancies(
  occupancies: readonly NodeOccupancy[]
): readonly NodeOccupancy[] {
  return occupancies
    .filter((occupancy) => occupancy.shipCount > 0)
    .sort((first, second) => {
      if (first.nodeId !== second.nodeId) {
        return first.nodeId.localeCompare(second.nodeId);
      }

      return first.factionId.localeCompare(second.factionId);
    });
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

  if (progress < contestedUpkeepImpactVisualProgress) {
    const restoredContestedTargetKeys = new Set<string>();

    for (const event of to.debugEvents) {
      if (
        event.type !== "SHIP_DESTROYED" ||
        event.nodeId === undefined ||
        event.factionId === undefined
      ) {
        continue;
      }

      const targetKey = `${event.nodeId}:${event.factionId}`;
      const isContestedUpkeepFailure = to.debugEvents.some((candidate) => {
        return (
          candidate.type === "CONTESTED_UPKEEP_FAILED" &&
          candidate.nodeId === event.nodeId &&
          candidate.factionId === event.factionId
        );
      });
      const isMandatoryLaunchFailure =
        event.mandatoryLaunchId !== undefined ||
        to.debugEvents.some((candidate) => {
          return (
            candidate.type === "MANDATORY_LAUNCH_DESTROYED" &&
            candidate.nodeId === event.nodeId &&
            candidate.factionId === event.factionId
          );
        });

      if (
        !isContestedUpkeepFailure ||
        isMandatoryLaunchFailure ||
        restoredContestedTargetKeys.has(targetKey)
      ) {
        continue;
      }

      restoredContestedTargetKeys.add(targetKey);
      const fromOccupancy = from.nodeOccupancies.find((occupancy) => {
        return occupancy.nodeId === event.nodeId && occupancy.factionId === event.factionId;
      });

      if (fromOccupancy === undefined) {
        continue;
      }

      const toShipCount =
        occupancies.find((occupancy) => {
          return occupancy.nodeId === event.nodeId && occupancy.factionId === event.factionId;
        })?.shipCount ?? 0;
      const missingPresentationShips = fromOccupancy.shipCount - toShipCount;

      if (missingPresentationShips > 0) {
        occupancies = adjustOccupancyForPresentation(
          occupancies,
          event.nodeId,
          event.factionId,
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
  const missileDestroyedArrivalKeys =
    progress < missileImpactVisualProgress
      ? new Set<string>()
      : new Set(
          to.debugEvents
            .filter((event) => {
              return (
                event.type === "SHIP_DESTROYED" &&
                event.nodeId !== undefined &&
                event.factionId !== undefined &&
                to.debugEvents.some((candidate) => {
                  return (
                    candidate.type === "MISSILE_IMPACT" &&
                    candidate.nodeId === event.nodeId &&
                    candidate.factionId === event.factionId
                  );
                })
              );
            })
            .map((event) => `${event.nodeId}:${event.factionId}`)
        );

  for (const transit of to.activeBurnTransits) {
    transitsById.set(transit.id, transit);
  }

  for (const transit of from.activeBurnTransits) {
    if (transit.arrivalTurn > to.turn || transitsById.has(transit.id)) {
      continue;
    }

    if (missileDestroyedArrivalKeys.has(`${transit.destinationNodeId}:${transit.factionId}`)) {
      continue;
    }

    transitsById.set(transit.id, transit);
  }

  for (const transit of getTransitionDepartingBurnTransits(from, to)) {
    if (transit.arrivalTurn <= to.turn && !transitsById.has(transit.id)) {
      if (missileDestroyedArrivalKeys.has(`${transit.destinationNodeId}:${transit.factionId}`)) {
        continue;
      }

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
