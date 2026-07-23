import { describe, expect, it } from "vitest";
import { createInitialGameState, describeTransferRoute, runAITestTurns } from "../../src/core";
import {
  CLASSIC_PROCEDURAL_MAP_PRESET_ID,
  CURRENT_MAP_PRESET_ID,
  DEFAULT_MAP_PRESET_ID,
  MAP_PRESETS,
  PROCEDURAL_MAP_PRESET_ID,
  STRATEGIC_MAP_PRESET_ID,
  formatProceduralMapDebug,
  generateClassicProceduralMap,
  generateProceduralMap,
  getMapPreset,
  getProceduralInitialOccupanciesForMode,
  type SolarSystemData
} from "../../src/data";

function getNodeSystemId(content: SolarSystemData, nodeId: string): string {
  const node = content.nodes.find((candidate) => candidate.id === nodeId);

  if (node === undefined) {
    throw new Error(`Unknown node "${nodeId}".`);
  }

  const body = content.bodies.find((candidate) => candidate.id === node.bodyId);

  if (body === undefined) {
    throw new Error(`Unknown body "${node.bodyId}" for node "${nodeId}".`);
  }

  return body.kind === "moon" && body.parentId !== null ? body.parentId : body.id;
}

function countNodeSystems(
  content: SolarSystemData,
  nodeIds: readonly string[]
): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();

  for (const nodeId of nodeIds) {
    const systemId = getNodeSystemId(content, nodeId);
    counts.set(systemId, (counts.get(systemId) ?? 0) + 1);
  }

  return counts;
}

function expectMaxSystemCount(
  content: SolarSystemData,
  nodeIds: readonly string[],
  maxCount: number
): void {
  for (const count of countNodeSystems(content, nodeIds).values()) {
    expect(count).toBeLessThanOrEqual(maxCount);
  }
}

