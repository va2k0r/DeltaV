import {
  calculateBurnPlan,
  evaluateFactionRecoveryPath,
  getFactionDv,
  type FactionRecoveryKnownThreat,
  type FactionRecoveryPath,
  type FactionId,
  type FactionIdentity,
  type GameState,
  type SolarSystemSnapshot,
  type TurnDebugEvent,
  type TurnDebugEventType
} from "../core";
import { type ProceduralMapDebug, type SolarSystemData } from "../data";
import {
  type ReplayEntry,
  type ReplayEventType,
  type ReplayTape,
  type ReplayTransition,
  type ReplayVisualState
} from "./replayTimeline";

export type PostMatchOutcome = Readonly<{
  winner: FactionId;
}>;

export type FactionCounts = Record<string, number>;

export type VictoryAuditFactionState = Readonly<{
  ships: number;
  dV: number;
  tritiumAccess: readonly string[];
  reachableTritium: readonly string[];
  activeShipyards: readonly string[];
  shipyardProgress: readonly ShipyardProgressAuditEntry[];
  activeTransits: readonly string[];
  missilesInFlight: readonly string[];
  contestedNodes: readonly string[];
  projectedDvAtHorizon: number;
  countedTritium: readonly string[];
  rejectedTritium: readonly string[];
  knownThreats: readonly string[];
  recoveryReason: string;
  collapseStatus: "forced" | "projected" | "unresolved";
  collapseReason: string;
  unresolvedTritium: readonly string[];
  pendingRecoveryTransitBlocksVictory: boolean;
  canRecoverIndefiniteTritium: boolean;
  deathReason: string;
}>;

export type ShipyardProgressAuditEntry = Readonly<{
  nodeId: string;
  progress: number;
  workerFactionId?: FactionId | undefined;
}>;

export type VictoryAudit = Readonly<{
  winner: FactionId | null;
  result: "winner" | "draw" | "no-winner-yet";
  reason: string;
  candidates: readonly FactionId[];
  blockedBy: readonly string[];
  competitiveRecoveryPaths: Readonly<Record<string, readonly string[]>>;
  safeTritiumStatus: Readonly<
    Record<
      string,
      Readonly<{
        controlled: readonly string[];
        reachable: readonly string[];
        canRecoverIndefiniteTritium: boolean;
      }>
    >
  >;
  contradictions: readonly Readonly<Record<string, unknown>>[];
  collapseClassificationAudit: readonly Readonly<Record<string, unknown>>[];
  pendingRecoveryTransitAudits: readonly Readonly<Record<string, unknown>>[];
  contestedRecoveryAudits: readonly Readonly<Record<string, unknown>>[];
  recoveryAudit: readonly string[];
  factionStates: Readonly<Record<string, VictoryAuditFactionState>>;
}>;

export type MapOutcomeAudit = Readonly<{
  seed: string | null;
  outcomeClassification:
    | "healthy-victory"
    | "false-positive-victory"
    | "premature-victory-audit"
    | "map-caused-collapse"
    | "ai-strategic-collapse"
    | "unresolved-recovery"
    | "player-collapse-opponent-vs-ai2-unresolved"
    | "ai-induced-runaway-pending-verification"
    | "runaway-detected-too-late"
    | "valid-no-victory-yet";
  initialFairnessScore: number | null;
  predictedTritiumAccessScores: Readonly<Record<string, number | null>>;
  actualTritiumNodesByTurn: readonly Readonly<{
    turn: number;
    factions: Readonly<Record<string, readonly string[]>>;
  }>[];
  actualDvByTurn: readonly Readonly<{
    turn: number;
    factions: Readonly<Record<string, number>>;
  }>[];
  actualShipsByTurn: readonly Readonly<{
    turn: number;
    factions: Readonly<Record<string, number>>;
  }>[];
  actualCollapseTurnPerFaction: Readonly<Record<string, number | null>>;
  whetherMapLikelyCausedRunaway: boolean;
  whetherAILikelyCausedRunaway: boolean;
  auditModeMismatch: boolean;
  auditModeMismatchReason: string | null;
}>;

type TritiumLoss = Readonly<{
  turn: number;
  factionId: FactionId;
  nodeId: string;
}>;

type AlphaStrike = Readonly<{
  turn: number;
  nodeId: string;
  pressure: "hit" | "pressure";
}>;

type ImportantTurn = Readonly<{
  turn: number;
  score: number;
  notes: readonly string[];
}>;

const reportFactionIds: readonly FactionId[] = ["player", "opponent"];
const fallbackReportFactions: readonly FactionIdentity[] = [
  {
    id: "player",
    displayName: "Aperture",
    color: "#7fe8ff",
    accent: "#d9f8ff",
    controlType: "human"
  },
  {
    id: "opponent",
    displayName: "Wayline",
    color: "#c982ff",
    accent: "#f3dcff",
    controlType: "ai"
  }
];
const criticalDvReportThreshold = 3;

function getSnapshotFactionIds(
  snapshot: Pick<SolarSystemSnapshot, "factions">
): readonly FactionId[] {
  const factionIds = snapshot.factions?.map((faction) => faction.id) ?? [];
  return factionIds.length === 0 ? reportFactionIds : factionIds;
}

function createRecoveryStateFromSnapshot(snapshot: SolarSystemSnapshot): GameState {
  return {
    turn: snapshot.turn,
    gameMode: snapshot.gameMode ?? "2p",
    factions:
      snapshot.factions === undefined || snapshot.factions.length === 0
        ? fallbackReportFactions
        : snapshot.factions,
    factionDv: snapshot.factionDv,
    nodeOccupancies: snapshot.nodeOccupancies,
    shipyardProgress: snapshot.shipyardProgress,
    mandatoryLaunches: snapshot.mandatoryLaunches,
    pendingBurnOrders: snapshot.pendingBurnOrders,
    pendingFireOrders: snapshot.pendingFireOrders,
    activeBurnTransits: snapshot.activeBurnTransits,
    activeMissiles: snapshot.activeMissiles,
    debugEvents: snapshot.debugEvents
  };
}

function getRecoveryPathFromMap(
  recoveryByFaction: ReadonlyMap<FactionId, FactionRecoveryPath>,
  factionId: FactionId
): FactionRecoveryPath {
  const recovery = recoveryByFaction.get(factionId);

  if (recovery === undefined) {
    throw new Error(`Missing recovery audit for faction ${factionId}.`);
  }

  return recovery;
}

