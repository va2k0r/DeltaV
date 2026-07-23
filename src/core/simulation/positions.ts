import type {
  ActiveBurnTransit,
  ActiveMissile,
  BodySnapshot,
  Bounds,
  FactionIdentity,
  FactionDvReserve,
  GameModeId,
  MandatoryLaunch,
  NodeOccupancy,
  PendingFireOrder,
  SimulationContent,
  ShipyardProgress,
  SolarSystemSnapshot,
  TurnDebugEvent,
  Vec2
} from "../state/types";
import type { PendingBurnOrder } from "../state/types";
import {
  createDefaultFactionIdentities,
  createFactionDvReserve,
  defaultGameMode
} from "../state/factions";

const fullTurnRadians = Math.PI * 2;
const defaultFactions = createDefaultFactionIdentities(defaultGameMode);
const defaultFactionDv: FactionDvReserve = createFactionDvReserve(defaultFactions);
const tritiumOutput = 2;

export function computeBodyPosition(
  content: SimulationContent,
  bodyId: string,
  turn: number
): Vec2 {
  const body = content.bodies.find((candidate) => candidate.id === bodyId);

  if (body === undefined) {
    throw new Error(`Cannot compute position for unknown body "${bodyId}".`);
  }

  if (body.parentId === null) {
    return { x: 0, y: 0 };
  }

  const parentPosition = computeBodyPosition(content, body.parentId, turn);
  const angle = computeOrbitAngle(body.initialAngle, body.orbitPeriodTurns, turn);

  return {
    x: parentPosition.x + Math.cos(angle) * body.orbitRadius,
    y: parentPosition.y + Math.sin(angle) * body.orbitRadius
  };
}

export function computeOrbitAngle(
  initialAngleDegrees: number,
  periodTurns: number,
  turn: number
): number {
  const initialAngle = degreesToRadians(initialAngleDegrees);

  if (periodTurns === 0) {
    return initialAngle;
  }

  return initialAngle + (turn / periodTurns) * fullTurnRadians;
}

export function createSolarSystemSnapshot(
  content: SimulationContent,
  turnOrState:
    | number
    | Readonly<{
        turn: number;
        gameMode?: GameModeId;
        factions?: readonly FactionIdentity[];
        factionDv?: FactionDvReserve;
        nodeOccupancies?: readonly NodeOccupancy[];
        shipyardProgress?: readonly ShipyardProgress[];
        mandatoryLaunches?: readonly MandatoryLaunch[];
        pendingBurnOrders?: readonly PendingBurnOrder[];
        pendingFireOrders?: readonly PendingFireOrder[];
        activeBurnTransits?: readonly ActiveBurnTransit[];
        activeMissiles?: readonly ActiveMissile[];
        debugEvents?: readonly TurnDebugEvent[];
      }>
): SolarSystemSnapshot {
  const turn = typeof turnOrState === "number" ? turnOrState : turnOrState.turn;
  const gameMode =
    typeof turnOrState === "number" ? defaultGameMode : (turnOrState.gameMode ?? defaultGameMode);
  const factions =
    typeof turnOrState === "number"
      ? defaultFactions
      : (turnOrState.factions ?? createDefaultFactionIdentities(gameMode));
  const factionDv =
    typeof turnOrState === "number"
      ? defaultFactionDv
      : (turnOrState.factionDv ?? createFactionDvReserve(factions));
  const nodeOccupancies =
    typeof turnOrState === "number" ? [] : (turnOrState.nodeOccupancies ?? []);
  const shipyardProgress =
    typeof turnOrState === "number" ? [] : (turnOrState.shipyardProgress ?? []);
  const mandatoryLaunches =
    typeof turnOrState === "number" ? [] : (turnOrState.mandatoryLaunches ?? []);
  const pendingBurnOrders =
    typeof turnOrState === "number" ? [] : (turnOrState.pendingBurnOrders ?? []);
  const pendingFireOrders =
    typeof turnOrState === "number" ? [] : (turnOrState.pendingFireOrders ?? []);
  const activeBurnTransits =
    typeof turnOrState === "number" ? [] : (turnOrState.activeBurnTransits ?? []);
  const activeMissiles = typeof turnOrState === "number" ? [] : (turnOrState.activeMissiles ?? []);
  const debugEvents = typeof turnOrState === "number" ? [] : (turnOrState.debugEvents ?? []);
  const pendingWorkKeys = new Set(
    [...pendingBurnOrders, ...pendingFireOrders].map((order) =>
      createNodeFactionKey(order.originNodeId, order.factionId)
    )
  );
  const bodies = content.bodies.map((body): BodySnapshot => {
    return {
      id: body.id,
      name: body.name,
      kind: body.kind,
      parentId: body.parentId,
      position: computeBodyPosition(content, body.id, turn),
      orbitRadius: body.orbitRadius,
      orbitPeriodTurns: body.orbitPeriodTurns,
      initialAngle: body.initialAngle,
      visualRadius: body.visualRadius,
      visualClass: body.visualClass
    };
  });
  const bodiesById = new Map(bodies.map((body) => [body.id, body]));
  const nodes = content.nodes.map((node) => {
    const body = bodiesById.get(node.bodyId);
    const contestedFactionIds = getContestingFactionIds(nodeOccupancies, node.id);
    const isContested = contestedFactionIds.length > 1;

    if (body === undefined) {
      throw new Error(
        `Cannot create snapshot for node "${node.id}" with unknown body "${node.bodyId}".`
      );
    }

    const workingOccupancy = nodeOccupancies.find((occupancy) => {
      return (
        occupancy.nodeId === node.id &&
        occupancy.shipCount > 0 &&
        (node.type === "tritium" || node.type === "shipyard") &&
        !isContested &&
        !pendingWorkKeys.has(createNodeFactionKey(node.id, occupancy.factionId))
      );
    });
    const shipyardProgressEntry = shipyardProgress.find((entry) => entry.nodeId === node.id);

    return {
      id: node.id,
      bodyId: node.bodyId,
      label: body.name,
      type: node.type,
      position: body.position,
      nodeOrbitRadius: node.nodeOrbitRadius,
      controllable: node.controllable,
      contestable: node.contestable,
      protectedNoWar: node.protectedNoWar,
      weaponsOffline: node.weaponsOffline,
      producesTritium: node.producesTritium,
      allowsShipyard: node.allowsShipyard,
      gravityWell: node.gravityWell,
      tritiumOutput: node.type === "tritium" ? tritiumOutput : 0,
      shipyardProgress: shipyardProgressEntry?.progress ?? 0,
      ...(shipyardProgressEntry?.workerFactionId === undefined
        ? {}
        : { shipyardWorkerFactionId: shipyardProgressEntry.workerFactionId }),
      isWorking: workingOccupancy !== undefined,
      ...(workingOccupancy === undefined ? {} : { workingFactionId: workingOccupancy.factionId }),
      isContested,
      contestedFactionIds
    };
  });

  return {
    turn,
    gameMode,
    factions,
    factionDv,
    bodies,
    nodes,
    nodeOccupancies,
    shipyardProgress,
    mandatoryLaunches,
    pendingBurnOrders,
    pendingFireOrders,
    activeBurnTransits,
    activeMissiles,
    debugEvents,
    bounds: computeSnapshotBounds(bodies)
  };
}