describe("procedural map setup", () => {
  it("defaults to Procedural Balanced while preserving the canonical and alternate presets", () => {
    expect(DEFAULT_MAP_PRESET_ID).toBe(PROCEDURAL_MAP_PRESET_ID);
    expect(MAP_PRESETS[0]?.id).toBe(CURRENT_MAP_PRESET_ID);
    expect(getMapPreset(CURRENT_MAP_PRESET_ID)).toEqual(
      expect.objectContaining({
        label: "Canonical Map · v10",
        contentUrl: "/content/vanilla/data/bodies.json",
        initialOccupancies: [
          { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
          { nodeId: "mars_node", factionId: "player", shipCount: 1 },
          { nodeId: "callisto_node", factionId: "player", shipCount: 1 },
          { nodeId: "neptune_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "pluto_charon_node", factionId: "opponent", shipCount: 1 },
          { nodeId: "triton_node", factionId: "opponent", shipCount: 1 }
        ]
      })
    );
    expect(getMapPreset(PROCEDURAL_MAP_PRESET_ID)).toEqual(
      expect.objectContaining({
        label: "Procedural Map · Balanced",
        procedural: true,
        proceduralGenerator: "balanced"
      })
    );
    expect(getMapPreset(CLASSIC_PROCEDURAL_MAP_PRESET_ID)).toEqual(
      expect.objectContaining({
        label: "Procedural Map · Classic",
        procedural: true,
        proceduralGenerator: "classic"
      })
    );
    const curatedPreset = getMapPreset(STRATEGIC_MAP_PRESET_ID);

    expect(curatedPreset.label).toBe("Curated Map");
    expect(curatedPreset.initialOccupancies).toBeDefined();
    expect(curatedPreset.initialOccupancies).toHaveLength(6);
  });

  it("generates deterministic replayable setups from a seed", () => {
    const first = generateProceduralMap("qa-procedural-seed");
    const second = generateProceduralMap("qa-procedural-seed");

    expect(second.debug).toEqual(first.debug);
    expect(second.initialOccupancies).toEqual(first.initialOccupancies);
    expect(second.content.nodes).toEqual(first.content.nodes);
  });

  it("assigns the requested productive roles and legal starting economy", () => {
    const generated = generateProceduralMap("qa-valid-layout");
    const tritiumNodes = generated.content.nodes.filter((node) => node.type === "tritium");
    const shipyardNodes = generated.content.nodes.filter((node) => node.type === "shipyard");
    const nodeById = new Map(generated.content.nodes.map((node) => [node.id, node]));
    const startNodeIds = generated.initialOccupancies.map((occupancy) => occupancy.nodeId);
    const playerStartNodeIds = generated.initialOccupancies
      .filter((occupancy) => occupancy.factionId === "player")
      .map((occupancy) => occupancy.nodeId);
    const aiStartNodeIds = generated.initialOccupancies
      .filter((occupancy) => occupancy.factionId === "opponent")
      .map((occupancy) => occupancy.nodeId);
    const threePlayerOccupancies = getProceduralInitialOccupanciesForMode(generated, "3p");
    const ai2StartNodeIds = threePlayerOccupancies
      .filter((occupancy) => occupancy.factionId === "ai_2")
      .map((occupancy) => occupancy.nodeId);

    expect(generated.debug.hardGatePassed).toBe(true);
    expect(generated.debug.hardGateFailures).toHaveLength(0);
    expect(generated.debug.acceptedMapWarnings.join(" ")).not.toMatch(
      /below-minimum|hard-gate|hard-reject|major-outlier|STARTING_SHIPYARD_SECURITY_OUTLIER/
    );
    expect(generated.debug.candidateRejectionStats.join(" ")).not.toContain(
      "rejectedLayoutReasons"
    );
    expect(generated.debug.fairnessScore).toBeGreaterThanOrEqual(60);
    expect(generated.debug.fairnessAudit.fallbackStaticLayoutUsed).toBe(false);
    const threePlayerShipyardSecurityScores = Object.values(
      generated.debug.fairnessAuditByMode["3p"].factionScores
    ).flatMap((score) => (score === undefined ? [] : [score.shipyardSecurityScore]));
    const shipyardSecuritySpread =
      Math.max(...threePlayerShipyardSecurityScores) -
      Math.min(...threePlayerShipyardSecurityScores);

    expect(shipyardSecuritySpread).toBeLessThan(30);
    expect(tritiumNodes).toHaveLength(6);
    expect(shipyardNodes).toHaveLength(5);
    expect(generated.initialOccupancies).toHaveLength(6);
    expect(threePlayerOccupancies).toHaveLength(9);
    expect(new Set(startNodeIds).size).toBe(6);
    expect(new Set(threePlayerOccupancies.map((occupancy) => occupancy.nodeId)).size).toBe(9);
    expect(playerStartNodeIds.map((nodeId) => nodeById.get(nodeId)?.type).sort()).toEqual([
      "barren",
      "shipyard",
      "tritium"
    ]);
    expect(aiStartNodeIds.map((nodeId) => nodeById.get(nodeId)?.type).sort()).toEqual([
      "barren",
      "shipyard",
      "tritium"
    ]);
    expect(ai2StartNodeIds.map((nodeId) => nodeById.get(nodeId)?.type).sort()).toEqual([
      "barren",
      "shipyard",
      "tritium"
    ]);
  });

  it("prevents the balanced generator from clustering whole planetary families into one role", () => {
    const seeds = [
      "qa-valid-layout",
      "qa-debug-dump",
      "proc-mr64rckw-1cfsnyb",
      "proc-uranus-tritium-family"
    ];

    for (const seed of seeds) {
      const generated = generateProceduralMap(seed);
      const tritiumNodeIds = generated.content.nodes
        .filter((node) => node.type === "tritium")
        .map((node) => node.id);
      const shipyardNodeIds = generated.content.nodes
        .filter((node) => node.type === "shipyard")
        .map((node) => node.id);
      const productiveNodeIds = [...tritiumNodeIds, ...shipyardNodeIds];
      const uranusTritiumCount = [...countNodeSystems(generated.content, tritiumNodeIds)].find(
        ([systemId]) => systemId === "uranus"
      )?.[1];

      expectMaxSystemCount(generated.content, tritiumNodeIds, 1);
      expectMaxSystemCount(generated.content, shipyardNodeIds, 1);
      expectMaxSystemCount(generated.content, productiveNodeIds, 2);
      expect(uranusTritiumCount ?? 0).toBeLessThanOrEqual(1);
    }
  }, 30_000);

  it("keeps balanced protected exclusions while preserving classic hard exclusions", () => {
    const generated = generateProceduralMap("qa-hard-exclusions");
    const nodeById = new Map(generated.content.nodes.map((node) => [node.id, node]));
    const productiveNodeIds = generated.content.nodes
      .filter((node) => node.type === "tritium" || node.type === "shipyard")
      .map((node) => node.id);
    const startNodeIds = getProceduralInitialOccupanciesForMode(generated, "3p").map(
      (occupancy) => occupancy.nodeId
    );

    expect(productiveNodeIds).not.toContain("earth_node");
    expect(productiveNodeIds).not.toContain("moon_node");
    expect(startNodeIds).not.toContain("earth_node");
    expect(startNodeIds).not.toContain("moon_node");
    expect(generated.content.transferRules).toBeDefined();
    expect(nodeById.get("earth_node")).toEqual(
      expect.objectContaining({
        type: "barren",
        producesTritium: false,
        allowsShipyard: false
      })
    );

    const classic = generateClassicProceduralMap("qa-hard-exclusions");
    const classicNodeById = new Map(classic.content.nodes.map((node) => [node.id, node]));
    const classicProductiveNodeIds = classic.content.nodes
      .filter((node) => node.type === "tritium" || node.type === "shipyard")
      .map((node) => node.id);

    expect(classic.content.transferRules).toBeUndefined();
    expect(classicProductiveNodeIds).not.toContain("jupiter_node");
    expect(classicProductiveNodeIds).not.toContain("io_node");
    expect(classicProductiveNodeIds).not.toContain("mars_node");
    expect(classicProductiveNodeIds).not.toContain("saturn_node");
    expect(classicProductiveNodeIds).not.toContain("uranus_node");
    expect(classicNodeById.get("io_node")).toEqual(
      expect.objectContaining({
        type: "barren",
        producesTritium: false,
        allowsShipyard: false
      })
    );
  });

  it("keeps local balanced transfers short while compressing the longest balanced routes", () => {
    const generated = generateProceduralMap("qa-balanced-transfer-rules");
    const content = generated.content;
    const closeMoonRoute = describeTransferRoute(content, 0, "jupiter_node", "io_node");
    const farMoonRoute = describeTransferRoute(content, 0, "jupiter_node", "callisto_node");
    const siblingMoonRoute = describeTransferRoute(content, 0, "io_node", "europa_node");
    const longestRoute = describeTransferRoute(content, 0, "mercury_node", "pluto_node");
    const longestRouteWithoutCostAdjustment = describeTransferRoute(
      {
        ...content,
        transferRules:
          content.transferRules === undefined
            ? undefined
            : {
                ...content.transferRules,
                planetDistanceBurnCostAdjustmentTable: {}
              }
      },
      0,
      "mercury_node",
      "pluto_node"
    );

    expect(closeMoonRoute?.transferTurns).toBe(1);
    expect(farMoonRoute?.transferTurns).toBe(2);
    expect(siblingMoonRoute?.transferTurns).toBe(2);
    expect(longestRoute?.transferTurns).toBeLessThanOrEqual(7);
    expect(longestRoute?.burnCost).toBeLessThanOrEqual(
      longestRouteWithoutCostAdjustment?.burnCost ?? Number.POSITIVE_INFINITY
    );
  });

  it("lets the AI planner consume balanced procedural transfer rules", () => {
    const generated = generateProceduralMap("qa-balanced-ai-smoke");
    const initialState = createInitialGameState({
      nodeOccupancies: getProceduralInitialOccupanciesForMode(generated, "2p")
    });
    const result = runAITestTurns(generated.content, 1, initialState);

    expect(result.errors).toEqual([]);
  });

  it("hard-gates starter raids, neutral first-work timing, and solvent fallback recovery", () => {
    const seeds = [
      "qa-valid-layout",
      "qa-debug-dump",
      "qa-balanced-ai-smoke",
      "proc-mrs1zsby-11n04dh",
      "proc-mrt952it-0q972qw"
    ];

    for (const seed of seeds) {
      const generated = generateProceduralMap(seed);
      const audit = generated.debug.fairnessAuditByMode["2p"];

      expect(audit.hardGatePassed).toBe(true);
      expect(audit.hardGateFailures).toHaveLength(0);

      for (const factionId of audit.activeFactionIds) {
        const score = audit.factionScores[factionId];

        expect(score).toBeDefined();

        if (score === undefined) {
          continue;
        }

        expect(score.starterRaid.hardGatePassed).toBe(true);

        if ((score.starterRaid.enemyBurnTurns ?? 3) < 3) {
          expect(score.starterRaid.exceptionalSymmetryUsed).toBe(true);
          expect(
            Math.abs(
              (score.starterRaid.enemyBurnTurns ?? 0) -
                (score.starterRaid.reciprocalBurnTurns ?? Number.POSITIVE_INFINITY)
            )
          ).toBeLessThanOrEqual(1);
          expect(
            Math.abs(
              (score.starterRaid.enemyBurnCost ?? 0) -
                (score.starterRaid.reciprocalBurnCost ?? Number.POSITIVE_INFINITY)
            )
          ).toBeLessThanOrEqual(1);
        }

        expect(score.neutralExpansion).toEqual(
          expect.objectContaining({
            hardGatePassed: true,
            rejectionReason: null
          })
        );
        expect(score.neutralExpansion.burnTurns).toBeLessThanOrEqual(3);
        expect(score.neutralExpansion.burnCost).toBeLessThanOrEqual(4);
        expect(score.neutralExpansion.firstWorkTurn).toBe(
          (score.neutralExpansion.burnTurns ?? 0) + 1
        );

        expect(score.fallbackRecoverySolvency).toEqual(
          expect.objectContaining({
            hardGatePassed: true,
            rejectionReason: null,
            firstUpkeepCost: 2
          })
        );
        expect(score.fallbackRecoverySolvency.burnTurns).toBeLessThanOrEqual(3);
        expect(score.fallbackRecoverySolvency.burnCost).toBeLessThanOrEqual(4);
        expect(score.fallbackRecoverySolvency.projectedDvAfterUpkeepAndExit).toBeGreaterThanOrEqual(
          0
        );
      }
    }
  }, 30_000);

  it("prints the requested procedural forensic debug fields", () => {
    const generated = generateProceduralMap("qa-debug-dump");
    const debugText = formatProceduralMapDebug(generated.debug, "2p");
    const threePlayerDebugText = formatProceduralMapDebug(generated.debug, "3p");

    expect(debugText).toContain("Seed qa-debug-dump");
    expect(debugText).toContain("Tritium ");
    expect(debugText).toContain("Shipyards ");
    expect(debugText).toContain("Player start ");
    expect(debugText).toContain("Opponent start ");
    expect(debugText).toContain("inactiveThirdStartCandidate start ");
    expect(debugText).toContain("controller human");
    expect(debugText).toContain("controller ai");
    expect(debugText).toContain("Excluded productive ");
    expect(debugText).toContain("Excluded starting ");
    expect(debugText).toContain("Scores final ");
    expect(debugText).toContain("MAP_FAIRNESS_AUDIT");
    expect(debugText).toContain("MAP_EARLY_COLLAPSE_AUDIT");
    expect(debugText).toContain("hardGatePassed true");
    expect(debugText).toContain("hardGateFailures ");
    expect(debugText).toContain("activeFactions player, opponent");
    expect(debugText).not.toContain("activeFactions player, opponent, ai_2");
    expect(debugText).not.toContain("ai_2:\n");
    expect(debugText).toContain("tritiumAccessScore ");
    expect(debugText).toContain("shipyardSecurityScore ");
    expect(debugText).toContain("stagingValueScore ");
    expect(debugText).toContain("pressureReceivedScore ");
    expect(debugText).toContain("pressureAppliedScore ");
    expect(debugText).toContain("dogpileRisk ");
    expect(debugText).toContain("fallbackTritiumQuality ");
    expect(debugText).toContain("fallbackShipyardQuality ");
    expect(debugText).toContain("tritiumAccess:");
    expect(debugText).toContain("startingTritium ");
    expect(debugText).toContain("nearestFallbackTritium ");
    expect(debugText).toContain("nearestFallbackBurnTurns ");
    expect(debugText).toContain("nearestFallbackBurnCost ");
    expect(debugText).toContain("fallbackPaybackEstimate ");
    expect(debugText).toContain("rankedTritiumOptions ");
    expect(debugText).toContain("tritiumRecoveryScore ");
    expect(debugText).toContain("starterRaid startingTritium ");
    expect(debugText).toContain("neutralExpansion node ");
    expect(debugText).toContain("firstWorkTurn ");
    expect(debugText).toContain("fallbackRecoverySolvency node ");
    expect(debugText).toContain("firstUpkeep 2");
    expect(debugText).toContain("exitCost ");
    expect(debugText).toContain("shipyardAudit:");
    expect(debugText).toContain("startingShipyard ");
    expect(debugText).toContain("incomingBurnPressureFromEnemies ");
    expect(debugText).toContain("incomingFirePressureFromEnemies ");
    expect(debugText).toContain("contestRisk ");
    expect(debugText).toContain("progressStealRisk ");
    expect(debugText).toContain("outgoingFireValue ");
    expect(debugText).toContain("outgoingBurnValue ");
    expect(debugText).toContain("mandatoryLaunchRisk ");
    expect(debugText).toContain("openingCurve:");
    expect(debugText).toContain("expectedDvByTurn ");
    expect(debugText).toContain("expectedShipyardProgressByTurn ");
    expect(debugText).toContain("likelySecondTritiumTiming ");
    expect(debugText).toContain("likelyFirstPressureReceived ");
    expect(debugText).toContain("likelyFirstPressureApplied ");
    expect(debugText).toContain("predictedCollapseRisk ");
    expect(debugText).toContain("worstAsymmetry ");
    expect(debugText).toContain("fallbackStaticLayoutUsed ");
    expect(debugText).toContain("acceptedMapWarnings ");
    expect(debugText).toContain("candidateRejectionStats ");
    expect(debugText).toContain("rigidAuditRejectedCandidates ");
    expect(debugText).toContain("rigidAuditRejectionStats ");
    expect(debugText).not.toContain("Rejected layout reasons ");
    expect(debugText).not.toMatch(
      /acceptedMapWarnings .*(below-minimum|hard-gate|hard-reject|major-outlier|STARTING_SHIPYARD_SECURITY_OUTLIER)/
    );
    expect(threePlayerDebugText).toContain("activeFactions player, opponent, ai_2");
    expect(threePlayerDebugText).toContain("ai_2:");
    expect(threePlayerDebugText).toContain("MAP_EARLY_COLLAPSE_AUDIT");
    expect(threePlayerDebugText).toContain("predictedContestedUpkeepBurden ");
    expect(threePlayerDebugText).toContain("rejectionReason ");
  });

  it("keeps known early-collapse seeds behind 3p fairness hard gates", () => {
    const regressionSeeds = [
      "proc-mqsp7hs2-0kb0o6d",
      "proc-mqspadsa-131qhd6",
      "proc-mqspkcqb-11qoscc"
    ];

    for (const seed of regressionSeeds) {
      const generated = generateProceduralMap(seed);
      const threePlayerAudit = generated.debug.fairnessAuditByMode["3p"];
      const debugText = formatProceduralMapDebug(generated.debug, "3p");

      expect(generated.debug.hardGatePassed).toBe(true);
      expect(generated.debug.hardGateFailures).toHaveLength(0);
      expect(threePlayerAudit.hardGatePassed).toBe(true);
      expect(threePlayerAudit.hardGateFailures).toHaveLength(0);
      expect(threePlayerAudit.earlyCollapseAudits).toHaveLength(3);
      expect(threePlayerAudit.earlyCollapseAudits).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ hardGatePassed: true, rejectionReason: null })
        ])
      );
      expect(debugText).toContain("MAP_EARLY_COLLAPSE_AUDIT");
      expect(debugText).not.toMatch(
        /rejectionReason (early-contested-tritium-collapse|fallback-tritium-contested-immediately|dogpile-risk-near-100|same-fallback-tritium-race)/
      );
    }
  }, 30_000);
});