function formatVictoryRecoveryAudit(
  content: SolarSystemData,
  recovery: FactionRecoveryPath
): string {
  return [
    `VICTORY_RECOVERY_AUDIT ${recovery.factionId}`,
    `current ΔV ${recovery.currentDv}`,
    `projected ΔV ${recovery.projectedDvAtHorizon}`,
    `reachable tritium ${recovery.reachableTritiumNodes}`,
    `counted ${recovery.countedTritium.map((audit) => formatNodeName(content, audit.nodeId)).join(",") || "-"}`,
    `rejected ${recovery.rejectedTritium.map((audit) => `${formatNodeName(content, audit.nodeId)}:${audit.reason}`).join(",") || "-"}`,
    `known threats ${recovery.knownThreats.map(formatVictoryRecoveryThreat).join("; ") || "-"}`,
    `canRecoverIndefiniteTritium ${recovery.canRecoverIndefiniteTritium ? "yes" : "no"}`,
    `reason ${recovery.reasonCodes.join(",") || "-"}`
  ].join(" | ");
}

function formatVictoryRecoveryTritiumAudit(
  content: SolarSystemData,
  audit: FactionRecoveryPath["countedTritium"][number]
): string {
  return `${formatNodeName(content, audit.nodeId)} via ${formatNodeName(content, audit.viaNodeId)} firstWork T${audit.firstPossibleWorkTurn} status ${audit.recoveryStatus} survivesKnownThreats ${audit.survivesKnownThreats ? "yes" : "no"} reason ${audit.reason}`;
}

function formatVictoryRecoveryThreat(threat: FactionRecoveryKnownThreat): string {
  const orbit = threat.nodeId === undefined ? "" : ` orbit ${threat.nodeId}`;
  return `${threat.kind}${orbit} T${threat.eventTurn} projected ${threat.projectedDvAtEvent} cost ${threat.cost} ${threat.status} ${threat.reason}`;
}

function createVictoryEvaluationState(recoveryState: GameState): GameState {
  if (recoveryState.pendingFireOrders.length === 0 && recoveryState.activeMissiles.length === 0) {
    return recoveryState;
  }

  return {
    ...recoveryState,
    pendingFireOrders: [],
    activeMissiles: []
  };
}

function createVictoryRecoveryByFaction(
  content: SolarSystemData,
  recoveryState: GameState,
  snapshot: SolarSystemSnapshot
): ReadonlyMap<FactionId, FactionRecoveryPath> {
  const victoryState = createVictoryEvaluationState(recoveryState);

  return new Map(
    getSnapshotFactionIds(snapshot).map((factionId) => [
      factionId,
      evaluateFactionRecoveryPath(content, victoryState, factionId)
    ])
  );
}

export function detectPostMatchOutcome(
  content: SolarSystemData,
  recoveryState: GameState,
  snapshot: SolarSystemSnapshot
): PostMatchOutcome | null {
  const factionIds = getSnapshotFactionIds(snapshot);
  const recoveryByFaction = createVictoryRecoveryByFaction(content, recoveryState, snapshot);
  const viableFactions = factionIds.filter((factionId) => {
    return getRecoveryPathFromMap(recoveryByFaction, factionId).canRecoverIndefiniteTritium;
  });

  const winner = viableFactions[0];

  if (viableFactions.length !== 1 || winner === undefined) {
    return null;
  }

  const winnerRecovery = getRecoveryPathFromMap(recoveryByFaction, winner);

  if (!hasProvenStableVictoryRecovery(winnerRecovery)) {
    return null;
  }

  const everyOpponentForced = factionIds.every((factionId) => {
    if (factionId === winner) {
      return true;
    }

    return getRecoveryPathFromMap(recoveryByFaction, factionId).collapseStatus === "forced";
  });

  return everyOpponentForced ? { winner } : null;
}

function hasProvenStableVictoryRecovery(recovery: FactionRecoveryPath): boolean {
  const countedNodeIds = new Set(recovery.countedTritium.map((audit) => audit.nodeId));
  const unsafeThreatsAgainstCountedPath = recovery.knownThreats.some((threat) => {
    return (
      threat.status === "unsafe" &&
      (threat.nodeId === undefined || countedNodeIds.has(threat.nodeId))
    );
  });

  return (
    recovery.projectedDvAtHorizon >= 0 &&
    recovery.countedTritium.some((audit) => audit.survivesKnownThreats) &&
    !unsafeThreatsAgainstCountedPath
  );
}

export function createVictoryDelayAudit(
  content: SolarSystemData,
  recoveryState: GameState,
  snapshot: SolarSystemSnapshot
): Readonly<Record<string, unknown>> | null {
  const factionIds = getSnapshotFactionIds(snapshot);
  const recoveryByFaction = createVictoryRecoveryByFaction(content, recoveryState, snapshot);
  const recoverableFactions = factionIds.filter((factionId) => {
    return getRecoveryPathFromMap(recoveryByFaction, factionId).canRecoverIndefiniteTritium;
  });

  if (recoverableFactions.length === 1) {
    return null;
  }

  const apparentFactions = factionIds.filter((factionId) => {
    return hasApparentTritiumRecoveryPath(content, snapshot, factionId);
  });

  if (apparentFactions.length === 0) {
    return null;
  }

  const relevantFaction = apparentFactions[0] ?? factionIds[0];
  const recovery =
    relevantFaction === undefined
      ? null
      : getRecoveryPathFromMap(recoveryByFaction, relevantFaction);
  const relevantThreat = recovery?.knownThreats.find((threat) => threat.status === "unsafe");
  const relevantRejectedTritium = recovery?.rejectedTritium[0];
  const relevantUnresolvedTritium = recovery?.unresolvedTritium[0];
  const pendingRecoveryTransitAudits =
    relevantFaction === undefined || recovery === null
      ? []
      : createPendingRecoveryTransitAudits(content, snapshot, relevantFaction, recovery);

  return {
    reason:
      pendingRecoveryTransitAudits.length > 0
        ? "pending-recovery-transit-blocks-victory"
        : relevantUnresolvedTritium !== undefined
          ? "unresolved-contested-recovery"
          : recoverableFactions.length === 0
            ? "no-survivable-recovery-path-yet"
            : "multiple-survivable-recovery-paths",
    faction: relevantFaction ?? "-",
    relevantNode:
      relevantUnresolvedTritium?.nodeId ??
      relevantRejectedTritium?.nodeId ??
      relevantThreat?.nodeId ??
      "-",
    relevantShip:
      relevantUnresolvedTritium === undefined && relevantRejectedTritium === undefined
        ? "-"
        : `${(relevantUnresolvedTritium ?? relevantRejectedTritium)?.viaNodeId}:${relevantFaction ?? "-"}`,
    pendingThreatTurn: relevantThreat?.eventTurn ?? null,
    apparentFactions,
    recoverableFactions,
    pendingRecoveryTransitAudits,
    contestedRecoveryAudit:
      relevantFaction === undefined || relevantUnresolvedTritium === undefined
        ? null
        : createContestedRecoveryAudit(
            content,
            snapshot,
            relevantFaction,
            relevantUnresolvedTritium
          ),
    recoveryReason: recovery?.reasonCodes ?? []
  };
}

