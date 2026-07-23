import { createServer } from "vite";

const historicalSeeds = [
  "proc-mrs1zsby-11n04dh",
  "proc-mrt952it-0q972qw",
  "proc-mrt91d47-1w6ygkf",
  "proc-mrt94bnx-1xtqix2",
  "proc-mrt95hio-06l1k7h",
  "proc-mrt91zzu-0luxhd6",
  "proc-mrt92vh8-0ygiphq",
  "proc-mrt8w01u-1arwoz4",
  "proc-mrt967f9-013h615",
  "proc-mrt940iv-1qze8n7"
];

const horizonTurns = 40;
const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true }
});

try {
  const core = await server.ssrLoadModule("/src/core/index.ts");
  const data = await server.ssrLoadModule("/src/data/index.ts");
  const rows = historicalSeeds.map((seed) => {
    const generation = data.generateProceduralMap(seed);
    const initialState = core.createInitialGameState({
      nodeOccupancies: data.getProceduralInitialOccupanciesForMode(generation, "2p")
    });
    const result = core.runAiVsAiDebugSimulation(generation.content, initialState, horizonTurns);
    const factionIds = ["player", "opponent"];
    const firstDecisiveState = result.stateHistory.find((state) => {
      return (
        factionIds.filter((factionId) => {
          return core.evaluateFactionRecoveryPath(generation.content, state, factionId)
            .canRecoverIndefiniteTritium;
        }).length === 1
      );
    });
    const winner =
      firstDecisiveState === undefined
        ? null
        : (factionIds.find((factionId) => {
            return core.evaluateFactionRecoveryPath(
              generation.content,
              firstDecisiveState,
              factionId
            ).canRecoverIndefiniteTritium;
          }) ?? null);
    const matchEvents = result.debugEvents.filter((event) => {
      return firstDecisiveState === undefined || event.turn <= firstDecisiveState.turn;
    });
    const earlyCollapses = factionIds.flatMap((factionId) => {
      const collapse = result.stateHistory.find((state) => {
        return (
          state.turn < 8 &&
          core.evaluateFactionRecoveryPath(generation.content, state, factionId).collapseStatus ===
            "forced"
        );
      });

      return collapse === undefined ? [] : [`${factionId}@T${collapse.turn}`];
    });
    const lastTritiumBurns = getBurnsFromLastTritium(
      generation.content,
      matchEvents,
      result.stateHistory,
      factionIds
    );
    const contestedMissileChoices = getContestedMissileChoices(
      matchEvents,
      result.stateHistory,
      factionIds,
      result.telemetry.victoryTurn
    );
    const effectiveFireCosts = summarizeEffectiveCosts(
      result.telemetry.effectiveCosts.fire.entries,
      result.telemetry.victoryTurn
    );
    const effectiveEvadeCosts = summarizeEffectiveCosts(
      result.telemetry.effectiveCosts.evade.entries,
      result.telemetry.victoryTurn
    );

    return {
      seed,
      duration: firstDecisiveState?.turn ?? `>${horizonTurns}`,
      winner,
      mapGameplayHash: result.telemetry.mapGameplayHash,
      trajectoryHash: result.telemetry.trajectoryHash,
      collapseTurn: result.telemetry.collapseTurn,
      collapseTurnsByFaction: result.telemetry.collapseTurnsByFaction,
      victoryTurn: result.telemetry.victoryTurn,
      effectiveCosts: {
        fire: effectiveFireCosts,
        evade: effectiveEvadeCosts
      },
      fire: countEventsByFaction(matchEvents, "FIRE_LAUNCHED", factionIds),
      evade: countEventsByFaction(matchEvents, "EVADE", factionIds),
      aiEvadeFailed: countEventsByFaction(matchEvents, "AI_EVADE_FAILED", factionIds),
      contestedMissileChoices,
      burnFromLastTritium: lastTritiumBurns.counts,
      burnFromLastTritiumDetails: lastTritiumBurns.details,
      failedUpkeep: countEventsByFaction(matchEvents, "CONTESTED_UPKEEP_FAILED", factionIds),
      earlyCollapses,
      rigidAuditRejectedCandidates: generation.debug.rigidAuditRejectedCandidates,
      rigidAuditRejectionStats: generation.debug.rigidAuditRejectionStats,
      fallbackStaticLayoutUsed: generation.debug.fairnessAudit.fallbackStaticLayoutUsed,
      validationErrors: result.errors
    };
  });

  const outputRows = process.argv.includes("--compact")
    ? rows.map((row) => ({
        ...Object.fromEntries(
          Object.entries(row).filter(([key]) => key !== "rigidAuditRejectionStats")
        ),
        validationErrors: row.validationErrors.length
      }))
    : rows;

  console.log(JSON.stringify({ horizonTurns, rows: outputRows, totals: summarize(rows) }, null, 2));
} finally {
  await server.close();
}

