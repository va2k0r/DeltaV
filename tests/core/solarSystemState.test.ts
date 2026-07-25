import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import {
  ADVANCE_TURN_COMMAND,
  advanceTurn,
  applyCommand,
  calculateActiveBurnRedirectPlan,
  calculateBurnPlan,
  calculateFirePlan,
  computeBodyPosition,
  createMapGameplayHash,
  createSimulationTelemetry,
  createTrajectoryHash,
  createEvadeTMinusOneDebugScenario,
  createInitialGameState,
  createMissileImpactTMinusOneDebugScenario,
  createSolarSystemSnapshot,
  dumpTurnState,
  evaluateFactionRecoveryPath,
  runAIVsAIDiagnostics40T,
  runAiVsAiRegressionSimulations,
  runAiVsAiDebugSimulation,
  runFireVsAiDebugSimulation,
  runAITestTurns,
  validateContestedState,
  validateMissileTargets,
  validateNoDeadShipsInState,
  validateNoNegativeDV,
  validateNoNonContestedSameFactionStacks,
  validateOneActionPerShip,
  validateShipReferences
} from "../../src/core";
import {
  STRATEGIC_MAP_PRESET_ID,
  generateProceduralMap,
  getMapPreset,
  getProceduralInitialOccupanciesForMode,
  parseSolarSystemData,
  type MapPreset,
  type SolarSystemData
} from "../../src/data";
import { THREE_PLAYER_INITIAL_OCCUPANCIES } from "../../src/shared/startingSetup";

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);

function loadContent(): SolarSystemData {
  return parseSolarSystemData(JSON.parse(readFileSync(bodiesJsonUrl, "utf8")));
}

function loadContentWithDeimosShipyard(): SolarSystemData {
  const content = loadContent();

  return {
    ...content,
    nodes: content.nodes.map((node) => {
      if (node.id !== "deimos_node") {
        return node;
      }

      return {
        ...node,
        type: "shipyard",
        producesTritium: false,
        allowsShipyard: true
      };
    })
  };
}

function loadStrategicPreset(): MapPreset & {
  content: SolarSystemData;
  initialOccupancies: NonNullable<MapPreset["initialOccupancies"]>;
} {
  const preset = getMapPreset(STRATEGIC_MAP_PRESET_ID);

  if (preset.content === undefined || preset.initialOccupancies === undefined) {
    throw new Error("Expected strategic map preset content and initial occupancies.");
  }

  return {
    ...preset,
    content: preset.content,
    initialOccupancies: preset.initialOccupancies
  };
}

function findBody(snapshot: ReturnType<typeof createSolarSystemSnapshot>, bodyId: string) {
  const body = snapshot.bodies.find((candidate) => candidate.id === bodyId);

  if (body === undefined) {
    throw new Error(`Expected body "${bodyId}".`);
  }

  return body;
}

function angleDegrees(point: Readonly<{ x: number; y: number }>): number {
  return normalizeDegrees((Math.atan2(point.y, point.x) * 180) / Math.PI);
}

function relativeBodyAngleDegrees(
  snapshot: ReturnType<typeof createSolarSystemSnapshot>,
  bodyId: string,
  parentId: string
): number {
  const body = findBody(snapshot, bodyId);
  const parent = findBody(snapshot, parentId);

  return angleDegrees({
    x: body.position.x - parent.position.x,
    y: body.position.y - parent.position.y
  });
}

function normalizeDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

function angularDeltaDegrees(from: number, to: number): number {
  return normalizeDegrees(to - from);
}