function hasApparentTritiumRecoveryPath(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId
): boolean {
  return (
    getControlledTritiumNodeIds(content, snapshot, factionId).size > 0 ||
    getReachableTritiumNodeIds(content, snapshot, factionId).length > 0
  );
}

function isFactionTritiumViable(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId
): boolean {
  return evaluateFactionRecoveryPath(
    content,
    createVictoryEvaluationState(createRecoveryStateFromSnapshot(snapshot)),
    factionId
  ).canRecoverIndefiniteTritium;
}

export function createVictoryAudit(
  content: SolarSystemData,
  recoveryState: GameState,
  snapshot: SolarSystemSnapshot,
  outcome: PostMatchOutcome | null
): VictoryAudit {
  const factionIds = getSnapshotFactionIds(snapshot);
  const recoveryByFaction = createVictoryRecoveryByFaction(content, recoveryState, snapshot);
  const ships = countRemainingShips(snapshot);
  const candidates = factionIds.filter((factionId) => {
    return getRecoveryPathFromMap(recoveryByFaction, factionId).canRecoverIndefiniteTritium;
  });
  const hasNoRemainingMaterial = hasNoVictoryRelevantMaterial(snapshot, ships);
  const result = outcome !== null ? "winner" : hasNoRemainingMaterial ? "draw" : "no-winner-yet";
  const reason =
    outcome !== null
      ? "only faction with a survivable path to indefinite tritium"
      : hasNoRemainingMaterial
        ? "all-factions-eliminated"
        : createNoWinnerYetVictoryReason(snapshot, recoveryByFaction);
  const blockedBy =
    outcome === null && result === "no-winner-yet"
      ? createVictoryBlockedByReasons(snapshot, recoveryByFaction)
      : [];
  const recoveryAudit = factionIds.map((factionId) => {
    const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
    return formatVictoryRecoveryAudit(content, recovery);
  });
  const collapseClassificationAudit = factionIds.map((factionId) => {
    const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
    return createVictoryCollapseClassificationAudit(content, snapshot, factionId, recovery);
  });
  const pendingRecoveryTransitAudits = factionIds.flatMap((factionId) => {
    const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
    return createPendingRecoveryTransitAudits(content, snapshot, factionId, recovery);
  });
  const contestedRecoveryAudits = factionIds.flatMap((factionId) => {
    const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
    return recovery.unresolvedTritium.map((audit) =>
      createContestedRecoveryAudit(content, snapshot, factionId, audit)
    );
  });
  const competitiveRecoveryPaths = Object.fromEntries(
    factionIds.map((factionId) => {
      const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
      return [
        factionId,
        recovery.countedTritium.map((audit) => formatVictoryRecoveryTritiumAudit(content, audit))
      ];
    })
  );
  const safeTritiumStatus = Object.fromEntries(
    factionIds.map((factionId) => {
      const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
      return [
        factionId,
        {
          controlled: [...getControlledTritiumNodeIds(content, snapshot, factionId)].sort(),
          reachable: recovery.countedTritium.map((audit) => audit.nodeId).sort(),
          canRecoverIndefiniteTritium: recovery.canRecoverIndefiniteTritium
        }
      ];
    })
  );
  const factionStates = Object.fromEntries(
    factionIds.map((factionId) => {
      const tritiumAccess = [...getControlledTritiumNodeIds(content, snapshot, factionId)].sort();
      const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);
      const reachableTritium = recovery.countedTritium.map((audit) => audit.nodeId).sort();
      const activeShipyards = getControlledShipyardNodeIds(content, snapshot, factionId);
      const canRecoverIndefiniteTritium = recovery.canRecoverIndefiniteTritium;

      return [
        factionId,
        {
          ships: ships[factionId] ?? 0,
          dV: getFactionDv(snapshot, factionId),
          tritiumAccess,
          reachableTritium,
          activeShipyards,
          shipyardProgress: snapshot.shipyardProgress
            .filter((progress) => {
              return (
                progress.workerFactionId === factionId || activeShipyards.includes(progress.nodeId)
              );
            })
            .map((progress) => ({ ...progress })),
          activeTransits: snapshot.activeBurnTransits
            .filter((transit) => transit.factionId === factionId)
            .map((transit) => transit.id),
          missilesInFlight: snapshot.activeMissiles
            .filter((missile) => missile.factionId === factionId)
            .map((missile) => missile.id),
          contestedNodes: snapshot.nodes
            .filter((node) => {
              return (
                node.isContested &&
                snapshot.nodeOccupancies.some((occupancy) => {
                  return occupancy.nodeId === node.id && occupancy.factionId === factionId;
                })
              );
            })
            .map((node) => node.id),
          projectedDvAtHorizon: recovery.projectedDvAtHorizon,
          countedTritium: recovery.countedTritium.map((audit) =>
            formatVictoryRecoveryTritiumAudit(content, audit)
          ),
          unresolvedTritium: recovery.unresolvedTritium.map((audit) =>
            formatVictoryRecoveryTritiumAudit(content, audit)
          ),
          rejectedTritium: recovery.rejectedTritium.map((audit) =>
            formatVictoryRecoveryTritiumAudit(content, audit)
          ),
          knownThreats: recovery.knownThreats.map(formatVictoryRecoveryThreat),
          recoveryReason: recovery.reasonCodes.join(", ") || "-",
          collapseStatus: recovery.collapseStatus,
          collapseReason: recovery.collapseReason,
          pendingRecoveryTransitBlocksVictory: recovery.pendingRecoveryTransitBlocksVictory,
          canRecoverIndefiniteTritium,
          deathReason: createVictoryAuditDeathReason(
            outcome?.winner ?? null,
            factionId,
            ships[factionId] ?? 0,
            getFactionDv(snapshot, factionId),
            tritiumAccess,
            reachableTritium,
            activeShipyards,
            canRecoverIndefiniteTritium
          )
        }
      ];
    })
  );

  return {
    winner: outcome?.winner ?? null,
    result,
    reason,
    candidates,
    blockedBy,
    competitiveRecoveryPaths,
    safeTritiumStatus,
    contradictions: [],
    collapseClassificationAudit,
    pendingRecoveryTransitAudits,
    contestedRecoveryAudits,
    recoveryAudit,
    factionStates
  };
}

function hasNoVictoryRelevantMaterial(
  snapshot: SolarSystemSnapshot,
  ships: Readonly<Record<string, number>>
): boolean {
  return (
    Object.values(ships).every((shipCount) => shipCount <= 0) &&
    snapshot.activeBurnTransits.length === 0 &&
    snapshot.mandatoryLaunches.length === 0
  );
}

