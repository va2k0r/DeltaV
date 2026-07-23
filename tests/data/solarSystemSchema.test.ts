import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parseSolarSystemData, type SolarSystemData } from "../../src/data";

type MutableFixture = {
  bodies: Array<Record<string, unknown>>;
  nodes: Array<Record<string, unknown>>;
};

const bodiesJsonUrl = new URL("../../public/content/vanilla/data/bodies.json", import.meta.url);

function loadFixture(): MutableFixture {
  return JSON.parse(readFileSync(bodiesJsonUrl, "utf8")) as MutableFixture;
}

function findNodeByBodyId(data: SolarSystemData, bodyId: string) {
  const node = data.nodes.find((candidate) => candidate.bodyId === bodyId);

  if (node === undefined) {
    throw new Error(`Expected node for body "${bodyId}".`);
  }

  return node;
}

describe("Solar System content schema", () => {
  it("accepts the vanilla bodies.json file", () => {
    const data = parseSolarSystemData(loadFixture());

    expect(data.bodies.map((body) => body.id)).toContain("pluto_charon");
    expect(data.nodes).toHaveLength(18);
  });

  it("fails loudly for an invalid node type", () => {
    const fixture = loadFixture();
    const firstNode = fixture.nodes[0];

    if (firstNode === undefined) {
      throw new Error("Fixture has no nodes.");
    }

    firstNode.type = "warp_gate";

    expect(() => parseSolarSystemData(fixture)).toThrow(/Invalid bodies config/);
  });

  it("fails loudly when a node references an unknown body", () => {
    const fixture = loadFixture();
    const firstNode = fixture.nodes[0];

    if (firstNode === undefined) {
      throw new Error("Fixture has no nodes.");
    }

    firstNode.bodyId = "ceres";

    expect(() => parseSolarSystemData(fixture)).toThrow(/unknown body "ceres"/);
  });

  it("keeps Earth and Moon protected, neutral, and non-productive", () => {
    const data = parseSolarSystemData(loadFixture());
    const earth = findNodeByBodyId(data, "earth");
    const moon = findNodeByBodyId(data, "moon");

    for (const node of [earth, moon]) {
      expect(node.type).toBe("protected");
      expect(node.protectedNoWar).toBe(true);
      expect(node.controllable).toBe(false);
      expect(node.contestable).toBe(false);
      expect(node.producesTritium).toBe(false);
      expect(node.allowsShipyard).toBe(false);
    }
  });

  it("loads gameplay-tuned orbital periods from vanilla data", () => {
    const data = parseSolarSystemData(loadFixture());
    const expectedPlanetPeriods = new Map([
      ["mercury", 24],
      ["venus", 30],
      ["earth", 35],
      ["mars", 40],
      ["jupiter", 47],
      ["saturn", 56],
      ["uranus", 68],
      ["neptune", 81],
      ["pluto_charon", 108]
    ]);

    for (const [bodyId, period] of expectedPlanetPeriods.entries()) {
      const body = data.bodies.find((candidate) => candidate.id === bodyId);
      expect(body?.orbitPeriodTurns).toBe(period);
    }

    for (const body of data.bodies.filter((candidate) => candidate.kind === "moon")) {
      expect(body.orbitPeriodTurns).toBe(14);
    }
  });

  it("keeps Triton below Neptune in the default opening composition", () => {
    const data = parseSolarSystemData(loadFixture());
    const triton = data.bodies.find((candidate) => candidate.id === "triton");

    expect(triton?.initialAngle).toBe(246);
  });
});
