import type { ActiveMissile, GameState, SimulationContent } from "./state/types";
import { createDefaultFactionIdentities } from "./state/factions";
import { calculateFirePlan, createInitialGameState } from "./simulation/gameState";

export type DebugMissileImpactTMinusOneScenario = Readonly<{
  state: GameState;
  missileId: string;
  originNodeId: string;
  targetNodeId: string;
  targetFactionId: "opponent";
}>;

export type DebugEvadeTMinusOneScenario = Readonly<{
  state: GameState;
  missileId: string;
  originNodeId: string;
  targetNodeId: string;
  targetFactionId: "player";
}>;

const debugMissileImpactRouteCandidates: readonly Readonly<{
  originNodeId: string;
  targetNodeId: string;
}>[] = [
  { originNodeId: "deimos_node", targetNodeId: "venus_node" },
  { originNodeId: "mars_node", targetNodeId: "venus_node" },
  { originNodeId: "jupiter_node", targetNodeId: "venus_node" }
];

const debugEvadeRouteCandidates: typeof debugMissileImpactRouteCandidates = [
  { originNodeId: "deimos_node", targetNodeId: "jupiter_node" },
  { originNodeId: "mars_node", targetNodeId: "jupiter_node" },
  ...debugMissileImpactRouteCandidates
];

export function createMissileImpactTMinusOneDebugScenario(
  content: SimulationContent
): DebugMissileImpactTMinusOneScenario {
  return createTMinusOneDebugScenario(content, {
    missileId: "debug-missile-t-minus-one-impact",
    firingFactionId: "player",
    targetFactionId: "opponent",
    targetFactionDv: 0,
    reason: "debug-missile-impact-t-minus-one",
    routeCandidates: debugMissileImpactRouteCandidates
  });
}

export function createEvadeTMinusOneDebugScenario(
  content: SimulationContent
): DebugEvadeTMinusOneScenario {
  return createTMinusOneDebugScenario(content, {
    missileId: "debug-missile-t-minus-one-evade",
    firingFactionId: "opponent",
    targetFactionId: "player",
    targetFactionDv: 10,
    reason: "debug-evade-t-minus-one",
    routeCandidates: debugEvadeRouteCandidates,
    freezeFiringFactionPlanning: true
  });
}

function createTMinusOneDebugScenario<
  TFiringFactionId extends "player" | "opponent",
  TTargetFactionId extends "player" | "opponent"
>(
  content: SimulationContent,
  options: Readonly<{
    missileId: string;
    firingFactionId: TFiringFactionId;
    targetFactionId: TTargetFactionId;
    targetFactionDv: number;
    reason: string;
    routeCandidates: typeof debugMissileImpactRouteCandidates;
    freezeFiringFactionPlanning?: boolean;
  }>
): Readonly<{
  state: GameState;
  missileId: string;
  originNodeId: string;
  targetNodeId: string;
  targetFactionId: TTargetFactionId;
}> {
  const availableNodeIds = new Set(content.nodes.map((node) => node.id));
  const factions = createDefaultFactionIdentities("2p").map((faction) => {
    if (options.freezeFiringFactionPlanning === true && faction.id === options.firingFactionId) {
      return { ...faction, controlType: "human" as const };
    }

    return faction;
  });

  for (const candidate of options.routeCandidates) {
    if (
      !availableNodeIds.has(candidate.originNodeId) ||
      !availableNodeIds.has(candidate.targetNodeId)
    ) {
      continue;
    }

    const planningState = createInitialGameState({
      turn: 0,
      gameMode: "2p",
      factions,
      factionDv: {
        player: options.targetFactionId === "player" ? options.targetFactionDv : 10,
        opponent: options.targetFactionId === "opponent" ? options.targetFactionDv : 10
      },
      nodeOccupancies: [
        {
          nodeId: candidate.originNodeId,
          factionId: options.firingFactionId,
          shipCount: 1
        },
        {
          nodeId: candidate.targetNodeId,
          factionId: options.targetFactionId,
          shipCount: 1
        }
      ]
    });
    const plan = calculateFirePlan(
      content,
      planningState,
      candidate.originNodeId,
      candidate.targetNodeId
    );

    if (plan === null || plan.missileEtaTurns <= 1) {
      continue;
    }

    const activeMissile: ActiveMissile = {
      ...plan,
      id: options.missileId,
      factionId: options.firingFactionId,
      targetFactionId: options.targetFactionId,
      targetShipKey: `${candidate.targetNodeId}:${options.targetFactionId}`,
      launchedTurn: Math.min(plan.impactTurn - 1, plan.issuedTurn + 1)
    };
    const stateTurn = plan.impactTurn - 1;
    const state = createInitialGameState({
      ...planningState,
      turn: stateTurn,
      activeMissiles: [activeMissile],
      debugEvents: [
        {
          turn: stateTurn,
          type: "START_STATE_AUDIT",
          message: `DEBUG_SCENARIO ${options.reason} ${candidate.originNodeId} -> ${candidate.targetNodeId}`,
          factionId: options.firingFactionId,
          firingNodeId: candidate.originNodeId,
          targetNodeId: candidate.targetNodeId,
          targetFactionId: options.targetFactionId,
          missileEtaTurns: plan.missileEtaTurns,
          missileImpactTurn: plan.impactTurn,
          reason: options.reason
        }
      ]
    });

    return {
      state,
      missileId: options.missileId,
      originNodeId: candidate.originNodeId,
      targetNodeId: candidate.targetNodeId,
      targetFactionId: options.targetFactionId
    };
  }

  throw new Error("No valid missile impact debug route is available for this map.");
}