function createNoWinnerYetVictoryReason(
  snapshot: SolarSystemSnapshot,
  recoveryByFaction: ReadonlyMap<FactionId, FactionRecoveryPath>
): string {
  const factionIds = getSnapshotFactionIds(snapshot);
  const competitiveFactions = factionIds.filter((factionId) => {
    return getRecoveryPathFromMap(recoveryByFaction, factionId).canRecoverIndefiniteTritium;
  });

  if (competitiveFactions.length > 1) {
    return "multiple-competitive-recovery-paths";
  }

  if (
    factionIds.some((factionId) => {
      return getRecoveryPathFromMap(recoveryByFaction, factionId)
        .pendingRecoveryTransitBlocksVictory;
    })
  ) {
    return "active-transit-can-recover";
  }

  if (
    factionIds.some((factionId) => {
      return getRecoveryPathFromMap(recoveryByFaction, factionId).unresolvedTritium.length > 0;
    })
  ) {
    return "contested-outcome-uncertain";
  }

  if (competitiveFactions.length === 0) {
    return "no-stable-tritium-path";
  }

  return "no-winner-yet-material-too-close";
}

function createVictoryBlockedByReasons(
  snapshot: SolarSystemSnapshot,
  recoveryByFaction: ReadonlyMap<FactionId, FactionRecoveryPath>
): readonly string[] {
  const reasons = new Set<string>();
  const factionIds = getSnapshotFactionIds(snapshot);
  const competitiveFactions = factionIds.filter((factionId) => {
    return getRecoveryPathFromMap(recoveryByFaction, factionId).canRecoverIndefiniteTritium;
  });

  if (competitiveFactions.length > 1) {
    reasons.add("multiple-competitive-recovery-paths");
  }

  for (const factionId of factionIds) {
    const recovery = getRecoveryPathFromMap(recoveryByFaction, factionId);

    if (recovery.pendingRecoveryTransitBlocksVictory) {
      reasons.add("active-transit-can-recover");
    }

    if (recovery.unresolvedTritium.length > 0) {
      reasons.add("contested-outcome-uncertain");
    }

    if (!recovery.canRecoverIndefiniteTritium && recovery.collapseStatus !== "forced") {
      reasons.add("no-winner-yet-material-too-close");
    }
  }

  if (reasons.size === 0) {
    reasons.add(competitiveFactions.length === 0 ? "no-stable-tritium-path" : "winner-not-stable");
  }

  return [...reasons].sort();
}

export function createVictoryAuditContradictions(
  content: SolarSystemData,
  recoveryState: GameState,
  snapshot: SolarSystemSnapshot,
  outcome: PostMatchOutcome,
  victoryAudit: VictoryAudit
): readonly Readonly<Record<string, unknown>>[] {
  const factionIds = getSnapshotFactionIds(snapshot);
  const contradictions: Readonly<Record<string, unknown>>[] = [];
  const victoryRecoveryState = createVictoryEvaluationState(recoveryState);

  for (const factionId of factionIds) {
    const plannerRecovery = evaluateFactionRecoveryPath(content, victoryRecoveryState, factionId);
    const victoryState = victoryAudit.factionStates[factionId];

    if (victoryState === undefined) {
      contradictions.push({
        type: "VICTORY_AUDIT_CONTRADICTION",
        faction: factionId,
        reason: "missing-victory-faction-state"
      });
      continue;
    }

    if (factionId === outcome.winner) {
      if (!hasProvenStableVictoryRecovery(plannerRecovery)) {
        contradictions.push({
          type: "VICTORY_AUDIT_CONTRADICTION",
          faction: factionId,
          reason: "winner-stability-not-proven",
          plannerRoutes: plannerRecovery.countedTritium.map((audit) =>
            formatVictoryRecoveryTritiumAudit(content, audit)
          ),
          knownThreats: plannerRecovery.knownThreats.map(formatVictoryRecoveryThreat),
          victoryRoutes: victoryState.countedTritium,
          rejectedReasons: plannerRecovery.rejectedTritium.map((audit) => audit.reason)
        });
      }

      continue;
    }

    if (
      plannerRecovery.canRecoverIndefiniteTritium ||
      plannerRecovery.reachableTritiumNodes > 0 ||
      plannerRecovery.collapseStatus !== "forced"
    ) {
      contradictions.push({
        type: "VICTORY_AUDIT_CONTRADICTION",
        faction: factionId,
        reason: "planner-recovery-not-forced-dead",
        plannerCollapseStatus: plannerRecovery.collapseStatus,
        plannerRoutes: plannerRecovery.countedTritium.map((audit) =>
          formatVictoryRecoveryTritiumAudit(content, audit)
        ),
        victoryRoutes: victoryState.countedTritium,
        rejectedReasons: plannerRecovery.rejectedTritium.map((audit) => audit.reason),
        unresolvedRoutes: plannerRecovery.unresolvedTritium.map((audit) =>
          formatVictoryRecoveryTritiumAudit(content, audit)
        )
      });
    }
  }

  return contradictions;
}

function createVictoryCollapseClassificationAudit(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId,
  recovery: FactionRecoveryPath
): Readonly<Record<string, unknown>> {
  return {
    type: "VICTORY_COLLAPSE_CLASSIFICATION_AUDIT",
    faction: factionId,
    currentDv: getFactionDv(snapshot, factionId),
    projectedDv: recovery.projectedDvAtHorizon,
    shipsAlive: countRemainingShips(snapshot)[factionId] ?? 0,
    activeTransits: snapshot.activeBurnTransits
      .filter((transit) => transit.factionId === factionId)
      .map((transit) => transit.id),
    currentTritiumNodes: [...getControlledTritiumNodeIds(content, snapshot, factionId)].sort(),
    currentShipyards: getControlledShipyardNodeIds(content, snapshot, factionId),
    reachableTritium: recovery.countedTritium.map((audit) => audit.nodeId).sort(),
    unresolvedTritium: recovery.unresolvedTritium.map((audit) => audit.nodeId).sort(),
    pendingMissiles: snapshot.activeMissiles
      .filter((missile) => missile.factionId === factionId)
      .map((missile) => missile.id),
    contestedNodes: snapshot.nodes
      .filter((node) => node.isContested)
      .filter((node) => {
        return snapshot.nodeOccupancies.some((occupancy) => {
          return occupancy.nodeId === node.id && occupancy.factionId === factionId;
        });
      })
      .map((node) => node.id),
    legalExits: recovery.unresolvedTritium.reduce((total, audit) => {
      return total + (audit.legalExits ?? 0);
    }, 0),
    pendingProduction: snapshot.shipyardProgress
      .filter((progress) => progress.workerFactionId === factionId)
      .map((progress) => ({ ...progress })),
    collapseStatus: recovery.collapseStatus,
    reason: recovery.collapseReason
  };
}