describe("Solar System deterministic core state", () => {
  it("keeps the v10 canonical economy roles on the 18 release nodes", () => {
    const content = loadContent();
    const nodeIdsByType = (type: SolarSystemData["nodes"][number]["type"]): string[] => {
      return content.nodes
        .filter((node) => node.type === type)
        .map((node) => node.id)
        .sort();
    };

    expect(content.nodes).toHaveLength(18);
    expect(nodeIdsByType("protected")).toEqual(["earth_node", "moon_node"]);
    expect(nodeIdsByType("tritium")).toEqual([
      "jupiter_node",
      "neptune_node",
      "saturn_node",
      "uranus_node"
    ]);
    expect(nodeIdsByType("shipyard")).toEqual([
      "mars_node",
      "mercury_node",
      "pluto_charon_node",
      "titan_node"
    ]);
  });

  it("returns the same positions for the same content and turn", () => {
    const content = loadContent();
    const first = createSolarSystemSnapshot(content, 7);
    const second = createSolarSystemSnapshot(content, 7);

    expect(second.bodies.map((body) => body.position)).toEqual(
      first.bodies.map((body) => body.position)
    );
  });

  it("ADVANCE_TURN increments turn without content while preserving economy state", () => {
    const state = createInitialGameState();
    const next = applyCommand(state, ADVANCE_TURN_COMMAND);

    expect(next.turn).toBe(1);
    expect(next.factionDv).toEqual(state.factionDv);
    expect(next.shipyardProgress).toEqual(state.shipyardProgress);
    expect(next.nodeOccupancies).toEqual(state.nodeOccupancies);
    expect(next.mandatoryLaunches).toEqual(state.mandatoryLaunches);
    expect(next.pendingBurnOrders).toEqual([]);
    expect(next.pendingFireOrders).toEqual([]);
    expect(next.activeBurnTransits).toEqual([]);
    expect(next.activeMissiles).toEqual([]);
    expect(next.debugEvents).toEqual([]);
  });

  it("pauses human mandatory launches but auto-resolves AI mandatory launches", () => {
    const content = loadContent();
    const launch = {
      id: "launch:player:mars_node:T0:0",
      nodeId: "mars_node",
      factionId: "player" as const,
      createdTurn: 0
    };
    const humanLaunchState = createInitialGameState({
      factionDv: { player: 20, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 2 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
      ],
      mandatoryLaunches: [launch]
    });
    const humanResult = applyCommand(humanLaunchState, ADVANCE_TURN_COMMAND, content);

    expect(humanResult.turn).toBe(0);
    expect(humanResult.mandatoryLaunches).toEqual([launch]);

    const explicitAiResult = advanceTurn(humanLaunchState, content, ["player", "opponent"]);

    expect(explicitAiResult.turn).toBe(1);
    expect(explicitAiResult.mandatoryLaunches).toEqual([]);
    expect(explicitAiResult.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(explicitAiResult.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        factionId: "player",
        shipCount: 1,
        mandatoryLaunchId: launch.id
      })
    );
    expect(explicitAiResult.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 0,
        type: "MANDATORY_LAUNCH",
        nodeId: "mars_node",
        factionId: "player",
        mandatoryLaunchId: launch.id
      })
    );
    expect(explicitAiResult.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 1,
        type: "BURN_DEPARTED",
        nodeId: "mars_node",
        factionId: "player"
      })
    );
  });

  it("does not freeze AI-vs-AI game mode on a pending mandatory launch", () => {
    const content = loadContent();
    const launch = {
      id: "launch:player:mars_node:T0:0",
      nodeId: "mars_node",
      factionId: "player" as const,
      createdTurn: 0
    };
    const state = createInitialGameState({
      factions: [
        {
          id: "player",
          displayName: "Aperture",
          color: "#7fe8ff",
          accent: "#d9f8ff",
          controlType: "ai"
        },
        {
          id: "opponent",
          displayName: "Wayline",
          color: "#c982ff",
          accent: "#f3dcff",
          controlType: "ai"
        }
      ],
      factionDv: { player: 20, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 2 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
      ],
      mandatoryLaunches: [launch]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.turn).toBe(1);
    expect(next.mandatoryLaunches).toEqual([]);
    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        factionId: "player",
        mandatoryLaunchId: launch.id
      })
    );

    const helperResult = runAITestTurns(content, 1, state);

    expect(helperResult.state.turn).toBe(1);
    expect(helperResult.state.mandatoryLaunches).toEqual([]);
  });

  it("restores 4/5 instead of destroying a produced ship when launch reserve is lost", () => {
    const content = loadContent();
    const launch = {
      id: "launch:opponent:mars_node:T0:0",
      nodeId: "mars_node",
      factionId: "opponent" as const,
      createdTurn: 0
    };
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 10, opponent: 0 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "opponent", shipCount: 2 },
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 }
        ],
        mandatoryLaunches: [launch]
      }),
      content,
      ["opponent"]
    );

    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 4,
      workerFactionId: "opponent"
    });
    expect(next.mandatoryLaunches).toEqual([]);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_CHECK",
        nodeId: "mars_node",
        factionId: "opponent",
        progressBefore: 4,
        progressAfter: 4,
        productionAllowed: false,
        reason: "mandatory-launch-reserve-lost"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH_DESTROYED",
        nodeId: "mars_node",
        factionId: "opponent"
      })
    );
  });

  it("starts with three player ships and three enemy ships on separate nodes", () => {
    const state = createInitialGameState();

    expect(state.factionDv.player).toBe(10);
    expect(state.factionDv.opponent).toBe(10);
    expect(state.nodeOccupancies).toEqual([
      { nodeId: "titan_node", factionId: "player", shipCount: 1 },
      { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
      { nodeId: "ganymede_node", factionId: "player", shipCount: 1 },
      { nodeId: "europa_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "oberon_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
    ]);
    expect(state.shipyardProgress).toEqual([]);
    expect(state.mandatoryLaunches).toEqual([]);
    expect(new Set(state.nodeOccupancies.map((occupancy) => occupancy.nodeId)).size).toBe(
      state.nodeOccupancies.length
    );
  });

  it("defines a 3-player debug start with nine ships on rendered strategic nodes", () => {
    const content = loadStrategicPreset().content;
    const nodeIds = new Set(content.nodes.map((node) => node.id));
    const countsByFaction = THREE_PLAYER_INITIAL_OCCUPANCIES.reduce<Record<string, number>>(
      (counts, occupancy) => {
        counts[occupancy.factionId] = (counts[occupancy.factionId] ?? 0) + occupancy.shipCount;
        return counts;
      },
      {}
    );

    expect(THREE_PLAYER_INITIAL_OCCUPANCIES).toHaveLength(9);
    expect(
      THREE_PLAYER_INITIAL_OCCUPANCIES.every((occupancy) => nodeIds.has(occupancy.nodeId))
    ).toBe(true);
    expect(countsByFaction).toEqual({ player: 3, opponent: 3, ai_2: 3 });
    expect(
      new Set(THREE_PLAYER_INITIAL_OCCUPANCIES.map((occupancy) => occupancy.nodeId)).size
    ).toBe(THREE_PLAYER_INITIAL_OCCUPANCIES.length);
  });

  it("has the AI read and pressure greedy productive expansion", () => {
    const content = loadContent();
    const state = createInitialGameState({
      turn: 3,
      factionDv: { player: 18, opponent: 10 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "player", shipCount: 1 },
        { nodeId: "uranus_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 }
      ],
      shipyardProgress: [{ nodeId: "mars_node", progress: 3, workerFactionId: "player" }]
    });
    const next = advanceTurn(state, content, ["opponent"]);

    expect(
      next.debugEvents.some((event) => {
        return (
          event.type === "AI_STRATEGY_READ" &&
          event.factionId === "opponent" &&
          event.targetFactionId === "player" &&
          event.reason?.includes("GREEDY_PRODUCTIVE_EXPANSION") === true
        );
      })
    ).toBe(true);
    expect(
      next.debugEvents.some((event) => {
        return (
          event.factionId === "opponent" &&
          event.targetFactionId === "player" &&
          (event.type === "FIRE_ECONOMIC_DENIAL" ||
            event.type === "PRODUCTIVE_NODE_PRESSURE" ||
            event.type === "SHIPYARD_PRESSURE" ||
            event.type === "ANTI_RUNAWAY_TARGET" ||
            event.type === "AI_ECONOMIC_FIRE_SELECTED" ||
            event.type === "AI_TRITIUM_RACE_RESPONSE" ||
            event.type === "AI_COUNTER_TRITIUM_PLAN_SELECTED")
        );
      })
    ).toBe(true);
    expect(
      next.debugEvents.some((event) => {
        return event.type === "AI_STRATEGY_READ_TOO_LATE" && event.factionId === "opponent";
      })
    ).toBe(false);
  });

  it("logs tryhard solvency and responds to a player Tritium race", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 20, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "venus_node", factionId: "player", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const playerRaceState = applyCommand(
      baseState,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "venus_node",
        destinationNodeId: "jupiter_node",
        factionId: "player"
      },
      content
    );

    expect(playerRaceState.pendingBurnOrders).toContainEqual(
      expect.objectContaining({
        factionId: "player",
        destinationNodeId: "jupiter_node"
      })
    );

    const next = applyCommand(playerRaceState, ADVANCE_TURN_COMMAND, content);

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_TRYHARD_STRATEGY_READ",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SOLVENCY_PROJECTION",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_TRITIUM_RACE_DETECTED",
        factionId: "opponent",
        targetFactionId: "player",
        targetNodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_HUMAN_TRITIUM_EXPANSION_DETECTED",
        factionId: "opponent",
        targetFactionId: "player",
        targetNodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_COUNTER_TRITIUM_PLAN_SELECTED",
        factionId: "opponent"
      })
    );
  });

  it("does not count a tritium worker that is already doomed by a scheduled missile", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 20, opponent: 0 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, state, "mars_node", "jupiter_node");

    if (firePlan === null) {
      throw new Error("Expected Mars to be able to FIRE at Jupiter.");
    }

    const next = advanceTurn(
      {
        ...state,
        activeMissiles: [
          {
            ...firePlan,
            id: "test:known-jupiter-death",
            missileEtaTurns: 1,
            impactTurn: state.turn + 1,
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "jupiter_node:opponent",
            launchedTurn: 0
          }
        ]
      },
      content
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SOLVENCY_COUNTS_TRITIUM",
        factionId: "opponent",
        nodeId: "jupiter_node",
        amount: 0,
        reason: "cannot-evade-known-missile"
      })
    );
    expect(
      next.debugEvents.find((event) => {
        return (
          event.type === "AI_SOLVENCY_COUNTS_TRITIUM" &&
          event.factionId === "opponent" &&
          event.nodeId === "jupiter_node"
        );
      })?.message
    ).toContain("survivesKnownThreats no");
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SOLVENCY_PROJECTION",
        factionId: "opponent",
        amount: 0,
        reason: "insolvent"
      })
    );
  });

  it("does not recover from an apparent tritium worker already doomed before Evade is affordable", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 0, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, state, "mars_node", "jupiter_node");

    if (firePlan === null) {
      throw new Error("Expected Mars to be able to FIRE at Jupiter.");
    }

    const recovery = evaluateFactionRecoveryPath(
      content,
      {
        ...state,
        activeMissiles: [
          {
            ...firePlan,
            id: "test:doomed-only-tritium",
            missileEtaTurns: 1,
            impactTurn: state.turn + 1,
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          }
        ]
      },
      "player"
    );

    expect(recovery.canRecoverIndefiniteTritium).toBe(false);
    expect(recovery.countedTritium).toEqual([]);
    expect(recovery.rejectedTritium).toContainEqual(
      expect.objectContaining({
        nodeId: "jupiter_node",
        reason: "cannot-evade-known-missile"
      })
    );
  });

  it("keeps a stable tritium recovery path despite irrelevant missiles in flight", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 8, opponent: 0 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 10 }
      ]
    });
    const firePlan = calculateFirePlan(content, state, "venus_node", "mars_node");

    if (firePlan === null) {
      throw new Error("Expected Venus to be able to FIRE at Mars.");
    }

    const recovery = evaluateFactionRecoveryPath(
      content,
      {
        ...state,
        activeMissiles: Array.from({ length: 20 }, (_, index) => ({
          ...firePlan,
          id: `test:irrelevant-missile:${index}`,
          factionId: "opponent" as const,
          targetFactionId: "player" as const,
          targetShipKey: "mars_node:player",
          launchedTurn: 0
        }))
      },
      "player"
    );
    const opponentRecovery = evaluateFactionRecoveryPath(content, state, "opponent");

    expect(recovery.canRecoverIndefiniteTritium).toBe(true);
    expect(recovery.countedTritium).toContainEqual(
      expect.objectContaining({ nodeId: "jupiter_node" })
    );
    expect(opponentRecovery.canRecoverIndefiniteTritium).toBe(false);
  });

  it("projects guaranteed tritium income before future missile Evade warnings", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 1, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, state, "mars_node", "jupiter_node");

    if (firePlan === null) {
      throw new Error("Expected Mars to be able to FIRE at Jupiter.");
    }

    const recovery = evaluateFactionRecoveryPath(
      content,
      {
        ...state,
        activeMissiles: [
          {
            ...firePlan,
            id: "test:future-income-evade",
            missileEtaTurns: 3,
            impactTurn: state.turn + 3,
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          }
        ]
      },
      "player"
    );
    const missileThreat = recovery.knownThreats.find(
      (threat) => threat.id === "test:future-income-evade"
    );

    expect(missileThreat).toEqual(
      expect.objectContaining({
        status: "safe",
        projectedDvAtEvent: 5,
        reason: "evade-affordable-at-impact"
      })
    );
  });

  it("projects committed upkeep before future missile Evade warnings", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 2, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, state, "venus_node", "jupiter_node");

    if (firePlan === null) {
      throw new Error("Expected Venus to be able to FIRE at Jupiter.");
    }

    const recovery = evaluateFactionRecoveryPath(
      content,
      {
        ...state,
        activeMissiles: [
          {
            ...firePlan,
            id: "test:upkeep-before-evade",
            missileEtaTurns: 1,
            impactTurn: state.turn + 1,
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          }
        ]
      },
      "player"
    );
    const missileThreat = recovery.knownThreats.find(
      (threat) => threat.id === "test:upkeep-before-evade"
    );

    expect(missileThreat).toEqual(
      expect.objectContaining({
        status: "unsafe",
        projectedDvAtEvent: 0,
        reason: "evade-dv-insufficient-at-impact"
      })
    );
  });

  it("does not count fallback tritium income on the burn arrival turn", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 20, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "venus_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const burnPlan = calculateBurnPlan(content, baseState, "venus_node", "jupiter_node");
    const firePlan = calculateFirePlan(content, baseState, "mars_node", "jupiter_node");

    if (burnPlan === null || firePlan === null) {
      throw new Error("Expected Venus fallback burn and Mars fire plan.");
    }

    const recovery = evaluateFactionRecoveryPath(
      content,
      {
        ...baseState,
        factionDv: { player: burnPlan.burnCost, opponent: 20 },
        pendingBurnOrders: [
          {
            ...burnPlan,
            id: "test:fallback-arrival",
            factionId: "player",
            shipCount: 1
          }
        ],
        activeMissiles: [
          {
            ...firePlan,
            id: "test:fallback-arrival-hit",
            missileEtaTurns: burnPlan.etaTurns,
            impactTurn: burnPlan.arrivalTurn,
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          }
        ]
      },
      "player"
    );

    expect(recovery.canRecoverIndefiniteTritium).toBe(false);
    expect(recovery.rejectedTritium).toContainEqual(
      expect.objectContaining({
        nodeId: "jupiter_node",
        firstPossibleWorkTurn: burnPlan.arrivalTurn + 1,
        reason: "cannot-evade-known-missile"
      })
    );
  });

  it("keeps 3p mutual collapse unresolved when every apparent tritium path is doomed", () => {
    const content = loadContent();
    const factions = [
      {
        id: "player" as const,
        displayName: "Aperture",
        color: "#7fe8ff",
        accent: "#d9f8ff",
        controlType: "ai" as const
      },
      {
        id: "opponent" as const,
        displayName: "Wayline",
        color: "#c982ff",
        accent: "#f3dcff",
        controlType: "ai" as const
      },
      {
        id: "ai_2" as const,
        displayName: "Prism",
        color: "#9be65d",
        accent: "#ddffc0",
        controlType: "ai" as const
      }
    ];
    const state = createInitialGameState({
      gameMode: "3p",
      factions,
      factionDv: { player: 0, opponent: 0, ai_2: 0 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "uranus_node", factionId: "ai_2", shipCount: 1 },
        { nodeId: "mars_node", factionId: "player", shipCount: 1 }
      ]
    });
    const baseFirePlan = calculateFirePlan(content, state, "mars_node", "jupiter_node");

    if (baseFirePlan === null) {
      throw new Error("Expected Mars to be able to FIRE in mutual collapse setup.");
    }

    const threatenedState = {
      ...state,
      activeMissiles: [
        {
          ...baseFirePlan,
          id: "test:collapse-player",
          targetNodeId: "jupiter_node",
          impactTurn: state.turn + 1,
          missileEtaTurns: 1,
          factionId: "opponent" as const,
          targetFactionId: "player" as const,
          targetShipKey: "jupiter_node:player",
          launchedTurn: 0
        },
        {
          ...baseFirePlan,
          id: "test:collapse-opponent",
          targetNodeId: "saturn_node",
          impactTurn: state.turn + 1,
          missileEtaTurns: 1,
          factionId: "player" as const,
          targetFactionId: "opponent" as const,
          targetShipKey: "saturn_node:opponent",
          launchedTurn: 0
        },
        {
          ...baseFirePlan,
          id: "test:collapse-ai-2",
          targetNodeId: "uranus_node",
          impactTurn: state.turn + 1,
          missileEtaTurns: 1,
          factionId: "player" as const,
          targetFactionId: "ai_2" as const,
          targetShipKey: "uranus_node:ai_2",
          launchedTurn: 0
        }
      ]
    };
    const recoverableFactions = factions.filter((faction) => {
      return evaluateFactionRecoveryPath(content, threatenedState, faction.id)
        .canRecoverIndefiniteTritium;
    });

    expect(recoverableFactions).toEqual([]);
  });

  it("keeps simultaneous recovery burns to the same tritium unresolved for victory", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "venus_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const playerPlan = calculateBurnPlan(content, state, "venus_node", "jupiter_node");
    const opponentPlan = calculateBurnPlan(content, state, "mars_node", "jupiter_node");

    if (playerPlan === null || opponentPlan === null) {
      throw new Error("Expected both factions to be able to race toward Jupiter.");
    }

    const playerDv = state.factionDv.player ?? 0;
    const opponentDv = state.factionDv.opponent ?? 0;
    const racingState = {
      ...state,
      factionDv: {
        player: Math.max(0, playerDv - playerPlan.burnCost),
        opponent: Math.max(0, opponentDv - opponentPlan.burnCost)
      },
      pendingBurnOrders: [
        {
          ...playerPlan,
          id: "test:player-recovery-race",
          factionId: "player" as const,
          shipCount: 1
        },
        {
          ...opponentPlan,
          id: "test:opponent-recovery-race",
          factionId: "opponent" as const,
          shipCount: 1
        }
      ],
      nodeOccupancies: []
    };
    const recovery = evaluateFactionRecoveryPath(content, racingState, "player");

    expect(recovery.canRecoverIndefiniteTritium).toBe(false);
    expect(recovery.pendingRecoveryTransitBlocksVictory).toBe(true);
    expect(recovery.collapseStatus).toBe("unresolved");
    expect(recovery.collapseReason).toBe("pending-recovery-transit");
    expect(recovery.unresolvedTritium).toContainEqual(
      expect.objectContaining({
        nodeId: "jupiter_node",
        viaNodeId: "venus_node",
        recoveryStatus: "unresolved-contested-recovery",
        contestedRecovery: true,
        unresolved: true
      })
    );
  });

  it("keeps near-complete shipyard production branchable despite contested upkeep insolvency", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 0, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "player", shipCount: 1 }
      ],
      shipyardProgress: [{ nodeId: "mercury_node", progress: 4, workerFactionId: "player" }]
    });
    const recovery = evaluateFactionRecoveryPath(content, state, "player");

    expect(recovery.canRecoverIndefiniteTritium).toBe(false);
    expect(recovery.projectedDvAtHorizon).toBeLessThan(0);
    expect(recovery.collapseStatus).toBe("projected");
    expect(recovery.collapseReason).toBe("branchable-recovery-before-forced-collapse");
  });

  it("does not let a non-tritium transit and unaffordable near-complete shipyard keep recovery projected", () => {
    const content = loadContent();
    const transitPlan = calculateBurnPlan(content, 6, "saturn_node", "venus_node");

    if (transitPlan === null) {
      throw new Error("Expected Saturn to Venus BURN plan.");
    }

    const state = createInitialGameState({
      turn: 6,
      factionDv: { player: 0, opponent: 20 },
      nodeOccupancies: [{ nodeId: "iapetus_node", factionId: "player", shipCount: 1 }],
      activeBurnTransits: [
        {
          ...transitPlan,
          id: "test:player-non-recovery-transit",
          factionId: "player",
          shipCount: 1,
          departedTurn: 3
        }
      ],
      shipyardProgress: [{ nodeId: "iapetus_node", progress: 4, workerFactionId: "player" }]
    });
    const recovery = evaluateFactionRecoveryPath(content, state, "player");

    expect(recovery.canRecoverIndefiniteTritium).toBe(false);
    expect(recovery.reasonCodes).toContain("no-survivable-tritium");
    expect(recovery.collapseStatus).toBe("forced");
    expect(recovery.collapseReason).toBe("no-survivable-tritium-or-legal-recovery");
  });

  it("keeps a 3p valid winner when only one tritium path survives relevant threats", () => {
    const content = loadContent();
    const factions = [
      {
        id: "player" as const,
        displayName: "Aperture",
        color: "#7fe8ff",
        accent: "#d9f8ff",
        controlType: "ai" as const
      },
      {
        id: "opponent" as const,
        displayName: "Wayline",
        color: "#c982ff",
        accent: "#f3dcff",
        controlType: "ai" as const
      },
      {
        id: "ai_2" as const,
        displayName: "Prism",
        color: "#9be65d",
        accent: "#ddffc0",
        controlType: "ai" as const
      }
    ];
    const state = createInitialGameState({
      gameMode: "3p",
      factions,
      factionDv: { player: 5, opponent: 0, ai_2: 0 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "uranus_node", factionId: "ai_2", shipCount: 1 },
        { nodeId: "mars_node", factionId: "player", shipCount: 1 }
      ]
    });
    const baseFirePlan = calculateFirePlan(content, state, "mars_node", "saturn_node");

    if (baseFirePlan === null) {
      throw new Error("Expected Mars to be able to FIRE in 3p winner setup.");
    }

    const threatenedState = {
      ...state,
      activeMissiles: [
        {
          ...baseFirePlan,
          id: "test:winner-irrelevant",
          targetNodeId: "mars_node",
          impactTurn: state.turn + 1,
          missileEtaTurns: 1,
          factionId: "opponent" as const,
          targetFactionId: "player" as const,
          targetShipKey: "mars_node:player",
          launchedTurn: 0
        },
        {
          ...baseFirePlan,
          id: "test:winner-opponent-collapse",
          targetNodeId: "saturn_node",
          impactTurn: state.turn + 1,
          missileEtaTurns: 1,
          factionId: "player" as const,
          targetFactionId: "opponent" as const,
          targetShipKey: "saturn_node:opponent",
          launchedTurn: 0
        },
        {
          ...baseFirePlan,
          id: "test:winner-ai-2-collapse",
          targetNodeId: "uranus_node",
          impactTurn: state.turn + 1,
          missileEtaTurns: 1,
          factionId: "player" as const,
          targetFactionId: "ai_2" as const,
          targetShipKey: "uranus_node:ai_2",
          launchedTurn: 0
        }
      ]
    };
    const recoverableFactions = factions
      .filter((faction) => {
        return evaluateFactionRecoveryPath(content, threatenedState, faction.id)
          .canRecoverIndefiniteTritium;
      })
      .map((faction) => faction.id);

    expect(recoverableFactions).toEqual(["player"]);
  });

  it("requires a second secured Tritium source during the tryhard opening", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 20, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "hydra_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SECOND_TRITIUM_REQUIRED",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_TRITIUM_RACE_RESPONSE",
        factionId: "opponent",
        action: "BURN"
      })
    );

    const opponentTritiumTransit = next.activeBurnTransits.find((transit) => {
      const destinationNode = content.nodes.find((node) => node.id === transit.destinationNodeId);
      return transit.factionId === "opponent" && destinationNode?.type === "tritium";
    });

    expect(opponentTritiumTransit).toEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node"
      })
    );
  });

  it("rejects opening burns that spend below the AI solvency reserve", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "titan_node", factionId: "player", shipCount: 1 },
          { nodeId: "oberon_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.factionDv.opponent).toBeGreaterThanOrEqual(2);
    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "oberon_node",
        destinationNodeId: "titan_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SOLVENCY_RESERVE",
        factionId: "opponent",
        nodeId: "oberon_node",
        destinationNodeId: "titan_node",
        reason: "opening-solvency-hard-gate"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_OPENING_BURN",
        factionId: "opponent",
        nodeId: "oberon_node",
        destinationNodeId: "titan_node",
        reason: "opening-solvency-hard-gate"
      })
    );
  });

  it("defines the new strategic map with requested bodies, roles, and starting ships", () => {
    const strategicPreset = loadStrategicPreset();
    const content = strategicPreset.content;
    const strategicState = createInitialGameState({
      nodeOccupancies: strategicPreset.initialOccupancies
    });
    const bodyIds = new Set(content.bodies.map((body) => body.id));
    const tritiumNodes = content.nodes.filter((node) => node.type === "tritium");
    const shipyardNodes = content.nodes.filter((node) => node.type === "shipyard");
    const currentShipCountsByFaction = createInitialGameState().nodeOccupancies.reduce(
      (counts, occupancy) => {
        counts[occupancy.factionId] = (counts[occupancy.factionId] ?? 0) + occupancy.shipCount;
        return counts;
      },
      { player: 0, opponent: 0 } as Record<string, number>
    );
    const strategicShipCountsByFaction = strategicState.nodeOccupancies.reduce(
      (counts, occupancy) => {
        counts[occupancy.factionId] = (counts[occupancy.factionId] ?? 0) + occupancy.shipCount;
        return counts;
      },
      { player: 0, opponent: 0 } as Record<string, number>
    );

    expect([...bodyIds]).toEqual([
      "sun",
      "mercury",
      "venus",
      "earth",
      "moon",
      "mars",
      "phobos",
      "deimos",
      "jupiter",
      "io",
      "europa",
      "ganymede",
      "callisto",
      "saturn",
      "titan",
      "iapetus",
      "uranus",
      "oberon",
      "titania",
      "neptune",
      "triton",
      "pluto",
      "charon"
    ]);
    expect(content.nodes).toHaveLength(22);
    expect(tritiumNodes.map((node) => node.bodyId).sort()).toEqual([
      "europa",
      "titan",
      "titania",
      "triton",
      "venus"
    ]);
    expect(shipyardNodes.map((node) => node.bodyId).sort()).toEqual([
      "callisto",
      "charon",
      "deimos",
      "iapetus",
      "oberon"
    ]);
    expect(content.nodes.find((node) => node.bodyId === "earth")).toEqual(
      expect.objectContaining({
        type: "barren",
        weaponsOffline: true,
        producesTritium: false,
        allowsShipyard: false
      })
    );
    expect(content.nodes.find((node) => node.bodyId === "moon")).toEqual(
      expect.objectContaining({
        type: "barren",
        weaponsOffline: true
      })
    );
    expect(content.nodes.find((node) => node.bodyId === "io")?.type).toBe("barren");
    expect(content.nodes.find((node) => node.bodyId === "jupiter")).toEqual(
      expect.objectContaining({
        type: "barren",
        producesTritium: false,
        allowsShipyard: false
      })
    );
    expect(content.nodes.find((node) => node.bodyId === "mercury")).toEqual(
      expect.objectContaining({
        type: "barren",
        producesTritium: false,
        allowsShipyard: false
      })
    );
    expect(content.nodes.find((node) => node.bodyId === "saturn")?.type).toBe("barren");
    expect(content.nodes.find((node) => node.bodyId === "uranus")?.type).toBe("barren");
    expect(content.nodes.find((node) => node.bodyId === "neptune")?.type).toBe("barren");
    expect(strategicShipCountsByFaction).toEqual(currentShipCountsByFaction);
    expect(strategicState.nodeOccupancies).toEqual([
      { nodeId: "titan_node", factionId: "player", shipCount: 1 },
      { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
      { nodeId: "ganymede_node", factionId: "player", shipCount: 1 },
      { nodeId: "europa_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "oberon_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
    ]);
  });

  it("starts the strategic planets in the requested tactical phase layout", () => {
    const { content } = loadStrategicPreset();
    const snapshot = createSolarSystemSnapshot(content, 0);

    for (const bodyId of ["venus", "saturn"]) {
      const body = findBody(snapshot, bodyId);
      expect(body.position.y).toBeGreaterThan(0);
      expect(body.position.x).toBeCloseTo(0, 8);
    }

    for (const bodyId of ["mercury", "jupiter", "pluto"]) {
      const body = findBody(snapshot, bodyId);
      expect(body.position.y).toBeLessThan(0);
      expect(body.position.x).toBeCloseTo(0, 8);
    }

    for (const bodyId of ["earth", "uranus"]) {
      const body = findBody(snapshot, bodyId);
      expect(body.position.x).toBeLessThan(0);
      expect(body.position.y).toBeCloseTo(0, 8);
    }

    for (const bodyId of ["mars", "neptune"]) {
      const body = findBody(snapshot, bodyId);
      expect(body.position.x).toBeGreaterThan(0);
      expect(body.position.y).toBeCloseTo(0, 8);
    }
  });

  it("rotates strategic planets as one rigid heliocentric formation", () => {
    const { content } = loadStrategicPreset();
    const turnZero = createSolarSystemSnapshot(content, 0);
    const turnOne = createSolarSystemSnapshot(content, 1);
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
    ];

    for (const bodyId of planetIds) {
      const initialAngle = relativeBodyAngleDegrees(turnZero, bodyId, "sun");
      const nextAngle = relativeBodyAngleDegrees(turnOne, bodyId, "sun");
      expect(angularDeltaDegrees(initialAngle, nextAngle)).toBeCloseTo(5, 8);
    }

    for (let index = 1; index < planetIds.length; index += 1) {
      const previousPlanetId = planetIds[index - 1];
      const currentPlanetId = planetIds[index];

      if (previousPlanetId === undefined || currentPlanetId === undefined) {
        throw new Error("Expected neighboring planet ids.");
      }

      const turnZeroPhase = angularDeltaDegrees(
        relativeBodyAngleDegrees(turnZero, previousPlanetId, "sun"),
        relativeBodyAngleDegrees(turnZero, currentPlanetId, "sun")
      );
      const turnOnePhase = angularDeltaDegrees(
        relativeBodyAngleDegrees(turnOne, previousPlanetId, "sun"),
        relativeBodyAngleDegrees(turnOne, currentPlanetId, "sun")
      );

      expect(turnOnePhase).toBeCloseTo(turnZeroPhase, 8);
    }
  });

  it("rotates strategic moon constellations around their parents while preserving formation", () => {
    const { content } = loadStrategicPreset();
    const turnZero = createSolarSystemSnapshot(content, 0);
    const turnOne = createSolarSystemSnapshot(content, 1);
    const jovianMoons = ["io", "europa", "ganymede", "callisto"];

    expect(relativeBodyAngleDegrees(turnZero, "io", "jupiter")).toBeCloseTo(0, 8);
    expect(relativeBodyAngleDegrees(turnZero, "europa", "jupiter")).toBeCloseTo(90, 8);
    expect(relativeBodyAngleDegrees(turnZero, "ganymede", "jupiter")).toBeCloseTo(180, 8);
    expect(relativeBodyAngleDegrees(turnZero, "callisto", "jupiter")).toBeCloseTo(270, 8);

    for (const bodyId of jovianMoons) {
      const initialAngle = relativeBodyAngleDegrees(turnZero, bodyId, "jupiter");
      const nextAngle = relativeBodyAngleDegrees(turnOne, bodyId, "jupiter");
      expect(angularDeltaDegrees(initialAngle, nextAngle)).toBeCloseTo(30, 8);
    }

    for (let index = 1; index < jovianMoons.length; index += 1) {
      const previousMoonId = jovianMoons[index - 1];
      const currentMoonId = jovianMoons[index];

      if (previousMoonId === undefined || currentMoonId === undefined) {
        throw new Error("Expected neighboring Jovian moon ids.");
      }

      const turnZeroPhase = angularDeltaDegrees(
        relativeBodyAngleDegrees(turnZero, previousMoonId, "jupiter"),
        relativeBodyAngleDegrees(turnZero, currentMoonId, "jupiter")
      );
      const turnOnePhase = angularDeltaDegrees(
        relativeBodyAngleDegrees(turnOne, previousMoonId, "jupiter"),
        relativeBodyAngleDegrees(turnOne, currentMoonId, "jupiter")
      );

      expect(turnOnePhase).toBeCloseTo(turnZeroPhase, 8);
    }
  });

  it("blocks FIRE from strategic weapons-offline nodes", () => {
    const { content } = loadStrategicPreset();
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "earth_node", factionId: "player", shipCount: 1 },
        { nodeId: "moon_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const earthFirePlan = calculateFirePlan(content, state, "earth_node", "venus_node");
    const moonFirePlan = calculateFirePlan(content, state, "moon_node", "venus_node");
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "earth_node",
        targetNodeId: "venus_node"
      },
      content
    );

    expect(earthFirePlan).toBeNull();
    expect(moonFirePlan).toBeNull();
    expect(ordered.pendingFireOrders).toEqual([]);
  });

  it("uses continuous strategic transfer scores with the Earth-Moon corridor exception", () => {
    const { content } = loadStrategicPreset();
    const state = createInitialGameState();
    const earthToMoon = calculateBurnPlan(content, state, "earth_node", "moon_node");
    const ioToEuropa = calculateBurnPlan(content, state, "io_node", "europa_node");
    const mercuryToPluto = calculateBurnPlan(content, state, "mercury_node", "pluto_node");
    const marsToTitan = calculateBurnPlan(content, state, "mars_node", "titan_node");

    expect(earthToMoon).toEqual(expect.objectContaining({ etaTurns: 1 }));
    expect(ioToEuropa?.etaTurns).toBeGreaterThanOrEqual(2);
    expect(ioToEuropa?.etaTurns).toBeLessThanOrEqual(4);
    expect(mercuryToPluto?.etaTurns).toBeGreaterThanOrEqual(5);
    expect(mercuryToPluto?.etaTurns).toBeLessThanOrEqual(7);
    expect(marsToTitan?.etaTurns).toBeGreaterThanOrEqual(3);
    expect(marsToTitan?.etaTurns).toBeLessThanOrEqual(6);

    for (const plan of [earthToMoon, ioToEuropa, mercuryToPluto, marsToTitan]) {
      expect(plan?.burnCost).toBeGreaterThanOrEqual(2);
      expect(plan?.burnCost).toBeLessThanOrEqual(10);
    }
  });

  it("keeps continuous transfer ETA and dV values bounded and samples future arrivals", () => {
    const { content } = loadStrategicPreset();
    const state = createInitialGameState();
    let routeWithMovingDestination:
      | Readonly<{
          originNodeId: string;
          destinationNodeId: string;
        }>
      | undefined;

    for (const originNode of content.nodes) {
      for (const destinationNode of content.nodes) {
        if (originNode.id === destinationNode.id) {
          continue;
        }

        const plan = calculateBurnPlan(content, state, originNode.id, destinationNode.id);

        expect(plan).not.toBeNull();
        expect(Number.isInteger(plan?.etaTurns)).toBe(true);
        expect(plan?.etaTurns).toBeGreaterThanOrEqual(1);
        expect(plan?.etaTurns).toBeLessThanOrEqual(7);
        expect(Number.isInteger(plan?.burnCost)).toBe(true);
        expect(plan?.burnCost).toBeGreaterThanOrEqual(2);
        expect(plan?.burnCost).toBeLessThanOrEqual(10);

        const currentDestinationPosition = computeBodyPosition(
          content,
          destinationNode.bodyId,
          state.turn
        );

        if (
          routeWithMovingDestination === undefined &&
          plan !== null &&
          (plan.destinationPositionAtArrival.x !== currentDestinationPosition.x ||
            plan.destinationPositionAtArrival.y !== currentDestinationPosition.y)
        ) {
          routeWithMovingDestination = {
            originNodeId: originNode.id,
            destinationNodeId: destinationNode.id
          };
        }
      }
    }

    expect(routeWithMovingDestination).toBeDefined();

    if (routeWithMovingDestination === undefined) {
      throw new Error("Expected a strategic route with a moving future destination.");
    }

    const plan = calculateBurnPlan(
      content,
      state,
      routeWithMovingDestination.originNodeId,
      routeWithMovingDestination.destinationNodeId
    );
    const destinationNode = content.nodes.find((node) => {
      return node.id === routeWithMovingDestination?.destinationNodeId;
    });

    if (plan === null || destinationNode === undefined) {
      throw new Error("Expected bounded strategic route plan.");
    }

    expect(plan.destinationPositionAtArrival).toEqual(
      computeBodyPosition(content, destinationNode.bodyId, plan.arrivalTurn)
    );
  });

  it("runs WORK economy on the new strategic map without changing core rules", () => {
    const strategicPreset = loadStrategicPreset();
    const next = advanceTurn(
      createInitialGameState({
        nodeOccupancies: strategicPreset.initialOccupancies
      }),
      strategicPreset.content,
      []
    );

    expect(next.factionDv.player).toBe(12);
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "deimos_node",
      progress: 1,
      workerFactionId: "player"
    });
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "oberon_node",
      progress: 1,
      workerFactionId: "opponent"
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "titan_node",
        factionId: "player",
        amount: 2
      })
    );
  });

  it("advancing turn changes at least one orbiting body position deterministically", () => {
    const content = loadContent();
    const turnZero = createSolarSystemSnapshot(content, 0);
    const turnOne = createSolarSystemSnapshot(content, 1);
    const deterministicTurnOne = createSolarSystemSnapshot(content, 1);
    const mercuryZero = findBody(turnZero, "mercury");
    const mercuryOne = findBody(turnOne, "mercury");

    expect(mercuryOne.position).not.toEqual(mercuryZero.position);
    expect(turnOne).toEqual(deterministicTurnOne);
  });

  it("plans BURN endpoints against the destination position at arrival turn", () => {
    const content = loadContent();
    const state = createInitialGameState();
    const plan = calculateBurnPlan(content, state, "mars_node", "saturn_node");

    if (plan === null) {
      throw new Error("Expected a Mars to Saturn BURN plan.");
    }

    const currentSnapshot = createSolarSystemSnapshot(content, state);
    const arrivalSnapshot = createSolarSystemSnapshot(content, plan.arrivalTurn);
    const currentDestination = currentSnapshot.nodes.find((node) => node.id === "saturn_node");
    const arrivalDestination = arrivalSnapshot.nodes.find((node) => node.id === "saturn_node");

    expect(plan.etaTurns).toBeGreaterThan(0);
    expect(arrivalDestination).toBeDefined();
    expect(plan.destinationPositionAtArrival).toEqual(arrivalDestination?.position);
    expect(plan.destinationPositionAtArrival).not.toEqual(currentDestination?.position);
  });

  it("uses short local ETA for planet-to-moon and moon-to-planet BURN plans", () => {
    const content = loadContent();
    const state = createInitialGameState();
    const planetToMoon = calculateBurnPlan(content, state, "mars_node", "deimos_node");
    const moonToPlanet = calculateBurnPlan(content, state, "deimos_node", "mars_node");

    expect(planetToMoon?.etaTurns).toBeGreaterThanOrEqual(2);
    expect(planetToMoon?.etaTurns).toBeLessThanOrEqual(3);
    expect(moonToPlanet?.etaTurns).toBeGreaterThanOrEqual(2);
    expect(moonToPlanet?.etaTurns).toBeLessThanOrEqual(3);
  });

  it("keeps a BURN order pending until the next turn", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(ordered.pendingBurnOrders).toHaveLength(1);
    expect(ordered.nodeOccupancies).toEqual(state.nodeOccupancies);

    const [order] = ordered.pendingBurnOrders;

    if (order === undefined) {
      throw new Error("Expected pending BURN order.");
    }

    expect(order.etaTurns).toBeGreaterThan(1);

    const advanced = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);

    expect(advanced.pendingBurnOrders).toEqual([]);
    expect(advanced.nodeOccupancies).not.toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(advanced.activeBurnTransits).toHaveLength(1);
    expect(advanced.factionDv.player).toBe(10 - order.burnCost);
  });

  it("produces tritium dV for a stationary ship on a tritium node", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "player", shipCount: 1 }]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.factionDv.player).toBe(12);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node",
        amount: 2
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "PRODUCTIVE_AUDIT",
        nodeId: "jupiter_node",
        factionId: "player",
        reason: "income-generated",
        amount: 2,
        contested: false,
        action: "WORK"
      })
    );
  });

  it("produces tritium dV for a stationary enemy ship on a tritium node", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.factionDv.opponent).toBe(12);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node",
        factionId: "opponent",
        amount: 2
      })
    );
  });

  it("does not let an AI ship work tritium on the same turn it arrives by burn", () => {
    const content = loadContent();
    const start = createInitialGameState({
      factionDv: { player: 10, opponent: 60, ai_2: 10 },
      nodeOccupancies: [{ nodeId: "venus_node", factionId: "opponent", shipCount: 1 }]
    });
    const ordered = applyCommand(
      start,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "venus_node",
        destinationNodeId: "jupiter_node",
        factionId: "opponent"
      },
      content
    );
    const arrivalTurn = ordered.pendingBurnOrders[0]?.arrivalTurn ?? ordered.turn;
    let arrived = ordered;

    while (arrived.turn < arrivalTurn) {
      arrived = advanceTurn(arrived, content, ["opponent"]);
    }

    expect(arrived.nodeOccupancies).toContainEqual({
      nodeId: "jupiter_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(arrived.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node",
        factionId: "opponent"
      })
    );
    expect(arrived.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "PRODUCTIVE_AUDIT",
        nodeId: "jupiter_node",
        factionId: "opponent",
        reason: "arrived-this-turn",
        amount: 0
      })
    );

    const workedNextTurn = advanceTurn(arrived, content, ["opponent"]);

    expect(workedNextTurn.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node",
        factionId: "opponent",
        amount: 2
      })
    );
  });

  it("does not produce resources for a stationary ship on a barren node", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "venus_node", factionId: "player", shipCount: 1 }]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.factionDv.player).toBe(10);
    expect(next.shipyardProgress).toEqual([]);
    expect(next.debugEvents).toEqual([]);
  });

  it("advances shipyard progress, keeps it on empty nodes, and lets another faction continue it", () => {
    const content = loadContent();
    const worked = applyCommand(
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(worked.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 1,
      workerFactionId: "player"
    });

    const empty = applyCommand(
      {
        ...worked,
        nodeOccupancies: []
      },
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(empty.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 1,
      workerFactionId: "player"
    });

    const continued = applyCommand(
      {
        ...empty,
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "opponent", shipCount: 1 }]
      },
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(continued.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 2,
      workerFactionId: "opponent"
    });
    expect(continued.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PROGRESS",
        factionId: "opponent",
        progress: 2
      })
    );
  });

  it("keeps shipyard progress while a worker burns away and continues after return", () => {
    const content = loadContent();
    const withProgress = createInitialGameState({
      factionDv: { player: 40, opponent: 10 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
      shipyardProgress: [{ nodeId: "mars_node", progress: 1, workerFactionId: "player" }]
    });
    const orderedAway = applyCommand(
      withProgress,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node"
      },
      content
    );
    const away = applyCommand(orderedAway, ADVANCE_TURN_COMMAND, content);

    expect(away.nodeOccupancies).not.toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(away.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 1,
      workerFactionId: "player"
    });

    const awayArrivalTurn = orderedAway.pendingBurnOrders[0]?.arrivalTurn ?? orderedAway.turn;
    let readyToReturn = away;

    while (readyToReturn.turn < awayArrivalTurn) {
      readyToReturn = applyCommand(readyToReturn, ADVANCE_TURN_COMMAND, content);
    }

    const orderedBack = applyCommand(
      readyToReturn,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "deimos_node",
        destinationNodeId: "mars_node"
      },
      content
    );
    const returnArrivalTurn = orderedBack.pendingBurnOrders[0]?.arrivalTurn ?? orderedBack.turn;
    let returned = orderedBack;

    while (returned.turn < returnArrivalTurn) {
      returned = applyCommand(returned, ADVANCE_TURN_COMMAND, content);
    }

    expect(returned.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(returned.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 1,
      workerFactionId: "player"
    });

    const continued = applyCommand(returned, ADVANCE_TURN_COMMAND, content);

    expect(continued.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 2,
      workerFactionId: "player"
    });
  });

  it("does not advance AI shipyard production on the same turn a worker arrives by burn", () => {
    const content = loadContent();
    const start = createInitialGameState({
      factionDv: { player: 10, opponent: 80, ai_2: 10 },
      nodeOccupancies: [
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const ordered = applyCommand(
      start,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "venus_node",
        destinationNodeId: "mercury_node",
        factionId: "opponent"
      },
      content
    );
    const arrivalTurn = ordered.pendingBurnOrders[0]?.arrivalTurn ?? ordered.turn;
    let arrived = ordered;

    while (arrived.turn < arrivalTurn) {
      arrived = advanceTurn(arrived, content, ["opponent"]);
    }

    expect(arrived.nodeOccupancies).toContainEqual({
      nodeId: "mercury_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(arrived.shipyardProgress).not.toContainEqual(
      expect.objectContaining({ nodeId: "mercury_node" })
    );
    expect(arrived.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PROGRESS",
        nodeId: "mercury_node",
        factionId: "opponent"
      })
    );

    const workedNextTurn = advanceTurn(arrived, content, ["opponent"]);

    expect(workedNextTurn.shipyardProgress).toContainEqual({
      nodeId: "mercury_node",
      progress: 1,
      workerFactionId: "opponent"
    });
  });

  it("produces a ship, queues mandatory launch, and resets shipyard progress at five work turns", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
      shipyardProgress: [{ nodeId: "mars_node", progress: 4 }]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.shipyardProgress).not.toContainEqual({ nodeId: "mars_node", progress: 5 });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 2
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIP_PRODUCED",
        nodeId: "mars_node"
      })
    );
    expect(next.mandatoryLaunches).toContainEqual(
      expect.objectContaining({
        nodeId: "mars_node",
        factionId: "player",
        createdTurn: next.turn
      })
    );
  });

  it("rejects same-faction stacks on non-contested nodes unless an unresolved mandatory launch allows them", () => {
    const illegalStack = createInitialGameState({
      nodeOccupancies: [{ nodeId: "venus_node", factionId: "player", shipCount: 2 }]
    });
    const temporaryMandatoryLaunchStack = createInitialGameState({
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 2 }],
      mandatoryLaunches: [
        {
          id: "launch:player:mars_node:T1:0",
          nodeId: "mars_node",
          factionId: "player",
          createdTurn: 1
        }
      ]
    });

    expect(validateNoNonContestedSameFactionStacks(illegalStack)).toEqual([
      "Non-contested node venus_node stacks 2 player ships (allowed 1)."
    ]);
    expect(validateNoNonContestedSameFactionStacks(temporaryMandatoryLaunchStack)).toEqual([]);
  });

  it("logs a bug when turn resolution leaves a same-faction stack on a non-contested node", () => {
    const next = advanceTurn(
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "venus_node", factionId: "player", shipCount: 2 }]
      })
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "NODE_STACKING_INVARIANT_VIOLATION",
        nodeId: "venus_node",
        factionId: "player",
        phase: "turn_resolution",
        rule: "non-contested node cannot contain shipCount > 1 for same faction",
        expected: "at most one ship per faction unless unresolved mandatory launch",
        actual: "player shipCount 2",
        occupantsByFaction: { player: 2 },
        contested: false
      })
    );
    expect(
      next.debugEvents.find((event) => event.type === "NODE_STACKING_INVARIANT_VIOLATION")?.message
    ).toContain("BUG DETECTED");
  });

  it("suspends shipyard production while Deimos is already contested", () => {
    const content = loadContentWithDeimosShipyard();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 40, opponent: 40 },
        nodeOccupancies: [
          { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
          { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "deimos_node", progress: 4, workerFactionId: "player" }]
      }),
      content,
      []
    );

    expect(next.shipyardProgress).toContainEqual({
      nodeId: "deimos_node",
      progress: 4,
      workerFactionId: "player"
    });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "deimos_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "deimos_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "deimos_node",
      factionId: "player",
      shipCount: 2
    });
    expect(next.mandatoryLaunches).not.toContainEqual(
      expect.objectContaining({ nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "MANDATORY_LAUNCH", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED",
        nodeId: "deimos_node",
        contested: true,
        progressBefore: 4,
        progressAfter: 4,
        productionAllowed: false,
        occupantsByFaction: { opponent: 1, player: 1 }
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION" })
    );
  });

  it("suspends shipyard production for the whole turn when contested upkeep removes one side", () => {
    const content = loadContentWithDeimosShipyard();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 0, opponent: 40 },
        nodeOccupancies: [
          { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
          { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "deimos_node", progress: 4, workerFactionId: "player" }]
      }),
      content,
      []
    );

    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "deimos_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "deimos_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "deimos_node",
      progress: 4,
      workerFactionId: "player"
    });
    expect(next.mandatoryLaunches).not.toContainEqual(
      expect.objectContaining({ nodeId: "deimos_node" })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_CHECK",
        nodeId: "deimos_node",
        contested: true,
        progressBefore: 4,
        progressAfter: 4,
        productionAllowed: false,
        reason: "contested-at-turn-start",
        occupantsByFaction: { opponent: 1 }
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED",
        nodeId: "deimos_node",
        reason: "contested-at-turn-start"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "MANDATORY_LAUNCH", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIPYARD_PROGRESS", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION" })
    );
  });

  it("suspends shipyard production when a same-turn enemy arrival contests Deimos", () => {
    const content = loadContentWithDeimosShipyard();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 40, opponent: 40 },
        nodeOccupancies: [{ nodeId: "deimos_node", factionId: "player", shipCount: 1 }],
        activeBurnTransits: [
          {
            id: "opponent-arriving-deimos",
            originNodeId: "mars_node",
            destinationNodeId: "deimos_node",
            burnCost: 0,
            etaTurns: 1,
            issuedTurn: 0,
            arrivalTurn: 1,
            originPosition: { x: 0, y: 0 },
            destinationPositionAtArrival: computeBodyPosition(content, "deimos", 1),
            factionId: "opponent",
            shipCount: 1,
            departedTurn: 0
          }
        ],
        shipyardProgress: [{ nodeId: "deimos_node", progress: 4, workerFactionId: "player" }]
      }),
      content,
      []
    );
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "deimos_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "deimos_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "deimos_node",
      progress: 4,
      workerFactionId: "player"
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "deimos_node",
      factionId: "player",
      shipCount: 2
    });
    expect(next.mandatoryLaunches).not.toContainEqual(
      expect.objectContaining({ nodeId: "deimos_node" })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_CHECK",
        nodeId: "deimos_node",
        contested: true,
        progressBefore: 4,
        progressAfter: 4,
        productionAllowed: false,
        reason: "contested",
        occupantsByFaction: { opponent: 1, player: 1 }
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED",
        nodeId: "deimos_node"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "MANDATORY_LAUNCH", nodeId: "deimos_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION" })
    );
  });

  it("lets an enemy shipyard produce and mandatory-launch a ship legally", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 10, opponent: 40 },
      nodeOccupancies: [{ nodeId: "mercury_node", factionId: "opponent", shipCount: 1 }],
      shipyardProgress: [{ nodeId: "mercury_node", progress: 4, workerFactionId: "opponent" }]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.shipyardProgress).not.toContainEqual(
      expect.objectContaining({ nodeId: "mercury_node" })
    );
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mercury_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.mandatoryLaunches).toEqual([]);
    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "mercury_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIP_PRODUCED",
        nodeId: "mercury_node",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH",
        nodeId: "mercury_node",
        factionId: "opponent"
      })
    );
    expect(next.factionDv.opponent).toBeLessThan(40);
    const automaticLaunchTransit = next.activeBurnTransits.find((transit) => {
      return transit.factionId === "opponent" && transit.originNodeId === "mercury_node";
    });
    expect(automaticLaunchTransit?.mandatoryLaunchId).toBe(automaticLaunchTransit?.id);
  });

  it("lets AI shipyards produce one ship after five eligible work turns in two and three player games", () => {
    const content = loadContent();
    const scenarios = [
      {
        gameMode: "2p",
        factionId: "opponent",
        shipyardNodeId: "mercury_node",
        tritiumNodeId: "jupiter_node",
        aiControlledFactions: ["opponent"]
      },
      {
        gameMode: "3p",
        factionId: "ai_2",
        shipyardNodeId: "pluto_charon_node",
        tritiumNodeId: "neptune_node",
        aiControlledFactions: ["ai_2"]
      }
    ] as const;

    for (const scenario of scenarios) {
      let state = createInitialGameState({
        gameMode: scenario.gameMode,
        factionDv: { player: 80, opponent: 80, ai_2: 80 },
        nodeOccupancies: [
          {
            nodeId: scenario.shipyardNodeId,
            factionId: scenario.factionId,
            shipCount: 1
          },
          {
            nodeId: scenario.tritiumNodeId,
            factionId: scenario.factionId,
            shipCount: 1
          }
        ]
      });

      for (let progress = 1; progress < 5; progress += 1) {
        state = advanceTurn(state, content, scenario.aiControlledFactions);

        expect(state.shipyardProgress).toContainEqual({
          nodeId: scenario.shipyardNodeId,
          progress,
          workerFactionId: scenario.factionId
        });
        expect(state.debugEvents).not.toContainEqual(
          expect.objectContaining({
            type: "SHIP_PRODUCED",
            nodeId: scenario.shipyardNodeId,
            factionId: scenario.factionId
          })
        );
      }

      state = advanceTurn(state, content, scenario.aiControlledFactions);

      expect(state.shipyardProgress).not.toContainEqual(
        expect.objectContaining({ nodeId: scenario.shipyardNodeId })
      );
      expect(state.nodeOccupancies).toContainEqual({
        nodeId: scenario.shipyardNodeId,
        factionId: scenario.factionId,
        shipCount: 1
      });
      expect(state.mandatoryLaunches).not.toContainEqual(
        expect.objectContaining({
          nodeId: scenario.shipyardNodeId,
          factionId: scenario.factionId
        })
      );
      expect(state.activeBurnTransits).toContainEqual(
        expect.objectContaining({
          originNodeId: scenario.shipyardNodeId,
          factionId: scenario.factionId,
          shipCount: 1
        })
      );
      expect(state.debugEvents).toContainEqual(
        expect.objectContaining({
          type: "SHIP_PRODUCED",
          nodeId: scenario.shipyardNodeId,
          factionId: scenario.factionId,
          progressBefore: 4,
          progressAfter: 0
        })
      );
    }
  });

  it("enemy FIREs only after it cannot Work or make an affordable expansion burn", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 2, opponent: 4 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);

    expect(next.factionDv.opponent).toBe(4);
    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "FIRE_LAUNCHED",
        nodeId: "venus_node",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "venus_node",
        factionId: "opponent"
      })
    );
  });

  it("keeps the NOFIRE profile from launching normal FIRE pressure", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 2, opponent: 4 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const next = advanceTurn(state, content, ["opponent"], {
      factionStrategyProfiles: { opponent: "NOFIRE" }
    });

    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node",
        reason: "firevsai:nofire-alpha-strike-only"
      })
    );
  });

  it("keeps AI level 0 limited to BURN and WORK without alpha-strike FIRE exceptions", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 0, opponent: 4 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const next = advanceTurn(state, content, ["opponent"], { aiLevel: 0 });

    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({ factionId: "opponent" })
    );
    expect(next.pendingFireOrders).not.toContainEqual(
      expect.objectContaining({ factionId: "opponent" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "FIRE_LAUNCHED",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        reason: "ai-level-0:fire-disabled"
      })
    );
    expect(
      next.activeBurnTransits.some((transit) => transit.factionId === "opponent") ||
        next.shipyardProgress.some(
          (progress) =>
            progress.nodeId === "mercury_node" &&
            progress.workerFactionId === "opponent" &&
            progress.progress > 0
        )
    ).toBe(true);
  });

  it("enemy can FIRE at critical dV because FIRE has no dV cost", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 0, opponent: 3 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.factionDv.opponent).toBe(3);
    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.activeBurnTransits).toEqual([]);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        reason: "critical-dv"
      })
    );
  });

  it("enemy rejects FIRE when the target can comfortably Evade", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 4 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toEqual([]);
    expect(next.activeBurnTransits).toEqual([]);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        reason: "fire:harmless-evade-tax"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_FIRE_REJECTED_HARMLESS_EVADE_TAX",
        factionId: "opponent",
        action: "FIRE",
        reason: "fire:harmless-evade-tax"
      })
    );
  });

  it("values Evade tax when it pressures a near-complete shipyard into insolvency", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        turn: 5,
        factionDv: { player: 5, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_EVADE_TAX_VALUED",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_FIRE_REJECTED_HARMLESS_EVADE_TAX",
        factionId: "opponent",
        targetNodeId: "mars_node"
      })
    );
  });

  it("enemy rejects voluntary contested entry when upkeep would break its reserve", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        turn: 7,
        factionDv: { player: 10, opponent: 6 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );
    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        destinationNodeId: "mars_node"
      })
    );
    expect(
      next.debugEvents.some((event) => {
        return (
          event.type === "AI_REJECTED_ACTION" &&
          event.factionId === "opponent" &&
          event.action === "BURN" &&
          event.reason?.startsWith("contested-entry:") === true
        );
      })
    ).toBe(true);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_SUSTAINABILITY_CHECK",
        factionId: "opponent",
        destinationNodeId: "mars_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_REJECTED_UNSUSTAINABLE",
        factionId: "opponent",
        destinationNodeId: "mars_node"
      })
    );
  });

  it("checks contested sustainability and rejects an insolvent false-recovery exit", () => {
    const content = loadContent();
    const next = advanceTurn(
      createInitialGameState({
        turn: 4,
        factionDv: { player: 20, opponent: 6 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "player", shipCount: 1 }
        ]
      }),
      content
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_SUSTAINABILITY_CHECK",
        factionId: "opponent",
        nodeId: "mars_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_CONSIDERED_ACTION",
        factionId: "opponent",
        nodeId: "mars_node",
        action: "LEAVE_CONTESTED"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        nodeId: "mars_node",
        action: "LEAVE_CONTESTED",
        reason: "no-legal-exit"
      })
    );
  });

  it("treats zero controlled shipyards as an emergency and sends a mobile ship to recover one", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        turn: 7,
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        destinationNodeId: "mercury_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_INTENT_SET",
        factionId: "opponent",
        intentKind: "recover-shipyard",
        targetNodeId: "mercury_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node",
        factionId: "opponent"
      })
    );
  });

  it("lets shipyard emergency accept reserve risk to recover a shipyard", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 6 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        destinationNodeId: "mercury_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_DECISION",
        factionId: "opponent",
        action: "BURN",
        reason: "shipyard-emergency:recover-shipyard",
        destinationNodeId: "mercury_node"
      })
    );
  });

  it("enemy prioritizes a player shipyard worker with saved progress", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 2, opponent: 4 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 2, workerFactionId: "player" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
  });

  it("rejects isolated FIRE against a shipyard near production when Evade is affordable", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 4 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 3, workerFactionId: "player" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toEqual([]);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node",
        reason: "fire:harmless-evade-tax"
      })
    );
  });

  it("rejects useless missile stacking when no threshold changes", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      turn: 5,
      factionDv: { player: 20, opponent: 4 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, baseState, "venus_node", "mars_node");

    expect(firePlan).not.toBeNull();

    const next = applyCommand(
      {
        ...baseState,
        pendingFireOrders: [
          {
            id: "opponent-fire-mars-existing",
            originNodeId: "deimos_node",
            targetNodeId: "mars_node",
            missileEtaTurns: firePlan?.missileEtaTurns ?? 2,
            issuedTurn: baseState.turn,
            impactTurn: firePlan?.impactTurn ?? baseState.turn + 2,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player"
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );
    const missilesTargetingMars = next.activeMissiles.filter((missile) => {
      return missile.factionId === "opponent" && missile.targetNodeId === "mars_node";
    });

    expect(missilesTargetingMars).toHaveLength(1);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node",
        reason: "fire:stacking-no-threshold-change"
      })
    );
  });

  it("allows stacked FIRE when the extra missile crosses the Evade payment threshold", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      turn: 5,
      factionDv: { player: 2, opponent: 6 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, baseState, "venus_node", "mars_node");

    expect(firePlan).not.toBeNull();

    const next = applyCommand(
      {
        ...baseState,
        pendingFireOrders: [
          {
            id: "opponent-fire-mars-existing-a",
            originNodeId: "deimos_node",
            targetNodeId: "mars_node",
            missileEtaTurns: firePlan?.missileEtaTurns ?? 2,
            issuedTurn: baseState.turn,
            impactTurn: firePlan?.impactTurn ?? baseState.turn + 2,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player"
          },
          {
            id: "opponent-fire-mars-existing-b",
            originNodeId: "mercury_node",
            targetNodeId: "mars_node",
            missileEtaTurns: firePlan?.missileEtaTurns ?? 2,
            issuedTurn: baseState.turn,
            impactTurn: firePlan?.impactTurn ?? baseState.turn + 2,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player"
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );
    const missilesTargetingMars = next.activeMissiles.filter((missile) => {
      return missile.factionId === "opponent" && missile.targetNodeId === "mars_node";
    });

    expect(missilesTargetingMars.length).toBeGreaterThanOrEqual(3);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node",
        reason: "fire:stacking-no-threshold-change"
      })
    );
  });

  it("allows stacked FIRE into a contested target because Evade is unavailable", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      turn: 5,
      factionDv: { player: 10, opponent: 2 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const venusFirePlan = calculateFirePlan(content, baseState, "venus_node", "mars_node");

    expect(venusFirePlan).not.toBeNull();

    const next = applyCommand(
      {
        ...baseState,
        pendingFireOrders: [
          {
            id: "opponent-fire-mars-existing",
            originNodeId: "deimos_node",
            targetNodeId: "mars_node",
            missileEtaTurns: venusFirePlan?.missileEtaTurns ?? 2,
            issuedTurn: baseState.turn,
            impactTurn: venusFirePlan?.impactTurn ?? baseState.turn + 2,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player"
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );
    const missilesTargetingMars = next.activeMissiles.filter((missile) => {
      return missile.factionId === "opponent" && missile.targetNodeId === "mars_node";
    });

    expect(missilesTargetingMars.length).toBeGreaterThanOrEqual(2);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node",
        reason: "fire:stacking-no-threshold-change"
      })
    );
  });

  it("allows stacked FIRE against a vulnerable 4/5 shipyard", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      turn: 5,
      factionDv: { player: 4, opponent: 6 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ],
      shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
    });
    const firePlan = calculateFirePlan(content, baseState, "venus_node", "mars_node");

    expect(firePlan).not.toBeNull();

    const next = applyCommand(
      {
        ...baseState,
        pendingFireOrders: [
          {
            id: "opponent-fire-mars-existing",
            originNodeId: "deimos_node",
            targetNodeId: "mars_node",
            missileEtaTurns: firePlan?.missileEtaTurns ?? 2,
            issuedTurn: baseState.turn,
            impactTurn: firePlan?.impactTurn ?? baseState.turn + 2,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player"
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );
    const missilesTargetingMars = next.activeMissiles.filter((missile) => {
      return missile.factionId === "opponent" && missile.targetNodeId === "mars_node";
    });

    expect(missilesTargetingMars.length).toBeGreaterThanOrEqual(2);
  });

  it("allows stacked FIRE into a crowded node because each missile taxes Evade separately", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      turn: 5,
      factionDv: { player: 10, opponent: 1 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const venusFirePlan = calculateFirePlan(content, baseState, "venus_node", "mars_node");

    expect(venusFirePlan).not.toBeNull();

    const next = applyCommand(
      {
        ...baseState,
        pendingFireOrders: [
          {
            id: "opponent-fire-mars-existing",
            originNodeId: "deimos_node",
            targetNodeId: "mars_node",
            missileEtaTurns: venusFirePlan?.missileEtaTurns ?? 2,
            issuedTurn: baseState.turn,
            impactTurn: venusFirePlan?.impactTurn ?? baseState.turn + 2,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player"
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );
    const missilesTargetingMars = next.activeMissiles.filter((missile) => {
      return missile.factionId === "opponent" && missile.targetNodeId === "mars_node";
    });

    expect(missilesTargetingMars.length).toBeGreaterThanOrEqual(2);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_ACTION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node",
        reason: "already-targeted"
      })
    );
  });

  it("does not expose HOLD_WORK or HOLD_SHIPYARD actions or warning types", () => {
    const source = readFileSync(
      new URL("../../src/core/simulation/gameState.ts", import.meta.url),
      "utf8"
    );
    const types = readFileSync(new URL("../../src/core/state/types.ts", import.meta.url), "utf8");

    expect(source).not.toContain("HOLD_WORK");
    expect(source).not.toContain("HOLD_SHIPYARD");
    expect(types).not.toContain("HOLD_WORK");
    expect(types).not.toContain("HOLD_SHIPYARD");
    expect(types).not.toContain("STACKING_NO_THRESHOLD_CHANGE");
  });

  it("keeps strategic AI phases internal and conservative FIRE tritium-first gated", () => {
    const source = readFileSync(
      new URL("../../src/core/simulation/gameState.ts", import.meta.url),
      "utf8"
    );
    const types = readFileSync(new URL("../../src/core/state/types.ts", import.meta.url), "utf8");

    expect(source).toContain('"OPENING_CONSERVATIVE"');
    expect(source).toContain('"RECOVERY_CONSERVATIVE"');
    expect(source).toContain('"STABLE_EXPANSION"');
    expect(source).toContain('"FINISH_MODE"');
    expect(source).toContain("selectAiStrategicPhase");
    expect(source).toContain("isAiConservativeStrategicPhase(strategicRead.phase)");
    expect(source).toContain("fire:conservative-tritium-first");
    expect(source).toContain("evaluateBurnAwayDestination");
    expect(source).toContain("AI_BURN_AWAY_DESTINATION_EVAL");
    expect(types).toContain('"AI_PHASE_SELECTED"');
    expect(types).toContain('"AI_FIRE_REJECTED_CONSERVATIVE_TRITIUM_FIRST"');
    expect(types).toContain('"AI_BURN_AWAY_DESTINATION_EVAL"');
  });

  it("keeps auto-work automatic when no BURN/FIRE/EVADE/contested blocker exists", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node",
        factionId: "player",
        amount: 2
      })
    );
  });

  it("delays opening contested plus FIRE alpha strikes against productive starts", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    const hasBurnPressure = next.activeBurnTransits.some((transit) => {
      return transit.factionId === "opponent" && transit.destinationNodeId === "mars_node";
    });
    const hasMissilePressure = next.activeMissiles.some((missile) => {
      return missile.factionId === "opponent" && missile.targetNodeId === "mars_node";
    });

    expect(hasBurnPressure && hasMissilePressure).toBe(false);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "ALPHA_STRIKE_THREAT",
        factionId: "opponent",
        targetFactionId: "player",
        targetNodeId: "mars_node",
        reason: "delayed:opening-alpha-strike-delayed",
        evadeBlocked: true
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_COMBO_REJECTED",
        factionId: "opponent",
        targetNodeId: "mars_node",
        reason: "opening-alpha-strike-delayed"
      })
    );
  });

  it("uses an existing AI contested lock as valid support for contested plus FIRE", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        destinationNodeId: "mars_node"
      })
    );
    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_COMBO_EXECUTED",
        factionId: "opponent",
        targetNodeId: "mars_node",
        reason: "existing-contested-lock"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_KILLBOX_SELECTED",
        factionId: "opponent",
        targetNodeId: "mars_node",
        reason: "existing-contested-lock",
        evadeBlocked: true
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_COMBO_REJECTED",
        factionId: "opponent",
        targetNodeId: "mars_node",
        reason: "no-contesting-ship"
      })
    );
  });

  it("allows the NOFIRE profile to FIRE only for an executed alpha strike", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 10, opponent: 10 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const next = advanceTurn(state, content, ["opponent"], {
      factionStrategyProfiles: { opponent: "NOFIRE" }
    });

    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "ALPHA_STRIKE_THREAT",
        factionId: "opponent",
        targetFactionId: "player",
        targetNodeId: "mars_node",
        reason: "executed:tactically-earned"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_COMBO_EXECUTED",
        factionId: "opponent",
        targetNodeId: "mars_node",
        reason: "existing-contested-lock"
      })
    );
  });

  it("does not let AI level 0 FIRE through an otherwise valid alpha strike", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 10, opponent: 10 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const next = advanceTurn(state, content, ["opponent"], { aiLevel: 0 });

    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({ factionId: "opponent" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_COMBO_EXECUTED",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "FIRE_LAUNCHED",
        factionId: "opponent"
      })
    );
  });

  it("lets AI target the destination node of an enemy ship in transit", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 2, opponent: 4 },
      nodeOccupancies: [
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, baseState, "venus_node", "mars_node");

    if (firePlan === null) {
      throw new Error("Expected FIRE plan from Venus to Mars.");
    }

    const next = applyCommand(
      {
        ...baseState,
        activeBurnTransits: [
          {
            id: "player-arriving-mars",
            originNodeId: "deimos_node",
            destinationNodeId: "mars_node",
            burnCost: 0,
            etaTurns: firePlan.impactTurn,
            issuedTurn: -1,
            arrivalTurn: firePlan.impactTurn,
            originPosition: { x: 0, y: 0 },
            destinationPositionAtArrival: firePlan.targetPositionAtImpact,
            factionId: "player",
            shipCount: 1,
            departedTurn: 0
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        targetNodeId: "mars_node",
        targetFactionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_DECISION",
        factionId: "opponent",
        action: "FIRE",
        targetNodeId: "mars_node"
      })
    );
  });

  it("enemy mobile burns toward the nearest useful neutral productive node first", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 10, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const playerFireOrder = applyCommand(
      baseState,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "deimos_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const expectedPlan = calculateBurnPlan(content, playerFireOrder, "venus_node", "jupiter_node");

    if (expectedPlan === null) {
      throw new Error("Expected enemy mobile BURN plan from Venus to Jupiter.");
    }

    const next = applyCommand(playerFireOrder, ADVANCE_TURN_COMMAND, content);

    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        destinationNodeId: "jupiter_node"
      })
    );
    expect(next.factionDv.opponent).toBe(20 - expectedPlan.burnCost);
    expect(next.factionDv.opponent).toBeGreaterThanOrEqual(0);
  });

  it("enemy does not assign unaffordable movement or go negative dV", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 10, opponent: 0 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const playerFireOrder = applyCommand(
      baseState,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const next = applyCommand(playerFireOrder, ADVANCE_TURN_COMMAND, content);

    expect(next.factionDv.opponent).toBe(0);
    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node"
      })
    );
  });

  it("requires the incumbent ship to clear its shipyard before other player burns", () => {
    const content = loadContent();
    const produced = applyCommand(
      createInitialGameState({
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "pluto_charon_node", factionId: "player", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4 }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(produced.mandatoryLaunches).toHaveLength(1);

    const skipped = applyCommand(produced, ADVANCE_TURN_COMMAND, content);

    expect(skipped).toEqual(produced);

    const blocked = applyCommand(
      produced,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "pluto_charon_node",
        destinationNodeId: "neptune_node"
      },
      content
    );

    expect(blocked.pendingBurnOrders).toEqual([]);
    expect(blocked.mandatoryLaunches).toEqual(produced.mandatoryLaunches);

    const ordered = applyCommand(
      produced,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(ordered.pendingBurnOrders).toHaveLength(1);
    expect(ordered.pendingBurnOrders[0]?.mandatoryLaunchId).toBe(produced.mandatoryLaunches[0]?.id);
    expect(ordered.mandatoryLaunches).toEqual([]);

    const advanced = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);

    expect(advanced.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(advanced.pendingBurnOrders).toEqual([]);
    expect(advanced.activeBurnTransits).toHaveLength(1);
  });

  it("resolves multiple mandatory launches one shipyard at a time before Next Turn can advance", () => {
    const content = loadContent();
    const produced = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "pluto_charon_node", factionId: "player", shipCount: 1 }
        ],
        shipyardProgress: [
          { nodeId: "mars_node", progress: 4 },
          { nodeId: "pluto_charon_node", progress: 4 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(produced.mandatoryLaunches.map((launch) => launch.nodeId)).toEqual([
      "mars_node",
      "pluto_charon_node"
    ]);
    expect(applyCommand(produced, ADVANCE_TURN_COMMAND, content)).toEqual(produced);

    const blockedOutOfOrder = applyCommand(
      produced,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "pluto_charon_node",
        destinationNodeId: "hydra_node"
      },
      content
    );

    expect(blockedOutOfOrder).toEqual(produced);

    const firstOrdered = applyCommand(
      produced,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(firstOrdered.mandatoryLaunches.map((launch) => launch.nodeId)).toEqual([
      "pluto_charon_node"
    ]);
    expect(firstOrdered.pendingBurnOrders).toHaveLength(1);
    expect(applyCommand(firstOrdered, ADVANCE_TURN_COMMAND, content)).toEqual(firstOrdered);

    const secondOrdered = applyCommand(
      firstOrdered,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "pluto_charon_node",
        destinationNodeId: "neptune_node"
      },
      content
    );

    expect(secondOrdered.mandatoryLaunches).toEqual([]);
    expect(secondOrdered.pendingBurnOrders).toHaveLength(2);

    const advanced = applyCommand(secondOrdered, ADVANCE_TURN_COMMAND, content);

    expect(advanced.turn).toBe(secondOrdered.turn + 1);
    expect(advanced.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(advanced.nodeOccupancies).toContainEqual({
      nodeId: "pluto_charon_node",
      factionId: "player",
      shipCount: 1
    });
    expect(advanced.activeBurnTransits).toHaveLength(2);
  });

  it("cancels a mandatory-launch burn order and restores the launch lock", () => {
    const content = loadContent();
    const produced = applyCommand(
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4 }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );
    const ordered = applyCommand(
      produced,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node"
      },
      content
    );
    const cancelled = applyCommand(ordered, {
      type: "CANCEL_PENDING_BURN_ORDER",
      originNodeId: "mars_node"
    });

    expect(cancelled.pendingBurnOrders).toEqual([]);
    expect(cancelled.mandatoryLaunches).toEqual(produced.mandatoryLaunches);
    expect(applyCommand(cancelled, ADVANCE_TURN_COMMAND, content)).toEqual(cancelled);
  });

  it("rejects mandatory launch burns into contested destination nodes", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 2 },
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }
      ],
      mandatoryLaunches: [
        {
          id: "launch:player:mars_node:T1:0",
          nodeId: "mars_node",
          factionId: "player",
          createdTurn: 1
        }
      ]
    });
    const rejected = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "jupiter_node"
      },
      content
    );

    expect(rejected).toEqual(state);
    expect(rejected.mandatoryLaunches).toEqual(state.mandatoryLaunches);
    expect(rejected.pendingBurnOrders).toEqual([]);
  });

  it("allows a mandatory launch burn toward an enemy shipyard with a pending enemy mandatory launch", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 2 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 2 }
      ],
      mandatoryLaunches: [
        {
          id: "launch:opponent:mars_node:T1:0",
          nodeId: "mars_node",
          factionId: "opponent",
          createdTurn: 1
        },
        {
          id: "launch:player:jupiter_node:T1:1",
          nodeId: "jupiter_node",
          factionId: "player",
          createdTurn: 1
        }
      ]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "jupiter_node",
        destinationNodeId: "mars_node"
      },
      content
    );

    expect(ordered.pendingBurnOrders).toHaveLength(1);
    expect(ordered.pendingBurnOrders[0]).toEqual(
      expect.objectContaining({
        originNodeId: "jupiter_node",
        destinationNodeId: "mars_node",
        factionId: "player",
        shipCount: 1,
        mandatoryLaunchId: "launch:player:jupiter_node:T1:1"
      })
    );
    expect(ordered.mandatoryLaunches).toEqual([state.mandatoryLaunches[0]]);
  });

  it("allows a mandatory launch burn toward an enemy shipyard with an already queued enemy launch", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 2 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 2 }
      ],
      mandatoryLaunches: [
        {
          id: "launch:player:jupiter_node:T1:1",
          nodeId: "jupiter_node",
          factionId: "player",
          createdTurn: 1
        }
      ]
    });
    const opponentLaunchPlan = calculateBurnPlan(content, baseState, "mars_node", "deimos_node");

    expect(opponentLaunchPlan).not.toBeNull();

    const state = {
      ...baseState,
      pendingBurnOrders: [
        {
          ...opponentLaunchPlan!,
          id: "burn:opponent:mars_node:deimos_node:T1",
          factionId: "opponent" as const,
          shipCount: 1,
          mandatoryLaunchId: "launch:opponent:mars_node:T1:0"
        }
      ]
    };
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "jupiter_node",
        destinationNodeId: "mars_node"
      },
      content
    );

    expect(ordered.pendingBurnOrders).toHaveLength(2);
    expect(ordered.pendingBurnOrders).toContainEqual(
      expect.objectContaining({
        originNodeId: "jupiter_node",
        destinationNodeId: "mars_node",
        factionId: "player",
        shipCount: 1,
        mandatoryLaunchId: "launch:player:jupiter_node:T1:1"
      })
    );
    expect(ordered.mandatoryLaunches).toEqual([]);
  });

  it("reassigns mandatory launch burns without leaving duplicate hidden routes", () => {
    const content = loadContent();
    const produced = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4 }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );
    const firstOrder = applyCommand(
      produced,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node"
      },
      content
    );
    const relocked = applyCommand(firstOrder, {
      type: "CANCEL_PENDING_BURN_ORDER",
      originNodeId: "mars_node"
    });
    const secondOrder = applyCommand(
      relocked,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(relocked.mandatoryLaunches).toEqual(produced.mandatoryLaunches);
    expect(secondOrder.mandatoryLaunches).toEqual([]);
    expect(secondOrder.pendingBurnOrders).toHaveLength(1);
    expect(secondOrder.pendingBurnOrders[0]).toEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node",
        mandatoryLaunchId: produced.mandatoryLaunches[0]?.id
      })
    );
  });

  it("rejects burns that would stack player ships at the destination", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 40, opponent: 10 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "pluto_charon_node", factionId: "player", shipCount: 1 }
      ]
    });
    const occupiedDestination = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node"
      },
      content
    );

    expect(occupiedDestination.pendingBurnOrders).toEqual([]);

    const firstOrder = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const duplicatePendingDestination = applyCommand(
      firstOrder,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "pluto_charon_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(firstOrder.pendingBurnOrders).toHaveLength(1);
    expect(duplicatePendingDestination.pendingBurnOrders).toEqual(firstOrder.pendingBurnOrders);
  });

  it("rejects burns that would put a third ship at a destination", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 100, opponent: 100 },
      nodeOccupancies: [
        { nodeId: "deimos_node", factionId: "player", shipCount: 2 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const twoShipBurn = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "deimos_node",
        destinationNodeId: "saturn_node",
        shipCount: 2
      },
      content
    );
    const thirdShipBurn = applyCommand(
      twoShipBurn,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "venus_node",
        destinationNodeId: "saturn_node",
        factionId: "opponent"
      },
      content
    );

    expect(twoShipBurn.pendingBurnOrders).toHaveLength(1);
    expect(twoShipBurn.pendingBurnOrders[0]).toEqual(
      expect.objectContaining({
        destinationNodeId: "saturn_node",
        shipCount: 2
      })
    );
    expect(thirdShipBurn.pendingBurnOrders).toEqual(twoShipBurn.pendingBurnOrders);
  });

  it("suspends completion at 4/5 when no mandatory launch is affordable", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 0, opponent: 10 },
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4 }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 2
    });
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 4
    });
    expect(next.mandatoryLaunches).toEqual([]);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "SHIP_PRODUCED",
        nodeId: "mars_node"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH_DESTROYED",
        nodeId: "mars_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_CHECK",
        nodeId: "mars_node",
        progressBefore: 4,
        progressAfter: 4,
        productionAllowed: false,
        reason: "mandatory-launch-reserve-unavailable"
      })
    );
  });

  it("checks the 4/5 reserve after upkeep, EVADE, and an already selected BURN", () => {
    const content = loadContent();
    const planningState = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "player", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
      ],
      shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
    });
    const burnPlan = calculateBurnPlan(content, planningState, "venus_node", "moon_node");

    if (burnPlan === null) {
      throw new Error("Expected a selected Venus burn plan.");
    }

    const next = advanceTurn(
      {
        ...planningState,
        factionDv: { player: burnPlan.burnCost + 3, opponent: 40 },
        pendingBurnOrders: [
          {
            ...burnPlan,
            id: "test:pre-launch-reserve-burn",
            factionId: "player",
            shipCount: 1
          }
        ],
        activeMissiles: [
          {
            id: "test:pre-launch-reserve-evade",
            originNodeId: "saturn_node",
            targetNodeId: "deimos_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "deimos_node:player",
            launchedTurn: 0
          }
        ]
      },
      content,
      ["opponent"]
    );

    expect(next.factionDv.player).toBe(0);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_PAID",
        nodeId: "jupiter_node",
        factionId: "player",
        amount: -2
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "deimos_node",
        factionId: "player",
        amount: -1
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "BURN_DEPARTED",
        nodeId: "venus_node",
        factionId: "player",
        burnCost: burnPlan.burnCost
      })
    );
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 4,
      workerFactionId: "player"
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIPYARD_PRODUCTION_CHECK",
        nodeId: "mars_node",
        factionId: "player",
        progressBefore: 4,
        progressAfter: 4,
        productionAllowed: false,
        reason: "mandatory-launch-reserve-unavailable"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH_DESTROYED",
        nodeId: "mars_node",
        factionId: "player"
      })
    );
  });

  it("AI suspends WORK at 4/5 when no legal launch can be reserved", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 0 },
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "opponent", shipCount: 1 }],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "opponent" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_DECISION",
        nodeId: "mars_node",
        factionId: "opponent",
        action: "WORK",
        reason: "mandatory-launch:reserve-shortfall"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH_DESTROYED",
        nodeId: "mars_node",
        factionId: "opponent"
      })
    );
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 4,
      workerFactionId: "opponent"
    });
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "SHIP_PRODUCED",
        nodeId: "mars_node",
        factionId: "opponent"
      })
    );
  });

  it("AI completes a 4/5 shipyard instead of leaving it for speculative pressure", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "opponent" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SHIPYARD_COMPLETION_LOCK",
        nodeId: "mars_node",
        factionId: "opponent",
        reason: "shipyard-completion-lock"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_DECISION",
        action: "WORK"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIP_PRODUCED",
        nodeId: "mars_node",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH",
        nodeId: "mars_node",
        factionId: "opponent"
      })
    );
  });

  it("AI targets an empty shipyard with stolen saved progress before blank shipyards", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 40 },
        nodeOccupancies: [
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "uranus_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "neptune_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        destinationNodeId: "mars_node"
      })
    );
  });

  it("rejects burn orders that exceed projected dV after existing pending burns", () => {
    const content = loadContent();
    const affordablePlan = calculateBurnPlan(content, 0, "mars_node", "deimos_node");

    if (affordablePlan === null) {
      throw new Error("Expected a local Mars to Deimos BURN plan.");
    }

    const state = createInitialGameState({
      factionDv: { player: affordablePlan.burnCost, opponent: 10 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "pluto_charon_node", factionId: "player", shipCount: 1 }
      ]
    });
    const firstOrder = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node"
      },
      content
    );
    const rejected = applyCommand(
      firstOrder,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "pluto_charon_node",
        destinationNodeId: "neptune_node"
      },
      content
    );

    expect(firstOrder.pendingBurnOrders).toHaveLength(1);
    expect(rejected.pendingBurnOrders).toEqual(firstOrder.pendingBurnOrders);
    expect(rejected.factionDv.player).toBe(affordablePlan.burnCost);
  });

  it("skips Work for a ship with pending BURN and spends dV when it departs", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "player", shipCount: 1 }]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "jupiter_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const [order] = ordered.pendingBurnOrders;

    if (order === undefined) {
      throw new Error("Expected pending BURN order.");
    }

    const next = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);

    expect(next.factionDv.player).toBe(10 - order.burnCost);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "BURN_DEPARTED",
        burnCost: order.burnCost
      })
    );
  });

  it("plans FIRE with missile ETA equal to equivalent burn ETA", () => {
    const content = loadContent();
    const burnPlan = calculateBurnPlan(content, 0, "mars_node", "venus_node");
    const firePlan = calculateFirePlan(content, 0, "mars_node", "venus_node");

    if (burnPlan === null || firePlan === null) {
      throw new Error("Expected comparable BURN and FIRE plans.");
    }

    expect(firePlan.missileEtaTurns).toBe(burnPlan.etaTurns);
    expect(firePlan.impactTurn).toBe(firePlan.issuedTurn + firePlan.missileEtaTurns);
    expect(firePlan.targetPositionAtImpact).toEqual(
      createSolarSystemSnapshot(content, firePlan.impactTurn).nodes.find(
        (node) => node.id === "venus_node"
      )?.position
    );
  });

  it("creates FIRE pending only against enemy ships and blocks BURN from the same ship", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const emptyTarget = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "deimos_node"
      },
      content
    );
    const friendlyTarget = applyCommand(
      createInitialGameState({
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "deimos_node", factionId: "player", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "deimos_node"
      },
      content
    );
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const blockedBurn = applyCommand(
      ordered,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(emptyTarget.pendingFireOrders).toEqual([]);
    expect(friendlyTarget.pendingFireOrders).toEqual([]);
    expect(ordered.pendingFireOrders).toHaveLength(1);
    expect(ordered.pendingFireOrders[0]).toEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        targetNodeId: "venus_node",
        factionId: "player",
        targetFactionId: "opponent"
      })
    );
    expect(blockedBurn.pendingBurnOrders).toEqual([]);
    expect(blockedBurn.pendingFireOrders).toEqual(ordered.pendingFireOrders);
  });

  it("blocks FIRE orders from contested ships", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );

    expect(ordered.pendingFireOrders).toEqual([]);
  });

  it("creates FIRE pending against an enemy active BURN destination ghost", () => {
    const content = loadContent();
    const enemyBurnPlan = calculateBurnPlan(content, 0, "venus_node", "saturn_node");

    if (enemyBurnPlan === null) {
      throw new Error("Expected enemy BURN plan.");
    }

    const state = createInitialGameState({
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
      activeBurnTransits: [
        {
          ...enemyBurnPlan,
          id: "opponent-burn-venus-saturn",
          factionId: "opponent",
          shipCount: 1,
          etaTurns: 1,
          arrivalTurn: 1,
          departedTurn: 0
        }
      ]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "saturn_node"
      },
      content
    );

    expect(ordered.pendingFireOrders).toHaveLength(1);
    expect(ordered.pendingFireOrders[0]).toEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        targetNodeId: "saturn_node",
        factionId: "player",
        targetFactionId: "opponent",
        targetShipKey: "saturn_node:opponent"
      })
    );
  });

  it("delays FIRE against an enemy BURN destination ghost until the target arrives", () => {
    const content = loadContent();
    const enemyBurnPlan = calculateBurnPlan(content, 0, "venus_node", "saturn_node");
    const baseFirePlan = calculateFirePlan(content, 0, "mars_node", "saturn_node");
    const targetNode = content.nodes.find((node) => node.id === "saturn_node");

    if (enemyBurnPlan === null || baseFirePlan === null || targetNode === undefined) {
      throw new Error("Expected enemy BURN and player FIRE plans.");
    }

    const delayedArrivalTurn = baseFirePlan.impactTurn + 2;
    let state = createInitialGameState({
      factionDv: { player: 10, opponent: 1 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
      activeBurnTransits: [
        {
          ...enemyBurnPlan,
          id: "opponent-delayed-venus-saturn",
          factionId: "opponent",
          shipCount: 1,
          etaTurns: delayedArrivalTurn,
          arrivalTurn: delayedArrivalTurn,
          departedTurn: 0
        }
      ]
    });

    state = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "saturn_node"
      },
      content
    );

    expect(state.pendingFireOrders).toHaveLength(1);
    expect(state.pendingFireOrders[0]).toEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        targetNodeId: "saturn_node",
        factionId: "player",
        targetFactionId: "opponent",
        targetShipKey: "saturn_node:opponent",
        missileEtaTurns: delayedArrivalTurn + 1,
        impactTurn: delayedArrivalTurn + 1,
        targetPositionAtImpact: computeBodyPosition(
          content,
          targetNode.bodyId,
          delayedArrivalTurn + 1
        )
      })
    );

    state = applyCommand(state, ADVANCE_TURN_COMMAND);

    expect(state.activeMissiles).toContainEqual(
      expect.objectContaining({
        targetNodeId: "saturn_node",
        targetFactionId: "opponent",
        impactTurn: delayedArrivalTurn + 1
      })
    );

    while (state.turn < delayedArrivalTurn + 1) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    expect(state.activeMissiles).toEqual([]);
    expect(state.activeBurnTransits).toEqual([]);
    expect(state.nodeOccupancies).toContainEqual({
      nodeId: "saturn_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "saturn_node",
        factionId: "opponent",
        amount: -1
      })
    );
  });

  it("prevents a FIRE ship from working and launches the missile on Next Turn without dV cost", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "jupiter_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const next = advanceTurn(ordered, content, []);

    expect(next.factionDv.player).toBe(10);
    expect(next.pendingFireOrders).toEqual([]);
    expect(next.activeMissiles).toHaveLength(1);
    expect(next.activeMissiles[0]).toEqual(
      expect.objectContaining({
        originNodeId: "jupiter_node",
        targetNodeId: "venus_node",
        launchedTurn: next.turn
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "FIRE_LAUNCHED",
        nodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node"
      })
    );
  });

  it("decrements missile remaining turns and destroys the target ship on impact", () => {
    const content = loadContent();
    let state = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 0 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const pending = state.pendingFireOrders[0];

    if (pending === undefined) {
      throw new Error("Expected pending FIRE order.");
    }

    state = applyCommand(state, ADVANCE_TURN_COMMAND);

    const launched = state.activeMissiles[0];

    if (launched === undefined) {
      throw new Error("Expected active missile.");
    }

    expect(launched.impactTurn - state.turn).toBe(pending.missileEtaTurns - 1);

    while (state.turn < launched.impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    expect(state.activeMissiles).toEqual([]);
    expect(state.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "venus_node",
        factionId: "opponent",
        missileId: launched.id
      })
    );
  });

  it("provides a debug scenario with an enemy missile target one turn from impact", () => {
    const content = loadContent();
    const scenario = createMissileImpactTMinusOneDebugScenario(content);
    const missile = scenario.state.activeMissiles.find((candidate) => {
      return candidate.id === scenario.missileId;
    });

    expect(missile).toEqual(
      expect.objectContaining({
        originNodeId: scenario.originNodeId,
        targetNodeId: scenario.targetNodeId,
        targetFactionId: "opponent"
      })
    );
    expect(missile?.impactTurn).toBe(scenario.state.turn + 1);
    expect(scenario.state.factionDv.opponent).toBeLessThan(3);

    const next = advanceTurn(scenario.state, content);

    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({ id: scenario.missileId })
    );
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: scenario.targetNodeId,
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: scenario.targetNodeId,
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "SHIP_DESTROYED",
        nodeId: scenario.targetNodeId,
        factionId: "opponent"
      })
    );
  });

  it("provides a T-1 debug scenario where the player ship automatically evades", () => {
    const content = loadContent();
    const scenario = createEvadeTMinusOneDebugScenario(content);
    const missile = scenario.state.activeMissiles.find((candidate) => {
      return candidate.id === scenario.missileId;
    });

    expect(missile).toEqual(
      expect.objectContaining({
        factionId: "opponent",
        targetFactionId: "player",
        targetNodeId: scenario.targetNodeId
      })
    );
    expect(missile?.impactTurn).toBe(scenario.state.turn + 1);
    expect(scenario.state.factionDv.player).toBe(10);

    const next = advanceTurn(scenario.state, content);

    expect(next.factionDv.player).toBe(9);
    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({ id: scenario.missileId })
    );
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: scenario.targetNodeId,
      factionId: "player",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: scenario.targetNodeId,
        factionId: "player",
        amount: -1
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: scenario.targetNodeId,
        factionId: "player"
      })
    );
  });

  it("enemy missile travels and destroys a player ship on impact", () => {
    const content = loadContent();
    let state = applyCommand(
      createInitialGameState({
        factionDv: { player: 0, opponent: 4 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );
    const missile = state.activeMissiles.find((candidate) => {
      return candidate.factionId === "opponent" && candidate.targetNodeId === "mars_node";
    });

    if (missile === undefined) {
      throw new Error("Expected enemy missile targeting Mars.");
    }

    expect(missile.missileEtaTurns).toBeGreaterThan(1);

    while (state.turn < missile.impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    expect(state.nodeOccupancies).not.toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "mars_node",
        factionId: "player"
      })
    );
  });

  it("automatically pays Evade per impacting missile without cancelling future firing solutions", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 2 },
        nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "player", shipCount: 1 }],
        activeMissiles: [
          {
            id: "opponent-fire-jupiter-now",
            originNodeId: "venus_node",
            targetNodeId: "jupiter_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          },
          {
            id: "opponent-fire-jupiter-now-2",
            originNodeId: "mercury_node",
            targetNodeId: "jupiter_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          },
          {
            id: "opponent-fire-jupiter-later",
            originNodeId: "mars_node",
            targetNodeId: "jupiter_node",
            missileEtaTurns: 3,
            issuedTurn: 0,
            impactTurn: 3,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "jupiter_node:player",
            launchedTurn: 0
          }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.factionDv.player).toBe(8);
    expect(next.activeMissiles).toEqual([
      expect.objectContaining({
        id: "opponent-fire-jupiter-later",
        targetNodeId: "jupiter_node",
        targetFactionId: "player"
      })
    ]);
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "jupiter_node",
      factionId: "player",
      shipCount: 1
    });
    expect(
      next.debugEvents.filter((event) => {
        return event.type === "EVADE" && event.nodeId === "jupiter_node";
      })
    ).toHaveLength(2);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "jupiter_node",
        factionId: "player",
        amount: -1
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        nodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "jupiter_node"
      })
    );
  });

  it("does not let a shipyard produce on the same turn its lone ship evades", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 2 },
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }],
        activeMissiles: [
          {
            id: "opponent-fire-mars-now",
            originNodeId: "venus_node",
            targetNodeId: "mars_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player",
            launchedTurn: 0
          }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.factionDv.player).toBe(9);
    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 4,
      workerFactionId: "player"
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "mars_node",
        factionId: "player",
        amount: -1
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "SHIP_PRODUCED",
        nodeId: "mars_node"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH",
        nodeId: "mars_node"
      })
    );
  });

  it("keeps FIRE locked to an enemy transit destination until the ship arrives and evades", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 10, opponent: 3 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
    });
    const firePlan = calculateFirePlan(content, baseState, "mars_node", "venus_node");

    if (firePlan === null) {
      throw new Error("Expected FIRE plan from Mars to Venus.");
    }

    let state = applyCommand(
      {
        ...baseState,
        activeBurnTransits: [
          {
            id: "opponent-arriving-venus",
            originNodeId: "jupiter_node",
            destinationNodeId: "venus_node",
            burnCost: 0,
            etaTurns: firePlan.impactTurn,
            issuedTurn: -1,
            arrivalTurn: firePlan.impactTurn,
            originPosition: { x: 0, y: 0 },
            destinationPositionAtArrival: firePlan.targetPositionAtImpact,
            factionId: "opponent",
            shipCount: 1,
            departedTurn: 0
          }
        ]
      },
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const impactTurn = firePlan.impactTurn + 1;

    expect(state.pendingFireOrders).toContainEqual(
      expect.objectContaining({
        targetNodeId: "venus_node",
        targetFactionId: "opponent"
      })
    );

    state = applyCommand(state, ADVANCE_TURN_COMMAND);

    expect(state.activeMissiles).toContainEqual(
      expect.objectContaining({
        targetNodeId: "venus_node",
        targetFactionId: "opponent",
        impactTurn
      })
    );

    while (state.turn < impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    expect(state.factionDv.opponent).toBe(2);
    expect(state.activeMissiles).toEqual([]);
    expect(state.activeBurnTransits).toEqual([]);
    expect(state.nodeOccupancies).toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "venus_node",
        factionId: "opponent",
        amount: -1
      })
    );
  });

  it("destroys an arriving transit targeted by FIRE when it cannot pay evade", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 10, opponent: 0 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
    });
    const firePlan = calculateFirePlan(content, baseState, "mars_node", "venus_node");

    if (firePlan === null) {
      throw new Error("Expected FIRE plan from Mars to Venus.");
    }

    let state = applyCommand(
      {
        ...baseState,
        activeBurnTransits: [
          {
            id: "opponent-doomed-arrival",
            originNodeId: "jupiter_node",
            destinationNodeId: "venus_node",
            burnCost: 0,
            etaTurns: firePlan.impactTurn,
            issuedTurn: -1,
            arrivalTurn: firePlan.impactTurn,
            originPosition: { x: 0, y: 0 },
            destinationPositionAtArrival: firePlan.targetPositionAtImpact,
            factionId: "opponent",
            shipCount: 1,
            departedTurn: 0
          }
        ]
      },
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );
    state = applyCommand(state, ADVANCE_TURN_COMMAND);
    const impactTurn = firePlan.impactTurn + 1;

    while (state.turn < impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    expect(state.activeMissiles).toEqual([]);
    expect(state.activeBurnTransits).toEqual([]);
    expect(state.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "venus_node",
        factionId: "opponent"
      })
    );
  });

  it("does not let AI proactively evade before missile impact", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 2 },
        nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }],
        activeMissiles: [
          {
            id: "player-fire-jupiter-later",
            originNodeId: "mars_node",
            targetNodeId: "jupiter_node",
            missileEtaTurns: 3,
            issuedTurn: 0,
            impactTurn: 3,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "jupiter_node:opponent",
            launchedTurn: 0
          }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.turn).toBe(1);
    expect(next.factionDv.opponent).toBe(4);
    expect(next.activeMissiles).toContainEqual(
      expect.objectContaining({
        id: "player-fire-jupiter-later",
        impactTurn: 3
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_SOLUTION_BROKEN",
        nodeId: "jupiter_node",
        factionId: "opponent"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_DECISION",
        action: "EVADE"
      })
    );
  });

  it("lets a pending BURN away break incoming missile solutions without extra evade dV", () => {
    const content = loadContent();
    const ordered = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const burnOrder = ordered.pendingBurnOrders[0];

    if (burnOrder === undefined) {
      throw new Error("Expected pending BURN order.");
    }

    const next = applyCommand(
      {
        ...ordered,
        activeMissiles: [
          {
            id: "opponent-fire-mars-now",
            originNodeId: "venus_node",
            targetNodeId: "mars_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player",
            launchedTurn: 0
          },
          {
            id: "opponent-fire-mars-later",
            originNodeId: "jupiter_node",
            targetNodeId: "mars_node",
            missileEtaTurns: 3,
            issuedTurn: 0,
            impactTurn: 3,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player",
            launchedTurn: 0
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toEqual([]);
    expect(next.factionDv.player).toBe(40 - burnOrder.burnCost);
    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        id: burnOrder.id,
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      })
    );
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_SOLUTION_BROKEN",
        nodeId: "mars_node",
        factionId: "player",
        amount: 0,
        burnCost: burnOrder.burnCost
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "BURN_DEPARTED",
        nodeId: "mars_node",
        factionId: "player",
        burnCost: burnOrder.burnCost
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "mars_node"
      })
    );
  });

  it("lets a same-turn BURN break a newly pending FIRE solution", () => {
    const content = loadContent();
    const baseState = createInitialGameState({
      factionDv: { player: 20, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, baseState, "mars_node", "venus_node");
    const burnPlan = calculateBurnPlan(content, baseState, "venus_node", "jupiter_node");

    if (firePlan === null || burnPlan === null) {
      throw new Error("Expected same-turn FIRE and BURN plans.");
    }

    const next = advanceTurn(
      {
        ...baseState,
        pendingFireOrders: [
          {
            ...firePlan,
            id: "player-fire-venus-same-turn",
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "venus_node:opponent"
          }
        ],
        pendingBurnOrders: [
          {
            ...burnPlan,
            id: "opponent-burn-away-venus-same-turn",
            factionId: "opponent",
            shipCount: 1
          }
        ]
      },
      content
    );

    expect(next.activeMissiles).toEqual([]);
    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        id: "opponent-burn-away-venus-same-turn",
        factionId: "opponent",
        originNodeId: "venus_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_SOLUTION_BROKEN",
        nodeId: "venus_node",
        factionId: "opponent",
        burnCost: burnPlan.burnCost
      })
    );
  });

  it("resolves mandatory launch departure before missile impact and same-turn enemy arrival", () => {
    const content = loadContent();
    const launch = {
      id: "launch:player:mars_node:T0:0",
      nodeId: "mars_node",
      factionId: "player" as const,
      createdTurn: 0
    };
    const ordered = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 2 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ],
        mandatoryLaunches: [launch],
        activeMissiles: [
          {
            id: "opponent-fire-mars-now",
            originNodeId: "venus_node",
            targetNodeId: "mars_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player",
            launchedTurn: 0
          }
        ],
        activeBurnTransits: [
          {
            id: "opponent-arrives-mars-now",
            originNodeId: "jupiter_node",
            destinationNodeId: "mars_node",
            burnCost: 0,
            etaTurns: 1,
            issuedTurn: 0,
            arrivalTurn: 1,
            originPosition: { x: 0, y: 0 },
            destinationPositionAtArrival: { x: 0, y: 0 },
            factionId: "opponent",
            shipCount: 1,
            departedTurn: 0
          }
        ]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const mandatoryBurn = ordered.pendingBurnOrders[0];

    if (mandatoryBurn === undefined) {
      throw new Error("Expected mandatory launch BURN order.");
    }

    const next = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);
    const burnIndex = next.debugEvents.findIndex((event) => {
      return event.type === "BURN_DEPARTED" && event.mandatoryLaunchId === launch.id;
    });
    const evadeIndex = next.debugEvents.findIndex((event) => {
      return event.type === "EVADE" && event.nodeId === "mars_node";
    });

    expect(burnIndex).toBeGreaterThanOrEqual(0);
    expect(evadeIndex).toBeGreaterThan(burnIndex);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_SOLUTION_BROKEN",
        nodeId: "mars_node",
        factionId: "player"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "mars_node",
        factionId: "player"
      })
    );
    expect(next.factionDv.player).toBe(40 - mandatoryBurn.burnCost - 1);
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        id: mandatoryBurn.id,
        mandatoryLaunchId: launch.id,
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      })
    );
  });

  it("lets a contested ship burn away to avoid missiles even though contested blocks auto-evade", () => {
    const content = loadContent();
    const ordered = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const burnOrder = ordered.pendingBurnOrders[0];

    if (burnOrder === undefined) {
      throw new Error("Expected pending BURN order.");
    }

    const next = applyCommand(
      {
        ...ordered,
        activeMissiles: [
          {
            id: "opponent-fire-contested-mars",
            originNodeId: "venus_node",
            targetNodeId: "mars_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "mars_node:player",
            launchedTurn: 0
          }
        ]
      },
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.activeMissiles).toEqual([]);
    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        id: burnOrder.id,
        factionId: "player"
      })
    );
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_SOLUTION_BROKEN",
        nodeId: "mars_node",
        factionId: "player",
        amount: 0
      })
    );
  });

  it("removes a missile with minimal feedback if the target no longer exists", () => {
    const content = loadContent();
    let state = applyCommand(
      createInitialGameState({
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );
    state = advanceTurn(state, content, []);
    const missile = state.activeMissiles.find((candidate) => {
      return candidate.factionId === "player" && candidate.targetNodeId === "venus_node";
    });

    if (missile === undefined) {
      throw new Error("Expected player missile targeting Venus.");
    }

    state = {
      ...state,
      nodeOccupancies: state.nodeOccupancies.filter((occupancy) => {
        return !(occupancy.nodeId === "venus_node" && occupancy.factionId === "opponent");
      })
    };

    while (state.turn < missile.impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    expect(state.activeMissiles).toEqual([]);
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_MISSED",
        nodeId: "venus_node",
        factionId: "opponent",
        missileId: missile.id
      })
    );
  });

  it("cancels all missile solutions targeting a ship once that ship is destroyed", () => {
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 0 },
        nodeOccupancies: [{ nodeId: "venus_node", factionId: "opponent", shipCount: 1 }],
        activeMissiles: [
          {
            id: "player-fire-venus-later",
            originNodeId: "mars_node",
            targetNodeId: "venus_node",
            missileEtaTurns: 3,
            issuedTurn: 0,
            impactTurn: 3,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "venus_node:opponent",
            launchedTurn: 0
          },
          {
            id: "player-fire-venus-now",
            originNodeId: "jupiter_node",
            targetNodeId: "venus_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "venus_node:opponent",
            launchedTurn: 0
          }
        ]
      }),
      ADVANCE_TURN_COMMAND
    );

    expect(next.activeMissiles).toEqual([]);
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "venus_node",
        factionId: "opponent",
        missileId: "player-fire-venus-now"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MISSILE_MISSED",
        nodeId: "venus_node"
      })
    );
  });

  it("marks productive occupied nodes as working only when no pending burn leaves them", () => {
    const content = loadContent();
    const working = createSolarSystemSnapshot(
      content,
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "player", shipCount: 1 }]
      })
    );
    const workingJupiter = working.nodes.find((node) => node.id === "jupiter_node");

    expect(workingJupiter).toEqual(
      expect.objectContaining({
        tritiumOutput: 2,
        isWorking: true,
        workingFactionId: "player"
      })
    );

    const orderedState = applyCommand(
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "jupiter_node", factionId: "player", shipCount: 1 }]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "jupiter_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const pending = createSolarSystemSnapshot(content, orderedState);
    const pendingJupiter = pending.nodes.find((node) => node.id === "jupiter_node");

    expect(pendingJupiter).toEqual(
      expect.objectContaining({
        isWorking: false
      })
    );
  });

  it("marks productive occupied nodes as not working when FIRE is pending", () => {
    const content = loadContent();
    const orderedState = applyCommand(
      createInitialGameState({
        nodeOccupancies: [
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "jupiter_node",
        targetNodeId: "venus_node"
      },
      content
    );
    const pending = createSolarSystemSnapshot(content, orderedState);
    const pendingJupiter = pending.nodes.find((node) => node.id === "jupiter_node");

    expect(pendingJupiter).toEqual(
      expect.objectContaining({
        isWorking: false
      })
    );
  });

  it("locks an active BURN after launch and rejects redirects", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 50, opponent: 10 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const inTransit = applyCommand(ordered, ADVANCE_TURN_COMMAND);
    const [transit] = inTransit.activeBurnTransits;

    if (transit === undefined) {
      throw new Error("Expected active BURN transit.");
    }

    const queuedFromDestination = applyCommand(
      inTransit,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: transit.destinationNodeId,
        destinationNodeId: "uranus_node"
      },
      content
    );

    expect(queuedFromDestination.pendingBurnOrders).toEqual([]);
    expect(queuedFromDestination.activeBurnTransits).toEqual(inTransit.activeBurnTransits);

    const redirectPlan = calculateActiveBurnRedirectPlan(
      content,
      inTransit,
      transit.id,
      "uranus_node"
    );

    expect(redirectPlan).toBeNull();

    const redirected = applyCommand(
      inTransit,
      {
        type: "REDIRECT_ACTIVE_BURN",
        transitId: transit.id,
        destinationNodeId: "uranus_node"
      },
      content
    );

    expect(redirected.pendingBurnOrders).toEqual([]);
    expect(redirected.activeBurnTransits).toEqual(inTransit.activeBurnTransits);
  });

  it("ignores sampled active BURN redirect attempts", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 50, opponent: 10 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const inTransit = applyCommand(ordered, ADVANCE_TURN_COMMAND);
    const [transit] = inTransit.activeBurnTransits;

    if (transit === undefined) {
      throw new Error("Expected active BURN transit.");
    }

    const sampledTurn = transit.departedTurn + 0.5;
    const sampledPlan = calculateActiveBurnRedirectPlan(
      content,
      inTransit,
      transit.id,
      "uranus_node",
      undefined,
      sampledTurn
    );

    const visualOriginPosition = {
      x: transit.originPosition.x + 5,
      y: transit.originPosition.y - 3
    };
    const visualDepartureDirection = { x: 0, y: 1 };
    const visualPlan = calculateActiveBurnRedirectPlan(
      content,
      inTransit,
      transit.id,
      "uranus_node",
      undefined,
      sampledTurn,
      visualOriginPosition,
      visualDepartureDirection
    );

    expect(sampledPlan).toBeNull();
    expect(visualPlan).toBeNull();

    const redirected = applyCommand(
      inTransit,
      {
        type: "REDIRECT_ACTIVE_BURN",
        transitId: transit.id,
        destinationNodeId: "uranus_node",
        sampleTurn: sampledTurn,
        originPosition: visualOriginPosition,
        departureDirection: visualDepartureDirection
      },
      content
    );

    expect(redirected.activeBurnTransits).toEqual(inTransit.activeBurnTransits);
  });

  it("keeps active BURN destination fixed across repeated redirect commands", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 200, opponent: 10 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
    });
    const ordered = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const inTransit = applyCommand(ordered, ADVANCE_TURN_COMMAND);
    const [initialTransit] = inTransit.activeBurnTransits;

    if (initialTransit === undefined) {
      throw new Error("Expected active BURN transit.");
    }

    const redirectableNodeIds = content.nodes
      .map((node) => node.id)
      .filter((nodeId) => nodeId !== initialTransit.destinationNodeId);

    for (const nodeId of redirectableNodeIds) {
      expect(
        calculateActiveBurnRedirectPlan(content, inTransit, initialTransit.id, nodeId)
      ).toBeNull();
    }

    let movingState = inTransit;
    const redirectSequence = ["uranus_node", "neptune_node", "jupiter_node", "saturn_node"];

    for (const destinationNodeId of redirectSequence) {
      const [transit] = movingState.activeBurnTransits;

      if (transit === undefined) {
        throw new Error(`Expected active transit before redirecting to "${destinationNodeId}".`);
      }

      const redirected = applyCommand(
        movingState,
        {
          type: "REDIRECT_ACTIVE_BURN",
          transitId: transit.id,
          destinationNodeId
        },
        content
      );
      const [redirectedTransit] = redirected.activeBurnTransits;

      expect(redirectedTransit?.id).toBe(transit.id);
      expect(redirectedTransit?.destinationNodeId).toBe(transit.destinationNodeId);

      movingState = applyCommand(redirected, ADVANCE_TURN_COMMAND);

      if (movingState.activeBurnTransits.length === 0) {
        break;
      }
    }
  });

  it("creates contested when a ship enters an enemy-occupied node", () => {
    const content = loadContent();
    const ordered = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "deimos_node",
        destinationNodeId: "mars_node"
      },
      content
    );
    let arrived = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);

    while (arrived.activeBurnTransits.length > 0) {
      arrived = applyCommand(arrived, ADVANCE_TURN_COMMAND, content);
    }

    const snapshot = createSolarSystemSnapshot(content, arrived);
    const mars = snapshot.nodes.find((node) => node.id === "mars_node");

    expect(ordered.pendingBurnOrders[0]?.etaTurns).toBeGreaterThanOrEqual(2);
    expect(arrived.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(arrived.nodeOccupancies).toContainEqual({
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    });
    expect(mars).toEqual(
      expect.objectContaining({
        isContested: true,
        contestedFactionIds: ["opponent", "player"],
        isWorking: false
      })
    );
  });

  it("rejects multi-ship burns into enemy nodes so contested stays one ship per faction", () => {
    const content = loadContent();
    const ordered = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "deimos_node", factionId: "player", shipCount: 2 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "deimos_node",
        destinationNodeId: "mars_node",
        shipCount: 2
      },
      content
    );

    expect(ordered.pendingBurnOrders).toEqual([]);
  });

  it("rejects burns into an already contested node", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });

    const playerReinforcement = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "deimos_node",
        destinationNodeId: "mars_node"
      },
      content
    );
    const opponentReinforcement = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "venus_node",
        destinationNodeId: "mars_node",
        factionId: "opponent"
      },
      content
    );

    expect(playerReinforcement.pendingBurnOrders).toEqual([]);
    expect(opponentReinforcement.pendingBurnOrders).toEqual([]);
  });

  it("reassigns contested burn-out routes without duplicate pending orders", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firstOrder = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node"
      },
      content
    );
    const cancelled = applyCommand(firstOrder, {
      type: "CANCEL_PENDING_BURN_ORDER",
      originNodeId: "mars_node"
    });
    const secondOrder = applyCommand(
      cancelled,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );

    expect(firstOrder.pendingBurnOrders).toHaveLength(1);
    expect(cancelled.pendingBurnOrders).toEqual([]);
    expect(secondOrder.pendingBurnOrders).toHaveLength(1);
    expect(secondOrder.pendingBurnOrders[0]).toEqual(
      expect.objectContaining({
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      })
    );
    expect(secondOrder.pendingBurnOrders[0]?.burnCost).toBeGreaterThan(0);
  });

  it("freezes contested shipyard progress and prevents production or work", () => {
    const content = loadContent();
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "mars_node", factionId: "player", shipCount: 1 }
      ],
      shipyardProgress: [{ nodeId: "mars_node", progress: 3, workerFactionId: "opponent" }]
    });
    const next = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    const snapshot = createSolarSystemSnapshot(content, next);
    const mars = snapshot.nodes.find((node) => node.id === "mars_node");

    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 3,
      workerFactionId: "opponent"
    });
    expect(next.mandatoryLaunches).toEqual([]);
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED", nodeId: "mars_node" })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIPYARD_PROGRESS", nodeId: "mars_node" })
    );
    expect(mars).toEqual(
      expect.objectContaining({
        isContested: true,
        isWorking: false,
        shipyardProgress: 3,
        shipyardWorkerFactionId: "opponent"
      })
    );
  });

  it("blocks tritium income while a tritium node is contested", () => {
    const content = loadContent();
    const next = advanceTurn(
      createInitialGameState({
        nodeOccupancies: [
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 }
        ]
      }),
      content,
      []
    );
    const jupiter = createSolarSystemSnapshot(content, next).nodes.find(
      (node) => node.id === "jupiter_node"
    );

    expect(next.factionDv).toEqual({ player: 8, opponent: 8 });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_PAID",
        nodeId: "jupiter_node",
        factionId: "player",
        amount: -2
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_PAID",
        nodeId: "jupiter_node",
        factionId: "opponent",
        amount: -2
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "TRITIUM_INCOME", nodeId: "jupiter_node" })
    );
    expect(jupiter).toEqual(
      expect.objectContaining({
        isContested: true,
        isWorking: false
      })
    );
  });

  it("blocks tritium income for the whole turn when upkeep clears a start-turn contest", () => {
    const content = loadContent();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 0, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "uranus_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "uranus_node", factionId: "player", shipCount: 1 }
        ]
      }),
      content,
      []
    );

    expect(next.factionDv).toEqual({ player: 0, opponent: 8 });
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "uranus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "uranus_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_FAILED",
        nodeId: "uranus_node",
        factionId: "player"
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "TRITIUM_INCOME", nodeId: "uranus_node" })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "PRODUCTIVE_AUDIT",
        nodeId: "uranus_node",
        factionId: "opponent",
        reason: "contested",
        amount: 0,
        contested: true
      })
    );
  });

  it("charges contested upkeep at every contested node every turn", () => {
    let state = createInitialGameState({
      factionDv: { player: 10, opponent: 10 },
      nodeOccupancies: [
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "player", shipCount: 1 }
      ]
    });

    state = applyCommand(state, ADVANCE_TURN_COMMAND);

    expect(state.factionDv).toEqual({ player: 6, opponent: 6 });

    state = applyCommand(state, ADVANCE_TURN_COMMAND);

    expect(state.factionDv).toEqual({ player: 2, opponent: 2 });
    for (const nodeId of ["jupiter_node", "saturn_node"]) {
      for (const factionId of ["player", "opponent"] as const) {
        expect(state.nodeOccupancies).toContainEqual({
          nodeId,
          factionId,
          shipCount: 1
        });
        expect(state.debugEvents).toContainEqual(
          expect.objectContaining({
            turn: 2,
            type: "CONTESTED_UPKEEP_PAID",
            nodeId,
            factionId,
            amount: -2
          })
        );
      }
    }
  });

  it("vetoes the lower-value offense when two contests are individually solvent but jointly insolvent", () => {
    const content = loadContent();
    const planningState = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "deimos_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
        { nodeId: "saturn_node", factionId: "player", shipCount: 1 }
      ]
    });
    const firstPlan = calculateBurnPlan(content, planningState, "venus_node", "jupiter_node");
    const secondPlan = calculateBurnPlan(content, planningState, "deimos_node", "saturn_node");

    if (firstPlan === null || secondPlan === null) {
      throw new Error("Expected two offensive contested BURN plans.");
    }

    const opponentDv = Math.max(firstPlan.burnCost, secondPlan.burnCost) + 8;
    const next = advanceTurn(
      {
        ...planningState,
        factionDv: { player: 40, opponent: opponentDv },
        pendingBurnOrders: [
          {
            ...firstPlan,
            id: "test:aggregate-contest:first",
            factionId: "opponent",
            shipCount: 1
          },
          {
            ...secondPlan,
            id: "test:aggregate-contest:second",
            factionId: "opponent",
            shipCount: 1
          }
        ]
      },
      content,
      ["opponent"]
    );
    const departed = next.debugEvents.filter(
      (event) => event.type === "BURN_DEPARTED" && event.factionId === "opponent"
    );

    expect(opponentDv - firstPlan.burnCost - 4).toBeGreaterThanOrEqual(4);
    expect(opponentDv - secondPlan.burnCost - 4).toBeGreaterThanOrEqual(4);
    expect(opponentDv - firstPlan.burnCost - secondPlan.burnCost - 8).toBeLessThan(4);
    expect(departed).toHaveLength(1);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_CONTEST",
        factionId: "opponent",
        action: "BURN",
        reason: "aggregate-contested:lowest-value-offensive-cancelled",
        initialBudget: opponentDv,
        minimumReserve: 4
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_AGGREGATE_CONTESTED_SOLVENCY",
        factionId: "opponent",
        reason: "aggregate-contested:solvent-after-sacrifice",
        initialBudget: opponentDv,
        projectedUpkeep: 4,
        minimumReserve: 4
      })
    );
  });

  it("does not expose rival simultaneous hidden BURNs to aggregate solvency planning", () => {
    const generated = generateProceduralMap("proc-mrxc76ru-0vbkonn");
    const initialState = createInitialGameState({
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "2p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 2);
    const aggregateEvents = result.debugEvents.filter(
      (event) =>
        event.type === "AI_REJECTED_CONTEST" || event.type === "AI_AGGREGATE_CONTESTED_SOLVENCY"
    );

    expect(aggregateEvents).toContainEqual(
      expect.objectContaining({
        turn: 2,
        type: "AI_REJECTED_CONTEST",
        factionId: "opponent",
        originNodeId: "pluto_node",
        projectedUpkeep: 4
      })
    );
    expect(aggregateEvents.some((event) => event.message.includes("sealed-simultaneous"))).toBe(
      false
    );
  });

  it("allows unavoidable contested upkeep failure when no legal exit is affordable", () => {
    const content = loadContent();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 10, opponent: 0 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      content,
      ["opponent"]
    );

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_AGGREGATE_CONTESTED_SOLVENCY",
        factionId: "opponent",
        reason: "aggregate-contested:no-sustainable-exit",
        initialBudget: 0,
        projectedUpkeep: 4,
        minimumReserve: 4
      })
    );
    expect(
      next.debugEvents.some(
        (event) =>
          event.type === "AI_EARLY_CONTESTED_EXIT" &&
          event.factionId === "opponent" &&
          event.reason?.startsWith("aggregate-contested:")
      )
    ).toBe(false);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_FAILED",
        nodeId: "mars_node",
        factionId: "opponent"
      })
    );
  });

  it("uses a deterministic aggregate early exit when a safe route restores reserve", () => {
    const generated = generateProceduralMap("qa-aggregate-contested-batch-002");
    const initialState = createInitialGameState({
      gameMode: "3p",
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "3p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 35);

    expect(result.errors).toEqual([]);
    expect(result.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 35,
        type: "AI_EARLY_CONTESTED_EXIT",
        factionId: "ai_2",
        nodeId: "venus_node",
        action: "LEAVE_CONTESTED",
        destinationNodeId: "deimos_node",
        reason: "aggregate-contested:early-exit-restores-reserve",
        initialBudget: 8,
        plannedSpending: 1,
        projectedUpkeep: 4,
        minimumReserve: 4,
        sacrificedFrontNodeId: "venus_node"
      })
    );
  });

  it("destroys both contested ships when neither faction can pay upkeep", () => {
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 1, opponent: 1 },
        nodeOccupancies: [
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 }
        ]
      }),
      ADVANCE_TURN_COMMAND
    );

    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "jupiter_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "jupiter_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_FAILED",
        nodeId: "jupiter_node",
        factionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_FAILED",
        nodeId: "jupiter_node",
        factionId: "opponent"
      })
    );
  });

  it("prevents a ship contested at turn start from evading after upkeep removes the opponent", () => {
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 0 },
        nodeOccupancies: [
          { nodeId: "venus_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ],
        activeMissiles: [
          {
            id: "opponent-fire-venus-now",
            originNodeId: "mars_node",
            targetNodeId: "venus_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "opponent",
            targetFactionId: "player",
            targetShipKey: "venus_node:player",
            launchedTurn: 0
          }
        ]
      }),
      ADVANCE_TURN_COMMAND
    );

    expect(next.factionDv.player).toBe(8);
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "venus_node",
        factionId: "player"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "venus_node",
        factionId: "player"
      })
    );
  });

  it("keeps contested snapshots finite for renderer consumption", () => {
    const content = loadContent();
    const snapshot = createSolarSystemSnapshot(
      content,
      createInitialGameState({
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 2, workerFactionId: "opponent" }]
      })
    );

    for (const body of snapshot.bodies) {
      expect(Number.isFinite(body.position.x)).toBe(true);
      expect(Number.isFinite(body.position.y)).toBe(true);
    }

    for (const node of snapshot.nodes) {
      expect(Number.isFinite(node.position.x)).toBe(true);
      expect(Number.isFinite(node.position.y)).toBe(true);
      expect(Number.isFinite(node.shipyardProgress)).toBe(true);
    }
  });

  it("keeps default enemy loop snapshots finite over multiple turns", () => {
    const content = loadContent();
    let state = createInitialGameState();

    for (let index = 0; index < 4; index += 1) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND, content);
      expect(state.factionDv.player).toBeGreaterThanOrEqual(0);
      expect(state.factionDv.opponent).toBeGreaterThanOrEqual(0);
      const snapshot = createSolarSystemSnapshot(content, state);

      for (const body of snapshot.bodies) {
        expect(Number.isFinite(body.position.x)).toBe(true);
        expect(Number.isFinite(body.position.y)).toBe(true);
      }

      for (const node of snapshot.nodes) {
        expect(Number.isFinite(node.position.x)).toBe(true);
        expect(Number.isFinite(node.position.y)).toBe(true);
        expect(Number.isFinite(node.shipyardProgress)).toBe(true);
      }
    }
  });

  it("runs a legal AI parity smoke test over thirty turns", () => {
    const { content } = loadStrategicPreset();
    const result = runAiVsAiDebugSimulation(
      content,
      createInitialGameState({
        factionDv: { player: 40, opponent: 40 },
        nodeOccupancies: [
          { nodeId: "titan_node", factionId: "player", shipCount: 1 },
          { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
          { nodeId: "ganymede_node", factionId: "player", shipCount: 1 },
          { nodeId: "europa_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "oberon_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      30
    );
    const dump = dumpTurnState(content, result.state);

    expect(result.errors).toEqual([]);
    expect(validateNoNegativeDV(result.state)).toEqual([]);
    expect(validateShipReferences(result.state)).toEqual([]);
    expect(validateOneActionPerShip(result.state)).toEqual([]);
    expect(validateNoDeadShipsInState(result.state)).toEqual([]);
    expect(validateContestedState(result.state)).toEqual([]);
    expect(validateNoNonContestedSameFactionStacks(result.state)).toEqual([]);
    expect(validateMissileTargets(result.state)).toEqual([]);
    expect(result.report).toContain(
      "Planner: player tryhard-solvency-v1, opponent tryhard-solvency-v1"
    );
    expect(dump.turn).toBeGreaterThan(0);
    expect(dump.factionDv.opponent).toBeGreaterThanOrEqual(0);
  });

  it("runs legal AI turns on the balanced procedural transfer map", () => {
    const generated = generateProceduralMap("qa-balanced-ai-transfer-map");
    const initialState = createInitialGameState({
      gameMode: "3p",
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "3p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 24);
    const dump = dumpTurnState(generated.content, result.state);

    expect(generated.content.transferRules).toBeDefined();
    expect(result.errors).toEqual([]);
    expect(validateNoNegativeDV(result.state)).toEqual([]);
    expect(validateShipReferences(result.state)).toEqual([]);
    expect(validateOneActionPerShip(result.state)).toEqual([]);
    expect(validateNoDeadShipsInState(result.state)).toEqual([]);
    expect(validateContestedState(result.state)).toEqual([]);
    expect(validateNoNonContestedSameFactionStacks(result.state)).toEqual([]);
    expect(validateMissileTargets(result.state)).toEqual([]);
    expect(dump.turn).toBeGreaterThan(0);
    expect(dump.factionDv.player).toBeGreaterThanOrEqual(0);
    expect(dump.factionDv.opponent).toBeGreaterThanOrEqual(0);
    expect(dump.factionDv.ai_2).toBeGreaterThanOrEqual(0);
  });

  it("vetoes the insolvent Charon offense in proc-mrxc76ru and avoids all three T4 failures", () => {
    const generated = generateProceduralMap("proc-mrxc76ru-0vbkonn");
    const initialState = createInitialGameState({
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "2p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 4);

    expect(result.errors).toEqual([]);
    expect(result.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 2,
        type: "AI_REJECTED_CONTEST",
        factionId: "opponent",
        originNodeId: "pluto_node",
        nodeId: "charon_node",
        reason: "aggregate-contested:lowest-value-offensive-cancelled",
        initialBudget: 9,
        minimumReserve: 4,
        sacrificedFrontNodeId: "charon_node"
      })
    );
    expect(result.debugEvents).not.toContainEqual(
      expect.objectContaining({
        turn: 2,
        type: "BURN_DEPARTED",
        factionId: "opponent",
        nodeId: "pluto_node",
        destinationNodeId: "charon_node"
      })
    );
    expect(
      result.debugEvents.filter(
        (event) => event.turn <= 4 && event.type === "CONTESTED_UPKEEP_FAILED"
      )
    ).toHaveLength(0);
  });

  it("vetoes the Titan offense in proc-mrxab3wy and avoids its multi-front collapse", () => {
    const generated = generateProceduralMap("proc-mrxab3wy-0n6id8w");
    const initialState = createInitialGameState({
      gameMode: "3p",
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "3p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 5);
    const playerFailures = result.debugEvents.filter(
      (event) =>
        event.turn <= 5 && event.type === "CONTESTED_UPKEEP_FAILED" && event.factionId === "player"
    );

    expect(result.errors).toEqual([]);
    expect(result.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 2,
        type: "AI_REJECTED_CONTEST",
        factionId: "ai_2",
        originNodeId: "iapetus_node",
        nodeId: "titan_node",
        action: "BURN",
        reason: "aggregate-contested:lowest-value-offensive-cancelled",
        initialBudget: 8,
        minimumReserve: 4,
        sacrificedFrontNodeId: "titan_node"
      })
    );
    expect(result.debugEvents).not.toContainEqual(
      expect.objectContaining({
        turn: 3,
        type: "BURN_ARRIVED",
        factionId: "ai_2",
        nodeId: "titan_node"
      })
    );
    expect(playerFailures).toHaveLength(0);
  });

  it("keeps the proc-mrxarjku Titan completion safe through the known T29 case", () => {
    const generated = generateProceduralMap("proc-mrxarjku-01d8lzc");
    const initialState = createInitialGameState({
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "2p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 29);

    expect(result.errors).toEqual([]);
    expect(result.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH_DESTROYED",
        turn: 29,
        nodeId: "titan_node"
      })
    );
  });

  it("keeps the proc-mrx9yrur Mercury launch protection safe through T14", () => {
    const generated = generateProceduralMap("proc-mrx9yrur-17kr9z6");
    const initialState = createInitialGameState({
      gameMode: "3p",
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "3p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 14);

    expect(result.errors).toEqual([]);
    expect(result.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "MANDATORY_LAUNCH_DESTROYED",
        nodeId: "mercury_node",
        factionId: "ai_2"
      })
    );
  });

  it("runs FIREvsAI debug comparison with per-faction strategy profiles", () => {
    const strategicPreset = loadStrategicPreset();
    const initialState = createInitialGameState({
      nodeOccupancies: strategicPreset.initialOccupancies,
      factions: [
        {
          id: "player",
          displayName: "FIRE",
          color: "#7fe8ff",
          accent: "#d9f8ff",
          controlType: "ai"
        },
        {
          id: "opponent",
          displayName: "NOFIRE",
          color: "#c982ff",
          accent: "#f3dcff",
          controlType: "ai"
        }
      ]
    });
    const result = runFireVsAiDebugSimulation(strategicPreset.content, initialState, 12);

    expect(result.errors).toEqual([]);
    expect(result.report).toContain('gameMode: "FIREvsAI"');
    expect(result.report).toContain("strategyProfile: FIRE=FIRE, NOFIRE=NOFIRE");
    expect(result.report).toContain("FIRE count: FIRE ");
    expect(result.report).toContain("NOFIRE ");
    expect(result.report).toContain("winner:");
  });

  it("prioritizes tritium fallback when the only tritium node is under missile threat", () => {
    const { content } = loadStrategicPreset();
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "europa_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "oberon_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const firePlan = calculateFirePlan(content, state, "deimos_node", "europa_node");

    if (firePlan === null) {
      throw new Error("Expected Deimos to be able to FIRE at Europa in strategic test setup.");
    }

    const next = advanceTurn(
      {
        ...state,
        activeMissiles: [
          {
            ...firePlan,
            id: "test:tritium-threat-a",
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "europa_node:opponent",
            launchedTurn: 0
          },
          {
            ...firePlan,
            id: "test:tritium-threat-b",
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "europa_node:opponent",
            launchedTurn: 0
          }
        ]
      },
      content
    );
    const fallback = next.debugEvents.find((event) => {
      return event.type === "AI_TRITIUM_FALLBACK_ASSIGNED" && event.factionId === "opponent";
    });

    expect(fallback).toEqual(
      expect.objectContaining({
        originNodeId: "phobos_node",
        destinationNodeId: "venus_node"
      })
    );
  });

  it("rejects a last-tritium fallback destination that is already doomed by a known missile", () => {
    const { content } = loadStrategicPreset();
    const baseState = createInitialGameState({
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "europa_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "oberon_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const tritiumThreatPlan = calculateFirePlan(content, baseState, "deimos_node", "europa_node");
    const fallbackPlan = calculateBurnPlan(content, baseState, "phobos_node", "venus_node");

    if (tritiumThreatPlan === null || fallbackPlan === null) {
      throw new Error("Expected strategic fallback setup to have FIRE and BURN plans.");
    }

    const state = {
      ...baseState,
      factionDv: { player: 40, opponent: fallbackPlan.burnCost },
      activeMissiles: [
        {
          ...tritiumThreatPlan,
          id: "test:europa-last-tritium-threat",
          factionId: "player" as const,
          targetFactionId: "opponent" as const,
          targetShipKey: "europa_node:opponent",
          launchedTurn: 0
        },
        {
          ...tritiumThreatPlan,
          id: "test:venus-fallback-threat",
          targetNodeId: "venus_node",
          missileEtaTurns: fallbackPlan.etaTurns + 1,
          impactTurn: baseState.turn + fallbackPlan.etaTurns + 1,
          factionId: "player" as const,
          targetFactionId: "opponent" as const,
          targetShipKey: "venus_node:opponent",
          launchedTurn: 0
        }
      ]
    };
    const next = advanceTurn(state, content);

    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "AI_TRITIUM_FALLBACK_ASSIGNED",
        factionId: "opponent",
        destinationNodeId: "venus_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_SOLVENCY_COUNTS_TRITIUM",
        factionId: "opponent",
        nodeId: "venus_node",
        amount: 0,
        reason: "cannot-evade-known-missile"
      })
    );
  });

  it("runs an isolated AI vs AI forty-turn debug simulation report", () => {
    const strategicPreset = loadStrategicPreset();
    const initialState = createInitialGameState({
      nodeOccupancies: strategicPreset.initialOccupancies
    });
    const initialStateSnapshot = JSON.stringify(initialState);
    const result = runAiVsAiDebugSimulation(strategicPreset.content, initialState, 40);

    expect(JSON.stringify(initialState)).toBe(initialStateSnapshot);
    expect(result.turnsSimulated).toBeGreaterThan(0);
    expect(result.turnsSimulated).toBeLessThanOrEqual(40);
    expect(result.errors).toEqual([]);
    expect(result.report).toContain("DeltaV AI vs AI 40T Debug Report");
    expect(result.report).toContain("Turns simulated:");
    expect(result.report).toContain(
      "Planner: player tryhard-solvency-v1, opponent tryhard-solvency-v1"
    );
    expect(result.report).toContain("Effective start setup player:");
    expect(result.report).toContain("Final ΔV:");
    expect(result.report).toContain("Turns at 0 ΔV:");
    expect(result.report).toContain("Lowest ΔV reached:");
    expect(result.report).toContain("Average ΔV:");
    expect(result.report).toContain("Ships remaining:");
    expect(result.report).toContain("Missiles fired:");
    expect(result.report).toContain("Action considered counts:");
    expect(result.report).toContain("Action rejected counts:");
    expect(result.report).toContain("FIRE rejected reason counts:");
    expect(result.report).toContain("Burn rejected reason counts:");
    expect(result.report).toContain("Contested entry rejected reason counts:");
    expect(result.report).toContain("Mandatory launch failure reasons:");
    expect(result.report).toContain("Tritium fallback triggered:");
    expect(result.report).toContain("Tritium fallback details:");
    expect(result.report).toContain("Turns without tritium access:");
    expect(result.report).toContain("Nearest affordable tritium at first tritium loss:");
    expect(result.report).toContain("Max simultaneous contested ships:");
    expect(result.report).toContain("Contested+FIRE combos considered:");
    expect(result.report).toContain("Contested+FIRE combo details:");
    expect(result.report).toContain("Expansion path quality:");
    expect(result.report).toContain("Final occupied productive nodes:");
    expect(result.report).toContain("Major events:");
  });

  it("reports AI tritium regression duration, early victories, and stranded multi-ship losses", () => {
    const strategicPreset = loadStrategicPreset();
    const initialState = createInitialGameState({
      nodeOccupancies: strategicPreset.initialOccupancies
    });
    const result = runAiVsAiRegressionSimulations(strategicPreset.content, initialState, 24);

    expect(result.errors).toEqual([]);
    expect(
      Object.values(result.matchDurationDistribution).reduce((total, count) => total + count, 0)
    ).toBe(4);
    expect(result.earlyVictoriesByTurn10).toBe(0);
    expect(result.report).toContain("Match-duration distribution:");
    expect(result.report).toContain("Early victories by turn 10:");
    expect(result.report).toContain("Multiple ships but no tritium recovery path:");
  });

  it("runs isolated swapped-start AI vs AI diagnostics over four forty-turn reports", () => {
    const strategicPreset = loadStrategicPreset();
    const initialState = createInitialGameState({
      nodeOccupancies: strategicPreset.initialOccupancies
    });
    const initialStateSnapshot = JSON.stringify(initialState);
    const result = runAIVsAIDiagnostics40T(strategicPreset.content, initialState, 40);

    expect(JSON.stringify(initialState)).toBe(initialStateSnapshot);
    expect(result.errors).toEqual([]);
    expect(result.report).toContain("DeltaV AI vs AI Swapped-Start Diagnostics 40T");
    expect(result.report).toContain("1. Normal start");
    expect(result.report).toContain("2. Swapped start");
    expect(result.report).toContain("3. Normal start, reversed initial faction order");
    expect(result.report).toContain("4. Swapped start, reversed initial faction order");
    expect(result.report).toContain("Compact Summary:");
    expect(result.report).toContain("Order Bias Invariant:");
    expect(result.report).toContain("normal start: bias classification no order bias");
    expect(result.report).toContain("swapped start: bias classification no order bias");
    expect(result.report).toContain("Same snapshot used by all factions: yes");
    expect(result.report).toContain("State mutated during planning: no");
    expect(result.report).toContain("Likely Main Cause:");
    expect(result.report).toContain("Starting Position Imbalance:");
    expect(result.report).toContain("Faction Label Bias Audit:");
    expect(result.report).toContain("Resolution Order Bias Audit:");
    expect(result.report).toContain("Tie-Break Bias Audit:");
    expect(result.report).toContain("Tritium survival:");
    expect(result.report).toContain("Mandatory launch pressure:");
    expect(result.report).toContain("Contested+FIRE combos considered:");
    expect(result.report).toContain("Tritium fallback triggered:");
    expect(result.report).toContain("Turns without tritium access:");
    expect(result.report).toContain("Expansion path quality:");
  });

  it("keeps shipyard progress rubable after contested ends", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
        shipyardProgress: [{ nodeId: "mars_node", progress: 2, workerFactionId: "opponent" }]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.shipyardProgress).toContainEqual({
      nodeId: "mars_node",
      progress: 3,
      workerFactionId: "player"
    });
  });

  it("uses the normal contested evaluator instead of a missile-specific escape", () => {
    const content = loadContent();
    let state = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 40 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: "mars_node",
        targetNodeId: "venus_node"
      },
      content
    );

    state = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    const missile = state.activeMissiles[0];

    if (missile === undefined) {
      throw new Error("Expected active missile.");
    }

    while (state.turn < missile.impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    }

    const venus = createSolarSystemSnapshot(content, state).nodes.find(
      (node) => node.id === "venus_node"
    );

    expect(state.nodeOccupancies).toContainEqual({
      nodeId: "venus_node",
      factionId: "player",
      shipCount: 1
    });
    expect(state.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(state.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({ originNodeId: "venus_node", factionId: "opponent" })
    );
    expect(venus).toEqual(
      expect.objectContaining({
        isContested: false,
        contestedFactionIds: ["player"]
      })
    );
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_DECISION",
        nodeId: "venus_node",
        factionId: "opponent",
        action: "STAY_CONTESTED"
      })
    );
    expect(state.debugEvents.some((event) => event.type === "AI_EVADE_FAILED")).toBe(false);
  });

  it("destroys a contested AI ship if it cannot afford to leave under missile threat", () => {
    const content = loadContent();
    let state = createInitialGameState({
      factionDv: { player: 40, opponent: 2 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "player", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ],
      activeMissiles: [
        {
          id: "player-fire-contested-venus",
          originNodeId: "mars_node",
          targetNodeId: "venus_node",
          missileEtaTurns: 1,
          issuedTurn: 0,
          impactTurn: 1,
          originPosition: { x: 0, y: 0 },
          targetPositionAtImpact: { x: 0, y: 0 },
          factionId: "player",
          targetFactionId: "opponent",
          targetShipKey: "venus_node:opponent",
          launchedTurn: 0
        }
      ]
    });
    const missile = state.activeMissiles[0];

    if (missile === undefined) {
      throw new Error("Expected active missile.");
    }

    while (state.turn < missile.impactTurn) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    }

    const venus = createSolarSystemSnapshot(content, state).nodes.find(
      (node) => node.id === "venus_node"
    );

    expect(state.nodeOccupancies).toContainEqual({
      nodeId: "venus_node",
      factionId: "player",
      shipCount: 1
    });
    expect(state.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(venus).toEqual(
      expect.objectContaining({
        isContested: false,
        contestedFactionIds: ["player"]
      })
    );
    expect(state.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "venus_node",
        factionId: "opponent"
      })
    );
  });

  it("resolves contested missile impact against the launcher's opposing faction", () => {
    const content = loadContent();
    const next = applyCommand(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "venus_node", factionId: "player", shipCount: 1 },
          { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
        ],
        activeMissiles: [
          {
            id: "player-fire-contested-venus-stale-target",
            originNodeId: "mars_node",
            targetNodeId: "venus_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "player",
            targetFactionId: "player",
            targetShipKey: "venus_node:player",
            launchedTurn: 0
          }
        ]
      }),
      ADVANCE_TURN_COMMAND,
      content
    );

    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "venus_node",
      factionId: "player",
      shipCount: 1
    });
    expect(next.nodeOccupancies).not.toContainEqual({
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "MISSILE_IMPACT",
        nodeId: "venus_node",
        factionId: "opponent"
      })
    );
  });

  it("does not abandon the last tritium worker for non-decisive pressure", () => {
    const baseContent = loadContent();
    const content: SolarSystemData = {
      ...baseContent,
      nodes: baseContent.nodes.map((node) => {
        return node.id === "jupiter_node" ? { ...node, weaponsOffline: true } : node;
      })
    };
    const next = advanceTurn(
      createInitialGameState({
        turn: 4,
        factionDv: { player: 20, opponent: 12 },
        nodeOccupancies: [
          { nodeId: "saturn_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "titan_node", factionId: "player", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "mercury_node", factionId: "opponent", shipCount: 1 }
        ]
      }),
      content
    );

    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_LAST_TRITIUM_PROTECTION",
        factionId: "opponent",
        nodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        factionId: "opponent",
        nodeId: "jupiter_node"
      })
    );
  });

  it("does not FIRE from the last tritium worker for non-forced pressure", () => {
    const content = loadContent();
    const next = advanceTurn(
      createInitialGameState({
        turn: 4,
        factionDv: { player: 10, opponent: 12 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
      }),
      content
    );

    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_FIRE",
        factionId: "opponent",
        nodeId: "jupiter_node",
        reason: "fire:last-tritium-worker-opportunity-cost"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_TACTICAL_LINE_AUDIT",
        factionId: "opponent",
        nodeId: "jupiter_node",
        action: "FIRE"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        factionId: "opponent",
        nodeId: "jupiter_node"
      })
    );
  });

  it("keeps the unique turn-1 tritium worker on WORK instead of FIRE", () => {
    const content = loadContent();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 10, opponent: 10 },
        nodeOccupancies: [
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }
        ],
        shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
      }),
      content
    );

    expect(next.activeMissiles).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "jupiter_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_REJECTED_FIRE",
        factionId: "opponent",
        nodeId: "jupiter_node",
        reason: "fire:last-tritium-worker-opportunity-cost"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        factionId: "opponent",
        nodeId: "jupiter_node",
        amount: 2
      })
    );
  });

  it("prefers a 1 dV Evade to an expensive Burn from the last tritium", () => {
    const { content } = loadStrategicPreset();
    const next = advanceTurn(
      createInitialGameState({
        factionDv: { player: 10, opponent: 3 },
        nodeOccupancies: [
          { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
          { nodeId: "europa_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
        ],
        activeMissiles: [
          {
            id: "player-single-europa-pressure",
            originNodeId: "deimos_node",
            targetNodeId: "europa_node",
            missileEtaTurns: 1,
            issuedTurn: 0,
            impactTurn: 1,
            originPosition: { x: 0, y: 0 },
            targetPositionAtImpact: { x: 0, y: 0 },
            factionId: "player",
            targetFactionId: "opponent",
            targetShipKey: "europa_node:opponent",
            launchedTurn: 0
          }
        ]
      }),
      content
    );

    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "europa_node"
      })
    );
    expect(next.nodeOccupancies).toContainEqual({
      nodeId: "europa_node",
      factionId: "opponent",
      shipCount: 1
    });
    expect(next.factionDv.opponent).toBe(2);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        factionId: "opponent",
        nodeId: "europa_node",
        amount: -1
      })
    );
    expect(next.debugEvents).not.toContainEqual(
      expect.objectContaining({
        type: "TRITIUM_INCOME",
        factionId: "opponent",
        nodeId: "europa_node"
      })
    );
  });

  it("never offers EVADE to a contested AI ship and uses the normal contested evaluator", () => {
    const { content } = loadStrategicPreset();
    const state = createInitialGameState({
      factionDv: { player: 10, opponent: 2 },
      nodeOccupancies: [
        { nodeId: "deimos_node", factionId: "player", shipCount: 1 },
        { nodeId: "europa_node", factionId: "player", shipCount: 1 },
        { nodeId: "europa_node", factionId: "opponent", shipCount: 1 }
      ],
      activeMissiles: [
        {
          id: "player-contested-europa-pressure",
          originNodeId: "deimos_node",
          targetNodeId: "europa_node",
          missileEtaTurns: 1,
          issuedTurn: 0,
          impactTurn: 1,
          originPosition: { x: 0, y: 0 },
          targetPositionAtImpact: { x: 0, y: 0 },
          factionId: "player",
          targetFactionId: "opponent",
          targetShipKey: "europa_node:opponent",
          launchedTurn: 0
        }
      ]
    });
    const next = advanceTurn(state, content, ["opponent"]);
    const contestedDecision = next.debugEvents.find((event) => {
      return (
        event.type === "AI_DECISION" &&
        event.factionId === "opponent" &&
        event.nodeId === "europa_node"
      );
    });

    expect(contestedDecision).toBeDefined();
    expect(["LEAVE_CONTESTED", "STAY_CONTESTED"]).toContain(contestedDecision?.action);
    expect(
      next.debugEvents.some((event) => {
        return (
          event.factionId === "opponent" &&
          event.nodeId === "europa_node" &&
          event.action === "EVADE"
        );
      })
    ).toBe(false);
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_EVADE_EXCLUDED",
        factionId: "opponent",
        nodeId: "europa_node",
        action: contestedDecision?.action,
        reason: "CONTESTED_SHIP",
        amount: 1
      })
    );
    expect(next.debugEvents.some((event) => event.type === "AI_EVADE_FAILED")).toBe(false);
  });

  it("opens the second-tritium guard only for one solvent offensive ship", () => {
    const content = loadContent();
    const occupancies = [
      { nodeId: "uranus_node", factionId: "player", shipCount: 1 },
      { nodeId: "jupiter_node", factionId: "opponent", shipCount: 2 },
      { nodeId: "saturn_node", factionId: "opponent", shipCount: 1 }
    ] as const;
    const command = {
      type: "ASSIGN_BURN_ORDER" as const,
      originNodeId: "jupiter_node",
      destinationNodeId: "uranus_node",
      factionId: "opponent" as const
    };
    const solventState = createInitialGameState({
      factionDv: { player: 10, opponent: 80 },
      nodeOccupancies: occupancies
    });
    const solventResult = applyCommand(solventState, command, content);

    expect(solventResult.pendingBurnOrders).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "jupiter_node",
        destinationNodeId: "uranus_node",
        shipCount: 1
      })
    );

    const plan = calculateBurnPlan(content, solventState, "jupiter_node", "uranus_node");

    if (plan === null) {
      throw new Error("Expected an offensive Tritium burn plan.");
    }

    const insolventState = createInitialGameState({
      factionDv: { player: 10, opponent: plan.burnCost + 3 },
      nodeOccupancies: occupancies
    });

    expect(applyCommand(insolventState, command, content)).toBe(insolventState);
    expect(
      applyCommand(
        solventState,
        {
          ...command,
          shipCount: 2
        },
        content
      )
    ).toBe(solventState);
  });

  it("breaks the proc-mruucvnz FIRE-EVADE cycle with an offensive Tritium BURN by T30", () => {
    const generated = generateProceduralMap("proc-mruucvnz-1f93z8c");
    const initialState = createInitialGameState({
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "2p")
    });
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 30);
    const nodeById = new Map(generated.content.nodes.map((node) => [node.id, node]));
    const offensiveBurn = result.debugEvents.find((event) => {
      if (
        event.type !== "BURN_DEPARTED" ||
        event.turn < 10 ||
        event.turn > 30 ||
        event.factionId === undefined ||
        event.nodeId === undefined ||
        event.destinationNodeId === undefined ||
        nodeById.get(event.nodeId)?.type !== "tritium" ||
        nodeById.get(event.destinationNodeId)?.type !== "tritium"
      ) {
        return false;
      }
      const before = result.stateHistory.find((state) => state.turn === event.turn - 1);

      if (before === undefined) {
        return false;
      }
      const safeControlledTritiumCount = generated.content.nodes.filter((node) => {
        return (
          node.type === "tritium" &&
          before.nodeOccupancies.some((occupancy) => {
            return (
              occupancy.nodeId === node.id &&
              occupancy.factionId === event.factionId &&
              occupancy.shipCount > 0
            );
          }) &&
          !before.nodeOccupancies.some((occupancy) => {
            return (
              occupancy.nodeId === node.id &&
              occupancy.factionId !== event.factionId &&
              occupancy.shipCount > 0
            );
          })
        );
      }).length;
      const destinationHasEnemyIncome = before.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === event.destinationNodeId &&
          occupancy.factionId !== event.factionId &&
          occupancy.shipCount > 0
        );
      });

      return safeControlledTritiumCount >= 2 && destinationHasEnemyIncome;
    });

    expect(
      result.debugEvents.some((event) => event.type === "FIRE_LAUNCHED" && event.turn === 10)
    ).toBe(true);
    expect(
      result.debugEvents.some((event) => {
        return event.type === "EVADE" && event.turn >= 10 && event.turn <= 30;
      })
    ).toBe(true);
    expect(offensiveBurn).toBeDefined();
    expect(offensiveBurn?.turn).toBeLessThanOrEqual(30);
    expect(result.debugEvents.some((event) => event.type === "AI_EVADE_FAILED")).toBe(false);
  });

  it("builds deterministic passive telemetry without calling the RNG", () => {
    const { content } = generateProceduralMap("qa-passive-telemetry");
    const state = createInitialGameState({
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const randomSpy = vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Telemetry must not call Math.random");
    });

    try {
      const firstMapHash = createMapGameplayHash(content, state);
      const secondMapHash = createMapGameplayHash(content, state);
      const firstTrajectoryHash = createTrajectoryHash([state], []);
      const secondTrajectoryHash = createTrajectoryHash([state], []);
      const telemetry = createSimulationTelemetry(
        content,
        state,
        [state],
        [
          {
            turn: 1,
            type: "FIRE_LAUNCHED",
            message: "test FIRE",
            nodeId: "mars_node",
            factionId: "player",
            targetNodeId: "jupiter_node"
          },
          {
            turn: 1,
            type: "EVADE",
            message: "test EVADE",
            nodeId: "jupiter_node",
            factionId: "opponent",
            amount: -1
          }
        ]
      );

      expect(secondMapHash).toBe(firstMapHash);
      expect(secondTrajectoryHash).toBe(firstTrajectoryHash);
      expect(
        createMapGameplayHash(content, {
          ...state,
          factionDv: { ...state.factionDv, player: (state.factionDv.player ?? 0) + 1 }
        })
      ).not.toBe(firstMapHash);
      expect(telemetry.effectiveCosts.fire).toEqual({
        total: 0,
        entries: [
          {
            turn: 1,
            factionId: "player",
            nodeId: "mars_node",
            targetNodeId: "jupiter_node",
            cost: 0
          }
        ]
      });
      expect(telemetry.effectiveCosts.evade).toEqual({
        total: 1,
        entries: [
          {
            turn: 1,
            factionId: "opponent",
            nodeId: "jupiter_node",
            cost: 1
          }
        ]
      });
    } finally {
      randomSpy.mockRestore();
    }
  });

  it("sends the turn-1 barren ship to the nearest safe neutral tritium", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 10, opponent: 20 },
      nodeOccupancies: [
        { nodeId: "saturn_node", factionId: "player", shipCount: 1 },
        { nodeId: "jupiter_node", factionId: "opponent", shipCount: 1 },
        { nodeId: "venus_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const expectedNeutral = ["uranus_node", "neptune_node"]
      .flatMap((nodeId) => {
        const plan = calculateBurnPlan(content, state, "venus_node", nodeId);
        return plan === null ? [] : [{ nodeId, ...plan }];
      })
      .sort((first, second) => {
        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }

        return first.nodeId.localeCompare(second.nodeId);
      })[0];

    if (expectedNeutral === undefined) {
      throw new Error("Expected a neutral tritium route from the barren start.");
    }

    const next = advanceTurn(state, content);

    expect(next.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        destinationNodeId: expectedNeutral.nodeId
      })
    );
    expect(next.activeBurnTransits).not.toContainEqual(
      expect.objectContaining({
        factionId: "opponent",
        originNodeId: "venus_node",
        destinationNodeId: "saturn_node"
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "AI_NEAREST_TRITIUM_DEFAULT_BURN",
        factionId: "opponent",
        nodeId: "venus_node",
        destinationNodeId: expectedNeutral.nodeId,
        reason: "turn-1-nearest-tritium"
      })
    );
  });

  it("starts the public-information economic mate at proc-mrxfie7y T62", () => {
    const generated = generateProceduralMap("proc-mrxfie7y-123vtne");
    const baseState = createInitialGameState({
      gameMode: "3p",
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "3p")
    });
    const initialState = {
      ...baseState,
      factions: baseState.factions.map((faction) => ({
        ...faction,
        controlType: "ai" as const
      }))
    };
    const result = runAiVsAiDebugSimulation(generated.content, initialState, 62);
    const mateEvents = result.debugEvents.filter(
      (event) => event.type === "AI_FORCED_ECONOMIC_MATE_FOUND"
    );

    expect(result.errors).toEqual([]);
    expect(mateEvents).toHaveLength(1);
    expect(mateEvents[0]).toEqual(
      expect.objectContaining({
        turn: 62,
        factionId: "player",
        targetFactionId: "opponent",
        action: "BURN",
        nodeId: "titan_node",
        destinationNodeId: "phobos_node",
        targetNodeId: "phobos_node",
        burnCost: 4,
        burnArrivalTurn: 66,
        expiresTurn: 66,
        reason: "public-contingent-cover-complete"
      })
    );
    expect(mateEvents[0]?.expected).toContain("Europa");
    expect(mateEvents[0]?.expected).toContain("Venus");
    expect(mateEvents[0]?.expected).toContain("Uranus");
    expect(mateEvents[0]?.expected).toContain("Neptune");
    expect(mateEvents[0]?.expected).toContain("Saturn");
    expect(result.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 62,
        type: "BURN_DEPARTED",
        factionId: "player",
        nodeId: "titan_node",
        destinationNodeId: "phobos_node"
      })
    );
  });

  it.each([
    ["europa_node", "BURN"],
    ["venus_node", "BURN"],
    ["uranus_node", "BURN"],
    ["neptune_node", "STAY_CONTESTED"],
    ["saturn_node", "STAY_CONTESTED"]
  ] as const)(
    "covers the public Phobos escape to %s by its first WORK turn",
    (destinationNodeId, expectedAction) => {
      const generated = generateProceduralMap("proc-mrxfie7y-123vtne");
      const enemyTransitPlan = calculateBurnPlan(
        generated.content,
        66,
        "phobos_node",
        destinationNodeId
      );

      if (enemyTransitPlan === null) {
        throw new Error(`Expected Phobos escape plan to ${destinationNodeId}.`);
      }

      const baseState = createInitialGameState({
        turn: 67,
        factionDv: { player: 50, opponent: 50 },
        nodeOccupancies: [
          { nodeId: "phobos_node", factionId: "player", shipCount: 1 },
          { nodeId: "neptune_node", factionId: "player", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "player", shipCount: 1 },
          { nodeId: "iapetus_node", factionId: "player", shipCount: 1 }
        ],
        activeBurnTransits: [
          {
            ...enemyTransitPlan,
            id: `test:opponent:phobos:${destinationNodeId}`,
            factionId: "opponent",
            shipCount: 1,
            departedTurn: 66
          }
        ]
      });
      const state = {
        ...baseState,
        factions: baseState.factions.map((faction) => ({
          ...faction,
          controlType: "ai" as const
        }))
      };
      const next = advanceTurn(state, generated.content, ["player"]);
      const selected = next.debugEvents.find(
        (event) =>
          event.type === "AI_ENDGAME_CLOSURE_SELECTED" &&
          event.factionId === "player" &&
          event.targetFactionId === "opponent"
      );

      expect(selected).toEqual(
        expect.objectContaining({
          turn: 68,
          action: expectedAction,
          targetNodeId: destinationNodeId,
          expiresTurn: enemyTransitPlan.arrivalTurn + 1,
          reason: "public-contingent-cover-complete"
        })
      );

      if (expectedAction === "BURN") {
        expect(selected?.burnArrivalTurn).toBeLessThanOrEqual(enemyTransitPlan.arrivalTurn + 1);
        expect(next.debugEvents).toContainEqual(
          expect.objectContaining({
            turn: 68,
            type: "BURN_DEPARTED",
            factionId: "player",
            destinationNodeId
          })
        );
      }
    }
  );

  it("uses a decisive public FIRE when BURN is unaffordable and the last ship cannot Evade", () => {
    const generated = generateProceduralMap("proc-mrxfie7y-123vtne");
    const enemyTransitPlan = calculateBurnPlan(generated.content, 60, "saturn_node", "phobos_node");

    if (enemyTransitPlan === null) {
      throw new Error("Expected the public Saturn to Phobos recovery transit.");
    }

    const baseState = createInitialGameState({
      turn: 61,
      factionDv: { player: 2, opponent: 0 },
      nodeOccupancies: [
        { nodeId: "titan_node", factionId: "player", shipCount: 1 },
        { nodeId: "neptune_node", factionId: "player", shipCount: 1 }
      ],
      activeBurnTransits: [
        {
          ...enemyTransitPlan,
          id: "test:opponent:last-recovery-transit",
          factionId: "opponent",
          shipCount: 1,
          departedTurn: 60
        }
      ]
    });
    const state = {
      ...baseState,
      factions: baseState.factions.map((faction) => ({
        ...faction,
        controlType: "ai" as const
      }))
    };
    const next = advanceTurn(state, generated.content, ["player"]);

    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 62,
        type: "AI_ENDGAME_CLOSURE_SELECTED",
        factionId: "player",
        targetFactionId: "opponent",
        action: "FIRE",
        nodeId: "titan_node",
        targetNodeId: "phobos_node",
        missileImpactTurn: 66,
        expiresTurn: 66
      })
    );
    expect(next.debugEvents).toContainEqual(
      expect.objectContaining({
        turn: 62,
        type: "FIRE_LAUNCHED",
        factionId: "player",
        nodeId: "titan_node",
        targetNodeId: "phobos_node"
      })
    );
  });

  it("does not invent a forced mate in the T72 or censored T100 replays", () => {
    const cases = [
      { seed: "diag-contested-20260723-0021", turns: 72 },
      { seed: "diag-contested-20260723-0030", turns: 100 }
    ] as const;

    for (const testCase of cases) {
      const generated = generateProceduralMap(testCase.seed);
      const baseState = createInitialGameState({
        nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "2p")
      });
      const initialState = {
        ...baseState,
        factions: baseState.factions.map((faction) => ({
          ...faction,
          controlType: "ai" as const
        }))
      };
      const result = runAiVsAiDebugSimulation(generated.content, initialState, testCase.turns);

      expect(result.errors).toEqual([]);
      expect(
        result.debugEvents.some((event) => event.type === "AI_FORCED_ECONOMIC_MATE_FOUND")
      ).toBe(false);
    }
  });

  it("keeps endgame planning deterministic and independent of hidden simultaneous BURN orders", () => {
    const generated = generateProceduralMap("proc-mrxfie7y-123vtne");
    const createHiddenOrderState = (destinationNodeId: "europa_node" | "venus_node") => {
      const hiddenPlan = calculateBurnPlan(generated.content, 66, "phobos_node", destinationNodeId);

      if (hiddenPlan === null) {
        throw new Error(`Expected hidden Phobos BURN to ${destinationNodeId}.`);
      }

      const baseState = createInitialGameState({
        turn: 66,
        factionDv: { player: 50, opponent: 50 },
        nodeOccupancies: [
          { nodeId: "phobos_node", factionId: "player", shipCount: 1 },
          { nodeId: "neptune_node", factionId: "player", shipCount: 1 },
          { nodeId: "saturn_node", factionId: "player", shipCount: 1 },
          { nodeId: "iapetus_node", factionId: "player", shipCount: 1 },
          { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 }
        ],
        pendingBurnOrders: [
          {
            ...hiddenPlan,
            id: `hidden:opponent:${destinationNodeId}`,
            factionId: "opponent",
            shipCount: 1
          }
        ],
        debugEvents: [
          {
            turn: 66,
            type: "AI_FORCED_ECONOMIC_MATE_FOUND",
            message: "Prior public closure",
            factionId: "player",
            targetFactionId: "opponent",
            targetNodeId: "phobos_node",
            reason: "public-contingent-cover-complete"
          }
        ]
      });

      return {
        ...baseState,
        factions: baseState.factions.map((faction) => ({
          ...faction,
          controlType: "ai" as const
        }))
      };
    };
    const europa = advanceTurn(createHiddenOrderState("europa_node"), generated.content, [
      "player"
    ]);
    const venus = advanceTurn(createHiddenOrderState("venus_node"), generated.content, ["player"]);
    const normalizeSelection = (state: typeof europa) => {
      const event = state.debugEvents.find(
        (candidate) =>
          candidate.type === "AI_ENDGAME_CLOSURE_SELECTED" && candidate.factionId === "player"
      );

      return {
        action: event?.action,
        nodeId: event?.nodeId,
        targetNodeId: event?.targetNodeId,
        reason: event?.reason,
        expected: event?.expected
      };
    };

    expect(normalizeSelection(europa)).toEqual(normalizeSelection(venus));
    expect(normalizeSelection(europa)).toEqual(
      expect.objectContaining({
        action: "STAY_CONTESTED",
        targetNodeId: "phobos_node",
        reason: "public-contingent-cover-complete"
      })
    );

    const replay = () => {
      const baseState = createInitialGameState({
        gameMode: "3p",
        nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "3p")
      });
      const initialState = {
        ...baseState,
        factions: baseState.factions.map((faction) => ({
          ...faction,
          controlType: "ai" as const
        }))
      };

      return runAiVsAiDebugSimulation(generated.content, initialState, 70);
    };
    const first = replay();
    const second = replay();

    expect(first.errors).toEqual([]);
    expect(second.errors).toEqual([]);
    expect(second.telemetry.trajectoryHash).toBe(first.telemetry.trajectoryHash);
  });
});