function createNodeFactionKey(nodeId: string, factionId: string): string {
  return `${nodeId}:${factionId}`;
}

function getContestingFactionIds(
  occupancies: readonly NodeOccupancy[],
  nodeId: string
): readonly NodeOccupancy["factionId"][] {
  const factionIds: NodeOccupancy["factionId"][] = [];

  for (const occupancy of occupancies) {
    if (
      occupancy.nodeId === nodeId &&
      occupancy.shipCount > 0 &&
      !factionIds.includes(occupancy.factionId)
    ) {
      factionIds.push(occupancy.factionId);
    }
  }

  return factionIds;
}

function computeSnapshotBounds(bodies: readonly BodySnapshot[]): Bounds {
  if (bodies.length === 0) {
    return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  }

  const firstBody = bodies[0];

  if (firstBody === undefined) {
    return { minX: -1, minY: -1, maxX: 1, maxY: 1 };
  }

  let minX = firstBody.position.x - firstBody.visualRadius;
  let minY = firstBody.position.y - firstBody.visualRadius;
  let maxX = firstBody.position.x + firstBody.visualRadius;
  let maxY = firstBody.position.y + firstBody.visualRadius;

  for (const body of bodies) {
    const radius = body.orbitRadius + body.visualRadius;

    if (body.parentId === null) {
      minX = Math.min(minX, body.position.x - body.visualRadius);
      minY = Math.min(minY, body.position.y - body.visualRadius);
      maxX = Math.max(maxX, body.position.x + body.visualRadius);
      maxY = Math.max(maxY, body.position.y + body.visualRadius);
      continue;
    }

    minX = Math.min(minX, body.position.x - body.visualRadius, -radius);
    minY = Math.min(minY, body.position.y - body.visualRadius, -radius);
    maxX = Math.max(maxX, body.position.x + body.visualRadius, radius);
    maxY = Math.max(maxY, body.position.y + body.visualRadius, radius);
  }

  const padding = 64;

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding
  };
}

function degreesToRadians(degrees: number): number {
  return (degrees / 180) * Math.PI;
}