function createPendingRecoveryTransitAudits(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId,
  recovery: FactionRecoveryPath
): readonly Readonly<Record<string, unknown>>[] {
  const unresolvedNodeIds = new Set(recovery.unresolvedTritium.map((audit) => audit.nodeId));

  return [...snapshot.pendingBurnOrders, ...snapshot.activeBurnTransits]
    .filter((transit) => {
      return transit.factionId === factionId && unresolvedNodeIds.has(transit.destinationNodeId);
    })
    .map((transit) => {
      const recoveryAudit = recovery.unresolvedTritium.find((audit) => {
        return audit.nodeId === transit.destinationNodeId;
      });

      return {
        type: "VICTORY_DELAYED_PENDING_RECOVERY_TRANSIT",
        faction: factionId,
        transitId: transit.id,
        origin: transit.originNodeId,
        destination: transit.destinationNodeId,
        destinationType: content.nodes.find((node) => node.id === transit.destinationNodeId)?.type,
        arrivalTurn: transit.arrivalTurn,
        projectedDvAtArrival: recoveryAudit?.projectedDvAtArrival ?? null,
        expectedContestedState: recoveryAudit?.contestedRecovery === true,
        reason: recoveryAudit?.reason ?? "pending-recovery-transit"
      };
    });
}

function createContestedRecoveryAudit(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId,
  audit: FactionRecoveryPath["unresolvedTritium"][number]
): Readonly<Record<string, unknown>> {
  const enemyOccupants = snapshot.nodeOccupancies
    .filter((occupancy) => occupancy.nodeId === audit.nodeId && occupancy.factionId !== factionId)
    .map((occupancy) => `${occupancy.factionId}:${occupancy.shipCount}`);

  return {
    type: "VICTORY_CONTESTED_RECOVERY_AUDIT",
    faction: factionId,
    node: audit.nodeId,
    origin: audit.viaNodeId,
    arrivalTurn: audit.firstPossibleWorkTurn - 1,
    firstWorkTurn: audit.firstPossibleWorkTurn,
    isContested: audit.contestedRecovery,
    enemyOccupants,
    dVAtArrival: audit.projectedDvAtArrival ?? null,
    dVAfterOneUpkeep: audit.projectedDvAfterOneUpkeep ?? null,
    legalExits: audit.legalExits ?? 0,
    hostileMissiles: audit.hostileMissiles ?? 0,
    forcedDead: false,
    unresolved: audit.unresolved,
    decision: `${formatNodeName(content, audit.nodeId)} delayed as unresolved recovery`
  };
}

function createVictoryAuditDeathReason(
  winner: FactionId | null,
  factionId: FactionId,
  ships: number,
  dV: number,
  tritiumAccess: readonly string[],
  reachableTritium: readonly string[],
  activeShipyards: readonly string[],
  canRecoverIndefiniteTritium: boolean
): string {
  if (factionId === winner) {
    return "winner";
  }

  if (ships <= 0) {
    return "no ships remaining";
  }

  if (canRecoverIndefiniteTritium) {
    return "still viable";
  }

  if (tritiumAccess.length === 0 && reachableTritium.length === 0 && dV <= 0) {
    return "0 ΔV and no reachable tritium";
  }

  if (tritiumAccess.length === 0 && reachableTritium.length === 0) {
    return "no tritium access or recovery route";
  }

  if (activeShipyards.length === 0) {
    return "no productive shipyard path";
  }

  return "strategic tritium collapse";
}

function getReachableTritiumNodeIds(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId
): readonly string[] {
  const tritiumNodes = content.nodes.filter((node) => node.type === "tritium");
  const occupiedNodeIds = snapshot.nodeOccupancies
    .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
    .map((occupancy) => occupancy.nodeId);
  const reachable = new Set<string>();

  for (const originNodeId of occupiedNodeIds) {
    for (const destination of tritiumNodes) {
      if (destination.id === originNodeId) {
        reachable.add(destination.id);
        continue;
      }

      const plan = calculateBurnPlan(content, snapshot, originNodeId, destination.id);

      if (plan !== null && plan.burnCost <= getFactionDv(snapshot, factionId)) {
        reachable.add(destination.id);
      }
    }
  }

  for (const order of [...snapshot.pendingBurnOrders, ...snapshot.activeBurnTransits]) {
    if (
      order.factionId === factionId &&
      tritiumNodes.some((node) => node.id === order.destinationNodeId)
    ) {
      reachable.add(order.destinationNodeId);
    }
  }

  return [...reachable].sort();
}

function getControlledShipyardNodeIds(
  content: SolarSystemData,
  snapshot: SolarSystemSnapshot,
  factionId: FactionId
): readonly string[] {
  const shipyardNodeIds = new Set(
    content.nodes.filter((node) => node.type === "shipyard").map((node) => node.id)
  );

  return snapshot.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        shipyardNodeIds.has(occupancy.nodeId)
      );
    })
    .map((occupancy) => occupancy.nodeId)
    .sort();
}

