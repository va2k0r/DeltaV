import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ADVANCE_TURN_COMMAND,
  applyCommand,
  createInitialGameState,
  createSolarSystemSnapshot,
  type ActiveBurnTransit,
  type ActiveMissile,
  type PendingBurnOrder,
  type PendingFireOrder,
  type SolarSystemSnapshot
} from "../../src/core";
import { generateProceduralMap, parseSolarSystemData, type SolarSystemData } from "../../src/data";
import {
  alignMissileFlightProgressToImpactPresentation,
  contestedUpkeepImpactVisualProgress,
  createReversibleReplaySnapshot,
  createOrbitalTransitionSnapshot,
  getMissileDefenseNeutralizationFlightProgress,
  getTransitionDepartingBurnTransits,
  getTransitionLaunchedMissiles,
  missileImpactVisualProgress,
  replayBurnArrivalVisualProgress,
  replayMissileDefenseVisualProgress,
  replayOrderLaunchVisualProgress,
  replayWorkVisualProgress
} from "../../src/renderers/cinematic3d";

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);

function loadContent(): SolarSystemData {
  return parseSolarSystemData(JSON.parse(readFileSync(bodiesJsonUrl, "utf8")));
}

function findBody(snapshot: ReturnType<typeof createSolarSystemSnapshot>, bodyId: string) {
  const body = snapshot.bodies.find((candidate) => candidate.id === bodyId);

  if (body === undefined) {
    throw new Error(`Expected body "${bodyId}".`);
  }

  return body;
}