function countEventsByFaction(events, type, factionIds) {
  return Object.fromEntries(
    factionIds.map((factionId) => [
      factionId,
      events.filter((event) => event.type === type && event.factionId === factionId).length
    ])
  );
}

function summarizeEffectiveCosts(entries, victoryTurn) {
  const matchEntries = entries.filter((entry) => {
    return victoryTurn === null || entry.turn <= victoryTurn;
  });

  return {
    actions: matchEntries.length,
    total: matchEntries.reduce((total, entry) => total + entry.cost, 0),
    costs: [...new Set(matchEntries.map((entry) => entry.cost))].sort(
      (first, second) => first - second
    )
  };
}

function getContestedMissileChoices(events, stateHistory, factionIds, victoryTurn) {
  const choices = [];

  for (const state of stateHistory.slice(0, -1)) {
    const turn = state.turn + 1;

    if (victoryTurn !== null && turn > victoryTurn) {
      continue;
    }
    const contestedNodeIds = new Set(
      state.nodeOccupancies
        .filter((occupancy) => occupancy.shipCount > 0)
        .filter((occupancy) => {
          return state.nodeOccupancies.some((candidate) => {
            return (
              candidate.nodeId === occupancy.nodeId &&
              candidate.factionId !== occupancy.factionId &&
              candidate.shipCount > 0
            );
          });
        })
        .map((occupancy) => occupancy.nodeId)
    );

    for (const occupancy of state.nodeOccupancies) {
      if (
        occupancy.shipCount <= 0 ||
        !factionIds.includes(occupancy.factionId) ||
        !contestedNodeIds.has(occupancy.nodeId)
      ) {
        continue;
      }

      const incomingMissileCount = state.activeMissiles.filter((missile) => {
        return (
          missile.targetFactionId === occupancy.factionId &&
          missile.targetNodeId === occupancy.nodeId
        );
      }).length;

      if (incomingMissileCount === 0) {
        continue;
      }

      const matchingEvents = events.filter((event) => {
        return (
          event.turn === turn &&
          event.factionId === occupancy.factionId &&
          event.nodeId === occupancy.nodeId
        );
      });
      const decisions = matchingEvents.filter((event) => event.type === "AI_DECISION");
      const evadeExclusion = matchingEvents.find((event) => {
        return event.type === "AI_EVADE_EXCLUDED";
      });

      choices.push({
        turn,
        factionId: occupancy.factionId,
        nodeId: occupancy.nodeId,
        incomingMissiles: incomingMissileCount,
        aiEvadeFailed: matchingEvents.some((event) => event.type === "AI_EVADE_FAILED"),
        evadeExcluded:
          evadeExclusion === undefined
            ? null
            : {
                reason: evadeExclusion.reason ?? "unknown",
                replacementAction: evadeExclusion.action ?? "UNSPECIFIED"
              },
        choices: decisions.map((event) => ({
          action: event.action ?? "UNSPECIFIED",
          destinationNodeId: event.destinationNodeId ?? null,
          targetNodeId: event.targetNodeId ?? null,
          reason: event.reason ?? null
        }))
      });
    }
  }

  return choices;
}