export function createMapOutcomeAudit(
  content: SolarSystemData,
  proceduralDebug: ProceduralMapDebug | null,
  replayTape: ReplayTape,
  finalSnapshot: SolarSystemSnapshot,
  outcome: PostMatchOutcome,
  victoryAudit: VictoryAudit
): MapOutcomeAudit {
  const initialSnapshot = replayTape.transitions[0]?.from;
  const snapshots =
    initialSnapshot === undefined
      ? replayTape.transitions.map((transition) => transition.to)
      : [initialSnapshot, ...replayTape.transitions.map((transition) => transition.to)];
  const timeline = snapshots.length === 0 ? [finalSnapshot] : snapshots;
  const finalGameMode = finalSnapshot.gameMode ?? "2p";
  const proceduralFairnessAudit =
    proceduralDebug?.fairnessAuditByMode[finalGameMode] ?? proceduralDebug?.fairnessAudit;
  const finalFactionIds = getSnapshotFactionIds(finalSnapshot);
  const predictedTritiumAccessScores: Record<string, number | null> = {};
  const auditFactionIds = proceduralFairnessAudit?.activeFactionIds ?? [];
  const missingAuditFactionIds =
    proceduralFairnessAudit === undefined
      ? []
      : finalFactionIds.filter((factionId) => !auditFactionIds.includes(factionId));
  const auditModeMismatch =
    finalGameMode === "3p" &&
    (proceduralFairnessAudit === undefined || missingAuditFactionIds.length > 0);
  const auditModeMismatchReason = auditModeMismatch
    ? `AUDIT_MODE_MISMATCH ${finalGameMode}: missing ${missingAuditFactionIds.join(",") || "all"}`
    : null;

  for (const factionId of finalFactionIds) {
    const score = proceduralFairnessAudit?.factionScores[factionId];

    predictedTritiumAccessScores[factionId] = score?.tritiumAccessScore ?? null;
  }
  const actualTritiumNodesByTurn = timeline.map((turnSnapshot) => ({
    turn: turnSnapshot.turn,
    factions: Object.fromEntries(
      getSnapshotFactionIds(turnSnapshot).map((factionId) => [
        factionId,
        [...getControlledTritiumNodeIds(content, turnSnapshot, factionId)].sort()
      ])
    )
  }));
  const actualDvByTurn = timeline.map((turnSnapshot) => ({
    turn: turnSnapshot.turn,
    factions: Object.fromEntries(
      getSnapshotFactionIds(turnSnapshot).map((factionId) => [
        factionId,
        getFactionDv(turnSnapshot, factionId)
      ])
    )
  }));
  const actualShipsByTurn = timeline.map((turnSnapshot) => ({
    turn: turnSnapshot.turn,
    factions: countRemainingShips(turnSnapshot)
  }));
  const actualCollapseTurnPerFaction = Object.fromEntries(
    getSnapshotFactionIds(finalSnapshot).map((factionId) => [
      factionId,
      getFirstTritiumCollapseTurn(content, timeline, factionId)
    ])
  );
  const accessScores = Object.values(predictedTritiumAccessScores).filter(
    (score): score is number => typeof score === "number"
  );
  const lowestPredictedAccess = accessScores.length === 0 ? null : Math.min(...accessScores);
  const endedWithCollapse = Object.entries(victoryAudit.factionStates).some(
    ([factionId, state]) => {
      return factionId !== outcome.winner && !state.canRecoverIndefiniteTritium;
    }
  );
  const whetherMapLikelyCausedRunaway =
    endedWithCollapse &&
    (proceduralDebug === null ||
      proceduralDebug.fairnessScore < 70 ||
      (lowestPredictedAccess !== null && lowestPredictedAccess < 55));
  const hasUnresolvedRecovery = Object.entries(victoryAudit.factionStates).some(
    ([factionId, state]) => {
      return factionId !== outcome.winner && state.collapseStatus === "unresolved";
    }
  );
  const hasProjectedCollapse = Object.entries(victoryAudit.factionStates).some(
    ([factionId, state]) => {
      return factionId !== outcome.winner && state.collapseStatus === "projected";
    }
  );
  const hasPlannerConfirmedNonWinnerRoute = Object.entries(victoryAudit.factionStates).some(
    ([factionId, state]) => {
      return (
        factionId !== outcome.winner &&
        (state.canRecoverIndefiniteTritium || state.reachableTritium.length > 0)
      );
    }
  );
  const winnerState = victoryAudit.factionStates[outcome.winner];
  const winnerHasProvenStablePath =
    winnerState !== undefined &&
    winnerState.canRecoverIndefiniteTritium &&
    winnerState.countedTritium.length > 0 &&
    !winnerState.knownThreats.some((threat) => threat.includes(" unsafe "));
  const playerForcedInThreePlayer =
    finalGameMode === "3p" &&
    victoryAudit.factionStates.player?.collapseStatus === "forced" &&
    Object.entries(victoryAudit.factionStates).some(([factionId, state]) => {
      return (
        factionId !== "player" && factionId !== outcome.winner && state.collapseStatus !== "forced"
      );
    });
  const whetherAILikelyCausedRunaway = endedWithCollapse && !whetherMapLikelyCausedRunaway;
  const outcomeClassification = auditModeMismatch
    ? "premature-victory-audit"
    : hasPlannerConfirmedNonWinnerRoute
      ? "false-positive-victory"
      : playerForcedInThreePlayer
        ? "player-collapse-opponent-vs-ai2-unresolved"
        : hasUnresolvedRecovery
          ? "unresolved-recovery"
          : hasProjectedCollapse
            ? "premature-victory-audit"
            : !winnerHasProvenStablePath
              ? "premature-victory-audit"
              : whetherAILikelyCausedRunaway
                ? "ai-induced-runaway-pending-verification"
                : whetherMapLikelyCausedRunaway
                  ? "map-caused-collapse"
                  : endedWithCollapse
                    ? "healthy-victory"
                    : "valid-no-victory-yet";

  return {
    seed: proceduralDebug?.seed ?? null,
    outcomeClassification,
    initialFairnessScore: proceduralDebug?.fairnessScore ?? null,
    predictedTritiumAccessScores,
    actualTritiumNodesByTurn,
    actualDvByTurn,
    actualShipsByTurn,
    actualCollapseTurnPerFaction,
    whetherMapLikelyCausedRunaway,
    whetherAILikelyCausedRunaway,
    auditModeMismatch,
    auditModeMismatchReason
  };
}

function getFirstTritiumCollapseTurn(
  content: SolarSystemData,
  timeline: readonly SolarSystemSnapshot[],
  factionId: FactionId
): number | null {
  for (const turnSnapshot of timeline) {
    if (!isFactionTritiumViable(content, turnSnapshot, factionId)) {
      return turnSnapshot.turn;
    }
  }

  return null;
}

