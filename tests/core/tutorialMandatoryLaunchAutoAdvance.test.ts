import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import { advanceTurn, applyCommand, createInitialGameState } from "../../src/core";
import { parseSolarSystemData } from "../../src/data";
import {
  driveTutorialBurnToDestination,
  findTrackedTutorialMandatoryLaunchBurn
} from "../../src/ui/tutorial/runtimeState";

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);

describe("tutorial mandatory launch auto-advance", () => {
  it("tracks the mandatory launch identity instead of a stale earlier destination", () => {
    const tracked = findTrackedTutorialMandatoryLaunchBurn({
      burns: [
        {
          factionId: "player",
          originNodeId: "deimos_node",
          destinationNodeId: "saturn_node",
          arrivalTurn: 28
        },
        {
          factionId: "player",
          originNodeId: "saturn_node",
          destinationNodeId: "mars_node",
          arrivalTurn: 30,
          mandatoryLaunchId: "launch:player:saturn_node:T24:0"
        }
      ],
      activeMandatoryLaunchId: "launch:player:saturn_node:T24:0",
      cachedDestinationNodeId: "saturn_node",
      shipyardLessonNodeId: "mars_node",
      currentTurn: 24
    });

    expect(tracked).toEqual(
      expect.objectContaining({
        destinationNodeId: "mars_node",
        arrivalTurn: 30
      })
    );
  });

  it("skips real core turns until the player contests the enemy-occupied shipyard", async () => {
    const vanillaContent = parseSolarSystemData(JSON.parse(readFileSync(bodiesJsonUrl, "utf8")));
    const content = {
      ...vanillaContent,
      nodes: vanillaContent.nodes.map((node) => {
        return node.id === "saturn_node"
          ? {
              ...node,
              type: "shipyard" as const,
              producesTritium: false,
              allowsShipyard: true
            }
          : node;
      })
    };
    const mandatoryLaunchId = "launch:player:saturn_node:T24:0";
    let state = createInitialGameState({
      turn: 24,
      factionDv: { player: 40, opponent: 40 },
      nodeOccupancies: [
        { nodeId: "saturn_node", factionId: "player", shipCount: 2 },
        { nodeId: "mars_node", factionId: "opponent", shipCount: 1 }
      ],
      mandatoryLaunches: [
        {
          id: mandatoryLaunchId,
          nodeId: "saturn_node",
          factionId: "player",
          createdTurn: 24
        }
      ]
    });

    state = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        factionId: "player",
        originNodeId: "saturn_node",
        destinationNodeId: "mars_node"
      },
      content
    );

    const order = state.pendingBurnOrders.find((burn) => {
      return burn.mandatoryLaunchId === mandatoryLaunchId;
    });

    expect(order).toBeDefined();
    expect(order?.etaTurns).toBe(5);

    let autoResolvedTurns = 0;
    const resolvedTurnNumbers: number[] = [];
    const result = await driveTutorialBurnToDestination({
      maxTurns: 12,
      observe: () => ({
        turn: state.turn,
        isActive: true,
        hasReachedDestination:
          state.turn >= (order?.arrivalTurn ?? Number.POSITIVE_INFINITY) &&
          !state.pendingBurnOrders.some((burn) => burn.mandatoryLaunchId === mandatoryLaunchId) &&
          !state.activeBurnTransits.some((burn) => burn.mandatoryLaunchId === mandatoryLaunchId) &&
          state.nodeOccupancies.some((occupancy) => {
            return (
              occupancy.nodeId === "mars_node" &&
              occupancy.factionId === "player" &&
              occupancy.shipCount > 0
            );
          })
      }),
      advanceTurn: () => {
        state = advanceTurn(state, content, []);
        autoResolvedTurns += 1;
        resolvedTurnNumbers.push(state.turn);
        return Promise.resolve();
      }
    });

    expect(result).toBe("arrived");
    expect(autoResolvedTurns).toBe((order?.arrivalTurn ?? 24) - 24);
    expect(resolvedTurnNumbers).toEqual([25, 26, 27, 28, 29]);
    expect(state.nodeOccupancies).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          nodeId: "mars_node",
          factionId: "player",
          shipCount: 1
        }),
        expect.objectContaining({
          nodeId: "mars_node",
          factionId: "opponent",
          shipCount: 1
        })
      ])
    );
    expect(state.pendingBurnOrders).toEqual([]);
    expect(state.activeBurnTransits).toEqual([]);
  });
});