function getBurnsFromLastTritium(content, events, stateHistory, factionIds) {
  const nodeById = new Map(content.nodes.map((node) => [node.id, node]));
  const counts = Object.fromEntries(factionIds.map((factionId) => [factionId, 0]));
  const details = [];

  for (const event of events) {
    if (
      event.type !== "BURN_DEPARTED" ||
      event.factionId === undefined ||
      event.nodeId === undefined ||
      nodeById.get(event.nodeId)?.type !== "tritium"
    ) {
      continue;
    }

    const beforeState = stateHistory.find((state) => state.turn === event.turn - 1);

    if (beforeState === undefined) {
      continue;
    }

    const controlledTritium = content.nodes.filter((node) => {
      if (node.type !== "tritium") {
        return false;
      }

      const ownShip = beforeState.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === node.id &&
          occupancy.factionId === event.factionId &&
          occupancy.shipCount > 0
        );
      });
      const enemyShip = beforeState.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === node.id &&
          occupancy.factionId !== event.factionId &&
          occupancy.shipCount > 0
        );
      });

      return ownShip && !enemyShip;
    });

    const originOccupancy = beforeState.nodeOccupancies.find((occupancy) => {
      return occupancy.nodeId === event.nodeId && occupancy.factionId === event.factionId;
    });

    if (
      controlledTritium.length === 1 &&
      controlledTritium[0]?.id === event.nodeId &&
      originOccupancy?.shipCount === 1
    ) {
      counts[event.factionId] = (counts[event.factionId] ?? 0) + 1;
      const incomingMissiles = [
        ...beforeState.pendingFireOrders,
        ...beforeState.activeMissiles
      ].filter((missile) => {
        return missile.targetFactionId === event.factionId && missile.targetNodeId === event.nodeId;
      }).length;
      const decision = events.find((candidate) => {
        return (
          candidate.turn === event.turn &&
          candidate.type === "AI_DECISION" &&
          candidate.factionId === event.factionId &&
          candidate.nodeId === event.nodeId &&
          candidate.action === "BURN"
        );
      });
      details.push({
        factionId: event.factionId,
        turn: event.turn,
        originNodeId: event.nodeId,
        destinationNodeId: event.destinationNodeId ?? null,
        burnCost: event.burnCost ?? null,
        dvBefore: beforeState.factionDv[event.factionId] ?? null,
        incomingMissiles,
        decisionReason: decision?.reason ?? null
      });
    }
  }

  return { counts, details };
}

function summarize(rows) {
  return {
    decisiveMatches: rows.filter((row) => typeof row.duration === "number").length,
    fire: sumFactionCounts(rows, "fire"),
    evade: sumFactionCounts(rows, "evade"),
    aiEvadeFailed: sumFactionCounts(rows, "aiEvadeFailed"),
    effectiveFireCost: rows.reduce((total, row) => total + row.effectiveCosts.fire.total, 0),
    effectiveEvadeCost: rows.reduce((total, row) => total + row.effectiveCosts.evade.total, 0),
    burnFromLastTritium: sumFactionCounts(rows, "burnFromLastTritium"),
    failedUpkeep: sumFactionCounts(rows, "failedUpkeep"),
    earlyCollapses: rows.reduce((total, row) => total + row.earlyCollapses.length, 0),
    rigidAuditRejectedCandidates: rows.reduce(
      (total, row) => total + row.rigidAuditRejectedCandidates,
      0
    ),
    fallbackStaticLayouts: rows.filter((row) => row.fallbackStaticLayoutUsed).length,
    validationErrors: rows.reduce((total, row) => total + row.validationErrors.length, 0)
  };
}

function sumFactionCounts(rows, key) {
  return rows.reduce(
    (totals, row) => ({
      player: totals.player + row[key].player,
      opponent: totals.opponent + row[key].opponent
    }),
    { player: 0, opponent: 0 }
  );
}