export function createPostMatchReport(
  content: SolarSystemData,
  replayTape: ReplayTape,
  debugEvents: readonly TurnDebugEvent[],
  finalSnapshot: SolarSystemSnapshot,
  outcome: PostMatchOutcome
): string {
  const ships = countRemainingShips(finalSnapshot);
  const shipsDestroyed = countDebugEventsByFaction(debugEvents, "SHIP_DESTROYED");
  const missilesFired = countDebugEventsByFaction(debugEvents, "FIRE_LAUNCHED");
  const missileHits = countDebugEvents(debugEvents, "MISSILE_IMPACT");
  const brokenSolutions = countDebugEvents(debugEvents, "MISSILE_SOLUTION_BROKEN");
  const evades = countDebugEvents(debugEvents, "EVADE");
  const contestedStarted = countReplayEntries(replayTape.entries, "CONTESTED_STARTED");
  const contestedEnded = countReplayEntries(replayTape.entries, "CONTESTED_ENDED");
  const contestedPaid = countDebugEvents(debugEvents, "CONTESTED_UPKEEP_PAID");
  const contestedFailed = countDebugEvents(debugEvents, "CONTESTED_UPKEEP_FAILED");
  const tritiumGained = sumDebugAmountsByFaction(debugEvents, "TRITIUM_INCOME");
  const tritiumLosses = collectTritiumLosses(content, replayTape.transitions);
  const tritiumLost = countTritiumLossesByFaction(tritiumLosses);
  const shipyardsCompleted = countDebugEventsByFaction(debugEvents, "SHIP_PRODUCED");
  const criticalTurns = collectCriticalDvTurns(replayTape.transitions);
  const alphaStrikes = detectAlphaStrikes(replayTape.transitions);
  const importantTurns = collectImportantTurns(
    content,
    finalSnapshot.factions,
    replayTape,
    debugEvents,
    tritiumLosses,
    criticalTurns,
    alphaStrikes
  );

  return [
    `AAR T${finalSnapshot.turn}`,
    `Winner: ${formatFactionName(finalSnapshot.factions, outcome.winner)}`,
    `Final ΔV: ${formatFactionNumberPair(finalSnapshot.factions, finalSnapshot.factionDv)}`,
    `Ships: ${formatFactionNumberPair(finalSnapshot.factions, ships)} remaining; destroyed ${formatFactionNumberPair(finalSnapshot.factions, shipsDestroyed)}`,
    `Missiles: fired ${formatFactionNumberPair(finalSnapshot.factions, missilesFired)}; hits ${missileHits}; broken ${brokenSolutions}; evades ${evades}`,
    `Contested: ${contestedStarted} starts / ${contestedEnded} ends; upkeep paid ${contestedPaid}, failed ${contestedFailed}`,
    `Economy: tritium +${formatFactionNumberPair(finalSnapshot.factions, tritiumGained)}; lost ${formatFactionNumberPair(finalSnapshot.factions, tritiumLost)}; yards ${formatFactionNumberPair(finalSnapshot.factions, shipyardsCompleted)}`,
    `Critical ΔV: ${formatCriticalTurns(finalSnapshot.factions, criticalTurns)}`,
    `Alpha Strike: ${formatAlphaStrikes(content, alphaStrikes)}`,
    `Key turns: ${formatImportantTurns(content, finalSnapshot.factions, importantTurns)}`
  ].join("\n");
}

export function countRemainingShips(snapshot: SolarSystemSnapshot): FactionCounts {
  const counts = createEmptyFactionCounts();

  for (const occupancy of snapshot.nodeOccupancies) {
    counts[occupancy.factionId] = (counts[occupancy.factionId] ?? 0) + occupancy.shipCount;
  }

  for (const transit of snapshot.activeBurnTransits) {
    counts[transit.factionId] = (counts[transit.factionId] ?? 0) + transit.shipCount;
  }

  return counts;
}

function countDebugEvents(events: readonly TurnDebugEvent[], type: TurnDebugEventType): number {
  return events.filter((event) => event.type === type).length;
}

function countDebugEventsByFaction(
  events: readonly TurnDebugEvent[],
  type: TurnDebugEventType
): FactionCounts {
  const counts = createEmptyFactionCounts();

  for (const event of events) {
    if (event.type === type && event.factionId !== undefined) {
      counts[event.factionId] = (counts[event.factionId] ?? 0) + 1;
    }
  }

  return counts;
}

function countReplayEntries(entries: readonly ReplayEntry[], type: ReplayEventType): number {
  return entries.filter((entry) => entry.type === type).length;
}

function sumDebugAmountsByFaction(
  events: readonly TurnDebugEvent[],
  type: TurnDebugEventType
): FactionCounts {
  const counts = createEmptyFactionCounts();

  for (const event of events) {
    if (event.type === type && event.factionId !== undefined) {
      counts[event.factionId] = (counts[event.factionId] ?? 0) + (event.amount ?? 0);
    }
  }

  return counts;
}

function collectTritiumLosses(
  content: SolarSystemData,
  transitions: readonly ReplayTransition[]
): readonly TritiumLoss[] {
  const losses: TritiumLoss[] = [];

  for (const transition of transitions) {
    for (const factionId of getSnapshotFactionIds(transition.to)) {
      const before = getControlledTritiumNodeIds(content, transition.from, factionId);
      const after = getControlledTritiumNodeIds(content, transition.to, factionId);

      for (const nodeId of before) {
        if (!after.has(nodeId)) {
          losses.push({ turn: transition.to.turn, factionId, nodeId });
        }
      }
    }
  }

  return losses;
}

export function getControlledTritiumNodeIds(
  content: SolarSystemData,
  visualState: ReplayVisualState,
  factionId: FactionId
): Set<string> {
  const tritiumNodeIds = new Set(
    content.nodes.filter((node) => node.type === "tritium").map((node) => node.id)
  );
  return new Set(
    visualState.nodeOccupancies
      .filter((occupancy) => {
        return (
          occupancy.factionId === factionId &&
          occupancy.shipCount > 0 &&
          tritiumNodeIds.has(occupancy.nodeId)
        );
      })
      .map((occupancy) => occupancy.nodeId)
  );
}

function countTritiumLossesByFaction(losses: readonly TritiumLoss[]): FactionCounts {
  const counts = createEmptyFactionCounts();

  for (const loss of losses) {
    counts[loss.factionId] = (counts[loss.factionId] ?? 0) + 1;
  }

  return counts;
}

function collectCriticalDvTurns(
  transitions: readonly ReplayTransition[]
): Readonly<Record<string, readonly number[]>> {
  const turns: Record<string, number[]> = { player: [], opponent: [] };

  for (const transition of transitions) {
    for (const factionId of getSnapshotFactionIds(transition.to)) {
      turns[factionId] ??= [];
      if (
        getFactionDv(transition.to, factionId) <= criticalDvReportThreshold &&
        !turns[factionId].includes(transition.to.turn)
      ) {
        turns[factionId].push(transition.to.turn);
      }
    }
  }

  return turns;
}

function detectAlphaStrikes(transitions: readonly ReplayTransition[]): readonly AlphaStrike[] {
  const alphaStrikes: AlphaStrike[] = [];
  const seen = new Set<string>();

  for (const transition of transitions) {
    const contestedTargets = new Set(
      transition.entries
        .filter((entry) => entry.type === "CONTESTED_STARTED")
        .flatMap((entry) => entry.involved.nodeIds)
    );

    for (const nodeId of contestedTargets) {
      const hasHit = transition.entries.some((entry) => {
        return entry.type === "MISSILE_IMPACT" && entry.involved.nodeIds.includes(nodeId);
      });
      const hasPressure = transition.entries.some((entry) => {
        return (
          (entry.type === "FIRE_LAUNCHED" || entry.type === "MISSILE_IN_FLIGHT") &&
          entry.involved.nodeIds.includes(nodeId)
        );
      });

      if (!hasHit && !hasPressure) {
        continue;
      }

      const key = `${transition.to.turn}:${nodeId}`;

      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      alphaStrikes.push({
        turn: transition.to.turn,
        nodeId,
        pressure: hasHit ? "hit" : "pressure"
      });
    }
  }

  return alphaStrikes;
}

