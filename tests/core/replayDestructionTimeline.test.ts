import { describe, expect, it } from "vitest";
import type { ActiveMissile, TurnDebugEvent } from "../../src/core";
import { missileImpactVisualProgress } from "../../src/renderers/cinematic3d";
import {
  contestedUpkeepImpactVisualProgress,
  createReplayShipDestructionTimeline,
  getReplayShipDestructionAgeSeconds,
  getReplayShipDestructionFrames,
  replayDestructionSecondsPerTurn,
  type ReplayDestructionTransition
} from "../../src/renderers/cinematic3d/replayDestructionTimeline";

function createMissile(id: string): ActiveMissile {
  return {
    id,
    originNodeId: "phobos_node",
    targetNodeId: "mars_node",
    missileEtaTurns: 1,
    issuedTurn: 4,
    impactTurn: 5,
    originPosition: { x: 0, y: 0 },
    targetPositionAtImpact: { x: 1, y: 0 },
    factionId: "opponent",
    targetFactionId: "player",
    targetShipKey: "mars_node:player",
    launchedTurn: 4
  };
}

function createTransition(
  fromTurn: number,
  toTurn: number,
  activeMissiles: readonly ActiveMissile[],
  debugEvents: readonly TurnDebugEvent[]
): ReplayDestructionTransition {
  return {
    from: {
      turn: fromTurn,
      activeMissiles,
      debugEvents: []
    },
    to: {
      turn: toTurn,
      activeMissiles: [],
      debugEvents
    }
  };
}

describe("reversible replay destruction timeline", () => {
  it("keeps the ship intact before impact and deterministically disperses or recomposes debris", () => {
    const missile = createMissile("reversible-impact");
    const transition = createTransition(
      4,
      5,
      [missile],
      [
        {
          turn: 5,
          type: "MISSILE_IMPACT",
          message: "impact",
          nodeId: "mars_node",
          factionId: "player",
          missileId: missile.id
        },
        {
          turn: 5,
          type: "SHIP_DESTROYED",
          message: "destroyed",
          nodeId: "mars_node",
          factionId: "player"
        }
      ]
    );
    const destructions = createReplayShipDestructionTimeline([transition]);
    const destruction = destructions[0];

    expect(destruction).toMatchObject({
      id: "reversible-impact:impact:5",
      source: "missile-impact",
      impactTimelinePosition: missileImpactVisualProgress,
      impactTurn: missile.impactTurn
    });

    if (destruction === undefined) {
      throw new Error("Expected missile destruction.");
    }

    expect(
      getReplayShipDestructionFrames(destructions, missileImpactVisualProgress - 0.001)
    ).toEqual([]);
    expect(getReplayShipDestructionAgeSeconds(destruction, missileImpactVisualProgress)).toBe(0);
    expect(
      getReplayShipDestructionAgeSeconds(destruction, missileImpactVisualProgress + 1)
    ).toBeCloseTo(replayDestructionSecondsPerTurn);

    const forwardAges = [0, 0.5, 1].map((offset) => {
      return getReplayShipDestructionAgeSeconds(destruction, missileImpactVisualProgress + offset);
    });
    const rewindAges = [...forwardAges].reverse();

    expect(forwardAges[0]).toBe(0);
    expect(forwardAges[1]).toBeCloseTo(replayDestructionSecondsPerTurn * 0.5);
    expect(forwardAges[2]).toBeCloseTo(replayDestructionSecondsPerTurn);
    expect(rewindAges[0]).toBeCloseTo(replayDestructionSecondsPerTurn);
    expect(rewindAges[1]).toBeCloseTo(replayDestructionSecondsPerTurn * 0.5);
    expect(rewindAges[2]).toBe(0);
  });

  it("reconstructs contested-upkeep destruction without inventing mandatory-launch debris", () => {
    const contestedEvents: readonly TurnDebugEvent[] = [
      {
        turn: 8,
        type: "CONTESTED_UPKEEP_FAILED",
        message: "upkeep failed",
        nodeId: "mars_node",
        factionId: "player"
      },
      {
        turn: 8,
        type: "SHIP_DESTROYED",
        message: "destroyed",
        nodeId: "mars_node",
        factionId: "player"
      }
    ];
    const mandatoryEvents: readonly TurnDebugEvent[] = [
      {
        turn: 9,
        type: "CONTESTED_UPKEEP_FAILED",
        message: "upkeep failed",
        nodeId: "venus_node",
        factionId: "opponent"
      },
      {
        turn: 9,
        type: "MANDATORY_LAUNCH_DESTROYED",
        message: "mandatory launch destroyed",
        nodeId: "venus_node",
        factionId: "opponent",
        mandatoryLaunchId: "launch-1"
      },
      {
        turn: 9,
        type: "SHIP_DESTROYED",
        message: "destroyed",
        nodeId: "venus_node",
        factionId: "opponent",
        mandatoryLaunchId: "launch-1"
      }
    ];
    const destructions = createReplayShipDestructionTimeline([
      createTransition(7, 8, [], contestedEvents),
      createTransition(8, 9, [], mandatoryEvents)
    ]);

    expect(destructions).toHaveLength(1);
    expect(destructions[0]).toMatchObject({
      source: "contested-upkeep",
      impactTimelinePosition: contestedUpkeepImpactVisualProgress
    });
  });
});