describe("Orbital turn interpolation", () => {
  it("reconstructs the same complete replay state independently of scrub direction", () => {
    const content = loadContent();
    const ordered = applyCommand(
      createInitialGameState({
        factionDv: { player: 40, opponent: 0 },
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "saturn_node"
      },
      content
    );
    const resolved = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, ordered);
    const to = createSolarSystemSnapshot(content, resolved);
    const positions = [
      0,
      replayOrderLaunchVisualProgress - 0.001,
      replayOrderLaunchVisualProgress,
      replayWorkVisualProgress,
      replayBurnArrivalVisualProgress,
      1
    ];
    const forward = positions.map((position) => {
      return createReversibleReplaySnapshot(from, to, position);
    });
    const backward = [...positions].reverse().map((position) => {
      return createReversibleReplaySnapshot(from, to, position);
    });

    expect([...backward].reverse()).toEqual(forward);
    expect(forward[0]?.pendingBurnOrders).toEqual(from.pendingBurnOrders);
    expect(forward[0]?.activeBurnTransits).toEqual(from.activeBurnTransits);
    expect(forward.at(-1)?.nodeOccupancies).toEqual(to.nodeOccupancies);
    expect(forward.at(-1)?.activeBurnTransits).toEqual(to.activeBurnTransits);
  });

  it("reverses Shipyard progress, production, occupancy and mandatory launch as one state", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 50, opponent: 0 },
      nodeOccupancies: [{ nodeId: "mars_node", factionId: "player", shipCount: 1 }],
      shipyardProgress: [{ nodeId: "mars_node", progress: 4, workerFactionId: "player" }]
    });
    const produced = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, state);
    const to = createSolarSystemSnapshot(content, produced);
    const before = createReversibleReplaySnapshot(from, to, replayWorkVisualProgress - 0.001);
    const after = createReversibleReplaySnapshot(from, to, replayWorkVisualProgress);
    const rewound = createReversibleReplaySnapshot(from, to, replayWorkVisualProgress - 0.001);

    expect(to.debugEvents).toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED", nodeId: "mars_node" })
    );
    expect(before.shipyardProgress).toEqual(from.shipyardProgress);
    expect(before.nodeOccupancies).toEqual(from.nodeOccupancies);
    expect(before.mandatoryLaunches).toEqual(from.mandatoryLaunches);
    expect(before.debugEvents).not.toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED" })
    );
    expect(after.shipyardProgress).toEqual(to.shipyardProgress);
    expect(after.nodeOccupancies).toEqual(to.nodeOccupancies);
    expect(after.mandatoryLaunches).toEqual(to.mandatoryLaunches);
    expect(after.debugEvents).toContainEqual(
      expect.objectContaining({ type: "SHIP_PRODUCED", nodeId: "mars_node" })
    );
    expect(rewound).toEqual(before);
  });

  it("starts the physical FIRE launch immediately while reversing the committed order cue", () => {
    const content = loadContent();
    const ordered = applyCommand(
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
    const launched = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, ordered);
    const to = createSolarSystemSnapshot(content, launched);
    const before = createReversibleReplaySnapshot(
      from,
      to,
      replayOrderLaunchVisualProgress - 0.001
    );
    const after = createReversibleReplaySnapshot(from, to, replayOrderLaunchVisualProgress);
    const rewound = createReversibleReplaySnapshot(
      from,
      to,
      replayOrderLaunchVisualProgress - 0.001
    );

    expect(before.pendingFireOrders).toEqual(from.pendingFireOrders);
    expect(before.activeMissiles).toEqual(to.activeMissiles);
    expect(after.pendingFireOrders).toEqual([]);
    expect(after.activeMissiles).toEqual(to.activeMissiles);
    expect(rewound.pendingFireOrders).toEqual(from.pendingFireOrders);
    expect(rewound.activeMissiles).toEqual(to.activeMissiles);
  });

  it("consumes the last missile trajectory segment before the impact presentation begins", () => {
    const missile = {
      issuedTurn: 4,
      missileEtaTurns: 2
    } satisfies Pick<ActiveMissile, "issuedTurn" | "missileEtaTurns">;

    expect(alignMissileFlightProgressToImpactPresentation(missile, 5, 6, 5)).toBeCloseTo(0.5, 8);
    expect(
      alignMissileFlightProgressToImpactPresentation(missile, 5, 6, 5 + missileImpactVisualProgress)
    ).toBeCloseTo(1, 8);
    expect(alignMissileFlightProgressToImpactPresentation(missile, 5, 6, 6)).toBe(1);
  });

  it("anchors EVADE neutralization to the missile position at the defense cue", () => {
    const missile = {
      issuedTurn: 3,
      missileEtaTurns: 6
    } satisfies Pick<ActiveMissile, "issuedTurn" | "missileEtaTurns">;

    const neutralizationProgress = getMissileDefenseNeutralizationFlightProgress(missile, 8, 9);
    const activeMarkerProgress = alignMissileFlightProgressToImpactPresentation(
      missile,
      8,
      9,
      8 + replayMissileDefenseVisualProgress
    );

    expect(neutralizationProgress).toBeCloseTo(activeMarkerProgress, 8);
    expect(neutralizationProgress).toBeGreaterThan(
      (8 - missile.issuedTurn) / missile.missileEtaTurns
    );
    expect(neutralizationProgress).toBeLessThan(1);
  });

  it("ends exactly at the deterministic next-turn body and node positions", () => {
    const content = loadContent();
    const from = createSolarSystemSnapshot(content, 0);
    const to = createSolarSystemSnapshot(content, 1);
    const final = createOrbitalTransitionSnapshot(from, to, 1);

    expect(final.bodies.map((body) => body.position)).toEqual(
      to.bodies.map((body) => body.position)
    );
    expect(final.nodes.map((node) => node.position)).toEqual(to.nodes.map((node) => node.position));
  });

  it("holds discrete arrival state without moving orbital geometry backward", () => {
    const content = loadContent();
    const from = createSolarSystemSnapshot(content, 0);
    const pendingBurn: PendingBurnOrder = {
      id: "next-turn-burn",
      originNodeId: "mars_node",
      destinationNodeId: "saturn_node",
      burnCost: 4,
      etaTurns: 3,
      issuedTurn: 1,
      arrivalTurn: 4,
      originPosition: { x: 0, y: 0 },
      destinationPositionAtArrival: { x: 1, y: 1 },
      factionId: "player",
      shipCount: 1
    };
    const to: SolarSystemSnapshot = {
      ...createSolarSystemSnapshot(content, 1),
      pendingBurnOrders: [pendingBurn]
    };
    const heldArrivalFrame = createOrbitalTransitionSnapshot(from, to, 1, 0.999);

    expect(heldArrivalFrame.bodies.map((body) => body.position)).toEqual(
      to.bodies.map((body) => body.position)
    );
    expect(heldArrivalFrame.nodes.map((node) => node.position)).toEqual(
      to.nodes.map((node) => node.position)
    );
    expect(heldArrivalFrame.pendingBurnOrders).toEqual([]);
  });

  it("follows orbital angle instead of cutting through a straight-line chord", () => {
    const content = loadContent();
    const from = createSolarSystemSnapshot(content, 0);
    const to = createSolarSystemSnapshot(content, 1);
    const midpoint = createOrbitalTransitionSnapshot(from, to, 0.5);
    const mercury = findBody(midpoint, "mercury");
    const sun = findBody(midpoint, "sun");
    const orbitalDistance = Math.hypot(
      mercury.position.x - sun.position.x,
      mercury.position.y - sun.position.y
    );

    expect(orbitalDistance).toBeCloseTo(mercury.orbitRadius, 8);
  });

  it("keeps moons attached to interpolated parent positions", () => {
    const content = loadContent();
    const from = createSolarSystemSnapshot(content, 3);
    const to = createSolarSystemSnapshot(content, 4);
    const midpoint = createOrbitalTransitionSnapshot(from, to, 0.5);
    const jupiter = findBody(midpoint, "jupiter");
    const callisto = findBody(midpoint, "callisto");
    const localDistance = Math.hypot(
      callisto.position.x - jupiter.position.x,
      callisto.position.y - jupiter.position.y
    );

    expect(localDistance).toBeCloseTo(callisto.orbitRadius, 8);
  });

  it("waits until the visual turn completes before showing newly planned previews", () => {
    const content = loadContent();
    const from = createSolarSystemSnapshot(content, 0);
    const futureBurn: PendingBurnOrder = {
      id: "future-burn-preview",
      originNodeId: "mars_node",
      destinationNodeId: "saturn_node",
      burnCost: 4,
      etaTurns: 3,
      issuedTurn: 1,
      arrivalTurn: 4,
      originPosition: { x: 0, y: 0 },
      destinationPositionAtArrival: { x: 1, y: 1 },
      factionId: "player",
      shipCount: 1
    };
    const futureFire: PendingFireOrder = {
      id: "future-fire-preview",
      originNodeId: "mars_node",
      targetNodeId: "venus_node",
      missileEtaTurns: 2,
      issuedTurn: 1,
      impactTurn: 3,
      originPosition: { x: 0, y: 0 },
      targetPositionAtImpact: { x: 1, y: 1 },
      factionId: "player",
      targetFactionId: "opponent",
      targetShipKey: "venus_node:opponent"
    };
    const to: SolarSystemSnapshot = {
      ...createSolarSystemSnapshot(content, 1),
      pendingBurnOrders: [futureBurn],
      pendingFireOrders: [futureFire]
    };

    const transitionStart = createOrbitalTransitionSnapshot(from, to, 0);
    const transitionMidpoint = createOrbitalTransitionSnapshot(from, to, 0.5);
    const final = createOrbitalTransitionSnapshot(from, to, 1);

    expect(transitionStart.pendingBurnOrders).toEqual([]);
    expect(transitionStart.pendingFireOrders).toEqual([]);
    expect(transitionMidpoint.pendingBurnOrders).toEqual([]);
    expect(transitionMidpoint.pendingFireOrders).toEqual([]);
    expect(final.pendingBurnOrders).toEqual([futureBurn]);
    expect(final.pendingFireOrders).toEqual([futureFire]);
  });

  it("captures launches planned by AI inside the same turn transition", () => {
    const content = loadContent();
    const continuingBurn = {
      id: "continuing-burn",
      originNodeId: "mars_node",
      destinationNodeId: "saturn_node",
      burnCost: 4,
      etaTurns: 4,
      issuedTurn: 2,
      departedTurn: 2,
      arrivalTurn: 6,
      originPosition: { x: 0, y: 0 },
      destinationPositionAtArrival: { x: 1, y: 1 },
      factionId: "player",
      shipCount: 1
    } satisfies ActiveBurnTransit;
    const aiBurn = {
      ...continuingBurn,
      id: "same-transition-ai-burn",
      originNodeId: "mercury_node",
      destinationNodeId: "jupiter_node",
      issuedTurn: 3,
      departedTurn: 3,
      arrivalTurn: 6,
      factionId: "opponent"
    } satisfies ActiveBurnTransit;
    const continuingMissile = {
      id: "continuing-missile",
      originNodeId: "mars_node",
      targetNodeId: "venus_node",
      missileEtaTurns: 3,
      issuedTurn: 2,
      launchedTurn: 3,
      impactTurn: 5,
      originPosition: { x: 0, y: 0 },
      targetPositionAtImpact: { x: 1, y: 1 },
      factionId: "player",
      targetFactionId: "opponent",
      targetShipKey: "venus_node:opponent"
    } satisfies ActiveMissile;
    const aiMissile = {
      ...continuingMissile,
      id: "same-transition-ai-missile",
      originNodeId: "mercury_node",
      targetNodeId: "mars_node",
      issuedTurn: 3,
      launchedTurn: 4,
      impactTurn: 6,
      factionId: "opponent",
      targetFactionId: "player",
      targetShipKey: "mars_node:player"
    } satisfies ActiveMissile;
    const from: SolarSystemSnapshot = {
      ...createSolarSystemSnapshot(content, 3),
      activeBurnTransits: [continuingBurn],
      activeMissiles: [continuingMissile]
    };
    const to: SolarSystemSnapshot = {
      ...createSolarSystemSnapshot(content, 4),
      activeBurnTransits: [continuingBurn, aiBurn],
      activeMissiles: [continuingMissile, aiMissile]
    };

    expect(from.pendingBurnOrders).toEqual([]);
    expect(from.pendingFireOrders).toEqual([]);
    expect(getTransitionDepartingBurnTransits(from, to)).toEqual([aiBurn]);
    expect(getTransitionLaunchedMissiles(from, to)).toEqual([aiMissile]);
  });

  it("keeps BURN arrivals off the destination until the transition completes", () => {
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
    const etaTurns = ordered.pendingBurnOrders[0]?.etaTurns ?? 0;
    let beforeArrival = ordered;

    while (beforeArrival.turn < etaTurns - 1) {
      beforeArrival = applyCommand(beforeArrival, ADVANCE_TURN_COMMAND, content);
    }

    const arrived = applyCommand(beforeArrival, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, beforeArrival);
    const to = createSolarSystemSnapshot(content, arrived);
    const midpoint = createOrbitalTransitionSnapshot(from, to, 0.5);
    const final = createOrbitalTransitionSnapshot(from, to, 1);
    const destinationOccupancy = {
      nodeId: "saturn_node",
      factionId: "player",
      shipCount: 1
    };

    expect(etaTurns).toBeGreaterThanOrEqual(2);
    expect(to.nodeOccupancies).toContainEqual(destinationOccupancy);
    expect(midpoint.nodeOccupancies).not.toContainEqual(destinationOccupancy);
    expect(final.nodeOccupancies).toContainEqual(destinationOccupancy);
  });

  it("presents one-turn BURN arrivals as in-flight during the turn transition", () => {
    const content = generateProceduralMap("qa-one-turn-burn-presentation").content;
    const ordered = applyCommand(
      createInitialGameState({
        nodeOccupancies: [{ nodeId: "mars_node", factionId: "opponent", shipCount: 1 }]
      }),
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node",
        factionId: "opponent"
      },
      content
    );
    const order = ordered.pendingBurnOrders[0];

    if (order === undefined) {
      throw new Error("Expected pending BURN order.");
    }

    const arrived = applyCommand(ordered, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, ordered);
    const to = createSolarSystemSnapshot(content, arrived);
    const midpoint = createOrbitalTransitionSnapshot(from, to, 0.5);
    const final = createOrbitalTransitionSnapshot(from, to, 1);
    const destinationOccupancy = {
      nodeId: "deimos_node",
      factionId: "opponent",
      shipCount: 1
    };

    expect(order.etaTurns).toBe(1);
    expect(to.activeBurnTransits).toEqual([]);
    expect(midpoint.activeBurnTransits).toContainEqual(
      expect.objectContaining({
        id: order.id,
        originNodeId: "mars_node",
        destinationNodeId: "deimos_node",
        factionId: "opponent",
        departedTurn: ordered.turn
      })
    );
    expect(midpoint.nodeOccupancies).not.toContainEqual(destinationOccupancy);
    expect(final.activeBurnTransits).not.toContainEqual(expect.objectContaining({ id: order.id }));
    expect(final.nodeOccupancies).toContainEqual(destinationOccupancy);
  });

  it("keeps impact missiles and their target ships visible until the visual impact moment", () => {
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

    state = applyCommand(state, ADVANCE_TURN_COMMAND);
    const missile = state.activeMissiles[0];

    if (missile === undefined) {
      throw new Error("Expected active missile.");
    }

    while (state.turn < missile.impactTurn - 1) {
      state = applyCommand(state, ADVANCE_TURN_COMMAND);
    }

    const impacted = applyCommand(state, ADVANCE_TURN_COMMAND);
    const from = createSolarSystemSnapshot(content, state);
    const to = createSolarSystemSnapshot(content, impacted);
    const targetOccupancy = {
      nodeId: "venus_node",
      factionId: "opponent",
      shipCount: 1
    };
    const beforeImpact = createOrbitalTransitionSnapshot(
      from,
      to,
      missileImpactVisualProgress - 0.01
    );
    const atImpact = createOrbitalTransitionSnapshot(from, to, missileImpactVisualProgress);

    expect(to.activeMissiles).toEqual([]);
    expect(to.nodeOccupancies).not.toContainEqual(targetOccupancy);
    expect(beforeImpact.activeMissiles).toContainEqual(expect.objectContaining({ id: missile.id }));
    expect(beforeImpact.nodeOccupancies).toContainEqual(targetOccupancy);
    expect(atImpact.activeMissiles).not.toContainEqual(expect.objectContaining({ id: missile.id }));
    expect(atImpact.nodeOccupancies).not.toContainEqual(targetOccupancy);
  });

  it("keeps contested ships intact until their reversible upkeep-destruction moment", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 0, opponent: 0 },
      nodeOccupancies: [
        { nodeId: "mars_node", factionId: "player", shipCount: 1 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ]
    });
    const destroyed = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, state);
    const to = createSolarSystemSnapshot(content, destroyed);
    const playerShip = {
      nodeId: "mars_node",
      factionId: "player",
      shipCount: 1
    };
    const beforeDestruction = createOrbitalTransitionSnapshot(
      from,
      to,
      contestedUpkeepImpactVisualProgress - 0.001
    );
    const atDestruction = createOrbitalTransitionSnapshot(
      from,
      to,
      contestedUpkeepImpactVisualProgress
    );

    expect(to.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "CONTESTED_UPKEEP_FAILED",
        nodeId: "mars_node",
        factionId: "player"
      })
    );
    expect(beforeDestruction.nodeOccupancies).toContainEqual(playerShip);
    expect(atDestruction.nodeOccupancies).not.toContainEqual(playerShip);
  });

  it("removes only missiles evaded this turn from normal flight interpolation", () => {
    const content = loadContent();
    const state = createInitialGameState({
      factionDv: { player: 10, opponent: 10 },
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
    });
    const evaded = applyCommand(state, ADVANCE_TURN_COMMAND, content);
    const from = createSolarSystemSnapshot(content, state);
    const to = createSolarSystemSnapshot(content, evaded);
    const transitionStart = createOrbitalTransitionSnapshot(from, to, 0);
    const beforeImpactMoment = createOrbitalTransitionSnapshot(
      from,
      to,
      missileImpactVisualProgress - 0.01
    );
    const replayBeforeDefense = createReversibleReplaySnapshot(
      from,
      to,
      replayMissileDefenseVisualProgress - 0.001
    );
    const replayAfterDefense = createReversibleReplaySnapshot(
      from,
      to,
      replayMissileDefenseVisualProgress
    );
    const replayRewound = createReversibleReplaySnapshot(
      from,
      to,
      replayMissileDefenseVisualProgress - 0.001
    );

    expect(to.activeMissiles).toEqual([
      expect.objectContaining({ id: "opponent-fire-jupiter-later" })
    ]);
    expect(transitionStart.activeMissiles).toEqual([
      expect.objectContaining({ id: "opponent-fire-jupiter-later" })
    ]);
    expect(beforeImpactMoment.activeMissiles).toEqual([
      expect.objectContaining({ id: "opponent-fire-jupiter-later" })
    ]);
    expect(to.activeMissiles).not.toContainEqual(
      expect.objectContaining({ id: "opponent-fire-jupiter-now" })
    );
    expect(transitionStart.activeMissiles).not.toContainEqual(
      expect.objectContaining({ id: "opponent-fire-jupiter-now" })
    );
    expect(replayBeforeDefense.activeMissiles).toContainEqual(
      expect.objectContaining({ id: "opponent-fire-jupiter-now" })
    );
    expect(replayAfterDefense.activeMissiles).not.toContainEqual(
      expect.objectContaining({ id: "opponent-fire-jupiter-now" })
    );
    expect(replayRewound.activeMissiles).toEqual(replayBeforeDefense.activeMissiles);
    expect(to.debugEvents).toContainEqual(
      expect.objectContaining({
        type: "EVADE",
        nodeId: "jupiter_node",
        factionId: "player",
        missileId: "opponent-fire-jupiter-now"
      })
    );
  });
});
