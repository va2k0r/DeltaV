import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { calculateBurnPlan, calculateFirePlan, describeTransferRoute } from "../../src/core";
import { generateProceduralMap, parseSolarSystemData, type SolarSystemData } from "../../src/data";

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);

function loadContent(): SolarSystemData {
  return parseSolarSystemData(JSON.parse(readFileSync(bodiesJsonUrl, "utf8")));
}

function getReferenceBodyId(content: SolarSystemData, bodyId: string): string {
  const body = content.bodies.find((candidate) => candidate.id === bodyId);

  if (body === undefined) {
    throw new Error(`Expected body ${bodyId}.`);
  }

  return body.parentId === null || body.parentId === "sun" ? body.id : body.parentId;
}

function getProceduralReferenceDistanceGap(
  content: SolarSystemData,
  originNodeId: string,
  destinationNodeId: string
): number | null {
  const rules = content.transferRules;
  const originNode = content.nodes.find((node) => node.id === originNodeId);
  const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);

  if (rules === undefined || originNode === undefined || destinationNode === undefined) {
    return null;
  }

  const originReferenceBodyId = getReferenceBodyId(content, originNode.bodyId);
  const destinationReferenceBodyId = getReferenceBodyId(content, destinationNode.bodyId);

  if (originReferenceBodyId === destinationReferenceBodyId) {
    return null;
  }

  const originScale = rules.planetDistanceScale[originReferenceBodyId];
  const destinationScale = rules.planetDistanceScale[destinationReferenceBodyId];

  if (originScale === undefined || destinationScale === undefined) {
    return null;
  }

  return Math.abs(originScale - destinationScale);
}

