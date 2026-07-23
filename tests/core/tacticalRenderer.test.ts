import { describe, expect, it } from "vitest";
import type { SolarSystemSnapshot } from "../../src/core";
import { createTacticalRenderModel } from "../../src/renderers/tactical2d";

describe("Tactical renderer model", () => {
  it("consumes a snapshot instead of owning core rules", () => {
    const snapshot: SolarSystemSnapshot = {
      turn: 4,
      factionDv: { player: 10, opponent: 10 },
      bounds: { minX: -10, minY: -10, maxX: 10, maxY: 10 },
      bodies: [
        {
          id: "sun",
          name: "Sun",
          kind: "star",
          parentId: null,
          position: { x: 0, y: 0 },
          orbitRadius: 0,
          orbitPeriodTurns: 0,
          initialAngle: 0,
          visualRadius: 10,
          visualClass: "star"
        },
        {
          id: "earth",
          name: "Earth",
          kind: "planet",
          parentId: "sun",
          position: { x: 6, y: 2 },
          orbitRadius: 6,
          orbitPeriodTurns: 12,
          initialAngle: 0,
          visualRadius: 2,
          visualClass: "protected"
        }
      ],
      nodes: [
        {
          id: "earth_node",
          bodyId: "earth",
          label: "Earth",
          type: "protected",
          position: { x: 6, y: 2 },
          nodeOrbitRadius: 5,
          controllable: false,
          contestable: false,
          protectedNoWar: true,
          weaponsOffline: false,
          producesTritium: false,
          allowsShipyard: false,
          gravityWell: 0,
          tritiumOutput: 0,
          shipyardProgress: 0,
          isWorking: false,
          isContested: false,
          contestedFactionIds: []
        }
      ],
      nodeOccupancies: [],
      shipyardProgress: [],
      mandatoryLaunches: [],
      pendingBurnOrders: [],
      pendingFireOrders: [],
      activeBurnTransits: [],
      activeMissiles: [],
      debugEvents: []
    };
    const model = createTacticalRenderModel(snapshot);

    expect(model.turn).toBe(snapshot.turn);
    expect(model.nodes).toBe(snapshot.nodes);
    expect(model.orbitRails.map((body) => body.id)).toEqual(["earth"]);
  });
});