function collectImportantTurns(
  content: SolarSystemData,
  factions: readonly FactionIdentity[] | undefined,
  replayTape: ReplayTape,
  debugEvents: readonly TurnDebugEvent[],
  tritiumLosses: readonly TritiumLoss[],
  criticalTurns: Readonly<Record<string, readonly number[]>>,
  alphaStrikes: readonly AlphaStrike[]
): readonly ImportantTurn[] {
  const turns = new Map<number, { score: number; notes: string[] }>();
  const addNote = (turn: number, score: number, note: string): void => {
    const summary = turns.get(turn) ?? { score: 0, notes: [] };
    summary.score += score;

    if (!summary.notes.includes(note)) {
      summary.notes.push(note);
    }

    turns.set(turn, summary);
  };

  for (const event of debugEvents) {
    switch (event.type) {
      case "SHIP_DESTROYED":
        addNote(event.turn, 8, `ship destroyed at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "MISSILE_IMPACT":
        addNote(event.turn, 6, `missile hit ${formatNodeName(content, event.nodeId)}`);
        break;
      case "EVADE":
        addNote(event.turn, 4, `Evade tax at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "MISSILE_SOLUTION_BROKEN":
        addNote(event.turn, 3, "missile solution broken");
        break;
      case "SHIP_PRODUCED":
        addNote(event.turn, 4, `shipyard completed at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED":
        addNote(event.turn, 4, `shipyard suspended at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION":
        addNote(event.turn, 10, `BUG DETECTED at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "NODE_STACKING_INVARIANT_VIOLATION":
        addNote(event.turn, 10, `BUG DETECTED at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "MANDATORY_LAUNCH_DESTROYED":
        addNote(event.turn, 6, `failed launch at ${formatNodeName(content, event.nodeId)}`);
        break;
      case "CONTESTED_UPKEEP_FAILED":
        addNote(
          event.turn,
          6,
          `contested upkeep failed at ${formatNodeName(content, event.nodeId)}`
        );
        break;
      default:
        break;
    }
  }

  for (const entry of replayTape.entries) {
    const nodeId = entry.involved.nodeIds[0];

    if (entry.type === "CONTESTED_STARTED") {
      addNote(entry.turn, 5, `contest opened at ${formatNodeName(content, nodeId)}`);
    }

    if (entry.type === "CONTESTED_ENDED") {
      addNote(entry.turn, 2, `contest ended at ${formatNodeName(content, nodeId)}`);
    }
  }

  for (const loss of tritiumLosses) {
    addNote(
      loss.turn,
      5,
      `${formatFactionName(factions, loss.factionId)} lost tritium at ${formatNodeName(content, loss.nodeId)}`
    );
  }

  for (const strike of alphaStrikes) {
    addNote(
      strike.turn,
      9,
      `Alpha Strike at ${formatNodeName(content, strike.nodeId)} (${strike.pressure})`
    );
  }

  for (const factionId of getReportFactionIds(factions)) {
    for (const turn of criticalTurns[factionId] ?? []) {
      addNote(turn, 3, `${formatFactionName(factions, factionId)} critical ΔV`);
    }
  }

  return [...turns.entries()]
    .map(([turn, summary]) => ({
      turn,
      score: summary.score,
      notes: summary.notes.slice(0, 2)
    }))
    .sort((first, second) => {
      if (first.score !== second.score) {
        return second.score - first.score;
      }

      return first.turn - second.turn;
    })
    .slice(0, 5)
    .sort((first, second) => first.turn - second.turn);
}

function createEmptyFactionCounts(): FactionCounts {
  return { player: 0, opponent: 0, ai_2: 0 };
}

export function formatFactionName(
  factions: readonly FactionIdentity[] | undefined,
  factionId: FactionId
): string {
  return (
    getReportFactions(factions).find((faction) => faction.id === factionId)?.displayName ??
    factionId
  );
}

function formatFactionNumberPair(
  factions: readonly FactionIdentity[] | undefined,
  counts: Readonly<Record<string, number>>
): string {
  return getReportFactionIds(factions)
    .map((factionId) => `${formatFactionName(factions, factionId)} ${counts[factionId] ?? 0}`)
    .join(" | ");
}

function formatCriticalTurns(
  factions: readonly FactionIdentity[] | undefined,
  turns: Readonly<Record<string, readonly number[]>>
): string {
  const factionIds = Object.keys(turns).filter((factionId): factionId is FactionId => {
    return factionId === "player" || factionId === "opponent" || factionId === "ai_2";
  });

  return (factionIds.length === 0 ? getReportFactionIds(factions) : factionIds)
    .map((factionId) => {
      const values = (turns[factionId] ?? []).slice(0, 6).map((turn) => `T${turn}`);
      return `${formatFactionName(factions, factionId)} ${values.length === 0 ? "-" : values.join(",")}`;
    })
    .join("; ");
}

function getReportFactions(
  factions: readonly FactionIdentity[] | undefined
): readonly FactionIdentity[] {
  return factions === undefined || factions.length === 0 ? fallbackReportFactions : factions;
}

function getReportFactionIds(
  factions: readonly FactionIdentity[] | undefined
): readonly FactionId[] {
  const identities = getReportFactions(factions);
  return identities.length === 0 ? reportFactionIds : identities.map((faction) => faction.id);
}

function formatAlphaStrikes(
  content: SolarSystemData,
  alphaStrikes: readonly AlphaStrike[]
): string {
  if (alphaStrikes.length === 0) {
    return "-";
  }

  return alphaStrikes
    .slice(0, 3)
    .map((strike) => {
      const label = strike.pressure === "hit" ? "contest + hit" : "contest + pressure";
      return `T${strike.turn} ${formatNodeName(content, strike.nodeId)} (${label})`;
    })
    .join("; ");
}

function formatImportantTurns(
  content: SolarSystemData,
  factions: readonly FactionIdentity[] | undefined,
  importantTurns: readonly ImportantTurn[]
): string {
  void content;
  void factions;

  if (importantTurns.length === 0) {
    return "-";
  }

  return importantTurns.map((turn) => `T${turn.turn} ${turn.notes.join(", ")}`).join("; ");
}

export function formatNodeName(content: SolarSystemData, nodeId: string | undefined): string {
  if (nodeId === undefined) {
    return "unknown";
  }

  const node = content.nodes.find((candidate) => candidate.id === nodeId);
  const body =
    node === undefined
      ? undefined
      : content.bodies.find((candidate) => candidate.id === node.bodyId);
  return body?.name ?? nodeId;
}