describe("continuous transfer timing", () => {
  it("fixes direct planet-moon flight time for single-moon systems", () => {
    const content = loadContent();
    const routeEtas = [
      ["earth_node", "moon_node", 1],
      ["moon_node", "earth_node", 1],
      ["mars_node", "deimos_node", 2],
      ["deimos_node", "mars_node", 2],
      ["jupiter_node", "callisto_node", 2],
      ["callisto_node", "jupiter_node", 2],
      ["uranus_node", "oberon_node", 2],
      ["oberon_node", "uranus_node", 2],
      ["neptune_node", "triton_node", 2],
      ["triton_node", "neptune_node", 2]
    ] as const;

    for (const [originNodeId, destinationNodeId, etaTurns] of routeEtas) {
      const burn = calculateBurnPlan(content, 0, originNodeId, destinationNodeId);
      const fire = calculateFirePlan(content, 0, originNodeId, destinationNodeId);

      expect(burn?.etaTurns).toBe(etaTurns);

      if (fire !== null) {
        expect(fire.missileEtaTurns).toBe(etaTurns);
      }
    }
  });

  it("keeps representative transfer diagnostics in the tactical target ranges", () => {
    const content = loadContent();
    const routeIds = [
      ["deimos_node", "mars_node"],
      ["titan_node", "iapetus_node"],
      ["uranus_node", "oberon_node"],
      ["neptune_node", "triton_node"],
      ["mercury_node", "jupiter_node"],
      ["jupiter_node", "pluto_charon_node"],
      ["triton_node", "mercury_node"]
    ] as const;
    const routes = routeIds.map(([originNodeId, destinationNodeId]) => {
      const route = describeTransferRoute(content, 0, originNodeId, destinationNodeId);

      if (route === null) {
        throw new Error(`Expected route ${originNodeId} -> ${destinationNodeId}.`);
      }

      return route;
    });

    for (const route of routes) {
      expect(route.transferTurns).toBeGreaterThanOrEqual(1);
      expect(route.transferTurns).toBeLessThanOrEqual(7);
      expect(route.burnCost).toBeGreaterThanOrEqual(2);
      expect(route.burnCost).toBeLessThanOrEqual(10);
      expect(route.zHeight).toBeGreaterThan(0);
    }

    expect(routes[0]?.transferTurns).toBeLessThanOrEqual(3);
    expect(routes[1]?.transferTurns).toBeLessThanOrEqual(4);
    expect(routes[4]?.burnCost).toBeGreaterThanOrEqual(4);
    expect(routes[6]?.burnCost).toBeGreaterThanOrEqual(6);
  });

  it("uses the same ETA for FIRE as the equivalent BURN and keeps FIRE at zero cost", () => {
    const content = loadContent();
    const burn = calculateBurnPlan(content, 0, "venus_node", "triton_node");
    const fire = calculateFirePlan(content, 0, "venus_node", "triton_node");

    expect(burn).not.toBeNull();
    expect(fire).not.toBeNull();
    expect(fire?.missileEtaTurns).toBe(burn?.etaTurns);
  });

  it("uses balanced procedural transfer rules with local T+1/T+2 and varied long routes", () => {
    const { content } = generateProceduralMap("qa-balanced-transfer-rules");
    const routeEtas = [
      ["mars_node", "phobos_node", 1],
      ["mars_node", "deimos_node", 1],
      ["jupiter_node", "io_node", 1],
      ["jupiter_node", "callisto_node", 2],
      ["io_node", "europa_node", 2],
      ["io_node", "callisto_node", 2]
    ] as const;

    for (const [originNodeId, destinationNodeId, etaTurns] of routeEtas) {
      const burn = calculateBurnPlan(content, 0, originNodeId, destinationNodeId);
      const fire = calculateFirePlan(content, 0, originNodeId, destinationNodeId);

      expect(burn?.etaTurns).toBe(etaTurns);

      if (fire !== null) {
        expect(fire.missileEtaTurns).toBe(etaTurns);
      }
    }

    const observedEtas = new Set<number>();
    const observedEtaValues: number[] = [];
    const longInterplanetaryEtas: number[] = [];

    for (const origin of content.nodes) {
      for (const destination of content.nodes) {
        if (origin.id === destination.id) {
          continue;
        }

        const plan = calculateBurnPlan(content, 0, origin.id, destination.id);

        if (plan !== null) {
          observedEtas.add(plan.etaTurns);
          observedEtaValues.push(plan.etaTurns);

          const distanceGap = getProceduralReferenceDistanceGap(content, origin.id, destination.id);

          if (distanceGap !== null && distanceGap >= 9) {
            longInterplanetaryEtas.push(plan.etaTurns);
          }
        }
      }
    }

    for (const etaTurns of [1, 2, 3, 4, 5, 6, 7]) {
      expect(observedEtas.has(etaTurns)).toBe(true);
    }
    expect(observedEtas.has(8)).toBe(false);

    const averageEta =
      observedEtaValues.reduce((total, etaTurns) => total + etaTurns, 0) / observedEtaValues.length;
    expect(averageEta).toBeGreaterThan(4.6);
    expect(averageEta).toBeLessThan(5.2);

    expect(longInterplanetaryEtas.length).toBeGreaterThan(0);
    expect(Math.min(...longInterplanetaryEtas)).toBeLessThan(7);
    expect(Math.max(...longInterplanetaryEtas)).toBe(7);

    const longAverageEta =
      longInterplanetaryEtas.reduce((total, etaTurns) => total + etaTurns, 0) /
      longInterplanetaryEtas.length;
    expect(longAverageEta).toBeGreaterThan(6.3);
  });

  it("can expose discrete window changes between departing now and next turn", () => {
    const content = loadContent();
    const changedRoute = content.nodes
      .flatMap((origin) => {
        return content.nodes
          .filter((destination) => destination.id !== origin.id)
          .map((destination) => {
            const now = calculateBurnPlan(content, 0, origin.id, destination.id);
            const later = calculateBurnPlan(content, 1, origin.id, destination.id);

            return { origin, destination, now, later };
          });
      })
      .find(({ now, later }) => {
        return (
          now !== null &&
          later !== null &&
          (now.etaTurns !== later.etaTurns || now.burnCost !== later.burnCost)
        );
      });

    expect(changedRoute).toBeDefined();
  });
});
