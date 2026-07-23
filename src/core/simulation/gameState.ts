import type {
  AssignFireOrderCommand,
  AssignBurnOrderCommand,
  CancelPendingBurnOrderCommand,
  CancelPendingFireOrderCommand,
  GameCommand,
  RedirectActiveBurnCommand
} from "../commands/commands";
import type {
  ActiveMissile,
  ActiveBurnTransit,
  BurnPlan,
  FactionDvReserve,
  FactionId,
  FactionIdentity,
  FirePlan,
  GameState,
  GameModeId,
  MandatoryLaunch,
  NodeOccupancy,
  PendingBurnOrder,
  PendingFireOrder,
  SimulationContent,
  ShipyardProgress,
  TransferCategory,
  TransferMotionRelation,
  TransferVisualArcType,
  TransferWindowQuality,
  TurnDebugEvent,
  Vec2
} from "../state/types";
import { DEFAULT_INITIAL_OCCUPANCIES, STARTING_SETUP } from "../../shared/startingSetup";
import {
  createDefaultFactionIdentities,
  createFactionDvReserve,
  defaultGameMode,
  getActiveFactionIds,
  getAiFactionIds,
  getEnemyFactionIds,
  getFactionDv,
  getFactionIdentity,
  knownFactionIds
} from "../state/factions";
import { computeBodyPosition } from "./positions";
import {
  AI_CRITICAL_DV,
  AI_ACTION_SOLVENCY_HORIZON_TURNS,
  AI_CONTESTED_SUSTAIN_TURNS,
  AI_GREEDY_MIRROR_PAYBACK_TURNS,
  AI_INSOLVENCY_GUARD_HORIZON_TURNS,
  AI_MIN_DV_RESERVE,
  AI_OPENING_SOLVENCY_HARD_GATE_END_TURN,
  AI_PLANNER_NAME,
  AI_PROFILE_TRYHARD,
  AI_STRATEGY_READ_TOO_LATE_TURN,
  AI_TRYHARD_MAX_COORDINATED_ACTIONS,
  AI_TRYHARD_MIN_ACTION_SCORE,
  AI_TRYHARD_SECOND_TRITIUM_OPENING_END_TURN,
  AI_TRYHARD_SOLVENCY_HORIZON_TURNS,
  type AiPlanningOptions,
  type AiStrategyProfile,
  type EffectiveAiPlanningLevel
} from "./aiConfig";

export type { AiPlanningLevel, AiPlanningOptions, AiStrategyProfile } from "./aiConfig";

const defaultPlayerFactionId: FactionId = "player";
const tritiumWorkOutput = 2;
const automaticEvadeDvCost = 1;
const contestedUpkeepDvCost = 2;
const contestedLeaveDvCost = 0;
const shipyardCompletionProgress = 5;
const AI_CONTESTED_EXIT_BUFFER = AI_MIN_DV_RESERVE + contestedUpkeepDvCost;
const AI_OPENING_EVADE_SAFETY_RESERVE = automaticEvadeDvCost;
const defaultInitialOccupancies: readonly NodeOccupancy[] = [...DEFAULT_INITIAL_OCCUPANCIES];
const maxBurnPlanCacheEntriesPerContent = 8192;

export type SimulationPerformanceCounterName =
  | "evaluateFactionRecoveryPath"
  | "getAiSolvencyTritiumCountAudits"
  | "calculateBurnPlan"
  | "calculateBurnPlanFromPosition";

export type SimulationPerformanceCounterSnapshot = Readonly<
  Record<SimulationPerformanceCounterName, number>
>;

const simulationPerformanceCounterNames = [
  "evaluateFactionRecoveryPath",
  "getAiSolvencyTritiumCountAudits",
  "calculateBurnPlan",
  "calculateBurnPlanFromPosition"
] as const satisfies readonly SimulationPerformanceCounterName[];
let simulationPerformanceCountersEnabled = false;
let simulationPerformanceCounters = createSimulationPerformanceCounterRecord();
const burnPlanCacheByContent = new WeakMap<SimulationContent, Map<string, BurnPlan | null>>();

export function setSimulationPerformanceCountersEnabled(enabled: boolean): void {
  simulationPerformanceCountersEnabled = enabled;
  simulationPerformanceCounters = createSimulationPerformanceCounterRecord();
}

export function flushSimulationPerformanceCounters(): SimulationPerformanceCounterSnapshot {
  const snapshot = { ...simulationPerformanceCounters };
  simulationPerformanceCounters = createSimulationPerformanceCounterRecord();
  return snapshot;
}

function createSimulationPerformanceCounterRecord(): Record<
  SimulationPerformanceCounterName,
  number
> {
  return Object.fromEntries(simulationPerformanceCounterNames.map((name) => [name, 0])) as Record<
    SimulationPerformanceCounterName,
    number
  >;
}

function recordSimulationPerformanceCounter(name: SimulationPerformanceCounterName): void {
  if (!simulationPerformanceCountersEnabled) {
    return;
  }

  simulationPerformanceCounters[name] += 1;
}

const continuousBurnTuning = {
  minEtaTurns: 1,
  maxEtaTurns: 7,
  minBurnCost: 2,
  maxBurnCost: 10,
  iterationCount: 2,
  categoryBaseScore: {
    local: 1.28,
    intersystem: 1.82,
    outer: 2.56,
    "cross-map": 3.35
  },
  distanceScale: {
    local: 118,
    intersystem: 260,
    outer: 340,
    "cross-map": 430
  },
  radialScale: {
    local: 120,
    intersystem: 470,
    outer: 650,
    "cross-map": 840
  },
  visualPreviewLengthScale: {
    local: 820,
    intersystem: 950,
    outer: 1120,
    "cross-map": 1320
  },
  angleWeight: {
    local: 0.35,
    intersystem: 0.55,
    outer: 0.5,
    "cross-map": 0.45
  },
  stretchWeight: 0.58,
  targetMotionWeight: 0.62,
  curveComplexityWeight: 0.13,
  energyBaseScore: {
    local: 1.7,
    intersystem: 2.35,
    outer: 3.25,
    "cross-map": 4.3
  },
  energyDistanceScale: {
    local: 205,
    intersystem: 310,
    outer: 385,
    "cross-map": 455
  },
  energyRadialScale: {
    local: 230,
    intersystem: 610,
    outer: 760,
    "cross-map": 900
  },
  energyVisualPreviewLengthScale: 1250,
  energyPositiveStretchWeight: 0.95,
  energyCleanStretchBonusWeight: 0.42,
  energyPositiveMotionWeight: 0.82,
  energyCleanMotionBonusWeight: 0.58,
  energyAngleWeight: 0.32,
  energyDifficultyWeight: 0.74,
  favorableWindowThreshold: -0.17,
  unfavorableWindowThreshold: 0.2,
  movingTowardThreshold: -0.08,
  movingAwayThreshold: 0.08,
  proceduralEtaTableWeight: 0.62,
  proceduralEtaDistanceCurveExponent: 0.72,
  proceduralEtaWindowWeight: 0.76,
  proceduralEtaCurveComplexityWeight: 0.22,
  proceduralEtaMotionWeight: 0.18,
  originGravityWeight: 0.22,
  destinationGravityWeight: 0.2
} as const;

type EnemyTurnPlan = Readonly<{
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  skippedWorkShipKeys: readonly string[];
  audit: TurnPlanningAudit;
}>;

type AiFactionTurnPlan = Readonly<{
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  skippedWorkShipKeys: readonly string[];
}>;

type TurnPlanningAudit = Readonly<{
  preTurnSnapshotHash: string;
  plannerSnapshotHashes: Readonly<Partial<Record<FactionId, string>>>;
  sameSnapshotUsed: boolean;
  stateMutatedDuringPlanning: boolean;
  ordersCollected: Readonly<Record<string, number>>;
  ordersRejected: Readonly<Record<string, number>>;
  conflictsDetected: readonly string[];
  conflictResolutionReasons: readonly string[];
}>;

export type EffectiveActionCostTelemetryEntry = Readonly<{
  turn: number;
  factionId: FactionId;
  nodeId: string;
  targetNodeId?: string;
  cost: number;
}>;

export type EffectiveActionCostTelemetry = Readonly<{
  total: number;
  entries: readonly EffectiveActionCostTelemetryEntry[];
}>;

export type SimulationTelemetry = Readonly<{
  mapGameplayHash: string;
  trajectoryHash: string;
  collapseTurn: number | null;
  collapseTurnsByFaction: Readonly<Partial<Record<FactionId, number>>>;
  victoryTurn: number | null;
  winnerFactionId: FactionId | null;
  effectiveCosts: Readonly<{
    fire: EffectiveActionCostTelemetry;
    evade: EffectiveActionCostTelemetry;
  }>;
}>;

type AiDebugSimulationResult = Readonly<{
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  stateHistory: readonly GameState[];
  dvHistory: Readonly<Record<string, readonly number[]>>;
  telemetry: SimulationTelemetry;
  report: string;
  errors: readonly string[];
  turnsSimulated: number;
  reasonEnded: string;
}>;

type AiDiagnosticsResult = Readonly<{
  report: string;
  errors: readonly string[];
}>;

export type AiVsAiRegressionResult = Readonly<{
  report: string;
  errors: readonly string[];
  matchDurationDistribution: Readonly<Record<string, number>>;
  earlyVictoriesByTurn10: number;
  multiShipNoTritiumRecoveryLosses: readonly string[];
}>;

type AiVsAiRegressionRunAnalysis = Readonly<{
  name: string;
  decisiveTurn: number | null;
  winnerFactionId: FactionId | null;
  multiShipNoTritiumRecoveryLosses: readonly string[];
}>;

type AiVsAiSimulationOptions = Readonly<{
  name: string;
  turnCount: number;
  initialFactionOrder: readonly FactionId[];
  initialState: GameState;
  aiPlanningOptions?: AiPlanningOptions;
}>;

type AiVsAiSimulationRun = Readonly<{
  name: string;
  initialState: GameState;
  initialFactionOrder: readonly FactionId[];
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  dvHistory: Readonly<Record<string, readonly number[]>>;
  stateHistory: readonly GameState[];
  majorEvents: readonly string[];
  errors: readonly string[];
  turnsSimulated: number;
  reasonEnded: string;
}>;

type StartSideLabel = "titan/deimos/ganymede" | "europa/oberon/phobos" | "mixed";

type MandatoryLaunchBurnSelection = Readonly<{
  order: PendingBurnOrder;
  destinationType: SimulationContent["nodes"][number]["type"];
}>;

type ShipyardProductionOccupancyStatus = Readonly<{
  occupanciesAfterMovement: readonly NodeOccupancy[];
  occupantsByFaction: Partial<Record<string, number>>;
  occupyingFactionIds: readonly FactionId[];
  isContested: boolean;
}>;

type BurnTransferScores = Readonly<{
  transferDifficultyScore: number;
  energyScore: number;
  category: TransferCategory;
  visualPreviewLength: number;
  scoreDistance: number;
  radialChange: number;
  angleFactor: number;
  stretchFactor: number;
  targetMotionFactor: number;
  curveComplexity: number;
  windowScore: number;
}>;

type BurnTransferEstimate = Readonly<{
  etaTurns: number;
  burnCost: number;
  scores: BurnTransferScores;
}>;

type NonContestedNodeStackingViolation = Readonly<{
  nodeId: string;
  factionId: FactionId;
  shipCount: number;
  allowedShipCount: number;
  unresolvedMandatoryLaunchCount: number;
  occupantsByFaction: Partial<Record<string, number>>;
}>;

type AiStrategicPosture = "stable" | "behind" | "shipyard-emergency";
export type FactionCollapseStatus = "forced" | "projected" | "unresolved";

type AiStrategicIntentKind =
  | "recover-shipyard"
  | "pressure-shipyard"
  | "support-contested"
  | "deny-tritium"
  | "get-second-tritium"
  | "counter-second-tritium";

type AiStrategicIntent = Readonly<{
  kind: AiStrategicIntentKind;
  targetNodeId: string;
  expiresTurn: number;
  score: number;
  reason: string;
}>;

type AiProductiveExpansionRead = Readonly<{
  targetFactionId: FactionId;
  reasons: readonly string[];
  productiveNodeCount: number;
  productiveShipCount: number;
  stagingShipCount: number;
  tritiumNodeCount: number;
  projectedTritiumNodeCount: number;
  hasGreedyTritiumExpansionThreat: boolean;
  dvLead: number;
  incomeLead: number;
  advancingShipyards: number;
  score: number;
  antiRunaway: boolean;
}>;

type AiEconomicPressureTarget = Readonly<{
  nodeId: string;
  targetFactionId: FactionId;
  score: number;
  etaTurns: number;
  burnCost?: number;
  reason: string;
  expectedDvSwing: number;
  expectedDeniedWork: number;
  certainty: AiTacticalOutcomeClassification;
  lastTritiumWorker: boolean;
  opportunityCost: number;
}>;

type AiContestedSustainabilityCheck = Readonly<{
  nodeId: string;
  reason: string | null;
  sustainable: boolean;
  currentDvReserve: number;
  activeTritiumIncome: number;
  hasFallbackTritium: boolean;
  expectedUpkeepCost: number;
  projectedDvAfterUpkeep: number;
  projectedDvAfterTwoUpkeeps: number;
  hasSurvivalRoute: boolean;
  canLeaveNextTurn: boolean;
  lastRelevantShip: boolean;
  tritiumCollapseRisk: boolean;
  enemyCanAffordUpkeepBetter: boolean;
  enemyProductiveNodesWorking: number;
  contestedHurtsEnemyProduction: boolean;
}>;

type AiAggregateContestedFrontSource = "existing" | "selected-offensive" | "known-hostile-arrival";

type AiAggregateContestedFront = Readonly<{
  nodeId: string;
  source: AiAggregateContestedFrontSource;
  firstUpkeepTurn: number;
  upkeepPayments: number;
  offensiveOrderId?: string;
}>;

type AiAggregateContestedSolvencyAudit = Readonly<{
  factionId: FactionId;
  initialBudget: number;
  plannedBurnCost: number;
  plannedEvadeCost: number;
  otherPlannedSpending: number;
  plannedSpending: number;
  guaranteedIncome: number;
  projectedUpkeep: number;
  minimumReserve: number;
  projectedDv: number;
  ordersExecutable: boolean;
  unavoidableFailures: number;
  sustainable: boolean;
  fronts: readonly AiAggregateContestedFront[];
}>;

type AiBurnPurpose = "expansion" | "escape" | "mandatory-launch-prevention" | "shipyard-recovery";

type AiBurnTargetSelection = Readonly<{
  nodeId: string | null;
  debugEvents: readonly TurnDebugEvent[];
}>;

type AiTargetSelection = Readonly<{
  nodeId: string | null;
  targetFactionId?: FactionId;
  debugEvents: readonly TurnDebugEvent[];
}>;

type TrailerAiPatternBonus = Readonly<{
  score: number;
  message: string | null;
}>;

type AiContestedFireCombo = Readonly<{
  targetNodeId: string;
  targetFactionId: FactionId;
  contestingNodeId: string;
  firingNodeId: string;
  requiresBurn: boolean;
  burnCost: number;
  burnArrivalTurn: number;
  missileImpactTurn: number;
  projectedDvAfterBurnAndUpkeep: number;
}>;

type AiTritiumFallbackRoute = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  burnCost: number;
  etaTurns: number;
  targetPriority: number;
  originPriority: number;
  reserveOverrideUsed: boolean;
}>;

type AiEndgameClosureActionKind = "BURN" | "FIRE" | "HOLD";

type AiEndgamePublicRecoveryThreat = Readonly<{
  enemyFactionId: FactionId;
  targetNodeId: string;
  targetAvailableTurn: number;
  firstWorkTurn: number;
  committedTransit: boolean;
}>;

type AiEndgameClosureAction = Readonly<{
  kind: AiEndgameClosureActionKind;
  originNodeId: string;
  targetNodeId: string;
  effectiveTurn: number;
  cost: number;
}>;

type AiEndgameEscapeCoverage = Readonly<{
  destinationNodeId: string;
  firstWorkTurn: number;
  action: AiEndgameClosureAction;
}>;

type AiEndgameClosurePlan = Readonly<{
  threat: AiEndgamePublicRecoveryThreat;
  action: AiEndgameClosureAction;
  escapeCoverage: readonly AiEndgameEscapeCoverage[];
}>;

type AiTacticalOutcomeClassification =
  | "FORCED_KILL"
  | "FORCED_SHIPYARD_CAPTURE_WITH_SOLVENCY"
  | "FORCED_TRITIUM_DENIAL_WITH_SOLVENCY"
  | "FORCED_ENEMY_INSOLVENCY"
  | "FORCED_EVADE_COST"
  | "FORCED_BURN_AWAY"
  | "FORCED_WORK_LOSS"
  | "PRESSURE_ONLY"
  | "HARMLESS";

type AiMissileStackClassification =
  | "FORCED_KILL"
  | "FORCED_EVADE_COST"
  | "SHIPYARD_DENIAL"
  | "TRITIUM_DENIAL"
  | "CONTESTED_LOCK"
  | "PRESSURE_ONLY"
  | "NO_THRESHOLD_CHANGE";

type AiMissileStackValue = Readonly<{
  classification: AiMissileStackClassification;
  reason: string;
  missilesBefore: number;
  missilesAfter: number;
  totalEvadeCostBefore: number;
  totalEvadeCostAfter: number;
  targetProjectedDvAtImpact: number;
  projectedIncomeBeforeImpact: number;
  targetCanBreakSolution: boolean;
  targetCanEvade: boolean;
  targetWillBeContestedAtImpact: boolean;
  targetWouldFallBelowReserve: boolean;
  score: number;
}>;

type AiBurnAwayDestinationEvaluation = Readonly<{
  isTritium: boolean;
  isProductive: boolean;
  isSafe: boolean;
  projectedContestRisk: boolean;
  symmetricEscapeRisk: boolean;
  projectedDvAfterArrival: number;
  projectedIncomeAfterArrival: number;
  breaksMissileSolution: boolean;
  supportsRecovery: boolean;
  supportsFinishMode: boolean;
  score: number;
  reason: string;
}>;

type AiStrategicPhase =
  | "OPENING_CONSERVATIVE"
  | "RECOVERY_CONSERVATIVE"
  | "STABLE_EXPANSION"
  | "FINISH_MODE";

type AiTacticalLineProjection = Readonly<{
  action: "BURN" | "FIRE" | "LEAVE_CONTESTED" | "STAY_CONTESTED";
  classification: AiTacticalOutcomeClassification;
  projectedDvByTurn: readonly number[];
  minProjectedDv: number;
  finalProjectedDv: number;
  horizonTurns: number;
  lastTritiumWorker: boolean;
  reserveViolation: boolean;
  contestedSustainable: boolean;
  hasTritiumAccessAfterLine: boolean;
  legalExitAvailable: boolean;
  lostWorkCost: number;
  contestedUpkeepPerTurn: number;
  possibleEnemyFireCost: number;
  mandatoryLaunchReserve: number;
  score: number;
  accepted: boolean;
  reason: string;
}>;

type AiTryhardCandidateKind =
  | "second-tritium"
  | "counter-second-tritium"
  | "tritium-race"
  | "tritium-denial"
  | "shipyard-theft"
  | "economic-fire";

type AiTryhardActionCandidate = Readonly<{
  kind: AiTryhardCandidateKind;
  action: "BURN" | "FIRE";
  originNodeId: string;
  targetNodeId: string;
  targetFactionId?: FactionId;
  score: number;
  reason: string;
  etaTurns: number;
  burnCost: number;
  expectedDvSwing: number;
  expectedDeniedWork: number;
  decisive: boolean;
  certainty?: AiTacticalOutcomeClassification;
  lastTritiumWorker?: boolean;
  opportunityCost?: number;
}>;

type AiSolvencyProjection = Readonly<{
  factionId: FactionId;
  currentDv: number;
  guaranteedTritiumIncome: number;
  activeTritiumNodes: number;
  projectedUpkeep: number;
  incomingMissiles: number;
  mandatoryLaunches: number;
  reachableTritiumNodes: number;
  projectedDvAtHorizon: number;
  solvent: boolean;
  tritiumCountAudits: readonly AiSolvencyTritiumCountAudit[];
}>;

type AiTritiumNodeModel = Readonly<{
  nodeId: string;
  owner: FactionId | null;
  isTritium: boolean;
  isFinite: boolean;
  currentStock: number;
  maxStock: number;
  yieldPerWork: number;
  expectedYieldPerTurn: number;
  turnsToDepletion: number;
  extractionTicksRemaining: number;
  isDepleted: boolean;
  postDepletionRole: "none" | "staging";
  postDepletionPositionValue: number;
  contestStatus: "safe" | "contested" | "enemy-held" | "open";
  threatStatus: "safe" | "missile-threat" | "burn-threat" | "contested";
  expectedWorkableTurnsByFaction: Readonly<Partial<Record<FactionId, number>>>;
  expectedExtractableByFaction: Readonly<Partial<Record<FactionId, number>>>;
  expectedDenyValueByFaction: Readonly<Partial<Record<FactionId, number>>>;
}>;

type AiFactionStrategicRead = Readonly<{
  factionId: FactionId;
  currentDv: number;
  projectedDvH1: number;
  projectedDvH2: number;
  projectedDvH3: number;
  shipCount: number;
  safeTritiumNodes: number;
  contestedTritiumNodes: number;
  threatenedTritiumNodes: number;
  extractableTritiumH2: number;
  extractableTritiumH3: number;
  shipyardCount: number;
  nearCompleteShipyards: number;
  inboundMissiles: number;
  likelyEvadeCostH2: number;
  projectedUpkeepH2: number;
  mandatoryLaunchRisk: number;
  leaderScore: number;
  collapseRisk: boolean;
  collapseTurn: number | null;
  emergencyReasons: readonly string[];
}>;

type AiStrategicStateRead = Readonly<{
  factionId: FactionId;
  phase: AiStrategicPhase;
  resources: readonly AiTritiumNodeModel[];
  own: AiFactionStrategicRead;
  factions: readonly AiFactionStrategicRead[];
  leader: AiFactionStrategicRead | null;
  emergencyMode: boolean;
}>;

export type FactionRecoveryKnownThreat = Readonly<{
  kind: "missile" | "upkeep" | "mandatory-launch";
  id: string;
  eventTurn: number;
  nodeId?: string;
  currentDv: number;
  projectedDvAtEvent: number;
  cost: number;
  status: "safe" | "unsafe" | "irrelevant";
  reason: string;
}>;

export type FactionRecoveryTritiumAudit = Readonly<{
  nodeId: string;
  viaNodeId: string;
  firstPossibleWorkTurn: number;
  fromTurnOffset: number;
  survivesKnownThreats: boolean;
  unresolved: boolean;
  contestedRecovery: boolean;
  recoveryStatus: "stable" | "unresolved-contested-recovery" | "forced-dead";
  reason: string;
  projectedDvAtArrival?: number;
  projectedDvAfterOneUpkeep?: number;
  legalExits?: number;
  hostileMissiles?: number;
}>;

export type FactionRecoveryPath = Readonly<{
  factionId: FactionId;
  currentDv: number;
  projectedDvByTurn: readonly number[];
  projectedIncomeByTurn: readonly number[];
  projectedUpkeepByTurn: readonly number[];
  committedCostsByTurn: readonly number[];
  projectedDvAtHorizon: number;
  knownThreats: readonly FactionRecoveryKnownThreat[];
  countedTritium: readonly FactionRecoveryTritiumAudit[];
  unresolvedTritium: readonly FactionRecoveryTritiumAudit[];
  rejectedTritium: readonly FactionRecoveryTritiumAudit[];
  reachableTritiumNodes: number;
  pendingRecoveryTransitBlocksVictory: boolean;
  collapseStatus: FactionCollapseStatus;
  collapseReason: string;
  canRecoverIndefiniteTritium: boolean;
  reasonCodes: readonly string[];
}>;

type AiSolvencyTritiumCountAudit = Readonly<{
  nodeId: string;
  viaNodeId: string;
  fromTurnOffset: number;
  survivesKnownThreats: boolean;
  unresolved: boolean;
  contestedRecovery: boolean;
  recoveryStatus: "stable" | "unresolved-contested-recovery" | "forced-dead";
  reason: string;
  projectedDvAtArrival?: number;
  projectedDvAfterOneUpkeep?: number;
  legalExits?: number;
  hostileMissiles?: number;
}>;

type AiKnownThreatSurvival = Readonly<{
  survivesKnownThreats: boolean;
  unresolved: boolean;
  contestedRecovery: boolean;
  recoveryStatus: "stable" | "unresolved-contested-recovery" | "forced-dead";
  reason: string;
  projectedDvAtArrival?: number;
  projectedDvAfterOneUpkeep?: number;
  legalExits?: number;
  hostileMissiles?: number;
}>;

type AiInsolvencyGuardProjection = Readonly<{
  currentDv: number;
  projectedDvAfterAction: number;
  projectedIncome: number;
  projectedUpkeep: number;
  requiredEvadeReserve: number;
  mandatoryLaunchReserve: number;
  projectedDvAtHorizon: number;
  reachableFallbackTritium: boolean;
  decisiveDamage: boolean;
}>;

type AiFallbackReservation = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  burnCost: number;
  etaTurns: number;
}>;

type AiActionSolvencyForecast = Readonly<{
  action: "BURN" | "FIRE" | "EVADE" | "LEAVE_CONTESTED" | "STAY_CONTESTED" | "WORK";
  horizonTurns: number;
  currentDv: number;
  projectedDvAfterAction: number;
  projectedDvByTurn: readonly number[];
  minProjectedDv: number;
  finalProjectedDv: number;
  sustainableTritiumCount: number;
  fallback: AiFallbackReservation | null;
  fallbackCost: number;
  nextContestedUpkeep: number;
  predictableEvadeCost: number;
  requiredReserve: number;
  hasIndependentTritiumAfterAction: boolean;
  projectedInsolvency: boolean;
  fallbackUnavailable: boolean;
  reason: string | null;
}>;

type AiSolvencyReserveCheck = Readonly<{
  reason: string | null;
  currentDv: number;
  projectedDvAfterAction: number;
  projectedIncome: number;
  upkeepReserve: number;
  evadeReserve: number;
  mandatoryLaunchReserve: number;
  minimumReserve: number;
  expectedContestedShips: number;
  hasLikelyFireThreat: boolean;
  hasFallbackTritium: boolean;
  decisiveException: boolean;
}>;

type AiFireRejectionOptions = Readonly<{
  originNodeId?: string;
  impactTurn?: number;
}>;

type AiSecondTritiumContext = Readonly<{
  aiSecuredTritiumCount: number;
  aiProjectedTritiumCount: number;
  strongestEnemyProjectedTritiumCount: number;
  humanProjectedTritiumCount: number;
  humanSecondTritiumMoves: readonly (PendingBurnOrder | ActiveBurnTransit)[];
  secondTritiumRequired: boolean;
  tritiumEmergency: boolean;
  hasSafeFallbackTritium: boolean;
}>;

export function createInitialGameState(overrides: Partial<GameState> = {}): GameState {
  const gameMode: GameModeId = overrides.gameMode ?? defaultGameMode;
  const factions: readonly FactionIdentity[] =
    overrides.factions ?? createDefaultFactionIdentities(gameMode);

  return {
    turn: overrides.turn ?? 0,
    gameMode,
    factions,
    factionDv: overrides.factionDv ?? createFactionDvReserve(factions),
    nodeOccupancies: overrides.nodeOccupancies ?? defaultInitialOccupancies,
    shipyardProgress: overrides.shipyardProgress ?? [],
    mandatoryLaunches: overrides.mandatoryLaunches ?? [],
    pendingBurnOrders: overrides.pendingBurnOrders ?? [],
    pendingFireOrders: overrides.pendingFireOrders ?? [],
    activeBurnTransits: overrides.activeBurnTransits ?? [],
    activeMissiles: overrides.activeMissiles ?? [],
    debugEvents: overrides.debugEvents ?? []
  };
}

export function validateFactionEconomy(state: GameState, factionId: FactionId): readonly string[] {
  const reserve = getFactionDv(state, factionId);

  if (!Number.isFinite(reserve)) {
    return [`${factionId} ΔV is not finite.`];
  }

  return reserve < 0 ? [`${factionId} ΔV is negative.`] : [];
}

export function validateShipReferences(state: GameState): readonly string[] {
  return [
    ...validateNoDeadShipsInState(state),
    ...validateMissileTargets(state),
    ...state.pendingBurnOrders
      .filter((order) => !hasFactionShipAtNode(state, order.originNodeId, order.factionId))
      .map((order) => `Pending BURN ${order.id} has no ship at origin.`),
    ...state.pendingFireOrders
      .filter((order) => !hasFactionShipAtNode(state, order.originNodeId, order.factionId))
      .map((order) => `Pending FIRE ${order.id} has no ship at origin.`)
  ];
}

export function validateOneActionPerShip(state: GameState): readonly string[] {
  const actionKeys = new Set<string>();
  const errors: string[] = [];

  for (const order of [...state.pendingBurnOrders, ...state.pendingFireOrders]) {
    const key = createNodeFactionKey(order.originNodeId, order.factionId);

    if (actionKeys.has(key)) {
      errors.push(`Multiple pending actions for ${key}.`);
      continue;
    }

    actionKeys.add(key);
  }

  return errors;
}

export function validateNoNegativeDV(state: GameState): readonly string[] {
  return getActiveFactionIds(state).flatMap((factionId) =>
    validateFactionEconomy(state, factionId)
  );
}

export function validateNoDeadShipsInState(state: GameState): readonly string[] {
  return state.nodeOccupancies
    .filter((occupancy) => occupancy.shipCount <= 0)
    .map(
      (occupancy) => `Dead ship occupancy remains at ${occupancy.nodeId}:${occupancy.factionId}.`
    );
}

export function validateContestedState(state: GameState): readonly string[] {
  const errors: string[] = [];
  const nodeIds = new Set(state.nodeOccupancies.map((occupancy) => occupancy.nodeId));

  for (const nodeId of nodeIds) {
    const contestedFactions = getContestingFactionIds(state.nodeOccupancies, nodeId);

    for (const factionId of contestedFactions) {
      const occupancy = state.nodeOccupancies.find((candidate) => {
        return candidate.nodeId === nodeId && candidate.factionId === factionId;
      });

      if ((occupancy?.shipCount ?? 0) > 1) {
        errors.push(`Contested node ${nodeId} stacks ${factionId} ships.`);
      }
    }
  }

  return errors;
}

export function validateNoNonContestedSameFactionStacks(state: GameState): readonly string[] {
  return getNonContestedNodeStackingViolations(state).map((violation) => {
    return [
      `Non-contested node ${violation.nodeId} stacks ${violation.shipCount}`,
      `${violation.factionId} ships`,
      `(allowed ${violation.allowedShipCount}).`
    ].join(" ");
  });
}

export function validateMissileTargets(state: GameState): readonly string[] {
  return [
    ...state.pendingFireOrders.filter((missile) => {
      return !hasMissileTargetReference(state, missile.targetNodeId, missile.targetFactionId);
    }),
    ...state.activeMissiles.filter((missile) => {
      return (
        missile.impactTurn <= state.turn &&
        !hasMissileTargetReference(state, missile.targetNodeId, missile.targetFactionId)
      );
    })
  ].map((missile) => `Missile ${missile.id} has no target reference.`);
}

export function dumpTurnState(content: SimulationContent, state: GameState) {
  const occupiedTritiumNodes = content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => state.nodeOccupancies.some((occupancy) => occupancy.nodeId === node.id))
    .map((node) => node.id);
  const occupiedShipyards = content.nodes
    .filter((node) => node.type === "shipyard")
    .filter((node) => state.nodeOccupancies.some((occupancy) => occupancy.nodeId === node.id))
    .map((node) => node.id);

  return {
    turn: state.turn,
    gameMode: state.gameMode,
    factionDv: state.factionDv,
    dvIncomeThisTurn: sumDebugAmounts(state.debugEvents, "TRITIUM_INCOME"),
    shipsPerFaction: Object.fromEntries(
      getActiveFactionIds(state).map((factionId) => [
        factionId,
        countFactionShips(state, factionId)
      ])
    ),
    shipsInTransit: state.activeBurnTransits.length,
    missilesInFlight: state.activeMissiles.length,
    contestedNodes: getContestedNodeIds(state.nodeOccupancies),
    occupiedTritiumNodes,
    occupiedShipyards,
    shipyardProgressByNode: Object.fromEntries(
      state.shipyardProgress.map((entry) => [
        entry.nodeId,
        `${entry.progress}/${shipyardCompletionProgress}`
      ])
    ),
    lastAIActionPerShip: Object.fromEntries(
      state.debugEvents
        .filter((event) => event.type === "AI_DECISION" && event.nodeId !== undefined)
        .map((event) => [
          createNodeFactionKey(event.nodeId ?? "", event.factionId ?? "opponent"),
          event.message
        ])
    )
  };
}

export function runAITestTurns(
  content: SimulationContent,
  turnCount: number,
  initialState: GameState = createInitialGameState()
): Readonly<{
  state: GameState;
  errors: readonly string[];
  debugEvents: readonly TurnDebugEvent[];
}> {
  let state = initialState;
  const errors: string[] = [];
  const debugEvents: TurnDebugEvent[] = [];

  for (let index = 0; index < turnCount; index += 1) {
    state = applyCommand(state, { type: "ADVANCE_TURN" }, content);
    debugEvents.push(...state.debugEvents);
    errors.push(
      ...validateNoNegativeDV(state),
      ...validateShipReferences(state),
      ...validateOneActionPerShip(state),
      ...validateNoDeadShipsInState(state),
      ...validateContestedState(state),
      ...validateNoNonContestedSameFactionStacks(state),
      ...validateMissileTargets(state)
    );

    if (
      state.mandatoryLaunches.some((launch) => {
        return getFactionIdentity(state, launch.factionId).controlType === "human";
      })
    ) {
      break;
    }
  }

  return { state, errors, debugEvents };
}

export function runAiVsAiDebugSimulation(
  content: SimulationContent,
  initialState: GameState,
  turnCount = 40,
  aiPlanningOptions: AiPlanningOptions = {}
): AiDebugSimulationResult {
  const activeFactionIds = getActiveFactionIds(initialState);
  const run = runAiVsAiSimulation(content, {
    name: "AI vs AI 40T",
    turnCount,
    initialFactionOrder: activeFactionIds,
    initialState,
    aiPlanningOptions
  });

  const report = createAiVsAiReport(content, {
    initialState: run.initialState,
    state: run.state,
    debugEvents: run.debugEvents,
    dvHistory: run.dvHistory,
    stateHistory: run.stateHistory,
    errors: run.errors,
    majorEvents: run.majorEvents,
    turnsSimulated: run.turnsSimulated,
    reasonEnded: run.reasonEnded
  });

  return {
    state: run.state,
    debugEvents: run.debugEvents,
    stateHistory: run.stateHistory,
    dvHistory: run.dvHistory,
    telemetry: createSimulationTelemetry(
      content,
      run.initialState,
      run.stateHistory,
      run.debugEvents
    ),
    report,
    errors: run.errors,
    turnsSimulated: run.turnsSimulated,
    reasonEnded: run.reasonEnded
  };
}

export function runFireVsAiDebugSimulation(
  content: SimulationContent,
  initialState: GameState,
  turnCount = 40,
  aiPlanningOptions: AiPlanningOptions = {}
): AiDebugSimulationResult {
  const fireVsAiPlanningOptions = getFireVsAiPlanningOptions(aiPlanningOptions);
  const activeFactionIds = getActiveFactionIds(initialState);
  const run = runAiVsAiSimulation(content, {
    name: "FIREvsAI",
    turnCount,
    initialFactionOrder: activeFactionIds,
    initialState,
    aiPlanningOptions: fireVsAiPlanningOptions
  });

  return {
    state: run.state,
    debugEvents: run.debugEvents,
    stateHistory: run.stateHistory,
    dvHistory: run.dvHistory,
    telemetry: createSimulationTelemetry(
      content,
      run.initialState,
      run.stateHistory,
      run.debugEvents
    ),
    report: createFireVsAiReport(content, run, fireVsAiPlanningOptions),
    errors: run.errors,
    turnsSimulated: run.turnsSimulated,
    reasonEnded: run.reasonEnded
  };
}

function getFireVsAiPlanningOptions(options: AiPlanningOptions): AiPlanningOptions {
  return {
    ...options,
    factionStrategyProfiles: {
      ...options.factionStrategyProfiles,
      player: "FIRE",
      opponent: "NOFIRE"
    }
  };
}

export function runAIVsAIDiagnostics40T(
  content: SimulationContent,
  initialState: GameState,
  turnCount = 40,
  aiPlanningOptions: AiPlanningOptions = {}
): AiDiagnosticsResult {
  const normalState = createInitialGameState({
    nodeOccupancies: cloneGameState(initialState).nodeOccupancies
  });
  const swappedState = createInitialGameState({
    nodeOccupancies: normalState.nodeOccupancies.map((occupancy) => ({
      ...occupancy,
      factionId: getOpposingFactionId(occupancy.factionId)
    }))
  });
  const runs = [
    runAiVsAiSimulation(content, {
      name: "1. Normal start",
      turnCount,
      initialFactionOrder: ["player", "opponent"],
      initialState: normalState,
      aiPlanningOptions
    }),
    runAiVsAiSimulation(content, {
      name: "2. Swapped start",
      turnCount,
      initialFactionOrder: ["player", "opponent"],
      initialState: swappedState,
      aiPlanningOptions
    }),
    runAiVsAiSimulation(content, {
      name: "3. Normal start, reversed initial faction order",
      turnCount,
      initialFactionOrder: ["opponent", "player"],
      initialState: normalState,
      aiPlanningOptions
    }),
    runAiVsAiSimulation(content, {
      name: "4. Swapped start, reversed initial faction order",
      turnCount,
      initialFactionOrder: ["opponent", "player"],
      initialState: swappedState,
      aiPlanningOptions
    })
  ] as const;

  return {
    report: createAiVsAiDiagnosticsReport(content, runs),
    errors: runs.flatMap((run) => run.errors)
  };
}

export function runAiVsAiRegressionSimulations(
  content: SimulationContent,
  initialState: GameState,
  turnCount = 60,
  aiPlanningOptions: AiPlanningOptions = {}
): AiVsAiRegressionResult {
  const normalState = createInitialGameState(cloneGameState(initialState));
  const swappedState = createInitialGameState({
    ...cloneGameState(initialState),
    nodeOccupancies: initialState.nodeOccupancies.map((occupancy) => ({
      ...occupancy,
      factionId: getOpposingFactionId(occupancy.factionId)
    }))
  });
  const runs = [
    runAiVsAiSimulation(content, {
      name: "normal",
      turnCount,
      initialFactionOrder: ["player", "opponent"],
      initialState: normalState,
      aiPlanningOptions
    }),
    runAiVsAiSimulation(content, {
      name: "swapped",
      turnCount,
      initialFactionOrder: ["player", "opponent"],
      initialState: swappedState,
      aiPlanningOptions
    }),
    runAiVsAiSimulation(content, {
      name: "normal-reversed-order",
      turnCount,
      initialFactionOrder: ["opponent", "player"],
      initialState: normalState,
      aiPlanningOptions
    }),
    runAiVsAiSimulation(content, {
      name: "swapped-reversed-order",
      turnCount,
      initialFactionOrder: ["opponent", "player"],
      initialState: swappedState,
      aiPlanningOptions
    })
  ] as const;
  const analyses = runs.map((run) => analyzeAiVsAiRegressionRun(content, run));
  const matchDurationDistribution = analyses.reduce<Record<string, number>>((distribution, run) => {
    const bucket = run.decisiveTurn === null ? `>${turnCount}` : `T${run.decisiveTurn}`;
    distribution[bucket] = (distribution[bucket] ?? 0) + 1;
    return distribution;
  }, {});
  const earlyVictoriesByTurn10 = analyses.filter((run) => {
    return run.decisiveTurn !== null && run.decisiveTurn <= 10;
  }).length;
  const multiShipNoTritiumRecoveryLosses = analyses.flatMap(
    (run) => run.multiShipNoTritiumRecoveryLosses
  );

  return {
    report: createAiVsAiRegressionReport(
      turnCount,
      analyses,
      matchDurationDistribution,
      earlyVictoriesByTurn10
    ),
    errors: runs.flatMap((run) => run.errors),
    matchDurationDistribution,
    earlyVictoriesByTurn10,
    multiShipNoTritiumRecoveryLosses
  };
}

function runAiVsAiSimulation(
  content: SimulationContent,
  options: AiVsAiSimulationOptions
): AiVsAiSimulationRun {
  let state = createInitialGameState(cloneGameState(options.initialState));
  let turnsSimulated = 0;
  let reasonEnded = `${options.turnCount} turns completed`;
  const errors: string[] = [];
  const debugEvents: TurnDebugEvent[] = [];
  const majorEvents: string[] = [];
  const stateHistory: GameState[] = [cloneGameState(state)];
  const dvHistory: Record<string, number[]> = createFactionNumberArrays(getActiveFactionIds(state));

  for (let index = 0; index < options.turnCount; index += 1) {
    const previousState = state;
    const aiPlanningOrder = getAlternatingAiPlanningOrder(
      options.initialFactionOrder,
      turnsSimulated
    );
    state = advanceTurn(state, content, aiPlanningOrder, options.aiPlanningOptions);
    turnsSimulated += 1;
    for (const factionId of getActiveFactionIds(state)) {
      dvHistory[factionId] ??= [];
      dvHistory[factionId].push(getFactionDv(state, factionId));
    }
    debugEvents.push(...state.debugEvents);
    majorEvents.push(...getSyntheticMajorEvents(content, previousState, state));
    majorEvents.push(...state.debugEvents.map((event) => formatMajorDebugEvent(content, event)));
    stateHistory.push(cloneGameState(state));

    const turnErrors = collectValidationErrors(state);

    if (turnErrors.length > 0) {
      errors.push(...turnErrors.map((error) => `T${state.turn}: ${error}`));
      reasonEnded = "validation failed";
      break;
    }
  }

  return {
    name: options.name,
    initialState: cloneGameState(options.initialState),
    initialFactionOrder: options.initialFactionOrder,
    state,
    debugEvents,
    dvHistory,
    stateHistory,
    majorEvents,
    errors,
    turnsSimulated,
    reasonEnded
  };
}

function getAlternatingAiPlanningOrder(
  initialFactionOrder: readonly FactionId[],
  turnIndex: number
): readonly FactionId[] {
  return turnIndex % 2 === 0 ? initialFactionOrder : [...initialFactionOrder].reverse();
}

function analyzeAiVsAiRegressionRun(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): AiVsAiRegressionRunAnalysis {
  const factionIds = getActiveFactionIds(run.initialState);
  let decisiveTurn: number | null = null;
  let winnerFactionId: FactionId | null = null;
  const multiShipNoTritiumRecoveryLosses: string[] = [];

  for (const state of run.stateHistory) {
    const recoveryByFactionId = new Map(
      factionIds.map((factionId) => [
        factionId,
        evaluateFactionRecoveryPath(content, state, factionId)
      ])
    );
    const viableFactionIds = factionIds.filter((factionId) => {
      return recoveryByFactionId.get(factionId)?.canRecoverIndefiniteTritium === true;
    });

    if (decisiveTurn === null && viableFactionIds.length === 1) {
      decisiveTurn = state.turn;
      winnerFactionId = viableFactionIds[0] ?? null;
      for (const factionId of factionIds) {
        if (factionId === winnerFactionId) {
          continue;
        }

        const recovery = recoveryByFactionId.get(factionId);
        const shipCount = countFactionShips(state, factionId);

        if (shipCount > 1 && recovery?.canRecoverIndefiniteTritium === false) {
          multiShipNoTritiumRecoveryLosses.push(
            `${run.name}: ${factionId} at T${state.turn} with ${shipCount} ships; ${recovery.collapseReason}`
          );
        }
      }
    }
  }

  return {
    name: run.name,
    decisiveTurn,
    winnerFactionId,
    multiShipNoTritiumRecoveryLosses
  };
}

function createAiVsAiRegressionReport(
  turnCount: number,
  analyses: readonly AiVsAiRegressionRunAnalysis[],
  matchDurationDistribution: Readonly<Record<string, number>>,
  earlyVictoriesByTurn10: number
): string {
  return [
    "DeltaV AI-vs-AI Tritium Regression Report",
    `Runs: ${analyses.length}; horizon: ${turnCount} turns`,
    `Match-duration distribution: ${
      Object.entries(matchDurationDistribution)
        .sort((first, second) => first[0].localeCompare(second[0], undefined, { numeric: true }))
        .map(([bucket, count]) => `${bucket}=${count}`)
        .join(", ") || "-"
    }`,
    `Early victories by turn 10: ${earlyVictoriesByTurn10}/${analyses.length}`,
    "Per-run decisive tritium viability:",
    ...analyses.map((run) => {
      return `- ${run.name}: ${
        run.decisiveTurn === null
          ? `no sole viable faction by T${turnCount}`
          : `T${run.decisiveTurn} winner ${run.winnerFactionId ?? "-"}`
      }`;
    }),
    "Multiple ships but no tritium recovery path:",
    ...analyses.flatMap((run) => run.multiShipNoTritiumRecoveryLosses).map((loss) => `- ${loss}`),
    ...(analyses.every((run) => run.multiShipNoTritiumRecoveryLosses.length === 0)
      ? ["- none"]
      : [])
  ].join("\n");
}

function collectValidationErrors(state: GameState): readonly string[] {
  return [
    ...validateNoNegativeDV(state),
    ...validateOneActionPerShip(state),
    ...validateShipReferences(state),
    ...validateNoDeadShipsInState(state),
    ...validateContestedState(state),
    ...validateNoNonContestedSameFactionStacks(state),
    ...validateMissileTargets(state)
  ];
}

function cloneGameState(state: GameState): GameState {
  return {
    turn: state.turn,
    gameMode: state.gameMode,
    factions: state.factions.map((faction) => ({ ...faction })),
    factionDv: { ...state.factionDv },
    nodeOccupancies: state.nodeOccupancies.map((occupancy) => ({ ...occupancy })),
    shipyardProgress: state.shipyardProgress.map((progress) => ({ ...progress })),
    mandatoryLaunches: state.mandatoryLaunches.map((launch) => ({ ...launch })),
    pendingBurnOrders: state.pendingBurnOrders.map((order) => ({ ...order })),
    pendingFireOrders: state.pendingFireOrders.map((order) => ({ ...order })),
    activeBurnTransits: state.activeBurnTransits.map((transit) => ({ ...transit })),
    activeMissiles: state.activeMissiles.map((missile) => ({ ...missile })),
    debugEvents: state.debugEvents.map((event) => ({ ...event }))
  };
}

function freezeGameStateSnapshot(state: GameState): GameState {
  freezeReadonlyObjectArray(state.factions);
  Object.freeze(state.factionDv);
  freezeReadonlyObjectArray(state.nodeOccupancies);
  freezeReadonlyObjectArray(state.shipyardProgress);
  freezeReadonlyObjectArray(state.mandatoryLaunches);
  freezeReadonlyObjectArray(state.pendingBurnOrders);
  freezeReadonlyObjectArray(state.pendingFireOrders);
  freezeReadonlyObjectArray(state.activeBurnTransits);
  freezeReadonlyObjectArray(state.activeMissiles);
  freezeReadonlyObjectArray(state.debugEvents);
  return Object.freeze(state);
}

function freezeReadonlyObjectArray<T extends object>(items: readonly T[]): void {
  for (const item of items) {
    Object.freeze(item);
  }

  Object.freeze(items);
}

function createEmptyTurnPlanningAudit(state: GameState): TurnPlanningAudit {
  const snapshotHash = hashGameStateForAudit(state);
  const factionIds = getActiveFactionIds(state);

  return {
    preTurnSnapshotHash: snapshotHash,
    plannerSnapshotHashes: {},
    sameSnapshotUsed: true,
    stateMutatedDuringPlanning: false,
    ordersCollected: createFactionNumberRecord(factionIds),
    ordersRejected: createFactionNumberRecord(factionIds),
    conflictsDetected: [],
    conflictResolutionReasons: []
  };
}

function createFactionNumberRecord(
  factionIds: readonly FactionId[],
  initialValue = 0
): Record<string, number> {
  return Object.fromEntries(factionIds.map((factionId) => [factionId, initialValue]));
}

function createFactionNumberArrays(factionIds: readonly FactionId[]): Record<string, number[]> {
  return Object.fromEntries(factionIds.map((factionId) => [factionId, []]));
}

function hashGameStateForAudit(state: GameState): string {
  const normalized = normalizeGameStateForComparison(state);
  return hashTelemetryValue(normalized);
}

function hashTelemetryValue(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function createMapGameplayHash(content: SimulationContent, initialState: GameState): string {
  const nodeIds = content.nodes.map((node) => node.id).sort();
  const burnMatrix = nodeIds.map((originNodeId) => {
    return nodeIds.map((destinationNodeId) => {
      const plan = calculateBurnPlan(content, initialState.turn, originNodeId, destinationNodeId);

      return {
        originNodeId,
        destinationNodeId,
        cost: plan?.burnCost ?? null,
        etaTurns: plan?.etaTurns ?? null
      };
    });
  });
  const fireMatrix = nodeIds.map((originNodeId) => {
    return nodeIds.map((destinationNodeId) => {
      const plan = calculateFirePlan(content, initialState.turn, originNodeId, destinationNodeId);

      return {
        originNodeId,
        destinationNodeId,
        cost: plan === null ? null : 0,
        etaTurns: plan?.missileEtaTurns ?? null
      };
    });
  });

  return hashTelemetryValue({
    sampleTurn: initialState.turn,
    nodes: [...content.nodes]
      .sort((first, second) => first.id.localeCompare(second.id))
      .map((node) => ({
        id: node.id,
        bodyId: node.bodyId,
        type: node.type,
        controllable: node.controllable,
        contestable: node.contestable,
        protectedNoWar: node.protectedNoWar,
        producesTritium: node.producesTritium,
        allowsShipyard: node.allowsShipyard,
        weaponsOffline: node.weaponsOffline,
        gravityWell: node.gravityWell,
        nodeOrbitRadius: node.nodeOrbitRadius
      })),
    starters: {
      factions: [...initialState.factions]
        .sort((first, second) => first.id.localeCompare(second.id))
        .map((faction) => ({ id: faction.id, controlType: faction.controlType })),
      nodeOccupancies: [...initialState.nodeOccupancies].sort(compareOccupancies)
    },
    resources: {
      factionDv: Object.fromEntries(
        Object.entries(initialState.factionDv).sort(([first], [second]) =>
          first.localeCompare(second)
        )
      ),
      shipyardProgress: [...initialState.shipyardProgress].sort((first, second) =>
        first.nodeId.localeCompare(second.nodeId)
      ),
      mandatoryLaunches: [...initialState.mandatoryLaunches].sort(compareMandatoryLaunches),
      tritiumWorkOutput,
      shipyardCompletionProgress,
      contestedUpkeepDvCost,
      contestedLeaveDvCost,
      automaticEvadeDvCost,
      fireDvCost: 0
    },
    burnMatrix,
    fireMatrix
  });
}

export function createTrajectoryHash(
  stateHistory: readonly GameState[],
  debugEvents: readonly TurnDebugEvent[]
): string {
  const actionsByTurn = new Map<number, ReturnType<typeof normalizeTrajectoryActionEvent>[]>();

  for (const event of debugEvents) {
    if (!isTrajectoryActionEvent(event)) {
      continue;
    }

    actionsByTurn.set(event.turn, [
      ...(actionsByTurn.get(event.turn) ?? []),
      normalizeTrajectoryActionEvent(event)
    ]);
  }

  return hashTelemetryValue(
    stateHistory.map((state) => ({
      state: normalizeGameStateForComparison(state),
      actions: actionsByTurn.get(state.turn) ?? []
    }))
  );
}

export function createSimulationTelemetry(
  content: SimulationContent,
  initialState: GameState,
  stateHistory: readonly GameState[],
  debugEvents: readonly TurnDebugEvent[]
): SimulationTelemetry {
  const factionIds = getActiveFactionIds(initialState);
  const collapseTurnsByFaction: Partial<Record<FactionId, number>> = {};
  let victoryTurn: number | null = null;
  let winnerFactionId: FactionId | null = null;

  for (const state of stateHistory) {
    const recoveryByFaction = new Map(
      factionIds.map((factionId) => [
        factionId,
        evaluateFactionRecoveryPath(content, state, factionId)
      ])
    );

    for (const factionId of factionIds) {
      if (
        collapseTurnsByFaction[factionId] === undefined &&
        recoveryByFaction.get(factionId)?.collapseStatus === "forced"
      ) {
        collapseTurnsByFaction[factionId] = state.turn;
      }
    }

    if (victoryTurn === null) {
      const viableFactionIds = factionIds.filter((factionId) => {
        return recoveryByFaction.get(factionId)?.canRecoverIndefiniteTritium === true;
      });

      if (viableFactionIds.length === 1) {
        victoryTurn = state.turn;
        winnerFactionId = viableFactionIds[0] ?? null;
      }
    }
  }

  const collapseTurn = Object.values(collapseTurnsByFaction).reduce<number | null>(
    (earliest, turn) => (earliest === null || turn < earliest ? turn : earliest),
    null
  );
  const fireEntries = createEffectiveActionCostEntries(debugEvents, "FIRE_LAUNCHED");
  const evadeEntries = createEffectiveActionCostEntries(debugEvents, "EVADE");

  return {
    mapGameplayHash: createMapGameplayHash(content, initialState),
    trajectoryHash: createTrajectoryHash(stateHistory, debugEvents),
    collapseTurn,
    collapseTurnsByFaction,
    victoryTurn,
    winnerFactionId,
    effectiveCosts: {
      fire: {
        total: fireEntries.reduce((total, entry) => total + entry.cost, 0),
        entries: fireEntries
      },
      evade: {
        total: evadeEntries.reduce((total, entry) => total + entry.cost, 0),
        entries: evadeEntries
      }
    }
  };
}

function isTrajectoryActionEvent(event: TurnDebugEvent): boolean {
  return (
    event.type === "AI_DECISION" ||
    event.type === "BURN_DEPARTED" ||
    event.type === "FIRE_LAUNCHED" ||
    event.type === "EVADE" ||
    event.type === "TRITIUM_INCOME" ||
    event.type === "SHIPYARD_PROGRESS" ||
    event.type === "CONTESTED_UPKEEP_PAID" ||
    event.type === "CONTESTED_UPKEEP_FAILED" ||
    event.type === "MANDATORY_LAUNCH" ||
    event.type === "MANDATORY_LAUNCH_DESTROYED" ||
    event.type === "SHIP_PRODUCED"
  );
}

function normalizeTrajectoryActionEvent(event: TurnDebugEvent) {
  return {
    turn: event.turn,
    type: event.type,
    factionId: event.factionId ?? null,
    nodeId: event.nodeId ?? null,
    action: event.action ?? null,
    originNodeId: event.originNodeId ?? null,
    destinationNodeId: event.destinationNodeId ?? null,
    targetNodeId: event.targetNodeId ?? null,
    targetFactionId: event.targetFactionId ?? null,
    amount: event.amount ?? null,
    burnCost: event.burnCost ?? null,
    etaTurns: event.etaTurns ?? null,
    missileEtaTurns: event.missileEtaTurns ?? null
  };
}

function createEffectiveActionCostEntries(
  debugEvents: readonly TurnDebugEvent[],
  type: "FIRE_LAUNCHED" | "EVADE"
): readonly EffectiveActionCostTelemetryEntry[] {
  return debugEvents
    .filter((event) => event.type === type && event.factionId !== undefined)
    .map((event) => ({
      turn: event.turn,
      factionId: event.factionId ?? defaultPlayerFactionId,
      nodeId: event.nodeId ?? "",
      ...(event.targetNodeId === undefined ? {} : { targetNodeId: event.targetNodeId }),
      cost: type === "FIRE_LAUNCHED" ? 0 : Math.abs(event.amount ?? automaticEvadeDvCost)
    }));
}

function normalizeGameStateForComparison(state: GameState) {
  return {
    turn: state.turn,
    factionDv: state.factionDv,
    nodeOccupancies: [...state.nodeOccupancies].sort(compareOccupancies),
    shipyardProgress: [...state.shipyardProgress].sort((first, second) => {
      return first.nodeId.localeCompare(second.nodeId);
    }),
    mandatoryLaunches: [...state.mandatoryLaunches].sort(compareMandatoryLaunches),
    pendingBurnOrders: sortPendingBurnOrdersNeutral(state.pendingBurnOrders),
    pendingFireOrders: sortPendingFireOrdersNeutral(state.pendingFireOrders),
    activeBurnTransits: sortPendingBurnOrdersNeutral(state.activeBurnTransits),
    activeMissiles: sortActiveMissilesNeutral(state.activeMissiles)
  };
}

function createSimultaneousTurnAuditEvent(
  audit: TurnPlanningAudit,
  turn: number,
  postTurnStateHash: string
): TurnDebugEvent {
  return {
    turn,
    type: "SIMULTANEOUS_TURN_AUDIT",
    message: [
      `pre-turn snapshot ${audit.preTurnSnapshotHash}`,
      `planner snapshots ${formatPlannerSnapshotHashes(audit.plannerSnapshotHashes)}`,
      `same snapshot used ${formatYesNo(audit.sameSnapshotUsed)}`,
      `state mutated during planning ${formatYesNo(audit.stateMutatedDuringPlanning)}`,
      `orders collected ${formatFactionCounts(audit.ordersCollected)}`,
      `orders rejected ${formatFactionCounts(audit.ordersRejected)}`,
      `conflicts ${formatAuditList(audit.conflictsDetected)}`,
      `conflict resolutions ${formatAuditList(audit.conflictResolutionReasons)}`,
      `post-turn state ${postTurnStateHash}`
    ].join("; "),
    reason:
      audit.sameSnapshotUsed && !audit.stateMutatedDuringPlanning ? "snapshot-ok" : "snapshot-error"
  };
}

function formatPlannerSnapshotHashes(hashes: Readonly<Partial<Record<FactionId, string>>>): string {
  return Object.entries(hashes)
    .map(([factionId, hash]) => `${factionId} ${hash ?? "-"}`)
    .join(", ");
}

function formatAuditList(values: readonly string[]): string {
  return values.length === 0 ? "-" : values.join(" | ");
}

function formatFactionPlannerList(factionIds: readonly FactionId[]): string {
  return factionIds.map((factionId) => `${factionId} ${AI_PLANNER_NAME}`).join(", ");
}

function createAiVsAiReport(
  content: SimulationContent,
  result: Readonly<{
    initialState: GameState;
    state: GameState;
    debugEvents: readonly TurnDebugEvent[];
    dvHistory: Readonly<Record<string, readonly number[]>>;
    stateHistory: readonly GameState[];
    errors: readonly string[];
    majorEvents: readonly string[];
    turnsSimulated: number;
    reasonEnded: string;
  }>
): string {
  const dump = dumpTurnState(content, result.state);
  const factionIds = getActiveFactionIds(result.initialState);
  const lines = [
    "DeltaV AI vs AI 40T Debug Report",
    `Turns simulated: ${result.turnsSimulated}`,
    `Reason ended: ${result.reasonEnded}`,
    `Validation: ${result.errors.length === 0 ? "OK" : "FAILED"}`,
    `Mode: ${result.initialState.gameMode}`,
    `Planner: ${formatFactionPlannerList(factionIds)}`,
    `Planner parity: all active factions use the same legal planner; AI-vs-AI alternates planning order and divergence comes from positions plus rejected candidate counts below.`,
    "Simultaneous turn audit:",
    ...formatTurnAuditDetails(result.debugEvents),
    ...factionIds.map((factionId) => {
      return `Effective start setup ${factionId}: ${formatFactionStartSetup(content, result.initialState, factionId)}`;
    }),
    `Final ΔV: ${formatFactionCountsForFactions(result.state.factionDv, factionIds)}`,
    `Turns at 0 ΔV: ${formatFactionCountsForFactions(countZeroDvTurns(result.dvHistory), factionIds)}`,
    `Lowest ΔV reached: ${formatFactionCountsForFactions(getLowestDvByFaction(result.dvHistory), factionIds)}`,
    `Average ΔV: ${formatFactionAveragesForFactions(getAverageDvByFaction(result.dvHistory), factionIds)}`,
    `Ships remaining: ${formatFactionCountsForFactions(dump.shipsPerFaction, factionIds)}`,
    `Ships destroyed: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "SHIP_DESTROYED"), factionIds)}`,
    `Missiles fired: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "FIRE_LAUNCHED"), factionIds)}`,
    `Missile hits: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "MISSILE_IMPACT"), factionIds)}`,
    `Missile evades: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "EVADE"), factionIds)}`,
    `Burn actions: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "BURN_DEPARTED"), factionIds)}`,
    `FIRE actions: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "FIRE_LAUNCHED"), factionIds)}`,
    `Evade actions: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "EVADE"), factionIds)}`,
    `Tritium Work turns: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "TRITIUM_INCOME"), factionIds)}`,
    `Shipyard Work turns: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "SHIPYARD_PROGRESS"), factionIds)}`,
    `Ships produced: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "SHIP_PRODUCED"), factionIds)}`,
    `Failed mandatory launches: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "MANDATORY_LAUNCH_DESTROYED"), factionIds)}`,
    `First tritium loss: ${formatFirstTritiumLosses(content, result.initialState, result.stateHistory, result.state, factionIds)}`,
    `Turns without tritium access: ${formatFactionCountsForFactions(countTurnsWithoutTritiumAccess(content, result.stateHistory), factionIds)}`,
    `Nearest affordable tritium at first tritium loss: ${formatNearestAffordableTritiumAtFirstLossFromHistory(content, result.initialState, result.stateHistory, result.state)}`,
    `Tritium fallback triggered: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "AI_TRITIUM_FALLBACK_TRIGGERED"))}`,
    `Tritium fallback assigned: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "AI_TRITIUM_FALLBACK_ASSIGNED"))}`,
    `Tritium fallback rejected reason counts: ${formatReasonCounts(countTritiumFallbackRejectedReasons(result.debugEvents))}`,
    `Reserve override used for tritium recovery: ${formatFactionCounts(countTritiumFallbackReserveOverrides(result.debugEvents))}`,
    "Tritium fallback details:",
    ...formatTritiumFallbackDetails(content, result.debugEvents),
    `Action considered counts: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "AI_CONSIDERED_ACTION"))}`,
    `Action rejected counts: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "AI_REJECTED_ACTION"))}`,
    `FIRE rejected reason counts: ${formatReasonCounts(countRejectedReasonsByAction(result.debugEvents, "FIRE"))}`,
    `Burn rejected reason counts: ${formatReasonCounts(countRejectedReasonsByAction(result.debugEvents, "BURN"))}`,
    `Contested entry rejected reason counts: ${formatReasonCounts(countContestedEntryRejectedReasons(result.debugEvents))}`,
    `Mandatory launch failure reasons: ${formatReasonCounts(countMandatoryLaunchFailureReasons(result.debugEvents))}`,
    `Contested events: ${result.majorEvents.filter((event) => event.includes("contested")).length}`,
    `Contested upkeep paid: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "CONTESTED_UPKEEP_PAID"))}`,
    `Contested upkeep failed: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "CONTESTED_UPKEEP_FAILED"))}`,
    `Max simultaneous contested ships: ${formatFactionCounts(getMaxSimultaneousContestedShips(result.stateHistory))}`,
    `Contested entries by node type: ${formatNestedFactionReasonCounts(countContestedEntriesByNodeType(content, result.stateHistory))}`,
    `Contested entries rejected due to upkeep budget: ${formatFactionCounts(countUpkeepBudgetContestedEntryRejections(result.debugEvents))}`,
    `Ships destroyed by contested upkeep failure by node type: ${formatNestedFactionReasonCounts(countContestedUpkeepFailuresByNodeType(content, result.debugEvents))}`,
    `Contested+FIRE combos considered: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "AI_COMBO_CONSIDERED"))}`,
    `Contested+FIRE combos executed: ${formatFactionCounts(countEventsByFaction(result.debugEvents, "AI_COMBO_EXECUTED"))}`,
    `Contested+FIRE combos rejected: ${formatReasonCounts(countComboRejectedReasons(result.debugEvents))}`,
    `Alpha Strike threats: ${formatFactionCountsForFactions(countEventsByFaction(result.debugEvents, "ALPHA_STRIKE_THREAT"), factionIds)}`,
    `Alpha Strike decisions: ${formatReasonCounts(countAlphaStrikeThreatReasons(result.debugEvents))}`,
    "Contested+FIRE combo details:",
    ...formatComboDetails(content, result.debugEvents),
    "Expansion path quality:",
    ...formatExpansionPathDiagnostics(content, {
      name: "AI vs AI 40T",
      initialState: result.initialState,
      initialFactionOrder: factionIds,
      state: result.state,
      debugEvents: result.debugEvents,
      dvHistory: result.dvHistory,
      stateHistory: result.stateHistory,
      majorEvents: result.majorEvents,
      errors: result.errors,
      turnsSimulated: result.turnsSimulated,
      reasonEnded: result.reasonEnded
    }).map((line) => `  ${line}`),
    "",
    "Final occupied productive nodes:",
    ...formatFinalProductiveNodes(content, result.state),
    "",
    "Final shipyard progress:",
    ...formatFinalShipyardProgress(result.state),
    "",
    "Validation errors or warnings:",
    ...(result.errors.length === 0 ? ["-"] : result.errors),
    "",
    "Major events:",
    ...formatMajorEvents(result.majorEvents)
  ];

  return lines.join("\n");
}

function createFireVsAiReport(
  content: SimulationContent,
  run: AiVsAiSimulationRun,
  aiPlanningOptions: AiPlanningOptions
): string {
  const factionIds = getActiveFactionIds(run.initialState);
  const winner = getEconomicWinner(content, run);
  const winnerLabel =
    winner.factionId === undefined
      ? "tie"
      : `${getFactionIdentity(run.initialState, winner.factionId).displayName} (${winner.factionId})`;
  const fireCounts = countEventsByFaction(run.debugEvents, "FIRE_LAUNCHED");
  const baseReport = createAiVsAiReport(content, {
    initialState: run.initialState,
    state: run.state,
    debugEvents: run.debugEvents,
    dvHistory: run.dvHistory,
    stateHistory: run.stateHistory,
    errors: run.errors,
    majorEvents: run.majorEvents,
    turnsSimulated: run.turnsSimulated,
    reasonEnded: run.reasonEnded
  });
  const lines = [
    "DeltaV FIREvsAI Debug Report",
    'gameMode: "FIREvsAI"',
    `strategyProfile: ${factionIds
      .map((factionId) => {
        const factionName = getFactionIdentity(run.initialState, factionId).displayName;
        return `${factionName}=${getAiStrategyProfile(aiPlanningOptions, factionId)}`;
      })
      .join(", ")}`,
    `FIRE count: ${factionIds
      .map((factionId) => {
        const factionName = getFactionIdentity(run.initialState, factionId).displayName;
        return `${factionName} ${fireCounts[factionId] ?? 0}`;
      })
      .join(", ")}`,
    `outcome: ${run.reasonEnded}`,
    `winner: ${winnerLabel}`,
    "",
    baseReport
  ];

  return lines.join("\n");
}

function createAiVsAiDiagnosticsReport(
  content: SimulationContent,
  runs: readonly AiVsAiSimulationRun[]
): string {
  const likelyCauses = inferLikelyCauses(content, runs);
  const lines = [
    "DeltaV AI vs AI Swapped-Start Diagnostics 40T",
    `Planner: player ${AI_PLANNER_NAME}, opponent ${AI_PLANNER_NAME}`,
    "All runs use cloned initial states, validation after every turn, and alternating planning order.",
    "",
    "Compact Summary:",
    ...formatDiagnosticsCompactSummary(content, runs),
    "",
    "Order Bias Invariant:",
    ...formatOrderBiasInvariantReport(content, runs),
    "",
    "Likely Main Cause:",
    ...(likelyCauses.length === 0 ? ["- inconclusive"] : likelyCauses.map((cause) => `- ${cause}`)),
    "",
    "Starting Position Imbalance:",
    ...formatStartingPositionDiagnostics(
      content,
      runs[0]?.initialState ?? createInitialGameState()
    ),
    "",
    "Faction Label Bias Audit:",
    ...getFactionLabelBiasAuditLines(),
    "",
    "Resolution Order Bias Audit:",
    ...getResolutionOrderBiasAuditLines(),
    "",
    "Tie-Break Bias Audit:",
    ...getTieBreakBiasAuditLines(),
    "",
    "Per-Run Diagnostics:",
    ...runs.flatMap((run) => ["", ...formatDiagnosticsRun(content, run)])
  ];

  return lines.join("\n");
}

function formatDiagnosticsCompactSummary(
  content: SimulationContent,
  runs: readonly AiVsAiSimulationRun[]
): readonly string[] {
  return runs.map((run) => {
    const winner = getEconomicWinner(content, run);
    const firstLoss = {
      player: getFirstTritiumLossTurn(content, run, "player"),
      opponent: getFirstTritiumLossTurn(content, run, "opponent")
    };
    return [
      `${run.name}:`,
      `winner ${winner.label}`,
      `validation ${run.errors.length === 0 ? "OK" : "FAILED"}`,
      `final ΔV ${formatFactionCounts(run.state.factionDv)}`,
      `0-ΔV turns ${formatFactionCounts(countZeroDvTurns(run.dvHistory))}`,
      `tritium Work ${formatFactionCounts(countEventsByFaction(run.debugEvents, "TRITIUM_INCOME"))}`,
      `failed launches ${formatFactionCounts(countEventsByFaction(run.debugEvents, "MANDATORY_LAUNCH_DESTROYED"))}`,
      `contested upkeep failed ${formatFactionCounts(countEventsByFaction(run.debugEvents, "CONTESTED_UPKEEP_FAILED"))}`,
      `first tritium loss player ${formatTurnOrDash(firstLoss.player)}, opponent ${formatTurnOrDash(firstLoss.opponent)}`
    ].join(" | ");
  });
}

function formatDiagnosticsRun(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): readonly string[] {
  const dump = dumpTurnState(content, run.state);
  const winner = getEconomicWinner(content, run);
  return [
    run.name,
    `Start setup player: ${formatFactionStartSetup(content, run.initialState, "player")}`,
    `Start setup opponent: ${formatFactionStartSetup(content, run.initialState, "opponent")}`,
    `Initial faction order: ${run.initialFactionOrder.join(" -> ")}`,
    `Planner per faction: player ${AI_PLANNER_NAME}, opponent ${AI_PLANNER_NAME}`,
    `Validation: ${run.errors.length === 0 ? "OK" : "FAILED"}`,
    "Simultaneous turn audit:",
    ...formatTurnAuditDetails(run.debugEvents).map((line) => `  ${line}`),
    `Final ΔV: ${formatFactionCounts(run.state.factionDv)}`,
    `Turns at 0 ΔV: ${formatFactionCounts(countZeroDvTurns(run.dvHistory))}`,
    `Lowest ΔV reached: ${formatFactionCounts(getLowestDvByFaction(run.dvHistory))}`,
    `Average ΔV: ${formatFactionAverages(getAverageDvByFaction(run.dvHistory))}`,
    `Ships remaining: ${formatFactionCounts(dump.shipsPerFaction)}`,
    `Ships destroyed: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "SHIP_DESTROYED"))}`,
    `Missiles fired: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "FIRE_LAUNCHED"))}`,
    `Missile hits: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "MISSILE_IMPACT"))}`,
    `Missile evades: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "EVADE"))}`,
    `Tritium Work turns: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "TRITIUM_INCOME"))}`,
    `Shipyard Work turns: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "SHIPYARD_PROGRESS"))}`,
    `Contested upkeep paid: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "CONTESTED_UPKEEP_PAID"))}`,
    `Contested upkeep failed: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "CONTESTED_UPKEEP_FAILED"))}`,
    `Failed mandatory launches: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "MANDATORY_LAUNCH_DESTROYED"))}`,
    `Turns without tritium access: ${formatFactionCounts(countTurnsWithoutTritiumAccess(content, run.stateHistory))}`,
    `Nearest affordable tritium at first tritium loss: ${formatNearestAffordableTritiumAtFirstLoss(content, run)}`,
    `Tritium fallback triggered: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "AI_TRITIUM_FALLBACK_TRIGGERED"))}`,
    `Tritium fallback assigned: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "AI_TRITIUM_FALLBACK_ASSIGNED"))}`,
    `Tritium fallback rejected reason counts: ${formatReasonCounts(countTritiumFallbackRejectedReasons(run.debugEvents))}`,
    `Reserve override used for tritium recovery: ${formatFactionCounts(countTritiumFallbackReserveOverrides(run.debugEvents))}`,
    "Tritium fallback details:",
    ...formatTritiumFallbackDetails(content, run.debugEvents).map((line) => `  ${line}`),
    `Max simultaneous contested ships: ${formatFactionCounts(getMaxSimultaneousContestedShips(run.stateHistory))}`,
    `Contested entries by node type: ${formatNestedFactionReasonCounts(countContestedEntriesByNodeType(content, run.stateHistory))}`,
    `Contested entries rejected due to upkeep budget: ${formatFactionCounts(countUpkeepBudgetContestedEntryRejections(run.debugEvents))}`,
    `Ships destroyed by contested upkeep failure by node type: ${formatNestedFactionReasonCounts(countContestedUpkeepFailuresByNodeType(content, run.debugEvents))}`,
    `Contested+FIRE combos considered: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "AI_COMBO_CONSIDERED"))}`,
    `Contested+FIRE combos executed: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "AI_COMBO_EXECUTED"))}`,
    `Contested+FIRE combos rejected: ${formatReasonCounts(countComboRejectedReasons(run.debugEvents))}`,
    `Alpha Strike threats: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "ALPHA_STRIKE_THREAT"))}`,
    `Alpha Strike decisions: ${formatReasonCounts(countAlphaStrikeThreatReasons(run.debugEvents))}`,
    "Contested+FIRE combo details:",
    ...formatComboDetails(content, run.debugEvents).map((line) => `  ${line}`),
    `Action considered counts: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "AI_CONSIDERED_ACTION"))}`,
    `Action rejected counts: ${formatFactionCounts(countEventsByFaction(run.debugEvents, "AI_REJECTED_ACTION"))}`,
    `Main rejection reasons: ${formatReasonCounts(takeTopReasonCounts(countRejectedReasons(run.debugEvents), 8))}`,
    `Economic winner: ${winner.label} (score player ${(winner.scores.player ?? 0).toFixed(1)}, opponent ${(winner.scores.opponent ?? 0).toFixed(1)})`,
    "Final productive nodes:",
    ...formatFinalProductiveNodes(content, run.state).map((line) => `  ${line}`),
    "Tritium survival:",
    ...formatTritiumSurvivalDiagnostics(content, run).map((line) => `  ${line}`),
    "Mandatory launch pressure:",
    ...formatMandatoryLaunchPressureDiagnostics(content, run).map((line) => `  ${line}`),
    "Expansion path quality:",
    ...formatExpansionPathDiagnostics(content, run).map((line) => `  ${line}`),
    "Validation errors or warnings:",
    ...(run.errors.length === 0 ? ["  -"] : run.errors.map((error) => `  ${error}`))
  ];
}

function formatTurnAuditDetails(debugEvents: readonly TurnDebugEvent[]): readonly string[] {
  const audits = debugEvents.filter((event) => event.type === "SIMULTANEOUS_TURN_AUDIT");

  if (audits.length === 0) {
    return ["-"];
  }

  const sameSnapshotUsed = audits.every((event) => event.reason === "snapshot-ok");
  const mutatedDuringPlanning = audits.some((event) => event.reason === "snapshot-error");

  return [
    `Audit turns: ${audits.length}`,
    `Same snapshot used by all factions: ${formatYesNo(sameSnapshotUsed)}`,
    `State mutated during planning: ${formatYesNo(mutatedDuringPlanning)}`,
    ...audits.map((event) => `T${event.turn}: ${event.message}`)
  ];
}

function formatOrderBiasInvariantReport(
  content: SimulationContent,
  runs: readonly AiVsAiSimulationRun[]
): readonly string[] {
  const normalComparison =
    runs[0] !== undefined && runs[2] !== undefined
      ? compareOrderBiasRuns(content, "normal start", runs[0], runs[2])
      : ["normal start: missing runs"];
  const swappedComparison =
    runs[1] !== undefined && runs[3] !== undefined
      ? compareOrderBiasRuns(content, "swapped start", runs[1], runs[3])
      : ["swapped start: missing runs"];

  return [...normalComparison, ...swappedComparison];
}

function compareOrderBiasRuns(
  content: SimulationContent,
  label: string,
  first: AiVsAiSimulationRun,
  second: AiVsAiSimulationRun
): readonly string[] {
  const firstWinner = getEconomicWinner(content, first);
  const secondWinner = getEconomicWinner(content, second);
  const maxLength = Math.min(first.stateHistory.length, second.stateHistory.length);

  for (let index = 0; index < maxLength; index += 1) {
    const firstState = first.stateHistory[index];
    const secondState = second.stateHistory[index];

    if (firstState === undefined || secondState === undefined) {
      break;
    }

    if (hashGameStateForAudit(firstState) === hashGameStateForAudit(secondState)) {
      continue;
    }

    const diff = findFirstNormalizedStateDiff(
      normalizeGameStateForComparison(firstState),
      normalizeGameStateForComparison(secondState)
    );
    const classification =
      firstWinner.factionId !== secondWinner.factionId
        ? "initial faction order bias"
        : hasNeutralTieBreakAudit(first, second)
          ? "deterministic neutral tie-break divergence"
          : "unresolved divergence";

    return [
      `${label}: bias classification ${classification}`,
      `  first divergent turn: T${firstState.turn}`,
      `  first divergent phase: ${inferDivergencePhase(diff?.path ?? "state")}`,
      `  first divergent field: ${diff?.path ?? "state"}`,
      `  ${first.name}: ${formatDiffValue(diff?.firstValue)}`,
      `  ${second.name}: ${formatDiffValue(diff?.secondValue)}`
    ];
  }

  if (first.stateHistory.length !== second.stateHistory.length) {
    return [
      `${label}: bias classification unresolved divergence`,
      `  first divergent turn: history-length`,
      `  first divergent phase: simulation length`,
      `  first divergent field: stateHistory.length`,
      `  ${first.name}: ${first.stateHistory.length}`,
      `  ${second.name}: ${second.stateHistory.length}`
    ];
  }

  return [
    `${label}: bias classification no order bias`,
    "  first divergent turn: -",
    "  first divergent phase: -",
    "  first divergent field: -",
    `  economic winner ${firstWinner.label}; reversed-order winner ${secondWinner.label}`
  ];
}

function hasNeutralTieBreakAudit(first: AiVsAiSimulationRun, second: AiVsAiSimulationRun): boolean {
  return [...first.debugEvents, ...second.debugEvents].some((event) => {
    return (
      event.type === "SIMULTANEOUS_TURN_AUDIT" &&
      !event.message.includes("conflicts -; conflict resolutions -")
    );
  });
}

function findFirstNormalizedStateDiff(
  first: unknown,
  second: unknown,
  path = "state"
): Readonly<{ path: string; firstValue: unknown; secondValue: unknown }> | null {
  if (Object.is(first, second)) {
    return null;
  }

  if (Array.isArray(first) || Array.isArray(second)) {
    if (!Array.isArray(first) || !Array.isArray(second)) {
      return { path, firstValue: first, secondValue: second };
    }

    const length = Math.min(first.length, second.length);

    for (let index = 0; index < length; index += 1) {
      const diff = findFirstNormalizedStateDiff(first[index], second[index], `${path}[${index}]`);

      if (diff !== null) {
        return diff;
      }
    }

    return first.length === second.length ? null : { path, firstValue: first, secondValue: second };
  }

  if (isPlainAuditObject(first) || isPlainAuditObject(second)) {
    if (!isPlainAuditObject(first) || !isPlainAuditObject(second)) {
      return { path, firstValue: first, secondValue: second };
    }

    const keys = [...new Set([...Object.keys(first), ...Object.keys(second)])].sort((a, b) =>
      a.localeCompare(b)
    );

    for (const key of keys) {
      const diff = findFirstNormalizedStateDiff(first[key], second[key], `${path}.${key}`);

      if (diff !== null) {
        return diff;
      }
    }

    return null;
  }

  return { path, firstValue: first, secondValue: second };
}

function isPlainAuditObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function inferDivergencePhase(path: string): string {
  if (path.includes("pendingBurnOrders") || path.includes("pendingFireOrders")) {
    return "order collection / validation";
  }

  if (path.includes("activeMissiles")) {
    return "missile response / FIRE / impact";
  }

  if (path.includes("activeBurnTransits")) {
    return "Burn departures / arrivals";
  }

  if (path.includes("nodeOccupancies")) {
    return "arrivals / contested / cleanup";
  }

  if (path.includes("factionDv")) {
    return "upkeep / income / paid action";
  }

  if (path.includes("shipyardProgress") || path.includes("mandatoryLaunches")) {
    return "Work / production / mandatory launch";
  }

  return "unknown";
}

function formatDiffValue(value: unknown): string {
  const serialized = JSON.stringify(value);

  if (serialized === undefined) {
    return String(value);
  }

  return serialized.length <= 220 ? serialized : `${serialized.slice(0, 217)}...`;
}

function formatStartingPositionDiagnostics(
  content: SimulationContent,
  initialState: GameState
): readonly string[] {
  return (["player", "opponent"] as const).flatMap((factionId) => {
    const nearestTritium = getNearestNeutralProductiveRoute(
      content,
      initialState,
      factionId,
      "tritium"
    );
    const nearestShipyard = getNearestNeutralProductiveRoute(
      content,
      initialState,
      factionId,
      "shipyard"
    );
    const reachable = [1, 2, 3, 4]
      .map((turns) => {
        const nodes = getReachableNeutralProductiveNodes(content, initialState, factionId, turns);
        return `T+${turns} ${nodes.length}${nodes.length === 0 ? "" : ` (${nodes.map((node) => getNodeDisplayName(content, node.id)).join(", ")})`}`;
      })
      .join("; ");
    const safe = getSafeExpansionOptions(content, initialState, factionId);
    const threatened = getStartingProductiveNodesThreatenedOnTurnOne(
      content,
      initialState,
      factionId
    );

    return [
      `${factionId} start side: ${getStartSideLabel(initialState, factionId)}`,
      `  nearest neutral tritium: ${formatRouteOption(content, nearestTritium)}`,
      `  nearest neutral shipyard: ${formatRouteOption(content, nearestShipyard)}`,
      `  productive nodes reachable within 1/2/3/4 turns: ${reachable}`,
      `  safe expansion options: ${safe.length === 0 ? "-" : safe.map((option) => formatRouteOption(content, option)).join("; ")}`,
      `  starting productive nodes threatened on turn 1: ${threatened.length === 0 ? "-" : threatened.map((nodeId) => getNodeDisplayName(content, nodeId)).join(", ")}`
    ];
  });
}

function getFactionLabelBiasAuditLines(): readonly string[] {
  return [
    "- AI-vs-AI diagnostics call `advanceTurn` with both factions AI-controlled; no live/manual player orders are used.",
    "- `defaultPlayerFactionId` is still used for manual commands and UI helper defaults, but diagnostic AI orders pass explicit faction ids.",
    "- `getPlayerOccupancy` is player-specific but read-only and not used by the AI planner.",
    "- `runAITestTurns` stops only on human mandatory launches; it is a test helper and not used by these diagnostics.",
    "- AI target selection uses `getOpposingFactionId`, so target ownership is label-symmetric inside the planner."
  ];
}

function getResolutionOrderBiasAuditLines(): readonly string[] {
  return [
    "- AI-vs-AI planning now clones one immutable pre-turn snapshot and gives that same snapshot to every faction planner.",
    "- AI planning order alternates every turn and diagnostics still run both player-first and opponent-first initial orders.",
    "- Collected AI orders are merged before turn resolution, so one AI cannot consume state, ΔV, targets, or reservations before the other planner sees them.",
    "- Contested upkeep iterates sorted occupancies before income, matching the canonical turn order; each faction pays only its own reserve, so this ordering is not used as a winner tie-break.",
    "- Missile impact and automatic Evade resolve before same-turn arrivals.",
    "- Economy applies income and production after movement but excludes ships that arrived by BURN during the same turn from WORK eligibility.",
    "- Diagnostics compare reversed planning-order runs to catch any remaining non-cosmetic divergence.",
    "- Mandatory launch selection uses deterministic destination scoring and the report flags the first normalized divergence if order affects it."
  ];
}

function getTieBreakBiasAuditLines(): readonly string[] {
  return [
    "- AI ship processing is sorted by node id for deterministic planning from the shared snapshot.",
    "- Target selection ties are score, ETA, then node id.",
    "- Mandatory launch ties are burn cost, destination type priority, then destination node id.",
    "- Collected AI orders are sorted by neutral order fields before commit; conflicting same-ship orders are rejected explicitly and logged.",
    "- No tie-break in this diagnostic is randomized; unresolved normalized divergence is reported as a refactor issue, not as balance."
  ];
}

function inferLikelyCauses(
  content: SimulationContent,
  runs: readonly AiVsAiSimulationRun[]
): readonly string[] {
  const causes = new Set<string>();
  const winners = runs.map((run) => getEconomicWinner(content, run));
  const winnerLabels = winners.map((winner) => winner.factionId);

  if (winnerLabels.every((winner) => winner === "player")) {
    causes.add("player-label bias likely");
  }

  if (winnerLabels.every((winner) => winner === "opponent")) {
    causes.add("player-label bias unlikely; opponent-label bias possible");
  }

  const normalWinnerSide = winners[0]?.factionId
    ? getStartSideLabel(runs[0]?.initialState ?? createInitialGameState(), winners[0].factionId)
    : "mixed";
  const swappedWinnerSide = winners[1]?.factionId
    ? getStartSideLabel(runs[1]?.initialState ?? createInitialGameState(), winners[1].factionId)
    : "mixed";

  if (normalWinnerSide !== "mixed" && normalWinnerSide === swappedWinnerSide) {
    causes.add("starting setup imbalance likely");
    causes.add("map topology imbalance likely");
  }

  if (
    winners[0]?.factionId !== winners[2]?.factionId ||
    winners[1]?.factionId !== winners[3]?.factionId
  ) {
    causes.add("resolution order bias likely");
  }

  const tritiumWorkGaps = runs.map((run) => {
    const tritiumWork = countEventsByFaction(run.debugEvents, "TRITIUM_INCOME");
    return Math.abs((tritiumWork.player ?? 0) - (tritiumWork.opponent ?? 0));
  });

  if (tritiumWorkGaps.some((gap) => gap >= 20)) {
    causes.add("weak tritium survival logic");
  }

  const reserveRejections = runs.map((run) => {
    const reasons = countRejectedReasons(run.debugEvents);
    return (reasons["reserve"] ?? 0) + (reasons["critical-dv"] ?? 0);
  });

  if (reserveRejections.some((count) => count >= 40)) {
    causes.add("reserve logic too restrictive");
  }

  const tieBreakSensitive = runs.some((run) => {
    return (
      countEventsByFaction(run.debugEvents, "CONTESTED_UPKEEP_FAILED").player !==
      countEventsByFaction(run.debugEvents, "CONTESTED_UPKEEP_FAILED").opponent
    );
  });

  if (tieBreakSensitive) {
    causes.add("tie-break bias likely");
  }

  return causes.size === 0 ? ["inconclusive"] : [...causes];
}

function getEconomicWinner(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): Readonly<{ label: string; factionId?: FactionId; scores: Record<string, number> }> {
  const scores = {
    player: getEconomicScore(content, run, "player"),
    opponent: getEconomicScore(content, run, "opponent")
  } satisfies Record<string, number>;

  if (scores.player === scores.opponent) {
    return { label: "tie", scores };
  }

  const factionId: FactionId = scores.player > scores.opponent ? "player" : "opponent";
  return {
    label: `${factionId} (${getStartSideLabel(run.initialState, factionId)})`,
    factionId,
    scores
  };
}

function getEconomicScore(
  content: SimulationContent,
  run: AiVsAiSimulationRun,
  factionId: FactionId
): number {
  const tritiumWork = countEventsByFaction(run.debugEvents, "TRITIUM_INCOME")[factionId];
  const shipyardWork = countEventsByFaction(run.debugEvents, "SHIPYARD_PROGRESS")[factionId];
  const failedLaunches = countEventsByFaction(run.debugEvents, "MANDATORY_LAUNCH_DESTROYED")[
    factionId
  ];
  const contestedFailures = countEventsByFaction(run.debugEvents, "CONTESTED_UPKEEP_FAILED")[
    factionId
  ];
  const zeroDvTurns = countZeroDvTurns(run.dvHistory)[factionId];
  const occupiedTritium = content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => hasFactionShipAtNode(run.state, node.id, factionId)).length;
  const occupiedShipyards = content.nodes
    .filter((node) => node.type === "shipyard")
    .filter((node) => hasFactionShipAtNode(run.state, node.id, factionId)).length;

  return (
    getFactionDv(run.state, factionId) +
    (tritiumWork ?? 0) * 2 +
    (shipyardWork ?? 0) * 0.25 +
    occupiedTritium * 20 +
    occupiedShipyards * 5 +
    countFactionShips(run.state, factionId) * 2 -
    (zeroDvTurns ?? 0) * 3 -
    (failedLaunches ?? 0) * 5 -
    (contestedFailures ?? 0) * 5
  );
}

function formatFactionStartSetup(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): string {
  const setup = state.nodeOccupancies
    .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
    .map((occupancy) => {
      const node = getNodeById(content, occupancy.nodeId);
      return `${getNodeDisplayName(content, occupancy.nodeId)} (${node?.type ?? "unknown"})`;
    });

  return setup.length === 0 ? "-" : setup.join(" / ");
}

function getStartSideLabel(state: GameState, factionId: FactionId): StartSideLabel {
  const nodeIds = new Set(
    state.nodeOccupancies
      .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
      .map((occupancy) => occupancy.nodeId)
  );
  const titanSide = ["titan_node", "deimos_node", "ganymede_node"];
  const europaSide = ["europa_node", "oberon_node", "phobos_node"];

  if (titanSide.every((nodeId) => nodeIds.has(nodeId))) {
    return "titan/deimos/ganymede";
  }

  if (europaSide.every((nodeId) => nodeIds.has(nodeId))) {
    return "europa/oberon/phobos";
  }

  return "mixed";
}

function getNearestNeutralProductiveRoute(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  nodeType: SimulationContent["nodes"][number]["type"]
): Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  etaTurns: number;
  burnCost: number;
}> | null {
  return (
    content.nodes
      .filter((node) => node.type === nodeType)
      .filter((node) => !state.nodeOccupancies.some((occupancy) => occupancy.nodeId === node.id))
      .map((node) => getShortestRouteToNode(content, state, factionId, node.id))
      .filter((route): route is NonNullable<typeof route> => route !== null)
      .sort(compareRouteOptions)[0] ?? null
  );
}

function getReachableNeutralProductiveNodes(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  etaTurns: number
): readonly SimulationContent["nodes"][number][] {
  return content.nodes
    .filter((node) => node.type === "tritium" || node.type === "shipyard")
    .filter((node) => !state.nodeOccupancies.some((occupancy) => occupancy.nodeId === node.id))
    .filter((node) => {
      const route = getShortestRouteToNode(content, state, factionId, node.id);
      return route !== null && route.etaTurns <= etaTurns;
    });
}

function getSafeExpansionOptions(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  etaTurns: number;
  burnCost: number;
}>[] {
  return content.nodes
    .filter((node) => node.type === "tritium" || node.type === "shipyard")
    .filter((node) => !state.nodeOccupancies.some((occupancy) => occupancy.nodeId === node.id))
    .map((node) => getShortestRouteToNode(content, state, factionId, node.id))
    .filter((route): route is NonNullable<typeof route> => route !== null)
    .filter((route) => route.burnCost <= getFactionDv(state, factionId) - AI_MIN_DV_RESERVE)
    .filter((route) => {
      return getEnemyFactionIds(state, factionId).every((enemyFactionId) => {
        const enemyRoute = getShortestRouteToNode(
          content,
          state,
          enemyFactionId,
          route.destinationNodeId
        );
        return enemyRoute === null || enemyRoute.etaTurns > route.etaTurns;
      });
    })
    .sort(compareRouteOptions);
}

function getStartingProductiveNodesThreatenedOnTurnOne(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly string[] {
  return state.nodeOccupancies
    .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
    .map((occupancy) => getNodeById(content, occupancy.nodeId))
    .filter((node): node is NonNullable<typeof node> => node !== undefined)
    .filter((node) => node.type === "tritium" || node.type === "shipyard")
    .filter((node) => {
      return getEnemyFactionIds(state, factionId).some((enemyFactionId) => {
        const route = getShortestRouteToNode(content, state, enemyFactionId, node.id);
        return route !== null && route.etaTurns <= 1;
      });
    })
    .map((node) => node.id);
}

function getShortestRouteToNode(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNodeId: string
): Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  etaTurns: number;
  burnCost: number;
}> | null {
  return (
    state.nodeOccupancies
      .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
      .map((occupancy) => {
        const plan = calculateBurnPlan(content, state, occupancy.nodeId, destinationNodeId);

        if (plan === null) {
          return null;
        }

        return {
          originNodeId: occupancy.nodeId,
          destinationNodeId,
          etaTurns: plan.etaTurns,
          burnCost: plan.burnCost
        };
      })
      .filter((route): route is NonNullable<typeof route> => route !== null)
      .sort(compareRouteOptions)[0] ?? null
  );
}

function compareRouteOptions(
  first: Readonly<{ destinationNodeId: string; etaTurns: number; burnCost: number }>,
  second: Readonly<{ destinationNodeId: string; etaTurns: number; burnCost: number }>
): number {
  if (first.etaTurns !== second.etaTurns) {
    return first.etaTurns - second.etaTurns;
  }

  if (first.burnCost !== second.burnCost) {
    return first.burnCost - second.burnCost;
  }

  return first.destinationNodeId.localeCompare(second.destinationNodeId);
}

function formatRouteOption(
  content: SimulationContent,
  route: Readonly<{
    originNodeId: string;
    destinationNodeId: string;
    etaTurns: number;
    burnCost: number;
  }> | null
): string {
  if (route === null) {
    return "-";
  }

  return `${getNodeDisplayName(content, route.destinationNodeId)} from ${getNodeDisplayName(content, route.originNodeId)} T+${route.etaTurns}, -${route.burnCost} ΔV`;
}

function formatTritiumSurvivalDiagnostics(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): readonly string[] {
  return (["player", "opponent"] as const).map((factionId) => {
    const firstLossTurn = getFirstTritiumLossTurn(content, run, factionId);
    const lossState =
      firstLossTurn === null ? run.state : (run.stateHistory[firstLossTurn] ?? run.state);
    const recoveryOptions = getAffordableTritiumRecoveryOptions(content, lossState, factionId);
    const nearbyEvents =
      firstLossTurn === null
        ? []
        : run.debugEvents.filter((event) => {
            return (
              event.factionId === factionId &&
              event.turn >= firstLossTurn &&
              event.turn <= firstLossTurn + 3
            );
          });
    const choseShipyardWork = nearbyEvents.some((event) => {
      return (
        event.type === "AI_DECISION" &&
        event.action === "WORK" &&
        getNodeById(content, event.nodeId ?? "")?.type === "shipyard"
      );
    });
    const reserveBlockedRecovery = nearbyEvents.some((event) => {
      return (
        event.type === "AI_REJECTED_ACTION" &&
        event.action === "BURN" &&
        (event.reason === "reserve" || event.reason === "critical-dv")
      );
    });
    const contestedTrap = nearbyEvents.some((event) => {
      return event.type === "CONTESTED_UPKEEP_PAID" || event.type === "CONTESTED_UPKEEP_FAILED";
    });

    return [
      `${factionId}: first lost tritium ${formatTurnOrDash(firstLossTurn)}`,
      `recovery options affordable ${recoveryOptions.length === 0 ? "no" : recoveryOptions.map((route) => formatRouteOption(content, route)).join("; ")}`,
      `shipyard Work instead of recovery ${formatYesNo(choseShipyardWork)}`,
      `reserve blocked recovery ${formatYesNo(reserveBlockedRecovery)}`,
      `contested trapped ships near loss ${formatYesNo(contestedTrap)}`
    ].join(" | ");
  });
}

function getFirstTritiumLossTurn(
  content: SimulationContent,
  run: AiVsAiSimulationRun,
  factionId: FactionId
): number | null {
  let hadTritium =
    getFactionOccupiedTritiumNodeIds(content, run.stateHistory[0] ?? run.initialState, factionId)
      .length > 0;

  for (let index = 1; index < run.stateHistory.length; index += 1) {
    const hasTritium =
      getFactionOccupiedTritiumNodeIds(content, run.stateHistory[index] ?? run.state, factionId)
        .length > 0;

    if (hadTritium && !hasTritium) {
      return run.stateHistory[index]?.turn ?? index;
    }

    hadTritium = hasTritium;
  }

  return null;
}

function getAffordableTritiumRecoveryOptions(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  etaTurns: number;
  burnCost: number;
}>[] {
  return content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => !hasFactionShipAtNode(state, node.id, factionId))
    .map((node) => getShortestRouteToNode(content, state, factionId, node.id))
    .filter((route): route is NonNullable<typeof route> => route !== null)
    .filter((route) => route.burnCost <= getProjectedFactionDv(state, factionId))
    .sort(compareRouteOptions)
    .slice(0, 3);
}

function formatMandatoryLaunchPressureDiagnostics(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): readonly string[] {
  const producedBelowReserve = run.debugEvents.filter((event) => {
    if (event.type !== "SHIP_PRODUCED" || event.factionId === undefined) {
      return false;
    }

    const stateAtTurn = run.stateHistory[event.turn] ?? run.state;
    return getFactionDv(stateAtTurn, event.factionId) < AI_MIN_DV_RESERVE;
  });
  const failuresByNode = countEventsByNode(run.debugEvents, "MANDATORY_LAUNCH_DESTROYED");
  const failureDetails = run.debugEvents
    .filter((event) => event.type === "MANDATORY_LAUNCH_DESTROYED")
    .slice(0, 8)
    .map((event) => {
      const previousState = run.stateHistory[Math.max(0, event.turn - 1)] ?? run.initialState;
      const affordableEarlier =
        event.factionId === undefined || event.nodeId === undefined
          ? false
          : couldAffordMandatoryLaunchIfProduced(
              content,
              previousState,
              event.nodeId,
              event.factionId
            );
      const couldMoveAway =
        event.factionId === undefined || event.nodeId === undefined
          ? false
          : couldMoveShipAwayBeforeProduction(
              content,
              previousState,
              event.nodeId,
              event.factionId
            );
      const nodeLabel =
        event.nodeId === undefined ? "unknown" : getNodeDisplayName(content, event.nodeId);
      return `${nodeLabel} ${event.factionId ?? "-"} T${event.turn}: affordable one turn earlier ${formatYesNo(affordableEarlier)}, could move worker away ${formatYesNo(couldMoveAway)}`;
    });

  return [
    `shipyards completed while faction ΔV below reserve: ${producedBelowReserve.length}`,
    `mandatory launch failures by node: ${formatReasonCounts(failuresByNode)}`,
    ...(failureDetails.length === 0 ? ["failure details: -"] : failureDetails)
  ];
}

function couldAffordMandatoryLaunchIfProduced(
  content: SimulationContent,
  state: GameState,
  nodeId: string,
  factionId: FactionId
): boolean {
  const producedState: GameState = {
    ...state,
    nodeOccupancies: produceShipAtShipyard(state.nodeOccupancies, nodeId, factionId)
  };

  return (
    chooseMandatoryLaunchBurn(
      content,
      producedState,
      nodeId,
      factionId,
      `diagnostic:${factionId}:${nodeId}:T${state.turn}`
    ) !== null
  );
}

function couldMoveShipAwayBeforeProduction(
  content: SimulationContent,
  state: GameState,
  nodeId: string,
  factionId: FactionId
): boolean {
  if (!hasFactionShipAtNode(state, nodeId, factionId)) {
    return false;
  }

  return content.nodes.some((destination) => {
    return (
      destination.id !== nodeId &&
      getLegalBurnPlan(content, state, nodeId, destination.id, factionId) !== null
    );
  });
}

function formatExpansionPathDiagnostics(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): readonly string[] {
  return (["player", "opponent"] as const).flatMap((factionId) => {
    const burnDestinations = run.debugEvents
      .filter((event) => event.type === "BURN_DEPARTED" && event.factionId === factionId)
      .map((event) => event.destinationNodeId)
      .filter((nodeId): nodeId is string => nodeId !== undefined)
      .slice(0, 10);
    const productiveReached = getFirstProductiveNodesReached(content, run, factionId).slice(0, 10);
    const rejectedTargets = countRejectedBurnTargets(content, run.debugEvents, factionId);
    const destinationMix = countNodeTypes(content, burnDestinations);

    return [
      `${factionId} first 10 Burn destinations: ${burnDestinations.length === 0 ? "-" : burnDestinations.map((nodeId) => formatNodeWithType(content, nodeId)).join(" -> ")}`,
      `${factionId} first 10 productive nodes reached: ${productiveReached.length === 0 ? "-" : productiveReached.map((nodeId) => formatNodeWithType(content, nodeId)).join(" -> ")}`,
      `${factionId} rejected expansion targets/reasons: ${formatReasonCounts(takeTopReasonCounts(rejectedTargets, 8))}`,
      `${factionId} first-burn destination type mix: ${formatReasonCounts(destinationMix)}`
    ];
  });
}

function getFirstProductiveNodesReached(
  content: SimulationContent,
  run: AiVsAiSimulationRun,
  factionId: FactionId
): readonly string[] {
  const reached: string[] = [];
  const seen = new Set<string>();

  for (let index = 1; index < run.stateHistory.length; index += 1) {
    const previousState = run.stateHistory[index - 1] ?? run.initialState;
    const nextState = run.stateHistory[index] ?? run.state;

    for (const node of content.nodes) {
      if (node.type !== "tritium" && node.type !== "shipyard") {
        continue;
      }

      if (
        !seen.has(node.id) &&
        !hasFactionShipAtNode(previousState, node.id, factionId) &&
        hasFactionShipAtNode(nextState, node.id, factionId)
      ) {
        seen.add(node.id);
        reached.push(node.id);
      }
    }
  }

  return reached;
}

function countRejectedBurnTargets(
  content: SimulationContent,
  debugEvents: readonly TurnDebugEvent[],
  factionId: FactionId
): Record<string, number> {
  return debugEvents
    .filter((event) => {
      return (
        event.type === "AI_REJECTED_ACTION" &&
        event.factionId === factionId &&
        event.action === "BURN" &&
        event.destinationNodeId !== undefined
      );
    })
    .reduce<Record<string, number>>((counts, event) => {
      const key = `${formatNodeWithType(content, event.destinationNodeId ?? "")}:${event.reason ?? "unspecified"}`;
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
}

function countNodeTypes(
  content: SimulationContent,
  nodeIds: readonly string[]
): Record<string, number> {
  return nodeIds.reduce<Record<string, number>>((counts, nodeId) => {
    const type = getNodeById(content, nodeId)?.type ?? "unknown";
    counts[type] = (counts[type] ?? 0) + 1;
    return counts;
  }, {});
}

function getMaxSimultaneousContestedShips(
  stateHistory: readonly GameState[]
): Record<string, number> {
  return stateHistory.reduce(
    (maxCounts, state) => {
      for (const factionId of ["player", "opponent"] as const) {
        const contestedShips = state.nodeOccupancies
          .filter((occupancy) => {
            return (
              occupancy.factionId === factionId &&
              occupancy.shipCount > 0 &&
              isNodeContested(state.nodeOccupancies, occupancy.nodeId)
            );
          })
          .reduce((total, occupancy) => total + occupancy.shipCount, 0);
        maxCounts[factionId] = Math.max(maxCounts[factionId], contestedShips);
      }

      return maxCounts;
    },
    { player: 0, opponent: 0 } satisfies Record<string, number>
  );
}

function countContestedEntriesByNodeType(
  content: SimulationContent,
  stateHistory: readonly GameState[]
): Record<string, Record<string, number>> {
  const counts = createNestedFactionCounts();

  for (let index = 1; index < stateHistory.length; index += 1) {
    const previousState = stateHistory[index - 1];
    const nextState = stateHistory[index];

    if (previousState === undefined || nextState === undefined) {
      continue;
    }

    for (const occupancy of nextState.nodeOccupancies) {
      if (
        occupancy.shipCount <= 0 ||
        !isNodeContested(nextState.nodeOccupancies, occupancy.nodeId) ||
        hasFactionShipAtNode(previousState, occupancy.nodeId, occupancy.factionId)
      ) {
        continue;
      }

      const type = getNodeById(content, occupancy.nodeId)?.type ?? "unknown";
      const factionCounts = counts[occupancy.factionId] ?? {};
      factionCounts[type] = (factionCounts[type] ?? 0) + 1;
      counts[occupancy.factionId] = factionCounts;
    }
  }

  return counts;
}

function countContestedUpkeepFailuresByNodeType(
  content: SimulationContent,
  debugEvents: readonly TurnDebugEvent[]
): Record<string, Record<string, number>> {
  return debugEvents
    .filter((event) => event.type === "CONTESTED_UPKEEP_FAILED" && event.factionId !== undefined)
    .reduce((counts, event) => {
      const factionId = event.factionId ?? "player";
      const type = getNodeById(content, event.nodeId ?? "")?.type ?? "unknown";
      counts[factionId] ??= {};
      counts[factionId][type] = (counts[factionId][type] ?? 0) + 1;
      return counts;
    }, createNestedFactionCounts());
}

function countUpkeepBudgetContestedEntryRejections(
  debugEvents: readonly TurnDebugEvent[]
): Record<string, number> {
  return debugEvents
    .filter((event) => {
      return (
        (event.type === "AI_REJECTED_ACTION" || event.type === "AI_COMBO_REJECTED") &&
        event.factionId !== undefined &&
        (event.reason === "contested-entry:upkeep-budget" ||
          event.reason === "contested-entry:below-reserve-after-upkeep" ||
          event.reason === "contested-entry:no-upkeep")
      );
    })
    .reduce(
      (counts, event) => {
        const factionId = event.factionId ?? "player";
        counts[factionId] = (counts[factionId] ?? 0) + 1;
        return counts;
      },
      { player: 0, opponent: 0 } as Record<string, number>
    );
}

function countComboRejectedReasons(debugEvents: readonly TurnDebugEvent[]): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === "AI_COMBO_REJECTED")
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countAlphaStrikeThreatReasons(
  debugEvents: readonly TurnDebugEvent[]
): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === "ALPHA_STRIKE_THREAT")
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countTritiumFallbackRejectedReasons(
  debugEvents: readonly TurnDebugEvent[]
): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === "AI_TRITIUM_FALLBACK_REJECTED")
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countTritiumFallbackReserveOverrides(
  debugEvents: readonly TurnDebugEvent[]
): Record<string, number> {
  return debugEvents
    .filter((event) => {
      return (
        event.type === "AI_TRITIUM_FALLBACK_ASSIGNED" &&
        event.factionId !== undefined &&
        (event.reason === "reserve-override" ||
          (event.projectedDv !== undefined && event.projectedDv < AI_MIN_DV_RESERVE))
      );
    })
    .reduce(
      (counts, event) => {
        const factionId = event.factionId ?? "player";
        counts[factionId] = (counts[factionId] ?? 0) + 1;
        return counts;
      },
      { player: 0, opponent: 0 } as Record<string, number>
    );
}

function countTurnsWithoutTritiumAccess(
  content: SimulationContent,
  stateHistory: readonly GameState[]
): Record<string, number> {
  return stateHistory.slice(1).reduce(
    (counts, state) => {
      for (const factionId of ["player", "opponent"] as const) {
        if (getFactionAccessibleTritiumNodeIds(content, state, factionId).length === 0) {
          counts[factionId] += 1;
        }
      }

      return counts;
    },
    { player: 0, opponent: 0 } satisfies Record<string, number>
  );
}

function formatTritiumFallbackDetails(
  content: SimulationContent,
  debugEvents: readonly TurnDebugEvent[]
): readonly string[] {
  const fallbackEvents = debugEvents.filter((event) => {
    return (
      event.type === "AI_TRITIUM_FALLBACK_TRIGGERED" ||
      event.type === "AI_TRITIUM_FALLBACK_ASSIGNED" ||
      event.type === "AI_TRITIUM_FALLBACK_REJECTED"
    );
  });

  if (fallbackEvents.length === 0) {
    return ["-"];
  }

  return fallbackEvents.slice(0, 24).map((event) => {
    const origin =
      event.originNodeId === undefined ? "-" : getNodeDisplayName(content, event.originNodeId);
    const target =
      event.destinationNodeId === undefined
        ? "-"
        : getNodeDisplayName(content, event.destinationNodeId);
    const reserveOverride =
      event.reason === "reserve-override" ||
      (event.projectedDv !== undefined && event.projectedDv < AI_MIN_DV_RESERVE)
        ? "yes"
        : "no";

    return `T${event.turn} ${event.factionId ?? "-"} ${event.type} reason ${event.reason ?? "-"}, ship ${origin}, target ${target}, reserve override ${reserveOverride}`;
  });
}

function formatNearestAffordableTritiumAtFirstLoss(
  content: SimulationContent,
  run: AiVsAiSimulationRun
): string {
  return formatNearestAffordableTritiumAtFirstLossFromHistory(
    content,
    run.initialState,
    run.stateHistory,
    run.state
  );
}

function formatNearestAffordableTritiumAtFirstLossFromHistory(
  content: SimulationContent,
  initialState: GameState,
  stateHistory: readonly GameState[],
  fallbackState: GameState
): string {
  return (["player", "opponent"] as const)
    .map((factionId) => {
      const lossTurn = getFirstTritiumLossTurnFromHistory(
        content,
        initialState,
        stateHistory,
        fallbackState,
        factionId
      );

      if (lossTurn === null) {
        return `${factionId} -`;
      }

      const lossState =
        stateHistory.find((state) => state.turn === lossTurn) ??
        stateHistory[lossTurn] ??
        fallbackState;
      const route = chooseAiTritiumFallbackRoute(lossState, content, factionId);

      if (route === null) {
        return `${factionId} none at T${lossTurn}`;
      }

      return `${factionId} ${getNodeDisplayName(content, route.destinationNodeId)} from ${getNodeDisplayName(content, route.originNodeId)} T+${route.etaTurns}, -${route.burnCost} ΔV`;
    })
    .join("; ");
}

function formatComboDetails(
  content: SimulationContent,
  debugEvents: readonly TurnDebugEvent[]
): readonly string[] {
  const comboEvents = debugEvents.filter((event) => {
    return event.type === "AI_COMBO_EXECUTED" || event.type === "AI_COMBO_REJECTED";
  });

  if (comboEvents.length === 0) {
    return ["-"];
  }

  return comboEvents.slice(0, 20).map((event) => {
    const target = getNodeDisplayName(content, event.targetNodeId ?? event.destinationNodeId ?? "");
    const contesting =
      event.originNodeId === undefined ? "-" : getNodeDisplayName(content, event.originNodeId);
    const firing =
      event.firingNodeId === undefined ? "-" : getNodeDisplayName(content, event.firingNodeId);
    const projectedDv = event.projectedDv === undefined ? "-" : String(event.projectedDv);
    const status = event.type === "AI_COMBO_EXECUTED" ? "executed" : `rejected:${event.reason}`;

    return `T${event.turn} ${event.factionId ?? "-"} ${status} target ${target}, contesting ${contesting}, firing ${firing}, projected ΔV ${projectedDv}`;
  });
}

function createNestedFactionCounts(): Record<string, Record<string, number>> {
  return { player: {}, opponent: {}, ai_2: {} };
}

function formatNestedFactionReasonCounts(
  counts: Readonly<Record<string, Readonly<Record<string, number>>>>
): string {
  return `player ${formatReasonCounts(counts.player ?? {})}, opponent ${formatReasonCounts(counts.opponent ?? {})}, ai_2 ${formatReasonCounts(counts.ai_2 ?? {})}`;
}

function getFirstTritiumLossTurnFromHistory(
  content: SimulationContent,
  initialState: GameState,
  stateHistory: readonly GameState[],
  fallbackState: GameState,
  factionId: FactionId
): number | null {
  let hadTritium =
    getFactionOccupiedTritiumNodeIds(content, stateHistory[0] ?? initialState, factionId).length >
    0;

  for (let index = 1; index < stateHistory.length; index += 1) {
    const state = stateHistory[index] ?? fallbackState;
    const hasTritium = getFactionOccupiedTritiumNodeIds(content, state, factionId).length > 0;

    if (hadTritium && !hasTritium) {
      return state.turn;
    }

    hadTritium = hasTritium;
  }

  return null;
}

function formatFirstTritiumLosses(
  content: SimulationContent,
  initialState: GameState,
  stateHistory: readonly GameState[],
  finalState: GameState,
  factionIds: readonly FactionId[]
): string {
  return factionIds
    .map((factionId) => {
      const lossTurn = getFirstTritiumLossTurnFromHistory(
        content,
        initialState,
        stateHistory,
        finalState,
        factionId
      );
      return `${factionId} ${formatTurnOrDash(lossTurn)}`;
    })
    .join(", ");
}

function countRejectedReasons(debugEvents: readonly TurnDebugEvent[]): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === "AI_REJECTED_ACTION")
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countEventsByNode(
  debugEvents: readonly TurnDebugEvent[],
  eventType: TurnDebugEvent["type"]
): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === eventType)
    .reduce<Record<string, number>>((counts, event) => {
      const key = event.nodeId ?? "unknown";
      counts[key] = (counts[key] ?? 0) + 1;
      return counts;
    }, {});
}

function takeTopReasonCounts(
  counts: Readonly<Record<string, number>>,
  limit: number
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(counts)
      .sort((first, second) => {
        if (first[1] !== second[1]) {
          return second[1] - first[1];
        }

        return first[0].localeCompare(second[0]);
      })
      .slice(0, limit)
  );
}

function formatNodeWithType(content: SimulationContent, nodeId: string): string {
  const node = getNodeById(content, nodeId);
  return `${getNodeDisplayName(content, nodeId)} (${node?.type ?? "unknown"})`;
}

function formatTurnOrDash(turn: number | null): string {
  return turn === null ? "-" : `T${turn}`;
}

function formatYesNo(value: boolean): string {
  return value ? "yes" : "no";
}

function countEventsByFaction(
  debugEvents: readonly TurnDebugEvent[],
  eventType: TurnDebugEvent["type"]
): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === eventType && event.factionId !== undefined)
    .reduce(
      (counts, event) => {
        const factionId = event.factionId ?? "player";
        counts[factionId] = (counts[factionId] ?? 0) + 1;
        return counts;
      },
      { player: 0, opponent: 0 } as Record<string, number>
    );
}

function countRejectedReasonsByAction(
  debugEvents: readonly TurnDebugEvent[],
  action: NonNullable<TurnDebugEvent["action"]>
): Record<string, number> {
  return debugEvents
    .filter((event) => {
      return event.type === "AI_REJECTED_ACTION" && event.action === action;
    })
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countContestedEntryRejectedReasons(
  debugEvents: readonly TurnDebugEvent[]
): Record<string, number> {
  return debugEvents
    .filter((event) => {
      return (
        event.type === "AI_REJECTED_ACTION" &&
        event.reason !== undefined &&
        event.reason.startsWith("contested-entry:")
      );
    })
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countMandatoryLaunchFailureReasons(
  debugEvents: readonly TurnDebugEvent[]
): Record<string, number> {
  return debugEvents
    .filter((event) => event.type === "MANDATORY_LAUNCH_DESTROYED")
    .reduce<Record<string, number>>((counts, event) => {
      const reason = event.reason ?? "unspecified";
      counts[reason] = (counts[reason] ?? 0) + 1;
      return counts;
    }, {});
}

function countZeroDvTurns(
  dvHistory: Readonly<Record<string, readonly number[]>>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(dvHistory).map(([factionId, history]) => [
      factionId,
      history.filter((value) => value === 0).length
    ])
  );
}

function getLowestDvByFaction(
  dvHistory: Readonly<Record<string, readonly number[]>>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(dvHistory).map(([factionId, history]) => [factionId, getLowestDv(history)])
  );
}

function getAverageDvByFaction(
  dvHistory: Readonly<Record<string, readonly number[]>>
): Record<string, number> {
  return Object.fromEntries(
    Object.entries(dvHistory).map(([factionId, history]) => [factionId, getAverageDv(history)])
  );
}

function getLowestDv(history: readonly number[]): number {
  return history.length === 0 ? 0 : Math.min(...history);
}

function getAverageDv(history: readonly number[]): number {
  if (history.length === 0) {
    return 0;
  }

  return history.reduce((total, value) => total + value, 0) / history.length;
}

function formatFactionCounts(counts: Readonly<Record<string, number>>): string {
  const entries = Object.entries(counts).sort(([firstFaction], [secondFaction]) => {
    return firstFaction.localeCompare(secondFaction);
  });
  return entries.length === 0
    ? "-"
    : entries.map(([factionId, count]) => `${factionId} ${count}`).join(", ");
}

function formatFactionAverages(counts: Readonly<Record<string, number>>): string {
  const entries = Object.entries(counts).sort(([firstFaction], [secondFaction]) => {
    return firstFaction.localeCompare(secondFaction);
  });
  return entries.length === 0
    ? "-"
    : entries.map(([factionId, count]) => `${factionId} ${count.toFixed(1)}`).join(", ");
}

function formatFactionCountsForFactions(
  counts: Readonly<Record<string, number>>,
  factionIds: readonly FactionId[]
): string {
  return factionIds.map((factionId) => `${factionId} ${counts[factionId] ?? 0}`).join(", ");
}

function formatFactionAveragesForFactions(
  counts: Readonly<Record<string, number>>,
  factionIds: readonly FactionId[]
): string {
  return factionIds
    .map((factionId) => `${factionId} ${(counts[factionId] ?? 0).toFixed(1)}`)
    .join(", ");
}

function formatReasonCounts(counts: Readonly<Record<string, number>>): string {
  const entries = Object.entries(counts).sort(([firstReason], [secondReason]) => {
    return firstReason.localeCompare(secondReason);
  });

  if (entries.length === 0) {
    return "-";
  }

  return entries.map(([reason, count]) => `${reason} ${count}`).join(", ");
}

function formatFinalProductiveNodes(
  content: SimulationContent,
  state: GameState
): readonly string[] {
  const lines = content.nodes
    .filter((node) => node.type === "tritium" || node.type === "shipyard")
    .map((node) => {
      const occupancies = state.nodeOccupancies
        .filter((occupancy) => occupancy.nodeId === node.id && occupancy.shipCount > 0)
        .map((occupancy) => `${occupancy.factionId}:${occupancy.shipCount}`)
        .join(", ");
      return `${node.id} (${node.type}): ${occupancies || "-"}`;
    });

  return lines.length === 0 ? ["-"] : lines;
}

function formatFinalShipyardProgress(state: GameState): readonly string[] {
  if (state.shipyardProgress.length === 0) {
    return ["-"];
  }

  return state.shipyardProgress
    .map((entry) =>
      `${entry.nodeId}: ${entry.progress}/${shipyardCompletionProgress} ${
        entry.workerFactionId ?? ""
      }`.trim()
    )
    .sort();
}

function formatMajorEvents(majorEvents: readonly string[]): readonly string[] {
  const compactEvents = majorEvents.filter((event) => event.trim() !== "");

  if (compactEvents.length === 0) {
    return ["-"];
  }

  return compactEvents.slice(-80);
}

function formatMajorDebugEvent(content: SimulationContent, event: TurnDebugEvent): string {
  const nodeLabel =
    event.nodeId === undefined ? "" : ` ${getNodeDisplayName(content, event.nodeId)}`;

  switch (event.type) {
    case "SHIP_PRODUCED":
    case "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED":
    case "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION":
    case "NODE_STACKING_INVARIANT_VIOLATION":
    case "MANDATORY_LAUNCH":
    case "MANDATORY_LAUNCH_DESTROYED":
    case "FIRE_LAUNCHED":
    case "MISSILE_IMPACT":
    case "MISSILE_SOLUTION_BROKEN":
    case "SHIP_DESTROYED":
    case "WRECK_FIELD_CREATED":
    case "EVADE":
    case "AI_EVADE_FAILED":
    case "AI_COMBO_EXECUTED":
    case "ALPHA_STRIKE_THREAT":
    case "AI_TRITIUM_FALLBACK_ASSIGNED":
    case "CONTESTED_UPKEEP_FAILED":
      return `T${event.turn} ${event.factionId ?? "-"} ${event.type}${nodeLabel}`;
    default:
      return "";
  }
}

function getSyntheticMajorEvents(
  content: SimulationContent,
  previousState: GameState,
  nextState: GameState
): readonly string[] {
  const events: string[] = [];
  const previousContested = new Set(getContestedNodeIds(previousState.nodeOccupancies));
  const nextContested = new Set(getContestedNodeIds(nextState.nodeOccupancies));

  for (const nodeId of nextContested) {
    if (!previousContested.has(nodeId)) {
      events.push(`T${nextState.turn} contested started ${getNodeDisplayName(content, nodeId)}`);
    }
  }

  for (const nodeId of previousContested) {
    if (!nextContested.has(nodeId)) {
      events.push(`T${nextState.turn} contested ended ${getNodeDisplayName(content, nodeId)}`);
    }
  }

  for (const factionId of ["player", "opponent"] as const) {
    if (getFactionDv(previousState, factionId) > 0 && getFactionDv(nextState, factionId) === 0) {
      events.push(`T${nextState.turn} ${factionId} ΔV reached zero`);
    }

    if (
      getFactionOccupiedTritiumNodeIds(content, previousState, factionId).length > 0 &&
      getFactionOccupiedTritiumNodeIds(content, nextState, factionId).length === 0
    ) {
      events.push(`T${nextState.turn} ${factionId} lost access to tritium`);
    }
  }

  return events;
}

function getFactionOccupiedTritiumNodeIds(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly string[] {
  return content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => hasFactionShipAtNode(state, node.id, factionId))
    .map((node) => node.id);
}

function getFactionOccupiedProductiveNodeIds(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly string[] {
  return content.nodes
    .filter(isProductiveNode)
    .filter((node) => hasFactionShipAtNode(state, node.id, factionId))
    .map((node) => node.id);
}

function getFactionProductiveShipCount(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  const productiveNodeIds = new Set(content.nodes.filter(isProductiveNode).map((node) => node.id));

  return state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        productiveNodeIds.has(occupancy.nodeId)
      );
    })
    .reduce((total, occupancy) => total + occupancy.shipCount, 0);
}

function getFactionStagingShipCount(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  const stagingNodeIds = new Set(
    content.nodes
      .filter((node) => node.type === "barren" || node.type === "protected")
      .map((node) => node.id)
  );

  return state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        stagingNodeIds.has(occupancy.nodeId)
      );
    })
    .reduce((total, occupancy) => total + occupancy.shipCount, 0);
}

function getFactionAdvancingShipyardCount(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  return content.nodes
    .filter((node) => node.type === "shipyard")
    .filter((node) => {
      const progress = state.shipyardProgress.find((candidate) => candidate.nodeId === node.id);

      return (
        progress !== undefined &&
        progress.workerFactionId === factionId &&
        progress.progress >= shipyardCompletionProgress - 3
      );
    }).length;
}

function getFactionMaxShipyardProgress(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  return content.nodes
    .filter((node) => node.type === "shipyard")
    .map((node) => {
      const progress = state.shipyardProgress.find((candidate) => candidate.nodeId === node.id);

      return progress?.workerFactionId === factionId ? progress.progress : 0;
    })
    .reduce((maxProgress, progress) => Math.max(maxProgress, progress), 0);
}

function isProductiveNode(node: SimulationContent["nodes"][number]): boolean {
  return node.type === "tritium" || node.type === "shipyard";
}

function getNodeWorkValue(node: SimulationContent["nodes"][number]): number {
  if (node.type === "tritium") {
    return tritiumWorkOutput;
  }

  return node.type === "shipyard" ? 2 : 0;
}

function getAiExpectedDeniedWorkValue(
  state: GameState,
  node: SimulationContent["nodes"][number],
  targetFactionId: FactionId
): number {
  if (
    !hasFactionShipAtNode(state, node.id, targetFactionId) ||
    isNodeContested(state.nodeOccupancies, node.id) ||
    hasPendingAction(state, node.id, targetFactionId)
  ) {
    return 0;
  }

  if (node.type === "shipyard") {
    const progress = getShipyardProgress(state.shipyardProgress, node.id);
    return 2 + (progress >= shipyardCompletionProgress - 2 ? 3 : 0);
  }

  return getNodeWorkValue(node);
}

function getAiPotentialWorkOpportunityValue(
  state: GameState,
  node: SimulationContent["nodes"][number],
  factionId: FactionId
): number {
  if (
    !hasFactionShipAtNode(state, node.id, factionId) ||
    isNodeContested(state.nodeOccupancies, node.id) ||
    hasPendingAction(state, node.id, factionId)
  ) {
    return 0;
  }

  if (node.type === "shipyard") {
    const progress = getShipyardProgress(state.shipyardProgress, node.id);
    return 2 + (progress >= shipyardCompletionProgress - 2 ? 3 : 0);
  }

  return getNodeWorkValue(node);
}

export function applyCommand(
  state: GameState,
  command: GameCommand,
  content?: SimulationContent
): GameState {
  switch (command.type) {
    case "ADVANCE_TURN":
      return advanceTurn(state, content);
    case "ASSIGN_BURN_ORDER":
      return assignPendingBurnOrder(state, command, content);
    case "ASSIGN_FIRE_ORDER":
      return assignPendingFireOrder(state, command, content);
    case "CANCEL_PENDING_BURN_ORDER":
      return cancelPendingBurnOrder(state, command);
    case "CANCEL_PENDING_FIRE_ORDER":
      return cancelPendingFireOrder(state, command);
    case "REDIRECT_ACTIVE_BURN":
      return redirectActiveBurn(state, command, content);
  }
}

export function advanceTurn(
  state: GameState,
  content?: SimulationContent,
  aiControlledFactions?: readonly FactionId[],
  aiPlanningOptions: AiPlanningOptions = {}
): GameState {
  const effectiveAiControlledFactions = aiControlledFactions ?? getAiFactionIds(state);
  const hasHumanMandatoryLaunch = state.mandatoryLaunches.some((launch) => {
    return !effectiveAiControlledFactions.includes(launch.factionId);
  });

  if (state.mandatoryLaunches.length > 0 && (content === undefined || hasHumanMandatoryLaunch)) {
    return state;
  }

  const mandatoryLaunchResolution =
    content === undefined
      ? { state, debugEvents: [] as TurnDebugEvent[] }
      : resolveAiMandatoryLaunchesAtTurnStart(content, state, effectiveAiControlledFactions);
  const turnStartState = mandatoryLaunchResolution.state;
  const enemyPlan =
    content === undefined
      ? {
          state: turnStartState,
          debugEvents: [],
          skippedWorkShipKeys: [],
          audit: createEmptyTurnPlanningAudit(turnStartState)
        }
      : planAiFactionsTurn(
          turnStartState,
          content,
          effectiveAiControlledFactions,
          aiPlanningOptions
        );
  const plannedState = enemyPlan.state;
  const nextTurn = plannedState.turn + 1;
  let nodeOccupancies = [...plannedState.nodeOccupancies];
  let factionDv: FactionDvReserve = { ...plannedState.factionDv };
  let shipyardProgress = [...plannedState.shipyardProgress];
  let mandatoryLaunches = [...plannedState.mandatoryLaunches];
  const debugEvents: TurnDebugEvent[] = [
    ...mandatoryLaunchResolution.debugEvents,
    ...enemyPlan.debugEvents
  ];
  const automaticMandatoryLaunchOrders: PendingBurnOrder[] = [];
  const departingTransits: ActiveBurnTransit[] = [];
  const continuingActiveBurnTransits: ActiveBurnTransit[] = [];
  const arrivedShipCounts = new Map<string, number>();
  const priorityBurnImmediateArrivals: PendingBurnOrder[] = [];
  const orderedShipKeys = new Set(
    [...plannedState.pendingBurnOrders, ...plannedState.pendingFireOrders].map((order) =>
      createNodeFactionKey(order.originNodeId, order.factionId)
    )
  );
  const activeMissiles: ActiveMissile[] = [];
  const evadedShipKeys = new Set<string>();
  const destroyedShipKeys = new Set<string>();
  const destroyedTransitIds = new Set<string>();
  const skippedWorkShipKeys = new Set<string>(enemyPlan.skippedWorkShipKeys);
  const burnAwayOrderIds = new Set<string>();
  const burnAwayShipKeys = new Set<string>();
  const preResolvedBurnOrderIds = new Set<string>();
  const preResolvedBurnAwayOrdersByTarget = new Map<string, PendingBurnOrder>();
  const suspendedShipyardProductionNodeIds = new Set<string>();
  const reservedBurnAwayDv = createFactionNumberRecord(getActiveFactionIds(plannedState));
  const activeMissilesByTarget = new Map<string, ActiveMissile[]>();
  const contestedNodeIdsAtTurnStart = new Set(
    nodeOccupancies
      .filter((occupancy) => {
        return occupancy.shipCount > 0 && isNodeContested(nodeOccupancies, occupancy.nodeId);
      })
      .map((occupancy) => occupancy.nodeId)
  );
  const contestedShipKeysAtTurnStart = new Set(
    nodeOccupancies
      .filter((occupancy) => {
        return occupancy.shipCount > 0 && contestedNodeIdsAtTurnStart.has(occupancy.nodeId);
      })
      .map((occupancy) => createNodeFactionKey(occupancy.nodeId, occupancy.factionId))
  );

  const contestedUpkeepResult = applyContestedUpkeep(
    nodeOccupancies,
    factionDv,
    debugEvents,
    nextTurn,
    content
  );
  nodeOccupancies = contestedUpkeepResult.nodeOccupancies;
  factionDv = contestedUpkeepResult.factionDv;
  for (const destroyedShipKey of contestedUpkeepResult.destroyedShipKeys) {
    destroyedShipKeys.add(destroyedShipKey);
  }

  for (const order of [...plannedState.pendingBurnOrders]
    .filter((candidate) => candidate.mandatoryLaunchId !== undefined)
    .sort(comparePendingBurnOrdersForResolution)) {
    const occupancy = nodeOccupancies.find((candidate) => {
      return candidate.nodeId === order.originNodeId && candidate.factionId === order.factionId;
    });

    if (occupancy === undefined || occupancy.shipCount < order.shipCount) {
      preResolvedBurnOrderIds.add(order.id);
      continue;
    }

    const availableDv = getFactionDv({ factionDv }, order.factionId);

    if (availableDv < order.burnCost) {
      preResolvedBurnOrderIds.add(order.id);
      if (occupancy.shipCount > 1) {
        nodeOccupancies = adjustNodeOccupancy(
          nodeOccupancies,
          order.originNodeId,
          order.factionId,
          -1
        );
      }
      shipyardProgress = setShipyardProgress(
        shipyardProgress,
        order.originNodeId,
        shipyardCompletionProgress - 1,
        order.factionId
      );
      debugEvents.push(
        createShipyardProductionCheckEvent(
          nextTurn,
          order.originNodeId,
          order.factionId,
          getShipyardProductionOccupancyStatus(
            nodeOccupancies,
            [],
            [],
            factionDv,
            nextTurn,
            order.originNodeId,
            new Set()
          ),
          shipyardCompletionProgress - 1,
          shipyardCompletionProgress - 1,
          false,
          "mandatory-launch-reserve-lost"
        )
      );
      continue;
    }

    preResolvedBurnOrderIds.add(order.id);
    factionDv = adjustFactionDv(factionDv, order.factionId, -order.burnCost);
    debugEvents.push({
      turn: nextTurn,
      type: "BURN_DEPARTED",
      message: `Burn cost -${order.burnCost} ΔV`,
      nodeId: order.originNodeId,
      factionId: order.factionId,
      destinationNodeId: order.destinationNodeId,
      burnCost: order.burnCost,
      etaTurns: order.etaTurns,
      ...(order.mandatoryLaunchId === undefined
        ? {}
        : { mandatoryLaunchId: order.mandatoryLaunchId })
    });

    const isFullFactionDeparture = occupancy.shipCount <= order.shipCount;
    nodeOccupancies = adjustNodeOccupancy(
      nodeOccupancies,
      order.originNodeId,
      order.factionId,
      -order.shipCount
    );

    if (isFullFactionDeparture) {
      preResolvedBurnAwayOrdersByTarget.set(
        createNodeFactionKey(order.originNodeId, order.factionId),
        order
      );
      burnAwayOrderIds.add(order.id);
    }

    if (order.arrivalTurn <= nextTurn) {
      priorityBurnImmediateArrivals.push(order);
      continue;
    }

    departingTransits.push({
      ...order,
      departedTurn: plannedState.turn
    });
  }

  for (const missile of plannedState.activeMissiles) {
    const targetKey = createNodeFactionKey(missile.targetNodeId, missile.targetFactionId);

    if (destroyedShipKeys.has(targetKey)) {
      continue;
    }

    activeMissilesByTarget.set(targetKey, [
      ...(activeMissilesByTarget.get(targetKey) ?? []),
      missile
    ]);
  }

  for (const [targetKey, missiles] of [...activeMissilesByTarget.entries()].sort((first, second) =>
    first[0].localeCompare(second[0])
  )) {
    if (destroyedShipKeys.has(targetKey)) {
      continue;
    }

    const missile = missiles[0];

    if (missile === undefined) {
      continue;
    }

    const burnAwayOrder =
      preResolvedBurnAwayOrdersByTarget.get(targetKey) ??
      getPendingBurnAwayOrder(
        plannedState,
        nodeOccupancies,
        missile.targetNodeId,
        missile.targetFactionId,
        preResolvedBurnOrderIds
      );

    if (burnAwayOrder === undefined) {
      continue;
    }

    if (!preResolvedBurnOrderIds.has(burnAwayOrder.id)) {
      const availableDv =
        getFactionDv({ factionDv }, burnAwayOrder.factionId) -
        (reservedBurnAwayDv[burnAwayOrder.factionId] ?? 0);

      if (availableDv < burnAwayOrder.burnCost) {
        continue;
      }

      reservedBurnAwayDv[burnAwayOrder.factionId] =
        (reservedBurnAwayDv[burnAwayOrder.factionId] ?? 0) + burnAwayOrder.burnCost;
    }
    burnAwayOrderIds.add(burnAwayOrder.id);
    burnAwayShipKeys.add(targetKey);
    debugEvents.push({
      turn: nextTurn,
      type: "MISSILE_SOLUTION_BROKEN",
      message: `Burn away from ${getNodeDisplayName(content, missile.targetNodeId)} broke incoming missile solutions`,
      nodeId: missile.targetNodeId,
      factionId: missile.targetFactionId,
      amount: 0,
      burnCost: burnAwayOrder.burnCost
    });
  }

  for (const missile of plannedState.activeMissiles) {
    const targetKey = createNodeFactionKey(missile.targetNodeId, missile.targetFactionId);

    if (burnAwayShipKeys.has(targetKey) || destroyedShipKeys.has(targetKey)) {
      continue;
    }

    if (missile.impactTurn > nextTurn) {
      activeMissiles.push(missile);
      continue;
    }

    const targetOccupancy = getMissileImpactTargetOccupancy(nodeOccupancies, missile);
    const targetTransit =
      targetOccupancy === undefined
        ? getMissileTargetArrivingTransit(
            plannedState.activeBurnTransits,
            missile,
            nextTurn,
            destroyedTransitIds
          )
        : undefined;

    if (targetOccupancy === undefined && targetTransit === undefined) {
      debugEvents.push({
        turn: nextTurn,
        type: "MISSILE_MISSED",
        message: `Missile found no target at ${getNodeDisplayName(content, missile.targetNodeId)}`,
        nodeId: missile.targetNodeId,
        factionId: missile.targetFactionId,
        missileId: missile.id
      });
      continue;
    }

    const evadeIsAvailable =
      !contestedShipKeysAtTurnStart.has(targetKey) &&
      getFactionDv({ factionDv }, missile.targetFactionId) -
        (reservedBurnAwayDv[missile.targetFactionId] ?? 0) >=
        automaticEvadeDvCost;

    if (evadeIsAvailable) {
      if (
        content !== undefined &&
        effectiveAiControlledFactions.includes(missile.targetFactionId)
      ) {
        const evadeForecast = getAiActionSolvencyForecast(
          content,
          {
            ...plannedState,
            factionDv,
            nodeOccupancies
          },
          missile.targetFactionId,
          {
            action: "EVADE",
            originNodeId: missile.targetNodeId,
            actionCost: automaticEvadeDvCost,
            lostWorkCost:
              getNodeById(content, missile.targetNodeId)?.type === "tritium"
                ? tritiumWorkOutput
                : getNodeById(content, missile.targetNodeId)?.type === "shipyard"
                  ? 2
                  : 0
          }
        );
        debugEvents.push(
          ...createAiActionSolvencyForecastEvents(
            content,
            nextTurn,
            missile.targetFactionId,
            missile.targetNodeId,
            evadeForecast,
            { targetNodeId: missile.targetNodeId }
          )
        );
      }
      factionDv = adjustFactionDv(factionDv, missile.targetFactionId, -automaticEvadeDvCost);
      evadedShipKeys.add(targetKey);
      debugEvents.push({
        turn: nextTurn,
        type: "EVADE",
        message: `Evade at ${getNodeDisplayName(content, missile.targetNodeId)} absorbed incoming missile: -${automaticEvadeDvCost} ΔV`,
        nodeId: missile.targetNodeId,
        factionId: missile.targetFactionId,
        missileId: missile.id,
        amount: -automaticEvadeDvCost
      });
      continue;
    }

    const destroyedFactionId = targetOccupancy?.factionId ?? targetTransit?.factionId;

    if (destroyedFactionId === undefined) {
      continue;
    }

    if (targetTransit === undefined) {
      nodeOccupancies = adjustNodeOccupancy(
        nodeOccupancies,
        missile.targetNodeId,
        destroyedFactionId,
        -1
      );
    } else {
      destroyedTransitIds.add(targetTransit.id);
    }

    const destroyedShipKey = createNodeFactionKey(missile.targetNodeId, destroyedFactionId);
    destroyedShipKeys.add(destroyedShipKey);
    const cleanupResult = removeDestroyedShipReferences(
      plannedState,
      activeMissiles,
      missile.targetNodeId,
      destroyedFactionId
    );
    activeMissiles.splice(0, activeMissiles.length, ...cleanupResult.activeMissiles);
    debugEvents.push({
      turn: nextTurn,
      type: "MISSILE_IMPACT",
      message: `Missile impact at ${getNodeDisplayName(content, missile.targetNodeId)}`,
      nodeId: missile.targetNodeId,
      factionId: destroyedFactionId,
      missileId: missile.id
    });
    debugEvents.push({
      turn: nextTurn,
      type: "SHIP_DESTROYED",
      message: `Ship destroyed at ${getNodeDisplayName(content, missile.targetNodeId)}`,
      nodeId: missile.targetNodeId,
      factionId: destroyedFactionId
    });
    debugEvents.push({
      turn: nextTurn,
      type: "WRECK_FIELD_CREATED",
      message: `Wreck field created at ${getNodeDisplayName(content, missile.targetNodeId)}`,
      nodeId: missile.targetNodeId,
      factionId: destroyedFactionId
    });
    evadedShipKeys.delete(destroyedShipKey);
  }

  for (const transit of plannedState.activeBurnTransits) {
    if (destroyedTransitIds.has(transit.id)) {
      continue;
    }

    if (transit.arrivalTurn <= nextTurn) {
      nodeOccupancies = adjustNodeOccupancy(
        nodeOccupancies,
        transit.destinationNodeId,
        transit.factionId,
        transit.shipCount
      );
      recordArrivedShips(
        arrivedShipCounts,
        transit.destinationNodeId,
        transit.factionId,
        transit.shipCount
      );
      continue;
    }

    continuingActiveBurnTransits.push(transit);
  }

  for (const order of priorityBurnImmediateArrivals) {
    nodeOccupancies = adjustNodeOccupancy(
      nodeOccupancies,
      order.destinationNodeId,
      order.factionId,
      order.shipCount
    );
    recordArrivedShips(
      arrivedShipCounts,
      order.destinationNodeId,
      order.factionId,
      order.shipCount
    );
  }

  for (const order of plannedState.pendingFireOrders) {
    const targetKey = createNodeFactionKey(order.targetNodeId, order.targetFactionId);
    const pendingTargetBurnAway =
      preResolvedBurnAwayOrdersByTarget.get(targetKey) ??
      getPendingBurnAwayOrder(
        plannedState,
        nodeOccupancies,
        order.targetNodeId,
        order.targetFactionId,
        preResolvedBurnOrderIds
      );
    const pendingTargetBurnIsAffordable =
      pendingTargetBurnAway !== undefined &&
      (preResolvedBurnOrderIds.has(pendingTargetBurnAway.id) ||
        getFactionDv({ factionDv }, pendingTargetBurnAway.factionId) >=
          pendingTargetBurnAway.burnCost);
    const shooterOccupancy = nodeOccupancies.find((candidate) => {
      return candidate.nodeId === order.originNodeId && candidate.factionId === order.factionId;
    });
    const targetStillExists =
      !destroyedShipKeys.has(createNodeFactionKey(order.targetNodeId, order.targetFactionId)) &&
      hasFireOrderTargetReference(
        plannedState,
        nodeOccupancies,
        plannedState.activeBurnTransits,
        order,
        destroyedTransitIds
      );

    if (pendingTargetBurnIsAffordable) {
      debugEvents.push({
        turn: nextTurn,
        type: "MISSILE_SOLUTION_BROKEN",
        message: `Burn away from ${getNodeDisplayName(content, order.targetNodeId)} broke the pending FIRE solution`,
        nodeId: order.targetNodeId,
        factionId: order.targetFactionId,
        amount: 0,
        burnCost: pendingTargetBurnAway.burnCost
      });
      continue;
    }

    if (
      burnAwayShipKeys.has(targetKey) ||
      shooterOccupancy === undefined ||
      shooterOccupancy.shipCount <= 0 ||
      !targetStillExists
    ) {
      continue;
    }

    activeMissiles.push({
      ...order,
      launchedTurn: nextTurn
    });
    debugEvents.push({
      turn: nextTurn,
      type: "FIRE_LAUNCHED",
      message: `Missile launched from ${getNodeDisplayName(content, order.originNodeId)} to ${getNodeDisplayName(content, order.targetNodeId)}`,
      nodeId: order.originNodeId,
      factionId: order.factionId,
      targetNodeId: order.targetNodeId,
      missileEtaTurns: order.missileEtaTurns
    });
  }

  const plannedBurnOrders = [...plannedState.pendingBurnOrders]
    .filter((order) => !preResolvedBurnOrderIds.has(order.id))
    .sort((first, second) => {
      const firstIsBurnAway = burnAwayOrderIds.has(first.id);
      const secondIsBurnAway = burnAwayOrderIds.has(second.id);

      if (firstIsBurnAway !== secondIsBurnAway) {
        return firstIsBurnAway ? -1 : 1;
      }

      return first.id.localeCompare(second.id);
    });

  for (const order of plannedBurnOrders) {
    const occupancy = nodeOccupancies.find((candidate) => {
      return candidate.nodeId === order.originNodeId && candidate.factionId === order.factionId;
    });

    if (occupancy === undefined || occupancy.shipCount < order.shipCount) {
      continue;
    }

    const availableDv = getFactionDv({ factionDv }, order.factionId);

    if (availableDv < order.burnCost) {
      debugEvents.push({
        turn: nextTurn,
        type: "BURN_FAILED",
        message: `Burn failed at ${getNodeDisplayName(content, order.originNodeId)}: insufficient ΔV`,
        nodeId: order.originNodeId,
        factionId: order.factionId,
        burnCost: order.burnCost,
        ...(order.mandatoryLaunchId === undefined
          ? {}
          : { mandatoryLaunchId: order.mandatoryLaunchId })
      });
      continue;
    }

    factionDv = adjustFactionDv(factionDv, order.factionId, -order.burnCost);
    debugEvents.push({
      turn: nextTurn,
      type: "BURN_DEPARTED",
      message: `Burn cost -${order.burnCost} ΔV`,
      nodeId: order.originNodeId,
      factionId: order.factionId,
      destinationNodeId: order.destinationNodeId,
      burnCost: order.burnCost,
      etaTurns: order.etaTurns,
      ...(order.mandatoryLaunchId === undefined
        ? {}
        : { mandatoryLaunchId: order.mandatoryLaunchId })
    });

    nodeOccupancies = adjustNodeOccupancy(
      nodeOccupancies,
      order.originNodeId,
      order.factionId,
      -order.shipCount
    );

    const departingTransit = {
      ...order,
      departedTurn: plannedState.turn
    };

    if (order.arrivalTurn <= nextTurn) {
      nodeOccupancies = adjustNodeOccupancy(
        nodeOccupancies,
        order.destinationNodeId,
        order.factionId,
        order.shipCount
      );
      recordArrivedShips(
        arrivedShipCounts,
        order.destinationNodeId,
        order.factionId,
        order.shipCount
      );
      continue;
    }

    departingTransits.push(departingTransit);
  }

  if (content !== undefined) {
    for (const occupancy of nodeOccupancies) {
      const occupancyKey = createNodeFactionKey(occupancy.nodeId, occupancy.factionId);
      // Same-turn arrivals can contest, but cannot perform WORK until the next turn.
      const arrivedOnly = hasOnlyArrivedShips(arrivedShipCounts, occupancy);

      if (
        occupancy.shipCount <= 0 ||
        orderedShipKeys.has(occupancyKey) ||
        evadedShipKeys.has(occupancyKey) ||
        skippedWorkShipKeys.has(occupancyKey) ||
        arrivedOnly
      ) {
        continue;
      }

      const node = content.nodes.find((candidate) => candidate.id === occupancy.nodeId);

      if (node === undefined) {
        continue;
      }

      if (
        node.type !== "shipyard" &&
        (isNodeContested(nodeOccupancies, node.id) || contestedNodeIdsAtTurnStart.has(node.id))
      ) {
        continue;
      }

      if (node.type === "tritium") {
        factionDv = adjustFactionDv(factionDv, occupancy.factionId, tritiumWorkOutput);
        debugEvents.push({
          turn: nextTurn,
          type: "TRITIUM_INCOME",
          message: `+${tritiumWorkOutput} ΔV from ${getNodeDisplayName(content, node.id)}`,
          nodeId: node.id,
          factionId: occupancy.factionId,
          amount: tritiumWorkOutput
        });
        continue;
      }

      if (node.type === "shipyard") {
        const progressBefore = getShipyardProgress(shipyardProgress, node.id);
        const productionOccupancy = getShipyardProductionOccupancyStatus(
          nodeOccupancies,
          [],
          [],
          factionDv,
          nextTurn,
          node.id,
          burnAwayOrderIds
        );
        const contestBlocksProduction =
          contestedNodeIdsAtTurnStart.has(node.id) || productionOccupancy.isContested;
        const contestBlockReason = contestedNodeIdsAtTurnStart.has(node.id)
          ? "contested-at-turn-start"
          : "contested";
        const blockedProductionOccupancy =
          contestBlocksProduction && !productionOccupancy.isContested
            ? { ...productionOccupancy, isContested: true }
            : productionOccupancy;

        if (contestBlocksProduction) {
          if (
            progressBefore >= shipyardCompletionProgress - 1 &&
            !suspendedShipyardProductionNodeIds.has(node.id)
          ) {
            suspendedShipyardProductionNodeIds.add(node.id);
            debugEvents.push(
              createShipyardProductionCheckEvent(
                nextTurn,
                node.id,
                occupancy.factionId,
                blockedProductionOccupancy,
                progressBefore,
                progressBefore,
                false,
                contestBlockReason
              )
            );
            debugEvents.push({
              turn: nextTurn,
              type: "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED",
              message: `${getNodeDisplayName(content, node.id)} Shipyard production suspended: contested`,
              nodeId: node.id,
              factionId: occupancy.factionId,
              reason: contestBlockReason,
              progressBefore,
              progressAfter: progressBefore,
              occupantsByFaction: blockedProductionOccupancy.occupantsByFaction,
              contested: true,
              productionAllowed: false
            });
          }
          continue;
        }

        if (!productionOccupancy.occupyingFactionIds.includes(occupancy.factionId)) {
          continue;
        }

        const previousWorkerFactionId = getShipyardWorkerFactionId(shipyardProgress, node.id);

        if (
          progressBefore > 0 &&
          previousWorkerFactionId !== undefined &&
          previousWorkerFactionId !== occupancy.factionId
        ) {
          debugEvents.push({
            turn: nextTurn,
            type: "SHIPYARD_PROGRESS",
            message: `${getNodeDisplayName(content, node.id)} Shipyard progress captured from ${previousWorkerFactionId} by ${occupancy.factionId}`,
            nodeId: node.id,
            factionId: occupancy.factionId,
            reason: "captured-progress",
            progress: progressBefore,
            progressBefore,
            progressAfter: progressBefore,
            actual: `worker ${occupancy.factionId}`,
            expected: `previous worker ${previousWorkerFactionId}`
          });
        }

        const nextProgress = progressBefore + 1;

        if (nextProgress >= shipyardCompletionProgress) {
          const producedShipId = createProducedShipDebugId(occupancy.factionId, node.id, nextTurn);

          const productionState = {
            ...plannedState,
            turn: nextTurn,
            factionDv,
            nodeOccupancies,
            shipyardProgress,
            pendingBurnOrders: automaticMandatoryLaunchOrders
          };

          if (!effectiveAiControlledFactions.includes(occupancy.factionId)) {
            if (
              hasAffordableMandatoryLaunchDestination(
                content,
                productionState,
                node.id,
                occupancy.factionId
              )
            ) {
              shipyardProgress = setShipyardProgress(shipyardProgress, node.id, 0);
              const mandatoryLaunch = createMandatoryLaunch(
                occupancy.factionId,
                node.id,
                nextTurn,
                mandatoryLaunches.length
              );
              nodeOccupancies = produceShipAtShipyard(
                nodeOccupancies,
                node.id,
                occupancy.factionId
              );
              mandatoryLaunches = [...mandatoryLaunches, mandatoryLaunch];
              debugEvents.push(
                createShipyardProductionCheckEvent(
                  nextTurn,
                  node.id,
                  occupancy.factionId,
                  productionOccupancy,
                  progressBefore,
                  0,
                  true,
                  "ready",
                  producedShipId,
                  mandatoryLaunch.id
                )
              );
              debugEvents.push({
                turn: nextTurn,
                type: "SHIP_PRODUCED",
                message: `Ship produced at ${getNodeDisplayName(content, node.id)}: launch required`,
                nodeId: node.id,
                factionId: occupancy.factionId,
                progress: 0,
                progressBefore,
                progressAfter: 0,
                producedShipId
              });
              debugEvents.push({
                turn: nextTurn,
                type: "MANDATORY_LAUNCH",
                message: `Mandatory launch required at ${getNodeDisplayName(content, node.id)}`,
                nodeId: node.id,
                factionId: occupancy.factionId,
                mandatoryLaunchId: mandatoryLaunch.id
              });
            } else {
              suspendedShipyardProductionNodeIds.add(node.id);
              debugEvents.push(
                createShipyardProductionCheckEvent(
                  nextTurn,
                  node.id,
                  occupancy.factionId,
                  productionOccupancy,
                  progressBefore,
                  progressBefore,
                  false,
                  "mandatory-launch-reserve-unavailable"
                )
              );
            }
            continue;
          }

          const producedOccupancies = produceShipAtShipyard(
            nodeOccupancies,
            node.id,
            occupancy.factionId
          );
          const launchState = {
            ...productionState,
            nodeOccupancies: producedOccupancies,
            pendingBurnOrders: automaticMandatoryLaunchOrders
          };
          const automaticLaunch = chooseMandatoryLaunchBurn(
            content,
            launchState,
            node.id,
            occupancy.factionId,
            `mandatory:${occupancy.factionId}:${node.id}:T${nextTurn}:${automaticMandatoryLaunchOrders.length}`
          );

          if (automaticLaunch !== null) {
            shipyardProgress = setShipyardProgress(shipyardProgress, node.id, 0);
            const automaticLaunchOrder: PendingBurnOrder = {
              ...automaticLaunch.order,
              mandatoryLaunchId: automaticLaunch.order.id
            };
            nodeOccupancies = producedOccupancies;
            automaticMandatoryLaunchOrders.push(automaticLaunchOrder);
            debugEvents.push(
              createShipyardProductionCheckEvent(
                nextTurn,
                node.id,
                occupancy.factionId,
                productionOccupancy,
                progressBefore,
                0,
                true,
                "automatic-launch-ready",
                producedShipId,
                automaticLaunchOrder.id
              )
            );
            debugEvents.push({
              turn: nextTurn,
              type: "SHIP_PRODUCED",
              message: `AI ship produced at ${getNodeDisplayName(content, node.id)}`,
              nodeId: node.id,
              factionId: occupancy.factionId,
              progress: 0,
              progressBefore,
              progressAfter: 0,
              producedShipId
            });
            debugEvents.push({
              turn: nextTurn,
              type: "MANDATORY_LAUNCH",
              message: `AI mandatory launch from ${getNodeDisplayName(content, node.id)} to ${getNodeDisplayName(content, automaticLaunchOrder.destinationNodeId)}`,
              nodeId: node.id,
              factionId: occupancy.factionId,
              action: "MANDATORY_LAUNCH",
              destinationNodeId: automaticLaunchOrder.destinationNodeId,
              burnCost: automaticLaunchOrder.burnCost,
              mandatoryLaunchId: automaticLaunchOrder.id
            });
          } else {
            suspendedShipyardProductionNodeIds.add(node.id);
            debugEvents.push(
              createShipyardProductionCheckEvent(
                nextTurn,
                node.id,
                occupancy.factionId,
                productionOccupancy,
                progressBefore,
                progressBefore,
                false,
                "mandatory-launch-reserve-unavailable"
              )
            );
          }
          continue;
        }

        shipyardProgress = setShipyardProgress(
          shipyardProgress,
          node.id,
          nextProgress,
          occupancy.factionId
        );
        debugEvents.push({
          turn: nextTurn,
          type: "SHIPYARD_PROGRESS",
          message: `${getNodeDisplayName(content, node.id)} Shipyard ${nextProgress}/${shipyardCompletionProgress}`,
          nodeId: node.id,
          factionId: occupancy.factionId,
          progress: nextProgress
        });
      }
    }

    debugEvents.push(
      ...createProductiveAuditEvents(
        content,
        plannedState,
        nextTurn,
        nodeOccupancies,
        orderedShipKeys,
        evadedShipKeys,
        skippedWorkShipKeys,
        contestedNodeIdsAtTurnStart,
        arrivedShipCounts,
        debugEvents
      )
    );
  }

  const pendingBurnOrders = [...automaticMandatoryLaunchOrders].sort((first, second) => {
    const firstIsBurnAway = burnAwayOrderIds.has(first.id);
    const secondIsBurnAway = burnAwayOrderIds.has(second.id);

    if (firstIsBurnAway !== secondIsBurnAway) {
      return firstIsBurnAway ? -1 : 1;
    }

    return first.id.localeCompare(second.id);
  });

  for (const order of pendingBurnOrders) {
    const occupancy = nodeOccupancies.find((candidate) => {
      return candidate.nodeId === order.originNodeId && candidate.factionId === order.factionId;
    });

    if (occupancy === undefined || occupancy.shipCount < order.shipCount) {
      continue;
    }

    const availableDv = getFactionDv({ factionDv }, order.factionId);

    if (availableDv < order.burnCost) {
      if (occupancy.shipCount > 1) {
        nodeOccupancies = adjustNodeOccupancy(
          nodeOccupancies,
          order.originNodeId,
          order.factionId,
          -1
        );
      }
      shipyardProgress = setShipyardProgress(
        shipyardProgress,
        order.originNodeId,
        shipyardCompletionProgress - 1,
        order.factionId
      );
      debugEvents.push(
        createShipyardProductionCheckEvent(
          nextTurn,
          order.originNodeId,
          order.factionId,
          getShipyardProductionOccupancyStatus(
            nodeOccupancies,
            [],
            [],
            factionDv,
            nextTurn,
            order.originNodeId,
            new Set()
          ),
          shipyardCompletionProgress - 1,
          shipyardCompletionProgress - 1,
          false,
          "mandatory-launch-reserve-lost"
        )
      );
      continue;
    }

    factionDv = adjustFactionDv(factionDv, order.factionId, -order.burnCost);
    debugEvents.push({
      turn: nextTurn,
      type: "BURN_DEPARTED",
      message: `Burn cost -${order.burnCost} ΔV`,
      nodeId: order.originNodeId,
      factionId: order.factionId,
      destinationNodeId: order.destinationNodeId,
      burnCost: order.burnCost,
      etaTurns: order.etaTurns,
      ...(order.mandatoryLaunchId === undefined
        ? {}
        : { mandatoryLaunchId: order.mandatoryLaunchId })
    });

    nodeOccupancies = adjustNodeOccupancy(
      nodeOccupancies,
      order.originNodeId,
      order.factionId,
      -order.shipCount
    );
    departingTransits.push({
      ...order,
      departedTurn: plannedState.turn
    });
  }

  const travelingTransits = [...continuingActiveBurnTransits, ...departingTransits];

  const nextState: GameState = {
    ...plannedState,
    turn: nextTurn,
    factionDv,
    nodeOccupancies,
    shipyardProgress,
    pendingBurnOrders: [],
    pendingFireOrders: [],
    mandatoryLaunches,
    activeBurnTransits: travelingTransits,
    activeMissiles,
    debugEvents
  };
  const invariantViolationEvents = createContestedShipyardProductionInvariantViolationEvents(
    content,
    nextState,
    debugEvents
  );
  const nodeStackingInvariantViolationEvents =
    createNonContestedNodeStackingInvariantViolationEvents(content, nextState);
  const finalDebugEvents = [...debugEvents, ...invariantViolationEvents];
  const finalDebugEventsWithNodeStacking = [
    ...finalDebugEvents,
    ...nodeStackingInvariantViolationEvents
  ];
  const postTurnStateHash = hashGameStateForAudit(nextState);
  const shouldEmitTurnAudit = content !== undefined && effectiveAiControlledFactions.length > 1;

  return {
    ...nextState,
    debugEvents: shouldEmitTurnAudit
      ? [
          ...finalDebugEventsWithNodeStacking,
          createSimultaneousTurnAuditEvent(enemyPlan.audit, nextTurn, postTurnStateHash)
        ]
      : finalDebugEventsWithNodeStacking
  };
}

function resolveAiMandatoryLaunchesAtTurnStart(
  content: SimulationContent,
  state: GameState,
  aiControlledFactions: readonly FactionId[]
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  if (state.mandatoryLaunches.length === 0) {
    return { state, debugEvents: [] };
  }

  let nodeOccupancies = [...state.nodeOccupancies];
  let shipyardProgress = [...state.shipyardProgress];
  let mandatoryLaunches = [...state.mandatoryLaunches].sort(compareMandatoryLaunches);
  let pendingBurnOrders = [...state.pendingBurnOrders];
  const debugEvents: TurnDebugEvent[] = [];

  for (const launch of state.mandatoryLaunches
    .filter((candidate) => aiControlledFactions.includes(candidate.factionId))
    .sort(compareMandatoryLaunches)) {
    const launchState: GameState = {
      ...state,
      nodeOccupancies,
      pendingBurnOrders,
      mandatoryLaunches
    };
    const automaticLaunch = chooseMandatoryLaunchBurn(
      content,
      launchState,
      launch.nodeId,
      launch.factionId,
      `mandatory:${launch.factionId}:${launch.nodeId}:T${state.turn}:${pendingBurnOrders.length}`
    );

    mandatoryLaunches = mandatoryLaunches.filter((candidate) => candidate.id !== launch.id);

    if (automaticLaunch !== null) {
      const order: PendingBurnOrder = {
        ...automaticLaunch.order,
        mandatoryLaunchId: launch.id
      };
      pendingBurnOrders = [...pendingBurnOrders, order];
      debugEvents.push({
        turn: state.turn,
        type: "MANDATORY_LAUNCH",
        message: `AI mandatory launch from ${getNodeDisplayName(content, launch.nodeId)} to ${getNodeDisplayName(content, order.destinationNodeId)}`,
        nodeId: launch.nodeId,
        factionId: launch.factionId,
        action: "MANDATORY_LAUNCH",
        destinationNodeId: order.destinationNodeId,
        burnCost: order.burnCost,
        mandatoryLaunchId: launch.id
      });
      continue;
    }

    const launchOccupancy = nodeOccupancies.find((occupancy) => {
      return occupancy.nodeId === launch.nodeId && occupancy.factionId === launch.factionId;
    });

    if ((launchOccupancy?.shipCount ?? 0) > 1) {
      nodeOccupancies = adjustNodeOccupancy(nodeOccupancies, launch.nodeId, launch.factionId, -1);
    }
    shipyardProgress = setShipyardProgress(
      shipyardProgress,
      launch.nodeId,
      shipyardCompletionProgress - 1,
      launch.factionId
    );
    debugEvents.push(
      createShipyardProductionCheckEvent(
        state.turn,
        launch.nodeId,
        launch.factionId,
        getShipyardProductionOccupancyStatus(
          nodeOccupancies,
          [],
          [],
          state.factionDv,
          state.turn,
          launch.nodeId,
          new Set()
        ),
        shipyardCompletionProgress - 1,
        shipyardCompletionProgress - 1,
        false,
        "mandatory-launch-reserve-lost"
      )
    );
  }

  return {
    state: {
      ...state,
      nodeOccupancies,
      shipyardProgress,
      pendingBurnOrders,
      mandatoryLaunches
    },
    debugEvents
  };
}

export function calculateBurnPlan(
  content: SimulationContent,
  turnOrState: number | Readonly<{ turn: number }>,
  originNodeId: string,
  destinationNodeId: string
): BurnPlan | null {
  recordSimulationPerformanceCounter("calculateBurnPlan");

  if (originNodeId === destinationNodeId) {
    return null;
  }

  const originNode = content.nodes.find((node) => node.id === originNodeId);
  const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);

  if (originNode === undefined || destinationNode === undefined) {
    return null;
  }

  const issuedTurn = typeof turnOrState === "number" ? turnOrState : turnOrState.turn;
  const cache = getBurnPlanCache(content);
  const cacheKey = getBurnPlanCacheKey(issuedTurn, originNodeId, destinationNodeId);
  const cachedPlan = cache.get(cacheKey);

  if (cachedPlan !== undefined || cache.has(cacheKey)) {
    return cachedPlan ?? null;
  }

  const originPosition = computeBodyPosition(content, originNode.bodyId, issuedTurn);
  const plan = calculateBurnPlanFromPosition(
    content,
    issuedTurn,
    originNodeId,
    destinationNodeId,
    originPosition
  );

  if (cache.size >= maxBurnPlanCacheEntriesPerContent) {
    cache.clear();
  }

  cache.set(cacheKey, plan);
  return plan;
}

function getBurnPlanCache(content: SimulationContent): Map<string, BurnPlan | null> {
  const existing = burnPlanCacheByContent.get(content);

  if (existing !== undefined) {
    return existing;
  }

  const cache = new Map<string, BurnPlan | null>();
  burnPlanCacheByContent.set(content, cache);
  return cache;
}

function getBurnPlanCacheKey(
  issuedTurn: number,
  originNodeId: string,
  destinationNodeId: string
): string {
  return `${issuedTurn}:${originNodeId}->${destinationNodeId}`;
}

export function calculateFirePlan(
  content: SimulationContent,
  turnOrState: number | Readonly<{ turn: number }>,
  originNodeId: string,
  targetNodeId: string
): FirePlan | null {
  const originNode = content.nodes.find((node) => node.id === originNodeId);

  if (originNode?.weaponsOffline === true) {
    return null;
  }

  const burnEquivalent = calculateBurnPlan(content, turnOrState, originNodeId, targetNodeId);

  if (burnEquivalent === null) {
    return null;
  }

  const issuedTurn = typeof turnOrState === "number" ? turnOrState : turnOrState.turn;
  const missileEtaTurns = burnEquivalent.etaTurns;
  const impactTurn = issuedTurn + missileEtaTurns;
  const targetNode = content.nodes.find((node) => node.id === targetNodeId);

  if (targetNode === undefined) {
    return null;
  }

  return {
    originNodeId,
    targetNodeId,
    missileEtaTurns,
    issuedTurn,
    impactTurn,
    originPosition: burnEquivalent.originPosition,
    targetPositionAtImpact: computeBodyPosition(content, targetNode.bodyId, impactTurn),
    transferCategory: burnEquivalent.transferCategory ?? "intersystem",
    transferWindowQuality: burnEquivalent.transferWindowQuality ?? "neutral",
    motionRelation: burnEquivalent.motionRelation ?? "neutral",
    visualArcType: burnEquivalent.visualArcType ?? "strategic-arc",
    visualArcHeight: burnEquivalent.visualArcHeight ?? 0,
    transferDifficultyScore: burnEquivalent.transferDifficultyScore ?? burnEquivalent.etaTurns,
    energyScore: burnEquivalent.energyScore ?? burnEquivalent.burnCost
  };
}

export type TransferRouteDebug = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  currentTurn: number;
  currentDestinationPosition: Vec2;
  predictedDestinationPositionAtArrival: Vec2;
  transferTurns: number;
  burnCost: number;
  windowQuality: TransferWindowQuality;
  motionRelation: TransferMotionRelation;
  visualArcType: TransferVisualArcType;
  zHeight: number;
  transferDifficultyScore: number;
  energyScore: number;
}>;

export function describeTransferRoute(
  content: SimulationContent,
  turnOrState: number | Readonly<{ turn: number }>,
  originNodeId: string,
  destinationNodeId: string
): TransferRouteDebug | null {
  const currentTurn = typeof turnOrState === "number" ? turnOrState : turnOrState.turn;
  const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);
  const plan = calculateBurnPlan(content, turnOrState, originNodeId, destinationNodeId);

  if (destinationNode === undefined || plan === null) {
    return null;
  }

  return {
    originNodeId,
    destinationNodeId,
    currentTurn,
    currentDestinationPosition: computeBodyPosition(content, destinationNode.bodyId, currentTurn),
    predictedDestinationPositionAtArrival: plan.destinationPositionAtArrival,
    transferTurns: plan.etaTurns,
    burnCost: plan.burnCost,
    windowQuality: plan.transferWindowQuality ?? "neutral",
    motionRelation: plan.motionRelation ?? "neutral",
    visualArcType: plan.visualArcType ?? "strategic-arc",
    zHeight: plan.visualArcHeight ?? 0,
    transferDifficultyScore: plan.transferDifficultyScore ?? plan.etaTurns,
    energyScore: plan.energyScore ?? plan.burnCost
  };
}

export function calculateActiveBurnRedirectPlan(
  content: SimulationContent,
  state: GameState,
  transitId: string,
  destinationNodeId: string,
  factionId: FactionId = defaultPlayerFactionId,
  sampleTurn: number = state.turn,
  originPositionOverride?: Vec2,
  departureDirectionOverride?: Vec2
): BurnPlan | null {
  void content;
  void state;
  void transitId;
  void destinationNodeId;
  void factionId;
  void sampleTurn;
  void originPositionOverride;
  void departureDirectionOverride;
  return null;
}

function calculateBurnPlanFromPosition(
  content: SimulationContent,
  issuedTurn: number,
  originNodeId: string,
  destinationNodeId: string,
  originPosition: Vec2,
  departureDirection?: Vec2
): BurnPlan | null {
  recordSimulationPerformanceCounter("calculateBurnPlanFromPosition");

  const originNode = content.nodes.find((node) => node.id === originNodeId);
  const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);

  if (originNode === undefined || destinationNode === undefined) {
    return null;
  }

  const nominalOriginBody = content.bodies.find((body) => body.id === originNode.bodyId);
  const destinationBody = content.bodies.find((body) => body.id === destinationNode.bodyId);

  if (nominalOriginBody === undefined || destinationBody === undefined) {
    return null;
  }

  const nearestOriginBody = findNearestBodyAtTurn(content, originPosition, issuedTurn);
  const originBody = nearestOriginBody ?? nominalOriginBody;
  const originGravityWell =
    content.nodes.find((node) => node.bodyId === originBody.id)?.gravityWell ??
    (originBody.id === nominalOriginBody.id ? originNode.gravityWell : 0);
  const transferEstimate = estimateContinuousBurnTransfer(
    content,
    originNode,
    destinationNode,
    originBody,
    destinationBody,
    originPosition,
    originGravityWell,
    issuedTurn
  );
  const etaTurns = transferEstimate.etaTurns;
  const arrivalTurn = issuedTurn + etaTurns;
  const destinationPositionAtArrival = computeBodyPosition(
    content,
    destinationNode.bodyId,
    arrivalTurn
  );

  return {
    originNodeId,
    destinationNodeId,
    burnCost: transferEstimate.burnCost,
    etaTurns,
    issuedTurn,
    arrivalTurn,
    originPosition,
    destinationPositionAtArrival,
    transferCategory: transferEstimate.scores.category,
    transferWindowQuality: getTransferWindowQuality(transferEstimate.scores),
    motionRelation: getTransferMotionRelation(transferEstimate.scores),
    visualArcType: getTransferVisualArcType(transferEstimate.scores),
    visualArcHeight: getTransferVisualArcHeight(transferEstimate.scores, etaTurns),
    transferDifficultyScore: roundTransferDiagnostic(
      transferEstimate.scores.transferDifficultyScore
    ),
    energyScore: roundTransferDiagnostic(transferEstimate.scores.energyScore),
    ...(departureDirection === undefined ? {} : { departureDirection })
  };
}

export function getPlayerOccupancy(
  state: Pick<GameState, "nodeOccupancies">,
  nodeId: string
): NodeOccupancy | undefined {
  return state.nodeOccupancies.find((occupancy) => {
    return occupancy.nodeId === nodeId && occupancy.factionId === defaultPlayerFactionId;
  });
}

export function getProjectedFactionDv(
  state: Pick<GameState, "factionDv" | "pendingBurnOrders">,
  factionId: FactionId,
  excludingOriginNodeId?: string
): number {
  const committedBurnCost = state.pendingBurnOrders
    .filter((order) => {
      return (
        order.factionId === factionId &&
        (excludingOriginNodeId === undefined || order.originNodeId !== excludingOriginNodeId)
      );
    })
    .reduce((total, order) => total + order.burnCost, 0);

  return Math.max(0, getFactionDv(state, factionId) - committedBurnCost);
}

function assignPendingBurnOrder(
  state: GameState,
  command: AssignBurnOrderCommand,
  content: SimulationContent | undefined
): GameState {
  if (content === undefined) {
    throw new Error("ASSIGN_BURN_ORDER requires simulation content.");
  }

  const factionId = command.factionId ?? defaultPlayerFactionId;
  const shipCount = command.shipCount ?? 1;
  const mandatoryLaunch = getNextMandatoryLaunch(state, factionId);
  const fireOrderAtOrigin = state.pendingFireOrders.find((order) => {
    return order.originNodeId === command.originNodeId && order.factionId === factionId;
  });
  const replacedOrder = state.pendingBurnOrders.find((order) => {
    return order.originNodeId === command.originNodeId && order.factionId === factionId;
  });

  if (fireOrderAtOrigin !== undefined) {
    return state;
  }

  if (
    mandatoryLaunch !== undefined &&
    (command.originNodeId !== mandatoryLaunch.nodeId || shipCount !== 1)
  ) {
    return state;
  }

  if (
    mandatoryLaunch !== undefined &&
    isNodeContested(state.nodeOccupancies, command.destinationNodeId)
  ) {
    return state;
  }

  const occupancy = state.nodeOccupancies.find((candidate) => {
    return candidate.nodeId === command.originNodeId && candidate.factionId === factionId;
  });

  if ((occupancy?.shipCount ?? 0) < shipCount) {
    return state;
  }

  const plan = calculateBurnPlan(content, state, command.originNodeId, command.destinationNodeId);

  if (plan === null) {
    return state;
  }

  const legalPlan: BurnPlan = isNodeContested(state.nodeOccupancies, command.originNodeId)
    ? {
        ...plan,
        burnCost: plan.burnCost + contestedLeaveDvCost
      }
    : plan;

  if (shipCount > 1 && hasEnemyOccupiedDestination(state, legalPlan.destinationNodeId, factionId)) {
    return state;
  }

  if (wouldStackShipsAtDestination(state, legalPlan, factionId, replacedOrder, shipCount)) {
    return state;
  }

  if (legalPlan.burnCost > getProjectedFactionDv(state, factionId, command.originNodeId)) {
    return state;
  }

  if (
    isAiControlledFaction(state, factionId) &&
    !isNodeContested(state.nodeOccupancies, command.originNodeId)
  ) {
    const destinationNode = getNodeById(content, command.destinationNodeId);

    if (
      destinationNode !== undefined &&
      getAiLastTritiumDepartureRejectionReason(
        state,
        content,
        destinationNode,
        legalPlan,
        factionId,
        "expansion"
      ) !== null
    ) {
      return state;
    }

    if (
      destinationNode !== undefined &&
      getAiSecondTritiumDepartureRejectionReason(
        state,
        content,
        destinationNode,
        legalPlan,
        factionId,
        "expansion",
        shipCount
      ) !== null
    ) {
      return state;
    }
  }

  const mandatoryLaunchId = mandatoryLaunch?.id ?? replacedOrder?.mandatoryLaunchId;
  const nextOrder: PendingBurnOrder = {
    ...legalPlan,
    id: createBurnOrderId(
      factionId,
      legalPlan.originNodeId,
      legalPlan.destinationNodeId,
      state.turn
    ),
    factionId,
    shipCount,
    ...(mandatoryLaunchId === undefined ? {} : { mandatoryLaunchId })
  };

  return {
    ...state,
    mandatoryLaunches:
      mandatoryLaunch === undefined
        ? state.mandatoryLaunches
        : state.mandatoryLaunches.filter((launch) => launch.id !== mandatoryLaunch.id),
    pendingBurnOrders: [
      ...state.pendingBurnOrders.filter((order) => {
        return !(order.originNodeId === command.originNodeId && order.factionId === factionId);
      }),
      nextOrder
    ]
  };
}

function assignPendingFireOrder(
  state: GameState,
  command: AssignFireOrderCommand,
  content: SimulationContent | undefined
): GameState {
  if (content === undefined) {
    throw new Error("ASSIGN_FIRE_ORDER requires simulation content.");
  }

  const factionId = command.factionId ?? defaultPlayerFactionId;

  if (getNextMandatoryLaunch(state, factionId) !== undefined) {
    return state;
  }

  const shooterOccupancy = state.nodeOccupancies.find((candidate) => {
    return candidate.nodeId === command.originNodeId && candidate.factionId === factionId;
  });

  if ((shooterOccupancy?.shipCount ?? 0) <= 0) {
    return state;
  }

  if (isNodeContested(state.nodeOccupancies, command.originNodeId)) {
    return state;
  }

  if (
    state.pendingBurnOrders.some((order) => {
      return order.originNodeId === command.originNodeId && order.factionId === factionId;
    })
  ) {
    return state;
  }

  const basePlan = calculateFirePlan(content, state, command.originNodeId, command.targetNodeId);

  if (basePlan === null) {
    return state;
  }

  const target = getFireTargetAtNode(state, basePlan, factionId);

  if (target === undefined) {
    return state;
  }

  const plan = adjustFirePlanForTargetAvailability(content, basePlan, target);
  const nextOrder: PendingFireOrder = {
    ...plan,
    id: createFireOrderId(factionId, plan.originNodeId, plan.targetNodeId, state.turn),
    factionId,
    targetFactionId: target.factionId,
    targetShipKey: createNodeFactionKey(command.targetNodeId, target.factionId)
  };

  return {
    ...state,
    pendingFireOrders: [
      ...state.pendingFireOrders.filter((order) => {
        return !(order.originNodeId === command.originNodeId && order.factionId === factionId);
      }),
      nextOrder
    ]
  };
}

function redirectActiveBurn(
  state: GameState,
  command: RedirectActiveBurnCommand,
  content: SimulationContent | undefined
): GameState {
  if (content === undefined) {
    throw new Error("REDIRECT_ACTIVE_BURN requires simulation content.");
  }

  void command;
  return state;
}

function cancelPendingBurnOrder(
  state: GameState,
  command: CancelPendingBurnOrderCommand
): GameState {
  const factionId = command.factionId ?? defaultPlayerFactionId;
  const cancelledOrders = state.pendingBurnOrders.filter((order) => {
    return (
      order.factionId === factionId &&
      (command.originNodeId === undefined || order.originNodeId === command.originNodeId)
    );
  });
  const pendingBurnOrders = state.pendingBurnOrders.filter((order) => {
    return !(
      order.factionId === factionId &&
      (command.originNodeId === undefined || order.originNodeId === command.originNodeId)
    );
  });

  if (pendingBurnOrders.length === state.pendingBurnOrders.length) {
    return state;
  }

  const restoredMandatoryLaunches = cancelledOrders
    .filter((order) => order.mandatoryLaunchId !== undefined)
    .map((order): MandatoryLaunch => {
      return {
        id: order.mandatoryLaunchId ?? "",
        nodeId: order.originNodeId,
        factionId: order.factionId,
        createdTurn: order.issuedTurn
      };
    })
    .filter((launch) => {
      return (
        launch.id !== "" &&
        !state.mandatoryLaunches.some((existingLaunch) => existingLaunch.id === launch.id)
      );
    });

  return {
    ...state,
    mandatoryLaunches: [...state.mandatoryLaunches, ...restoredMandatoryLaunches].sort(
      compareMandatoryLaunches
    ),
    pendingBurnOrders
  };
}

function cancelPendingFireOrder(
  state: GameState,
  command: CancelPendingFireOrderCommand
): GameState {
  const factionId = command.factionId ?? defaultPlayerFactionId;
  const pendingFireOrders = state.pendingFireOrders.filter((order) => {
    return !(
      order.factionId === factionId &&
      (command.originNodeId === undefined || order.originNodeId === command.originNodeId)
    );
  });

  if (pendingFireOrders.length === state.pendingFireOrders.length) {
    return state;
  }

  return {
    ...state,
    pendingFireOrders
  };
}

function planAiFactionsTurn(
  state: GameState,
  content: SimulationContent,
  factionIds: readonly FactionId[],
  aiPlanningOptions: AiPlanningOptions = {}
): EnemyTurnPlan {
  const liveStateHashBeforePlanning = hashGameStateForAudit(state);
  const preTurnSnapshot = freezeGameStateSnapshot(cloneGameState(state));
  const preTurnSnapshotHash = hashGameStateForAudit(preTurnSnapshot);
  const debugEvents: TurnDebugEvent[] = [];
  const skippedWorkShipKeys: string[] = [];
  const plannerSnapshotHashes: Partial<Record<FactionId, string>> = {};
  let collectedPendingBurnOrders: readonly PendingBurnOrder[] = [...state.pendingBurnOrders];
  let collectedPendingFireOrders: readonly PendingFireOrder[] = [...state.pendingFireOrders];
  const ordersCollected: Record<string, number> = createFactionNumberRecord(factionIds);
  const ordersRejected: Record<string, number> = createFactionNumberRecord(factionIds);
  const conflictsDetected: string[] = [];
  const conflictResolutionReasons: string[] = [];
  let nextFactionDv: FactionDvReserve = { ...state.factionDv };

  for (const factionId of factionIds) {
    if (isFactionEliminatedForAiPlanning(preTurnSnapshot, factionId)) {
      plannerSnapshotHashes[factionId] = preTurnSnapshotHash;

      if (preTurnSnapshot.turn > 0) {
        debugEvents.push(createFactionEliminatedEvent(preTurnSnapshot, factionId));
      }

      continue;
    }

    const plannerSnapshot = freezeGameStateSnapshot(cloneGameState(preTurnSnapshot));
    const plannerSnapshotHash = hashGameStateForAudit(plannerSnapshot);
    plannerSnapshotHashes[factionId] = plannerSnapshotHash;
    const plan = planAiTurnForFaction(plannerSnapshot, content, factionId, aiPlanningOptions);
    const newBurnOrders = getNewPendingBurnOrders(preTurnSnapshot, plan.state, factionId);
    const newFireOrders = getNewPendingFireOrders(preTurnSnapshot, plan.state, factionId);
    const mergeResult = mergeCollectedOrders(
      collectedPendingBurnOrders,
      collectedPendingFireOrders,
      newBurnOrders,
      newFireOrders
    );

    collectedPendingBurnOrders = mergeResult.pendingBurnOrders;
    collectedPendingFireOrders = mergeResult.pendingFireOrders;
    conflictsDetected.push(...mergeResult.conflictsDetected);
    conflictResolutionReasons.push(...mergeResult.conflictResolutionReasons);
    ordersCollected[factionId] =
      (ordersCollected[factionId] ?? 0) + newBurnOrders.length + newFireOrders.length;
    ordersRejected[factionId] =
      (ordersRejected[factionId] ?? 0) +
      plan.debugEvents.filter((event) => {
        return event.type === "AI_REJECTED_ACTION" || event.type === "AI_COMBO_REJECTED";
      }).length;
    nextFactionDv = {
      ...nextFactionDv,
      [factionId]: getFactionDv(plan.state, factionId)
    };
    debugEvents.push(...plan.debugEvents);
    skippedWorkShipKeys.push(...plan.skippedWorkShipKeys);
  }

  let plannedState = {
    ...preTurnSnapshot,
    factionDv: nextFactionDv,
    pendingBurnOrders: sortPendingBurnOrdersNeutral(collectedPendingBurnOrders),
    pendingFireOrders: sortPendingFireOrdersNeutral(collectedPendingFireOrders),
    activeMissiles: sortActiveMissilesNeutral(preTurnSnapshot.activeMissiles)
  };
  const aggregateContestedValidation = validateAggregateAiContestedPlans(
    preTurnSnapshot,
    plannedState,
    content,
    factionIds
  );
  plannedState = aggregateContestedValidation.state;
  debugEvents.push(...aggregateContestedValidation.debugEvents);
  for (const factionId of factionIds) {
    ordersRejected[factionId] =
      (ordersRejected[factionId] ?? 0) +
      aggregateContestedValidation.rejectedOrders.filter((order) => order.factionId === factionId)
        .length;
  }
  const sameSnapshotUsed = factionIds.every((factionId) => {
    return plannerSnapshotHashes[factionId] === preTurnSnapshotHash;
  });
  const stateMutatedDuringPlanning =
    hashGameStateForAudit(preTurnSnapshot) !== preTurnSnapshotHash ||
    hashGameStateForAudit(state) !== liveStateHashBeforePlanning;
  const audit: TurnPlanningAudit = {
    preTurnSnapshotHash,
    plannerSnapshotHashes,
    sameSnapshotUsed,
    stateMutatedDuringPlanning,
    ordersCollected,
    ordersRejected,
    conflictsDetected,
    conflictResolutionReasons
  };

  return {
    state: plannedState,
    debugEvents,
    skippedWorkShipKeys,
    audit
  };
}

function validateAggregateAiContestedPlans(
  preTurnState: GameState,
  plannedState: GameState,
  content: SimulationContent,
  factionIds: readonly FactionId[]
): Readonly<{
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  rejectedOrders: readonly PendingBurnOrder[];
}> {
  let nextState = plannedState;
  const debugEvents: TurnDebugEvent[] = [];
  const rejectedOrders: PendingBurnOrder[] = [];
  const maximumCancellationPasses = Math.max(1, plannedState.pendingBurnOrders.length);

  // The faction planners still operate on their immutable pre-turn snapshots. This post-merge
  // pass audits each faction using only its own selected orders plus contests and hostile
  // transits already visible in that snapshot; rival simultaneous orders remain sealed.
  for (let pass = 0; pass < maximumCancellationPasses; pass += 1) {
    const audits = factionIds.map((factionId) =>
      createAiAggregateContestedSolvencyAudit(preTurnState, nextState, content, factionId)
    );
    const cancellableOffensives = audits
      .filter((audit) => !audit.sustainable)
      .flatMap((audit) => {
        return audit.fronts.flatMap((front) => {
          if (front.source !== "selected-offensive" || front.offensiveOrderId === undefined) {
            return [];
          }

          const order = nextState.pendingBurnOrders.find(
            (candidate) =>
              candidate.id === front.offensiveOrderId &&
              candidate.factionId === audit.factionId &&
              candidate.mandatoryLaunchId === undefined &&
              candidate.issuedTurn === preTurnState.turn
          );

          if (order === undefined) {
            return [];
          }

          return [
            {
              audit,
              front,
              order,
              value: getAiAggregateContestedFrontValue(content, nextState, front.nodeId, order)
            }
          ];
        });
      })
      .sort((first, second) => {
        if (first.value !== second.value) {
          return first.value - second.value;
        }

        if (first.order.burnCost !== second.order.burnCost) {
          return second.order.burnCost - first.order.burnCost;
        }

        return first.order.id.localeCompare(second.order.id);
      });
    const cancellation = cancellableOffensives[0];

    if (cancellation === undefined) {
      break;
    }

    nextState = {
      ...nextState,
      pendingBurnOrders: nextState.pendingBurnOrders.filter(
        (order) => order.id !== cancellation.order.id
      )
    };
    rejectedOrders.push(cancellation.order);
    const nextAudits = factionIds.map((factionId) =>
      createAiAggregateContestedSolvencyAudit(preTurnState, nextState, content, factionId)
    );
    const nextAudit = createAiAggregateContestedSolvencyAudit(
      preTurnState,
      nextState,
      content,
      cancellation.order.factionId
    );
    const avoidedFailureCount = Math.max(
      0,
      audits.reduce((total, audit) => total + audit.unavoidableFailures, 0) -
        nextAudits.reduce((total, audit) => total + audit.unavoidableFailures, 0)
    );
    debugEvents.push({
      turn: preTurnState.turn + 1,
      type: "AI_REJECTED_CONTEST",
      message: `AI aggregate CONTESTED solvency vetoed ${getNodeDisplayName(content, cancellation.order.originNodeId)} -> ${getNodeDisplayName(content, cancellation.order.destinationNodeId)}; initial ${cancellation.audit.initialBudget} ΔV, planned spending ${cancellation.audit.plannedSpending}, upkeep ${cancellation.audit.projectedUpkeep}, guaranteed income ${cancellation.audit.guaranteedIncome}, reserve ${cancellation.audit.minimumReserve}; sacrificed ${getNodeDisplayName(content, cancellation.front.nodeId)} because it was the lowest-value new offensive front`,
      nodeId: cancellation.front.nodeId,
      originNodeId: cancellation.order.originNodeId,
      factionId: cancellation.order.factionId,
      action: "BURN",
      destinationNodeId: cancellation.order.destinationNodeId,
      burnCost: cancellation.order.burnCost,
      reason: "aggregate-contested:lowest-value-offensive-cancelled",
      initialBudget: cancellation.audit.initialBudget,
      plannedSpending: cancellation.audit.plannedSpending,
      projectedUpkeep: cancellation.audit.projectedUpkeep,
      guaranteedIncome: cancellation.audit.guaranteedIncome,
      minimumReserve: cancellation.audit.minimumReserve,
      projectedDv: nextAudit.projectedDv,
      sacrificedFrontNodeId: cancellation.front.nodeId,
      amount: avoidedFailureCount
    });
  }

  for (const factionId of factionIds) {
    const visibleAudit = createAiAggregateContestedSolvencyAudit(
      preTurnState,
      nextState,
      content,
      factionId
    );

    if (visibleAudit.sustainable) {
      continue;
    }

    const exit = chooseAiAggregateContestedEarlyExit(
      preTurnState,
      nextState,
      content,
      factionId,
      visibleAudit
    );

    if (exit === null) {
      continue;
    }

    nextState = exit.state;
    debugEvents.push({
      turn: preTurnState.turn + 1,
      type: "AI_EARLY_CONTESTED_EXIT",
      message: `AI_EARLY_CONTESTED_EXIT aggregate plan: ${getNodeDisplayName(content, exit.originNodeId)} -> ${getNodeDisplayName(content, exit.order.destinationNodeId)}; initial ${visibleAudit.initialBudget} ΔV, planned spending ${visibleAudit.plannedSpending}, upkeep ${visibleAudit.projectedUpkeep}, guaranteed income ${visibleAudit.guaranteedIncome}, reserve ${visibleAudit.minimumReserve}; sacrificed ${getNodeDisplayName(content, exit.originNodeId)} because ${exit.reason}`,
      nodeId: exit.originNodeId,
      factionId,
      action: "LEAVE_CONTESTED",
      destinationNodeId: exit.order.destinationNodeId,
      burnCost: exit.order.burnCost,
      reason: exit.reason,
      initialBudget: visibleAudit.initialBudget,
      plannedSpending: visibleAudit.plannedSpending,
      projectedUpkeep: visibleAudit.projectedUpkeep,
      guaranteedIncome: visibleAudit.guaranteedIncome,
      minimumReserve: visibleAudit.minimumReserve,
      projectedDv: exit.audit.projectedDv,
      sacrificedFrontNodeId: exit.originNodeId,
      amount: Math.max(0, visibleAudit.unavoidableFailures - exit.audit.unavoidableFailures)
    });
    debugEvents.push({
      turn: preTurnState.turn + 1,
      type: "AI_DECISION",
      message: `AI leaves aggregate-insolvent contested front ${getNodeDisplayName(content, exit.originNodeId)} for ${getNodeDisplayName(content, exit.order.destinationNodeId)}`,
      nodeId: exit.originNodeId,
      factionId,
      action: "LEAVE_CONTESTED",
      destinationNodeId: exit.order.destinationNodeId,
      burnCost: exit.order.burnCost,
      reason: exit.reason
    });
  }

  for (const factionId of factionIds) {
    const finalAudit = createAiAggregateContestedSolvencyAudit(
      preTurnState,
      nextState,
      content,
      factionId
    );
    const aggregateActionEvent = [...debugEvents]
      .reverse()
      .find(
        (event) =>
          event.factionId === factionId &&
          (event.type === "AI_REJECTED_CONTEST" || event.type === "AI_EARLY_CONTESTED_EXIT")
      );
    if (finalAudit.fronts.length === 0 && aggregateActionEvent === undefined) {
      continue;
    }

    const sacrificedFrontNodeId = aggregateActionEvent?.sacrificedFrontNodeId;
    const reason = finalAudit.sustainable
      ? sacrificedFrontNodeId === undefined
        ? "aggregate-contested:solvent"
        : "aggregate-contested:solvent-after-sacrifice"
      : finalAudit.ordersExecutable
        ? "aggregate-contested:no-sustainable-exit"
        : "aggregate-contested:orders-unaffordable-after-upkeep";

    debugEvents.push(
      createAiAggregateContestedSolvencyEvent(
        content,
        preTurnState.turn + 1,
        finalAudit,
        reason,
        sacrificedFrontNodeId
      )
    );
  }

  return { state: nextState, debugEvents, rejectedOrders };
}

function createAiAggregateContestedSolvencyAudit(
  preTurnState: GameState,
  plannedState: GameState,
  content: SimulationContent,
  factionId: FactionId
): AiAggregateContestedSolvencyAudit {
  const fronts = getAiAggregateContestedFronts(preTurnState, plannedState, factionId);
  const plannedBurnCost = plannedState.pendingBurnOrders
    .filter((order) => order.factionId === factionId)
    .reduce((total, order) => total + order.burnCost, 0);
  const plannedEvadeCost = getPlannedEvadeCostBeforeShipyardProduction(plannedState, factionId);
  const otherPlannedSpending = 0;
  const plannedSpending = plannedBurnCost + plannedEvadeCost + otherPlannedSpending;
  const initialBudget = getFactionDv(preTurnState, factionId);
  const minimumReserve = AI_MIN_DV_RESERVE;
  const nextTurn = preTurnState.turn + 1;
  const lastUpkeepTurn = fronts.reduce(
    (latest, front) => Math.max(latest, front.firstUpkeepTurn + front.upkeepPayments - 1),
    nextTurn + AI_CONTESTED_SUSTAIN_TURNS - 1
  );
  const contestActivationTurnByNode = new Map<string, number>();

  for (const front of fronts) {
    const activationTurn =
      front.source === "existing" ? preTurnState.turn : front.firstUpkeepTurn - 1;
    contestActivationTurnByNode.set(
      front.nodeId,
      Math.min(
        contestActivationTurnByNode.get(front.nodeId) ?? Number.POSITIVE_INFINITY,
        activationTurn
      )
    );
  }

  const departingNodeIds = new Set(
    plannedState.pendingBurnOrders
      .filter((order) => order.factionId === factionId)
      .map((order) => order.originNodeId)
  );
  const firingNodeIds = new Set(
    plannedState.pendingFireOrders
      .filter((order) => order.factionId === factionId)
      .map((order) => order.originNodeId)
  );
  const guaranteedIncomeByTurn = new Map<number, number>();

  for (let turn = nextTurn; turn <= lastUpkeepTurn; turn += 1) {
    let income = 0;

    for (const node of content.nodes) {
      if (
        node.type !== "tritium" ||
        !hasFactionShipAtNode(preTurnState, node.id, factionId) ||
        departingNodeIds.has(node.id) ||
        isNodeContested(preTurnState.nodeOccupancies, node.id) ||
        turn >= (contestActivationTurnByNode.get(node.id) ?? Number.POSITIVE_INFINITY) ||
        canPubliclyReachTritiumBeforeIncome(content, preTurnState, factionId, node.id, turn) ||
        (turn === nextTurn && firingNodeIds.has(node.id)) ||
        plannedState.activeMissiles.some(
          (missile) =>
            missile.targetFactionId === factionId &&
            missile.targetNodeId === node.id &&
            missile.impactTurn === turn
        )
      ) {
        continue;
      }

      income += tritiumWorkOutput;
    }

    guaranteedIncomeByTurn.set(turn, income);
  }

  let projectedDv = initialBudget;
  let ordersExecutable = true;
  let unavoidableFailures = 0;
  let guaranteedIncome = 0;
  const failedFrontNodeIds = new Set<string>();
  const sortedFronts = [...fronts].sort((first, second) => {
    if (first.firstUpkeepTurn !== second.firstUpkeepTurn) {
      return first.firstUpkeepTurn - second.firstUpkeepTurn;
    }

    return first.nodeId.localeCompare(second.nodeId);
  });

  for (let turn = nextTurn; turn <= lastUpkeepTurn; turn += 1) {
    for (const front of sortedFronts) {
      const lastPaymentTurn = front.firstUpkeepTurn + front.upkeepPayments - 1;

      if (
        failedFrontNodeIds.has(front.nodeId) ||
        turn < front.firstUpkeepTurn ||
        turn > lastPaymentTurn
      ) {
        continue;
      }

      if (projectedDv >= contestedUpkeepDvCost) {
        projectedDv -= contestedUpkeepDvCost;
      } else {
        unavoidableFailures += 1;
        failedFrontNodeIds.add(front.nodeId);
      }
    }

    if (turn === nextTurn) {
      if (projectedDv >= plannedSpending) {
        projectedDv -= plannedSpending;
      } else {
        ordersExecutable = false;
      }
    }

    const turnIncome = guaranteedIncomeByTurn.get(turn) ?? 0;
    projectedDv += turnIncome;
    guaranteedIncome += turnIncome;
  }

  const projectedUpkeep = fronts.reduce(
    (total, front) => total + front.upkeepPayments * contestedUpkeepDvCost,
    0
  );
  const sustainable =
    ordersExecutable && unavoidableFailures === 0 && projectedDv >= minimumReserve;

  return {
    factionId,
    initialBudget,
    plannedBurnCost,
    plannedEvadeCost,
    otherPlannedSpending,
    plannedSpending,
    guaranteedIncome,
    projectedUpkeep,
    minimumReserve,
    projectedDv,
    ordersExecutable,
    unavoidableFailures,
    sustainable,
    fronts
  };
}

function canPubliclyReachTritiumBeforeIncome(
  content: SimulationContent,
  preTurnState: GameState,
  factionId: FactionId,
  nodeId: string,
  incomeTurn: number
): boolean {
  return preTurnState.nodeOccupancies.some((occupancy) => {
    if (
      occupancy.factionId === factionId ||
      occupancy.shipCount <= 0 ||
      isNodeContested(preTurnState.nodeOccupancies, occupancy.nodeId)
    ) {
      return false;
    }

    const plan = calculateBurnPlan(content, preTurnState, occupancy.nodeId, nodeId);

    return (
      plan !== null &&
      plan.arrivalTurn <= incomeTurn &&
      plan.burnCost <= getFactionDv(preTurnState, occupancy.factionId)
    );
  });
}

function getAiAggregateContestedFronts(
  preTurnState: GameState,
  plannedState: GameState,
  factionId: FactionId
): readonly AiAggregateContestedFront[] {
  const nextTurn = preTurnState.turn + 1;
  const fronts = new Map<string, AiAggregateContestedFront>();
  const ownOrders = plannedState.pendingBurnOrders.filter((order) => order.factionId === factionId);

  const addFront = (front: AiAggregateContestedFront): void => {
    const current = fronts.get(front.nodeId);

    if (current === undefined) {
      fronts.set(front.nodeId, front);
      return;
    }

    const source =
      current.source === "existing" || front.source === "existing"
        ? "existing"
        : current.source === "selected-offensive" || front.source === "selected-offensive"
          ? "selected-offensive"
          : "known-hostile-arrival";
    fronts.set(front.nodeId, {
      nodeId: front.nodeId,
      source,
      firstUpkeepTurn: Math.min(current.firstUpkeepTurn, front.firstUpkeepTurn),
      upkeepPayments: Math.max(current.upkeepPayments, front.upkeepPayments),
      ...(current.offensiveOrderId === undefined && front.offensiveOrderId === undefined
        ? {}
        : { offensiveOrderId: current.offensiveOrderId ?? front.offensiveOrderId })
    });
  };

  for (const occupancy of preTurnState.nodeOccupancies) {
    if (
      occupancy.factionId !== factionId ||
      occupancy.shipCount <= 0 ||
      !isNodeContested(preTurnState.nodeOccupancies, occupancy.nodeId)
    ) {
      continue;
    }

    const departingShipCount = ownOrders
      .filter((order) => order.originNodeId === occupancy.nodeId)
      .reduce((total, order) => total + order.shipCount, 0);
    addFront({
      nodeId: occupancy.nodeId,
      source: "existing",
      firstUpkeepTurn: nextTurn,
      upkeepPayments: departingShipCount >= occupancy.shipCount ? 1 : AI_CONTESTED_SUSTAIN_TURNS
    });
  }

  for (const order of ownOrders) {
    const enemyWillRemain = getEnemyFactionIds(preTurnState, factionId).some((enemyFactionId) => {
      return (
        getVisibleStationaryShipCountAfterSelectedDepartures(
          preTurnState,
          plannedState,
          order.destinationNodeId,
          enemyFactionId,
          false
        ) > 0
      );
    });

    if (!enemyWillRemain) {
      continue;
    }

    addFront({
      nodeId: order.destinationNodeId,
      source: "selected-offensive",
      firstUpkeepTurn: order.arrivalTurn + 1,
      upkeepPayments: AI_CONTESTED_SUSTAIN_TURNS,
      offensiveOrderId: order.id
    });
  }

  for (const transit of preTurnState.activeBurnTransits) {
    if (transit.factionId === factionId) {
      const enemyWillRemain = getEnemyFactionIds(preTurnState, factionId).some(
        (enemyFactionId) =>
          getVisibleStationaryShipCountAfterSelectedDepartures(
            preTurnState,
            plannedState,
            transit.destinationNodeId,
            enemyFactionId,
            false
          ) > 0
      );

      if (enemyWillRemain) {
        addFront({
          nodeId: transit.destinationNodeId,
          source: "selected-offensive",
          firstUpkeepTurn: transit.arrivalTurn + 1,
          upkeepPayments: AI_CONTESTED_SUSTAIN_TURNS
        });
      }
      continue;
    }

    if (
      getVisibleStationaryShipCountAfterSelectedDepartures(
        preTurnState,
        plannedState,
        transit.destinationNodeId,
        factionId,
        true
      ) <= 0
    ) {
      continue;
    }

    addFront({
      nodeId: transit.destinationNodeId,
      source: "known-hostile-arrival",
      firstUpkeepTurn: transit.arrivalTurn + 1,
      upkeepPayments: AI_CONTESTED_SUSTAIN_TURNS
    });
  }

  return [...fronts.values()].sort((first, second) => first.nodeId.localeCompare(second.nodeId));
}

function getVisibleStationaryShipCountAfterSelectedDepartures(
  preTurnState: GameState,
  plannedState: GameState,
  nodeId: string,
  factionId: FactionId,
  selectedDeparturesAreVisible: boolean
): number {
  const currentShipCount =
    preTurnState.nodeOccupancies.find(
      (occupancy) => occupancy.nodeId === nodeId && occupancy.factionId === factionId
    )?.shipCount ?? 0;
  const departingShipCount = selectedDeparturesAreVisible
    ? plannedState.pendingBurnOrders
        .filter((order) => order.originNodeId === nodeId && order.factionId === factionId)
        .reduce((total, order) => total + order.shipCount, 0)
    : 0;

  return Math.max(0, currentShipCount - departingShipCount);
}

function getAiAggregateContestedFrontValue(
  content: SimulationContent,
  state: GameState,
  nodeId: string,
  order?: PendingBurnOrder
): number {
  const node = getNodeById(content, nodeId);
  const baseValue =
    node?.type === "tritium"
      ? 600
      : node?.type === "shipyard"
        ? 500 + getShipyardProgress(state.shipyardProgress, nodeId) * 45
        : node?.type === "barren"
          ? 160
          : 120;

  return baseValue - (order?.burnCost ?? 0) * 35 - (order?.etaTurns ?? 0) * 8;
}

function chooseAiAggregateContestedEarlyExit(
  preTurnState: GameState,
  plannedState: GameState,
  content: SimulationContent,
  factionId: FactionId,
  currentAudit: AiAggregateContestedSolvencyAudit
): Readonly<{
  state: GameState;
  audit: AiAggregateContestedSolvencyAudit;
  originNodeId: string;
  order: PendingBurnOrder;
  reason: string;
}> | null {
  const originNodeIds = [
    ...new Set(
      currentAudit.fronts
        .filter((front) => front.source === "existing" || front.source === "known-hostile-arrival")
        .map((front) => front.nodeId)
    )
  ].sort((first, second) => {
    const valueDelta =
      getAiAggregateContestedFrontValue(content, plannedState, first) -
      getAiAggregateContestedFrontValue(content, plannedState, second);

    return valueDelta !== 0 ? valueDelta : first.localeCompare(second);
  });
  const candidates: Array<{
    state: GameState;
    audit: AiAggregateContestedSolvencyAudit;
    originNodeId: string;
    order: PendingBurnOrder;
    destinationIsTritium: boolean;
    frontValue: number;
  }> = [];

  for (const originNodeId of originNodeIds) {
    const occupancy = preTurnState.nodeOccupancies.find(
      (candidate) =>
        candidate.nodeId === originNodeId &&
        candidate.factionId === factionId &&
        candidate.shipCount > 0
    );

    if (occupancy === undefined) {
      continue;
    }

    const mandatoryLaunchAtOrigin = plannedState.pendingBurnOrders.some(
      (order) =>
        order.originNodeId === originNodeId &&
        order.factionId === factionId &&
        order.mandatoryLaunchId !== undefined
    );

    if (mandatoryLaunchAtOrigin) {
      continue;
    }

    let baseState = cancelPendingFireOrder(plannedState, {
      type: "CANCEL_PENDING_FIRE_ORDER",
      originNodeId,
      factionId
    });
    baseState = cancelPendingBurnOrder(baseState, {
      type: "CANCEL_PENDING_BURN_ORDER",
      originNodeId,
      factionId
    });

    for (const destination of content.nodes) {
      if (
        destination.id === originNodeId ||
        !destination.contestable ||
        destination.protectedNoWar ||
        hasEnemyShipAtNode(preTurnState, destination.id, factionId) ||
        isNodeContested(preTurnState.nodeOccupancies, destination.id) ||
        preTurnState.activeBurnTransits.some(
          (transit) =>
            transit.factionId !== factionId && transit.destinationNodeId === destination.id
        )
      ) {
        continue;
      }

      const nextState = assignPendingBurnOrder(
        baseState,
        {
          type: "ASSIGN_BURN_ORDER",
          originNodeId,
          destinationNodeId: destination.id,
          factionId
        },
        content
      );
      const order = nextState.pendingBurnOrders.find(
        (candidate) => candidate.originNodeId === originNodeId && candidate.factionId === factionId
      );

      if (order === undefined) {
        continue;
      }

      const audit = createAiAggregateContestedSolvencyAudit(
        preTurnState,
        nextState,
        content,
        factionId
      );
      const reducesCertainFailures =
        audit.ordersExecutable && audit.unavoidableFailures < currentAudit.unavoidableFailures;

      if (!audit.sustainable && !reducesCertainFailures) {
        continue;
      }

      candidates.push({
        state: nextState,
        audit,
        originNodeId,
        order,
        destinationIsTritium: destination.type === "tritium",
        frontValue: getAiAggregateContestedFrontValue(content, plannedState, originNodeId)
      });
    }
  }

  candidates.sort((first, second) => {
    if (first.frontValue !== second.frontValue) {
      return first.frontValue - second.frontValue;
    }

    if (first.audit.unavoidableFailures !== second.audit.unavoidableFailures) {
      return first.audit.unavoidableFailures - second.audit.unavoidableFailures;
    }

    if (first.destinationIsTritium !== second.destinationIsTritium) {
      return first.destinationIsTritium ? -1 : 1;
    }

    if (first.audit.sustainable !== second.audit.sustainable) {
      return first.audit.sustainable ? -1 : 1;
    }

    if (first.audit.projectedDv !== second.audit.projectedDv) {
      return second.audit.projectedDv - first.audit.projectedDv;
    }

    if (first.order.burnCost !== second.order.burnCost) {
      return first.order.burnCost - second.order.burnCost;
    }

    return first.order.destinationNodeId.localeCompare(second.order.destinationNodeId);
  });
  const selected = candidates[0];

  if (selected === undefined) {
    return null;
  }

  return {
    state: selected.state,
    audit: selected.audit,
    originNodeId: selected.originNodeId,
    order: selected.order,
    reason: selected.audit.sustainable
      ? "aggregate-contested:early-exit-restores-reserve"
      : "aggregate-contested:early-exit-reduces-certain-failures"
  };
}

function createAiAggregateContestedSolvencyEvent(
  content: SimulationContent,
  turn: number,
  audit: AiAggregateContestedSolvencyAudit,
  reason: string,
  sacrificedFrontNodeId?: string
): TurnDebugEvent {
  const frontSummary =
    audit.fronts.length === 0
      ? "-"
      : audit.fronts
          .map(
            (front) =>
              `${getNodeDisplayName(content, front.nodeId)}:${front.source}:${front.upkeepPayments}`
          )
          .join(",");

  return {
    turn,
    type: "AI_AGGREGATE_CONTESTED_SOLVENCY",
    message: `AI aggregate CONTESTED solvency ${audit.factionId}: initial ${audit.initialBudget} ΔV; planned spending ${audit.plannedSpending} (BURN ${audit.plannedBurnCost}, EVADE ${audit.plannedEvadeCost}, other ${audit.otherPlannedSpending}); upkeep ${audit.projectedUpkeep}; guaranteed income ${audit.guaranteedIncome}; reserve ${audit.minimumReserve}; projected ${audit.projectedDv}; failures ${audit.unavoidableFailures}; fronts ${frontSummary}; sacrificed ${sacrificedFrontNodeId === undefined ? "-" : getNodeDisplayName(content, sacrificedFrontNodeId)}; reason ${reason}`,
    factionId: audit.factionId,
    reason,
    initialBudget: audit.initialBudget,
    plannedSpending: audit.plannedSpending,
    projectedUpkeep: audit.projectedUpkeep,
    guaranteedIncome: audit.guaranteedIncome,
    minimumReserve: audit.minimumReserve,
    projectedDv: audit.projectedDv,
    amount: audit.unavoidableFailures,
    ...(sacrificedFrontNodeId === undefined ? {} : { sacrificedFrontNodeId })
  };
}

function isFactionEliminatedForAiPlanning(state: GameState, factionId: FactionId): boolean {
  const hasShips = countFactionShips(state, factionId) > 0;
  const hasPendingBurn = state.pendingBurnOrders.some((order) => order.factionId === factionId);
  const hasActiveBurn = state.activeBurnTransits.some((transit) => {
    return transit.factionId === factionId;
  });
  const hasMandatoryLaunch = state.mandatoryLaunches.some((launch) => {
    return launch.factionId === factionId;
  });
  const hasActiveMissile = state.activeMissiles.some((missile) => {
    return missile.factionId === factionId;
  });

  return !hasShips && !hasPendingBurn && !hasActiveBurn && !hasMandatoryLaunch && !hasActiveMissile;
}

function createFactionEliminatedEvent(state: GameState, factionId: FactionId): TurnDebugEvent {
  return {
    turn: state.turn + 1,
    type: "FACTION_ELIMINATED",
    message: `FACTION_ELIMINATED: ${factionId} has no ships, transits, launches, or missiles; skipping AI planning`,
    factionId,
    reason: "no-ships-or-pending-actions"
  };
}

function planAiTryhardFactionLayer(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  turn: number,
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [];

  if (!isAiTryhardProfileActive(state, factionId)) {
    return { state, debugEvents };
  }

  if (isSimplifiedAiPlanning(aiPlanningOptions)) {
    return { state, debugEvents };
  }

  const ownProjection = getAiSolvencyProjection(content, state, factionId);
  const secondTritiumContext = getAiSecondTritiumContext(content, state, factionId, turn);
  const strategicRead = createAiStrategicStateRead(content, state, factionId, turn);
  debugEvents.push(createAiTryhardStrategyReadEvent(content, state, factionId, turn));
  debugEvents.push(...createAiStrategicStateReadEvents(content, state, turn, strategicRead));
  debugEvents.push(...createAiSolvencyProjectionEvents(content, turn, ownProjection));
  debugEvents.push(
    ...getEnemyFactionIds(state, factionId).flatMap((enemyFactionId) =>
      createAiSolvencyProjectionEvents(
        content,
        turn,
        getAiSolvencyProjection(content, state, enemyFactionId)
      )
    )
  );
  debugEvents.push(
    ...createAiSecondTritiumContextEvents(content, turn, factionId, secondTritiumContext)
  );

  const candidatePlan = getAiTryhardActionCandidates(
    content,
    state,
    factionId,
    turn,
    secondTritiumContext,
    strategicRead,
    aiPlanningOptions
  );
  debugEvents.push(...candidatePlan.debugEvents);

  let plannedState = state;
  const selectedCandidates: AiTryhardActionCandidate[] = [];
  const selectedTargetNodeIds = new Set<string>();

  for (const candidate of candidatePlan.candidates) {
    if (selectedCandidates.length >= AI_TRYHARD_MAX_COORDINATED_ACTIONS) {
      break;
    }

    if (
      candidate.score < AI_TRYHARD_MIN_ACTION_SCORE ||
      hasPendingAction(plannedState, candidate.originNodeId, factionId)
    ) {
      continue;
    }

    if (selectedTargetNodeIds.has(candidate.targetNodeId) && selectedCandidates.length > 0) {
      continue;
    }

    const applied = applyAiTryhardCandidate(
      plannedState,
      content,
      factionId,
      turn,
      candidate,
      secondTritiumContext
    );
    debugEvents.push(...applied.debugEvents);

    if (applied.state === plannedState) {
      continue;
    }

    plannedState = applied.state;
    selectedCandidates.push(candidate);
    selectedTargetNodeIds.add(candidate.targetNodeId);
    debugEvents.push(createAiTryhardSelectedEvent(content, turn, factionId, candidate));

    if (
      secondTritiumContext.secondTritiumRequired &&
      !isAiSecondTritiumCandidate(candidate) &&
      candidate.decisive
    ) {
      debugEvents.push(
        createAiSecondTritiumOverrideEvent(
          content,
          turn,
          factionId,
          candidate,
          secondTritiumContext
        )
      );
    }
  }

  if (
    secondTritiumContext.secondTritiumRequired &&
    !selectedCandidates.some(isAiSecondTritiumCandidate)
  ) {
    debugEvents.push(
      ...createAiSecondTritiumRejectedEvents(
        content,
        turn,
        factionId,
        "no-accepted-second-tritium-plan",
        secondTritiumContext
      )
    );
  }

  const firstForkCandidate = selectedCandidates[0];
  const secondForkCandidate = selectedCandidates[1];

  if (
    firstForkCandidate !== undefined &&
    secondForkCandidate !== undefined &&
    firstForkCandidate.targetNodeId !== secondForkCandidate.targetNodeId
  ) {
    debugEvents.push({
      turn,
      type: "AI_FORK_SELECTED",
      message: `AI_FORK_SELECTED: ${getNodeDisplayName(content, firstForkCandidate.targetNodeId)} and ${getNodeDisplayName(content, secondForkCandidate.targetNodeId)} create simultaneous solvency obligations`,
      nodeId: firstForkCandidate.originNodeId,
      factionId,
      action: firstForkCandidate.action,
      targetNodeId: secondForkCandidate.targetNodeId,
      reason: `${firstForkCandidate.reason}; ${secondForkCandidate.reason}`,
      score: firstForkCandidate.score + secondForkCandidate.score
    });
  }

  return { state: plannedState, debugEvents };
}

function isAiTryhardProfileActive(state: GameState, factionId: FactionId): boolean {
  return (
    state.gameMode !== "1p" &&
    countFactionShips(state, factionId) > 0 &&
    isAiControlledFaction(state, factionId)
  );
}

function isAiControlledFaction(state: Pick<GameState, "factions">, factionId: FactionId): boolean {
  return getFactionIdentity(state, factionId).controlType === "ai";
}

function isHumanControlledFaction(
  state: Pick<GameState, "factions">,
  factionId: FactionId
): boolean {
  return getFactionIdentity(state, factionId).controlType === "human";
}

function getAiTryhardActionCandidates(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  secondTritiumContext: AiSecondTritiumContext,
  strategicRead: AiStrategicStateRead,
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{
  candidates: readonly AiTryhardActionCandidate[];
  debugEvents: readonly TurnDebugEvent[];
}> {
  const debugEvents: TurnDebugEvent[] = [];
  const candidates = [
    ...getAiTryhardTritiumRaceCandidates(
      content,
      state,
      factionId,
      turn,
      debugEvents,
      secondTritiumContext
    ),
    ...getAiTryhardShipyardTheftCandidates(content, state, factionId, turn, debugEvents),
    ...getAiTryhardEconomicFireCandidates(
      content,
      state,
      factionId,
      turn,
      debugEvents,
      secondTritiumContext,
      strategicRead,
      aiPlanningOptions
    )
  ].sort((first, second) => {
    if (turn <= 1) {
      const firstOpeningTritium = isAiOpeningBarrenTritiumCandidate(
        content,
        state,
        factionId,
        first
      );
      const secondOpeningTritium = isAiOpeningBarrenTritiumCandidate(
        content,
        state,
        factionId,
        second
      );

      if (firstOpeningTritium !== secondOpeningTritium) {
        return firstOpeningTritium ? -1 : 1;
      }

      if (firstOpeningTritium && secondOpeningTritium) {
        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }
      }
    }

    if (secondTritiumContext.secondTritiumRequired) {
      const firstBuildsIndependentPath = isAiIndependentTritiumCandidate(first);
      const secondBuildsIndependentPath = isAiIndependentTritiumCandidate(second);

      if (firstBuildsIndependentPath !== secondBuildsIndependentPath) {
        return firstBuildsIndependentPath ? -1 : 1;
      }
    }

    const firstPriority = getAiStrategicCandidatePriority(first, strategicRead.phase);
    const secondPriority = getAiStrategicCandidatePriority(second, strategicRead.phase);

    if (firstPriority !== secondPriority) {
      return firstPriority - secondPriority;
    }

    return compareAiTryhardActionCandidates(first, second);
  });

  return { candidates, debugEvents };
}

function getAiStrategicCandidatePriority(
  candidate: AiTryhardActionCandidate,
  phase: AiStrategicPhase
): number {
  if (
    candidate.kind === "second-tritium" ||
    candidate.kind === "counter-second-tritium" ||
    candidate.kind === "tritium-race"
  ) {
    return 1;
  }

  if (phase === "FINISH_MODE" && candidate.kind === "tritium-denial") {
    return 2;
  }

  if (candidate.kind === "shipyard-theft") {
    return phase === "RECOVERY_CONSERVATIVE" ? 5 : 3;
  }

  return phase === "RECOVERY_CONSERVATIVE" ? 6 : 4;
}

function createAiStrategicStateRead(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number
): AiStrategicStateRead {
  const activeFactionIds = getActiveFactionIds(state);
  const resources = createAiTritiumResourceModel(content, state, activeFactionIds, turn);
  const factions = activeFactionIds
    .map((candidateFactionId) => {
      return createAiFactionStrategicRead(content, state, candidateFactionId, turn, resources);
    })
    .sort((first, second) => second.leaderScore - first.leaderScore);
  const own =
    factions.find((read) => read.factionId === factionId) ??
    createAiFactionStrategicRead(content, state, factionId, turn, resources);
  const leader =
    factions.find((read) => read.factionId !== factionId && read.shipCount > 0) ?? null;
  const phase = selectAiStrategicPhase(turn, own, factions, leader);

  return {
    factionId,
    phase,
    resources,
    own,
    factions,
    leader,
    emergencyMode: own.emergencyReasons.length > 0
  };
}

function selectAiStrategicPhase(
  turn: number,
  own: AiFactionStrategicRead,
  factions: readonly AiFactionStrategicRead[],
  leader: AiFactionStrategicRead | null
): AiStrategicPhase {
  const opponents = factions.filter(
    (read) => read.factionId !== own.factionId && read.shipCount > 0
  );
  const opponentsHaveNoStableTritium =
    opponents.length > 0 &&
    opponents.every((read) => {
      return read.safeTritiumNodes === 0 || read.projectedDvH2 < 0 || read.collapseRisk;
    });
  const materialLead =
    leader === null ||
    own.leaderScore >= leader.leaderScore + 160 ||
    own.shipCount >= leader.shipCount + 2 ||
    own.currentDv >= leader.currentDv + 6;

  if (own.safeTritiumNodes > 0 && opponentsHaveNoStableTritium && materialLead && turn >= 4) {
    return "FINISH_MODE";
  }

  if (
    own.emergencyReasons.length > 0 ||
    own.safeTritiumNodes === 0 ||
    own.projectedDvH2 <= 0 ||
    own.currentDv <= AI_CRITICAL_DV
  ) {
    return "RECOVERY_CONSERVATIVE";
  }

  if (turn <= 10) {
    return "OPENING_CONSERVATIVE";
  }

  return "STABLE_EXPANSION";
}

function isAiConservativeStrategicPhase(phase: AiStrategicPhase): boolean {
  return phase === "OPENING_CONSERVATIVE" || phase === "RECOVERY_CONSERVATIVE";
}

function createAiTritiumResourceModel(
  content: SimulationContent,
  state: GameState,
  factionIds: readonly FactionId[],
  turn: number
): readonly AiTritiumNodeModel[] {
  return content.nodes
    .filter((node) => node.type === "tritium")
    .map((node) => {
      const owner = getPrimaryFactionAtNode(state, node.id);
      const contestStatus =
        owner === null
          ? "open"
          : isNodeContested(state.nodeOccupancies, node.id)
            ? "contested"
            : "safe";
      const threatStatus = getAiTritiumThreatStatus(content, state, node.id, owner, turn);
      const expectedWorkableTurnsByFaction = Object.fromEntries(
        factionIds.map((candidateFactionId) => [
          candidateFactionId,
          getAiExpectedWorkableTritiumTurns(
            content,
            state,
            candidateFactionId,
            node.id,
            AI_TRYHARD_SOLVENCY_HORIZON_TURNS
          )
        ])
      ) as Partial<Record<FactionId, number>>;
      const expectedExtractableByFaction = Object.fromEntries(
        factionIds.map((candidateFactionId) => [
          candidateFactionId,
          (expectedWorkableTurnsByFaction[candidateFactionId] ?? 0) * tritiumWorkOutput
        ])
      ) as Partial<Record<FactionId, number>>;
      const expectedDenyValueByFaction = Object.fromEntries(
        factionIds.map((candidateFactionId) => [
          candidateFactionId,
          factionIds
            .filter((otherFactionId) => otherFactionId !== candidateFactionId)
            .reduce(
              (total, otherFactionId) =>
                total + (expectedExtractableByFaction[otherFactionId] ?? 0),
              0
            )
        ])
      ) as Partial<Record<FactionId, number>>;

      return {
        nodeId: node.id,
        owner,
        isTritium: true,
        isFinite: false,
        currentStock: Number.POSITIVE_INFINITY,
        maxStock: Number.POSITIVE_INFINITY,
        yieldPerWork: tritiumWorkOutput,
        expectedYieldPerTurn: tritiumWorkOutput,
        turnsToDepletion: Number.POSITIVE_INFINITY,
        extractionTicksRemaining: Number.POSITIVE_INFINITY,
        isDepleted: false,
        postDepletionRole: "none",
        postDepletionPositionValue: 0,
        contestStatus,
        threatStatus,
        expectedWorkableTurnsByFaction,
        expectedExtractableByFaction,
        expectedDenyValueByFaction
      };
    });
}

function getPrimaryFactionAtNode(state: GameState, nodeId: string): FactionId | null {
  return (
    state.nodeOccupancies.find((occupancy) => {
      return occupancy.nodeId === nodeId && occupancy.shipCount > 0;
    })?.factionId ?? null
  );
}

function getAiTritiumThreatStatus(
  content: SimulationContent,
  state: GameState,
  nodeId: string,
  owner: FactionId | null,
  turn: number
): AiTritiumNodeModel["threatStatus"] {
  if (isNodeContested(state.nodeOccupancies, nodeId)) {
    return "contested";
  }

  if (owner !== null && hasIncomingMissileTargetingNode(state, nodeId, owner)) {
    return "missile-threat";
  }

  if (owner !== null && getIncomingEnemyBurnsToNode(state, nodeId, owner, turn + 2).length > 0) {
    return "burn-threat";
  }

  return "safe";
}

function getAiExpectedWorkableTritiumTurns(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  nodeId: string,
  horizonTurns: number
): number {
  const node = getNodeById(content, nodeId);

  if (node?.type !== "tritium") {
    return 0;
  }

  if (
    hasFactionShipAtNode(state, nodeId, factionId) &&
    !isNodeContested(state.nodeOccupancies, nodeId) &&
    !hasPendingAction(state, nodeId, factionId)
  ) {
    const threatened = hasIncomingMissileTargetingNode(state, nodeId, factionId);
    return threatened ? Math.max(0, horizonTurns - 1) : horizonTurns;
  }

  const fastestArrival = getAiAvailableActionOrigins(state, content, factionId)
    .map((originNodeId) => calculateBurnPlan(content, state, originNodeId, nodeId))
    .filter((plan): plan is BurnPlan => plan !== null)
    .sort((first, second) => first.arrivalTurn - second.arrivalTurn)[0];

  if (fastestArrival === undefined) {
    return 0;
  }

  const firstWorkTurnOffset = Math.max(1, fastestArrival.arrivalTurn - state.turn + 1);
  return Math.max(0, horizonTurns - firstWorkTurnOffset + 1);
}

function createAiFactionStrategicRead(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  resources: readonly AiTritiumNodeModel[]
): AiFactionStrategicRead {
  const currentDv = getFactionDv(state, factionId);
  const safeTritiumNodes = getFactionAccessibleTritiumNodeIds(content, state, factionId).length;
  const contestedTritiumNodes = content.nodes.filter((node) => {
    return (
      node.type === "tritium" &&
      hasFactionShipAtNode(state, node.id, factionId) &&
      isNodeContested(state.nodeOccupancies, node.id)
    );
  }).length;
  const threatenedTritiumNodes = content.nodes.filter((node) => {
    return (
      node.type === "tritium" &&
      hasFactionShipAtNode(state, node.id, factionId) &&
      (hasIncomingMissileTargetingNode(state, node.id, factionId) ||
        getIncomingEnemyBurnsToNode(state, node.id, factionId, turn + 2).length > 0)
    );
  }).length;
  const extractableTritiumH2 = resources.reduce(
    (total, model) =>
      total +
      Math.min(
        model.currentStock,
        (model.expectedWorkableTurnsByFaction[factionId] ?? 0) * model.yieldPerWork
      ),
    0
  );
  const extractableTritiumH3 = resources.reduce(
    (total, model) =>
      total +
      Math.min(
        model.currentStock,
        Math.ceil((model.expectedWorkableTurnsByFaction[factionId] ?? 0) * 1.5) * model.yieldPerWork
      ),
    0
  );
  const projectedUpkeepH2 =
    getProjectedFactionContestedUpkeepCost(state, factionId) *
    Math.min(5, AI_TRYHARD_SOLVENCY_HORIZON_TURNS);
  const inboundMissiles = state.activeMissiles.filter((missile) => {
    return missile.targetFactionId === factionId && missile.impactTurn <= turn + 5;
  }).length;
  const likelyEvadeCostH2 = inboundMissiles * automaticEvadeDvCost;
  const mandatoryLaunchRisk = state.mandatoryLaunches.filter((launch) => {
    return launch.factionId === factionId;
  }).length;
  const projectedDvH1 =
    currentDv + getExpectedNextTritiumIncome(content, state, factionId) - likelyEvadeCostH2;
  const projectedDvH2 = currentDv + extractableTritiumH2 - projectedUpkeepH2 - likelyEvadeCostH2;
  const projectedDvH3 =
    currentDv +
    extractableTritiumH3 -
    getProjectedFactionContestedUpkeepCost(state, factionId) * AI_TRYHARD_SOLVENCY_HORIZON_TURNS -
    likelyEvadeCostH2;
  const shipyardCount = getFactionControlledShipyardNodeIds(content, state, factionId).length;
  const nearCompleteShipyards = content.nodes.filter((node) => {
    return (
      node.type === "shipyard" &&
      hasFactionShipAtNode(state, node.id, factionId) &&
      getShipyardProgress(state.shipyardProgress, node.id) >= shipyardCompletionProgress - 2
    );
  }).length;
  const shipCount = countFactionShips(state, factionId);
  const leaderScore =
    safeTritiumNodes * 120 +
    extractableTritiumH2 * 16 +
    currentDv * 4 +
    shipCount * 36 +
    shipyardCount * 70 +
    nearCompleteShipyards * 95 -
    Math.max(0, -projectedDvH2) * 80;
  const emergencyReasons = getAiStrategicEmergencyReasons({
    turn,
    safeTritiumNodes,
    threatenedTritiumNodes,
    projectedDvH2,
    likelyEvadeCostH2,
    projectedUpkeepH2,
    mandatoryLaunchRisk,
    shipCount
  });

  return {
    factionId,
    currentDv,
    projectedDvH1,
    projectedDvH2,
    projectedDvH3,
    shipCount,
    safeTritiumNodes,
    contestedTritiumNodes,
    threatenedTritiumNodes,
    extractableTritiumH2,
    extractableTritiumH3,
    shipyardCount,
    nearCompleteShipyards,
    inboundMissiles,
    likelyEvadeCostH2,
    projectedUpkeepH2,
    mandatoryLaunchRisk,
    leaderScore,
    collapseRisk: projectedDvH2 < 0 || (safeTritiumNodes === 0 && turn >= 5),
    collapseTurn: projectedDvH2 < 0 || (safeTritiumNodes === 0 && turn >= 5) ? turn + 2 : null,
    emergencyReasons
  };
}

function getAiStrategicEmergencyReasons(read: {
  turn: number;
  safeTritiumNodes: number;
  threatenedTritiumNodes: number;
  projectedDvH2: number;
  likelyEvadeCostH2: number;
  projectedUpkeepH2: number;
  mandatoryLaunchRisk: number;
  shipCount: number;
}): readonly string[] {
  const reasons: string[] = [];

  if (read.safeTritiumNodes === 0) {
    reasons.push("zero-safe-tritium-h2");
  }

  if (read.safeTritiumNodes === 0 && read.turn >= 8) {
    reasons.push("zero-safe-tritium-t8-t10");
  }

  if (read.projectedDvH2 < 0) {
    reasons.push("projected-dv-negative-h2");
  }

  if (read.projectedUpkeepH2 > 0 && read.projectedDvH2 < contestedUpkeepDvCost) {
    reasons.push("contested-upkeep-insolvency-risk");
  }

  if (read.likelyEvadeCostH2 > 0 && read.projectedDvH2 < automaticEvadeDvCost) {
    reasons.push("evade-insolvency-risk");
  }

  if (read.safeTritiumNodes <= 1 && read.threatenedTritiumNodes > 0) {
    reasons.push("last-meaningful-tritium-threatened");
  }

  if (read.shipCount <= 0) {
    reasons.push("no-ships");
  }

  if (read.mandatoryLaunchRisk > 0 && read.projectedDvH2 < AI_MIN_DV_RESERVE) {
    reasons.push("mandatory-launch-solvency-risk");
  }

  return reasons;
}

function createAiStrategicStateReadEvents(
  content: SimulationContent,
  state: GameState,
  turn: number,
  read: AiStrategicStateRead
): readonly TurnDebugEvent[] {
  const topTritium = read.resources
    .map((model) => ({
      model,
      value:
        (model.expectedExtractableByFaction[read.factionId] ?? 0) +
        (model.expectedDenyValueByFaction[read.factionId] ?? 0) * 0.35 +
        model.postDepletionPositionValue
    }))
    .sort((first, second) => second.value - first.value)[0];
  const events: TurnDebugEvent[] = [
    {
      turn,
      type: "AI_PHASE_SELECTED",
      message: `AI_PHASE_SELECTED ${read.factionId}: ${read.phase}`,
      factionId: read.factionId,
      projectedDv: read.own.projectedDvH2,
      amount: read.own.safeTritiumNodes,
      reason: read.emergencyMode ? read.own.emergencyReasons.join(",") : read.phase,
      score: read.own.leaderScore
    },
    {
      turn,
      type: "AI_STRATEGIC_READ",
      message: `AI_STRATEGIC_READ ${read.factionId}: phase ${read.phase}; ΔV ${read.own.currentDv}; H2 ${read.own.projectedDvH2}; safe Tritium ${read.own.safeTritiumNodes}; extractable H2 ${read.own.extractableTritiumH2}; leader ${read.leader?.factionId ?? "none"} score ${Math.round(read.leader?.leaderScore ?? 0)}`,
      factionId: read.factionId,
      projectedDv: read.own.projectedDvH2,
      amount: read.own.extractableTritiumH2,
      reason: read.emergencyMode ? read.own.emergencyReasons.join(",") : "stable",
      score: read.own.leaderScore
    },
    {
      turn,
      type: "AI_SOLVENCY_FORECAST",
      message: `AI_SOLVENCY_FORECAST ${read.factionId}: H1 ${read.own.projectedDvH1}; H2 ${read.own.projectedDvH2}; H3 ${read.own.projectedDvH3}; upkeep H2 ${read.own.projectedUpkeepH2}; evade H2 ${read.own.likelyEvadeCostH2}`,
      factionId: read.factionId,
      projectedDv: read.own.projectedDvH2,
      amount: read.own.likelyEvadeCostH2,
      reason: read.own.collapseRisk ? "collapse-risk" : "solvent"
    }
  ];

  if (read.emergencyMode) {
    events.push({
      turn,
      type: "AI_EMERGENCY_SOLVENCY_ENTERED",
      message: `AI_EMERGENCY_SOLVENCY_ENTERED ${read.factionId}: ${read.own.emergencyReasons.join(", ")}`,
      factionId: read.factionId,
      projectedDv: read.own.projectedDvH2,
      reason: read.own.emergencyReasons.join(","),
      score: 1000
    });
  }

  if (topTritium !== undefined) {
    events.push(
      {
        turn,
        type: "AI_TRITIUM_VALUE_EVAL",
        message: `AI_TRITIUM_VALUE_EVAL ${read.factionId}: ${getNodeDisplayName(content, topTritium.model.nodeId)} yield ${topTritium.model.yieldPerWork}; finite ${formatYesNo(topTritium.model.isFinite)}; expected own extractable ${topTritium.model.expectedExtractableByFaction[read.factionId] ?? 0}; deny ${topTritium.model.expectedDenyValueByFaction[read.factionId] ?? 0}`,
        nodeId: topTritium.model.nodeId,
        factionId: read.factionId,
        amount: topTritium.model.expectedExtractableByFaction[read.factionId] ?? 0,
        reason: "yield-aware-tritium-model",
        score: topTritium.value
      },
      {
        turn,
        type: "AI_FINITE_TRITIUM_STOCK_EVAL",
        message: `AI_FINITE_TRITIUM_STOCK_EVAL ${getNodeDisplayName(content, topTritium.model.nodeId)}: current infinite rules represented as finite=${formatYesNo(topTritium.model.isFinite)}, stock ${formatAiStock(topTritium.model.currentStock)}, depletion ${formatAiStock(topTritium.model.turnsToDepletion)}`,
        nodeId: topTritium.model.nodeId,
        factionId: read.factionId,
        amount: topTritium.model.yieldPerWork,
        reason: "future-finite-tritium-compatible"
      },
      {
        turn,
        type: "AI_DEPLETED_POSITION_VALUE",
        message: `AI_DEPLETED_POSITION_VALUE ${getNodeDisplayName(content, topTritium.model.nodeId)}: role ${topTritium.model.postDepletionRole}; position value ${topTritium.model.postDepletionPositionValue}`,
        nodeId: topTritium.model.nodeId,
        factionId: read.factionId,
        amount: topTritium.model.postDepletionPositionValue,
        reason: "post-depletion-hook"
      }
    );
  }

  const bestShipyard = content.nodes
    .filter((node) => node.type === "shipyard")
    .map((node) => ({
      node,
      owner: getPrimaryFactionAtNode(state, node.id),
      progress: getShipyardProgress(state.shipyardProgress, node.id)
    }))
    .sort((first, second) => second.progress - first.progress)[0];

  if (bestShipyard !== undefined) {
    events.push({
      turn,
      type: "AI_SHIPYARD_THREAT_EVAL",
      message: `AI_SHIPYARD_THREAT_EVAL ${read.factionId}: ${getNodeDisplayName(content, bestShipyard.node.id)} owner ${bestShipyard.owner ?? "none"} progress ${bestShipyard.progress}/${shipyardCompletionProgress}; near completion ${formatYesNo(bestShipyard.progress >= shipyardCompletionProgress - 2)}`,
      nodeId: bestShipyard.node.id,
      factionId: read.factionId,
      ...(bestShipyard.owner === null ? {} : { targetFactionId: bestShipyard.owner }),
      progress: bestShipyard.progress,
      reason: "shipyard-conversion-threat",
      score: bestShipyard.progress * 120
    });
  }

  if (read.leader !== null && read.leader.factionId !== read.factionId) {
    events.push({
      turn,
      type: "AI_LEADER_DENIAL_ACTION",
      message: `AI_LEADER_DENIAL_ACTION audit ${read.factionId}: leader ${read.leader.factionId}; safe Tritium ${read.leader.safeTritiumNodes}; shipyards ${read.leader.shipyardCount}; H2 ${read.leader.projectedDvH2}`,
      factionId: read.factionId,
      targetFactionId: read.leader.factionId,
      projectedDv: read.leader.projectedDvH2,
      amount: read.leader.safeTritiumNodes,
      reason: "leader-score-read",
      score: read.leader.leaderScore
    });
  }

  return events;
}

function formatAiStock(value: number): string {
  return Number.isFinite(value) ? String(value) : "infinite";
}

function isAiSecondTritiumCandidate(candidate: AiTryhardActionCandidate): boolean {
  return (
    candidate.kind === "second-tritium" ||
    candidate.kind === "counter-second-tritium" ||
    candidate.kind === "tritium-denial"
  );
}

function isAiIndependentTritiumCandidate(candidate: AiTryhardActionCandidate): boolean {
  return (
    candidate.action === "BURN" &&
    (candidate.kind === "second-tritium" ||
      candidate.kind === "counter-second-tritium" ||
      candidate.kind === "tritium-race")
  );
}

function isAiOpeningBarrenTritiumCandidate(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  candidate: AiTryhardActionCandidate
): boolean {
  return (
    candidate.action === "BURN" &&
    getNodeById(content, candidate.originNodeId)?.type === "barren" &&
    getNodeById(content, candidate.targetNodeId)?.type === "tritium" &&
    !hasEnemyShipAtNode(state, candidate.targetNodeId, factionId) &&
    !isNodeContested(state.nodeOccupancies, candidate.targetNodeId)
  );
}

function compareAiTryhardActionCandidates(
  first: AiTryhardActionCandidate,
  second: AiTryhardActionCandidate
): number {
  if (first.score !== second.score) {
    return second.score - first.score;
  }

  if (first.etaTurns !== second.etaTurns) {
    return first.etaTurns - second.etaTurns;
  }

  if (first.burnCost !== second.burnCost) {
    return first.burnCost - second.burnCost;
  }

  return first.targetNodeId.localeCompare(second.targetNodeId);
}

function getAiSecondTritiumContext(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number
): AiSecondTritiumContext {
  const aiSecuredTritiumCount = getAiSecuredTritiumNodeIds(content, state, factionId, turn).length;
  const aiProjectedTritiumCount = getAiProjectedSecuredTritiumCount(
    content,
    state,
    factionId,
    turn + 2
  );
  const enemyProjectedCounts = getEnemyFactionIds(state, factionId).map((enemyFactionId) =>
    getAiProjectedSecuredTritiumCount(content, state, enemyFactionId, turn + 2)
  );
  const strongestEnemyProjectedTritiumCount =
    enemyProjectedCounts.length === 0 ? 0 : Math.max(...enemyProjectedCounts);
  const humanProjectedTritiumCount =
    getActiveFactionIds(state).includes(defaultPlayerFactionId) &&
    isHumanControlledFaction(state, defaultPlayerFactionId)
      ? getAiProjectedSecuredTritiumCount(content, state, defaultPlayerFactionId, turn + 2)
      : 0;
  const humanSecondTritiumMoves = getAiHumanSecondTritiumMoves(content, state, turn);
  const hasNonProductiveActionOrigin = getAiAvailableActionOrigins(state, content, factionId).some(
    (originNodeId) => {
      const node = getNodeById(content, originNodeId);
      return node !== undefined && !isProductiveNode(node);
    }
  );
  const enemyGreedyTritiumPressure =
    humanProjectedTritiumCount >= 2 || strongestEnemyProjectedTritiumCount >= 2;
  const secondTritiumRequired = hasNonProductiveActionOrigin && aiProjectedTritiumCount < 2;
  const tritiumEmergency = aiProjectedTritiumCount <= 1 && enemyGreedyTritiumPressure;

  return {
    aiSecuredTritiumCount,
    aiProjectedTritiumCount,
    strongestEnemyProjectedTritiumCount,
    humanProjectedTritiumCount,
    humanSecondTritiumMoves,
    secondTritiumRequired,
    tritiumEmergency,
    hasSafeFallbackTritium:
      getAiReachableTritiumNodeCount(content, state, factionId) > aiSecuredTritiumCount
  };
}

function getAiSecuredTritiumNodeIds(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number
): readonly string[] {
  return content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => {
      return (
        hasFactionShipAtNode(state, node.id, factionId) &&
        !isNodeContested(state.nodeOccupancies, node.id) &&
        !hasPendingAction(state, node.id, factionId) &&
        !hasIncomingMissileTargetingNode(state, node.id, factionId) &&
        getIncomingEnemyBurnsToNode(state, node.id, factionId, turn).length === 0
      );
    })
    .map((node) => node.id);
}

function getAiProjectedSecuredTritiumCount(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  horizonTurn: number
): number {
  const securedNodeIds = new Set(
    getAiSecuredTritiumNodeIds(content, state, factionId, horizonTurn)
  );

  for (const order of [...state.pendingBurnOrders, ...state.activeBurnTransits]) {
    const destinationNode = getNodeById(content, order.destinationNodeId);

    if (
      order.factionId !== factionId ||
      order.arrivalTurn > horizonTurn ||
      destinationNode?.type !== "tritium" ||
      hasEnemyShipAtNode(state, order.destinationNodeId, factionId) ||
      hasIncomingMissileTargetingNode(state, order.destinationNodeId, factionId) ||
      getIncomingEnemyBurnsToNode(state, order.destinationNodeId, factionId, order.arrivalTurn)
        .length > 0
    ) {
      continue;
    }

    securedNodeIds.add(order.destinationNodeId);
  }

  return securedNodeIds.size;
}

function getAiHumanSecondTritiumMoves(
  content: SimulationContent,
  state: GameState,
  turn: number
): readonly (PendingBurnOrder | ActiveBurnTransit)[] {
  if (
    state.turn > AI_TRYHARD_SECOND_TRITIUM_OPENING_END_TURN ||
    !isHumanControlledFaction(state, defaultPlayerFactionId)
  ) {
    return [];
  }

  return [...state.pendingBurnOrders, ...state.activeBurnTransits].filter((order) => {
    const originNode = getNodeById(content, order.originNodeId);
    const destinationNode = getNodeById(content, order.destinationNodeId);

    return (
      order.factionId === defaultPlayerFactionId &&
      order.arrivalTurn <= turn + AI_TRYHARD_SECOND_TRITIUM_OPENING_END_TURN &&
      originNode !== undefined &&
      destinationNode?.type === "tritium" &&
      !isProductiveNode(originNode)
    );
  });
}

function getAiSecondTritiumUrgency(
  state: GameState,
  plan: BurnPlan,
  context: AiSecondTritiumContext,
  sameHumanTritium: boolean
): number {
  let urgency = 0;

  if (
    state.turn <= AI_TRYHARD_SECOND_TRITIUM_OPENING_END_TURN &&
    context.aiProjectedTritiumCount < 2
  ) {
    urgency += 1000;
  }

  if (context.humanSecondTritiumMoves.length > 0) {
    urgency += 500;
  }

  if (context.strongestEnemyProjectedTritiumCount >= 2 || context.humanProjectedTritiumCount >= 2) {
    urgency += 300;
  }

  if (!context.hasSafeFallbackTritium) {
    urgency += 200;
  }

  if (sameHumanTritium) {
    urgency += 260;
  }

  return Math.max(0, urgency - plan.burnCost * 24 - plan.etaTurns * 34);
}

function getAiTryhardTritiumRaceCandidates(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  debugEvents: TurnDebugEvent[],
  secondTritiumContext: AiSecondTritiumContext
): readonly AiTryhardActionCandidate[] {
  const actionOrigins = getAiAvailableActionOrigins(state, content, factionId);
  const candidates: AiTryhardActionCandidate[] = [];
  const enemyTritiumMoves = [...state.pendingBurnOrders, ...state.activeBurnTransits]
    .filter((order) => {
      if (order.factionId === factionId || order.arrivalTurn > turn + 4) {
        return false;
      }

      const originNode = getNodeById(content, order.originNodeId);
      const destinationNode = getNodeById(content, order.destinationNodeId);

      return (
        destinationNode?.type === "tritium" &&
        originNode !== undefined &&
        !isProductiveNode(originNode)
      );
    })
    .sort((first, second) => first.arrivalTurn - second.arrivalTurn);

  for (const enemyMove of enemyTritiumMoves) {
    debugEvents.push({
      turn,
      type: "AI_TRITIUM_RACE_DETECTED",
      message: `AI_TRITIUM_RACE_DETECTED: ${enemyMove.factionId} is racing ${getNodeDisplayName(content, enemyMove.originNodeId)} -> ${getNodeDisplayName(content, enemyMove.destinationNodeId)} arriving T${enemyMove.arrivalTurn}`,
      nodeId: enemyMove.originNodeId,
      factionId,
      targetFactionId: enemyMove.factionId,
      targetNodeId: enemyMove.destinationNodeId,
      etaTurns: Math.max(0, enemyMove.arrivalTurn - state.turn),
      reason: "enemy-staging-ship-to-tritium"
    });

    for (const originNodeId of actionOrigins) {
      const plan = getLegalBurnPlan(
        content,
        state,
        originNodeId,
        enemyMove.destinationNodeId,
        factionId
      );

      if (plan === null) {
        continue;
      }

      const beatsOrMatchesEnemy = plan.arrivalTurn <= enemyMove.arrivalTurn;
      const isHumanSecondTritiumMove =
        enemyMove.factionId === defaultPlayerFactionId &&
        secondTritiumContext.humanSecondTritiumMoves.some((move) => move.id === enemyMove.id);
      const secondTritiumUrgency = getAiSecondTritiumUrgency(
        state,
        plan,
        secondTritiumContext,
        true
      );
      candidates.push({
        kind: isHumanSecondTritiumMove ? "counter-second-tritium" : "tritium-race",
        action: "BURN",
        originNodeId,
        targetNodeId: enemyMove.destinationNodeId,
        targetFactionId: enemyMove.factionId,
        score: 1240 + (beatsOrMatchesEnemy ? 360 : 120) - plan.etaTurns * 44 - plan.burnCost * 38,
        reason: beatsOrMatchesEnemy
          ? "tritium-race:beat-or-match-enemy-arrival"
          : "tritium-race:late-contest-pressure",
        etaTurns: plan.etaTurns,
        burnCost: plan.burnCost,
        expectedDvSwing: tritiumWorkOutput * AI_TRYHARD_SOLVENCY_HORIZON_TURNS,
        expectedDeniedWork: tritiumWorkOutput,
        decisive: true
      });
      const lastCandidate = candidates[candidates.length - 1];

      if (lastCandidate !== undefined) {
        candidates[candidates.length - 1] = {
          ...lastCandidate,
          score: lastCandidate.score + secondTritiumUrgency,
          reason: `${lastCandidate.reason}:second-tritium-urgency`
        };
      }
    }
  }

  const hasShipyardEmergency =
    getFactionControlledShipyardNodeIds(content, state, factionId).length === 0;

  if (
    !secondTritiumContext.secondTritiumRequired &&
    (state.turn > AI_TRYHARD_SECOND_TRITIUM_OPENING_END_TURN ||
      (hasShipyardEmergency &&
        !secondTritiumContext.tritiumEmergency &&
        secondTritiumContext.humanSecondTritiumMoves.length === 0))
  ) {
    return candidates;
  }

  for (const originNodeId of actionOrigins) {
    const originNode = getNodeById(content, originNodeId);

    if (originNode === undefined || isProductiveNode(originNode)) {
      continue;
    }

    for (const destinationNode of content.nodes) {
      if (
        destinationNode.type !== "tritium" ||
        hasFactionShipAtNode(state, destinationNode.id, factionId)
      ) {
        continue;
      }

      const plan = getLegalBurnPlan(content, state, originNodeId, destinationNode.id, factionId);

      if (plan === null) {
        continue;
      }

      const enemyAtDestination = hasEnemyShipAtNode(state, destinationNode.id, factionId);
      const targetFactionId = getPrimaryEnemyFactionAtNode(state, destinationNode.id, factionId);
      const secondTritiumUrgency = getAiSecondTritiumUrgency(
        state,
        plan,
        secondTritiumContext,
        false
      );
      candidates.push({
        kind: secondTritiumContext.secondTritiumRequired ? "second-tritium" : "tritium-race",
        action: "BURN",
        originNodeId,
        targetNodeId: destinationNode.id,
        ...(targetFactionId === null ? {} : { targetFactionId }),
        score:
          840 +
          (enemyAtDestination ? 260 : 0) +
          secondTritiumUrgency +
          (secondTritiumContext.tritiumEmergency ? 520 : 0) +
          getAiBurnWindowScore(plan) -
          plan.burnCost * 28 -
          plan.etaTurns * 32,
        reason: enemyAtDestination
          ? "opening-tritium:contest-occupied-source"
          : "opening-tritium:claim-fallback-source",
        etaTurns: plan.etaTurns,
        burnCost: plan.burnCost,
        expectedDvSwing: tritiumWorkOutput * AI_TRYHARD_SOLVENCY_HORIZON_TURNS,
        expectedDeniedWork: enemyAtDestination ? tritiumWorkOutput : 0,
        decisive: getFactionAccessibleTritiumNodeIds(content, state, factionId).length <= 1
      });
    }
  }

  return candidates;
}

function getAiTryhardShipyardTheftCandidates(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  debugEvents: TurnDebugEvent[]
): readonly AiTryhardActionCandidate[] {
  const actionOrigins = getAiAvailableActionOrigins(state, content, factionId);
  const candidates: AiTryhardActionCandidate[] = [];
  const controlledShipyards = getFactionControlledShipyardNodeIds(content, state, factionId).length;

  for (const shipyard of content.nodes.filter((node) => node.type === "shipyard")) {
    const progress = getShipyardProgress(state.shipyardProgress, shipyard.id);
    const workerFactionId = getShipyardWorkerFactionId(state.shipyardProgress, shipyard.id);
    const targetFactionId =
      getPrimaryEnemyFactionAtNode(state, shipyard.id, factionId) ??
      (workerFactionId !== undefined && workerFactionId !== factionId
        ? workerFactionId
        : undefined);
    if (
      targetFactionId === undefined ||
      hasFactionShipAtNode(state, shipyard.id, factionId) ||
      (progress < shipyardCompletionProgress - 2 && controlledShipyards > 0)
    ) {
      continue;
    }

    for (const originNodeId of actionOrigins) {
      const plan = getLegalBurnPlan(content, state, originNodeId, shipyard.id, factionId);

      if (plan === null) {
        continue;
      }

      const score =
        760 +
        progress * 155 +
        (progress >= shipyardCompletionProgress - 1 ? 280 : 0) +
        (controlledShipyards === 0 ? 360 : 0) +
        (hasEnemyShipAtNode(state, shipyard.id, factionId) ? 150 : 0) +
        getAiBurnWindowScore(plan) -
        plan.burnCost * 30 -
        plan.etaTurns * 36;
      const candidate: AiTryhardActionCandidate = {
        kind: "shipyard-theft",
        action: "BURN",
        originNodeId,
        targetNodeId: shipyard.id,
        targetFactionId,
        score,
        reason: `shipyard-theft:${progress}/${shipyardCompletionProgress}`,
        etaTurns: plan.etaTurns,
        burnCost: plan.burnCost,
        expectedDvSwing: progress * 2 + (controlledShipyards === 0 ? 4 : 0),
        expectedDeniedWork: Math.max(1, progress),
        decisive: progress >= shipyardCompletionProgress - 1 || controlledShipyards === 0
      };

      const openingSolvencyCheck = getAiOpeningSolvencyReserveCheck(
        content,
        state,
        factionId,
        turn,
        candidate,
        plan,
        shipyard
      );
      debugEvents.push(
        createAiSolvencyReserveEvent(
          content,
          turn,
          factionId,
          originNodeId,
          shipyard.id,
          openingSolvencyCheck
        )
      );

      if (openingSolvencyCheck.reason !== null) {
        debugEvents.push(
          createAiRejectedOpeningBurnEvent(
            content,
            turn,
            factionId,
            originNodeId,
            shipyard.id,
            openingSolvencyCheck
          )
        );
      }

      debugEvents.push({
        turn,
        type: "AI_SHIPYARD_THEFT_CANDIDATE",
        message: `AI_SHIPYARD_THEFT_CANDIDATE: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, shipyard.id)} progress ${progress}/${shipyardCompletionProgress}; score ${Math.round(score)}`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        destinationNodeId: shipyard.id,
        targetFactionId,
        etaTurns: plan.etaTurns,
        burnCost: plan.burnCost,
        score,
        progress
      });
      candidates.push(candidate);
    }
  }

  return candidates;
}

function getAiTryhardEconomicFireCandidates(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  debugEvents: TurnDebugEvent[],
  secondTritiumContext: AiSecondTritiumContext,
  strategicRead: AiStrategicStateRead,
  aiPlanningOptions: AiPlanningOptions = {}
): readonly AiTryhardActionCandidate[] {
  const actionOrigins = getAiAvailableActionOrigins(state, content, factionId);
  const candidates: AiTryhardActionCandidate[] = [];
  const ownTritiumAccess = getFactionAccessibleTritiumNodeIds(content, state, factionId).length;
  const allTritiumUnavailable = content.nodes
    .filter((node) => node.type === "tritium")
    .every((node) => {
      return (
        hasEnemyShipAtNode(state, node.id, factionId) ||
        hasFactionShipAtNode(state, node.id, factionId)
      );
    });

  for (const originNodeId of actionOrigins) {
    for (const node of content.nodes.filter(isProductiveNode)) {
      const plan = calculateFirePlan(content, state, originNodeId, node.id);

      if (plan === null) {
        continue;
      }

      const target = getFireTargetAtNode(state, plan, factionId);

      if (target === undefined) {
        continue;
      }

      const targetedPlan = adjustFirePlanForTargetAvailability(content, plan, target);
      const targetTritiumAccess = getFactionAccessibleTritiumNodeIds(
        content,
        state,
        target.factionId
      ).length;
      const shipyardProgress = getShipyardProgress(state.shipyardProgress, node.id);
      const isEmergencyDenial =
        (node.type === "tritium" && targetTritiumAccess >= Math.max(2, ownTritiumAccess + 1)) ||
        (node.type === "tritium" &&
          allTritiumUnavailable &&
          secondTritiumContext.aiSecuredTritiumCount < 2) ||
        (node.type === "shipyard" && shipyardProgress >= shipyardCompletionProgress - 2);

      if (!isEmergencyDenial) {
        continue;
      }

      const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
        action: "FIRE",
        originNodeId,
        actionCost: 0,
        destinationNode: node,
        etaTurns: targetedPlan.missileEtaTurns,
        lostWorkCost: getAiFireOpportunityCost(content, state, factionId, originNodeId)
      });
      debugEvents.push(
        ...createAiActionSolvencyForecastEvents(
          content,
          turn,
          factionId,
          originNodeId,
          actionForecast,
          { targetNodeId: node.id }
        )
      );

      const rejectionReason = getAiFireRejectionReason(
        state,
        content,
        node,
        factionId,
        target.factionId,
        {
          originNodeId,
          impactTurn: targetedPlan.impactTurn
        }
      );

      if (rejectionReason !== null) {
        const fireLineProjection = getAiFireTacticalLineProjection(
          content,
          state,
          factionId,
          originNodeId,
          node,
          target.factionId,
          targetedPlan.missileEtaTurns,
          getAiFireTargetScore(state, content, node, factionId, target.factionId),
          {
            originNodeId,
            impactTurn: targetedPlan.impactTurn
          }
        );
        debugEvents.push(
          createAiTacticalLineAuditEvent(
            content,
            turn,
            factionId,
            originNodeId,
            node.id,
            fireLineProjection,
            false,
            rejectionReason
          )
        );
        debugEvents.push(
          createAiTryhardActionRejectedEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            rejectionReason,
            { targetNodeId: node.id }
          )
        );
        debugEvents.push(
          ...createAiFireGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { targetNodeId: node.id }
          )
        );
        continue;
      }

      const certainty = classifyAiFireOutcome(content, state, node, factionId, target.factionId, {
        originNodeId,
        impactTurn: targetedPlan.impactTurn
      });
      const strategicValueReason = getAiFireStrategicValueReason(
        state,
        content,
        node,
        factionId,
        target.factionId,
        {
          originNodeId,
          impactTurn: targetedPlan.impactTurn
        }
      );
      const opportunityCost = getAiFireOpportunityCost(content, state, factionId, originNodeId);
      const lastTritiumWorker = isAiLastActiveTritiumWorker(
        content,
        state,
        factionId,
        originNodeId
      );
      const expectedDeniedWork = getAiExpectedDeniedWorkValue(state, node, target.factionId);
      const forcedFire =
        (certainty !== "PRESSURE_ONLY" && certainty !== "HARMLESS") ||
        strategicValueReason !== null;
      const leaderTargetBonus = strategicRead.leader?.factionId === target.factionId ? 260 : 0;
      const enemyRead = strategicRead.factions.find((read) => read.factionId === target.factionId);
      const enemyInsolvencyBonus =
        enemyRead !== undefined && enemyRead.projectedDvH2 <= automaticEvadeDvCost ? 320 : 0;
      const expectedEvadeTax = getAiExpectedFireEvadeTax(
        state,
        node.id,
        target.factionId,
        factionId,
        targetedPlan.impactTurn
      );
      const expectedDvSwing = forcedFire
        ? expectedEvadeTax + expectedDeniedWork
        : Math.max(0, Math.min(expectedDeniedWork, opportunityCost));
      const rawScore =
        getAiFireTargetScore(state, content, node, factionId, target.factionId) +
        expectedDvSwing * 82 +
        (node.type === "tritium" ? 300 : 160 + shipyardProgress * 72) -
        targetedPlan.missileEtaTurns * 28 +
        leaderTargetBonus +
        enemyInsolvencyBonus +
        (strategicValueReason === null ? 0 : 240) +
        (secondTritiumContext.tritiumEmergency && node.type === "tritium" ? 620 : 0);
      const safeWorkCap = opportunityCost > 0 ? 420 : 510;
      const score = forcedFire ? rawScore - opportunityCost * 90 : Math.min(rawScore, safeWorkCap);
      const conservativeFireAllowed =
        !isAiConservativeStrategicPhase(strategicRead.phase) ||
        forcedFire ||
        (node.type === "tritium" &&
          (targetTritiumAccess <= 1 ||
            ownTritiumAccess <= 1 ||
            secondTritiumContext.tritiumEmergency));

      const recoveryFireAllowed =
        strategicRead.phase !== "RECOVERY_CONSERVATIVE" ||
        certainty === "FORCED_KILL" ||
        certainty === "FORCED_ENEMY_INSOLVENCY" ||
        strategicValueReason === "fire:contested-before-impact" ||
        strategicValueReason?.startsWith("fire:stacked-") === true;

      if (!conservativeFireAllowed || !recoveryFireAllowed) {
        const reason = "fire:conservative-tritium-first";
        debugEvents.push({
          turn,
          type: "AI_FIRE_REJECTED_CONSERVATIVE_TRITIUM_FIRST",
          message: `AI_FIRE_REJECTED_CONSERVATIVE_TRITIUM_FIRST: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, node.id)} rejected in ${strategicRead.phase}`,
          nodeId: originNodeId,
          factionId,
          action: "FIRE",
          targetNodeId: node.id,
          targetFactionId: target.factionId,
          reason,
          score
        });
        debugEvents.push(
          createAiTryhardActionRejectedEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            reason,
            {
              targetNodeId: node.id
            }
          )
        );
        continue;
      }

      const noFireRejectionReason = getNoFireProfileRejectionReason(factionId, aiPlanningOptions);

      if (noFireRejectionReason !== null) {
        debugEvents.push(
          createAiTryhardActionRejectedEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            noFireRejectionReason,
            { targetNodeId: node.id }
          )
        );
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            noFireRejectionReason,
            { targetNodeId: node.id }
          )
        );
        continue;
      }

      if (strategicValueReason !== null) {
        debugEvents.push(
          createAiEvadeTaxValuedEvent(
            content,
            turn,
            factionId,
            originNodeId,
            node.id,
            target.factionId,
            strategicValueReason,
            score
          )
        );

        if (strategicValueReason.includes("upkeep")) {
          debugEvents.push(
            createAiContestedUpkeepAttackEvent(
              content,
              turn,
              factionId,
              originNodeId,
              node.id,
              target.factionId,
              strategicValueReason,
              score
            )
          );
        }
      }

      candidates.push({
        kind: node.type === "tritium" ? "tritium-denial" : "economic-fire",
        action: "FIRE",
        originNodeId,
        targetNodeId: node.id,
        targetFactionId: target.factionId,
        score,
        reason:
          strategicValueReason ??
          (node.type === "tritium"
            ? "economic-fire:deny-tritium"
            : "economic-fire:shipyard-timing"),
        etaTurns: targetedPlan.missileEtaTurns,
        burnCost: 0,
        expectedDvSwing,
        expectedDeniedWork,
        certainty,
        lastTritiumWorker,
        opportunityCost,
        decisive:
          node.type === "tritium"
            ? ownTritiumAccess <= 1 && targetTritiumAccess >= 2
            : shipyardProgress >= shipyardCompletionProgress - 1
      });
    }
  }

  return candidates;
}

function applyAiTryhardCandidate(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  turn: number,
  candidate: AiTryhardActionCandidate,
  secondTritiumContext: AiSecondTritiumContext
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [];

  if (candidate.action === "FIRE") {
    const targetNode = getNodeById(content, candidate.targetNodeId);

    if (targetNode === undefined || candidate.targetFactionId === undefined) {
      return {
        state,
        debugEvents: [
          createAiTryhardActionRejectedEvent(
            content,
            turn,
            factionId,
            candidate.originNodeId,
            "FIRE",
            "unknown-target",
            { targetNodeId: candidate.targetNodeId }
          )
        ]
      };
    }

    const fireLineProjection = getAiFireTacticalLineProjection(
      content,
      state,
      factionId,
      candidate.originNodeId,
      targetNode,
      candidate.targetFactionId,
      candidate.etaTurns,
      candidate.score,
      {
        originNodeId: candidate.originNodeId,
        impactTurn: turn + candidate.etaTurns
      }
    );
    const lastTritiumFireAllowed =
      !fireLineProjection.lastTritiumWorker ||
      isAiForcedLastTritiumFireClassification(fireLineProjection.classification) ||
      isAiPreventingImmediateCollapse(content, state, factionId);
    const reserveAllowed =
      !fireLineProjection.reserveViolation || canAiAcceptProvenTacticalLine(fireLineProjection);

    if (!lastTritiumFireAllowed || !reserveAllowed || !fireLineProjection.accepted) {
      const reason = !lastTritiumFireAllowed
        ? "fire:last-tritium-worker-opportunity-cost"
        : !reserveAllowed
          ? "fire:reserve-violation-not-forced"
          : fireLineProjection.reason;
      debugEvents.push(
        createAiTacticalLineAuditEvent(
          content,
          turn,
          factionId,
          candidate.originNodeId,
          candidate.targetNodeId,
          fireLineProjection,
          false,
          reason
        )
      );
      debugEvents.push(
        createAiTryhardActionRejectedEvent(
          content,
          turn,
          factionId,
          candidate.originNodeId,
          "FIRE",
          reason,
          { targetNodeId: candidate.targetNodeId }
        )
      );
      debugEvents.push(
        ...createAiFireGuardrailEventsForRejection(
          content,
          turn,
          factionId,
          candidate.originNodeId,
          reason,
          { targetNodeId: candidate.targetNodeId }
        )
      );
      return { state, debugEvents };
    }

    const shipyardLockReason = getAiShipyardCompletionLockReason(
      content,
      state,
      factionId,
      turn,
      candidate.originNodeId,
      candidate
    );

    if (shipyardLockReason !== null) {
      debugEvents.push(
        createAiShipyardCompletionLockEvent(
          content,
          state,
          turn,
          factionId,
          candidate.originNodeId,
          shipyardLockReason,
          candidate
        )
      );
      return { state, debugEvents };
    }

    debugEvents.push(
      createAiTacticalLineAuditEvent(
        content,
        turn,
        factionId,
        candidate.originNodeId,
        candidate.targetNodeId,
        fireLineProjection,
        true,
        fireLineProjection.reason
      )
    );

    const nextState = assignPendingFireOrder(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: candidate.originNodeId,
        targetNodeId: candidate.targetNodeId,
        factionId
      },
      content
    );

    if (nextState === state) {
      debugEvents.push(
        createAiTryhardActionRejectedEvent(
          content,
          turn,
          factionId,
          candidate.originNodeId,
          "FIRE",
          "assignment-failed",
          { targetNodeId: candidate.targetNodeId }
        )
      );
      debugEvents.push(
        ...createAiSecondTritiumRejectedEvents(
          content,
          turn,
          factionId,
          "assignment-failed",
          secondTritiumContext,
          candidate
        )
      );
    }

    return { state: nextState, debugEvents };
  }

  const plan = getLegalBurnPlan(
    content,
    state,
    candidate.originNodeId,
    candidate.targetNodeId,
    factionId
  );

  if (plan === null) {
    debugEvents.push(
      createAiTryhardActionRejectedEvent(
        content,
        turn,
        factionId,
        candidate.originNodeId,
        "BURN",
        "no-legal-burn",
        { destinationNodeId: candidate.targetNodeId }
      )
    );
    debugEvents.push(
      ...createAiSecondTritiumRejectedEvents(
        content,
        turn,
        factionId,
        "no-legal-burn",
        secondTritiumContext,
        candidate
      )
    );
    return { state, debugEvents };
  }

  const burnCheck = getAiTryhardBurnCommitmentCheck(
    content,
    state,
    factionId,
    turn,
    candidate,
    plan
  );
  debugEvents.push(...burnCheck.debugEvents);

  if (burnCheck.rejectionReason !== null) {
    debugEvents.push(
      createAiTryhardActionRejectedEvent(
        content,
        turn,
        factionId,
        candidate.originNodeId,
        "BURN",
        burnCheck.rejectionReason,
        { destinationNodeId: candidate.targetNodeId }
      )
    );
    debugEvents.push(
      ...createAiSecondTritiumRejectedEvents(
        content,
        turn,
        factionId,
        burnCheck.rejectionReason,
        secondTritiumContext,
        candidate
      )
    );
    return { state, debugEvents };
  }

  const nextState = assignPendingBurnOrder(
    state,
    {
      type: "ASSIGN_BURN_ORDER",
      originNodeId: candidate.originNodeId,
      destinationNodeId: candidate.targetNodeId,
      factionId
    },
    content
  );

  if (nextState === state) {
    debugEvents.push(
      createAiTryhardActionRejectedEvent(
        content,
        turn,
        factionId,
        candidate.originNodeId,
        "BURN",
        "assignment-failed",
        { destinationNodeId: candidate.targetNodeId }
      )
    );
    debugEvents.push(
      ...createAiSecondTritiumRejectedEvents(
        content,
        turn,
        factionId,
        "assignment-failed",
        secondTritiumContext,
        candidate
      )
    );
  } else if (
    turn <= 1 &&
    getNodeById(content, candidate.originNodeId)?.type === "barren" &&
    getNodeById(content, candidate.targetNodeId)?.type === "tritium" &&
    isAiOpeningBarrenTritiumCandidate(content, state, factionId, candidate)
  ) {
    debugEvents.push({
      turn,
      type: "AI_NEAREST_TRITIUM_DEFAULT_BURN",
      message: `AI_NEAREST_TRITIUM_DEFAULT_BURN: turn-1 barren opening ${getNodeDisplayName(content, candidate.originNodeId)} -> ${getNodeDisplayName(content, candidate.targetNodeId)}`,
      nodeId: candidate.originNodeId,
      factionId,
      action: "BURN",
      destinationNodeId: candidate.targetNodeId,
      burnCost: plan.burnCost,
      etaTurns: plan.etaTurns,
      reason: "turn-1-nearest-tritium"
    });
  }

  return { state: nextState, debugEvents };
}

function getAiTryhardBurnCommitmentCheck(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  candidate: AiTryhardActionCandidate,
  plan: BurnPlan
): Readonly<{ rejectionReason: string | null; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [];
  const destinationNode = getNodeById(content, candidate.targetNodeId);

  if (destinationNode === undefined) {
    return { rejectionReason: "unknown-destination", debugEvents };
  }

  const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
    action: "BURN",
    originNodeId: plan.originNodeId,
    actionCost: plan.burnCost,
    destinationNode,
    etaTurns: plan.etaTurns,
    entryNodeId: hasEnemyShipAtNode(state, destinationNode.id, factionId)
      ? destinationNode.id
      : null,
    losesOriginIncome: true
  });
  debugEvents.push(
    ...createAiActionSolvencyForecastEvents(
      content,
      turn,
      factionId,
      plan.originNodeId,
      actionForecast,
      { destinationNodeId: destinationNode.id }
    )
  );
  const forecastRejection = getAiActionSolvencyRejectionReason(actionForecast, {
    allowsTritiumRecovery: destinationNode.type === "tritium",
    decisive: candidate.decisive
  });

  if (forecastRejection !== null) {
    return { rejectionReason: forecastRejection, debugEvents };
  }

  const burnPurpose = candidate.kind === "shipyard-theft" ? "shipyard-recovery" : "expansion";
  const lineProjection = getAiBurnTacticalLineProjection(
    content,
    state,
    factionId,
    destinationNode,
    plan,
    burnPurpose,
    candidate.score
  );
  const provenOverride = canAiAcceptProvenTacticalLine(lineProjection);

  const shipyardLockReason = getAiShipyardCompletionLockReason(
    content,
    state,
    factionId,
    turn,
    candidate.originNodeId,
    candidate
  );

  if (shipyardLockReason !== null) {
    debugEvents.push(
      createAiShipyardCompletionLockEvent(
        content,
        state,
        turn,
        factionId,
        candidate.originNodeId,
        shipyardLockReason,
        candidate
      )
    );
    return { rejectionReason: shipyardLockReason, debugEvents };
  }

  const lastTritiumDepartureRejection = getAiLastTritiumDepartureRejectionReason(
    state,
    content,
    destinationNode,
    plan,
    factionId,
    burnPurpose
  );

  if (lastTritiumDepartureRejection !== null && !provenOverride) {
    debugEvents.push(
      createAiTacticalLineAuditEvent(
        content,
        turn,
        factionId,
        plan.originNodeId,
        plan.destinationNodeId,
        lineProjection,
        false,
        lastTritiumDepartureRejection
      )
    );
    return { rejectionReason: lastTritiumDepartureRejection, debugEvents };
  }

  const secondTritiumDepartureRejection = getAiSecondTritiumDepartureRejectionReason(
    state,
    content,
    destinationNode,
    plan,
    factionId,
    burnPurpose
  );

  if (secondTritiumDepartureRejection !== null) {
    debugEvents.push(
      createAiTacticalLineAuditEvent(
        content,
        turn,
        factionId,
        plan.originNodeId,
        plan.destinationNodeId,
        lineProjection,
        false,
        secondTritiumDepartureRejection
      ),
      ...createAiBurnGuardrailEventsForRejection(
        content,
        turn,
        factionId,
        plan.originNodeId,
        secondTritiumDepartureRejection,
        { destinationNodeId: destinationNode.id }
      )
    );
    return { rejectionReason: secondTritiumDepartureRejection, debugEvents };
  }

  const openingSolvencyCheck = getAiOpeningSolvencyReserveCheck(
    content,
    state,
    factionId,
    turn,
    candidate,
    plan,
    destinationNode
  );
  debugEvents.push(
    createAiSolvencyReserveEvent(
      content,
      turn,
      factionId,
      plan.originNodeId,
      plan.destinationNodeId,
      openingSolvencyCheck
    )
  );

  if (openingSolvencyCheck.reason !== null && !provenOverride) {
    debugEvents.push(
      createAiRejectedOpeningBurnEvent(
        content,
        turn,
        factionId,
        plan.originNodeId,
        plan.destinationNodeId,
        openingSolvencyCheck
      )
    );
    debugEvents.push(
      createAiTacticalLineAuditEvent(
        content,
        turn,
        factionId,
        plan.originNodeId,
        plan.destinationNodeId,
        lineProjection,
        false,
        openingSolvencyCheck.reason
      )
    );
    return { rejectionReason: openingSolvencyCheck.reason, debugEvents };
  }

  const insolvencyRejection = getAiBurnInsolvencyRejectionReason(
    content,
    state,
    factionId,
    destinationNode,
    plan,
    burnPurpose
  );

  if (insolvencyRejection !== null && !provenOverride) {
    debugEvents.push(
      ...createAiBurnGuardrailEventsForRejection(
        content,
        turn,
        factionId,
        plan.originNodeId,
        insolvencyRejection,
        { destinationNodeId: destinationNode.id }
      )
    );
    debugEvents.push(
      createAiTacticalLineAuditEvent(
        content,
        turn,
        factionId,
        plan.originNodeId,
        plan.destinationNodeId,
        lineProjection,
        false,
        insolvencyRejection
      )
    );
    return { rejectionReason: insolvencyRejection, debugEvents };
  }

  const remainingDv = getProjectedFactionDv(state, factionId, plan.originNodeId) - plan.burnCost;

  if (hasEnemyShipAtNode(state, destinationNode.id, factionId)) {
    const contestedCheck = getAiContestedSustainabilityCheck(
      content,
      state,
      factionId,
      destinationNode,
      {
        entryNodeId: destinationNode.id,
        excludedIncomeNodeIds: [plan.originNodeId],
        currentDvReserve: remainingDv
      }
    );
    debugEvents.push(
      createAiTryhardContestedSustainabilityEvent(
        content,
        turn,
        factionId,
        plan.originNodeId,
        contestedCheck,
        { destinationNodeId: destinationNode.id }
      )
    );

    if (!contestedCheck.sustainable && !provenOverride) {
      debugEvents.push(
        createAiRejectedContestEvent(
          content,
          turn,
          factionId,
          plan.originNodeId,
          destinationNode.id,
          contestedCheck
        ),
        createAiRejectedSuicidalContestEvent(
          content,
          turn,
          factionId,
          plan.originNodeId,
          destinationNode.id,
          contestedCheck
        )
      );
      debugEvents.push(
        createAiTacticalLineAuditEvent(
          content,
          turn,
          factionId,
          plan.originNodeId,
          plan.destinationNodeId,
          lineProjection,
          false,
          contestedCheck.reason ?? "contested-entry:unsustainable"
        )
      );
      return {
        rejectionReason: `contested-entry:${contestedCheck.reason ?? "unsustainable"}`,
        debugEvents
      };
    }
  }

  const projectedAfterCommitments =
    remainingDv - getProjectedFactionContestedUpkeepCost(state, factionId);
  const reserveFloor = getAiTryhardReserveFloor(content, state, factionId);

  if (projectedAfterCommitments < reserveFloor) {
    const eventType = provenOverride
      ? "AI_RESERVE_VIOLATION_ALLOWED"
      : "AI_RESERVE_VIOLATION_REJECTED";
    debugEvents.push({
      turn,
      type: eventType,
      message: `${eventType}: ${getNodeDisplayName(content, plan.originNodeId)} -> ${getNodeDisplayName(content, plan.destinationNodeId)} leaves ${projectedAfterCommitments} ΔV against floor ${reserveFloor}; ${candidate.reason}`,
      nodeId: plan.originNodeId,
      factionId,
      action: "BURN",
      destinationNodeId: plan.destinationNodeId,
      burnCost: plan.burnCost,
      projectedDv: projectedAfterCommitments,
      reason: candidate.reason,
      score: candidate.score
    });

    if (!provenOverride) {
      debugEvents.push(
        createAiTacticalLineAuditEvent(
          content,
          turn,
          factionId,
          plan.originNodeId,
          plan.destinationNodeId,
          lineProjection,
          false,
          "tryhard-solvency:reserve-floor"
        )
      );
      return { rejectionReason: "tryhard-solvency:reserve-floor", debugEvents };
    }
  }

  debugEvents.push(
    createAiTacticalLineAuditEvent(
      content,
      turn,
      factionId,
      plan.originNodeId,
      plan.destinationNodeId,
      lineProjection,
      true,
      lineProjection.reason
    )
  );
  return { rejectionReason: null, debugEvents };
}

function getAiOpeningSolvencyReserveCheck(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  _candidate: AiTryhardActionCandidate | null,
  plan: BurnPlan,
  destinationNode: SimulationContent["nodes"][number]
): AiSolvencyReserveCheck {
  const currentDv = getProjectedFactionDv(state, factionId, plan.originNodeId);
  const projectedDvAfterAction = currentDv - plan.burnCost;
  const projectedIncome = getExpectedNextTritiumIncome(content, state, factionId, [
    plan.originNodeId
  ]);
  const expectedContestedShips = getProjectedFactionLikelyContestedShipCountAfterAction(
    state,
    factionId,
    turn,
    hasEnemyShipAtNode(state, destinationNode.id, factionId) ? destinationNode.id : null
  );
  const upkeepReserve = expectedContestedShips * contestedUpkeepDvCost;
  const hasLikelyFireThreat = hasLikelyEnemyFireThreat(content, state, factionId, turn);
  const evadeReserve = AI_OPENING_EVADE_SAFETY_RESERVE;
  const mandatoryLaunchReserve = getAiMandatoryLaunchReserveForNearlyCompleteShipyards(
    content,
    state,
    factionId,
    plan.originNodeId
  );
  const minimumReserve = evadeReserve + upkeepReserve + mandatoryLaunchReserve;
  const hasFallbackTritium =
    getExpectedNextTritiumIncome(content, state, factionId, [plan.originNodeId]) > 0 ||
    hasReliableTritiumAfterLeavingNodes(content, state, factionId, [plan.originNodeId]) ||
    hasAffordableFallbackTritiumBurn(
      content,
      state,
      factionId,
      destinationNode.id,
      Math.max(0, projectedDvAfterAction)
    );
  const decisiveException = false;
  const reason =
    turn <= AI_OPENING_SOLVENCY_HARD_GATE_END_TURN &&
    !decisiveException &&
    (projectedDvAfterAction === 0 ||
      (hasLikelyFireThreat && projectedDvAfterAction < AI_OPENING_EVADE_SAFETY_RESERVE) ||
      (expectedContestedShips > 0 && projectedDvAfterAction < contestedUpkeepDvCost) ||
      projectedDvAfterAction < minimumReserve)
      ? "opening-solvency-hard-gate"
      : null;

  return {
    reason,
    currentDv,
    projectedDvAfterAction,
    projectedIncome,
    upkeepReserve,
    evadeReserve,
    mandatoryLaunchReserve,
    minimumReserve,
    expectedContestedShips,
    hasLikelyFireThreat,
    hasFallbackTritium,
    decisiveException
  };
}

function getAiShipyardCompletionLockReason(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number,
  originNodeId: string,
  candidate: AiTryhardActionCandidate
): string | null {
  const originNode = getNodeById(content, originNodeId);

  if (
    originNode?.type !== "shipyard" ||
    !hasFactionShipAtNode(state, originNodeId, factionId) ||
    hasPendingAction(state, originNodeId, factionId)
  ) {
    return null;
  }

  const progress = getShipyardProgress(state.shipyardProgress, originNodeId);

  if (progress < shipyardCompletionProgress - 2) {
    return null;
  }

  if (isShipyardThreatenedBeforeCompletion(state, originNodeId, factionId, turn)) {
    return null;
  }

  if (progress >= shipyardCompletionProgress - 1) {
    return isAiShipyardLockException(content, state, factionId, candidate)
      ? null
      : "shipyard-completion-lock";
  }

  return candidate.decisive && isAiShipyardLockException(content, state, factionId, candidate)
    ? null
    : "shipyard-progress:prefer-completion";
}

function isShipyardThreatenedBeforeCompletion(
  state: GameState,
  nodeId: string,
  factionId: FactionId,
  turn: number
): boolean {
  return (
    getIncomingEnemyBurnsToNode(state, nodeId, factionId, turn + 1).length > 0 ||
    [...state.pendingFireOrders, ...state.activeMissiles].some((missile) => {
      return (
        missile.targetFactionId === factionId &&
        missile.targetNodeId === nodeId &&
        missile.impactTurn <= turn + 1
      );
    })
  );
}

function isAiShipyardLockException(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  candidate: AiTryhardActionCandidate
): boolean {
  const targetNode = getNodeById(content, candidate.targetNodeId);

  if (targetNode === undefined) {
    return false;
  }

  if (candidate.kind === "shipyard-theft") {
    return (
      getShipyardProgress(state.shipyardProgress, targetNode.id) >= shipyardCompletionProgress - 1
    );
  }

  if (
    targetNode.type === "tritium" &&
    candidate.targetFactionId !== undefined &&
    hasEnemyShipAtNode(state, targetNode.id, factionId)
  ) {
    return (
      getFactionAccessibleTritiumNodeIds(content, state, candidate.targetFactionId).length <= 1
    );
  }

  return false;
}

function getProjectedFactionLikelyContestedShipCountAfterAction(
  state: GameState,
  factionId: FactionId,
  turn: number,
  entryNodeId: string | null
): number {
  const projectedContestedShips = getProjectedFactionContestedShipCountAfterEntry(
    state,
    factionId,
    entryNodeId
  );
  const pendingLeaveOrigins = new Set(
    state.pendingBurnOrders
      .filter((order) => order.factionId === factionId)
      .map((order) => order.originNodeId)
  );
  const incomingContestedShips = state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        !pendingLeaveOrigins.has(occupancy.nodeId) &&
        getIncomingEnemyBurnsToNode(state, occupancy.nodeId, factionId, turn + 1).length > 0
      );
    })
    .reduce((total, occupancy) => total + occupancy.shipCount, 0);

  return Math.max(projectedContestedShips, incomingContestedShips);
}

function hasLikelyEnemyFireThreat(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number
): boolean {
  if (
    [...state.pendingFireOrders, ...state.activeMissiles].some((missile) => {
      return missile.targetFactionId === factionId && missile.impactTurn <= turn + 3;
    })
  ) {
    return true;
  }

  const ownTargetNodeIds = state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        !isNodeContested(state.nodeOccupancies, occupancy.nodeId)
      );
    })
    .map((occupancy) => occupancy.nodeId);

  return getEnemyFactionIds(state, factionId).some((enemyFactionId) => {
    return getAiAvailableActionOrigins(state, content, enemyFactionId).some((originNodeId) => {
      return ownTargetNodeIds.some((targetNodeId) => {
        const plan = calculateFirePlan(content, state, originNodeId, targetNodeId);
        return plan !== null && plan.impactTurn <= turn + 3;
      });
    });
  });
}

function getAiMandatoryLaunchReserveForNearlyCompleteShipyards(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  excludedOriginNodeId: string
): number {
  return content.nodes
    .filter((node) => {
      return (
        node.type === "shipyard" &&
        node.id !== excludedOriginNodeId &&
        getShipyardProgress(state.shipyardProgress, node.id) >= shipyardCompletionProgress - 1 &&
        hasFactionShipAtNode(state, node.id, factionId) &&
        !hasPendingAction(state, node.id, factionId)
      );
    })
    .reduce((reserve, node) => {
      const producedState: GameState = {
        ...state,
        turn: state.turn + 1,
        nodeOccupancies: produceShipAtShipyard(state.nodeOccupancies, node.id, factionId)
      };
      const launch = chooseMandatoryLaunchBurn(
        content,
        producedState,
        node.id,
        factionId,
        `ai-reserve:${factionId}:${node.id}:T${state.turn + 1}`
      );

      return (
        reserve +
        (launch?.order.burnCost ?? getProjectedFactionDv(state, factionId, excludedOriginNodeId))
      );
    }, 0);
}

function getAiTryhardReserveFloor(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  const posture = getAiStrategicPosture(content, state, factionId);
  const incomingMissileCount = [...state.pendingFireOrders, ...state.activeMissiles].filter(
    (missile) => missile.targetFactionId === factionId
  ).length;
  const baseFloor =
    posture === "stable" ? AI_MIN_DV_RESERVE : posture === "behind" ? AI_CRITICAL_DV : 1;

  return Math.min(9, baseFloor + incomingMissileCount * automaticEvadeDvCost);
}

function isAiProvenReserveOverrideClassification(
  classification: AiTacticalOutcomeClassification
): boolean {
  return (
    classification === "FORCED_KILL" ||
    classification === "FORCED_SHIPYARD_CAPTURE_WITH_SOLVENCY" ||
    classification === "FORCED_TRITIUM_DENIAL_WITH_SOLVENCY" ||
    classification === "FORCED_ENEMY_INSOLVENCY"
  );
}

function canAiAcceptProvenTacticalLine(projection: AiTacticalLineProjection): boolean {
  return projection.accepted && isAiProvenReserveOverrideClassification(projection.classification);
}

function isAiForcedLastTritiumFireClassification(
  classification: AiTacticalOutcomeClassification
): boolean {
  return (
    classification === "FORCED_KILL" ||
    classification === "FORCED_BURN_AWAY" ||
    classification === "FORCED_ENEMY_INSOLVENCY"
  );
}

function isAiLastActiveTritiumWorker(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string
): boolean {
  const originNode = getNodeById(content, originNodeId);

  if (
    originNode?.type !== "tritium" ||
    !hasFactionShipAtNode(state, originNodeId, factionId) ||
    isNodeContested(state.nodeOccupancies, originNodeId) ||
    hasPendingAction(state, originNodeId, factionId)
  ) {
    return false;
  }

  const activeTritiumNodeIds = getFactionAccessibleTritiumNodeIds(content, state, factionId);

  return activeTritiumNodeIds.length === 1 && activeTritiumNodeIds[0] === originNodeId;
}

function isAiPreventingImmediateCollapse(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): boolean {
  const currentDv = getProjectedFactionDv(state, factionId);
  const immediateCosts =
    getProjectedFactionContestedUpkeepCost(state, factionId) +
    [...state.pendingFireOrders, ...state.activeMissiles].filter((missile) => {
      return missile.targetFactionId === factionId && missile.impactTurn <= state.turn + 1;
    }).length *
      automaticEvadeDvCost;

  return (
    currentDv <= immediateCosts ||
    (getFactionAccessibleTritiumNodeIds(content, state, factionId).length <= 1 &&
      hasLikelyEnemyFireThreat(content, state, factionId, state.turn))
  );
}

function getAiFireOpportunityCost(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string
): number {
  const originNode = getNodeById(content, originNodeId);

  return originNode === undefined
    ? 0
    : getAiPotentialWorkOpportunityValue(state, originNode, factionId);
}

function classifyAiFireOutcome(
  content: SimulationContent,
  state: GameState,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId,
  options: AiFireRejectionOptions = {}
): AiTacticalOutcomeClassification {
  const impactTurn = options.impactTurn ?? state.turn + 2;
  const projectedTargetDv = getProjectedFactionDvBeforeTurn(
    content,
    state,
    targetFactionId,
    impactTurn
  );
  const targetHasShip = hasFactionShipAtNode(state, node.id, targetFactionId);
  const targetWillArriveBeforeImpact = [
    ...state.pendingBurnOrders,
    ...state.activeBurnTransits
  ].some((order) => {
    return (
      order.factionId === targetFactionId &&
      order.destinationNodeId === node.id &&
      order.arrivalTurn <= impactTurn
    );
  });
  const targetHasReference = targetHasShip || targetWillArriveBeforeImpact;
  const isProductiveTarget = isProductiveNode(node);
  const forcedContestedKill = isNodeLikelyContestedBeforeTurn(
    state,
    node.id,
    targetFactionId,
    impactTurn
  );
  const expectedDeniedWork = getAiExpectedDeniedWorkValue(state, node, targetFactionId);
  const expectedEvadeTax = getAiExpectedFireEvadeTax(
    state,
    node.id,
    targetFactionId,
    factionId,
    impactTurn
  );

  if (forcedContestedKill) {
    return "FORCED_KILL";
  }

  if (targetHasReference && projectedTargetDv < expectedEvadeTax) {
    return hasAffordableTargetBurnAwayBeforeImpact(
      content,
      state,
      targetFactionId,
      node.id,
      projectedTargetDv,
      impactTurn
    )
      ? "FORCED_BURN_AWAY"
      : "FORCED_KILL";
  }

  if (
    isProductiveTarget &&
    targetHasReference &&
    wouldFireForceEnemyInsolvency(
      content,
      state,
      node,
      targetFactionId,
      expectedDeniedWork,
      expectedEvadeTax
    )
  ) {
    return "FORCED_ENEMY_INSOLVENCY";
  }

  if (isProductiveTarget && targetHasReference) {
    const projectedAfterEvade = projectedTargetDv - expectedEvadeTax;
    const hasForcedFollowUp =
      hasAiMissileForkPressure(state, factionId, targetFactionId, node.id, impactTurn) ||
      hasAiFollowUpPressureBeforeImpact(
        content,
        state,
        factionId,
        node.id,
        impactTurn,
        options.originNodeId
      );

    if (projectedAfterEvade < AI_MIN_DV_RESERVE || hasForcedFollowUp) {
      return "FORCED_EVADE_COST";
    }

    return "PRESSURE_ONLY";
  }

  if (
    hasAiMissileForkPressure(state, factionId, targetFactionId, node.id, impactTurn) ||
    hasAiFollowUpPressureBeforeImpact(
      content,
      state,
      factionId,
      node.id,
      impactTurn,
      options.originNodeId
    )
  ) {
    return "PRESSURE_ONLY";
  }

  return "HARMLESS";
}

function hasAffordableTargetBurnAwayBeforeImpact(
  content: SimulationContent,
  state: GameState,
  targetFactionId: FactionId,
  originNodeId: string,
  projectedTargetDv: number,
  impactTurn: number
): boolean {
  if (projectedTargetDv <= 0) {
    return false;
  }

  return content.nodes.some((destination) => {
    if (
      destination.id === originNodeId ||
      !destination.contestable ||
      destination.protectedNoWar ||
      hasEnemyShipAtNode(state, destination.id, targetFactionId) ||
      isNodeContested(state.nodeOccupancies, destination.id)
    ) {
      return false;
    }

    const plan = calculateBurnPlan(content, state, originNodeId, destination.id);

    return plan !== null && plan.arrivalTurn < impactTurn && plan.burnCost <= projectedTargetDv;
  });
}

function wouldFireForceEnemyInsolvency(
  content: SimulationContent,
  state: GameState,
  node: SimulationContent["nodes"][number],
  targetFactionId: FactionId,
  expectedDeniedWork: number,
  expectedEvadeTax = automaticEvadeDvCost
): boolean {
  if (!isProductiveNode(node)) {
    return false;
  }

  const projection = getAiSolvencyProjection(content, state, targetFactionId);
  const deniedIncome =
    node.type === "tritium" &&
    getFactionAccessibleTritiumNodeIds(content, state, targetFactionId).length <= 1
      ? tritiumWorkOutput * AI_TRYHARD_SOLVENCY_HORIZON_TURNS
      : expectedDeniedWork;
  const projectedAfterFire = projection.projectedDvAtHorizon - expectedEvadeTax - deniedIncome;

  return (
    projectedAfterFire < 0 && projection.reachableTritiumNodes <= projection.activeTritiumNodes + 1
  );
}

function classifyAiBurnOutcome(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  purpose: AiBurnPurpose,
  lineProjection: Pick<
    AiTacticalLineProjection,
    "contestedSustainable" | "hasTritiumAccessAfterLine" | "minProjectedDv"
  >
): AiTacticalOutcomeClassification {
  const targetFactionId = getPrimaryEnemyFactionAtNode(state, destinationNode.id, factionId);
  const lineSolvent =
    lineProjection.minProjectedDv >= 0 &&
    lineProjection.contestedSustainable &&
    lineProjection.hasTritiumAccessAfterLine;

  if (
    lineSolvent &&
    destinationNode.type === "shipyard" &&
    (purpose === "shipyard-recovery" ||
      getShipyardProgress(state.shipyardProgress, destinationNode.id) >=
        shipyardCompletionProgress - 1 ||
      getFactionControlledShipyardNodeIds(content, state, factionId).length === 0)
  ) {
    return "FORCED_SHIPYARD_CAPTURE_WITH_SOLVENCY";
  }

  if (targetFactionId === null) {
    return destinationNode.type === "tritium" && lineSolvent ? "PRESSURE_ONLY" : "HARMLESS";
  }

  if (
    lineSolvent &&
    destinationNode.type === "tritium" &&
    getFactionAccessibleTritiumNodeIds(content, state, targetFactionId).length <= 1
  ) {
    return "FORCED_TRITIUM_DENIAL_WITH_SOLVENCY";
  }

  if (
    lineSolvent &&
    wouldBurnForceEnemyInsolvency(content, state, destinationNode, targetFactionId, plan)
  ) {
    return "FORCED_ENEMY_INSOLVENCY";
  }

  if (
    hasEnemyShipAtNode(state, destinationNode.id, factionId) &&
    isProductiveNode(destinationNode)
  ) {
    return "FORCED_WORK_LOSS";
  }

  return hasEnemyShipAtNode(state, destinationNode.id, factionId) ? "PRESSURE_ONLY" : "HARMLESS";
}

function wouldBurnForceEnemyInsolvency(
  content: SimulationContent,
  state: GameState,
  destinationNode: SimulationContent["nodes"][number],
  targetFactionId: FactionId,
  plan: BurnPlan
): boolean {
  const projection = getAiSolvencyProjection(content, state, targetFactionId);
  const deniedIncome =
    destinationNode.type === "tritium"
      ? tritiumWorkOutput * Math.max(1, AI_TRYHARD_SOLVENCY_HORIZON_TURNS - plan.etaTurns)
      : getAiExpectedDeniedWorkValue(state, destinationNode, targetFactionId);

  return projection.projectedDvAtHorizon - deniedIncome < 0;
}

function getAiActionSolvencyForecast(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  options: Readonly<{
    action: AiActionSolvencyForecast["action"];
    originNodeId: string;
    actionCost: number;
    destinationNode?: SimulationContent["nodes"][number];
    etaTurns?: number;
    entryNodeId?: string | null;
    losesOriginIncome?: boolean;
    lostWorkCost?: number;
  }>
): AiActionSolvencyForecast {
  const horizonTurns = AI_ACTION_SOLVENCY_HORIZON_TURNS;
  const etaTurns = options.etaTurns ?? 0;
  const currentDv = getProjectedFactionDv(state, factionId, options.originNodeId);
  const sustainableTritiumCount = getAiSustainableTritiumNodeIds(content, state, factionId).length;
  const destinationCreatesTritiumPath =
    options.destinationNode?.type === "tritium" &&
    !hasEnemyShipAtNode(state, options.destinationNode.id, factionId) &&
    !isNodeContested(state.nodeOccupancies, options.destinationNode.id) &&
    !hasKnownTritiumFallbackThreat(
      state,
      factionId,
      options.destinationNode.id,
      state.turn + etaTurns
    );
  const projectedDvAfterAction = currentDv - options.actionCost;
  const fallback =
    sustainableTritiumCount >= 2
      ? null
      : getAiCheapestTritiumFallbackReservation(
          content,
          state,
          factionId,
          options.originNodeId,
          projectedDvAfterAction
        );
  const fallbackCost = fallback?.burnCost ?? 0;
  const nextContestedUpkeep =
    getProjectedFactionContestedShipCountAfterEntry(state, factionId, options.entryNodeId ?? null) *
    contestedUpkeepDvCost;
  const predictableEvadeByTurn = new Map<number, number>();

  for (const missile of [...state.pendingFireOrders, ...state.activeMissiles]) {
    if (
      missile.targetFactionId !== factionId ||
      missile.impactTurn <= state.turn ||
      missile.impactTurn > state.turn + horizonTurns
    ) {
      continue;
    }

    predictableEvadeByTurn.set(
      missile.impactTurn,
      (predictableEvadeByTurn.get(missile.impactTurn) ?? 0) + automaticEvadeDvCost
    );
  }

  const predictableEvadeCost = [...predictableEvadeByTurn.values()].reduce(
    (total, cost) => total + cost,
    0
  );
  const mandatoryLaunchReserve = getAiMandatoryLaunchReserveForNearlyCompleteShipyards(
    content,
    state,
    factionId,
    options.originNodeId
  );
  const requiredReserve =
    fallbackCost + nextContestedUpkeep + predictableEvadeCost + mandatoryLaunchReserve;
  const baseIncome = getExpectedNextTritiumIncome(
    content,
    state,
    factionId,
    options.losesOriginIncome === true ? [options.originNodeId] : []
  );
  const destinationIncome = destinationCreatesTritiumPath ? tritiumWorkOutput : 0;
  const lostWorkCost = options.lostWorkCost ?? 0;
  let projectedDv = projectedDvAfterAction;
  const projectedDvByTurn: number[] = [];

  for (let offset = 1; offset <= horizonTurns; offset += 1) {
    projectedDv += baseIncome;

    if (destinationIncome > 0 && offset > etaTurns) {
      projectedDv += destinationIncome;
    }

    if (offset === 1) {
      projectedDv -= lostWorkCost;
    }

    projectedDv -= nextContestedUpkeep;
    projectedDv -= predictableEvadeByTurn.get(state.turn + offset) ?? 0;
    projectedDvByTurn.push(projectedDv);
  }

  const minProjectedDv = Math.min(projectedDvAfterAction, ...projectedDvByTurn);
  const finalProjectedDv = projectedDvByTurn[projectedDvByTurn.length - 1] ?? projectedDv;
  const hasIndependentTritiumAfterAction =
    sustainableTritiumCount >= 2 || destinationCreatesTritiumPath;
  const fallbackUnavailable =
    sustainableTritiumCount === 1 && !hasIndependentTritiumAfterAction && fallback === null;
  const projectedInsolvency =
    minProjectedDv < 0 ||
    (sustainableTritiumCount === 1 &&
      !hasIndependentTritiumAfterAction &&
      minProjectedDv < requiredReserve) ||
    (hasIndependentTritiumAfterAction &&
      minProjectedDv < nextContestedUpkeep + predictableEvadeCost);
  const reason = fallbackUnavailable
    ? "fallback-unavailable"
    : minProjectedDv < 0
      ? "projected-negative-dv"
      : projectedInsolvency
        ? "projected-reserve-shortfall"
        : null;

  return {
    action: options.action,
    horizonTurns,
    currentDv,
    projectedDvAfterAction,
    projectedDvByTurn,
    minProjectedDv,
    finalProjectedDv,
    sustainableTritiumCount,
    fallback,
    fallbackCost,
    nextContestedUpkeep,
    predictableEvadeCost,
    requiredReserve,
    hasIndependentTritiumAfterAction,
    projectedInsolvency,
    fallbackUnavailable,
    reason
  };
}

function getAiSustainableTritiumNodeIds(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly string[] {
  const currentDv = getProjectedFactionDv(state, factionId);

  return getFactionAccessibleTritiumNodeIds(content, state, factionId).filter((nodeId) => {
    return getAiTritiumNodeKnownThreatSurvival(content, state, factionId, nodeId, {
      arrivalTurn: state.turn,
      firstWorkTurnOffset: 1,
      projectedDvAfterCommitment: currentDv,
      excludedIncomeNodeIds: []
    }).survivesKnownThreats;
  });
}

function getAiCheapestTritiumFallbackReservation(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string,
  availableDv: number
): AiFallbackReservation | null {
  const candidates = content.nodes
    .filter((node) => {
      return (
        node.id !== originNodeId &&
        node.type === "tritium" &&
        !hasFactionShipAtNode(state, node.id, factionId) &&
        !hasEnemyShipAtNode(state, node.id, factionId) &&
        !isNodeContested(state.nodeOccupancies, node.id)
      );
    })
    .flatMap((destination) => {
      const plan = calculateBurnPlan(content, state, originNodeId, destination.id);

      if (
        plan === null ||
        plan.burnCost > availableDv ||
        hasKnownTritiumFallbackThreat(state, factionId, destination.id, plan.arrivalTurn)
      ) {
        return [];
      }

      return [
        {
          originNodeId,
          destinationNodeId: destination.id,
          burnCost: plan.burnCost,
          etaTurns: plan.etaTurns
        } satisfies AiFallbackReservation
      ];
    })
    .sort((first, second) => {
      if (first.burnCost !== second.burnCost) {
        return first.burnCost - second.burnCost;
      }

      if (first.etaTurns !== second.etaTurns) {
        return first.etaTurns - second.etaTurns;
      }

      return first.destinationNodeId.localeCompare(second.destinationNodeId);
    });

  return candidates[0] ?? null;
}

function hasKnownTritiumFallbackThreat(
  state: GameState,
  factionId: FactionId,
  nodeId: string,
  arrivalTurn: number
): boolean {
  return (
    getIncomingEnemyBurnsToNode(state, nodeId, factionId, arrivalTurn + AI_CONTESTED_SUSTAIN_TURNS)
      .length > 0 ||
    [...state.pendingFireOrders, ...state.activeMissiles].some((missile) => {
      return (
        missile.targetFactionId === factionId &&
        missile.targetNodeId === nodeId &&
        missile.impactTurn >= arrivalTurn &&
        missile.impactTurn <= arrivalTurn + AI_CONTESTED_SUSTAIN_TURNS
      );
    })
  );
}

function getAiActionSolvencyRejectionReason(
  forecast: AiActionSolvencyForecast,
  options: Readonly<{
    allowsTritiumRecovery?: boolean;
    allowsEmergencyExit?: boolean;
    decisive?: boolean;
  }> = {}
): string | null {
  if (options.allowsEmergencyExit === true) {
    return null;
  }

  if (forecast.fallbackUnavailable && options.allowsTritiumRecovery !== true) {
    return "solvency:fallback-unavailable";
  }

  if (forecast.projectedInsolvency && options.decisive !== true) {
    return "solvency:projected-insolvency";
  }

  return null;
}

function createAiActionSolvencyForecastEvents(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  forecast: AiActionSolvencyForecast,
  details: Readonly<{ destinationNodeId?: string; targetNodeId?: string }> = {}
): readonly TurnDebugEvent[] {
  const fallbackDestination =
    forecast.fallback === null
      ? "unavailable"
      : getNodeDisplayName(content, forecast.fallback.destinationNodeId);
  const events: TurnDebugEvent[] = [
    {
      turn,
      type: "AI_RESERVED_FALLBACK_COST",
      message: `AI_RESERVED_FALLBACK_COST: ${forecast.action} at ${getNodeDisplayName(content, originNodeId)} reserves ${forecast.requiredReserve} ΔV over ${forecast.horizonTurns} turns (fallback ${forecast.fallbackCost} to ${fallbackDestination}; upkeep ${forecast.nextContestedUpkeep}; predictable Evade ${forecast.predictableEvadeCost})`,
      nodeId: originNodeId,
      factionId,
      action: forecast.action,
      projectedDv: forecast.minProjectedDv,
      amount: forecast.requiredReserve,
      reason: forecast.fallback === null ? "fallback-unavailable" : "fallback-reserved",
      ...(forecast.fallback === null
        ? {}
        : { burnCost: forecast.fallback.burnCost, etaTurns: forecast.fallback.etaTurns }),
      ...details
    }
  ];

  if (forecast.projectedInsolvency) {
    events.push({
      turn,
      type: "AI_PROJECTED_INSOLVENCY",
      message: `AI_PROJECTED_INSOLVENCY: ${forecast.action} at ${getNodeDisplayName(content, originNodeId)} reaches ${forecast.minProjectedDv} ΔV within ${forecast.horizonTurns} turns against reserve ${forecast.requiredReserve}`,
      nodeId: originNodeId,
      factionId,
      action: forecast.action,
      projectedDv: forecast.minProjectedDv,
      amount: forecast.requiredReserve,
      reason: forecast.reason ?? "projected-reserve-shortfall",
      ...details
    });
  }

  if (forecast.fallbackUnavailable) {
    events.push({
      turn,
      type: "AI_FALLBACK_TOO_LATE_OR_UNAVAILABLE",
      message: `AI_FALLBACK_TOO_LATE_OR_UNAVAILABLE: ${forecast.action} at ${getNodeDisplayName(content, originNodeId)} has no sustainable independent tritium route`,
      nodeId: originNodeId,
      factionId,
      action: forecast.action,
      projectedDv: forecast.minProjectedDv,
      reason: "fallback-unavailable",
      ...details
    });
  }

  return events;
}

function getAiBurnTacticalLineProjection(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  purpose: AiBurnPurpose,
  score: number
): AiTacticalLineProjection {
  const lastTritiumWorker = isAiLastActiveTritiumWorker(
    content,
    state,
    factionId,
    plan.originNodeId
  );
  const originNode = getNodeById(content, plan.originNodeId);
  const entryNodeId = hasEnemyShipAtNode(state, destinationNode.id, factionId)
    ? destinationNode.id
    : null;
  const projection = buildAiTacticalLineProjection(content, state, factionId, {
    action: purpose === "escape" ? "LEAVE_CONTESTED" : "BURN",
    originNodeId: plan.originNodeId,
    targetNodeId: destinationNode.id,
    actionCost: plan.burnCost,
    etaTurns: plan.etaTurns,
    excludedIncomeNodeIds: [plan.originNodeId],
    entryNodeId,
    destinationNode,
    lastTritiumWorker,
    lostWorkCost: originNode === undefined ? 0 : getNodeWorkValue(originNode),
    reserveFloor: getAiStrategicReserveFloor(content, state, factionId, destinationNode, purpose),
    score
  });
  const classification = classifyAiBurnOutcome(
    content,
    state,
    factionId,
    destinationNode,
    plan,
    purpose,
    projection
  );

  return {
    ...projection,
    classification,
    accepted: isAiLineProjectionAccepted(projection, classification),
    reason: getAiLineProjectionReason(projection, classification)
  };
}

function getAiFireTacticalLineProjection(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string,
  targetNode: SimulationContent["nodes"][number],
  targetFactionId: FactionId,
  etaTurns: number,
  score: number,
  options: AiFireRejectionOptions = {}
): AiTacticalLineProjection {
  const lastTritiumWorker = isAiLastActiveTritiumWorker(content, state, factionId, originNodeId);
  const opportunityCost = getAiFireOpportunityCost(content, state, factionId, originNodeId);
  const classification = classifyAiFireOutcome(
    content,
    state,
    targetNode,
    factionId,
    targetFactionId,
    {
      ...options,
      originNodeId,
      impactTurn: options.impactTurn ?? state.turn + etaTurns
    }
  );
  const projection = buildAiTacticalLineProjection(content, state, factionId, {
    action: "FIRE",
    originNodeId,
    targetNodeId: targetNode.id,
    actionCost: 0,
    etaTurns,
    excludedIncomeNodeIds: opportunityCost > 0 ? [originNodeId] : [],
    entryNodeId: null,
    destinationNode: targetNode,
    lastTritiumWorker,
    lostWorkCost: opportunityCost,
    reserveFloor: getAiTryhardReserveFloor(content, state, factionId),
    score
  });

  return {
    ...projection,
    classification,
    accepted: isAiLineProjectionAccepted(projection, classification),
    reason: getAiLineProjectionReason(projection, classification)
  };
}

function getAiStayContestedLineProjection(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  node: SimulationContent["nodes"][number]
): AiTacticalLineProjection {
  const classification =
    isProductiveNode(node) && hasEnemyShipAtNode(state, node.id, factionId)
      ? "FORCED_WORK_LOSS"
      : "PRESSURE_ONLY";
  const projection = buildAiTacticalLineProjection(content, state, factionId, {
    action: "STAY_CONTESTED",
    originNodeId: node.id,
    targetNodeId: node.id,
    actionCost: 0,
    etaTurns: 0,
    excludedIncomeNodeIds: [],
    entryNodeId: node.id,
    destinationNode: node,
    lastTritiumWorker: isFactionLastRelevantShip(content, state, factionId),
    lostWorkCost: 0,
    reserveFloor: getAiTryhardReserveFloor(content, state, factionId),
    score: isProductiveNode(node) ? 520 : 120
  });

  return {
    ...projection,
    classification,
    accepted: isAiLineProjectionAccepted(projection, classification),
    reason: getAiLineProjectionReason(projection, classification)
  };
}

function buildAiTacticalLineProjection(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  options: Readonly<{
    action: "BURN" | "FIRE" | "LEAVE_CONTESTED" | "STAY_CONTESTED";
    originNodeId: string;
    targetNodeId: string;
    actionCost: number;
    etaTurns: number;
    excludedIncomeNodeIds: readonly string[];
    entryNodeId: string | null;
    destinationNode: SimulationContent["nodes"][number];
    lastTritiumWorker: boolean;
    lostWorkCost: number;
    reserveFloor: number;
    score: number;
  }>
): AiTacticalLineProjection {
  const horizonTurns = AI_TRYHARD_SOLVENCY_HORIZON_TURNS;
  const currentDv = getProjectedFactionDv(state, factionId, options.originNodeId);
  const baseIncome = getExpectedNextTritiumIncome(
    content,
    state,
    factionId,
    options.excludedIncomeNodeIds
  );
  const contestedUpkeepPerTurn =
    getProjectedFactionContestedShipCountAfterEntry(state, factionId, options.entryNodeId) *
    contestedUpkeepDvCost;
  const knownIncomingMissileCount = [...state.pendingFireOrders, ...state.activeMissiles].filter(
    (missile) => {
      return (
        missile.targetFactionId === factionId &&
        missile.impactTurn > state.turn &&
        missile.impactTurn <= state.turn + horizonTurns
      );
    }
  ).length;
  const possibleEnemyFireCost =
    Math.max(
      knownIncomingMissileCount,
      hasLikelyEnemyFireThreat(content, state, factionId, state.turn) ? 1 : 0
    ) * automaticEvadeDvCost;
  const mandatoryLaunchReserve =
    state.mandatoryLaunches.filter((launch) => launch.factionId === factionId).length *
    AI_MIN_DV_RESERVE;
  const projectedDvAfterAction = currentDv - options.actionCost;
  const destinationSurvivesKnownThreats =
    options.destinationNode.type !== "tritium" ||
    getAiTritiumNodeKnownThreatSurvival(content, state, factionId, options.destinationNode.id, {
      arrivalTurn: state.turn + options.etaTurns,
      firstWorkTurnOffset: options.etaTurns + 1,
      projectedDvAfterCommitment: projectedDvAfterAction,
      excludedIncomeNodeIds: options.excludedIncomeNodeIds
    }).survivesKnownThreats;
  const destinationAddsTritiumIncome =
    options.destinationNode.type === "tritium" &&
    !hasEnemyShipAtNode(state, options.destinationNode.id, factionId) &&
    destinationSurvivesKnownThreats;
  let projectedDv = projectedDvAfterAction;
  const projectedDvByTurn: number[] = [];

  for (let index = 1; index <= horizonTurns; index += 1) {
    const destinationIncome =
      destinationAddsTritiumIncome && index > options.etaTurns ? tritiumWorkOutput : 0;
    const oneTimeFireReserve = index === 1 ? possibleEnemyFireCost : 0;
    const oneTimeLaunchReserve = index === 1 ? mandatoryLaunchReserve : 0;
    projectedDv =
      projectedDv + baseIncome + destinationIncome - contestedUpkeepPerTurn - oneTimeFireReserve;
    projectedDvByTurn.push(projectedDv - oneTimeLaunchReserve);
  }

  const minProjectedDv = Math.min(currentDv - options.actionCost, ...projectedDvByTurn);
  const finalProjectedDv = projectedDvByTurn[projectedDvByTurn.length - 1] ?? projectedDv;
  const legalExitAvailable =
    options.entryNodeId === null ||
    hasAffordableContestedExitBurn(
      content,
      state,
      factionId,
      options.entryNodeId,
      Math.max(0, minProjectedDv)
    );
  const hasTritiumAccessAfterLine =
    baseIncome > 0 ||
    destinationAddsTritiumIncome ||
    hasReliableTritiumAfterLeavingNodes(content, state, factionId, options.excludedIncomeNodeIds);
  const contestedSustainable =
    options.entryNodeId === null ||
    (minProjectedDv >= 0 && legalExitAvailable && hasTritiumAccessAfterLine);
  const reserveViolation =
    minProjectedDv < options.reserveFloor ||
    (possibleEnemyFireCost > 0 && minProjectedDv < automaticEvadeDvCost) ||
    (contestedUpkeepPerTurn > 0 && minProjectedDv < contestedUpkeepPerTurn) ||
    (options.lastTritiumWorker && !hasTritiumAccessAfterLine);

  return {
    action: options.action,
    classification: "HARMLESS",
    projectedDvByTurn,
    minProjectedDv,
    finalProjectedDv,
    horizonTurns,
    lastTritiumWorker: options.lastTritiumWorker,
    reserveViolation,
    contestedSustainable,
    hasTritiumAccessAfterLine,
    legalExitAvailable,
    lostWorkCost: options.lostWorkCost,
    contestedUpkeepPerTurn,
    possibleEnemyFireCost,
    mandatoryLaunchReserve,
    score: options.score,
    accepted: false,
    reason: "unclassified"
  };
}

function isAiLineProjectionAccepted(
  projection: AiTacticalLineProjection,
  classification: AiTacticalOutcomeClassification
): boolean {
  if (projection.minProjectedDv < 0 || !projection.contestedSustainable) {
    return false;
  }

  if (
    !projection.hasTritiumAccessAfterLine &&
    !isAiProvenReserveOverrideClassification(classification)
  ) {
    return false;
  }

  return true;
}

function getAiLineProjectionReason(
  projection: AiTacticalLineProjection,
  classification: AiTacticalOutcomeClassification
): string {
  if (projection.minProjectedDv < 0) {
    return "line-insolvent";
  }

  if (!projection.contestedSustainable) {
    return projection.legalExitAvailable ? "contested-unsustainable" : "contested-no-legal-exit";
  }

  if (
    !projection.hasTritiumAccessAfterLine &&
    !isAiProvenReserveOverrideClassification(classification)
  ) {
    return "line-loses-tritium-access";
  }

  if (projection.reserveViolation && !isAiProvenReserveOverrideClassification(classification)) {
    return "reserve-violation-not-forced";
  }

  return `accepted:${classification}`;
}

function getAiSolvencyProjection(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): AiSolvencyProjection {
  const horizonTurns = AI_TRYHARD_SOLVENCY_HORIZON_TURNS;
  const recoveryPath = evaluateFactionRecoveryPath(content, state, factionId, horizonTurns);
  const currentDv = recoveryPath.currentDv;
  const projectedUpkeep = recoveryPath.projectedUpkeepByTurn[0] ?? 0;
  const incomingMissiles = recoveryPath.knownThreats.filter(
    (threat) => threat.kind === "missile"
  ).length;
  const mandatoryLaunches = state.mandatoryLaunches.filter(
    (launch) => launch.factionId === factionId
  ).length;
  const tritiumCountAudits = [
    ...recoveryPath.countedTritium,
    ...recoveryPath.unresolvedTritium,
    ...recoveryPath.rejectedTritium
  ].map((audit): AiSolvencyTritiumCountAudit => {
    return {
      nodeId: audit.nodeId,
      viaNodeId: audit.viaNodeId,
      fromTurnOffset: audit.fromTurnOffset,
      survivesKnownThreats: audit.survivesKnownThreats,
      unresolved: audit.unresolved,
      contestedRecovery: audit.contestedRecovery,
      recoveryStatus: audit.recoveryStatus,
      reason: audit.reason,
      ...(audit.projectedDvAtArrival === undefined
        ? {}
        : { projectedDvAtArrival: audit.projectedDvAtArrival }),
      ...(audit.projectedDvAfterOneUpkeep === undefined
        ? {}
        : { projectedDvAfterOneUpkeep: audit.projectedDvAfterOneUpkeep }),
      ...(audit.legalExits === undefined ? {} : { legalExits: audit.legalExits }),
      ...(audit.hostileMissiles === undefined ? {} : { hostileMissiles: audit.hostileMissiles })
    };
  });
  const countedTritiumAudits = tritiumCountAudits.filter((audit) => audit.survivesKnownThreats);
  const countedTritiumNodeIds = new Set(countedTritiumAudits.map((audit) => audit.nodeId));
  const activeTritiumNodeIds = new Set(
    getFactionAccessibleTritiumNodeIds(content, state, factionId)
  );
  const activeTritiumNodes = countedTritiumAudits.filter((audit) => {
    return (
      activeTritiumNodeIds.has(audit.nodeId) &&
      audit.viaNodeId === audit.nodeId &&
      audit.fromTurnOffset <= 1
    );
  }).length;
  const guaranteedTritiumIncome = activeTritiumNodes * tritiumWorkOutput;
  const reachableTritiumNodes = countedTritiumNodeIds.size;
  const projectedDvAtHorizon = recoveryPath.projectedDvAtHorizon;

  return {
    factionId,
    currentDv,
    guaranteedTritiumIncome,
    activeTritiumNodes,
    projectedUpkeep,
    incomingMissiles,
    mandatoryLaunches,
    reachableTritiumNodes,
    projectedDvAtHorizon,
    solvent: recoveryPath.canRecoverIndefiniteTritium,
    tritiumCountAudits
  };
}

export function evaluateFactionRecoveryPath(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  horizonTurns = AI_TRYHARD_SOLVENCY_HORIZON_TURNS
): FactionRecoveryPath {
  recordSimulationPerformanceCounter("evaluateFactionRecoveryPath");

  const currentDv = getProjectedFactionDv(state, factionId);
  const rawTritiumAudits = getAiSolvencyTritiumCountAudits(content, state, factionId);
  const tritiumAudits = rawTritiumAudits.map((audit): FactionRecoveryTritiumAudit => {
    return {
      ...audit,
      firstPossibleWorkTurn: state.turn + audit.fromTurnOffset
    };
  });
  const countedTritium = tritiumAudits.filter((audit) => audit.recoveryStatus === "stable");
  const unresolvedTritium = tritiumAudits.filter((audit) => audit.unresolved);
  const rejectedTritium = tritiumAudits.filter((audit) => audit.recoveryStatus === "forced-dead");
  const projectedDvByTurn: number[] = [];
  const projectedIncomeByTurn: number[] = [];
  const projectedUpkeepByTurn: number[] = [];
  const committedCostsByTurn: number[] = [];
  const knownThreats: FactionRecoveryKnownThreat[] = [];
  const projectedUpkeep = getProjectedFactionContestedUpkeepCost(state, factionId);
  const mandatoryLaunchCost =
    state.mandatoryLaunches.filter((launch) => launch.factionId === factionId).length *
    AI_MIN_DV_RESERVE;
  const knownMissilesByTurn = new Map<number, readonly (PendingFireOrder | ActiveMissile)[]>();

  for (const missile of [...state.pendingFireOrders, ...state.activeMissiles]) {
    if (
      missile.targetFactionId !== factionId ||
      missile.impactTurn <= state.turn ||
      missile.impactTurn > state.turn + horizonTurns
    ) {
      continue;
    }

    knownMissilesByTurn.set(missile.impactTurn, [
      ...(knownMissilesByTurn.get(missile.impactTurn) ?? []),
      missile
    ]);
  }

  let projectedDv = currentDv;

  if (mandatoryLaunchCost > 0) {
    knownThreats.push({
      kind: "mandatory-launch",
      id: `mandatory:${factionId}:${state.turn}`,
      eventTurn: state.turn + 1,
      currentDv,
      projectedDvAtEvent: projectedDv,
      cost: mandatoryLaunchCost,
      status: projectedDv >= mandatoryLaunchCost ? "safe" : "unsafe",
      reason:
        projectedDv >= mandatoryLaunchCost
          ? "mandatory-launch-reserve-available"
          : "mandatory-launch-reserve-insufficient"
    });
    projectedDv -= mandatoryLaunchCost;
  }

  for (let offset = 1; offset <= horizonTurns; offset += 1) {
    const eventTurn = state.turn + offset;
    let committedCosts = 0;

    if (projectedUpkeep > 0) {
      knownThreats.push({
        kind: "upkeep",
        id: `upkeep:${factionId}:T${eventTurn}`,
        eventTurn,
        currentDv,
        projectedDvAtEvent: projectedDv,
        cost: projectedUpkeep,
        status: projectedDv >= projectedUpkeep ? "safe" : "unsafe",
        reason:
          projectedDv >= projectedUpkeep
            ? "contested-upkeep-affordable"
            : "contested-upkeep-insufficient"
      });
      projectedDv -= projectedUpkeep;
      committedCosts += projectedUpkeep;
    }

    for (const missile of knownMissilesByTurn.get(eventTurn) ?? []) {
      const burnAwayLegal = hasKnownThreatBurnAway(content, state, missile, factionId);
      const contestedAtImpact =
        isNodeContested(state.nodeOccupancies, missile.targetNodeId) ||
        isNodeLikelyContestedBeforeTurn(state, missile.targetNodeId, factionId, eventTurn);
      const projectedDvAtEvent = projectedDv;
      const evadeAffordable = projectedDvAtEvent >= automaticEvadeDvCost;
      const status = burnAwayLegal || (!contestedAtImpact && evadeAffordable) ? "safe" : "unsafe";
      const reason = burnAwayLegal
        ? "legal-burn-away-breaks-solution"
        : contestedAtImpact
          ? "evade-blocked-by-contested"
          : evadeAffordable
            ? "evade-affordable-at-impact"
            : "evade-dv-insufficient-at-impact";

      knownThreats.push({
        kind: "missile",
        id: missile.id,
        eventTurn,
        nodeId: missile.targetNodeId,
        currentDv,
        projectedDvAtEvent,
        cost: automaticEvadeDvCost,
        status,
        reason
      });

      if (!burnAwayLegal && !contestedAtImpact && evadeAffordable) {
        projectedDv -= automaticEvadeDvCost;
        committedCosts += automaticEvadeDvCost;
      }
    }

    const income = countedTritium.reduce((total, audit) => {
      return audit.fromTurnOffset <= offset ? total + tritiumWorkOutput : total;
    }, 0);
    projectedDv += income;
    projectedIncomeByTurn.push(income);
    projectedUpkeepByTurn.push(projectedUpkeep);
    committedCostsByTurn.push(committedCosts);
    projectedDvByTurn.push(projectedDv);
  }

  const projectedDvAtHorizon = projectedDvByTurn[projectedDvByTurn.length - 1] ?? projectedDv;
  const minimumProjectedDv = Math.min(currentDv, ...projectedDvByTurn);
  const reachableTritiumNodes = new Set(countedTritium.map((audit) => audit.nodeId)).size;
  const reasonCodes: string[] = [];

  if (countFactionShips(state, factionId) <= 0 && countedTritium.length === 0) {
    reasonCodes.push("no-ships");
  }

  if (reachableTritiumNodes <= 0) {
    reasonCodes.push("no-survivable-tritium");
  }

  if (unresolvedTritium.length > 0) {
    reasonCodes.push("unresolved-contested-recovery");
  }

  if (minimumProjectedDv < 0) {
    reasonCodes.push("projected-dv-negative");
  }

  for (const threat of knownThreats) {
    if (threat.status === "unsafe") {
      reasonCodes.push(`${threat.kind}:${threat.reason}`);
    }
  }

  const canRecoverIndefiniteTritium =
    reachableTritiumNodes > 0 && minimumProjectedDv >= 0 && projectedDvAtHorizon >= 0;
  const pendingRecoveryTransitBlocksVictory = unresolvedTritium.some((audit) => {
    return [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
      return (
        order.factionId === factionId &&
        order.destinationNodeId === audit.nodeId &&
        order.arrivalTurn <= state.turn + horizonTurns
      );
    });
  });

  if (canRecoverIndefiniteTritium) {
    reasonCodes.push("recoverable-indefinite-tritium");
  }

  const collapseStatus = classifyFactionRecoveryCollapse({
    content,
    state,
    factionId,
    canRecoverIndefiniteTritium,
    unresolvedTritium,
    pendingRecoveryTransitBlocksVictory,
    minimumProjectedDv,
    projectedDvAtHorizon
  });

  return {
    factionId,
    currentDv,
    projectedDvByTurn,
    projectedIncomeByTurn,
    projectedUpkeepByTurn,
    committedCostsByTurn,
    projectedDvAtHorizon,
    knownThreats,
    countedTritium,
    unresolvedTritium,
    rejectedTritium,
    reachableTritiumNodes,
    pendingRecoveryTransitBlocksVictory,
    collapseStatus: collapseStatus.status,
    collapseReason: collapseStatus.reason,
    canRecoverIndefiniteTritium,
    reasonCodes
  };
}

function classifyFactionRecoveryCollapse(
  context: Readonly<{
    content: SimulationContent;
    state: GameState;
    factionId: FactionId;
    canRecoverIndefiniteTritium: boolean;
    unresolvedTritium: readonly FactionRecoveryTritiumAudit[];
    pendingRecoveryTransitBlocksVictory: boolean;
    minimumProjectedDv: number;
    projectedDvAtHorizon: number;
  }>
): Readonly<{ status: FactionCollapseStatus; reason: string }> {
  if (context.canRecoverIndefiniteTritium) {
    return { status: "unresolved", reason: "survivable-tritium-path" };
  }

  if (context.pendingRecoveryTransitBlocksVictory) {
    return { status: "unresolved", reason: "pending-recovery-transit" };
  }

  if (context.unresolvedTritium.length > 0) {
    return { status: "unresolved", reason: "unresolved-contested-recovery" };
  }

  const shipCount = countFactionShips(context.state, context.factionId);
  const hasAnyActiveTransit = context.state.activeBurnTransits.some((transit) => {
    return transit.factionId === context.factionId;
  });
  const hasMandatoryLaunch = context.state.mandatoryLaunches.some((launch) => {
    return launch.factionId === context.factionId;
  });
  const hasPendingMissile = context.state.activeMissiles.some((missile) => {
    return missile.factionId === context.factionId;
  });
  const hasNearCompleteShipyard = hasFactionNearCompleteShipyardRecovery(
    context.content,
    context.state,
    context.factionId
  );
  const hasContestedPosition = hasFactionContestedPosition(context.state, context.factionId);
  const hasNonContestedReadyShip = hasFactionNonContestedReadyShip(
    context.state,
    context.factionId
  );
  const hasBranchableRecovery =
    hasMandatoryLaunch ||
    hasNearCompleteShipyard ||
    (hasContestedPosition && hasNonContestedReadyShip);
  const dV = getFactionDv(context.state, context.factionId);

  if (
    shipCount <= 0 &&
    !hasAnyActiveTransit &&
    !hasMandatoryLaunch &&
    !hasPendingMissile &&
    !hasNearCompleteShipyard
  ) {
    return { status: "forced", reason: "no-ships-or-recovery-actions" };
  }

  if (context.minimumProjectedDv < 0 || context.projectedDvAtHorizon < 0) {
    if (hasBranchableRecovery) {
      return { status: "projected", reason: "branchable-recovery-before-forced-collapse" };
    }

    return { status: "forced", reason: "projected-dv-forced-negative" };
  }

  if (
    dV >= continuousBurnTuning.minBurnCost ||
    hasMandatoryLaunch ||
    hasNearCompleteShipyard ||
    (hasContestedPosition && hasNonContestedReadyShip)
  ) {
    return { status: "projected", reason: "legal-survival-decision-may-remain" };
  }

  return { status: "forced", reason: "no-survivable-tritium-or-legal-recovery" };
}

function hasFactionNearCompleteShipyardRecovery(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): boolean {
  return state.shipyardProgress.some((progress) => {
    const node = getNodeById(content, progress.nodeId);

    return (
      node?.type === "shipyard" &&
      progress.progress >= shipyardCompletionProgress - 1 &&
      hasFactionShipAtNode(state, progress.nodeId, factionId) &&
      !isNodeContested(state.nodeOccupancies, progress.nodeId) &&
      couldAffordMandatoryLaunchIfProduced(content, state, progress.nodeId, factionId)
    );
  });
}

function hasFactionContestedPosition(state: GameState, factionId: FactionId): boolean {
  return state.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.factionId === factionId &&
      occupancy.shipCount > 0 &&
      isNodeContested(state.nodeOccupancies, occupancy.nodeId)
    );
  });
}

function hasFactionNonContestedReadyShip(state: GameState, factionId: FactionId): boolean {
  return state.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.factionId === factionId &&
      occupancy.shipCount > 0 &&
      !isNodeContested(state.nodeOccupancies, occupancy.nodeId) &&
      !hasPendingAction(state, occupancy.nodeId, factionId)
    );
  });
}

function hasKnownThreatBurnAway(
  content: SimulationContent,
  state: GameState,
  missile: PendingFireOrder | ActiveMissile,
  factionId: FactionId
): boolean {
  const existingEscape = [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
    return (
      order.factionId === factionId &&
      order.originNodeId === missile.targetNodeId &&
      order.destinationNodeId !== missile.targetNodeId &&
      order.arrivalTurn <= missile.impactTurn
    );
  });

  if (existingEscape) {
    return true;
  }

  if (
    !hasFactionShipAtNode(state, missile.targetNodeId, factionId) ||
    isNodeContested(state.nodeOccupancies, missile.targetNodeId)
  ) {
    return false;
  }

  return content.nodes.some((destination) => {
    if (destination.id === missile.targetNodeId) {
      return false;
    }

    const plan = getLegalBurnPlan(content, state, missile.targetNodeId, destination.id, factionId);
    return plan !== null && plan.arrivalTurn <= missile.impactTurn;
  });
}

function getAiSolvencyTritiumCountAudits(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly AiSolvencyTritiumCountAudit[] {
  recordSimulationPerformanceCounter("getAiSolvencyTritiumCountAudits");

  const auditsByNodeId = new Map<string, AiSolvencyTritiumCountAudit>();
  const currentDv = getProjectedFactionDv(state, factionId);
  const addAudit = (audit: AiSolvencyTritiumCountAudit): void => {
    const existing = auditsByNodeId.get(audit.nodeId);

    if (
      existing === undefined ||
      (audit.survivesKnownThreats && !existing.survivesKnownThreats) ||
      (audit.unresolved && !existing.survivesKnownThreats && !existing.unresolved) ||
      (audit.survivesKnownThreats === existing.survivesKnownThreats &&
        audit.unresolved === existing.unresolved &&
        audit.fromTurnOffset < existing.fromTurnOffset)
    ) {
      auditsByNodeId.set(audit.nodeId, audit);
    }
  };

  for (const nodeId of getFactionAccessibleTritiumNodeIds(content, state, factionId)) {
    const survival = getAiTritiumNodeKnownThreatSurvival(content, state, factionId, nodeId, {
      arrivalTurn: state.turn,
      firstWorkTurnOffset: 1,
      projectedDvAfterCommitment: currentDv,
      excludedIncomeNodeIds: []
    });
    addAudit({
      nodeId,
      viaNodeId: nodeId,
      fromTurnOffset: 1,
      ...survival
    });
  }

  for (const order of [...state.pendingBurnOrders, ...state.activeBurnTransits]) {
    if (order.factionId !== factionId) {
      continue;
    }

    const destinationNode = getNodeById(content, order.destinationNodeId);

    if (destinationNode?.type !== "tritium") {
      continue;
    }

    const fromTurnOffset = Math.max(1, order.arrivalTurn - state.turn + 1);
    const survival = getAiTritiumNodeKnownThreatSurvival(
      content,
      state,
      factionId,
      destinationNode.id,
      {
        arrivalTurn: order.arrivalTurn,
        firstWorkTurnOffset: fromTurnOffset,
        projectedDvAfterCommitment: currentDv,
        excludedIncomeNodeIds: [order.originNodeId]
      }
    );
    addAudit({
      nodeId: destinationNode.id,
      viaNodeId: order.originNodeId,
      fromTurnOffset,
      ...survival
    });
  }

  for (const originNodeId of getAiAvailableActionOrigins(state, content, factionId)) {
    for (const destinationNode of content.nodes) {
      if (destinationNode.type !== "tritium") {
        continue;
      }

      const plan = getLegalBurnPlan(content, state, originNodeId, destinationNode.id, factionId);

      if (plan === null) {
        continue;
      }

      const projectedDvAfterBurn =
        getProjectedFactionDv(state, factionId, originNodeId) - plan.burnCost;
      const fromTurnOffset = Math.max(1, plan.arrivalTurn - state.turn + 1);
      const survival = getAiTritiumNodeKnownThreatSurvival(
        content,
        state,
        factionId,
        destinationNode.id,
        {
          arrivalTurn: plan.arrivalTurn,
          firstWorkTurnOffset: fromTurnOffset,
          projectedDvAfterCommitment: projectedDvAfterBurn,
          excludedIncomeNodeIds: [originNodeId]
        }
      );
      addAudit({
        nodeId: destinationNode.id,
        viaNodeId: originNodeId,
        fromTurnOffset,
        ...survival
      });
    }
  }

  return [...auditsByNodeId.values()].sort((first, second) => {
    const firstRank = getRecoveryAuditSortRank(first);
    const secondRank = getRecoveryAuditSortRank(second);

    if (firstRank !== secondRank) {
      return firstRank - secondRank;
    }

    if (first.fromTurnOffset !== second.fromTurnOffset) {
      return first.fromTurnOffset - second.fromTurnOffset;
    }

    return first.nodeId.localeCompare(second.nodeId);
  });
}

function getRecoveryAuditSortRank(
  audit: Pick<AiSolvencyTritiumCountAudit, "survivesKnownThreats" | "unresolved">
): number {
  if (audit.survivesKnownThreats) {
    return 0;
  }

  return audit.unresolved ? 1 : 2;
}

function getAiTritiumNodeKnownThreatSurvival(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  nodeId: string,
  options: Readonly<{
    arrivalTurn: number;
    firstWorkTurnOffset: number;
    projectedDvAfterCommitment: number;
    excludedIncomeNodeIds: readonly string[];
  }>
): AiKnownThreatSurvival {
  const horizonTurn = state.turn + AI_TRYHARD_SOLVENCY_HORIZON_TURNS;
  const firstWorkTurn = state.turn + options.firstWorkTurnOffset;

  if (
    hasEnemyShipAtNode(state, nodeId, factionId) ||
    isNodeContested(state.nodeOccupancies, nodeId)
  ) {
    return evaluateContestedRecoverySurvival(content, state, factionId, nodeId, {
      arrivalTurn: options.arrivalTurn,
      projectedDvAfterCommitment: options.projectedDvAfterCommitment,
      reason: "occupied-or-contested"
    });
  }

  if (getIncomingEnemyBurnsToNode(state, nodeId, factionId, horizonTurn).length > 0) {
    return evaluateContestedRecoverySurvival(content, state, factionId, nodeId, {
      arrivalTurn: options.arrivalTurn,
      projectedDvAfterCommitment: options.projectedDvAfterCommitment,
      reason: "known-contest-before-horizon"
    });
  }

  const knownMissiles = [...state.activeMissiles, ...state.pendingFireOrders]
    .filter((missile) => {
      return (
        missile.targetNodeId === nodeId &&
        missile.targetFactionId === factionId &&
        missile.impactTurn >= options.arrivalTurn &&
        missile.impactTurn <= horizonTurn
      );
    })
    .sort(compareCommittedMissileThreats);

  if (knownMissiles.length === 0) {
    return createStableRecoverySurvival("no-known-threats");
  }

  let projectedDv = options.projectedDvAfterCommitment;
  let projectedUntilTurn = state.turn;
  const supportingIncome = getKnownSafeSupportingTritiumIncome(
    content,
    state,
    factionId,
    options.excludedIncomeNodeIds,
    horizonTurn
  );
  const missileWaves = new Map<number, readonly (PendingFireOrder | ActiveMissile)[]>();

  for (const missile of knownMissiles) {
    missileWaves.set(missile.impactTurn, [
      ...(missileWaves.get(missile.impactTurn) ?? []),
      missile
    ]);
  }

  for (const [impactTurn] of [...missileWaves.entries()].sort(
    (first, second) => first[0] - second[0]
  )) {
    const incomeTurns = Math.max(0, impactTurn - Math.max(projectedUntilTurn, firstWorkTurn));
    projectedDv += (supportingIncome + tritiumWorkOutput) * incomeTurns;
    projectedUntilTurn = impactTurn;

    if (isNodeLikelyContestedBeforeTurn(state, nodeId, factionId, impactTurn)) {
      return evaluateContestedRecoverySurvival(content, state, factionId, nodeId, {
        arrivalTurn: options.arrivalTurn,
        projectedDvAfterCommitment: projectedDv,
        reason: "missile-impact-contested"
      });
    }

    if (projectedDv < automaticEvadeDvCost) {
      return createForcedDeadRecoverySurvival("cannot-evade-known-missile", {
        projectedDvAtArrival: projectedDv,
        hostileMissiles: knownMissiles.length
      });
    }

    projectedDv -= automaticEvadeDvCost;
  }

  return createStableRecoverySurvival("known-missiles-evadable");
}

function createStableRecoverySurvival(reason: string): AiKnownThreatSurvival {
  return {
    survivesKnownThreats: true,
    unresolved: false,
    contestedRecovery: false,
    recoveryStatus: "stable",
    reason
  };
}

function createForcedDeadRecoverySurvival(
  reason: string,
  details: Partial<
    Pick<
      AiKnownThreatSurvival,
      "projectedDvAtArrival" | "projectedDvAfterOneUpkeep" | "legalExits" | "hostileMissiles"
    >
  > = {}
): AiKnownThreatSurvival {
  return {
    survivesKnownThreats: false,
    unresolved: false,
    contestedRecovery: false,
    recoveryStatus: "forced-dead",
    reason,
    ...details
  };
}

function createUnresolvedContestedRecoverySurvival(
  reason: string,
  details: Required<
    Pick<
      AiKnownThreatSurvival,
      "projectedDvAtArrival" | "projectedDvAfterOneUpkeep" | "legalExits" | "hostileMissiles"
    >
  >
): AiKnownThreatSurvival {
  return {
    survivesKnownThreats: false,
    unresolved: true,
    contestedRecovery: true,
    recoveryStatus: "unresolved-contested-recovery",
    reason,
    ...details
  };
}

function evaluateContestedRecoverySurvival(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  nodeId: string,
  options: Readonly<{
    arrivalTurn: number;
    projectedDvAfterCommitment: number;
    reason: string;
  }>
): AiKnownThreatSurvival {
  const turnsUntilArrival = Math.max(0, options.arrivalTurn - state.turn);
  const projectedDvAtArrival = options.projectedDvAfterCommitment;
  const hostileMissiles = countHostileMissilesAffectingRecovery(state, factionId, nodeId);
  const legalExits = countLegalRecoveryExits(content, state, factionId, nodeId);
  const projectedDvAfterOneUpkeep = projectedDvAtArrival - contestedUpkeepDvCost;
  const details = {
    projectedDvAtArrival,
    projectedDvAfterOneUpkeep,
    legalExits,
    hostileMissiles
  };

  if (projectedDvAtArrival < contestedUpkeepDvCost) {
    return createForcedDeadRecoverySurvival(
      "contested-recovery-cannot-pay-arrival-upkeep",
      details
    );
  }

  if (projectedDvAfterOneUpkeep < 0) {
    return createForcedDeadRecoverySurvival(
      "contested-recovery-cannot-pay-resolution-turn",
      details
    );
  }

  if (legalExits <= 0 && projectedDvAfterOneUpkeep < continuousBurnTuning.minBurnCost) {
    return createForcedDeadRecoverySurvival("contested-recovery-no-legal-exit", details);
  }

  if (hostileMissiles > 0 && projectedDvAfterOneUpkeep < automaticEvadeDvCost && legalExits <= 0) {
    return createForcedDeadRecoverySurvival("contested-recovery-locked-by-missile", details);
  }

  return createUnresolvedContestedRecoverySurvival(
    `${options.reason}:unresolved-contested-recovery:T+${turnsUntilArrival}`,
    details
  );
}

function countHostileMissilesAffectingRecovery(
  state: GameState,
  factionId: FactionId,
  nodeId: string
): number {
  return [...state.pendingFireOrders, ...state.activeMissiles].filter((missile) => {
    return missile.targetFactionId === factionId && missile.targetNodeId === nodeId;
  }).length;
}

function countLegalRecoveryExits(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  nodeId: string
): number {
  return content.nodes.filter((destination) => {
    if (destination.id === nodeId) {
      return false;
    }

    const plan = calculateBurnPlan(content, state, nodeId, destination.id);
    return plan !== null && plan.burnCost <= Math.max(0, getFactionDv(state, factionId));
  }).length;
}

function getKnownSafeSupportingTritiumIncome(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  excludedNodeIds: readonly string[],
  horizonTurn: number
): number {
  const excluded = new Set(excludedNodeIds);

  return content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => {
      return (
        !excluded.has(node.id) &&
        hasFactionShipAtNode(state, node.id, factionId) &&
        !isNodeContested(state.nodeOccupancies, node.id) &&
        !hasPendingAction(state, node.id, factionId) &&
        !hasIncomingMissileTargetingNode(state, node.id, factionId) &&
        getIncomingEnemyBurnsToNode(state, node.id, factionId, horizonTurn).length === 0
      );
    })
    .reduce((total) => total + tritiumWorkOutput, 0);
}

function compareCommittedMissileThreats(
  first: PendingFireOrder | ActiveMissile,
  second: PendingFireOrder | ActiveMissile
): number {
  if (first.impactTurn !== second.impactTurn) {
    return first.impactTurn - second.impactTurn;
  }

  return first.id.localeCompare(second.id);
}

function getAiReachableTritiumNodeCount(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  return getAiSolvencyTritiumCountAudits(content, state, factionId).filter(
    (audit) => audit.survivesKnownThreats
  ).length;
}

function createAiTryhardStrategyReadEvent(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number
): TurnDebugEvent {
  const strongestEnemy = getEnemyFactionIds(state, factionId)
    .map((enemyFactionId) => getAiSolvencyProjection(content, state, enemyFactionId))
    .sort((first, second) => second.projectedDvAtHorizon - first.projectedDvAtHorizon)[0];

  return {
    turn,
    type: "AI_TRYHARD_STRATEGY_READ",
    message:
      strongestEnemy === undefined
        ? `AI_TRYHARD_STRATEGY_READ: ${AI_PROFILE_TRYHARD} horizon ${AI_TRYHARD_SOLVENCY_HORIZON_TURNS}; no active enemy projection`
        : `AI_TRYHARD_STRATEGY_READ: ${AI_PROFILE_TRYHARD} horizon ${AI_TRYHARD_SOLVENCY_HORIZON_TURNS}; strongest enemy ${strongestEnemy.factionId} projected ΔV ${strongestEnemy.projectedDvAtHorizon}`,
    factionId,
    ...(strongestEnemy === undefined
      ? {}
      : {
          targetFactionId: strongestEnemy.factionId,
          projectedDv: strongestEnemy.projectedDvAtHorizon
        }),
    reason: "solvency-game:faction-level-coordinated-planning"
  };
}

function createAiSolvencyProjectionEvents(
  content: SimulationContent,
  turn: number,
  projection: AiSolvencyProjection
): readonly TurnDebugEvent[] {
  return [
    ...projection.tritiumCountAudits.map((audit): TurnDebugEvent => {
      return {
        turn,
        type: "AI_SOLVENCY_COUNTS_TRITIUM",
        message: `AI_SOLVENCY_COUNTS_TRITIUM ${getNodeDisplayName(content, audit.nodeId)} via ${getNodeDisplayName(content, audit.viaNodeId)} from T+${audit.fromTurnOffset}, status ${audit.recoveryStatus}, survivesKnownThreats ${formatYesNo(audit.survivesKnownThreats)}`,
        nodeId: audit.nodeId,
        factionId: projection.factionId,
        originNodeId: audit.viaNodeId,
        amount: audit.survivesKnownThreats ? tritiumWorkOutput : 0,
        reason: audit.reason
      };
    }),
    {
      turn,
      type: "AI_SOLVENCY_PROJECTION",
      message: `AI_SOLVENCY_PROJECTION ${projection.factionId}: ΔV ${projection.currentDv}; income ${projection.guaranteedTritiumIncome}; upkeep ${projection.projectedUpkeep}; missiles ${projection.incomingMissiles}; reachable tritium ${projection.reachableTritiumNodes}; horizon ΔV ${projection.projectedDvAtHorizon}; ${projection.solvent ? "solvent" : "insolvent"}`,
      factionId: projection.factionId,
      projectedDv: projection.projectedDvAtHorizon,
      amount: projection.guaranteedTritiumIncome,
      reason: projection.solvent ? "solvent" : "insolvent"
    }
  ];
}

function createAiSecondTritiumContextEvents(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  context: AiSecondTritiumContext
): readonly TurnDebugEvent[] {
  const events: TurnDebugEvent[] = [];
  const firstHumanMove = context.humanSecondTritiumMoves[0];

  if (context.secondTritiumRequired) {
    const targetNodeId = firstHumanMove?.destinationNodeId;
    events.push({
      turn,
      type: "AI_SECOND_TRITIUM_REQUIRED",
      message: `AI_SECOND_TRITIUM_REQUIRED: ${factionId} has ${context.aiProjectedTritiumCount}/2 projected secured Tritium while an enemy projects ${context.strongestEnemyProjectedTritiumCount}; staging ship should mirror expansion before isolated FIRE`,
      factionId,
      ...(targetNodeId === undefined ? {} : { targetNodeId }),
      reason: "GET_SECOND_TRITIUM",
      score: getAiSecondTritiumContextScore(context)
    });

    if (targetNodeId !== undefined) {
      events.push(
        createAiStrategicIntentEvent(
          content,
          turn,
          factionId,
          "AI_INTENT_SET",
          createAiStrategicIntent(
            "get-second-tritium",
            targetNodeId,
            turn,
            getAiSecondTritiumContextScore(context),
            "GET_SECOND_TRITIUM"
          ),
          "GET_SECOND_TRITIUM"
        )
      );
    }
  }

  if (firstHumanMove !== undefined) {
    events.push({
      turn,
      type: "AI_HUMAN_TRITIUM_EXPANSION_DETECTED",
      message: `AI_HUMAN_TRITIUM_EXPANSION_DETECTED: human staging ship ${getNodeDisplayName(content, firstHumanMove.originNodeId)} -> ${getNodeDisplayName(content, firstHumanMove.destinationNodeId)} arrives T${firstHumanMove.arrivalTurn}`,
      nodeId: firstHumanMove.originNodeId,
      factionId,
      targetFactionId: defaultPlayerFactionId,
      targetNodeId: firstHumanMove.destinationNodeId,
      etaTurns: Math.max(0, firstHumanMove.arrivalTurn - turn),
      reason: "COUNTER_HUMAN_SECOND_TRITIUM",
      score: getAiSecondTritiumContextScore(context) + 500
    });
    events.push(
      createAiStrategicIntentEvent(
        content,
        turn,
        factionId,
        "AI_INTENT_SET",
        createAiStrategicIntent(
          "counter-second-tritium",
          firstHumanMove.destinationNodeId,
          turn,
          getAiSecondTritiumContextScore(context) + 500,
          "COUNTER_HUMAN_SECOND_TRITIUM"
        ),
        "COUNTER_HUMAN_SECOND_TRITIUM"
      )
    );
  }

  if (context.tritiumEmergency) {
    events.push({
      turn,
      type: "AI_TRITIUM_EMERGENCY",
      message: `AI_TRITIUM_EMERGENCY: ${factionId} projects ${context.aiProjectedTritiumCount} secured Tritium while an enemy projects ${context.strongestEnemyProjectedTritiumCount}; passive work is subordinate to recovery or denial`,
      factionId,
      reason: "TRITIUM_EMERGENCY",
      projectedDv: context.aiProjectedTritiumCount,
      amount: context.strongestEnemyProjectedTritiumCount,
      score: getAiSecondTritiumContextScore(context) + 300
    });
  }

  return events;
}

function getAiSecondTritiumContextScore(context: AiSecondTritiumContext): number {
  return (
    (context.aiProjectedTritiumCount < 2 ? 1000 : 0) +
    (context.humanSecondTritiumMoves.length > 0 ? 500 : 0) +
    (context.strongestEnemyProjectedTritiumCount >= 2 || context.humanProjectedTritiumCount >= 2
      ? 300
      : 0) +
    (context.hasSafeFallbackTritium ? 0 : 200)
  );
}

function createAiSecondTritiumOverrideEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  candidate: AiTryhardActionCandidate,
  context: AiSecondTritiumContext
): TurnDebugEvent {
  return {
    turn,
    type: "AI_SECOND_TRITIUM_OVERRIDE",
    message: `AI_SECOND_TRITIUM_OVERRIDE: ${candidate.action} ${getNodeDisplayName(content, candidate.originNodeId)} -> ${getNodeDisplayName(content, candidate.targetNodeId)} overrides second Tritium law: ${candidate.reason}`,
    nodeId: candidate.originNodeId,
    factionId,
    action: candidate.action,
    ...(candidate.action === "BURN" ? { destinationNodeId: candidate.targetNodeId } : {}),
    ...(candidate.action === "FIRE" ? { targetNodeId: candidate.targetNodeId } : {}),
    ...(candidate.targetFactionId === undefined
      ? {}
      : { targetFactionId: candidate.targetFactionId }),
    reason: `override:${candidate.reason}`,
    score: candidate.score,
    projectedDv: context.aiProjectedTritiumCount,
    amount: context.strongestEnemyProjectedTritiumCount
  };
}

function createAiSecondTritiumRejectedEvents(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  reason: string,
  context: AiSecondTritiumContext,
  candidate?: AiTryhardActionCandidate
): readonly TurnDebugEvent[] {
  if (
    !context.secondTritiumRequired &&
    !context.tritiumEmergency &&
    (candidate === undefined || !isAiSecondTritiumCandidate(candidate))
  ) {
    return [];
  }

  return [
    {
      turn,
      type: "AI_SECOND_TRITIUM_REJECTED_WITH_REASON",
      message:
        candidate === undefined
          ? `AI_SECOND_TRITIUM_REJECTED_WITH_REASON: no second Tritium plan accepted: ${reason}`
          : `AI_SECOND_TRITIUM_REJECTED_WITH_REASON: ${candidate.action} ${getNodeDisplayName(content, candidate.originNodeId)} -> ${getNodeDisplayName(content, candidate.targetNodeId)} rejected: ${reason}`,
      factionId,
      ...(candidate === undefined ? {} : { nodeId: candidate.originNodeId }),
      ...(candidate === undefined ? {} : { action: candidate.action }),
      ...(candidate?.action === "BURN" ? { destinationNodeId: candidate.targetNodeId } : {}),
      ...(candidate?.action === "FIRE" ? { targetNodeId: candidate.targetNodeId } : {}),
      ...(candidate?.targetFactionId === undefined
        ? {}
        : { targetFactionId: candidate.targetFactionId }),
      reason,
      projectedDv: context.aiProjectedTritiumCount,
      amount: context.strongestEnemyProjectedTritiumCount,
      score: candidate?.score ?? getAiSecondTritiumContextScore(context)
    }
  ];
}

function createAiTryhardSelectedEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  candidate: AiTryhardActionCandidate
): TurnDebugEvent {
  const type =
    candidate.kind === "shipyard-theft"
      ? "AI_SHIPYARD_THEFT_SELECTED"
      : candidate.kind === "counter-second-tritium"
        ? "AI_COUNTER_TRITIUM_PLAN_SELECTED"
        : candidate.kind === "tritium-race"
          ? "AI_TRITIUM_RACE_RESPONSE"
          : candidate.kind === "second-tritium"
            ? "AI_TRITIUM_RACE_RESPONSE"
            : "AI_ECONOMIC_FIRE_SELECTED";

  return {
    turn,
    type,
    message: `${type}: ${candidate.action} ${getNodeDisplayName(content, candidate.originNodeId)} -> ${getNodeDisplayName(content, candidate.targetNodeId)}; ${candidate.reason}; score ${Math.round(candidate.score)}; expected swing ${candidate.expectedDvSwing}`,
    nodeId: candidate.originNodeId,
    factionId,
    action: candidate.action,
    reason: candidate.reason,
    ...(candidate.action === "FIRE" ? { targetNodeId: candidate.targetNodeId } : {}),
    ...(candidate.action === "BURN" ? { destinationNodeId: candidate.targetNodeId } : {}),
    ...(candidate.targetFactionId === undefined
      ? {}
      : { targetFactionId: candidate.targetFactionId }),
    etaTurns: candidate.etaTurns,
    burnCost: candidate.burnCost,
    projectedDv: candidate.expectedDvSwing,
    amount: candidate.expectedDeniedWork,
    score: candidate.score
  };
}

function createAiTryhardActionRejectedEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  nodeId: string,
  action: NonNullable<TurnDebugEvent["action"]>,
  reason: string,
  details: Readonly<{ destinationNodeId?: string; targetNodeId?: string }> = {}
): TurnDebugEvent {
  return {
    turn,
    type: "AI_ACTION_REJECTED_WITH_REASON",
    message: `AI_ACTION_REJECTED_WITH_REASON: ${action} at ${getNodeDisplayName(content, nodeId)} rejected: ${reason}`,
    nodeId,
    factionId,
    action,
    reason,
    ...details
  };
}

function createAiTryhardContestedSustainabilityEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  check: AiContestedSustainabilityCheck,
  details: Readonly<{ destinationNodeId?: string; targetNodeId?: string }> = {}
): TurnDebugEvent {
  const destinationName =
    details.destinationNodeId === undefined
      ? getNodeDisplayName(content, check.nodeId)
      : getNodeDisplayName(content, details.destinationNodeId);

  return {
    turn,
    type: "AI_CONTESTED_SUSTAINABILITY_CHECK",
    message: `AI_CONTESTED_SUSTAINABILITY_CHECK: ${getNodeDisplayName(content, originNodeId)} -> ${destinationName}; ${check.sustainable ? "sustainable" : (check.reason ?? "unsustainable")}; projected ΔV ${check.projectedDvAfterUpkeep}`,
    nodeId: originNodeId,
    factionId,
    action: "BURN",
    reason: check.reason ?? "sustainable",
    projectedDv: check.projectedDvAfterUpkeep,
    amount: check.activeTritiumIncome,
    ...details
  };
}

function createAiSolvencyReserveEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  destinationNodeId: string,
  check: AiSolvencyReserveCheck
): TurnDebugEvent {
  return {
    turn,
    type: "AI_SOLVENCY_RESERVE",
    message: `AI_SOLVENCY_RESERVE: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, destinationNodeId)}; current ${check.currentDv} ΔV; after ${check.projectedDvAfterAction}; income ${check.projectedIncome}; upkeep reserve ${check.upkeepReserve}; evade reserve ${check.evadeReserve}; mandatory reserve ${check.mandatoryLaunchReserve}; minimum ${check.minimumReserve}; fallback Tritium ${formatYesNo(check.hasFallbackTritium)}`,
    nodeId: originNodeId,
    factionId,
    action: "BURN",
    destinationNodeId,
    projectedDv: check.projectedDvAfterAction,
    amount: check.minimumReserve,
    reason: check.reason ?? "reserve-ok"
  };
}

function createAiRejectedOpeningBurnEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  destinationNodeId: string,
  check: AiSolvencyReserveCheck
): TurnDebugEvent {
  return {
    turn,
    type: "AI_REJECTED_OPENING_BURN",
    message: `AI_REJECTED_OPENING_BURN: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, destinationNodeId)} would leave ${check.projectedDvAfterAction} ΔV below reserve ${check.minimumReserve}`,
    nodeId: originNodeId,
    factionId,
    action: "BURN",
    destinationNodeId,
    projectedDv: check.projectedDvAfterAction,
    amount: check.minimumReserve,
    reason: check.reason ?? "opening-solvency-hard-gate"
  };
}

function createAiRejectedContestEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  destinationNodeId: string,
  check: AiContestedSustainabilityCheck
): TurnDebugEvent {
  return {
    turn,
    type: "AI_REJECTED_CONTEST",
    message: `AI_REJECTED_CONTEST: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, destinationNodeId)} unsustainable; after upkeep ${check.projectedDvAfterUpkeep}; enemy outlast ${formatYesNo(check.enemyCanAffordUpkeepBetter)}; exit ${formatYesNo(check.canLeaveNextTurn)}; fallback Tritium ${formatYesNo(check.hasFallbackTritium)}`,
    nodeId: originNodeId,
    factionId,
    action: "BURN",
    destinationNodeId,
    projectedDv: check.projectedDvAfterUpkeep,
    amount: check.expectedUpkeepCost,
    reason: check.reason ?? "CONTESTED_REJECTED_UNSUSTAINABLE"
  };
}

function createAiRejectedSuicidalContestEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  destinationNodeId: string,
  check: AiContestedSustainabilityCheck
): TurnDebugEvent {
  return {
    turn,
    type: "AI_REJECTED_SUICIDAL_CONTEST",
    message: `AI_REJECTED_SUICIDAL_CONTEST: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, destinationNodeId)} cannot sustain ${AI_CONTESTED_SUSTAIN_TURNS} upkeep turns; projected ΔV ${check.projectedDvAfterTwoUpkeeps}; survival route ${formatYesNo(check.hasSurvivalRoute)}`,
    nodeId: originNodeId,
    factionId,
    action: "BURN",
    destinationNodeId,
    projectedDv: check.projectedDvAfterTwoUpkeeps,
    amount: check.expectedUpkeepCost * AI_CONTESTED_SUSTAIN_TURNS,
    reason: check.reason ?? "CONTESTED_REJECTED_UNSUSTAINABLE"
  };
}

function createAiTacticalLineAuditEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  targetNodeId: string,
  projection: AiTacticalLineProjection,
  accepted: boolean,
  reason: string
): TurnDebugEvent {
  const actionTargetDetails =
    projection.action === "FIRE"
      ? { targetNodeId }
      : projection.action === "BURN" || projection.action === "LEAVE_CONTESTED"
        ? { destinationNodeId: targetNodeId }
        : { targetNodeId };

  return {
    turn,
    type: "AI_TACTICAL_LINE_AUDIT",
    message: [
      `AI_TACTICAL_LINE_AUDIT ${accepted ? "ACCEPT" : "REJECT"}`,
      `${projection.action} ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, targetNodeId)}`,
      `score ${Math.round(projection.score)}`,
      `certainty ${projection.classification}`,
      `dv[${projection.projectedDvByTurn.join(",")}]`,
      `lastTritium ${formatYesNo(projection.lastTritiumWorker)}`,
      `reserveViolation ${formatYesNo(projection.reserveViolation)}`,
      `contestedSustainable ${formatYesNo(projection.contestedSustainable)}`,
      `tritiumAccess ${formatYesNo(projection.hasTritiumAccessAfterLine)}`,
      `reason ${reason}`
    ].join("; "),
    nodeId: originNodeId,
    factionId,
    action: projection.action,
    reason: `${accepted ? "accepted" : "rejected"}:${projection.classification}:${reason}`,
    projectedDv: projection.finalProjectedDv,
    amount: projection.lostWorkCost,
    score: projection.score,
    expected: projection.projectedDvByTurn.join(","),
    actual: `${projection.minProjectedDv}`,
    contested: projection.contestedSustainable,
    ...actionTargetDetails
  };
}

function createAiShipyardCompletionLockEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  reason: string,
  candidate: AiTryhardActionCandidate
): TurnDebugEvent {
  return {
    turn,
    type: "AI_SHIPYARD_COMPLETION_LOCK",
    message: `AI_SHIPYARD_COMPLETION_LOCK: ${getNodeDisplayName(content, originNodeId)} stays to finish shipyard ${getShipyardProgress(state.shipyardProgress, originNodeId)}/${shipyardCompletionProgress}; rejected ${candidate.action} to ${getNodeDisplayName(content, candidate.targetNodeId)}`,
    nodeId: originNodeId,
    factionId,
    action: candidate.action,
    ...(candidate.action === "BURN" ? { destinationNodeId: candidate.targetNodeId } : {}),
    ...(candidate.action === "FIRE" ? { targetNodeId: candidate.targetNodeId } : {}),
    reason,
    score: candidate.score
  };
}

function createAiShipyardCompletionWorkLockEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  reason: string
): TurnDebugEvent {
  return {
    turn,
    type: "AI_SHIPYARD_COMPLETION_LOCK",
    message: `AI_SHIPYARD_COMPLETION_LOCK: ${getNodeDisplayName(content, originNodeId)} stays; auto-work will finish shipyard ${getShipyardProgress(state.shipyardProgress, originNodeId)}/${shipyardCompletionProgress}; rejected pressure burn`,
    nodeId: originNodeId,
    factionId,
    reason,
    progress: getShipyardProgress(state.shipyardProgress, originNodeId)
  };
}

function createAiEvadeExcludedEvents(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  nodeId: string,
  replacementAction: "LEAVE_CONTESTED" | "STAY_CONTESTED"
): readonly TurnDebugEvent[] {
  const impactingMissiles = getIncomingActiveMissiles(state, nodeId, factionId).filter(
    (missile) => missile.impactTurn === turn
  );

  if (impactingMissiles.length === 0) {
    return [];
  }

  return [
    {
      turn,
      type: "AI_EVADE_EXCLUDED",
      message: `AI EVADE excluded at ${getNodeDisplayName(content, nodeId)} because the ship is CONTESTED; replacement ${replacementAction}`,
      nodeId,
      factionId,
      action: replacementAction,
      reason: "CONTESTED_SHIP",
      amount: impactingMissiles.length
    }
  ];
}

function planAiForcedEconomicEndgame(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  aiPlanningOptions: AiPlanningOptions
): Readonly<{
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  handled: boolean;
}> {
  if (
    aiPlanningOptions.enableForcedEconomicEndgame === false ||
    !isAiTryhardProfileActive(state, factionId) ||
    isSimplifiedAiPlanning(aiPlanningOptions)
  ) {
    return { state, debugEvents: [], handled: false };
  }

  const plans = getAiEndgamePublicRecoveryThreats(state, content, factionId)
    .flatMap((threat) => {
      return getAiEndgameInitialClosureActions(state, content, factionId, threat).flatMap(
        (action) => {
          const escapeCoverage = getAiEndgameEscapeCoverage(
            state,
            content,
            factionId,
            threat,
            action
          );

          return escapeCoverage === null ? [] : [{ threat, action, escapeCoverage }];
        }
      );
    })
    .sort(compareAiEndgameClosurePlans);

  for (const plan of plans) {
    const nextState = applyAiEndgameClosureAction(state, content, factionId, plan);

    if (plan.action.kind !== "HOLD" && nextState === state) {
      continue;
    }

    return {
      state: nextState,
      debugEvents: createAiEndgameClosureEvents(content, state, factionId, plan),
      handled: true
    };
  }

  return { state, debugEvents: [], handled: false };
}

function getAiEndgamePublicRecoveryThreats(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): readonly AiEndgamePublicRecoveryThreat[] {
  const remainingCompetitiveEnemies = getEnemyFactionIds(state, factionId).filter(
    (enemyFactionId) => {
      return (
        evaluateFactionRecoveryPath(content, state, enemyFactionId).collapseStatus !== "forced"
      );
    }
  );

  if (remainingCompetitiveEnemies.length !== 1) {
    return [];
  }

  return remainingCompetitiveEnemies
    .flatMap((enemyFactionId): readonly AiEndgamePublicRecoveryThreat[] => {
      if (countFactionShips(state, enemyFactionId) !== 1) {
        return [];
      }

      const transit = state.activeBurnTransits.find((candidate) => {
        return candidate.factionId === enemyFactionId && candidate.shipCount === 1;
      });

      if (transit !== undefined) {
        const destination = getNodeById(content, transit.destinationNodeId);

        return destination?.type === "tritium"
          ? [
              {
                enemyFactionId,
                targetNodeId: destination.id,
                targetAvailableTurn: transit.arrivalTurn,
                firstWorkTurn: transit.arrivalTurn + 1,
                committedTransit: true
              }
            ]
          : [];
      }

      const occupancy = state.nodeOccupancies.find((candidate) => {
        return (
          candidate.factionId === enemyFactionId &&
          candidate.shipCount === 1 &&
          getNodeById(content, candidate.nodeId)?.type === "tritium"
        );
      });

      if (occupancy === undefined) {
        // A simultaneous BURN selected from a non-Tritium node is deliberately not inspected.
        // Once it departs, its destination becomes an active public transit and is reconsidered.
        return [];
      }

      const continuesPublicClosure = state.debugEvents.some((event) => {
        return (
          event.type === "AI_FORCED_ECONOMIC_MATE_FOUND" &&
          event.factionId === factionId &&
          event.targetFactionId === enemyFactionId &&
          event.targetNodeId === occupancy.nodeId
        );
      });

      if (!continuesPublicClosure) {
        // A ship that is merely stationary on Tritium may choose an unknown simultaneous escape.
        // The endgame override starts only from a committed public transit, then carries the
        // resulting HOLD while that already-proven closure remains public.
        return [];
      }

      return [
        {
          enemyFactionId,
          targetNodeId: occupancy.nodeId,
          targetAvailableTurn: state.turn,
          firstWorkTurn: state.turn + 1,
          committedTransit: false
        }
      ];
    })
    .sort((first, second) => {
      if (first.firstWorkTurn !== second.firstWorkTurn) {
        return first.firstWorkTurn - second.firstWorkTurn;
      }

      if (first.enemyFactionId !== second.enemyFactionId) {
        return first.enemyFactionId.localeCompare(second.enemyFactionId);
      }

      return first.targetNodeId.localeCompare(second.targetNodeId);
    });
}

function getAiEndgameInitialClosureActions(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  threat: AiEndgamePublicRecoveryThreat
): readonly AiEndgameClosureAction[] {
  const actions: AiEndgameClosureAction[] = [];
  const projectedDv = getProjectedFactionDv(state, factionId);
  const targetHold = state.nodeOccupancies.find((occupancy) => {
    return (
      occupancy.nodeId === threat.targetNodeId &&
      occupancy.factionId === factionId &&
      occupancy.shipCount > 0
    );
  });

  if (targetHold !== undefined && projectedDv >= contestedUpkeepDvCost) {
    actions.push({
      kind: "HOLD",
      originNodeId: threat.targetNodeId,
      targetNodeId: threat.targetNodeId,
      effectiveTurn: Math.max(state.turn, threat.targetAvailableTurn),
      cost: 0
    });
  }

  for (const transit of state.activeBurnTransits) {
    if (
      transit.factionId === factionId &&
      transit.destinationNodeId === threat.targetNodeId &&
      transit.arrivalTurn <= threat.firstWorkTurn &&
      projectedDv >= contestedUpkeepDvCost
    ) {
      actions.push({
        kind: "HOLD",
        originNodeId: transit.originNodeId,
        targetNodeId: threat.targetNodeId,
        effectiveTurn: transit.arrivalTurn,
        cost: 0
      });
    }
  }

  for (const occupancy of state.nodeOccupancies) {
    if (
      occupancy.factionId !== factionId ||
      occupancy.shipCount <= 0 ||
      hasPendingAction(state, occupancy.nodeId, factionId) ||
      occupancy.nodeId === threat.targetNodeId
    ) {
      continue;
    }

    const burn = calculateBurnPlan(content, state, occupancy.nodeId, threat.targetNodeId);

    if (
      burn !== null &&
      burn.arrivalTurn <= threat.firstWorkTurn &&
      burn.burnCost + contestedUpkeepDvCost <= projectedDv
    ) {
      actions.push({
        kind: "BURN",
        originNodeId: occupancy.nodeId,
        targetNodeId: threat.targetNodeId,
        effectiveTurn: burn.arrivalTurn,
        cost: burn.burnCost
      });
    }

    const fire = calculateFirePlan(content, state, occupancy.nodeId, threat.targetNodeId);
    const targetCannotEvade =
      getFactionDv(state, threat.enemyFactionId) < automaticEvadeDvCost ||
      isNodeContested(state.nodeOccupancies, threat.targetNodeId);

    if (fire !== null && fire.impactTurn <= threat.firstWorkTurn && targetCannotEvade) {
      actions.push({
        kind: "FIRE",
        originNodeId: occupancy.nodeId,
        targetNodeId: threat.targetNodeId,
        effectiveTurn: fire.impactTurn,
        cost: 0
      });
    }
  }

  return actions.sort((first, second) => compareAiEndgameClosureActions(content, first, second));
}

function getAiEndgameEscapeCoverage(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  threat: AiEndgamePublicRecoveryThreat,
  initialAction: AiEndgameClosureAction
): readonly AiEndgameEscapeCoverage[] | null {
  const responseTurn = threat.targetAvailableTurn + 1;
  const enemyBudget = getFactionDv(state, threat.enemyFactionId);
  const defenderBudget =
    getProjectedFactionDv(state, factionId) -
    initialAction.cost +
    getAiEndgameGuaranteedIncomeBeforeTurn(state, content, factionId, initialAction, responseTurn);
  const projectedOrigins = getAiEndgameProjectedOrigins(
    state,
    factionId,
    initialAction,
    responseTurn
  );
  const escapeRoutes = content.nodes
    .filter((node) => node.type === "tritium" && node.id !== threat.targetNodeId)
    .flatMap((node) => {
      const plan = calculateBurnPlan(
        content,
        threat.targetAvailableTurn,
        threat.targetNodeId,
        node.id
      );

      return plan === null || plan.burnCost > enemyBudget ? [] : [{ node, plan }];
    })
    .sort((first, second) => first.node.id.localeCompare(second.node.id));
  const coverage: AiEndgameEscapeCoverage[] = [];

  for (const escape of escapeRoutes) {
    const firstWorkTurn = escape.plan.arrivalTurn + 1;
    const response = getAiEndgameResponseAction(
      content,
      projectedOrigins,
      responseTurn,
      escape.node.id,
      firstWorkTurn,
      defenderBudget,
      enemyBudget - escape.plan.burnCost
    );

    if (response === null) {
      return null;
    }

    coverage.push({
      destinationNodeId: escape.node.id,
      firstWorkTurn,
      action: response
    });
  }

  return coverage;
}

function getAiEndgameGuaranteedIncomeBeforeTurn(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  initialAction: AiEndgameClosureAction,
  turn: number
): number {
  const incomeTurns = Math.max(0, turn - state.turn);
  const guaranteedWorkers = state.nodeOccupancies.filter((occupancy) => {
    if (
      occupancy.factionId !== factionId ||
      occupancy.shipCount <= 0 ||
      occupancy.nodeId === (initialAction.kind === "BURN" ? initialAction.originNodeId : "") ||
      getNodeById(content, occupancy.nodeId)?.type !== "tritium" ||
      isNodeContested(state.nodeOccupancies, occupancy.nodeId) ||
      hasPendingAction(state, occupancy.nodeId, factionId)
    ) {
      return false;
    }

    const knownHostileArrival = state.activeBurnTransits.some((transit) => {
      return (
        transit.factionId !== factionId &&
        transit.destinationNodeId === occupancy.nodeId &&
        transit.arrivalTurn <= turn
      );
    });
    const knownMissileImpact = state.activeMissiles.some((missile) => {
      return (
        missile.targetFactionId === factionId &&
        missile.targetNodeId === occupancy.nodeId &&
        missile.impactTurn <= turn
      );
    });

    return !knownHostileArrival && !knownMissileImpact;
  }).length;

  return guaranteedWorkers * tritiumWorkOutput * incomeTurns;
}

function getAiEndgameProjectedOrigins(
  state: GameState,
  factionId: FactionId,
  initialAction: AiEndgameClosureAction,
  responseTurn: number
): readonly string[] {
  const origins = new Set(
    state.nodeOccupancies
      .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
      .map((occupancy) => occupancy.nodeId)
  );

  if (initialAction.kind === "BURN") {
    origins.delete(initialAction.originNodeId);
  }

  if (initialAction.kind !== "FIRE" && initialAction.effectiveTurn <= responseTurn) {
    origins.add(initialAction.targetNodeId);
  }

  for (const transit of state.activeBurnTransits) {
    if (transit.factionId === factionId && transit.arrivalTurn <= responseTurn) {
      origins.add(transit.destinationNodeId);
    }
  }

  return [...origins].sort();
}

function getAiEndgameResponseAction(
  content: SimulationContent,
  originNodeIds: readonly string[],
  responseTurn: number,
  destinationNodeId: string,
  firstWorkTurn: number,
  defenderBudget: number,
  enemyBudgetAfterEscape: number
): AiEndgameClosureAction | null {
  const actions: AiEndgameClosureAction[] = [];

  for (const originNodeId of originNodeIds) {
    if (originNodeId === destinationNodeId) {
      actions.push({
        kind: "HOLD",
        originNodeId,
        targetNodeId: destinationNodeId,
        effectiveTurn: responseTurn,
        cost: 0
      });
      continue;
    }

    const burn = calculateBurnPlan(content, responseTurn, originNodeId, destinationNodeId);

    if (burn !== null && burn.arrivalTurn <= firstWorkTurn && burn.burnCost <= defenderBudget) {
      actions.push({
        kind: "BURN",
        originNodeId,
        targetNodeId: destinationNodeId,
        effectiveTurn: burn.arrivalTurn,
        cost: burn.burnCost
      });
    }

    if (enemyBudgetAfterEscape < automaticEvadeDvCost) {
      const fire = calculateFirePlan(content, responseTurn, originNodeId, destinationNodeId);

      if (fire !== null && fire.impactTurn <= firstWorkTurn) {
        actions.push({
          kind: "FIRE",
          originNodeId,
          targetNodeId: destinationNodeId,
          effectiveTurn: fire.impactTurn,
          cost: 0
        });
      }
    }
  }

  return (
    actions.sort((first, second) => compareAiEndgameClosureActions(content, first, second))[0] ??
    null
  );
}

function compareAiEndgameClosurePlans(
  first: AiEndgameClosurePlan,
  second: AiEndgameClosurePlan
): number {
  if (first.threat.firstWorkTurn !== second.threat.firstWorkTurn) {
    return first.threat.firstWorkTurn - second.threat.firstWorkTurn;
  }

  const actionComparison = compareAiEndgameClosureActionsForPlan(first.action, second.action);

  if (actionComparison !== 0) {
    return actionComparison;
  }

  return first.threat.enemyFactionId.localeCompare(second.threat.enemyFactionId);
}

function compareAiEndgameClosureActions(
  content: SimulationContent,
  first: AiEndgameClosureAction,
  second: AiEndgameClosureAction
): number {
  const baseComparison = compareAiEndgameClosureActionsForPlan(first, second);

  if (baseComparison !== 0) {
    return baseComparison;
  }

  const firstOriginRank = getAiEndgameOriginPreservationRank(content, first.originNodeId);
  const secondOriginRank = getAiEndgameOriginPreservationRank(content, second.originNodeId);

  if (firstOriginRank !== secondOriginRank) {
    return firstOriginRank - secondOriginRank;
  }

  return first.originNodeId.localeCompare(second.originNodeId);
}

function compareAiEndgameClosureActionsForPlan(
  first: AiEndgameClosureAction,
  second: AiEndgameClosureAction
): number {
  const actionPriority: Readonly<Record<AiEndgameClosureActionKind, number>> = {
    HOLD: 0,
    BURN: 1,
    FIRE: 2
  };

  if (actionPriority[first.kind] !== actionPriority[second.kind]) {
    return actionPriority[first.kind] - actionPriority[second.kind];
  }

  if (first.cost !== second.cost) {
    return first.cost - second.cost;
  }

  if (first.effectiveTurn !== second.effectiveTurn) {
    return first.effectiveTurn - second.effectiveTurn;
  }

  return first.targetNodeId.localeCompare(second.targetNodeId);
}

function getAiEndgameOriginPreservationRank(content: SimulationContent, nodeId: string): number {
  const node = getNodeById(content, nodeId);

  if (node?.type === "tritium") {
    return 2;
  }

  return node?.type === "shipyard" ? 1 : 0;
}

function applyAiEndgameClosureAction(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  plan: AiEndgameClosurePlan
): GameState {
  if (plan.action.kind === "HOLD") {
    return state;
  }

  if (plan.action.kind === "BURN") {
    return assignPendingBurnOrder(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        originNodeId: plan.action.originNodeId,
        destinationNodeId: plan.action.targetNodeId,
        factionId
      },
      content
    );
  }

  return assignPendingFireOrder(
    state,
    {
      type: "ASSIGN_FIRE_ORDER",
      originNodeId: plan.action.originNodeId,
      targetNodeId: plan.action.targetNodeId,
      factionId
    },
    content
  );
}

function createAiEndgameClosureEvents(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  plan: AiEndgameClosurePlan
): readonly TurnDebugEvent[] {
  const turn = state.turn + 1;
  const action = plan.action.kind === "HOLD" ? "STAY_CONTESTED" : plan.action.kind;
  const escapeSummary =
    plan.escapeCoverage.length === 0
      ? "no affordable public escape"
      : plan.escapeCoverage
          .map((coverage) => {
            return `${getNodeDisplayName(content, coverage.destinationNodeId)} W${coverage.firstWorkTurn} ${coverage.action.kind} ${getNodeDisplayName(content, coverage.action.originNodeId)}@T${coverage.action.effectiveTurn}`;
          })
          .join("; ");
  const actionDescription =
    plan.action.kind === "HOLD"
      ? `hold ${getNodeDisplayName(content, plan.action.targetNodeId)}`
      : `${plan.action.kind} ${getNodeDisplayName(content, plan.action.originNodeId)} -> ${getNodeDisplayName(content, plan.action.targetNodeId)}`;
  const shared = {
    turn,
    nodeId: plan.action.originNodeId,
    factionId,
    action,
    targetFactionId: plan.threat.enemyFactionId,
    targetNodeId: plan.action.targetNodeId,
    expiresTurn: plan.threat.firstWorkTurn,
    amount: plan.escapeCoverage.length,
    reason: "public-contingent-cover-complete",
    expected: escapeSummary,
    ...(plan.action.kind === "BURN"
      ? {
          destinationNodeId: plan.action.targetNodeId,
          burnCost: plan.action.cost,
          burnArrivalTurn: plan.action.effectiveTurn
        }
      : {}),
    ...(plan.action.kind === "FIRE"
      ? {
          missileImpactTurn: plan.action.effectiveTurn
        }
      : {})
  } satisfies Omit<TurnDebugEvent, "type" | "message">;

  return [
    {
      ...shared,
      type: "AI_FORCED_ECONOMIC_MATE_FOUND",
      message: `AI public endgame planner found forced economic mate against ${plan.threat.enemyFactionId}: ${actionDescription} by W${plan.threat.firstWorkTurn}; ${escapeSummary}`
    },
    {
      ...shared,
      type: "AI_ENDGAME_CLOSURE_SELECTED",
      message: `AI endgame closure selected with absolute priority: ${actionDescription}`
    },
    {
      ...shared,
      type: "AI_DECISION",
      message: `AI executes public-information endgame closure: ${actionDescription}`
    }
  ];
}

function planAiTurnForFaction(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  aiPlanningOptions: AiPlanningOptions = {}
): AiFactionTurnPlan {
  let plannedState = state;
  const debugEvents: TurnDebugEvent[] = [];
  const skippedWorkShipKeys = new Set<string>();
  const nextTurn = state.turn + 1;
  const productiveExpansionReads = getAiProductiveExpansionReads(content, plannedState, factionId);
  debugEvents.push(
    ...productiveExpansionReads.flatMap((read) => {
      const events = [
        createAiProductiveExpansionReadEvent(content, plannedState, nextTurn, factionId, read)
      ];

      if (read.antiRunaway) {
        events.push(
          createAiRunawayDetectionAuditEvent(content, plannedState, nextTurn, factionId, read)
        );
      }

      if (nextTurn >= 4 && read.hasGreedyTritiumExpansionThreat) {
        events.push(
          createAiGreedyExpansionDetectedEarlyEvent(
            content,
            plannedState,
            nextTurn,
            factionId,
            read
          )
        );
      }

      if (nextTurn > AI_STRATEGY_READ_TOO_LATE_TURN) {
        events.push(
          createAiStrategyReadTooLateEvent(content, plannedState, nextTurn, factionId, read)
        );
      }

      return events;
    })
  );

  const forcedEndgamePlan = planAiForcedEconomicEndgame(
    plannedState,
    content,
    factionId,
    aiPlanningOptions
  );
  debugEvents.push(...forcedEndgamePlan.debugEvents);

  if (forcedEndgamePlan.handled) {
    return finalizeAiFactionTurnPlan(
      forcedEndgamePlan.state,
      content,
      factionId,
      nextTurn,
      debugEvents,
      skippedWorkShipKeys
    );
  }

  // An existing contested lock creates an unusually reliable FIRE opportunity:
  // the target cannot Evade. Resolve that shared-impact salvo before assigning
  // the supporting ship to a longer economic burn. This is AI sequencing only;
  // it does not alter action costs or turn resolution.
  if (hasFactionContestedPosition(plannedState, factionId)) {
    const lockComboPlan = planAiContestedFireCombos(
      plannedState,
      content,
      factionId,
      nextTurn,
      aiPlanningOptions
    );
    plannedState = lockComboPlan.state;
    debugEvents.push(...lockComboPlan.debugEvents);
  }

  const tritiumFallbackPlan = planAiTritiumFallback(plannedState, content, factionId, nextTurn);
  plannedState = tritiumFallbackPlan.state;
  debugEvents.push(...tritiumFallbackPlan.debugEvents);

  const tryhardPlan = planAiTryhardFactionLayer(
    plannedState,
    content,
    factionId,
    nextTurn,
    aiPlanningOptions
  );
  plannedState = tryhardPlan.state;
  debugEvents.push(...tryhardPlan.debugEvents);

  if (
    getFactionAccessibleTritiumNodeIds(content, plannedState, factionId).length > 0 ||
    !isTritiumFallbackEnabled(content, plannedState, factionId)
  ) {
    const comboPlan = planAiContestedFireCombos(
      plannedState,
      content,
      factionId,
      nextTurn,
      aiPlanningOptions
    );
    plannedState = comboPlan.state;
    debugEvents.push(...comboPlan.debugEvents);
  }

  const previousStrategicIntent = getActiveAiStrategicIntent(plannedState, factionId, nextTurn);
  const activeStrategicIntent =
    previousStrategicIntent !== null &&
    isAiStrategicIntentStillRelevant(plannedState, content, factionId, previousStrategicIntent)
      ? previousStrategicIntent
      : null;

  if (previousStrategicIntent !== null && activeStrategicIntent === null) {
    debugEvents.push(
      createAiStrategicIntentEvent(
        content,
        nextTurn,
        factionId,
        "AI_INTENT_CANCELLED",
        previousStrategicIntent,
        "situation-changed"
      )
    );
  }

  const aiOccupancies = plannedState.nodeOccupancies
    .filter((occupancy) => {
      return occupancy.factionId === factionId && occupancy.shipCount > 0;
    })
    .sort((first, second) =>
      compareAiOccupanciesForPlanning(content, plannedState, factionId, first, second)
    );

  for (const occupancy of aiOccupancies) {
    const currentOccupancy = plannedState.nodeOccupancies.find((candidate) => {
      return (
        candidate.nodeId === occupancy.nodeId &&
        candidate.factionId === factionId &&
        candidate.shipCount > 0
      );
    });

    if (
      currentOccupancy === undefined ||
      hasPendingAction(plannedState, occupancy.nodeId, factionId)
    ) {
      continue;
    }

    const currentNode = getNodeById(content, occupancy.nodeId);

    if (currentNode === undefined) {
      continue;
    }

    if (currentNode.type === "shipyard") {
      const shipyardWorkForecast = getAiActionSolvencyForecast(content, plannedState, factionId, {
        action: "WORK",
        originNodeId: occupancy.nodeId,
        actionCost: 0,
        lostWorkCost: getNodeWorkValue(currentNode)
      });
      debugEvents.push(
        ...createAiActionSolvencyForecastEvents(
          content,
          nextTurn,
          factionId,
          occupancy.nodeId,
          shipyardWorkForecast
        )
      );
    }

    const isContested = isNodeContested(plannedState.nodeOccupancies, occupancy.nodeId);

    const incomingEnemyBurns = getIncomingEnemyBurnsToNode(
      plannedState,
      occupancy.nodeId,
      factionId,
      nextTurn
    );

    if (
      incomingEnemyBurns.length > 0 &&
      getFactionDv(plannedState, factionId) -
        getProjectedFactionContestedUpkeepCost(plannedState, factionId) <
        AI_CONTESTED_EXIT_BUFFER + contestedUpkeepDvCost
    ) {
      debugEvents.push(
        createAiConsideredActionEvent(content, nextTurn, factionId, occupancy.nodeId, "BURN")
      );

      const escapeTarget = getAiBurnTargetSelection(
        plannedState,
        content,
        occupancy.nodeId,
        factionId,
        "escape",
        nextTurn,
        aiPlanningOptions
      );
      debugEvents.push(...escapeTarget.debugEvents);

      if (escapeTarget.nodeId !== null) {
        const nextState = assignPendingBurnOrder(
          plannedState,
          {
            type: "ASSIGN_BURN_ORDER",
            originNodeId: occupancy.nodeId,
            destinationNodeId: escapeTarget.nodeId,
            factionId
          },
          content
        );

        if (nextState !== plannedState) {
          plannedState = nextState;
          const burnOrder = nextState.pendingBurnOrders.find((order) => {
            return order.originNodeId === occupancy.nodeId && order.factionId === factionId;
          });
          debugEvents.push({
            turn: nextTurn,
            type: "AI_DECISION",
            message: `AI avoids incoming contested at ${getNodeDisplayName(content, occupancy.nodeId)} by burning to ${getNodeDisplayName(content, escapeTarget.nodeId)}`,
            nodeId: occupancy.nodeId,
            factionId,
            action: "BURN",
            reason: "incoming-contested:low-dv",
            destinationNodeId: escapeTarget.nodeId,
            ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost })
          });
          continue;
        }
      }

      debugEvents.push(
        createAiRejectedActionEvent(
          content,
          nextTurn,
          factionId,
          occupancy.nodeId,
          "BURN",
          "incoming-contested:no-legal-exit"
        )
      );
    }

    if (isContested) {
      // EVADE is not a legal candidate for a contested ship. Let the existing
      // contested evaluator choose normally between a legal exit and staying.
      const contestedSustainability = getAiContestedSustainabilityCheck(
        content,
        plannedState,
        factionId,
        currentNode
      );
      debugEvents.push(
        createAiContestedSustainabilityCheckEvent(
          content,
          nextTurn,
          factionId,
          occupancy.nodeId,
          contestedSustainability
        )
      );
      const projectedAfterNextUpkeep =
        getProjectedFactionDv(plannedState, factionId, occupancy.nodeId) +
        getExpectedNextTritiumIncome(content, plannedState, factionId) -
        getProjectedFactionContestedUpkeepCost(plannedState, factionId);
      const shouldLeaveContested =
        getFactionDv(plannedState, factionId) <= AI_CRITICAL_DV ||
        projectedAfterNextUpkeep < AI_MIN_DV_RESERVE ||
        !contestedSustainability.sustainable;

      if (shouldLeaveContested) {
        debugEvents.push(
          ...createAiContestedSustainabilityFailureEvents(
            content,
            nextTurn,
            factionId,
            occupancy.nodeId,
            contestedSustainability
          )
        );
        debugEvents.push(
          createAiConsideredActionEvent(
            content,
            nextTurn,
            factionId,
            occupancy.nodeId,
            "LEAVE_CONTESTED"
          )
        );

        const escapeTarget = getAiBurnTargetSelection(
          plannedState,
          content,
          occupancy.nodeId,
          factionId,
          "escape",
          nextTurn,
          aiPlanningOptions
        );
        debugEvents.push(...escapeTarget.debugEvents);

        if (escapeTarget.nodeId !== null) {
          const nextState = assignPendingBurnOrder(
            plannedState,
            {
              type: "ASSIGN_BURN_ORDER",
              originNodeId: occupancy.nodeId,
              destinationNodeId: escapeTarget.nodeId,
              factionId
            },
            content
          );

          if (nextState !== plannedState) {
            plannedState = nextState;
            const burnOrder = nextState.pendingBurnOrders.find((order) => {
              return order.originNodeId === occupancy.nodeId && order.factionId === factionId;
            });
            debugEvents.push(
              ...createAiEvadeExcludedEvents(
                content,
                nextState,
                nextTurn,
                factionId,
                occupancy.nodeId,
                "LEAVE_CONTESTED"
              )
            );
            debugEvents.push({
              turn: nextTurn,
              type: "AI_EARLY_CONTESTED_EXIT",
              message: `AI_EARLY_CONTESTED_EXIT: ${getNodeDisplayName(content, occupancy.nodeId)} exits before the projected ${AI_CONTESTED_SUSTAIN_TURNS}-upkeep solvency failure`,
              nodeId: occupancy.nodeId,
              factionId,
              action: "LEAVE_CONTESTED",
              destinationNodeId: escapeTarget.nodeId,
              ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost }),
              reason: contestedSustainability.reason ?? "projected-contested-insolvency",
              projectedDv: contestedSustainability.projectedDvAfterTwoUpkeeps
            });
            debugEvents.push({
              turn: nextTurn,
              type: "AI_DECISION",
              message: `AI leaving low-ΔV contested ${getNodeDisplayName(content, occupancy.nodeId)} for ${getNodeDisplayName(content, escapeTarget.nodeId)}`,
              nodeId: occupancy.nodeId,
              factionId,
              action: "LEAVE_CONTESTED",
              destinationNodeId: escapeTarget.nodeId,
              ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost })
            });
            continue;
          }
        }

        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            nextTurn,
            factionId,
            occupancy.nodeId,
            "LEAVE_CONTESTED",
            "no-legal-exit"
          )
        );
      }

      const stayLineProjection = getAiStayContestedLineProjection(
        content,
        plannedState,
        factionId,
        currentNode
      );
      debugEvents.push(
        createAiTacticalLineAuditEvent(
          content,
          nextTurn,
          factionId,
          occupancy.nodeId,
          occupancy.nodeId,
          stayLineProjection,
          !shouldLeaveContested && stayLineProjection.accepted,
          shouldLeaveContested ? "stay-contested:no-legal-exit" : stayLineProjection.reason
        )
      );
      debugEvents.push({
        turn: nextTurn,
        type: "AI_DECISION",
        message: `AI stays contested at ${getNodeDisplayName(content, occupancy.nodeId)}`,
        nodeId: occupancy.nodeId,
        factionId,
        action: "STAY_CONTESTED",
        ...(shouldLeaveContested ? { reason: "no-legal-exit" } : {})
      });
      debugEvents.push(
        ...createAiEvadeExcludedEvents(
          content,
          plannedState,
          nextTurn,
          factionId,
          occupancy.nodeId,
          "STAY_CONTESTED"
        )
      );
      continue;
    }

    if (currentNode.type !== "shipyard") {
      const strategicAction = planAiShipyardEmergencyAction(
        plannedState,
        content,
        factionId,
        occupancy.nodeId,
        nextTurn,
        activeStrategicIntent,
        aiPlanningOptions
      );
      debugEvents.push(...strategicAction.debugEvents);

      if (strategicAction.state !== plannedState) {
        plannedState = strategicAction.state;
        continue;
      }
    }

    const productivePressureAction = planAiProductiveExpansionPressureAction(
      plannedState,
      content,
      factionId,
      occupancy.nodeId,
      nextTurn,
      productiveExpansionReads,
      activeStrategicIntent,
      aiPlanningOptions
    );
    debugEvents.push(...productivePressureAction.debugEvents);

    if (productivePressureAction.state !== plannedState) {
      plannedState = productivePressureAction.state;
      continue;
    }

    if (currentNode.type === "tritium" || currentNode.type === "shipyard") {
      if (
        currentNode.type === "shipyard" &&
        shouldHoldShipyardForTritiumRecovery(plannedState, content, factionId)
      ) {
        debugEvents.push({
          turn: nextTurn,
          type: "AI_DECISION",
          message: `AI stays at ${getNodeDisplayName(content, occupancy.nodeId)}; auto-work will occur while recovering tritium`,
          nodeId: occupancy.nodeId,
          factionId,
          reason: "tritium-recovery:staying-auto-work"
        });
        continue;
      }

      const avoidedShipyardCompletionReason =
        currentNode.type === "shipyard"
          ? (getAvoidedShipyardCompletionReason(
              plannedState,
              content,
              occupancy.nodeId,
              factionId
            ) ?? getCriticalShipyardHoldReason(plannedState, content, factionId))
          : null;

      if (avoidedShipyardCompletionReason !== null) {
        debugEvents.push({
          turn: nextTurn,
          type: "AI_DECISION",
          message: `AI considered staying at ${getNodeDisplayName(content, occupancy.nodeId)}; auto-work risks ${avoidedShipyardCompletionReason}`,
          nodeId: occupancy.nodeId,
          factionId,
          reason: avoidedShipyardCompletionReason
        });
        debugEvents.push(
          createAiConsideredActionEvent(content, nextTurn, factionId, occupancy.nodeId, "BURN")
        );

        const launchPreventionBurn = getAiBurnTargetSelection(
          plannedState,
          content,
          occupancy.nodeId,
          factionId,
          "mandatory-launch-prevention",
          nextTurn,
          aiPlanningOptions
        );
        debugEvents.push(...launchPreventionBurn.debugEvents);

        if (launchPreventionBurn.nodeId !== null) {
          const nextState = assignPendingBurnOrder(
            plannedState,
            {
              type: "ASSIGN_BURN_ORDER",
              originNodeId: occupancy.nodeId,
              destinationNodeId: launchPreventionBurn.nodeId,
              factionId
            },
            content
          );

          if (nextState !== plannedState) {
            plannedState = nextState;
            const burnOrder = nextState.pendingBurnOrders.find((order) => {
              return order.originNodeId === occupancy.nodeId && order.factionId === factionId;
            });
            debugEvents.push({
              turn: nextTurn,
              type: "AI_DECISION",
              message: `AI delays shipyard completion by burning from ${getNodeDisplayName(content, occupancy.nodeId)} to ${getNodeDisplayName(content, launchPreventionBurn.nodeId)}`,
              nodeId: occupancy.nodeId,
              factionId,
              action: "BURN",
              reason: avoidedShipyardCompletionReason,
              destinationNodeId: launchPreventionBurn.nodeId,
              ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost })
            });
            continue;
          }
        }

        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            nextTurn,
            factionId,
            occupancy.nodeId,
            "BURN",
            "mandatory-launch:no-safe-delay-burn"
          )
        );
        debugEvents.push(
          createAiConsideredActionEvent(content, nextTurn, factionId, occupancy.nodeId, "FIRE")
        );
        const launchPreventionFire = getAiFireTargetSelection(
          plannedState,
          content,
          occupancy.nodeId,
          factionId,
          nextTurn,
          aiPlanningOptions
        );
        debugEvents.push(...launchPreventionFire.debugEvents);

        if (launchPreventionFire.nodeId !== null) {
          const nextState = assignPendingFireOrder(
            plannedState,
            {
              type: "ASSIGN_FIRE_ORDER",
              originNodeId: occupancy.nodeId,
              targetNodeId: launchPreventionFire.nodeId,
              factionId
            },
            content
          );

          if (nextState !== plannedState) {
            plannedState = nextState;
            debugEvents.push({
              turn: nextTurn,
              type: "AI_DECISION",
              message: `AI avoids auto-work risk by firing from ${getNodeDisplayName(content, occupancy.nodeId)} to ${getNodeDisplayName(content, launchPreventionFire.nodeId)}`,
              nodeId: occupancy.nodeId,
              factionId,
              action: "FIRE",
              reason: avoidedShipyardCompletionReason,
              targetNodeId: launchPreventionFire.nodeId
            });
            continue;
          }
        }

        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            nextTurn,
            factionId,
            occupancy.nodeId,
            "FIRE",
            "mandatory-launch:no-useful-delay-fire"
          )
        );
        debugEvents.push({
          turn: nextTurn,
          type: "AI_DECISION",
          message: `AI found no BURN or FIRE fallback for auto-work risk at ${getNodeDisplayName(content, occupancy.nodeId)}`,
          nodeId: occupancy.nodeId,
          factionId,
          reason: avoidedShipyardCompletionReason
        });
        continue;
      }

      debugEvents.push({
        turn: nextTurn,
        type: "AI_DECISION",
        message: `AI stays at ${getNodeDisplayName(content, occupancy.nodeId)}; auto-work will occur`,
        nodeId: occupancy.nodeId,
        factionId
      });
      continue;
    }

    debugEvents.push(
      createAiConsideredActionEvent(content, nextTurn, factionId, occupancy.nodeId, "BURN")
    );
    const burnTarget = getAiBurnTargetSelection(
      plannedState,
      content,
      occupancy.nodeId,
      factionId,
      "expansion",
      nextTurn,
      aiPlanningOptions
    );
    debugEvents.push(...burnTarget.debugEvents);
    const burnTargetNodeId = burnTarget.nodeId;

    if (burnTargetNodeId !== null) {
      const burnAssignment = tryAssignAiOpeningGatedBurnOrder(
        plannedState,
        content,
        factionId,
        occupancy.nodeId,
        burnTargetNodeId,
        nextTurn
      );
      debugEvents.push(...burnAssignment.debugEvents);
      const nextState = burnAssignment.state;

      if (burnAssignment.assigned) {
        plannedState = nextState;
        const burnOrder = nextState.pendingBurnOrders.find((order) => {
          return order.originNodeId === occupancy.nodeId && order.factionId === factionId;
        });
        const destinationNode = getNodeById(content, burnTargetNodeId);
        const stagingPressureScore =
          destinationNode?.type === "barren"
            ? getAiStagingPressureScore(content, plannedState, burnTargetNodeId, factionId)
            : 0;

        if (destinationNode?.type === "barren" && stagingPressureScore > 0) {
          debugEvents.push({
            turn: nextTurn,
            type: "STAGING_POSITION",
            message: `STAGING_POSITION selected: ${getNodeDisplayName(content, burnTargetNodeId)} threatens multiple productive nodes; score ${stagingPressureScore}`,
            nodeId: occupancy.nodeId,
            factionId,
            action: "BURN",
            destinationNodeId: burnTargetNodeId,
            reason: "threatens multiple enemy productive nodes",
            score: stagingPressureScore,
            ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost })
          });
        }
        debugEvents.push({
          turn: nextTurn,
          type: "AI_DECISION",
          message: `AI Burn from ${getNodeDisplayName(content, occupancy.nodeId)} to ${getNodeDisplayName(content, burnTargetNodeId)}`,
          nodeId: occupancy.nodeId,
          factionId,
          action: "BURN",
          destinationNodeId: burnTargetNodeId,
          ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost })
        });
        continue;
      }
    }

    debugEvents.push(
      createAiConsideredActionEvent(content, nextTurn, factionId, occupancy.nodeId, "FIRE")
    );
    const fireTarget = getAiFireTargetSelection(
      plannedState,
      content,
      occupancy.nodeId,
      factionId,
      nextTurn,
      aiPlanningOptions
    );
    debugEvents.push(...fireTarget.debugEvents);
    const fireTargetNodeId = fireTarget.nodeId;

    if (fireTargetNodeId !== null) {
      const nextState = assignPendingFireOrder(
        plannedState,
        {
          type: "ASSIGN_FIRE_ORDER",
          originNodeId: occupancy.nodeId,
          targetNodeId: fireTargetNodeId,
          factionId
        },
        content
      );

      if (nextState !== plannedState) {
        plannedState = nextState;
        debugEvents.push({
          turn: nextTurn,
          type: "AI_DECISION",
          message: `AI Fire from ${getNodeDisplayName(content, occupancy.nodeId)} to ${getNodeDisplayName(content, fireTargetNodeId)}`,
          nodeId: occupancy.nodeId,
          factionId,
          action: "FIRE",
          targetNodeId: fireTargetNodeId
        });
      }
    }
  }

  return finalizeAiFactionTurnPlan(
    plannedState,
    content,
    factionId,
    nextTurn,
    debugEvents,
    skippedWorkShipKeys
  );
}

function finalizeAiFactionTurnPlan(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  turn: number,
  existingDebugEvents: readonly TurnDebugEvent[],
  existingSkippedWorkShipKeys: ReadonlySet<string>
): AiFactionTurnPlan {
  const debugEvents = [...existingDebugEvents];
  const skippedWorkShipKeys = new Set(existingSkippedWorkShipKeys);

  for (const reserveAudit of getAiShipyardCompletionReserveAudits(state, content, factionId)) {
    if (reserveAudit.launchAffordable) {
      continue;
    }

    skippedWorkShipKeys.add(createNodeFactionKey(reserveAudit.nodeId, factionId));
    debugEvents.push({
      turn,
      type: "AI_DECISION",
      message: `AI suspends WORK at ${getNodeDisplayName(content, reserveAudit.nodeId)} at 4/${shipyardCompletionProgress}; ${reserveAudit.availableDvBeforeLaunch} ΔV remains after committed BURN ${reserveAudit.committedBurnCost}, contested upkeep ${reserveAudit.contestedUpkeepCost}, and EVADE ${reserveAudit.evadeCost}`,
      nodeId: reserveAudit.nodeId,
      factionId,
      action: "WORK",
      reason: "mandatory-launch:reserve-shortfall",
      projectedDv: reserveAudit.availableDvBeforeLaunch,
      amount:
        reserveAudit.committedBurnCost + reserveAudit.contestedUpkeepCost + reserveAudit.evadeCost
    });
  }

  return {
    state,
    debugEvents,
    skippedWorkShipKeys: [...skippedWorkShipKeys]
  };
}

function tryAssignAiOpeningGatedBurnOrder(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  originNodeId: string,
  destinationNodeId: string,
  turn: number
): Readonly<{
  state: GameState;
  debugEvents: readonly TurnDebugEvent[];
  assigned: boolean;
  blockedByOpeningSolvency: boolean;
}> {
  const destinationNode = getNodeById(content, destinationNodeId);
  const plan =
    destinationNode === undefined
      ? null
      : calculateBurnPlan(content, state, originNodeId, destinationNodeId);

  if (destinationNode === undefined || plan === null) {
    return {
      state,
      debugEvents: [],
      assigned: false,
      blockedByOpeningSolvency: false
    };
  }

  const openingSolvencyCheck = getAiOpeningSolvencyReserveCheck(
    content,
    state,
    factionId,
    turn,
    null,
    plan,
    destinationNode
  );
  const debugEvents: TurnDebugEvent[] =
    turn <= AI_OPENING_SOLVENCY_HARD_GATE_END_TURN
      ? [
          createAiSolvencyReserveEvent(
            content,
            turn,
            factionId,
            originNodeId,
            destinationNodeId,
            openingSolvencyCheck
          )
        ]
      : [];

  if (openingSolvencyCheck.reason !== null) {
    debugEvents.push(
      createAiRejectedOpeningBurnEvent(
        content,
        turn,
        factionId,
        originNodeId,
        destinationNodeId,
        openingSolvencyCheck
      ),
      createAiRejectedActionEvent(
        content,
        turn,
        factionId,
        originNodeId,
        "BURN",
        openingSolvencyCheck.reason,
        { destinationNodeId }
      )
    );

    return {
      state,
      debugEvents,
      assigned: false,
      blockedByOpeningSolvency: true
    };
  }

  const nextState = assignPendingBurnOrder(
    state,
    {
      type: "ASSIGN_BURN_ORDER",
      originNodeId,
      destinationNodeId,
      factionId
    },
    content
  );

  return {
    state: nextState,
    debugEvents,
    assigned: nextState !== state,
    blockedByOpeningSolvency: false
  };
}

function getNewPendingBurnOrders(
  snapshot: GameState,
  plannedState: GameState,
  factionId: FactionId
): readonly PendingBurnOrder[] {
  const snapshotOrderIds = new Set(snapshot.pendingBurnOrders.map((order) => order.id));
  return plannedState.pendingBurnOrders.filter((order) => {
    return order.factionId === factionId && !snapshotOrderIds.has(order.id);
  });
}

function getNewPendingFireOrders(
  snapshot: GameState,
  plannedState: GameState,
  factionId: FactionId
): readonly PendingFireOrder[] {
  const snapshotOrderIds = new Set(snapshot.pendingFireOrders.map((order) => order.id));
  return plannedState.pendingFireOrders.filter((order) => {
    return order.factionId === factionId && !snapshotOrderIds.has(order.id);
  });
}

function mergeCollectedOrders(
  existingBurnOrders: readonly PendingBurnOrder[],
  existingFireOrders: readonly PendingFireOrder[],
  newBurnOrders: readonly PendingBurnOrder[],
  newFireOrders: readonly PendingFireOrder[]
): Readonly<{
  pendingBurnOrders: readonly PendingBurnOrder[];
  pendingFireOrders: readonly PendingFireOrder[];
  conflictsDetected: readonly string[];
  conflictResolutionReasons: readonly string[];
}> {
  const pendingBurnOrders = [...existingBurnOrders];
  const pendingFireOrders = [...existingFireOrders];
  const conflictsDetected: string[] = [];
  const conflictResolutionReasons: string[] = [];
  const occupiedActionKeys = new Set(
    [...pendingBurnOrders, ...pendingFireOrders].map((order) =>
      createNodeFactionKey(order.originNodeId, order.factionId)
    )
  );

  for (const order of [...newBurnOrders].sort(comparePendingBurnOrdersNeutral)) {
    const actionKey = createNodeFactionKey(order.originNodeId, order.factionId);

    if (occupiedActionKeys.has(actionKey)) {
      conflictsDetected.push(`duplicate-action:${actionKey}`);
      conflictResolutionReasons.push(`kept-existing-order:${actionKey}`);
      continue;
    }

    occupiedActionKeys.add(actionKey);
    pendingBurnOrders.push(order);
  }

  for (const order of [...newFireOrders].sort(comparePendingFireOrdersNeutral)) {
    const actionKey = createNodeFactionKey(order.originNodeId, order.factionId);

    if (occupiedActionKeys.has(actionKey)) {
      conflictsDetected.push(`duplicate-action:${actionKey}`);
      conflictResolutionReasons.push(`kept-existing-order:${actionKey}`);
      continue;
    }

    occupiedActionKeys.add(actionKey);
    pendingFireOrders.push(order);
  }

  return {
    pendingBurnOrders: sortPendingBurnOrdersNeutral(pendingBurnOrders),
    pendingFireOrders: sortPendingFireOrdersNeutral(pendingFireOrders),
    conflictsDetected,
    conflictResolutionReasons
  };
}

function sortPendingBurnOrdersNeutral(
  orders: readonly PendingBurnOrder[]
): readonly PendingBurnOrder[] {
  return [...orders].sort(comparePendingBurnOrdersNeutral);
}

function sortPendingFireOrdersNeutral(
  orders: readonly PendingFireOrder[]
): readonly PendingFireOrder[] {
  return [...orders].sort(comparePendingFireOrdersNeutral);
}

function sortActiveMissilesNeutral(missiles: readonly ActiveMissile[]): readonly ActiveMissile[] {
  return [...missiles].sort(compareActiveMissilesNeutral);
}

function comparePendingBurnOrdersNeutral(
  first: PendingBurnOrder,
  second: PendingBurnOrder
): number {
  return compareOrderFields(
    [
      first.originNodeId,
      first.destinationNodeId,
      first.arrivalTurn,
      first.burnCost,
      first.shipCount,
      first.id
    ],
    [
      second.originNodeId,
      second.destinationNodeId,
      second.arrivalTurn,
      second.burnCost,
      second.shipCount,
      second.id
    ]
  );
}

function comparePendingFireOrdersNeutral(
  first: PendingFireOrder,
  second: PendingFireOrder
): number {
  return compareOrderFields(
    [
      first.originNodeId,
      first.targetNodeId,
      first.impactTurn,
      first.missileEtaTurns,
      first.targetShipKey,
      first.id
    ],
    [
      second.originNodeId,
      second.targetNodeId,
      second.impactTurn,
      second.missileEtaTurns,
      second.targetShipKey,
      second.id
    ]
  );
}

function compareActiveMissilesNeutral(first: ActiveMissile, second: ActiveMissile): number {
  return compareOrderFields(
    [
      first.originNodeId,
      first.targetNodeId,
      first.impactTurn,
      first.launchedTurn,
      first.targetShipKey,
      first.id
    ],
    [
      second.originNodeId,
      second.targetNodeId,
      second.impactTurn,
      second.launchedTurn,
      second.targetShipKey,
      second.id
    ]
  );
}

function compareOrderFields(
  firstFields: readonly (string | number)[],
  secondFields: readonly (string | number)[]
): number {
  for (let index = 0; index < firstFields.length; index += 1) {
    const firstValue = firstFields[index];
    const secondValue = secondFields[index];

    if (firstValue === secondValue) {
      continue;
    }

    if (typeof firstValue === "number" && typeof secondValue === "number") {
      return firstValue - secondValue;
    }

    return String(firstValue).localeCompare(String(secondValue));
  }

  return 0;
}

function planAiTritiumFallback(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  turn: number
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  const triggerReason = getAiTritiumFallbackTrigger(state, content, factionId, turn);

  if (triggerReason === null) {
    return { state, debugEvents: [] };
  }

  const debugEvents: TurnDebugEvent[] = [
    {
      turn,
      type: "AI_TRITIUM_FALLBACK_TRIGGERED",
      message: `AI tritium fallback triggered: ${triggerReason}`,
      factionId,
      reason: triggerReason
    }
  ];

  if (hasTritiumRecoveryInProgress(state, content, factionId)) {
    debugEvents.push(
      createAiTritiumFallbackRejectedEvent(content, turn, factionId, "recovery-already-in-progress")
    );
    return { state, debugEvents };
  }

  const route = chooseAiTritiumFallbackRoute(state, content, factionId);

  if (route === null) {
    debugEvents.push(
      createAiTritiumFallbackRejectedEvent(content, turn, factionId, "no-affordable-tritium"),
      {
        turn,
        type: "AI_FALLBACK_TOO_LATE_OR_UNAVAILABLE",
        message: `AI_FALLBACK_TOO_LATE_OR_UNAVAILABLE: ${factionId} has no affordable sustainable tritium route after ${triggerReason}`,
        factionId,
        action: "BURN",
        reason: triggerReason
      }
    );
    return { state, debugEvents };
  }

  const routeDestination = getNodeById(content, route.destinationNodeId);
  const routePlan = getLegalBurnPlan(
    content,
    state,
    route.originNodeId,
    route.destinationNodeId,
    factionId
  );

  if (routeDestination !== undefined && routePlan !== null) {
    const fallbackForecast = getAiActionSolvencyForecast(content, state, factionId, {
      action: "BURN",
      originNodeId: route.originNodeId,
      actionCost: route.burnCost,
      destinationNode: routeDestination,
      etaTurns: route.etaTurns,
      losesOriginIncome: true
    });
    debugEvents.push(
      ...createAiActionSolvencyForecastEvents(
        content,
        turn,
        factionId,
        route.originNodeId,
        fallbackForecast,
        { destinationNodeId: route.destinationNodeId }
      )
    );
    const fallbackProjection = getAiBurnTacticalLineProjection(
      content,
      state,
      factionId,
      routeDestination,
      routePlan,
      "expansion",
      0
    );
    debugEvents.push(
      createAiTacticalLineAuditEvent(
        content,
        turn,
        factionId,
        route.originNodeId,
        route.destinationNodeId,
        fallbackProjection,
        true,
        "fallback-tritium"
      )
    );
  }

  const nextState = assignPendingBurnOrder(
    state,
    {
      type: "ASSIGN_BURN_ORDER",
      originNodeId: route.originNodeId,
      destinationNodeId: route.destinationNodeId,
      factionId
    },
    content
  );

  if (nextState === state) {
    debugEvents.push(
      createAiTritiumFallbackRejectedEvent(content, turn, factionId, "assignment-failed", route)
    );
    return { state, debugEvents };
  }

  debugEvents.push({
    turn,
    type: "AI_TRITIUM_FALLBACK_ASSIGNED",
    message: `AI tritium fallback ${getNodeDisplayName(content, route.originNodeId)} -> ${getNodeDisplayName(content, route.destinationNodeId)}${route.reserveOverrideUsed ? " with reserve override" : ""}`,
    nodeId: route.originNodeId,
    originNodeId: route.originNodeId,
    destinationNodeId: route.destinationNodeId,
    targetNodeId: route.destinationNodeId,
    factionId,
    action: "BURN",
    reason: route.reserveOverrideUsed ? "reserve-override" : triggerReason,
    burnCost: route.burnCost,
    projectedDv: getProjectedFactionDv(state, factionId, route.originNodeId) - route.burnCost
  });
  debugEvents.push({
    turn,
    type: "AI_DECISION",
    message: `AI tritium fallback Burn from ${getNodeDisplayName(content, route.originNodeId)} to ${getNodeDisplayName(content, route.destinationNodeId)}`,
    nodeId: route.originNodeId,
    factionId,
    action: "BURN",
    reason: route.reserveOverrideUsed ? "reserve-override" : triggerReason,
    destinationNodeId: route.destinationNodeId,
    burnCost: route.burnCost,
    projectedDv: getProjectedFactionDv(state, factionId, route.originNodeId) - route.burnCost
  });

  return { state: nextState, debugEvents };
}

function getAiTritiumFallbackTrigger(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  turn: number
): string | null {
  if (!isTritiumFallbackEnabled(content, state, factionId)) {
    return null;
  }

  const accessibleTritium = getFactionAccessibleTritiumNodeIds(content, state, factionId);

  if (accessibleTritium.length === 0) {
    return "no-tritium-access";
  }

  if (
    accessibleTritium.length === 1 &&
    shouldHoldLastTritiumForAffordableSingleEvade(state, accessibleTritium[0] ?? "", factionId)
  ) {
    return null;
  }

  const forecastOrigin =
    getAiAvailableActionOrigins(state, content, factionId)[0] ?? accessibleTritium[0];

  if (forecastOrigin !== undefined) {
    const forecast = getAiActionSolvencyForecast(content, state, factionId, {
      action: "WORK",
      originNodeId: forecastOrigin,
      actionCost: 0
    });

    if (forecast.fallbackUnavailable) {
      return "projected-fallback-unavailable";
    }

    if (forecast.projectedInsolvency) {
      return "projected-insolvency-before-reserve-floor";
    }
  }

  const occupiedTritium = getFactionOccupiedTritiumNodeIds(content, state, factionId);

  if (occupiedTritium.length !== 1) {
    return null;
  }

  return getSingleTritiumThreatReason(state, occupiedTritium[0] ?? "", factionId, turn);
}

function shouldHoldLastTritiumForAffordableSingleEvade(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): boolean {
  if (nodeId === "" || isNodeContested(state.nodeOccupancies, nodeId)) {
    return false;
  }

  const incomingMissiles = [...state.pendingFireOrders, ...state.activeMissiles].filter(
    (missile) => {
      return missile.targetFactionId === factionId && missile.targetNodeId === nodeId;
    }
  );
  const availableAfterUpkeep =
    getProjectedFactionDv(state, factionId, nodeId) -
    getProjectedFactionContestedUpkeepCost(state, factionId);

  return incomingMissiles.length === 1 && availableAfterUpkeep >= automaticEvadeDvCost;
}

function getSingleTritiumThreatReason(
  state: GameState,
  nodeId: string,
  factionId: FactionId,
  turn: number
): string | null {
  if (isNodeContested(state.nodeOccupancies, nodeId)) {
    return "tritium-contested";
  }

  if (hasEnemyShipAtNode(state, nodeId, factionId)) {
    return "tritium-enemy-occupied";
  }

  const incomingMissiles = [...state.pendingFireOrders, ...state.activeMissiles].filter(
    (missile) => {
      return missile.targetFactionId === factionId && missile.targetNodeId === nodeId;
    }
  );
  const availableAfterUpkeep =
    getProjectedFactionDv(state, factionId, nodeId) -
    getProjectedFactionContestedUpkeepCost(state, factionId);

  if (incomingMissiles.length === 1 && availableAfterUpkeep >= automaticEvadeDvCost) {
    return null;
  }

  if (incomingMissiles.length > 0) {
    return "tritium-targeted-by-missile";
  }

  if (getIncomingEnemyBurnsToNode(state, nodeId, factionId, turn).length > 0) {
    return "tritium-likely-lost-next-turn";
  }

  return null;
}

function chooseAiTritiumFallbackRoute(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): AiTritiumFallbackRoute | null {
  return (
    content.nodes
      .filter((node) => node.type === "tritium")
      .flatMap((destination) => {
        const targetPriority = getAiTritiumFallbackTargetPriority(state, destination, factionId);

        if (targetPriority === null) {
          return [];
        }

        return state.nodeOccupancies
          .filter((occupancy) => {
            return (
              occupancy.factionId === factionId &&
              occupancy.shipCount > 0 &&
              !hasPendingAction(state, occupancy.nodeId, factionId)
            );
          })
          .map((occupancy) => {
            const plan = getLegalBurnPlan(
              content,
              state,
              occupancy.nodeId,
              destination.id,
              factionId
            );

            if (plan === null) {
              return null;
            }

            const projectedDvAfterBurn =
              getProjectedFactionDv(state, factionId, occupancy.nodeId) - plan.burnCost;
            const projectedDvAfterBurnAndUpkeep =
              projectedDvAfterBurn - getProjectedFactionContestedUpkeepCost(state, factionId);

            if (projectedDvAfterBurnAndUpkeep < 0) {
              return null;
            }

            const rejectionReason = getAiTritiumFallbackRouteRejectionReason(
              state,
              content,
              factionId,
              destination,
              plan,
              projectedDvAfterBurnAndUpkeep
            );

            if (rejectionReason !== null) {
              return null;
            }

            return {
              originNodeId: occupancy.nodeId,
              destinationNodeId: destination.id,
              burnCost: plan.burnCost,
              etaTurns: plan.etaTurns,
              targetPriority,
              originPriority: getAiTritiumFallbackOriginPriority(
                content,
                state,
                occupancy.nodeId,
                factionId
              ),
              reserveOverrideUsed: projectedDvAfterBurnAndUpkeep < AI_MIN_DV_RESERVE
            } satisfies AiTritiumFallbackRoute;
          })
          .filter((route): route is AiTritiumFallbackRoute => route !== null);
      })
      .sort(compareAiTritiumFallbackRoutes)[0] ?? null
  );
}

function getAiTritiumFallbackTargetPriority(
  state: GameState,
  node: SimulationContent["nodes"][number],
  factionId: FactionId
): number | null {
  const hasAnyShip = state.nodeOccupancies.some((occupancy) => {
    return occupancy.nodeId === node.id && occupancy.shipCount > 0;
  });

  if (!hasAnyShip) {
    return 0;
  }

  if (isNodeContested(state.nodeOccupancies, node.id)) {
    return 2;
  }

  if (hasEnemyShipAtNode(state, node.id, factionId)) {
    return 1;
  }

  return null;
}

function getAiTritiumFallbackOriginPriority(
  content: SimulationContent,
  state: GameState,
  originNodeId: string,
  factionId: FactionId
): number {
  const nodeType = getNodeById(content, originNodeId)?.type ?? "barren";
  const occupiedTritium = getFactionOccupiedTritiumNodeIds(content, state, factionId);
  const isOnlyCurrentTritiumShip = nodeType === "tritium" && occupiedTritium.length <= 1;

  if (isOnlyCurrentTritiumShip) {
    return 5;
  }

  if (nodeType === "barren" || nodeType === "protected") {
    return 0;
  }

  if (nodeType === "shipyard") {
    return 1;
  }

  return 2;
}

function compareAiTritiumFallbackRoutes(
  first: AiTritiumFallbackRoute,
  second: AiTritiumFallbackRoute
): number {
  if (first.targetPriority !== second.targetPriority) {
    return first.targetPriority - second.targetPriority;
  }

  if (first.etaTurns !== second.etaTurns) {
    return first.etaTurns - second.etaTurns;
  }

  if (first.burnCost !== second.burnCost) {
    return first.burnCost - second.burnCost;
  }

  if (first.originPriority !== second.originPriority) {
    return first.originPriority - second.originPriority;
  }

  if (first.destinationNodeId !== second.destinationNodeId) {
    return first.destinationNodeId.localeCompare(second.destinationNodeId);
  }

  return first.originNodeId.localeCompare(second.originNodeId);
}

function getAiTritiumFallbackRouteRejectionReason(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  projectedDvAfterBurnAndUpkeep: number
): string | null {
  if (destinationNode.type !== "tritium") {
    return "fallback:not-tritium";
  }

  if (plan.burnCost > getProjectedFactionDv(state, factionId, plan.originNodeId)) {
    return "fallback:cannot-afford-burn";
  }

  const lineProjection = getAiBurnTacticalLineProjection(
    content,
    state,
    factionId,
    destinationNode,
    plan,
    "expansion",
    0
  );

  if (!lineProjection.accepted) {
    return `fallback:${lineProjection.reason}`;
  }

  if (!lineProjection.hasTritiumAccessAfterLine) {
    return "fallback:no-indefinite-tritium";
  }

  if (hasEnemyShipAtNode(state, destinationNode.id, factionId)) {
    return "fallback:target-enemy-occupied";
  }

  if (isNodeContested(state.nodeOccupancies, destinationNode.id)) {
    return "fallback:target-contested";
  }

  const knownThreatSurvival = getAiTritiumNodeKnownThreatSurvival(
    content,
    state,
    factionId,
    destinationNode.id,
    {
      arrivalTurn: plan.arrivalTurn,
      firstWorkTurnOffset: Math.max(1, plan.arrivalTurn - state.turn + 1),
      projectedDvAfterCommitment: projectedDvAfterBurnAndUpkeep,
      excludedIncomeNodeIds: [plan.originNodeId]
    }
  );

  if (!knownThreatSurvival.survivesKnownThreats) {
    return `fallback:known-threat-death:${knownThreatSurvival.reason}`;
  }

  const paybackTurns = Math.ceil(plan.burnCost / tritiumWorkOutput);
  const projectedAfterPayback =
    projectedDvAfterBurnAndUpkeep +
    Math.max(0, AI_TRYHARD_SOLVENCY_HORIZON_TURNS - plan.etaTurns) * tritiumWorkOutput;

  if (paybackTurns > AI_TRYHARD_SOLVENCY_HORIZON_TURNS - plan.etaTurns) {
    return "fallback:no-payback-window";
  }

  if (projectedAfterPayback < AI_MIN_DV_RESERVE) {
    return "fallback:insufficient-payback";
  }

  const easilyContestable = isTritiumFallbackEasilyContestable(
    content,
    state,
    factionId,
    destinationNode.id,
    plan.arrivalTurn
  );
  const hasExit = hasAffordableContestedExitBurn(
    content,
    state,
    factionId,
    destinationNode.id,
    Math.max(0, projectedDvAfterBurnAndUpkeep)
  );

  if (projectedDvAfterBurnAndUpkeep <= 1 && easilyContestable && !hasExit) {
    return "fallback:arrival-contested-risk";
  }

  if (lineProjection.reserveViolation && !canAiAcceptProvenTacticalLine(lineProjection)) {
    return "fallback:reserve-violation-not-forced";
  }

  return null;
}

function isTritiumFallbackEasilyContestable(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNodeId: string,
  arrivalTurn: number
): boolean {
  return getEnemyFactionIds(state, factionId).some((enemyFactionId) => {
    return getAiAvailableActionOrigins(state, content, enemyFactionId).some((originNodeId) => {
      const plan = calculateBurnPlan(content, state, originNodeId, destinationNodeId);

      return (
        plan !== null &&
        plan.arrivalTurn <= arrivalTurn + 2 &&
        plan.burnCost <= getProjectedFactionDv(state, enemyFactionId, originNodeId)
      );
    });
  });
}

function createAiTritiumFallbackRejectedEvent(
  _content: SimulationContent,
  turn: number,
  factionId: FactionId,
  reason: string,
  route?: AiTritiumFallbackRoute
): TurnDebugEvent {
  return {
    turn,
    type: "AI_TRITIUM_FALLBACK_REJECTED",
    message: `AI tritium fallback rejected: ${reason}`,
    factionId,
    reason,
    ...(route === undefined
      ? {}
      : {
          nodeId: route.originNodeId,
          originNodeId: route.originNodeId,
          destinationNodeId: route.destinationNodeId,
          targetNodeId: route.destinationNodeId,
          burnCost: route.burnCost
        })
  };
}

function shouldHoldShipyardForTritiumRecovery(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): boolean {
  return (
    isTritiumFallbackEnabled(content, state, factionId) &&
    getFactionAccessibleTritiumNodeIds(content, state, factionId).length === 0 &&
    (hasTritiumRecoveryInProgress(state, content, factionId) ||
      chooseAiTritiumFallbackRoute(state, content, factionId) !== null)
  );
}

function isTritiumFallbackEnabled(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): boolean {
  const setup =
    factionId === "player" || factionId === "opponent" ? STARTING_SETUP[factionId] : null;

  return (
    (setup !== null && getNodeById(content, setup.tritium) !== undefined) ||
    getFactionOccupiedTritiumNodeIds(content, state, factionId).length > 0 ||
    hasTritiumRecoveryInProgress(state, content, factionId)
  );
}

function hasTritiumRecoveryInProgress(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): boolean {
  return [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
    const destinationNode = getNodeById(content, order.destinationNodeId);

    if (
      order.factionId !== factionId ||
      destinationNode?.type !== "tritium" ||
      hasEnemyShipAtNode(state, order.destinationNodeId, factionId) ||
      isNodeContested(state.nodeOccupancies, order.destinationNodeId) ||
      hasKnownTritiumFallbackThreat(state, factionId, order.destinationNodeId, order.arrivalTurn)
    ) {
      return false;
    }

    const projectedDvAtArrival =
      getProjectedFactionDv(state, factionId, order.originNodeId) - order.burnCost;
    const projectedDvAfterFirstUpkeep = projectedDvAtArrival - contestedUpkeepDvCost;
    const knownThreatSurvival = getAiTritiumNodeKnownThreatSurvival(
      content,
      state,
      factionId,
      order.destinationNodeId,
      {
        arrivalTurn: order.arrivalTurn,
        firstWorkTurnOffset: Math.max(1, order.arrivalTurn - state.turn + 1),
        projectedDvAfterCommitment: projectedDvAtArrival,
        excludedIncomeNodeIds: [order.originNodeId]
      }
    );

    return (
      projectedDvAfterFirstUpkeep >= 0 &&
      knownThreatSurvival.survivesKnownThreats &&
      hasAffordableContestedExitBurn(
        content,
        state,
        factionId,
        order.destinationNodeId,
        projectedDvAfterFirstUpkeep
      )
    );
  });
}

function getAiProductiveExpansionReads(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly AiProductiveExpansionRead[] {
  const ownIncome = getExpectedNextTritiumIncome(content, state, factionId);
  const ownDv = getFactionDv(state, factionId);
  const ownProductiveShipCount = getFactionProductiveShipCount(content, state, factionId);
  const openingPhase = state.turn < 3;
  const earlyDetectPhase = state.turn >= 3;

  return getEnemyFactionIds(state, factionId)
    .map((targetFactionId) => {
      const productiveNodeCount = getFactionOccupiedProductiveNodeIds(
        content,
        state,
        targetFactionId
      ).length;
      const tritiumNodeCount = getFactionAccessibleTritiumNodeIds(
        content,
        state,
        targetFactionId
      ).length;
      const projectedTritiumNodeCount = getAiProjectedSecuredTritiumCount(
        content,
        state,
        targetFactionId,
        state.turn + 2
      );
      const productiveShipCount = getFactionProductiveShipCount(content, state, targetFactionId);
      const stagingShipCount = getFactionStagingShipCount(content, state, targetFactionId);
      const targetIncome = getExpectedNextTritiumIncome(content, state, targetFactionId);
      const incomeLead = targetIncome - ownIncome;
      const dvLead = getFactionDv(state, targetFactionId) - ownDv;
      const advancingShipyards = getFactionAdvancingShipyardCount(content, state, targetFactionId);
      const maxShipyardProgress = getFactionMaxShipyardProgress(content, state, targetFactionId);
      const hasGreedyTritiumExpansionThreat =
        tritiumNodeCount >= 2 ||
        projectedTritiumNodeCount >= 2 ||
        (tritiumNodeCount >= 1 && maxShipyardProgress >= shipyardCompletionProgress - 2) ||
        incomeLead >= tritiumWorkOutput ||
        productiveShipCount > ownProductiveShipCount;
      const reasons: string[] = [];

      if (tritiumNodeCount >= 2) {
        reasons.push("2+ Tritium nodes");
      } else if (projectedTritiumNodeCount >= 2) {
        reasons.push("incoming second Tritium");
      }

      if (tritiumNodeCount >= 1 && maxShipyardProgress >= shipyardCompletionProgress - 2) {
        reasons.push(`Tritium plus shipyard ${maxShipyardProgress}/${shipyardCompletionProgress}`);
      }

      if (productiveNodeCount >= 3) {
        reasons.push("3+ occupied productive nodes");
      }

      if (dvLead >= 5) {
        reasons.push("strong ΔV lead");
      }

      if (incomeLead > 0) {
        reasons.push("income lead");
      }

      if (incomeLead >= tritiumWorkOutput) {
        reasons.push("income lead >= 2 ΔV/turn");
      }

      if (productiveShipCount >= 2) {
        reasons.push("multiple ships on productive nodes");
      }

      if (productiveShipCount > ownProductiveShipCount) {
        reasons.push("more productive workers than AI");
      }

      if (productiveShipCount >= 2 && stagingShipCount === 0) {
        reasons.push("low staging/barren defensive use");
      }

      if (advancingShipyards > 0 && targetIncome > 0) {
        reasons.push("shipyard progress plus tritium income");
      }

      const antiRunaway =
        state.gameMode === "3p" &&
        !openingPhase &&
        productiveNodeCount >= 3 &&
        (dvLead >= 4 || incomeLead >= tritiumWorkOutput || advancingShipyards >= 2);
      const score =
        productiveNodeCount * 2.2 +
        tritiumNodeCount * 2.4 +
        Math.max(0, projectedTritiumNodeCount - tritiumNodeCount) * 2.8 +
        productiveShipCount * 1.1 +
        Math.max(0, dvLead) * 0.35 +
        Math.max(0, incomeLead) * 1.4 +
        advancingShipyards * 1.8 +
        (stagingShipCount === 0 ? 1 : 0) +
        (hasGreedyTritiumExpansionThreat ? 5.2 : 0) +
        (antiRunaway ? 3 : 0);

      return {
        targetFactionId,
        reasons,
        productiveNodeCount,
        productiveShipCount,
        stagingShipCount,
        tritiumNodeCount,
        projectedTritiumNodeCount,
        hasGreedyTritiumExpansionThreat,
        dvLead,
        incomeLead,
        advancingShipyards,
        score,
        antiRunaway
      };
    })
    .filter((read) => {
      return (
        (earlyDetectPhase && read.hasGreedyTritiumExpansionThreat) ||
        read.reasons.length >= 2 ||
        read.productiveNodeCount >= 3 ||
        read.antiRunaway
      );
    })
    .sort((first, second) => second.score - first.score);
}

function createAiProductiveExpansionReadEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  read: AiProductiveExpansionRead
): TurnDebugEvent {
  const firstProductiveNodeId = getFactionOccupiedProductiveNodeIds(
    content,
    state,
    read.targetFactionId
  )[0];

  return {
    turn,
    type: "AI_STRATEGY_READ",
    message: `AI_STRATEGY_READ: enemy greedy productive expansion detected. target ${read.targetFactionId}; tritium ${read.tritiumNodeCount}->${read.projectedTritiumNodeCount}; shipyards advancing ${read.advancingShipyards}; reasons ${read.reasons.join(", ")}`,
    factionId,
    targetFactionId: read.targetFactionId,
    reason: `GREEDY_PRODUCTIVE_EXPANSION: ${read.reasons.join(", ")}`,
    score: read.score,
    ...(firstProductiveNodeId === undefined ? {} : { nodeId: firstProductiveNodeId })
  };
}

function createAiRunawayDetectionAuditEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  read: AiProductiveExpansionRead
): TurnDebugEvent {
  const firstProductiveNodeId = getFactionOccupiedProductiveNodeIds(
    content,
    state,
    read.targetFactionId
  )[0];

  return {
    turn,
    type: "AI_RUNAWAY_DETECTION_AUDIT",
    message: `AI_RUNAWAY_DETECTION_AUDIT: ${factionId} detects ${read.targetFactionId}; productive ${read.productiveNodeCount}; tritium ${read.tritiumNodeCount}->${read.projectedTritiumNodeCount}; ΔV lead ${read.dvLead}; income lead ${read.incomeLead}; shipyards advancing ${read.advancingShipyards}; reasons ${read.reasons.join(", ")}`,
    factionId,
    targetFactionId: read.targetFactionId,
    reason: `ANTI_RUNAWAY_DETECTED: ${read.reasons.join(", ")}`,
    score: read.score,
    projectedDv: read.dvLead,
    amount: read.incomeLead,
    ...(firstProductiveNodeId === undefined ? {} : { nodeId: firstProductiveNodeId })
  };
}

function createAiStrategyReadTooLateEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  read: AiProductiveExpansionRead
): TurnDebugEvent {
  const firstProductiveNodeId = getFactionOccupiedProductiveNodeIds(
    content,
    state,
    read.targetFactionId
  )[0];

  return {
    turn,
    type: "AI_STRATEGY_READ_TOO_LATE",
    message: `AI_STRATEGY_READ_TOO_LATE: greedy expansion by ${read.targetFactionId} first visible to ${factionId} after T${AI_STRATEGY_READ_TOO_LATE_TURN}; tritium ${read.tritiumNodeCount}->${read.projectedTritiumNodeCount}; shipyards advancing ${read.advancingShipyards}`,
    factionId,
    targetFactionId: read.targetFactionId,
    reason: "AI_STRATEGY_READ_TOO_LATE",
    score: read.score,
    ...(firstProductiveNodeId === undefined ? {} : { nodeId: firstProductiveNodeId })
  };
}

function createAiGreedyExpansionDetectedEarlyEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  read: AiProductiveExpansionRead
): TurnDebugEvent {
  const firstProductiveNodeId = getFactionOccupiedProductiveNodeIds(
    content,
    state,
    read.targetFactionId
  )[0];

  return {
    turn,
    type: "AI_GREEDY_EXPANSION_DETECTED_EARLY",
    message: `AI_GREEDY_EXPANSION_DETECTED_EARLY: ${read.targetFactionId}; tritium ${read.tritiumNodeCount}->${read.projectedTritiumNodeCount}; income lead ${read.incomeLead}; productive workers ${read.productiveShipCount}; reasons ${read.reasons.join(", ")}`,
    factionId,
    targetFactionId: read.targetFactionId,
    reason: `EARLY_GREEDY_EXPANSION: ${read.reasons.join(", ")}`,
    score: read.score,
    ...(firstProductiveNodeId === undefined ? {} : { nodeId: firstProductiveNodeId })
  };
}

function canAiSustainAntiRunawayPressure(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): boolean {
  const activeTritium = getFactionAccessibleTritiumNodeIds(content, state, factionId).length;
  const projectedDvAfterCommitments =
    getProjectedFactionDv(state, factionId) -
    getProjectedFactionContestedUpkeepCost(state, factionId);

  if (activeTritium > 0 && projectedDvAfterCommitments >= AI_CRITICAL_DV) {
    return true;
  }

  return hasTritiumRecoveryInProgress(state, content, factionId) && projectedDvAfterCommitments > 0;
}

function createAiAntiRunawayActionAuditEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  read: AiProductiveExpansionRead
): TurnDebugEvent {
  return {
    turn,
    type: "AI_ANTI_RUNAWAY_ACTION_AUDIT",
    message: `AI_ANTI_RUNAWAY_ACTION_AUDIT: ${factionId} can pressure ${read.targetFactionId} from ${getNodeDisplayName(content, originNodeId)}; productive ${read.productiveNodeCount}; tritium ${read.tritiumNodeCount}->${read.projectedTritiumNodeCount}; score ${Math.round(read.score)}`,
    nodeId: originNodeId,
    factionId,
    targetFactionId: read.targetFactionId,
    reason: "anti-runaway:sustainable-pressure-window",
    projectedDv: read.dvLead,
    amount: read.incomeLead,
    score: read.score
  };
}

function planAiProductiveExpansionPressureAction(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  originNodeId: string,
  turn: number,
  reads: readonly AiProductiveExpansionRead[],
  previousIntent: AiStrategicIntent | null,
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [];

  if (reads.length === 0) {
    return { state, debugEvents };
  }

  const hasGreedyTritiumThreat = reads.some((read) => read.hasGreedyTritiumExpansionThreat);

  if (state.turn < 3 && !hasGreedyTritiumThreat) {
    return { state, debugEvents };
  }

  const sustainableReads = reads.filter((read) => {
    return !read.antiRunaway || canAiSustainAntiRunawayPressure(content, state, factionId);
  });

  if (sustainableReads.length < reads.length) {
    debugEvents.push(
      createAiRejectedActionEvent(
        content,
        turn,
        factionId,
        originNodeId,
        "FIRE",
        "anti-runaway:own-economy-cannot-sustain-pressure"
      )
    );
  }

  if (sustainableReads.length === 0) {
    return { state, debugEvents };
  }

  debugEvents.push(
    ...sustainableReads
      .filter((read) => read.antiRunaway)
      .map((read) => {
        return createAiAntiRunawayActionAuditEvent(content, turn, factionId, originNodeId, read);
      })
  );

  const shipyardCompletionLockReason = getAiShipyardCompletionLockBeforePressureReason(
    state,
    content,
    factionId,
    originNodeId,
    turn,
    sustainableReads
  );

  if (shipyardCompletionLockReason !== null) {
    debugEvents.push(
      createAiShipyardCompletionWorkLockEvent(
        content,
        state,
        turn,
        factionId,
        originNodeId,
        shipyardCompletionLockReason
      ),
      createAiRejectedActionEvent(
        content,
        turn,
        factionId,
        originNodeId,
        "BURN",
        shipyardCompletionLockReason
      )
    );
    return { state, debugEvents };
  }

  const mirrorTarget = chooseAiGreedyMirrorTritiumBurnTarget(
    state,
    content,
    originNodeId,
    factionId,
    turn,
    sustainableReads
  );
  debugEvents.push(...mirrorTarget.debugEvents);

  if (mirrorTarget.target !== null) {
    const burnAssignment = tryAssignAiOpeningGatedBurnOrder(
      state,
      content,
      factionId,
      originNodeId,
      mirrorTarget.target.nodeId,
      turn
    );
    debugEvents.push(...burnAssignment.debugEvents);
    const nextState = burnAssignment.state;

    if (burnAssignment.assigned) {
      debugEvents.push(
        {
          turn,
          type: "AI_TRITIUM_RACE_RESPONSE",
          message: `AI mirrors greedy Tritium expansion: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, mirrorTarget.target.nodeId)}; payback ${mirrorTarget.target.expectedDeniedWork} turns; ${mirrorTarget.target.reason}`,
          nodeId: originNodeId,
          factionId,
          action: "BURN",
          destinationNodeId: mirrorTarget.target.nodeId,
          etaTurns: mirrorTarget.target.etaTurns,
          ...(mirrorTarget.target.burnCost === undefined
            ? {}
            : { burnCost: mirrorTarget.target.burnCost }),
          projectedDv: mirrorTarget.target.expectedDvSwing,
          amount: mirrorTarget.target.expectedDeniedWork,
          reason: mirrorTarget.target.reason,
          score: mirrorTarget.target.score
        },
        {
          turn,
          type: "AI_DECISION",
          message: `AI Burn from ${getNodeDisplayName(content, originNodeId)} to mirror second Tritium at ${getNodeDisplayName(content, mirrorTarget.target.nodeId)}`,
          nodeId: originNodeId,
          factionId,
          action: "BURN",
          reason: mirrorTarget.target.reason,
          destinationNodeId: mirrorTarget.target.nodeId,
          etaTurns: mirrorTarget.target.etaTurns,
          ...(mirrorTarget.target.burnCost === undefined
            ? {}
            : { burnCost: mirrorTarget.target.burnCost }),
          projectedDv: mirrorTarget.target.expectedDvSwing
        }
      );
      return { state: nextState, debugEvents };
    }
  }

  const fireTarget = chooseAiEconomicDenialFireTarget(
    state,
    content,
    originNodeId,
    factionId,
    turn,
    sustainableReads,
    aiPlanningOptions
  );
  debugEvents.push(...fireTarget.debugEvents);

  if (
    fireTarget.target !== null &&
    isAiEconomicPressureWorthAction(state, content, originNodeId, fireTarget.target)
  ) {
    const nextState = assignPendingFireOrder(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId,
        targetNodeId: fireTarget.target.nodeId,
        factionId
      },
      content
    );

    if (nextState !== state) {
      const intent = createAiStrategicIntent(
        getAiPressureIntentKind(content, fireTarget.target.nodeId),
        fireTarget.target.nodeId,
        turn,
        fireTarget.target.score,
        fireTarget.target.reason
      );
      debugEvents.push(
        createAiStrategicIntentEvent(
          content,
          turn,
          factionId,
          previousIntent?.targetNodeId === fireTarget.target.nodeId
            ? "AI_INTENT_FOLLOWED"
            : "AI_INTENT_SET",
          intent,
          "productive-pressure"
        ),
        createAiEconomicPressureSelectedEvent(
          content,
          turn,
          factionId,
          originNodeId,
          fireTarget.target,
          "FIRE_ECONOMIC_DENIAL"
        ),
        {
          turn,
          type: "AI_DECISION",
          message: `AI Fire from ${getNodeDisplayName(content, originNodeId)} to deny economy at ${getNodeDisplayName(content, fireTarget.target.nodeId)}`,
          nodeId: originNodeId,
          factionId,
          action: "FIRE",
          reason: fireTarget.target.reason,
          targetNodeId: fireTarget.target.nodeId,
          targetFactionId: fireTarget.target.targetFactionId,
          etaTurns: fireTarget.target.etaTurns,
          projectedDv: fireTarget.target.expectedDvSwing,
          amount: fireTarget.target.expectedDeniedWork
        }
      );
      return { state: nextState, debugEvents };
    }
  }

  const burnTarget = chooseAiProductivePressureBurnTarget(
    state,
    content,
    originNodeId,
    factionId,
    turn,
    sustainableReads
  );
  debugEvents.push(...burnTarget.debugEvents);

  if (burnTarget.target === null) {
    return { state, debugEvents };
  }

  const burnAssignment = tryAssignAiOpeningGatedBurnOrder(
    state,
    content,
    factionId,
    originNodeId,
    burnTarget.target.nodeId,
    turn
  );
  debugEvents.push(...burnAssignment.debugEvents);
  const nextState = burnAssignment.state;

  if (!burnAssignment.assigned) {
    const destinationNode = getNodeById(content, burnTarget.target.nodeId);
    const plan =
      destinationNode === undefined
        ? null
        : calculateBurnPlan(content, state, originNodeId, burnTarget.target.nodeId);
    const guardrailReason =
      destinationNode === undefined || plan === null
        ? null
        : getAiLastTritiumDepartureRejectionReason(
            state,
            content,
            destinationNode,
            plan,
            factionId,
            "expansion"
          );

    if (guardrailReason !== null && !burnAssignment.blockedByOpeningSolvency) {
      debugEvents.push(
        ...createAiBurnGuardrailEventsForRejection(
          content,
          turn,
          factionId,
          originNodeId,
          guardrailReason,
          { destinationNodeId: burnTarget.target.nodeId }
        )
      );
    }

    return { state, debugEvents };
  }

  const intent = createAiStrategicIntent(
    getAiPressureIntentKind(content, burnTarget.target.nodeId),
    burnTarget.target.nodeId,
    turn,
    burnTarget.target.score,
    burnTarget.target.reason
  );
  debugEvents.push(
    createAiStrategicIntentEvent(
      content,
      turn,
      factionId,
      previousIntent?.targetNodeId === burnTarget.target.nodeId
        ? "AI_INTENT_FOLLOWED"
        : "AI_INTENT_SET",
      intent,
      "productive-pressure"
    ),
    createAiEconomicPressureSelectedEvent(
      content,
      turn,
      factionId,
      originNodeId,
      burnTarget.target,
      getNodeById(content, burnTarget.target.nodeId)?.type === "shipyard"
        ? "SHIPYARD_PRESSURE"
        : "PRODUCTIVE_NODE_PRESSURE"
    ),
    {
      turn,
      type: "AI_DECISION",
      message: `AI Burn from ${getNodeDisplayName(content, originNodeId)} to contest productive node ${getNodeDisplayName(content, burnTarget.target.nodeId)}`,
      nodeId: originNodeId,
      factionId,
      action: "BURN",
      reason: burnTarget.target.reason,
      destinationNodeId: burnTarget.target.nodeId,
      targetFactionId: burnTarget.target.targetFactionId,
      etaTurns: burnTarget.target.etaTurns,
      ...(burnTarget.target.burnCost === undefined ? {} : { burnCost: burnTarget.target.burnCost }),
      projectedDv: burnTarget.target.expectedDvSwing,
      amount: burnTarget.target.expectedDeniedWork
    }
  );

  return { state: nextState, debugEvents };
}

function getAiShipyardCompletionLockBeforePressureReason(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  originNodeId: string,
  turn: number,
  reads: readonly AiProductiveExpansionRead[]
): string | null {
  const originNode = getNodeById(content, originNodeId);

  if (originNode?.type !== "shipyard") {
    return null;
  }

  const progress = getShipyardProgress(state.shipyardProgress, originNodeId);

  if (progress < shipyardCompletionProgress - 2) {
    return null;
  }

  if (
    progress >= shipyardCompletionProgress - 1 &&
    !isShipyardThreatenedBeforeCompletion(state, originNodeId, factionId, turn)
  ) {
    return "shipyard-completion-lock";
  }

  const hasDecisivePressureNeed = reads.some((read) => {
    return (
      read.hasGreedyTritiumExpansionThreat ||
      read.antiRunaway ||
      read.advancingShipyards > 1 ||
      read.projectedTritiumNodeCount >= 3
    );
  });

  return hasDecisivePressureNeed ? null : "shipyard-progress:complete-production-before-pressure";
}

function chooseAiGreedyMirrorTritiumBurnTarget(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  factionId: FactionId,
  turn: number,
  reads: readonly AiProductiveExpansionRead[]
): Readonly<{ target: AiEconomicPressureTarget | null; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [];

  if (
    !reads.some((read) => read.hasGreedyTritiumExpansionThreat) ||
    getAiProjectedSecuredTritiumCount(content, state, factionId, turn + 2) >= 2
  ) {
    return { target: null, debugEvents };
  }

  const originNode = getNodeById(content, originNodeId);

  if (originNode === undefined || originNode.type === "tritium") {
    return { target: null, debugEvents };
  }

  const candidates = content.nodes
    .filter((node) => node.type === "tritium")
    .flatMap((node) => {
      if (
        hasFactionShipAtNode(state, node.id, factionId) ||
        hasEnemyShipAtNode(state, node.id, factionId) ||
        isNodeContested(state.nodeOccupancies, node.id)
      ) {
        return [];
      }

      const plan = getLegalBurnPlan(content, state, originNodeId, node.id, factionId);

      if (plan === null) {
        return [];
      }

      const paybackTurns = plan.etaTurns + Math.ceil(plan.burnCost / tritiumWorkOutput);

      if (paybackTurns > AI_GREEDY_MIRROR_PAYBACK_TURNS) {
        return [];
      }

      const rejectionReason = getAiBurnRejectionReason(
        state,
        content,
        node,
        plan,
        factionId,
        "expansion"
      );

      if (rejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "BURN",
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        if (
          hasEnemyShipAtNode(state, node.id, factionId) &&
          (rejectionReason.startsWith("contested-entry") || rejectionReason.startsWith("solvency:"))
        ) {
          const contestedCheck = getAiContestedSustainabilityCheck(
            content,
            state,
            factionId,
            node,
            {
              entryNodeId: node.id,
              excludedIncomeNodeIds: [originNodeId],
              currentDvReserve:
                getProjectedFactionDv(state, factionId, originNodeId) - plan.burnCost
            }
          );
          debugEvents.push(
            createAiRejectedSuicidalContestEvent(
              content,
              turn,
              factionId,
              originNodeId,
              node.id,
              contestedCheck
            )
          );
        }
        debugEvents.push(
          ...createAiBurnGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        return [];
      }

      return [
        {
          nodeId: node.id,
          targetFactionId: factionId,
          score:
            1600 -
            paybackTurns * 120 -
            plan.burnCost * 28 +
            getAiBurnWindowScore(plan) +
            (reads[0]?.score ?? 0) * 8,
          etaTurns: plan.etaTurns,
          burnCost: plan.burnCost,
          reason: `mirror-second-tritium:payback<=${AI_GREEDY_MIRROR_PAYBACK_TURNS}`,
          expectedDvSwing: tritiumWorkOutput * AI_INSOLVENCY_GUARD_HORIZON_TURNS - plan.burnCost,
          expectedDeniedWork: paybackTurns,
          certainty: "PRESSURE_ONLY",
          lastTritiumWorker: false,
          opportunityCost: 0
        } satisfies AiEconomicPressureTarget
      ];
    })
    .sort(compareEnemyTargetOptions);

  return {
    target: candidates[0] ?? null,
    debugEvents
  };
}

function planAiShipyardEmergencyAction(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  originNodeId: string,
  turn: number,
  previousIntent: AiStrategicIntent | null,
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [];

  if (getAiStrategicPosture(content, state, factionId) !== "shipyard-emergency") {
    return { state, debugEvents };
  }

  const originNode = getNodeById(content, originNodeId);

  if (
    originNode?.type === "tritium" &&
    getFactionAccessibleTritiumNodeIds(content, state, factionId).length <= 1
  ) {
    return { state, debugEvents };
  }

  if (getFactionDv(state, factionId) <= AI_CRITICAL_DV) {
    const criticalFireAction = planAiShipyardEmergencyFireAction(
      state,
      content,
      factionId,
      originNodeId,
      turn,
      previousIntent,
      aiPlanningOptions
    );
    debugEvents.push(...criticalFireAction.debugEvents);

    if (criticalFireAction.state !== state) {
      return criticalFireAction;
    }
  }

  const hasRecoveryInProgress = hasShipyardRecoveryInProgress(state, content, factionId);
  const burnTarget = hasRecoveryInProgress
    ? { nodeId: null, score: 0, debugEvents: [] }
    : chooseAiShipyardRecoveryBurnTarget(
        state,
        content,
        originNodeId,
        factionId,
        turn,
        previousIntent
      );

  if (!hasRecoveryInProgress) {
    debugEvents.push(createAiConsideredActionEvent(content, turn, factionId, originNodeId, "BURN"));
    debugEvents.push(...burnTarget.debugEvents);
  }

  if (burnTarget.nodeId !== null) {
    const burnAssignment = tryAssignAiOpeningGatedBurnOrder(
      state,
      content,
      factionId,
      originNodeId,
      burnTarget.nodeId,
      turn
    );
    debugEvents.push(...burnAssignment.debugEvents);
    const nextState = burnAssignment.state;

    if (burnAssignment.assigned) {
      const burnOrder = nextState.pendingBurnOrders.find((order) => {
        return order.originNodeId === originNodeId && order.factionId === factionId;
      });
      const intent = createAiStrategicIntent(
        "recover-shipyard",
        burnTarget.nodeId,
        turn,
        burnTarget.score,
        `recover ${getNodeDisplayName(content, burnTarget.nodeId)} shipyard`
      );
      debugEvents.push(
        createAiStrategicIntentEvent(
          content,
          turn,
          factionId,
          previousIntent?.targetNodeId === burnTarget.nodeId
            ? "AI_INTENT_FOLLOWED"
            : "AI_INTENT_SET",
          intent,
          "shipyard-emergency"
        )
      );
      debugEvents.push({
        turn,
        type: "AI_DECISION",
        message: `AI emergency Burn from ${getNodeDisplayName(content, originNodeId)} to recover ${getNodeDisplayName(content, burnTarget.nodeId)} shipyard`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason: "shipyard-emergency:recover-shipyard",
        destinationNodeId: burnTarget.nodeId,
        ...(burnOrder === undefined ? {} : { burnCost: burnOrder.burnCost })
      });
      return { state: nextState, debugEvents };
    }

    if (!burnAssignment.blockedByOpeningSolvency) {
      debugEvents.push(
        createAiRejectedActionEvent(
          content,
          turn,
          factionId,
          originNodeId,
          "BURN",
          "shipyard-emergency:assignment-failed",
          { destinationNodeId: burnTarget.nodeId }
        )
      );
    }
  }

  return planAiShipyardEmergencyFireAction(
    state,
    content,
    factionId,
    originNodeId,
    turn,
    previousIntent,
    aiPlanningOptions
  );
}

function planAiShipyardEmergencyFireAction(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  originNodeId: string,
  turn: number,
  previousIntent: AiStrategicIntent | null,
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [
    createAiConsideredActionEvent(content, turn, factionId, originNodeId, "FIRE")
  ];
  const fireTarget = getAiFireTargetSelection(
    state,
    content,
    originNodeId,
    factionId,
    turn,
    aiPlanningOptions
  );
  debugEvents.push(...fireTarget.debugEvents);

  if (fireTarget.nodeId === null) {
    return { state, debugEvents };
  }

  const targetNode = getNodeById(content, fireTarget.nodeId);
  const targetFactionId = fireTarget.targetFactionId;
  const pressureReason =
    targetNode === undefined || targetFactionId === undefined
      ? null
      : getAiFirePressureReason(state, content, targetNode, factionId, targetFactionId);

  if (targetNode === undefined || targetFactionId === undefined || pressureReason === null) {
    return { state, debugEvents };
  }

  const nextState = assignPendingFireOrder(
    state,
    {
      type: "ASSIGN_FIRE_ORDER",
      originNodeId,
      targetNodeId: fireTarget.nodeId,
      factionId
    },
    content
  );

  if (nextState === state) {
    debugEvents.push(
      createAiRejectedActionEvent(
        content,
        turn,
        factionId,
        originNodeId,
        "FIRE",
        "shipyard-emergency:assignment-failed",
        { targetNodeId: fireTarget.nodeId }
      )
    );
    return { state, debugEvents };
  }

  const intentKind = getAiFireIntentKind(targetNode, pressureReason);
  const intent = createAiStrategicIntent(
    intentKind,
    fireTarget.nodeId,
    turn,
    getAiFireTargetScore(state, content, targetNode, factionId, targetFactionId),
    pressureReason
  );
  const economicRead = getAiProductiveExpansionReads(content, state, factionId).find((read) => {
    return read.targetFactionId === targetFactionId;
  });
  const firePlan = calculateFirePlan(content, state, originNodeId, fireTarget.nodeId);
  const economicPressureEvent =
    economicRead === undefined || firePlan === null || !isProductiveNode(targetNode)
      ? []
      : [
          createAiEconomicPressureSelectedEvent(
            content,
            turn,
            factionId,
            originNodeId,
            getAiEconomicPressureTarget(
              state,
              content,
              targetNode,
              factionId,
              targetFactionId,
              economicRead,
              originNodeId,
              "FIRE",
              firePlan.missileEtaTurns
            ),
            "FIRE_ECONOMIC_DENIAL"
          )
        ];
  debugEvents.push(
    createAiStrategicIntentEvent(
      content,
      turn,
      factionId,
      previousIntent?.targetNodeId === fireTarget.nodeId ? "AI_INTENT_FOLLOWED" : "AI_INTENT_SET",
      intent,
      "shipyard-emergency"
    )
  );
  debugEvents.push(...economicPressureEvent, {
    turn,
    type: "AI_DECISION",
    message: `AI emergency Fire from ${getNodeDisplayName(content, originNodeId)} to pressure ${getNodeDisplayName(content, fireTarget.nodeId)}`,
    nodeId: originNodeId,
    factionId,
    action: "FIRE",
    reason: `shipyard-emergency:${pressureReason}`,
    targetNodeId: fireTarget.nodeId
  });

  return { state: nextState, debugEvents };
}

function chooseAiShipyardRecoveryBurnTarget(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  factionId: FactionId,
  turn: number,
  previousIntent: AiStrategicIntent | null
): Readonly<{
  nodeId: string | null;
  score: number;
  debugEvents: readonly TurnDebugEvent[];
}> {
  const debugEvents: TurnDebugEvent[] = [];
  const candidates = content.nodes
    .filter((node) => {
      return (
        node.id !== originNodeId &&
        node.type === "shipyard" &&
        node.contestable &&
        !node.protectedNoWar &&
        !isFactionControllingNode(state, node.id, factionId)
      );
    })
    .map((node) => {
      const plan = getLegalBurnPlan(content, state, originNodeId, node.id, factionId);

      if (plan === null) {
        return null;
      }

      const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
        action: "BURN",
        originNodeId,
        actionCost: plan.burnCost,
        destinationNode: node,
        etaTurns: plan.etaTurns,
        entryNodeId: hasEnemyShipAtNode(state, node.id, factionId) ? node.id : null,
        losesOriginIncome: true
      });
      debugEvents.push(
        ...createAiActionSolvencyForecastEvents(
          content,
          turn,
          factionId,
          originNodeId,
          actionForecast,
          { destinationNodeId: node.id }
        )
      );

      const contestedCheckEvent = createAiContestedEntryCheckEvent(
        content,
        state,
        turn,
        factionId,
        originNodeId,
        node,
        plan
      );

      if (contestedCheckEvent !== null) {
        debugEvents.push(contestedCheckEvent);
      }

      const rejectionReason = getAiBurnRejectionReason(
        state,
        content,
        node,
        plan,
        factionId,
        "shipyard-recovery"
      );

      if (rejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "BURN",
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        if (
          hasEnemyShipAtNode(state, node.id, factionId) &&
          (rejectionReason.startsWith("contested-entry") || rejectionReason.startsWith("solvency:"))
        ) {
          const contestedCheck = getAiContestedSustainabilityCheck(
            content,
            state,
            factionId,
            node,
            {
              entryNodeId: node.id,
              excludedIncomeNodeIds: [originNodeId],
              currentDvReserve:
                getProjectedFactionDv(state, factionId, originNodeId) - plan.burnCost
            }
          );
          debugEvents.push(
            createAiRejectedSuicidalContestEvent(
              content,
              turn,
              factionId,
              originNodeId,
              node.id,
              contestedCheck
            )
          );
        }
        debugEvents.push(
          ...createAiBurnGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        return null;
      }

      return {
        nodeId: node.id,
        score: getAiShipyardRecoveryTargetScore(state, node, factionId, previousIntent),
        etaTurns: plan.etaTurns,
        burnCost: plan.burnCost
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort(compareEnemyTargetOptions);

  const best = candidates[0];

  return {
    nodeId: best?.nodeId ?? null,
    score: best?.score ?? 0,
    debugEvents
  };
}

function getAiShipyardRecoveryTargetScore(
  state: GameState,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  previousIntent: AiStrategicIntent | null
): number {
  const isNeutral = !state.nodeOccupancies.some((occupancy) => {
    return occupancy.nodeId === node.id && occupancy.shipCount > 0;
  });
  const enemyPressure = hasEnemyShipAtNode(state, node.id, factionId) ? 500 : 0;
  const contestedSupport =
    isNodeContested(state.nodeOccupancies, node.id) &&
    hasFactionShipAtNode(state, node.id, factionId)
      ? 420
      : 0;
  const progress = getShipyardProgress(state.shipyardProgress, node.id);
  const memoryBonus = previousIntent?.targetNodeId === node.id ? 900 : 0;

  return (
    1200 + memoryBonus + (isNeutral ? 260 : 0) + enemyPressure + contestedSupport + progress * 70
  );
}

function hasShipyardRecoveryInProgress(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): boolean {
  return [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
    return (
      order.factionId === factionId &&
      getNodeById(content, order.destinationNodeId)?.type === "shipyard"
    );
  });
}

function getAiStrategicPosture(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): AiStrategicPosture {
  const controlledShipyards = getFactionControlledShipyardNodeIds(content, state, factionId).length;

  if (controlledShipyards === 0) {
    return "shipyard-emergency";
  }

  const enemyControlledShipyards = getEnemyFactionIds(state, factionId)
    .map(
      (enemyFactionId) => getFactionControlledShipyardNodeIds(content, state, enemyFactionId).length
    )
    .reduce((highest, count) => Math.max(highest, count), 0);
  const tritiumAccess = getFactionAccessibleTritiumNodeIds(content, state, factionId).length;

  return enemyControlledShipyards > controlledShipyards || tritiumAccess === 0
    ? "behind"
    : "stable";
}

function getFactionControlledShipyardNodeIds(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly string[] {
  return content.nodes
    .filter((node) => {
      return node.type === "shipyard" && isFactionControllingNode(state, node.id, factionId);
    })
    .map((node) => node.id);
}

function isFactionControllingNode(state: GameState, nodeId: string, factionId: FactionId): boolean {
  return (
    hasFactionShipAtNode(state, nodeId, factionId) &&
    !isNodeContested(state.nodeOccupancies, nodeId) &&
    !hasPendingAction(state, nodeId, factionId)
  );
}

function getAiStrategicReserveFloor(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  node: SimulationContent["nodes"][number],
  purpose: AiBurnPurpose
): number {
  const posture = getAiStrategicPosture(content, state, factionId);
  const isShipyardRecovery =
    node.type === "shipyard" &&
    (purpose === "shipyard-recovery" || posture === "shipyard-emergency");

  if (posture === "shipyard-emergency" && isShipyardRecovery) {
    return 0;
  }

  if (posture === "behind" && isShipyardRecovery) {
    return Math.max(2, AI_MIN_DV_RESERVE - 2);
  }

  return AI_MIN_DV_RESERVE;
}

function canAiAcceptCriticalDvForAction(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  node: SimulationContent["nodes"][number],
  purpose: AiBurnPurpose
): boolean {
  const posture = getAiStrategicPosture(content, state, factionId);

  return (
    node.type === "shipyard" &&
    (purpose === "shipyard-recovery" || posture === "shipyard-emergency")
  );
}

function createAiStrategicIntent(
  kind: AiStrategicIntentKind,
  targetNodeId: string,
  turn: number,
  score: number,
  reason: string
): AiStrategicIntent {
  return {
    kind,
    targetNodeId,
    expiresTurn: turn + 2,
    score,
    reason
  };
}

function getActiveAiStrategicIntent(
  state: GameState,
  factionId: FactionId,
  turn: number
): AiStrategicIntent | null {
  const event = [...state.debugEvents].reverse().find((candidate) => {
    return (
      candidate.factionId === factionId &&
      (candidate.type === "AI_INTENT_SET" || candidate.type === "AI_INTENT_FOLLOWED") &&
      candidate.targetNodeId !== undefined &&
      candidate.intentKind !== undefined &&
      candidate.expiresTurn !== undefined &&
      candidate.expiresTurn >= turn &&
      isAiStrategicIntentKind(candidate.intentKind)
    );
  });

  if (
    event === undefined ||
    event.targetNodeId === undefined ||
    event.expiresTurn === undefined ||
    event.intentKind === undefined ||
    !isAiStrategicIntentKind(event.intentKind)
  ) {
    return null;
  }

  return {
    kind: event.intentKind,
    targetNodeId: event.targetNodeId,
    expiresTurn: event.expiresTurn,
    score: event.score ?? 0,
    reason: event.reason ?? "remembered-intent"
  };
}

function isAiStrategicIntentKind(value: string): value is AiStrategicIntentKind {
  return (
    value === "recover-shipyard" ||
    value === "pressure-shipyard" ||
    value === "support-contested" ||
    value === "deny-tritium" ||
    value === "get-second-tritium" ||
    value === "counter-second-tritium"
  );
}

function isAiStrategicIntentStillRelevant(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  intent: AiStrategicIntent
): boolean {
  const targetNode = getNodeById(content, intent.targetNodeId);

  if (targetNode === undefined) {
    return false;
  }

  switch (intent.kind) {
    case "recover-shipyard":
    case "pressure-shipyard":
      return (
        targetNode.type === "shipyard" && !isFactionControllingNode(state, targetNode.id, factionId)
      );
    case "support-contested":
      return (
        isNodeContested(state.nodeOccupancies, targetNode.id) &&
        hasFactionShipAtNode(state, targetNode.id, factionId)
      );
    case "deny-tritium":
      return targetNode.type === "tritium" && hasEnemyShipAtNode(state, targetNode.id, factionId);
    case "get-second-tritium":
      return (
        targetNode.type === "tritium" &&
        getAiProjectedSecuredTritiumCount(content, state, factionId, state.turn + 2) < 2
      );
    case "counter-second-tritium":
      return targetNode.type === "tritium" && hasEnemyShipAtNode(state, targetNode.id, factionId);
  }
}

function createAiStrategicIntentEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  type: "AI_INTENT_SET" | "AI_INTENT_FOLLOWED" | "AI_INTENT_CANCELLED",
  intent: AiStrategicIntent,
  reason: string
): TurnDebugEvent {
  const verb =
    type === "AI_INTENT_SET" ? "sets" : type === "AI_INTENT_FOLLOWED" ? "follows" : "cancels";

  return {
    turn,
    type,
    message: `AI ${verb} intent ${intent.kind} at ${getNodeDisplayName(content, intent.targetNodeId)}: ${reason}`,
    factionId,
    targetNodeId: intent.targetNodeId,
    intentKind: intent.kind,
    expiresTurn: intent.expiresTurn,
    score: intent.score,
    reason
  };
}

function getAiFireIntentKind(
  node: SimulationContent["nodes"][number],
  pressureReason: string
): AiStrategicIntentKind {
  if (pressureReason.includes("support-contested")) {
    return "support-contested";
  }

  if (node.type === "tritium") {
    return "deny-tritium";
  }

  return "pressure-shipyard";
}

function planAiContestedFireCombos(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  turn: number,
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{ state: GameState; debugEvents: readonly TurnDebugEvent[] }> {
  let plannedState = state;
  const debugEvents: TurnDebugEvent[] = [];
  const targets = content.nodes
    .filter((node) => {
      return (
        hasEnemyShipAtNode(plannedState, node.id, factionId) &&
        (node.type === "tritium" || node.type === "shipyard")
      );
    })
    .sort(compareAiComboTargets(plannedState));

  for (const target of targets) {
    debugEvents.push(createAiComboConsideredEvent(content, turn, factionId, target.id));
    const combo = chooseAiContestedFireCombo(plannedState, content, factionId, target.id);

    if (typeof combo === "string") {
      debugEvents.push(createAiComboRejectedEvent(content, turn, factionId, target.id, combo));
      continue;
    }

    debugEvents.push({
      turn,
      type: "AI_KILLBOX_CANDIDATE",
      message: combo.requiresBurn
        ? `AI_KILLBOX_CANDIDATE: contest ${getNodeDisplayName(content, combo.contestingNodeId)} -> ${getNodeDisplayName(content, combo.targetNodeId)} before FIRE impact from ${getNodeDisplayName(content, combo.firingNodeId)}`
        : `AI_KILLBOX_CANDIDATE: existing contested lock at ${getNodeDisplayName(content, combo.targetNodeId)} with FIRE from ${getNodeDisplayName(content, combo.firingNodeId)}`,
      nodeId: combo.contestingNodeId,
      originNodeId: combo.contestingNodeId,
      firingNodeId: combo.firingNodeId,
      destinationNodeId: combo.targetNodeId,
      targetNodeId: combo.targetNodeId,
      targetFactionId: combo.targetFactionId,
      factionId,
      action: "FIRE",
      burnCost: combo.burnCost,
      burnArrivalTurn: combo.burnArrivalTurn,
      missileImpactTurn: combo.missileImpactTurn,
      evadeBlocked: combo.burnArrivalTurn <= combo.missileImpactTurn,
      projectedDv: combo.projectedDvAfterBurnAndUpkeep,
      reason: combo.requiresBurn ? "new-contested-lock" : "existing-contested-lock"
    });

    const firePlan = calculateFirePlan(
      content,
      plannedState,
      combo.firingNodeId,
      combo.targetNodeId
    );

    if (firePlan !== null) {
      const fireForecast = getAiActionSolvencyForecast(content, plannedState, factionId, {
        action: "FIRE",
        originNodeId: combo.firingNodeId,
        actionCost: 0,
        destinationNode: target,
        etaTurns: firePlan.missileEtaTurns,
        lostWorkCost: getAiFireOpportunityCost(content, plannedState, factionId, combo.firingNodeId)
      });
      debugEvents.push(
        ...createAiActionSolvencyForecastEvents(
          content,
          turn,
          factionId,
          combo.firingNodeId,
          fireForecast,
          { targetNodeId: combo.targetNodeId }
        )
      );
    }

    if (combo.requiresBurn) {
      const burnPlan = getLegalBurnPlan(
        content,
        plannedState,
        combo.contestingNodeId,
        combo.targetNodeId,
        factionId
      );

      if (burnPlan !== null) {
        const burnForecast = getAiActionSolvencyForecast(content, plannedState, factionId, {
          action: "BURN",
          originNodeId: combo.contestingNodeId,
          actionCost: burnPlan.burnCost,
          destinationNode: target,
          etaTurns: burnPlan.etaTurns,
          entryNodeId: combo.targetNodeId,
          losesOriginIncome: true
        });
        debugEvents.push(
          ...createAiActionSolvencyForecastEvents(
            content,
            turn,
            factionId,
            combo.contestingNodeId,
            burnForecast,
            { destinationNodeId: combo.targetNodeId }
          )
        );
      }
    }

    const alphaStrikeDecision = isSimplifiedAiPlanning(aiPlanningOptions)
      ? null
      : getAiAlphaStrikeThreatDecision(plannedState, content, factionId, combo, turn);
    const noFireRequiresAlphaStrike =
      getAiStrategyProfile(aiPlanningOptions, factionId) === "NOFIRE" &&
      alphaStrikeDecision === null;

    if (noFireRequiresAlphaStrike) {
      debugEvents.push(
        createAiComboRejectedEvent(
          content,
          turn,
          factionId,
          combo.targetNodeId,
          "firevsai:nofire-alpha-strike-only",
          combo
        )
      );
      continue;
    }

    if (alphaStrikeDecision !== null) {
      debugEvents.push(
        createAlphaStrikeThreatEvent(
          content,
          turn,
          factionId,
          combo,
          alphaStrikeDecision.decision,
          alphaStrikeDecision.reason
        )
      );

      if (alphaStrikeDecision.decision !== "executed") {
        debugEvents.push(
          createAiComboRejectedEvent(
            content,
            turn,
            factionId,
            combo.targetNodeId,
            alphaStrikeDecision.reason,
            combo
          )
        );
        continue;
      }
    }

    const burnAssignment = combo.requiresBurn
      ? tryAssignAiOpeningGatedBurnOrder(
          plannedState,
          content,
          factionId,
          combo.contestingNodeId,
          combo.targetNodeId,
          turn
        )
      : {
          state: plannedState,
          debugEvents: [],
          assigned: true,
          blockedByOpeningSolvency: false
        };
    debugEvents.push(...burnAssignment.debugEvents);
    const burnState = burnAssignment.state;

    if (combo.requiresBurn && !burnAssignment.assigned) {
      debugEvents.push(
        createAiComboRejectedEvent(
          content,
          turn,
          factionId,
          combo.targetNodeId,
          burnAssignment.blockedByOpeningSolvency
            ? "opening-solvency-hard-gate"
            : "assignment-failed",
          combo
        )
      );
      continue;
    }

    const fireState = assignPendingFireOrder(
      burnState,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: combo.firingNodeId,
        targetNodeId: combo.targetNodeId,
        factionId
      },
      content
    );

    if (fireState === burnState) {
      debugEvents.push(
        createAiComboRejectedEvent(
          content,
          turn,
          factionId,
          combo.targetNodeId,
          "fire-assignment-failed",
          combo
        )
      );
      continue;
    }

    plannedState = fireState;
    debugEvents.push({
      turn,
      type: "AI_COMBO_EXECUTED",
      message: combo.requiresBurn
        ? `AI contested+FIRE combo ${getNodeDisplayName(content, combo.contestingNodeId)} -> ${getNodeDisplayName(content, combo.targetNodeId)} with FIRE from ${getNodeDisplayName(content, combo.firingNodeId)}; projected ΔV ${combo.projectedDvAfterBurnAndUpkeep}`
        : `AI contested+FIRE combo uses existing contested lock at ${getNodeDisplayName(content, combo.targetNodeId)} with FIRE from ${getNodeDisplayName(content, combo.firingNodeId)}; projected ΔV ${combo.projectedDvAfterBurnAndUpkeep}`,
      nodeId: combo.contestingNodeId,
      originNodeId: combo.contestingNodeId,
      firingNodeId: combo.firingNodeId,
      destinationNodeId: combo.targetNodeId,
      targetNodeId: combo.targetNodeId,
      targetFactionId: combo.targetFactionId,
      factionId,
      burnCost: combo.burnCost,
      burnArrivalTurn: combo.burnArrivalTurn,
      missileImpactTurn: combo.missileImpactTurn,
      evadeBlocked: combo.burnArrivalTurn <= combo.missileImpactTurn,
      projectedDv: combo.projectedDvAfterBurnAndUpkeep,
      reason: combo.requiresBurn ? "new-contested-lock" : "existing-contested-lock"
    });
    debugEvents.push({
      turn,
      type: "AI_KILLBOX_SELECTED",
      message: `AI_KILLBOX_SELECTED: ${getNodeDisplayName(content, combo.targetNodeId)} loses Evade if contested at impact T${combo.missileImpactTurn}`,
      nodeId: combo.contestingNodeId,
      originNodeId: combo.contestingNodeId,
      firingNodeId: combo.firingNodeId,
      destinationNodeId: combo.targetNodeId,
      targetNodeId: combo.targetNodeId,
      targetFactionId: combo.targetFactionId,
      factionId,
      action: "FIRE",
      burnCost: combo.burnCost,
      burnArrivalTurn: combo.burnArrivalTurn,
      missileImpactTurn: combo.missileImpactTurn,
      evadeBlocked: combo.burnArrivalTurn <= combo.missileImpactTurn,
      projectedDv: combo.projectedDvAfterBurnAndUpkeep,
      reason: combo.requiresBurn ? "new-contested-lock" : "existing-contested-lock"
    });
  }

  return {
    state: plannedState,
    debugEvents
  };
}

function chooseAiContestedFireCombo(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  targetNodeId: string
): AiContestedFireCombo | string {
  const targetNode = getNodeById(content, targetNodeId);

  if (targetNode === undefined) {
    return "unknown-target";
  }

  if (targetNode.type === "barren" || targetNode.type === "protected") {
    return "target-low-value-barren";
  }

  const targetFactionId = getPrimaryEnemyFactionAtNode(state, targetNodeId, factionId);

  if (targetFactionId === null) {
    return "no-target-ship";
  }

  const actionOrigins = getAiAvailableActionOrigins(state, content, factionId);
  const hasExistingContestedLock =
    isNodeContested(state.nodeOccupancies, targetNodeId) &&
    hasFactionShipAtNode(state, targetNodeId, factionId);
  const canRiskCriticalDv =
    hasExistingContestedLock ||
    (targetNode.type === "shipyard" &&
      getAiStrategicPosture(content, state, factionId) === "shipyard-emergency");

  if (getFactionDv(state, factionId) <= AI_CRITICAL_DV && !canRiskCriticalDv) {
    return "critical-dv";
  }

  if (!hasExistingContestedLock && actionOrigins.length < 2) {
    return "no-separate-ships";
  }

  if (hasExistingContestedLock) {
    for (const firingNodeId of actionOrigins) {
      const firePlan = calculateFirePlan(content, state, firingNodeId, targetNodeId);

      if (firePlan === null) {
        continue;
      }

      return {
        targetNodeId,
        targetFactionId,
        contestingNodeId: targetNodeId,
        firingNodeId,
        requiresBurn: false,
        burnCost: 0,
        burnArrivalTurn: state.turn,
        missileImpactTurn: firePlan.impactTurn,
        projectedDvAfterBurnAndUpkeep:
          getProjectedFactionDv(state, factionId, firingNodeId) -
          getProjectedFactionContestedUpkeepCost(state, factionId)
      };
    }

    return "no-separate-firing-ship";
  }

  let bestTimingRejection: string | null = null;
  let bestEconomyRejection: string | null = null;
  let sawBurnCandidate = false;
  let sawFireCandidate = false;

  for (const contestingNodeId of actionOrigins) {
    const burnPlan = getLegalBurnPlan(content, state, contestingNodeId, targetNodeId, factionId);

    if (burnPlan === null) {
      continue;
    }

    sawBurnCandidate = true;

    for (const firingNodeId of actionOrigins) {
      if (firingNodeId === contestingNodeId) {
        continue;
      }

      const firePlan = calculateFirePlan(content, state, firingNodeId, targetNodeId);

      if (firePlan === null) {
        continue;
      }

      sawFireCandidate = true;

      if (burnPlan.arrivalTurn >= firePlan.impactTurn) {
        bestTimingRejection = "trap-timing";
        continue;
      }

      const shouldDeferEconomyToOpeningAlphaAudit =
        state.turn + 1 <= 2 &&
        isOpeningProductiveDecapitationTarget(state, targetNode, targetFactionId);
      const economyCheck = shouldDeferEconomyToOpeningAlphaAudit
        ? {
            reason: null,
            projectedDvAfterBurnAndUpkeep:
              getProjectedFactionDv(state, factionId, contestingNodeId) - burnPlan.burnCost
          }
        : getAiVoluntaryContestedEntryEconomy(
            state,
            content,
            targetNode,
            burnPlan,
            factionId,
            [contestingNodeId, firingNodeId],
            targetNode.type === "shipyard" ? "shipyard-recovery" : "expansion"
          );

      if (economyCheck.reason !== null) {
        bestEconomyRejection = economyCheck.reason;
        continue;
      }

      return {
        targetNodeId,
        targetFactionId,
        contestingNodeId,
        firingNodeId,
        requiresBurn: true,
        burnCost: burnPlan.burnCost,
        burnArrivalTurn: burnPlan.arrivalTurn,
        missileImpactTurn: firePlan.impactTurn,
        projectedDvAfterBurnAndUpkeep: economyCheck.projectedDvAfterBurnAndUpkeep
      };
    }
  }

  if (!sawBurnCandidate) {
    return "no-contesting-ship";
  }

  if (!sawFireCandidate) {
    return "no-separate-firing-ship";
  }

  return bestEconomyRejection ?? bestTimingRejection ?? "no-pressure-value";
}

function getAiAvailableActionOrigins(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): readonly string[] {
  return state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        !hasPendingAction(state, occupancy.nodeId, factionId) &&
        !isNodeContested(state.nodeOccupancies, occupancy.nodeId) &&
        getIncomingActiveMissiles(state, occupancy.nodeId, factionId).length === 0 &&
        getNodeById(content, occupancy.nodeId) !== undefined
      );
    })
    .map((occupancy) => occupancy.nodeId)
    .sort();
}

function compareAiComboTargets(state: GameState) {
  return (
    first: SimulationContent["nodes"][number],
    second: SimulationContent["nodes"][number]
  ): number => {
    const firstScore = getAiComboTargetScore(state, first);
    const secondScore = getAiComboTargetScore(state, second);

    if (firstScore !== secondScore) {
      return secondScore - firstScore;
    }

    return first.id.localeCompare(second.id);
  };
}

function getAiComboTargetScore(state: GameState, node: SimulationContent["nodes"][number]): number {
  if (node.type === "tritium") {
    return 1000;
  }

  if (node.type === "shipyard") {
    const progress = getShipyardProgress(state.shipyardProgress, node.id);
    return progress >= shipyardCompletionProgress - 1 ? 850 + progress : 600 + progress;
  }

  return 0;
}

function getAiAlphaStrikeThreatDecision(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  combo: AiContestedFireCombo,
  turn: number
): Readonly<{ decision: "executed" | "rejected" | "delayed"; reason: string }> | null {
  const targetNode = getNodeById(content, combo.targetNodeId);

  if (targetNode === undefined || !isAlphaStrikeThreatNode(targetNode, combo)) {
    return null;
  }

  if (
    turn <= 2 &&
    combo.requiresBurn &&
    getAiStrategicPosture(content, state, factionId) !== "shipyard-emergency" &&
    isOpeningProductiveDecapitationTarget(state, targetNode, combo.targetFactionId)
  ) {
    return {
      decision: "delayed",
      reason: "opening-alpha-strike-delayed"
    };
  }

  if (
    turn <= 2 &&
    combo.requiresBurn &&
    hasOtherEnemyOpeningPressureOnTarget(
      state,
      combo.targetNodeId,
      factionId,
      combo.targetFactionId
    )
  ) {
    return {
      decision: "delayed",
      reason: "opening-dogpile-delayed"
    };
  }

  return {
    decision: "executed",
    reason: "tactically-earned"
  };
}

function isAlphaStrikeThreatNode(
  node: SimulationContent["nodes"][number],
  combo: AiContestedFireCombo
): boolean {
  return (
    (node.type === "tritium" || node.type === "shipyard") &&
    combo.burnArrivalTurn <= combo.missileImpactTurn
  );
}

function isOpeningProductiveDecapitationTarget(
  state: GameState,
  node: SimulationContent["nodes"][number],
  targetFactionId: FactionId
): boolean {
  return (
    (node.type === "tritium" || node.type === "shipyard") &&
    hasFactionShipAtNode(state, node.id, targetFactionId) &&
    !hasPendingAction(state, node.id, targetFactionId)
  );
}

function wouldCreateOpeningAlphaStrikeWithFire(
  state: GameState,
  targetNode: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId
): boolean {
  return (
    state.turn + 1 <= 2 &&
    isOpeningProductiveDecapitationTarget(state, targetNode, targetFactionId) &&
    state.pendingBurnOrders.some((order) => {
      return order.factionId === factionId && order.destinationNodeId === targetNode.id;
    })
  );
}

function wouldCreateOpeningAlphaStrikeWithBurn(
  state: GameState,
  targetNode: SimulationContent["nodes"][number],
  factionId: FactionId
): boolean {
  const targetFactionId = getPrimaryEnemyFactionAtNode(state, targetNode.id, factionId);

  return (
    targetFactionId !== null &&
    state.turn + 1 <= 2 &&
    isOpeningProductiveDecapitationTarget(state, targetNode, targetFactionId) &&
    state.pendingFireOrders.some((order) => {
      return (
        order.factionId === factionId &&
        order.targetNodeId === targetNode.id &&
        order.targetFactionId === targetFactionId
      );
    })
  );
}

function hasOtherEnemyOpeningPressureOnTarget(
  state: GameState,
  targetNodeId: string,
  attackerFactionId: FactionId,
  targetFactionId: FactionId
): boolean {
  return (
    state.pendingFireOrders.some((order) => {
      return (
        order.factionId !== attackerFactionId &&
        order.factionId !== targetFactionId &&
        order.targetNodeId === targetNodeId &&
        order.targetFactionId === targetFactionId
      );
    }) ||
    state.pendingBurnOrders.some((order) => {
      return (
        order.factionId !== attackerFactionId &&
        order.factionId !== targetFactionId &&
        order.destinationNodeId === targetNodeId
      );
    })
  );
}

function createAlphaStrikeThreatEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  combo: AiContestedFireCombo,
  decision: "executed" | "rejected" | "delayed",
  reason: string
): TurnDebugEvent {
  const targetNode = getNodeById(content, combo.targetNodeId);
  const startingProductive =
    targetNode?.type === "tritium" || targetNode?.type === "shipyard" ? targetNode.type : "no";
  const evadeBlocked = combo.burnArrivalTurn <= combo.missileImpactTurn;

  return {
    turn,
    type: "ALPHA_STRIKE_THREAT",
    message: [
      `ALPHA_STRIKE_THREAT ${factionId} -> ${combo.targetFactionId} at ${getNodeDisplayName(content, combo.targetNodeId)}`,
      `fire ${getNodeDisplayName(content, combo.firingNodeId)}`,
      `contest ${getNodeDisplayName(content, combo.contestingNodeId)}`,
      `impact T${combo.missileImpactTurn}`,
      `burn T${combo.burnArrivalTurn}`,
      `evadeBlocked ${formatYesNo(evadeBlocked)}`,
      `productive ${startingProductive}`,
      `decision ${decision}`,
      `reason ${reason}`
    ].join("; "),
    nodeId: combo.contestingNodeId,
    originNodeId: combo.contestingNodeId,
    firingNodeId: combo.firingNodeId,
    destinationNodeId: combo.targetNodeId,
    targetNodeId: combo.targetNodeId,
    targetFactionId: combo.targetFactionId,
    factionId,
    action: "FIRE",
    reason: `${decision}:${reason}`,
    burnCost: combo.burnCost,
    burnArrivalTurn: combo.burnArrivalTurn,
    missileImpactTurn: combo.missileImpactTurn,
    evadeBlocked,
    actual: `decision ${decision}`,
    expected: `incoming missile + ${combo.requiresBurn ? "enemy burn arrival" : "existing contested lock"}`
  };
}

function createAiComboConsideredEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  targetNodeId: string
): TurnDebugEvent {
  return {
    turn,
    type: "AI_COMBO_CONSIDERED",
    message: `AI considered contested+FIRE combo at ${getNodeDisplayName(content, targetNodeId)}`,
    factionId,
    targetNodeId
  };
}

function createAiComboRejectedEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  targetNodeId: string,
  reason: string,
  combo?: AiContestedFireCombo
): TurnDebugEvent {
  return {
    turn,
    type: "AI_COMBO_REJECTED",
    message: `AI rejected contested+FIRE combo at ${getNodeDisplayName(content, targetNodeId)}: ${reason}`,
    destinationNodeId: targetNodeId,
    targetNodeId,
    factionId,
    reason,
    ...(combo === undefined
      ? {}
      : {
          nodeId: combo.contestingNodeId,
          originNodeId: combo.contestingNodeId,
          firingNodeId: combo.firingNodeId,
          targetFactionId: combo.targetFactionId,
          burnCost: combo.burnCost,
          burnArrivalTurn: combo.burnArrivalTurn,
          missileImpactTurn: combo.missileImpactTurn,
          projectedDv: combo.projectedDvAfterBurnAndUpkeep
        })
  };
}

function compareAiOccupanciesForPlanning(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  first: NodeOccupancy,
  second: NodeOccupancy
): number {
  const firstPriority = getAiOccupancyPlanningPriority(content, state, factionId, first);
  const secondPriority = getAiOccupancyPlanningPriority(content, state, factionId, second);

  if (firstPriority !== secondPriority) {
    return firstPriority - secondPriority;
  }

  return first.nodeId.localeCompare(second.nodeId);
}

function getAiOccupancyPlanningPriority(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  occupancy: NodeOccupancy
): number {
  if (!isNodeContested(state.nodeOccupancies, occupancy.nodeId)) {
    const nodeType = getNodeById(content, occupancy.nodeId)?.type ?? "barren";

    if (getAiStrategicPosture(content, state, factionId) === "shipyard-emergency") {
      return nodeType === "barren" || nodeType === "protected"
        ? 8
        : nodeType === "tritium"
          ? 12
          : 10;
    }

    return 10;
  }

  const nodeType = getNodeById(content, occupancy.nodeId)?.type ?? "barren";
  const projectedAfterUpkeep =
    getProjectedFactionDv(state, factionId, occupancy.nodeId) +
    getExpectedNextTritiumIncome(content, state, factionId) -
    getProjectedFactionContestedUpkeepCost(state, factionId);

  if (projectedAfterUpkeep >= AI_MIN_DV_RESERVE && nodeType === "tritium") {
    return 9;
  }

  return nodeType === "barren" || nodeType === "protected" ? 0 : nodeType === "shipyard" ? 1 : 2;
}

function createAiConsideredActionEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  nodeId: string,
  action: NonNullable<TurnDebugEvent["action"]>
): TurnDebugEvent {
  return {
    turn,
    type: "AI_CONSIDERED_ACTION",
    message: `AI considered ${action} at ${getNodeDisplayName(content, nodeId)}`,
    nodeId,
    factionId,
    action
  };
}

function createAiRejectedActionEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  nodeId: string,
  action: NonNullable<TurnDebugEvent["action"]>,
  reason: string,
  details: Readonly<{ destinationNodeId?: string; targetNodeId?: string }> = {}
): TurnDebugEvent {
  return {
    turn,
    type: "AI_REJECTED_ACTION",
    message: `AI rejected ${action} at ${getNodeDisplayName(content, nodeId)}: ${reason}`,
    nodeId,
    factionId,
    action,
    reason,
    ...details
  };
}

function createAiContestedSustainabilityCheckEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  check: AiContestedSustainabilityCheck,
  details: Readonly<{ destinationNodeId?: string; targetNodeId?: string }> = {}
): TurnDebugEvent {
  const decision = check.sustainable ? "sustainable" : (check.reason ?? "unsustainable");

  return {
    turn,
    type: "CONTESTED_SUSTAINABILITY_CHECK",
    message: [
      `CONTESTED_SUSTAINABILITY_CHECK ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, check.nodeId)}`,
      `decision ${decision}`,
      `currentDV ${check.currentDvReserve}`,
      `income ${check.activeTritiumIncome}`,
      `fallbackTritium ${formatYesNo(check.hasFallbackTritium)}`,
      `upkeep ${check.expectedUpkeepCost}`,
      `afterUpkeep ${check.projectedDvAfterUpkeep}`,
      `afterTwoUpkeeps ${check.projectedDvAfterTwoUpkeeps}`,
      `survivalRoute ${formatYesNo(check.hasSurvivalRoute)}`,
      `exit ${formatYesNo(check.canLeaveNextTurn)}`,
      `lastRelevantShip ${formatYesNo(check.lastRelevantShip)}`,
      `tritiumCollapse ${formatYesNo(check.tritiumCollapseRisk)}`,
      `enemyOutlast ${formatYesNo(check.enemyCanAffordUpkeepBetter)}`,
      `enemyProductiveWorking ${check.enemyProductiveNodesWorking}`,
      `hurtsEnemyProduction ${formatYesNo(check.contestedHurtsEnemyProduction)}`
    ].join("; "),
    nodeId: originNodeId,
    factionId,
    action: "BURN",
    reason: decision,
    targetNodeId: check.nodeId,
    projectedDv: check.projectedDvAfterUpkeep,
    amount: check.expectedUpkeepCost,
    ...details
  };
}

function createAiContestedEntryCheckEvent(
  content: SimulationContent,
  state: GameState,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan
): TurnDebugEvent | null {
  if (!hasEnemyShipAtNode(state, destinationNode.id, factionId)) {
    return null;
  }

  const remainingDv = getProjectedFactionDv(state, factionId, plan.originNodeId) - plan.burnCost;
  const check = getAiContestedSustainabilityCheck(content, state, factionId, destinationNode, {
    entryNodeId: destinationNode.id,
    excludedIncomeNodeIds: [plan.originNodeId],
    currentDvReserve: remainingDv
  });

  return createAiContestedSustainabilityCheckEvent(content, turn, factionId, originNodeId, check, {
    destinationNodeId: destinationNode.id
  });
}

function createAiContestedSustainabilityFailureEvents(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  nodeId: string,
  check: AiContestedSustainabilityCheck
): readonly TurnDebugEvent[] {
  if (check.reason === null) {
    return [];
  }

  const type =
    check.reason === "CONTESTED_EXIT_REQUIRED"
      ? "CONTESTED_EXIT_REQUIRED"
      : check.reason === "CONTESTED_COLLAPSE_RISK"
        ? "CONTESTED_COLLAPSE_RISK"
        : "CONTESTED_REJECTED_UNSUSTAINABLE";

  return [
    {
      turn,
      type,
      message: `AI contested at ${getNodeDisplayName(content, nodeId)} is unsustainable: ${check.reason}; after upkeep ${check.projectedDvAfterUpkeep}; fallback tritium ${formatYesNo(check.hasFallbackTritium)}; exit ${formatYesNo(check.canLeaveNextTurn)}`,
      nodeId,
      factionId,
      action: "LEAVE_CONTESTED",
      reason: check.reason,
      projectedDv: check.projectedDvAfterUpkeep,
      amount: check.expectedUpkeepCost
    }
  ];
}

function createAiBurnGuardrailEventsForRejection(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  reason: string,
  details: Readonly<{ destinationNodeId?: string; targetNodeId?: string }> = {}
): readonly TurnDebugEvent[] {
  const destinationName =
    details.destinationNodeId === undefined
      ? "unknown destination"
      : getNodeDisplayName(content, details.destinationNodeId);

  if (reason === "AI_SECOND_TRITIUM_PROTECTION_REQUIRED") {
    return [
      {
        turn,
        type: "AI_TRITIUM_SURVIVAL_REQUIRED",
        message: `AI protects its second independent Tritium path at ${getNodeDisplayName(content, originNodeId)}; ${destinationName} would reduce it to one sustainable source`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  if (reason === "AI_TRITIUM_SURVIVAL_REQUIRED") {
    return [
      {
        turn,
        type: "AI_LAST_TRITIUM_PROTECTION",
        message: `AI protects last tritium worker at ${getNodeDisplayName(content, originNodeId)}; ${destinationName} would abandon income`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      },
      {
        turn,
        type: "AI_REJECTED_LEAVING_LAST_TRITIUM",
        message: `AI rejected leaving last tritium ${getNodeDisplayName(content, originNodeId)} for ${destinationName}`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      },
      {
        turn,
        type: "AI_TRITIUM_SURVIVAL_REQUIRED",
        message: `AI tritium survival required before pressure from ${getNodeDisplayName(content, originNodeId)}`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      },
      {
        turn,
        type: "AI_LAST_TRITIUM_PARALYSIS_AUDIT",
        message: `AI_LAST_TRITIUM_PARALYSIS_AUDIT: ${getNodeDisplayName(content, originNodeId)} stays because it is the last Tritium worker; other legal ships may still act`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  if (
    reason.includes("CONTESTED_REJECTED_UNSUSTAINABLE") ||
    reason === "contested-entry:no-tritium-access" ||
    reason === "contested-entry:upkeep-budget"
  ) {
    return [
      {
        turn,
        type: "AI_REJECTED_CONTEST",
        message: `AI_REJECTED_CONTEST: ${getNodeDisplayName(content, originNodeId)} -> ${destinationName} rejected as unsustainable contested pressure`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      },
      {
        turn,
        type: "CONTESTED_REJECTED_UNSUSTAINABLE",
        message: `AI rejected unsustainable contested entry from ${getNodeDisplayName(content, originNodeId)} to ${destinationName}`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  if (reason.includes("insolvency")) {
    return [
      {
        turn,
        type: "AI_BURN_REJECTED_INSOLVENCY",
        message: `AI rejected BURN from ${getNodeDisplayName(content, originNodeId)} to ${destinationName}: insolvency guard prevents spending to 0 ΔV without fallback Tritium or decisive damage`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  if (reason.includes("opening-solvency")) {
    return [
      {
        turn,
        type: "AI_REJECTED_OPENING_BURN",
        message: `AI_REJECTED_OPENING_BURN: ${getNodeDisplayName(content, originNodeId)} -> ${destinationName} would violate opening ΔV reserve`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  if (reason.includes("CONTESTED_COLLAPSE_RISK")) {
    return [
      {
        turn,
        type: "CONTESTED_COLLAPSE_RISK",
        message: `AI rejected contested entry with collapse risk from ${getNodeDisplayName(content, originNodeId)} to ${destinationName}`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  if (reason.includes("CONTESTED_EXIT_REQUIRED")) {
    return [
      {
        turn,
        type: "CONTESTED_EXIT_REQUIRED",
        message: `AI rejected contested entry without affordable exit from ${getNodeDisplayName(content, originNodeId)} to ${destinationName}`,
        nodeId: originNodeId,
        factionId,
        action: "BURN",
        reason,
        ...details
      }
    ];
  }

  return [];
}

function createAiFireGuardrailEventsForRejection(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  reason: string,
  details: Readonly<{ targetNodeId?: string }> = {}
): readonly TurnDebugEvent[] {
  const targetName =
    details.targetNodeId === undefined
      ? "unknown target"
      : getNodeDisplayName(content, details.targetNodeId);

  if (reason === "fire:last-tritium-worker-opportunity-cost") {
    return [
      {
        turn,
        type: "AI_REJECTED_FIRE",
        message: `AI_REJECTED_FIRE: ${getNodeDisplayName(content, originNodeId)} -> ${targetName}; last Tritium worker must Work unless outcome is forced`,
        nodeId: originNodeId,
        factionId,
        action: "FIRE",
        reason,
        ...details
      },
      {
        turn,
        type: "AI_LAST_TRITIUM_PROTECTION",
        message: `AI protects last tritium worker at ${getNodeDisplayName(content, originNodeId)} from non-forced FIRE`,
        nodeId: originNodeId,
        factionId,
        action: "FIRE",
        reason,
        ...details
      },
      {
        turn,
        type: "AI_LAST_TRITIUM_PARALYSIS_AUDIT",
        message: `AI_LAST_TRITIUM_PARALYSIS_AUDIT: ${getNodeDisplayName(content, originNodeId)} rejects non-forced FIRE as last Tritium worker; pressure can continue from non-critical ships`,
        nodeId: originNodeId,
        factionId,
        action: "FIRE",
        reason,
        ...details
      }
    ];
  }

  if (reason !== "fire:harmless-evade-tax" && reason !== "fire:pressure-only") {
    return [];
  }

  return [
    {
      turn,
      type: "AI_REJECTED_FIRE",
      message: `AI_REJECTED_FIRE: ${getNodeDisplayName(content, originNodeId)} -> ${targetName}; ${reason === "fire:pressure-only" ? "pressure-only FIRE below Work value" : "harmless Evade tax against solvent target"}`,
      nodeId: originNodeId,
      factionId,
      action: "FIRE",
      reason,
      ...details
    },
    {
      turn,
      type: "AI_FIRE_REJECTED_HARMLESS_EVADE_TAX",
      message: `AI rejected FIRE from ${getNodeDisplayName(content, originNodeId)} to ${targetName}: ${reason === "fire:pressure-only" ? "pressure-only result is capped below safe Work" : "harmless Evade tax without low-ΔV target, contested lock, fork, or follow-up burn pressure"}`,
      nodeId: originNodeId,
      factionId,
      action: "FIRE",
      reason,
      ...details
    }
  ];
}

function createAiEvadeTaxValuedEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  targetNodeId: string,
  targetFactionId: FactionId,
  reason: string,
  score: number
): TurnDebugEvent {
  return {
    turn,
    type: "AI_EVADE_TAX_VALUED",
    message: `AI_EVADE_TAX_VALUED: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, targetNodeId)} taxes ${targetFactionId}; ${reason}; score ${Math.round(score)}`,
    nodeId: originNodeId,
    factionId,
    action: "FIRE",
    targetNodeId,
    targetFactionId,
    reason,
    projectedDv: automaticEvadeDvCost,
    score
  };
}

function createAiContestedUpkeepAttackEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  targetNodeId: string,
  targetFactionId: FactionId,
  reason: string,
  score: number
): TurnDebugEvent {
  return {
    turn,
    type: "AI_CONTESTED_UPKEEP_ATTACK",
    message: `AI_CONTESTED_UPKEEP_ATTACK: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, targetNodeId)} pressures ${targetFactionId} upkeep via ${reason}`,
    nodeId: originNodeId,
    factionId,
    action: "FIRE",
    targetNodeId,
    targetFactionId,
    reason,
    projectedDv: automaticEvadeDvCost + contestedUpkeepDvCost,
    score
  };
}

function chooseAiEconomicDenialFireTarget(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  factionId: FactionId,
  turn: number,
  reads: readonly AiProductiveExpansionRead[],
  aiPlanningOptions: AiPlanningOptions = {}
): Readonly<{ target: AiEconomicPressureTarget | null; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [
    createAiConsideredActionEvent(content, turn, factionId, originNodeId, "FIRE")
  ];
  const candidates = content.nodes
    .flatMap((node) => {
      const plan = calculateFirePlan(content, state, originNodeId, node.id);

      if (plan === null) {
        return [];
      }

      const target = getFireTargetAtNode(state, plan, factionId);

      if (target === undefined) {
        return [];
      }

      const targetedPlan = adjustFirePlanForTargetAvailability(content, plan, target);
      const read = reads.find((candidate) => candidate.targetFactionId === target.factionId);

      if (read === undefined || !isProductiveNode(node)) {
        return [];
      }

      if (
        shouldSuppressThirdPartyBeneficiaryEconomicFire(
          content,
          state,
          factionId,
          target.factionId,
          read,
          reads
        )
      ) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            "third-party-beneficiary:stable-leader-priority",
            { targetNodeId: node.id }
          )
        );
        return [];
      }

      const rejectionReason = getAiFireRejectionReason(
        state,
        content,
        node,
        factionId,
        target.factionId,
        {
          originNodeId,
          impactTurn: targetedPlan.impactTurn
        }
      );

      if (rejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            rejectionReason,
            { targetNodeId: node.id }
          )
        );
        debugEvents.push(
          ...createAiFireGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { targetNodeId: node.id }
          )
        );
        return [];
      }

      const noFireRejectionReason = getNoFireProfileRejectionReason(factionId, aiPlanningOptions);

      if (noFireRejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            noFireRejectionReason,
            { targetNodeId: node.id }
          )
        );
        return [];
      }

      return [
        getAiEconomicPressureTarget(
          state,
          content,
          node,
          factionId,
          target.factionId,
          read,
          originNodeId,
          "FIRE",
          targetedPlan.missileEtaTurns
        )
      ];
    })
    .sort(compareEnemyTargetOptions);

  return {
    target: candidates[0] ?? null,
    debugEvents
  };
}

function shouldSuppressThirdPartyBeneficiaryEconomicFire(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  targetFactionId: FactionId,
  read: AiProductiveExpansionRead,
  reads: readonly AiProductiveExpansionRead[]
): boolean {
  if (state.gameMode !== "3p" || read.antiRunaway) {
    return false;
  }

  const ownRecovery = evaluateFactionRecoveryPath(content, state, factionId);
  const ownSecuredTritium = getFactionAccessibleTritiumNodeIds(content, state, factionId).length;

  if (ownSecuredTritium > 0 && ownRecovery.canRecoverIndefiniteTritium) {
    return false;
  }

  return reads.some((candidate) => {
    return candidate.targetFactionId !== targetFactionId && candidate.antiRunaway;
  });
}

function chooseAiProductivePressureBurnTarget(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  factionId: FactionId,
  turn: number,
  reads: readonly AiProductiveExpansionRead[]
): Readonly<{ target: AiEconomicPressureTarget | null; debugEvents: readonly TurnDebugEvent[] }> {
  const debugEvents: TurnDebugEvent[] = [
    createAiConsideredActionEvent(content, turn, factionId, originNodeId, "BURN")
  ];
  const candidates = content.nodes
    .flatMap((node) => {
      if (node.id === originNodeId || !node.contestable || node.protectedNoWar) {
        return [];
      }

      const targetFactionId = reads.find((read) => {
        return (
          read.targetFactionId === getPrimaryEnemyFactionAtNode(state, node.id, factionId) &&
          isProductiveNode(node)
        );
      })?.targetFactionId;

      if (targetFactionId === undefined) {
        return [];
      }

      const plan = getLegalBurnPlan(content, state, originNodeId, node.id, factionId);

      if (plan === null) {
        return [];
      }

      const contestedCheckEvent = createAiContestedEntryCheckEvent(
        content,
        state,
        turn,
        factionId,
        originNodeId,
        node,
        plan
      );

      if (contestedCheckEvent !== null) {
        debugEvents.push(contestedCheckEvent);
      }

      const rejectionReason = getAiBurnRejectionReason(
        state,
        content,
        node,
        plan,
        factionId,
        "expansion"
      );

      if (rejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "BURN",
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        debugEvents.push(
          ...createAiBurnGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        return [];
      }

      const read = reads.find((candidate) => candidate.targetFactionId === targetFactionId);

      if (read === undefined) {
        return [];
      }

      const pressureTarget = getAiEconomicPressureTarget(
        state,
        content,
        node,
        factionId,
        targetFactionId,
        read,
        originNodeId,
        "BURN",
        plan.etaTurns
      );

      return [
        {
          ...pressureTarget,
          burnCost: plan.burnCost,
          score: pressureTarget.score + getAiBurnWindowScore(plan) - plan.burnCost * 8
        }
      ];
    })
    .sort(compareEnemyTargetOptions);

  return {
    target: candidates[0] ?? null,
    debugEvents
  };
}

function getAiEconomicPressureTarget(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId,
  read: AiProductiveExpansionRead,
  originNodeId: string,
  action: "FIRE" | "BURN",
  etaTurns: number
): AiEconomicPressureTarget {
  const expectedDeniedWork = getAiExpectedDeniedWorkValue(state, node, targetFactionId);
  const certainty =
    action === "FIRE"
      ? classifyAiFireOutcome(content, state, node, factionId, targetFactionId, {
          originNodeId,
          impactTurn: state.turn + etaTurns
        })
      : hasEnemyShipAtNode(state, node.id, factionId)
        ? "FORCED_WORK_LOSS"
        : "PRESSURE_ONLY";
  const lastTritiumWorker = isAiLastActiveTritiumWorker(content, state, factionId, originNodeId);
  const opportunityCost =
    action === "FIRE"
      ? getAiFireOpportunityCost(content, state, factionId, originNodeId)
      : (() => {
          const originNode = getNodeById(content, originNodeId);
          return originNode === undefined
            ? 0
            : getAiPotentialWorkOpportunityValue(state, originNode, factionId);
        })();
  const strategicFireReason =
    action === "FIRE"
      ? getAiFireStrategicValueReason(state, content, node, factionId, targetFactionId, {
          originNodeId,
          impactTurn: state.turn + etaTurns
        })
      : null;
  const forcedFire =
    action !== "FIRE" ||
    (certainty !== "PRESSURE_ONLY" && certainty !== "HARMLESS") ||
    strategicFireReason !== null;
  const expectedEvadeTax =
    action === "FIRE"
      ? getAiExpectedFireEvadeTax(state, node.id, targetFactionId, factionId, state.turn + etaTurns)
      : automaticEvadeDvCost;
  const expectedDvSwing = forcedFire
    ? expectedEvadeTax +
      expectedDeniedWork +
      (isNodeContested(state.nodeOccupancies, node.id) ? contestedUpkeepDvCost : 0)
    : Math.max(0, Math.min(expectedDeniedWork, opportunityCost));
  const progress = getShipyardProgress(state.shipyardProgress, node.id);
  const shipyardPressureScore =
    node.type === "shipyard" ? 260 + progress * 55 + (progress >= 3 ? 240 : 0) : 0;
  const productiveClusterScore = read.productiveNodeCount >= 3 ? 180 : 0;
  const antiRunawayScore = read.antiRunaway ? 260 : 0;
  const spreadPenalty =
    hasAnyMissileTargetingNode(state, node.id) && !(node.type === "shipyard" && progress >= 4)
      ? strategicFireReason?.startsWith("fire:stacked") === true
        ? 120
        : -220
      : 0;
  const reason =
    strategicFireReason ??
    (read.antiRunaway && state.gameMode === "3p"
      ? "anti-runaway productive network pressure"
      : node.type === "shipyard"
        ? progress >= 3
          ? "shipyard pressure near production"
          : "shipyard economic pressure"
        : "tritium economic denial");

  return {
    nodeId: node.id,
    targetFactionId,
    score: Math.min(
      getAiFireTargetScore(state, content, node, factionId, targetFactionId) +
        read.score * 42 +
        expectedDvSwing * 48 +
        expectedDeniedWork * 55 +
        shipyardPressureScore +
        productiveClusterScore +
        antiRunawayScore +
        spreadPenalty -
        etaTurns * 12 -
        opportunityCost * (action === "FIRE" ? 90 : 18),
      action === "FIRE" && !forcedFire ? (lastTritiumWorker ? 420 : 510) : Number.POSITIVE_INFINITY
    ),
    etaTurns,
    reason,
    expectedDvSwing,
    expectedDeniedWork,
    certainty,
    lastTritiumWorker,
    opportunityCost
  };
}

function isAiEconomicPressureWorthAction(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  target: AiEconomicPressureTarget
): boolean {
  const originNode = getNodeById(content, originNodeId);
  const ownDeniedWork = originNode === undefined ? 0 : getNodeWorkValue(originNode);
  const threshold = originNode !== undefined && isProductiveNode(originNode) ? 780 : 520;
  const hasStrategicFireReason = target.reason.startsWith("fire:");

  if (target.certainty === "HARMLESS" && !hasStrategicFireReason) {
    return false;
  }

  if (
    target.lastTritiumWorker &&
    !isAiForcedLastTritiumFireClassification(target.certainty) &&
    !hasStrategicFireReason
  ) {
    return false;
  }

  if (
    target.certainty === "PRESSURE_ONLY" &&
    !hasStrategicFireReason &&
    target.score <= threshold + target.opportunityCost
  ) {
    return false;
  }

  return target.score >= threshold && target.expectedDvSwing >= ownDeniedWork + 3;
}

function createAiEconomicPressureSelectedEvent(
  content: SimulationContent,
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  target: AiEconomicPressureTarget,
  type:
    | "FIRE_ECONOMIC_DENIAL"
    | "PRODUCTIVE_NODE_PRESSURE"
    | "SHIPYARD_PRESSURE"
    | "ANTI_RUNAWAY_TARGET"
): TurnDebugEvent {
  const eventType = target.reason.includes("anti-runaway") ? "ANTI_RUNAWAY_TARGET" : type;
  const action = type === "FIRE_ECONOMIC_DENIAL" ? "FIRE" : "BURN";

  return {
    turn,
    type: eventType,
    message: `${eventType} selected: ${action} ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, target.nodeId)}; target ${target.targetFactionId}; reason ${target.reason}; certainty ${target.certainty}; expected ΔV swing ${target.expectedDvSwing}; expected denied Work ${target.expectedDeniedWork}; kill expected ${isNodeContestedTargetLabel(target.reason)}`,
    nodeId: originNodeId,
    factionId,
    action,
    reason: `${target.reason}:${target.certainty}`,
    targetNodeId: target.nodeId,
    targetFactionId: target.targetFactionId,
    etaTurns: target.etaTurns,
    ...(target.burnCost === undefined ? {} : { burnCost: target.burnCost }),
    projectedDv: target.expectedDvSwing,
    amount: target.expectedDeniedWork,
    score: target.score
  };
}

function getAiPressureIntentKind(
  content: SimulationContent,
  targetNodeId: string
): AiStrategicIntentKind {
  const node = getNodeById(content, targetNodeId);

  if (node?.type === "tritium") {
    return "deny-tritium";
  }

  return "pressure-shipyard";
}

function isNodeContestedTargetLabel(reason: string): string {
  return reason.includes("contested") ? "possible" : "pressure-only";
}

function getAiFireTargetSelection(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  factionId: FactionId,
  turn: number,
  aiPlanningOptions: AiPlanningOptions = {}
): AiTargetSelection {
  const debugEvents: TurnDebugEvent[] = [];
  const legalTargets = content.nodes.flatMap((node) => {
    const plan = calculateFirePlan(content, state, originNodeId, node.id);

    if (plan === null) {
      return [];
    }

    const target = getFireTargetAtNode(state, plan, factionId);

    return target === undefined
      ? []
      : [
          {
            node,
            targetFactionId: target.factionId,
            plan: adjustFirePlanForTargetAvailability(content, plan, target)
          }
        ];
  });

  if (legalTargets.length === 0) {
    return { nodeId: null, debugEvents };
  }

  const candidates = legalTargets
    .map(({ node, targetFactionId, plan }) => {
      const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
        action: "FIRE",
        originNodeId,
        actionCost: 0,
        destinationNode: node,
        etaTurns: plan.missileEtaTurns,
        lostWorkCost: getAiFireOpportunityCost(content, state, factionId, originNodeId)
      });
      debugEvents.push(
        ...createAiActionSolvencyForecastEvents(
          content,
          turn,
          factionId,
          originNodeId,
          actionForecast,
          { targetNodeId: node.id }
        )
      );
      const rejectionReason = getAiFireRejectionReason(
        state,
        content,
        node,
        factionId,
        targetFactionId,
        {
          originNodeId,
          impactTurn: plan.impactTurn
        }
      );

      if (rejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            rejectionReason,
            { targetNodeId: node.id }
          )
        );
        debugEvents.push(
          ...createAiFireGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { targetNodeId: node.id }
          )
        );
        return null;
      }

      const noFireRejectionReason = getNoFireProfileRejectionReason(factionId, aiPlanningOptions);

      if (noFireRejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            "FIRE",
            noFireRejectionReason,
            { targetNodeId: node.id }
          )
        );
        return null;
      }

      const trailerBonus = getTrailerAiFirePatternBonus(
        state,
        content,
        originNodeId,
        node,
        plan.impactTurn,
        aiPlanningOptions
      );

      return {
        nodeId: node.id,
        targetFactionId,
        score:
          getAiFireTargetScore(state, content, node, factionId, targetFactionId) +
          trailerBonus.score,
        etaTurns: plan.missileEtaTurns,
        trailerPatternMessage: trailerBonus.message
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort(compareEnemyTargetOptions);

  const selected = candidates[0];

  if (selected?.trailerPatternMessage !== null && selected?.trailerPatternMessage !== undefined) {
    debugEvents.push(
      createTrailerAiPatternEvent(
        turn,
        factionId,
        originNodeId,
        "FIRE",
        selected.nodeId,
        selected.trailerPatternMessage,
        selected.score
      )
    );
  }

  return {
    nodeId: selected?.nodeId ?? null,
    ...(selected?.targetFactionId === undefined
      ? {}
      : { targetFactionId: selected.targetFactionId }),
    debugEvents
  };
}

function getEffectiveAiPlanningLevel(options: AiPlanningOptions = {}): EffectiveAiPlanningLevel {
  if (options.aiLevel === 0) {
    return 0;
  }

  if (options.aiLevel === 1) {
    return 1;
  }

  return 3;
}

function isTrailerAiPlanning(options: AiPlanningOptions = {}): boolean {
  return getEffectiveAiPlanningLevel(options) === 0;
}

function isSimplifiedAiPlanning(options: AiPlanningOptions = {}): boolean {
  return getEffectiveAiPlanningLevel(options) === 1;
}

function getTrailerAiFirePatternBonus(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  targetNode: SimulationContent["nodes"][number],
  impactTurn: number,
  aiPlanningOptions: AiPlanningOptions
): TrailerAiPatternBonus {
  if (!isTrailerAiPlanning(aiPlanningOptions)) {
    return { score: 0, message: null };
  }

  return getBestTrailerAiPatternBonus([
    getTrailerAiConvergenceBonus(state, content, targetNode.id, "FIRE"),
    getTrailerAiSynchronizedBonus(state, content, targetNode.id, impactTurn, "FIRE"),
    getTrailerAiMacroFlowBonus(content, originNodeId, targetNode.id, state.turn, "FIRE")
  ]);
}

function getTrailerAiBurnPatternBonus(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  targetNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  aiPlanningOptions: AiPlanningOptions
): TrailerAiPatternBonus {
  if (!isTrailerAiPlanning(aiPlanningOptions)) {
    return { score: 0, message: null };
  }

  return getBestTrailerAiPatternBonus([
    getTrailerAiConvergenceBonus(state, content, targetNode.id, "BURN"),
    getTrailerAiSynchronizedBonus(state, content, targetNode.id, plan.arrivalTurn, "BURN"),
    getTrailerAiMacroFlowBonus(content, originNodeId, targetNode.id, state.turn, "BURN")
  ]);
}

function getBestTrailerAiPatternBonus(
  bonuses: readonly TrailerAiPatternBonus[]
): TrailerAiPatternBonus {
  return bonuses.reduce<TrailerAiPatternBonus>(
    (best, candidate) => (candidate.score > best.score ? candidate : best),
    { score: 0, message: null }
  );
}

function getTrailerAiConvergenceBonus(
  state: GameState,
  content: SimulationContent,
  targetNodeId: string,
  action: "BURN" | "FIRE"
): TrailerAiPatternBonus {
  const targetNode = getNodeById(content, targetNodeId);

  if (targetNode === undefined) {
    return { score: 0, message: null };
  }

  const routeCount =
    state.pendingBurnOrders.filter((order) => order.destinationNodeId === targetNodeId).length +
    state.activeBurnTransits.filter((transit) => transit.destinationNodeId === targetNodeId)
      .length +
    state.pendingFireOrders.filter((order) => order.targetNodeId === targetNodeId).length +
    state.activeMissiles.filter((missile) => missile.targetNodeId === targetNodeId).length;
  const contestedBonus = isNodeContested(state.nodeOccupancies, targetNodeId) ? 180 : 0;
  const productiveBonus = targetNode.type === "tritium" || targetNode.type === "shipyard" ? 160 : 0;

  if (routeCount <= 0 && contestedBonus <= 0) {
    return { score: 0, message: null };
  }

  return {
    score: 260 + routeCount * 170 + contestedBonus + productiveBonus,
    message: `TRAILER PATTERN: convergence on ${getNodeDisplayName(content, targetNodeId)} via ${action}`
  };
}

function getTrailerAiSynchronizedBonus(
  state: GameState,
  content: SimulationContent,
  targetNodeId: string,
  resolvingTurn: number,
  action: "BURN" | "FIRE"
): TrailerAiPatternBonus {
  const synchronizedCount =
    state.pendingBurnOrders.filter((order) => Math.abs(order.arrivalTurn - resolvingTurn) <= 1)
      .length +
    state.activeBurnTransits.filter((transit) => Math.abs(transit.arrivalTurn - resolvingTurn) <= 1)
      .length +
    state.pendingFireOrders.filter((order) => Math.abs(order.impactTurn - resolvingTurn) <= 1)
      .length +
    state.activeMissiles.filter((missile) => Math.abs(missile.impactTurn - resolvingTurn) <= 1)
      .length;

  if (synchronizedCount <= 0) {
    return { score: 0, message: null };
  }

  return {
    score: 220 + synchronizedCount * 120,
    message: `TRAILER PATTERN: synchronized operation resolving T+${Math.max(1, resolvingTurn - state.turn)} near ${getNodeDisplayName(content, targetNodeId)} via ${action}`
  };
}

function getTrailerAiMacroFlowBonus(
  content: SimulationContent,
  originNodeId: string,
  targetNodeId: string,
  turn: number,
  action: "BURN" | "FIRE"
): TrailerAiPatternBonus {
  const originRadius = getNodeCurrentPlanarRadius(content, originNodeId, turn);
  const targetRadius = getNodeCurrentPlanarRadius(content, targetNodeId, turn);

  if (originRadius === null || targetRadius === null) {
    return { score: 0, message: null };
  }

  const radiusDelta = targetRadius - originRadius;

  if (Math.abs(radiusDelta) < 180) {
    return { score: 0, message: null };
  }

  const direction = radiusDelta > 0 ? "center-to-periphery attack" : "periphery-to-center collapse";

  return {
    score: Math.min(320, 120 + Math.abs(radiusDelta) * 0.18),
    message: `TRAILER PATTERN: ${direction} via ${action}`
  };
}

function getNodeCurrentPlanarRadius(
  content: SimulationContent,
  nodeId: string,
  turn: number
): number | null {
  const node = getNodeById(content, nodeId);

  if (node === undefined) {
    return null;
  }

  const position = computeBodyPosition(content, node.bodyId, turn);
  return Math.hypot(position.x, position.y);
}

function createTrailerAiPatternEvent(
  turn: number,
  factionId: FactionId,
  originNodeId: string,
  action: "BURN" | "FIRE" | "LEAVE_CONTESTED",
  targetNodeId: string,
  message: string,
  score: number
): TurnDebugEvent {
  return {
    turn,
    type: "AI_CONSIDERED_ACTION",
    message,
    nodeId: originNodeId,
    factionId,
    action,
    score,
    reason: "ai-level-0-trailer-pattern",
    ...(action === "FIRE" ? { targetNodeId } : { destinationNodeId: targetNodeId })
  };
}

function getAiFireRejectionReason(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId,
  options: AiFireRejectionOptions = {}
): string | null {
  if (wouldCreateOpeningAlphaStrikeWithFire(state, node, factionId, targetFactionId)) {
    return "opening-alpha-strike-delayed";
  }

  const impactTurn = options.impactTurn ?? state.turn + 2;
  const stackValue = evaluateMissileStackValue(
    content,
    state,
    factionId,
    options.originNodeId ?? node.id,
    node,
    targetFactionId,
    impactTurn
  );

  if (stackValue.missilesBefore > 0 && stackValue.classification === "NO_THRESHOLD_CHANGE") {
    return "fire:stacking-no-threshold-change";
  }

  const classification = classifyAiFireOutcome(
    content,
    state,
    node,
    factionId,
    targetFactionId,
    options
  );
  if (options.originNodeId !== undefined) {
    const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
      action: "FIRE",
      originNodeId: options.originNodeId,
      actionCost: 0,
      destinationNode: node,
      etaTurns: Math.max(0, impactTurn - state.turn),
      lostWorkCost: getAiFireOpportunityCost(content, state, factionId, options.originNodeId)
    });
    const actionSolvencyRejection = getAiActionSolvencyRejectionReason(actionForecast, {
      decisive: isAiProvenReserveOverrideClassification(classification)
    });

    if (actionSolvencyRejection !== null) {
      return actionSolvencyRejection;
    }
  }
  const firedByLastTritiumWorker =
    options.originNodeId !== undefined &&
    isAiLastActiveTritiumWorker(content, state, factionId, options.originNodeId);

  if (
    state.turn === 0 &&
    firedByLastTritiumWorker &&
    classification !== "FORCED_KILL" &&
    classification !== "FORCED_ENEMY_INSOLVENCY"
  ) {
    return "fire:last-tritium-worker-opportunity-cost";
  }

  if (
    firedByLastTritiumWorker &&
    !isAiForcedLastTritiumFireClassification(classification) &&
    !isAiPreventingImmediateCollapse(content, state, factionId) &&
    getAiFireStrategicValueReason(state, content, node, factionId, targetFactionId, options) ===
      null
  ) {
    return "fire:last-tritium-worker-opportunity-cost";
  }

  if (
    classification === "HARMLESS" &&
    getAiFireStrategicValueReason(state, content, node, factionId, targetFactionId, options) ===
      null
  ) {
    return "fire:harmless-evade-tax";
  }

  if (
    classification === "PRESSURE_ONLY" &&
    getAiFireStrategicValueReason(state, content, node, factionId, targetFactionId, options) ===
      null
  ) {
    return "fire:harmless-evade-tax";
  }

  if (getAiFireTargetScore(state, content, node, factionId, targetFactionId) <= 0) {
    return "low-value-target";
  }

  return null;
}

function getAiFireStrategicValueReason(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId,
  options: AiFireRejectionOptions = {}
): string | null {
  const impactTurn = options.impactTurn ?? state.turn + 2;
  const projectedTargetDv = getProjectedFactionDvBeforeTurn(
    content,
    state,
    targetFactionId,
    impactTurn
  );
  const expectedEvadeTax = getAiExpectedFireEvadeTax(
    state,
    node.id,
    targetFactionId,
    factionId,
    impactTurn
  );
  const projectedAfterEvade = projectedTargetDv - expectedEvadeTax;
  const targetSafeTritium = getFactionAccessibleTritiumNodeIds(
    content,
    state,
    targetFactionId
  ).length;
  const targetUpkeep = getProjectedFactionContestedUpkeepCost(state, targetFactionId);
  const targetRead = getAiProductiveExpansionReads(content, state, factionId).find((read) => {
    return read.targetFactionId === targetFactionId;
  });
  const stackValue = evaluateMissileStackValue(
    content,
    state,
    factionId,
    options.originNodeId ?? node.id,
    node,
    targetFactionId,
    impactTurn
  );

  if (stackValue.missilesBefore > 0 && stackValue.classification !== "NO_THRESHOLD_CHANGE") {
    return stackValue.reason;
  }

  if (projectedTargetDv < expectedEvadeTax) {
    return "fire:low-dv-before-impact";
  }

  if (projectedAfterEvade < 0) {
    return "fire:evade-tax-insolvency-window";
  }

  if (projectedAfterEvade < targetUpkeep + AI_CRITICAL_DV) {
    return "fire:evade-tax-upkeep-window";
  }

  if (isNodeLikelyContestedBeforeTurn(state, node.id, targetFactionId, impactTurn)) {
    return "fire:contested-before-impact";
  }

  if (
    node.type === "shipyard" &&
    getShipyardProgress(state.shipyardProgress, node.id) >= shipyardCompletionProgress - 1
  ) {
    return "fire:shipyard-launch-timing";
  }

  if (node.type === "tritium" && targetSafeTritium <= 1) {
    return "fire:last-safe-tritium-tax";
  }

  if (targetRead?.antiRunaway === true && isProductiveNode(node)) {
    return "fire:leader-economy-tax";
  }

  if (
    isProductiveNode(node) &&
    hasFactionShipAtNode(state, node.id, targetFactionId) &&
    hasAiFollowUpPressureBeforeImpact(
      content,
      state,
      factionId,
      node.id,
      impactTurn,
      options.originNodeId
    )
  ) {
    return "fire:paired-burn-or-denial";
  }

  if (
    hasAiMissileForkPressure(state, factionId, targetFactionId, node.id, impactTurn) &&
    projectedTargetDv < expectedEvadeTax + automaticEvadeDvCost + AI_MIN_DV_RESERVE
  ) {
    return "fire:fork-pressure";
  }

  return null;
}

function getProjectedFactionDvBeforeTurn(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  turn: number
): number {
  const turnsUntil = Math.max(0, turn - state.turn);

  return (
    getProjectedFactionDv(state, factionId) +
    getExpectedNextTritiumIncome(content, state, factionId) * turnsUntil -
    getProjectedFactionContestedUpkeepCost(state, factionId) * turnsUntil
  );
}

function isNodeLikelyContestedBeforeTurn(
  state: GameState,
  nodeId: string,
  targetFactionId: FactionId,
  turn: number
): boolean {
  return (
    isNodeContested(state.nodeOccupancies, nodeId) ||
    [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
      return (
        order.destinationNodeId === nodeId &&
        order.factionId !== targetFactionId &&
        order.arrivalTurn <= turn
      );
    })
  );
}

function hasAiFollowUpPressureBeforeImpact(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  targetNodeId: string,
  impactTurn: number,
  excludedOriginNodeId?: string
): boolean {
  if (hasFactionShipAtNode(state, targetNodeId, factionId)) {
    return true;
  }

  if (
    [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
      return (
        order.factionId === factionId &&
        order.destinationNodeId === targetNodeId &&
        order.arrivalTurn <= impactTurn + 1
      );
    })
  ) {
    return true;
  }

  return getAiAvailableActionOrigins(state, content, factionId).some((originNodeId) => {
    if (originNodeId === excludedOriginNodeId || originNodeId === targetNodeId) {
      return false;
    }

    const plan = getLegalBurnPlan(content, state, originNodeId, targetNodeId, factionId);

    return (
      plan !== null &&
      state.turn + plan.etaTurns <= impactTurn + 1 &&
      getProjectedFactionDv(state, factionId, originNodeId) - plan.burnCost > 0
    );
  });
}

function hasAiMissileForkPressure(
  state: GameState,
  factionId: FactionId,
  targetFactionId: FactionId,
  candidateNodeId: string,
  impactTurn: number
): boolean {
  return [...state.pendingFireOrders, ...state.activeMissiles].some((missile) => {
    return (
      missile.factionId === factionId &&
      missile.targetFactionId === targetFactionId &&
      missile.targetNodeId !== candidateNodeId &&
      Math.abs(missile.impactTurn - impactTurn) <= 1
    );
  });
}

function evaluateMissileStackValue(
  content: SimulationContent,
  state: GameState,
  attackerFaction: FactionId,
  originNodeId: string,
  targetNode: SimulationContent["nodes"][number],
  targetFactionId: FactionId,
  impactTurn: number
): AiMissileStackValue {
  const missilesBefore = getMissilePressureCountForTarget(state, targetNode.id, targetFactionId, {
    impactTurn
  });
  const missilesAfter = missilesBefore + 1;
  const totalEvadeCostBefore = missilesBefore * automaticEvadeDvCost;
  const totalEvadeCostAfter = missilesAfter * automaticEvadeDvCost;
  const targetProjectedDvAtImpact = getProjectedFactionDvBeforeTurn(
    content,
    state,
    targetFactionId,
    impactTurn
  );
  const projectedIncomeBeforeImpact =
    getExpectedNextTritiumIncome(content, state, targetFactionId) *
    Math.max(0, impactTurn - state.turn);
  const targetWillBeContestedAtImpact = isNodeLikelyContestedBeforeTurn(
    state,
    targetNode.id,
    targetFactionId,
    impactTurn
  );
  const targetCanEvade = !targetWillBeContestedAtImpact;
  const targetCanBreakSolution = canTargetBreakMissileSolutionByBurn(
    content,
    state,
    targetFactionId,
    targetNode.id,
    targetProjectedDvAtImpact
  );
  const targetWouldFallBelowReserve =
    targetProjectedDvAtImpact - totalEvadeCostAfter < AI_MIN_DV_RESERVE;
  const targetHasReference = hasMissileTargetReference(state, targetNode.id, targetFactionId);
  const createsLikelyKill =
    targetHasReference &&
    targetProjectedDvAtImpact >= totalEvadeCostBefore &&
    targetProjectedDvAtImpact < totalEvadeCostAfter;
  const protectsLikelyKillAgainstIncome =
    targetHasReference &&
    projectedIncomeBeforeImpact > 0 &&
    targetProjectedDvAtImpact + projectedIncomeBeforeImpact >= totalEvadeCostBefore &&
    targetProjectedDvAtImpact + projectedIncomeBeforeImpact < totalEvadeCostAfter;
  const expectedDeniedWork = getAiExpectedDeniedWorkValue(state, targetNode, targetFactionId);
  const targetProgress = getShipyardProgress(state.shipyardProgress, targetNode.id);
  const hasMandatoryLaunchRisk =
    state.mandatoryLaunches.some((launch) => {
      return launch.factionId === targetFactionId && launch.nodeId === targetNode.id;
    }) ||
    (targetNode.type === "shipyard" &&
      targetProgress >= shipyardCompletionProgress - 1 &&
      getAvoidedShipyardCompletionReason(state, content, targetNode.id, targetFactionId) !== null);
  const targetIsLastTritium =
    targetNode.type === "tritium" &&
    getFactionAccessibleTritiumNodeIds(content, state, targetFactionId).length <= 1;
  const projectedAfterEvade = targetProjectedDvAtImpact - totalEvadeCostAfter;
  let classification: AiMissileStackClassification = "NO_THRESHOLD_CHANGE";
  let score = 0;

  if (targetWillBeContestedAtImpact && targetHasReference) {
    classification = "CONTESTED_LOCK";
    score = 1000 + missilesAfter * 120;
  } else if ((createsLikelyKill || protectsLikelyKillAgainstIncome) && !targetCanBreakSolution) {
    classification = "FORCED_KILL";
    score = 960 + missilesAfter * 160;
  } else if (
    targetNode.type === "shipyard" &&
    targetHasReference &&
    (hasMandatoryLaunchRisk ||
      (targetProgress >= shipyardCompletionProgress - 1 && targetWouldFallBelowReserve) ||
      (expectedDeniedWork > 0 && projectedAfterEvade < AI_MIN_DV_RESERVE + automaticEvadeDvCost))
  ) {
    classification = "SHIPYARD_DENIAL";
    score = 760 + targetProgress * 70 + (hasMandatoryLaunchRisk ? 240 : 0);
  } else if (targetNode.type === "tritium" && targetHasReference && targetWouldFallBelowReserve) {
    classification = "TRITIUM_DENIAL";
    score = 700 + (targetWouldFallBelowReserve ? 160 : 0) + (targetIsLastTritium ? 180 : 0);
  } else if (
    targetHasReference &&
    targetWouldFallBelowReserve &&
    (targetProjectedDvAtImpact >= totalEvadeCostAfter || targetCanBreakSolution)
  ) {
    classification = "FORCED_EVADE_COST";
    score = 620 + missilesAfter * 110;
  } else if (
    targetHasReference &&
    missilesBefore > 0 &&
    (projectedAfterEvade < AI_MIN_DV_RESERVE + automaticEvadeDvCost ||
      hasAiFollowUpPressureBeforeImpact(
        content,
        state,
        attackerFaction,
        targetNode.id,
        impactTurn,
        originNodeId
      ))
  ) {
    classification = "PRESSURE_ONLY";
    score = 420 + missilesAfter * 70;
  }

  return {
    classification,
    reason: getAiMissileStackReason(classification),
    missilesBefore,
    missilesAfter,
    totalEvadeCostBefore,
    totalEvadeCostAfter,
    targetProjectedDvAtImpact,
    projectedIncomeBeforeImpact,
    targetCanBreakSolution,
    targetCanEvade,
    targetWillBeContestedAtImpact,
    targetWouldFallBelowReserve,
    score
  };
}

function getAiMissileStackReason(classification: AiMissileStackClassification): string {
  switch (classification) {
    case "FORCED_KILL":
      return "fire:stacked-forced-kill";
    case "FORCED_EVADE_COST":
      return "fire:stacked-forced-evade-cost";
    case "SHIPYARD_DENIAL":
      return "fire:stacked-shipyard-denial";
    case "TRITIUM_DENIAL":
      return "fire:stacked-tritium-denial";
    case "CONTESTED_LOCK":
      return "fire:stacked-contested-lock";
    case "PRESSURE_ONLY":
      return "fire:stacked-pressure";
    case "NO_THRESHOLD_CHANGE":
      return "fire:stacking-no-threshold-change";
  }
}

function getAiStrategyProfile(options: AiPlanningOptions, factionId: FactionId): AiStrategyProfile {
  return options.factionStrategyProfiles?.[factionId] ?? "FIRE";
}

function getNoFireProfileRejectionReason(
  factionId: FactionId,
  aiPlanningOptions: AiPlanningOptions
): string | null {
  if (getAiStrategyProfile(aiPlanningOptions, factionId) !== "NOFIRE") {
    return null;
  }

  return "firevsai:nofire-alpha-strike-only";
}

function canTargetBreakMissileSolutionByBurn(
  content: SimulationContent,
  state: GameState,
  targetFactionId: FactionId,
  originNodeId: string,
  projectedTargetDv: number
): boolean {
  if (!hasMissileTargetReference(state, originNodeId, targetFactionId) || projectedTargetDv <= 0) {
    return false;
  }

  return content.nodes.some((destination) => {
    if (
      destination.id === originNodeId ||
      !destination.contestable ||
      destination.protectedNoWar ||
      hasEnemyShipAtNode(state, destination.id, targetFactionId) ||
      isNodeContested(state.nodeOccupancies, destination.id)
    ) {
      return false;
    }

    const plan = calculateBurnPlan(content, state, originNodeId, destination.id);

    return plan !== null && plan.burnCost <= projectedTargetDv;
  });
}

function getAiFirePressureReason(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId
): string | null {
  const targetIsContested = isNodeContested(state.nodeOccupancies, node.id);
  const existingMissilePressure = getMissilePressureCountForTarget(state, node.id, targetFactionId);
  const targetFactionDvAfterEvade =
    getProjectedFactionDv(state, targetFactionId) -
    getFactionContestedUpkeepCost(state, targetFactionId) -
    automaticEvadeDvCost * (1 + existingMissilePressure);

  if (targetIsContested && hasFactionShipAtNode(state, node.id, factionId)) {
    return "support-contested";
  }

  if (targetFactionDvAfterEvade < AI_MIN_DV_RESERVE) {
    return "low-dv-evade-pressure";
  }

  if (node.type === "shipyard") {
    const progress = getShipyardProgress(state.shipyardProgress, node.id);

    if (progress >= shipyardCompletionProgress - 2) {
      return "pressure-shipyard-near-production";
    }
  }

  if (
    node.type === "tritium" &&
    hasFactionShipAtNode(state, node.id, targetFactionId) &&
    !targetIsContested &&
    !hasPendingAction(state, node.id, targetFactionId)
  ) {
    return "deny-tritium-work";
  }

  const economicRead = getAiProductiveExpansionReads(content, state, factionId).find((read) => {
    return read.targetFactionId === targetFactionId;
  });

  if (
    economicRead !== undefined &&
    isProductiveNode(node) &&
    hasFactionShipAtNode(state, node.id, targetFactionId)
  ) {
    return node.type === "shipyard"
      ? "greedy-productive-expansion:shipyard-pressure"
      : "greedy-productive-expansion:deny-work";
  }

  return null;
}

function getMissilePressureCountForTarget(
  state: GameState,
  nodeId: string,
  targetFactionId: FactionId,
  options: Readonly<{
    factionId?: FactionId;
    impactTurn?: number;
    sameTurnOnly?: boolean;
  }> = {}
): number {
  return [...state.pendingFireOrders, ...state.activeMissiles].filter((missile) => {
    if (
      missile.targetNodeId !== nodeId ||
      missile.targetFactionId !== targetFactionId ||
      (options.factionId !== undefined && missile.factionId !== options.factionId)
    ) {
      return false;
    }

    if (options.impactTurn === undefined) {
      return true;
    }

    return options.sameTurnOnly === true
      ? missile.impactTurn === options.impactTurn
      : Math.abs(missile.impactTurn - options.impactTurn) <= 1;
  }).length;
}

function getAiExpectedFireEvadeTax(
  state: GameState,
  nodeId: string,
  targetFactionId: FactionId,
  factionId: FactionId,
  impactTurn: number
): number {
  const existingConcurrentMissiles = getMissilePressureCountForTarget(
    state,
    nodeId,
    targetFactionId,
    { factionId, impactTurn, sameTurnOnly: true }
  );

  return automaticEvadeDvCost * (1 + existingConcurrentMissiles);
}

function getAiFireTargetScore(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  targetFactionId: FactionId
): number {
  const progress = getShipyardProgress(state.shipyardProgress, node.id);
  const productiveScore = node.type === "shipyard" || node.type === "tritium" ? 300 : 0;
  const workingScore =
    productiveScore > 0 &&
    !isNodeContested(state.nodeOccupancies, node.id) &&
    !hasPendingAction(state, node.id, targetFactionId)
      ? 160
      : 0;
  const contestedScore = isNodeContested(state.nodeOccupancies, node.id) ? 360 : 0;
  const lowDvScore =
    getFactionDv(state, targetFactionId) <= AI_CRITICAL_DV
      ? 220
      : getFactionDv(state, targetFactionId) < AI_MIN_DV_RESERVE + automaticEvadeDvCost
        ? 90
        : 0;
  const pressureReason = getAiFirePressureReason(state, content, node, factionId, targetFactionId);
  const economicRead = getAiProductiveExpansionReads(content, state, factionId).find((read) => {
    return read.targetFactionId === targetFactionId;
  });
  const pressureScore =
    pressureReason === null
      ? 0
      : pressureReason.includes("greedy")
        ? 360
        : pressureReason.includes("shipyard")
          ? 260
          : pressureReason.includes("contested")
            ? 300
            : 120;
  const economicScore =
    economicRead === undefined
      ? 0
      : economicRead.score * 24 + getAiExpectedDeniedWorkValue(state, node, targetFactionId) * 40;
  const existingMissilePressure = getMissilePressureCountForTarget(
    state,
    node.id,
    targetFactionId,
    { factionId }
  );
  const stackValue = evaluateMissileStackValue(
    content,
    state,
    factionId,
    node.id,
    node,
    targetFactionId,
    state.turn + 2
  );
  const stackedFireScore =
    existingMissilePressure <= 0
      ? 0
      : stackValue.classification !== "NO_THRESHOLD_CHANGE"
        ? existingMissilePressure * 260 + stackValue.score
        : -180;

  return (
    productiveScore +
    workingScore +
    contestedScore +
    lowDvScore +
    pressureScore +
    economicScore +
    stackedFireScore +
    (node.type === "shipyard" ? 80 + progress : 0)
  );
}

function getAiBurnTargetSelection(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  factionId: FactionId,
  purpose: AiBurnPurpose,
  turn: number,
  aiPlanningOptions: AiPlanningOptions = {}
): AiBurnTargetSelection {
  const debugEvents: TurnDebugEvent[] = [];
  const candidates = content.nodes
    .filter((node) => {
      return node.id !== originNodeId && node.contestable && !node.protectedNoWar;
    })
    .map((node) => {
      const plan = getLegalBurnPlan(content, state, originNodeId, node.id, factionId);

      if (plan === null) {
        return null;
      }

      const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
        action: purpose === "escape" ? "LEAVE_CONTESTED" : "BURN",
        originNodeId,
        actionCost: plan.burnCost,
        destinationNode: node,
        etaTurns: plan.etaTurns,
        entryNodeId: hasEnemyShipAtNode(state, node.id, factionId) ? node.id : null,
        losesOriginIncome: true
      });
      debugEvents.push(
        ...createAiActionSolvencyForecastEvents(
          content,
          turn,
          factionId,
          originNodeId,
          actionForecast,
          { destinationNodeId: node.id }
        )
      );

      const contestedCheckEvent = createAiContestedEntryCheckEvent(
        content,
        state,
        turn,
        factionId,
        originNodeId,
        node,
        plan
      );

      if (contestedCheckEvent !== null) {
        debugEvents.push(contestedCheckEvent);
      }

      const rejectionReason = getAiBurnRejectionReason(
        state,
        content,
        node,
        plan,
        factionId,
        purpose
      );

      if (rejectionReason !== null) {
        debugEvents.push(
          createAiRejectedActionEvent(
            content,
            turn,
            factionId,
            originNodeId,
            purpose === "escape" ? "LEAVE_CONTESTED" : "BURN",
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        if (
          purpose !== "escape" &&
          hasEnemyShipAtNode(state, node.id, factionId) &&
          (rejectionReason.startsWith("contested-entry") || rejectionReason.startsWith("solvency:"))
        ) {
          const contestedCheck = getAiContestedSustainabilityCheck(
            content,
            state,
            factionId,
            node,
            {
              entryNodeId: node.id,
              excludedIncomeNodeIds: [originNodeId],
              currentDvReserve:
                getProjectedFactionDv(state, factionId, originNodeId) - plan.burnCost
            }
          );
          debugEvents.push(
            createAiRejectedSuicidalContestEvent(
              content,
              turn,
              factionId,
              originNodeId,
              node.id,
              contestedCheck
            )
          );
        }
        debugEvents.push(
          ...createAiBurnGuardrailEventsForRejection(
            content,
            turn,
            factionId,
            originNodeId,
            rejectionReason,
            { destinationNodeId: node.id }
          )
        );
        return null;
      }

      const stealsShipyardProgress =
        node.type === "shipyard" &&
        (hasEnemyShipAtNode(state, node.id, factionId) ||
          (getShipyardProgress(state.shipyardProgress, node.id) > 0 &&
            getShipyardWorkerFactionId(state.shipyardProgress, node.id) !== factionId));

      if (
        purpose !== "escape" &&
        (hasEnemyShipAtNode(state, node.id, factionId) || stealsShipyardProgress)
      ) {
        const lineProjection = getAiBurnTacticalLineProjection(
          content,
          state,
          factionId,
          node,
          plan,
          purpose,
          getAiBurnTargetScore(state, content, node, factionId, purpose) +
            getAiBurnWindowScore(plan)
        );
        debugEvents.push(
          createAiTacticalLineAuditEvent(
            content,
            turn,
            factionId,
            originNodeId,
            node.id,
            lineProjection,
            true,
            lineProjection.reason
          )
        );
      }

      const trailerBonus = getTrailerAiBurnPatternBonus(
        state,
        content,
        originNodeId,
        node,
        plan,
        aiPlanningOptions
      );
      const burnAwayEvaluation =
        purpose === "escape"
          ? evaluateBurnAwayDestination(state, content, factionId, originNodeId, node, plan)
          : null;

      if (burnAwayEvaluation !== null) {
        debugEvents.push({
          turn,
          type: "AI_BURN_AWAY_DESTINATION_EVAL",
          message: `AI_BURN_AWAY_DESTINATION_EVAL: ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, node.id)} score ${Math.round(burnAwayEvaluation.score)} ${burnAwayEvaluation.reason}`,
          nodeId: originNodeId,
          factionId,
          action: "LEAVE_CONTESTED",
          destinationNodeId: node.id,
          projectedDv: burnAwayEvaluation.projectedDvAfterArrival,
          amount: burnAwayEvaluation.projectedIncomeAfterArrival,
          burnCost: plan.burnCost,
          etaTurns: plan.etaTurns,
          reason: burnAwayEvaluation.reason,
          score: burnAwayEvaluation.score
        });

        if (
          burnAwayEvaluation.projectedDvAfterArrival <= 0 ||
          !burnAwayEvaluation.supportsRecovery
        ) {
          return null;
        }
      }
      const baseScore =
        getAiBurnTargetScore(state, content, node, factionId, purpose) +
        getAiBurnWindowScore(plan) +
        getAiProductivePathBurnBonus(state, content, originNodeId, node, plan, factionId, purpose);

      return {
        nodeId: node.id,
        score: (burnAwayEvaluation?.score ?? baseScore) + trailerBonus.score,
        etaTurns: plan.etaTurns,
        burnCost: plan.burnCost,
        trailerPatternMessage: trailerBonus.message
      };
    })
    .filter((candidate): candidate is NonNullable<typeof candidate> => candidate !== null)
    .sort(compareEnemyTargetOptions);

  const nearestSustainableTritium = candidates
    .filter((candidate) => {
      const node = getNodeById(content, candidate.nodeId);

      return (
        node?.type === "tritium" &&
        !hasEnemyShipAtNode(state, candidate.nodeId, factionId) &&
        !isNodeContested(state.nodeOccupancies, candidate.nodeId) &&
        !hasKnownTritiumFallbackThreat(
          state,
          factionId,
          candidate.nodeId,
          state.turn + candidate.etaTurns
        )
      );
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
  const originNode = getNodeById(content, originNodeId);
  const useOpeningTritiumDefault =
    purpose === "expansion" && state.turn === 0 && originNode?.type === "barren";
  const selected =
    purpose === "escape" || useOpeningTritiumDefault
      ? (nearestSustainableTritium ?? candidates[0])
      : candidates[0];

  if (
    selected !== undefined &&
    selected === nearestSustainableTritium &&
    (purpose === "escape" || useOpeningTritiumDefault)
  ) {
    debugEvents.push({
      turn,
      type: "AI_NEAREST_TRITIUM_DEFAULT_BURN",
      message: `AI_NEAREST_TRITIUM_DEFAULT_BURN: ${purpose === "escape" ? "escape" : "turn-1 barren opening"} ${getNodeDisplayName(content, originNodeId)} -> ${getNodeDisplayName(content, selected.nodeId)}`,
      nodeId: originNodeId,
      factionId,
      action: purpose === "escape" ? "LEAVE_CONTESTED" : "BURN",
      destinationNodeId: selected.nodeId,
      burnCost: selected.burnCost,
      etaTurns: selected.etaTurns,
      reason: purpose === "escape" ? "nearest-sustainable-tritium-escape" : "turn-1-nearest-tritium"
    });
  }

  if (selected?.trailerPatternMessage !== null && selected?.trailerPatternMessage !== undefined) {
    debugEvents.push(
      createTrailerAiPatternEvent(
        turn,
        factionId,
        originNodeId,
        purpose === "escape" ? "LEAVE_CONTESTED" : "BURN",
        selected.nodeId,
        selected.trailerPatternMessage,
        selected.score
      )
    );
  }

  return {
    nodeId: selected?.nodeId ?? null,
    debugEvents
  };
}

function getAiBurnRejectionReason(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  plan: BurnPlan,
  factionId: FactionId,
  purpose: AiBurnPurpose
): string | null {
  const projectedDv = getProjectedFactionDv(state, factionId, plan.originNodeId);
  const remainingDv = projectedDv - plan.burnCost;
  const committedContestedUpkeep = getProjectedFactionContestedUpkeepCost(state, factionId);
  const voluntarilyEntersContested =
    purpose !== "escape" && hasEnemyShipAtNode(state, node.id, factionId);

  if (remainingDv < 0) {
    return "insufficient-dv";
  }

  if (purpose !== "escape" && wouldCreateOpeningAlphaStrikeWithBurn(state, node, factionId)) {
    return "opening-alpha-strike-delayed";
  }

  const lastTritiumDepartureRejection = getAiLastTritiumDepartureRejectionReason(
    state,
    content,
    node,
    plan,
    factionId,
    purpose
  );

  if (lastTritiumDepartureRejection !== null) {
    return lastTritiumDepartureRejection;
  }

  const secondTritiumDepartureRejection = getAiSecondTritiumDepartureRejectionReason(
    state,
    content,
    node,
    plan,
    factionId,
    purpose
  );

  if (secondTritiumDepartureRejection !== null) {
    return secondTritiumDepartureRejection;
  }

  if (voluntarilyEntersContested) {
    const contestedRejection = getAiVoluntaryContestedEntryEconomy(
      state,
      content,
      node,
      plan,
      factionId,
      [plan.originNodeId],
      purpose
    ).reason;

    if (contestedRejection !== null) {
      return contestedRejection;
    }
  }

  const actionForecast = getAiActionSolvencyForecast(content, state, factionId, {
    action: purpose === "escape" ? "LEAVE_CONTESTED" : "BURN",
    originNodeId: plan.originNodeId,
    actionCost: plan.burnCost,
    destinationNode: node,
    etaTurns: plan.etaTurns,
    entryNodeId: hasEnemyShipAtNode(state, node.id, factionId) ? node.id : null,
    losesOriginIncome: true
  });
  const actionSolvencyRejection = getAiActionSolvencyRejectionReason(actionForecast, {
    allowsTritiumRecovery: node.type === "tritium",
    allowsEmergencyExit: purpose === "escape",
    decisive: canAiBurnCreateImmediateDecisiveDamage(content, state, factionId, node, purpose)
  });

  if (actionSolvencyRejection !== null) {
    return actionSolvencyRejection;
  }

  const insolvencyRejection = getAiBurnInsolvencyRejectionReason(
    content,
    state,
    factionId,
    node,
    plan,
    purpose
  );

  if (insolvencyRejection !== null) {
    return insolvencyRejection;
  }

  const stealsShipyardProgress =
    node.type === "shipyard" &&
    (hasEnemyShipAtNode(state, node.id, factionId) ||
      (getShipyardProgress(state.shipyardProgress, node.id) > 0 &&
        getShipyardWorkerFactionId(state.shipyardProgress, node.id) !== factionId));

  if (purpose !== "escape" && (voluntarilyEntersContested || stealsShipyardProgress)) {
    const lineProjection = getAiBurnTacticalLineProjection(
      content,
      state,
      factionId,
      node,
      plan,
      purpose,
      getAiBurnTargetScore(state, content, node, factionId, purpose) + getAiBurnWindowScore(plan)
    );
    const provenOverride = canAiAcceptProvenTacticalLine(lineProjection);

    if (!lineProjection.accepted && !provenOverride) {
      return `burn:${lineProjection.reason}`;
    }

    if (lineProjection.reserveViolation && !provenOverride) {
      return "burn:reserve-violation-not-forced";
    }

    if (voluntarilyEntersContested && !lineProjection.contestedSustainable && !provenOverride) {
      return "contested-entry:line-unsustainable";
    }
  }

  if (purpose === "escape") {
    return remainingDv - committedContestedUpkeep < 0 ? "contested-upkeep-reserve" : null;
  }

  if (
    getFactionDv(state, factionId) <= AI_CRITICAL_DV &&
    !canAiAcceptCriticalDvForAction(content, state, factionId, node, purpose)
  ) {
    return "critical-dv";
  }

  if (
    remainingDv - committedContestedUpkeep <
    getAiStrategicReserveFloor(content, state, factionId, node, purpose)
  ) {
    return "reserve";
  }

  return null;
}

function getAiBurnInsolvencyRejectionReason(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  purpose: AiBurnPurpose,
  decisive = false
): string | null {
  if (purpose === "escape") {
    return null;
  }

  const projection = getAiBurnInsolvencyProjection(
    content,
    state,
    factionId,
    destinationNode,
    plan,
    purpose,
    decisive
  );

  if (
    (projection.projectedDvAfterAction <= 0 || projection.projectedDvAtHorizon <= 0) &&
    !projection.reachableFallbackTritium &&
    !projection.decisiveDamage
  ) {
    return "burn:insolvency-guard";
  }

  return null;
}

function getAiBurnInsolvencyProjection(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  purpose: AiBurnPurpose,
  decisive: boolean
): AiInsolvencyGuardProjection {
  const currentDv = getProjectedFactionDv(state, factionId, plan.originNodeId);
  const projectedDvAfterAction = currentDv - plan.burnCost;
  const projectedIncome =
    getExpectedNextTritiumIncome(content, state, factionId, [plan.originNodeId]) *
    AI_INSOLVENCY_GUARD_HORIZON_TURNS;
  const expectedContestedUpkeep =
    getProjectedFactionContestedShipCountAfterEntry(
      state,
      factionId,
      hasEnemyShipAtNode(state, destinationNode.id, factionId) ? destinationNode.id : null
    ) *
    contestedUpkeepDvCost *
    AI_INSOLVENCY_GUARD_HORIZON_TURNS;
  const incomingMissiles = [...state.pendingFireOrders, ...state.activeMissiles].filter(
    (missile) => missile.targetFactionId === factionId
  ).length;
  const requiredEvadeReserve = incomingMissiles * automaticEvadeDvCost;
  const mandatoryLaunchReserve =
    state.mandatoryLaunches.filter((launch) => launch.factionId === factionId).length *
    AI_MIN_DV_RESERVE;
  const projectedDvAtHorizon =
    projectedDvAfterAction +
    projectedIncome -
    expectedContestedUpkeep -
    requiredEvadeReserve -
    mandatoryLaunchReserve;
  const destinationIsRecoverableTritium =
    destinationNode.type === "tritium" &&
    !hasEnemyShipAtNode(state, destinationNode.id, factionId) &&
    getAiTritiumNodeKnownThreatSurvival(content, state, factionId, destinationNode.id, {
      arrivalTurn: plan.arrivalTurn,
      firstWorkTurnOffset: Math.max(1, plan.arrivalTurn - state.turn + 1),
      projectedDvAfterCommitment: projectedDvAfterAction,
      excludedIncomeNodeIds: [plan.originNodeId]
    }).survivesKnownThreats;
  const reachableFallbackTritium =
    destinationIsRecoverableTritium ||
    hasReliableTritiumAfterLeavingNodes(content, state, factionId, [plan.originNodeId]) ||
    hasAffordableFallbackTritiumBurn(
      content,
      state,
      factionId,
      destinationNode.id,
      Math.max(0, projectedDvAfterAction)
    );
  const decisiveDamage =
    decisive ||
    canAiBurnCreateImmediateDecisiveDamage(content, state, factionId, destinationNode, purpose);

  return {
    currentDv,
    projectedDvAfterAction,
    projectedIncome,
    projectedUpkeep: expectedContestedUpkeep,
    requiredEvadeReserve,
    mandatoryLaunchReserve,
    projectedDvAtHorizon,
    reachableFallbackTritium,
    decisiveDamage
  };
}

function canAiBurnCreateImmediateDecisiveDamage(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  destinationNode: SimulationContent["nodes"][number],
  purpose: AiBurnPurpose
): boolean {
  if (
    purpose === "shipyard-recovery" &&
    destinationNode.type === "shipyard" &&
    getFactionControlledShipyardNodeIds(content, state, factionId).length === 0
  ) {
    return true;
  }

  if (!hasEnemyShipAtNode(state, destinationNode.id, factionId)) {
    return false;
  }

  const enemyFactionId = getPrimaryEnemyFactionAtNode(state, destinationNode.id, factionId);

  if (enemyFactionId === null) {
    return false;
  }

  const enemyTritiumAccess = getFactionAccessibleTritiumNodeIds(
    content,
    state,
    enemyFactionId
  ).length;
  const shipyardProgress = getShipyardProgress(state.shipyardProgress, destinationNode.id);

  return (
    (destinationNode.type === "tritium" && enemyTritiumAccess <= 1) ||
    (destinationNode.type === "shipyard" && shipyardProgress >= shipyardCompletionProgress - 1)
  );
}

function getAiLastTritiumDepartureRejectionReason(
  state: GameState,
  content: SimulationContent,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  factionId: FactionId,
  purpose: AiBurnPurpose
): string | null {
  if (purpose === "escape") {
    return null;
  }

  const originNode = getNodeById(content, plan.originNodeId);

  if (originNode?.type !== "tritium") {
    return null;
  }

  const activeTritiumNodeIds = getFactionAccessibleTritiumNodeIds(content, state, factionId);

  if (activeTritiumNodeIds.length !== 1 || activeTritiumNodeIds[0] !== plan.originNodeId) {
    return null;
  }

  const imminentMissiles = [...state.pendingFireOrders, ...state.activeMissiles].filter(
    (missile) => {
      return (
        missile.targetFactionId === factionId &&
        missile.targetNodeId === plan.originNodeId &&
        missile.impactTurn <= state.turn + 1
      );
    }
  );
  const availableAfterUpkeep =
    getProjectedFactionDv(state, factionId, plan.originNodeId) -
    getProjectedFactionContestedUpkeepCost(state, factionId);

  if (
    imminentMissiles.length === 1 &&
    availableAfterUpkeep >= automaticEvadeDvCost &&
    plan.burnCost > automaticEvadeDvCost
  ) {
    return "AI_LAST_TRITIUM_EVADE_PREFERRED";
  }

  if (isImmediateAiLethalThreatAtNode(state, plan.originNodeId, factionId)) {
    if (destinationNode.type !== "tritium") {
      return hasReliableTritiumAfterLeavingNodes(content, state, factionId, [plan.originNodeId])
        ? null
        : "AI_TRITIUM_SURVIVAL_REQUIRED";
    }

    const projectedDvAfterBurn =
      getProjectedFactionDv(state, factionId, plan.originNodeId) - plan.burnCost;
    const destinationSurvival = getAiTritiumNodeKnownThreatSurvival(
      content,
      state,
      factionId,
      destinationNode.id,
      {
        arrivalTurn: plan.arrivalTurn,
        firstWorkTurnOffset: Math.max(1, plan.arrivalTurn - state.turn + 1),
        projectedDvAfterCommitment: projectedDvAfterBurn,
        excludedIncomeNodeIds: [plan.originNodeId]
      }
    );

    return destinationSurvival.survivesKnownThreats ? null : "AI_TRITIUM_SURVIVAL_REQUIRED";
  }

  if (destinationNode.type === "tritium") {
    const projectedDvAfterBurn =
      getProjectedFactionDv(state, factionId, plan.originNodeId) - plan.burnCost;
    const destinationSurvival = getAiTritiumNodeKnownThreatSurvival(
      content,
      state,
      factionId,
      destinationNode.id,
      {
        arrivalTurn: plan.arrivalTurn,
        firstWorkTurnOffset: Math.max(1, plan.arrivalTurn - state.turn + 1),
        projectedDvAfterCommitment: projectedDvAfterBurn,
        excludedIncomeNodeIds: [plan.originNodeId]
      }
    );

    return destinationSurvival.survivesKnownThreats ? null : "AI_TRITIUM_SURVIVAL_REQUIRED";
  }

  if (hasReliableTritiumAfterLeavingNodes(content, state, factionId, [plan.originNodeId])) {
    return null;
  }

  const remainingDv = getProjectedFactionDv(state, factionId, plan.originNodeId) - plan.burnCost;
  const recoversMissingShipyard =
    purpose === "shipyard-recovery" &&
    destinationNode.type === "shipyard" &&
    !hasEnemyShipAtNode(state, destinationNode.id, factionId) &&
    getFactionControlledShipyardNodeIds(content, state, factionId).length === 0 &&
    remainingDv >= 0;

  if (recoversMissingShipyard) {
    return null;
  }

  return "AI_TRITIUM_SURVIVAL_REQUIRED";
}

function getAiSecondTritiumDepartureRejectionReason(
  state: GameState,
  content: SimulationContent,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  factionId: FactionId,
  purpose: AiBurnPurpose,
  shipCount = 1
): string | null {
  if (purpose === "escape") {
    return null;
  }

  const originNode = getNodeById(content, plan.originNodeId);

  if (originNode?.type !== "tritium") {
    return null;
  }

  const sustainableTritiumNodeIds = getAiSustainableTritiumNodeIds(content, state, factionId);

  if (
    sustainableTritiumNodeIds.length === 0 ||
    sustainableTritiumNodeIds.length >= 3 ||
    !sustainableTritiumNodeIds.includes(plan.originNodeId)
  ) {
    return null;
  }

  const destinationCreatesSustainablePath =
    destinationNode.type === "tritium" &&
    destinationNode.id !== plan.originNodeId &&
    !hasEnemyShipAtNode(state, destinationNode.id, factionId) &&
    !isNodeContested(state.nodeOccupancies, destinationNode.id) &&
    getAiTritiumNodeKnownThreatSurvival(content, state, factionId, destinationNode.id, {
      arrivalTurn: plan.arrivalTurn,
      firstWorkTurnOffset: Math.max(1, plan.arrivalTurn - state.turn + 1),
      projectedDvAfterCommitment:
        getProjectedFactionDv(state, factionId, plan.originNodeId) - plan.burnCost,
      excludedIncomeNodeIds: [plan.originNodeId]
    }).survivesKnownThreats;

  const offensiveDepartureIsSolvent = canAiUseSecondTritiumOffensiveDepartureException(
    state,
    content,
    destinationNode,
    plan,
    factionId,
    sustainableTritiumNodeIds,
    shipCount
  );

  return destinationCreatesSustainablePath || offensiveDepartureIsSolvent
    ? null
    : "AI_SECOND_TRITIUM_PROTECTION_REQUIRED";
}

function canAiUseSecondTritiumOffensiveDepartureException(
  state: GameState,
  content: SimulationContent,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan,
  factionId: FactionId,
  sustainableTritiumNodeIds: readonly string[],
  shipCount: number
): boolean {
  if (
    shipCount !== 1 ||
    sustainableTritiumNodeIds.length !== 2 ||
    !sustainableTritiumNodeIds.includes(plan.originNodeId) ||
    destinationNode.type !== "tritium" ||
    hasFactionShipAtNode(state, destinationNode.id, factionId) ||
    !hasEnemyShipAtNode(state, destinationNode.id, factionId) ||
    isNodeContested(state.nodeOccupancies, destinationNode.id) ||
    hasPendingSecondTritiumOffensiveDeparture(state, content, factionId)
  ) {
    return false;
  }

  const remainingSafeTritiumNodeId = sustainableTritiumNodeIds.find(
    (nodeId) => nodeId !== plan.originNodeId
  );
  const targetFactionId = getPrimaryEnemyFactionAtNode(state, destinationNode.id, factionId);

  if (
    remainingSafeTritiumNodeId === undefined ||
    !hasFactionShipAtNode(state, remainingSafeTritiumNodeId, factionId) ||
    isNodeContested(state.nodeOccupancies, remainingSafeTritiumNodeId) ||
    targetFactionId === null ||
    getAiExpectedDeniedWorkValue(state, destinationNode, targetFactionId) < tritiumWorkOutput
  ) {
    return false;
  }

  const expectedContestedShipCount = getProjectedFactionContestedShipCountAfterEntry(
    state,
    factionId,
    destinationNode.id
  );
  const twoUpkeepReserve =
    expectedContestedShipCount * contestedUpkeepDvCost * AI_CONTESTED_SUSTAIN_TURNS;
  const exitBurnCost = getAiProjectedContestedExitBurnCost(
    content,
    state,
    factionId,
    destinationNode.id,
    plan.arrivalTurn + AI_CONTESTED_SUSTAIN_TURNS
  );

  if (exitBurnCost === null) {
    return false;
  }

  const availableDv = getProjectedFactionDv(state, factionId, plan.originNodeId);

  return availableDv - plan.burnCost - twoUpkeepReserve - exitBurnCost >= 0;
}

function hasPendingSecondTritiumOffensiveDeparture(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): boolean {
  return state.pendingBurnOrders.some((order) => {
    const originNode = getNodeById(content, order.originNodeId);
    const destinationNode = getNodeById(content, order.destinationNodeId);

    return (
      order.factionId === factionId &&
      originNode?.type === "tritium" &&
      destinationNode?.type === "tritium" &&
      hasEnemyShipAtNode(state, order.destinationNodeId, factionId)
    );
  });
}

function getAiProjectedContestedExitBurnCost(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string,
  departureTurn: number
): number | null {
  const costs = content.nodes.flatMap((destination) => {
    if (
      destination.id === originNodeId ||
      !destination.contestable ||
      destination.protectedNoWar ||
      hasEnemyShipAtNode(state, destination.id, factionId) ||
      isNodeContested(state.nodeOccupancies, destination.id)
    ) {
      return [];
    }

    const exitPlan = calculateBurnPlan(content, departureTurn, originNodeId, destination.id);

    return exitPlan === null ? [] : [exitPlan.burnCost];
  });

  return costs.length === 0 ? null : Math.min(...costs);
}

function getAiContestedSustainabilityCheck(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  node: SimulationContent["nodes"][number],
  options: Readonly<{
    entryNodeId?: string | null;
    excludedIncomeNodeIds?: readonly string[];
    currentDvReserve?: number;
  }> = {}
): AiContestedSustainabilityCheck {
  const excludedIncomeNodeIds = options.excludedIncomeNodeIds ?? [];
  const currentDvReserve = options.currentDvReserve ?? getProjectedFactionDv(state, factionId);
  const expectedContestedShipCount = getProjectedFactionContestedShipCountAfterEntry(
    state,
    factionId,
    options.entryNodeId ?? null
  );
  const expectedUpkeepCost = expectedContestedShipCount * contestedUpkeepDvCost;
  const activeTritiumIncome = getExpectedNextTritiumIncome(
    content,
    state,
    factionId,
    excludedIncomeNodeIds
  );
  const projectedDvAfterUpkeep = currentDvReserve + activeTritiumIncome - expectedUpkeepCost;
  const projectedDvAfterTwoUpkeeps =
    currentDvReserve +
    activeTritiumIncome * AI_CONTESTED_SUSTAIN_TURNS -
    expectedUpkeepCost * AI_CONTESTED_SUSTAIN_TURNS;
  const hasFallbackTritium =
    activeTritiumIncome > 0 ||
    hasReliableTritiumAfterLeavingNodes(content, state, factionId, excludedIncomeNodeIds) ||
    hasAffordableFallbackTritiumBurn(content, state, factionId, node.id, projectedDvAfterUpkeep);
  const canLeaveNextTurn = hasAffordableContestedExitBurn(
    content,
    state,
    factionId,
    node.id,
    Math.max(0, projectedDvAfterUpkeep)
  );
  const hasSurvivalRoute = hasFallbackTritium || canLeaveNextTurn;
  const lastRelevantShip = isFactionLastRelevantShip(content, state, factionId);
  const tritiumCollapseRisk = lastRelevantShip && !hasFallbackTritium;
  const enemyCanAffordUpkeepBetter = canAnyEnemyOutlastContested(
    content,
    state,
    factionId,
    projectedDvAfterUpkeep,
    activeTritiumIncome
  );
  const enemyProductiveNodesWorking = getEnemyWorkingProductiveNodeCount(content, state, factionId);
  const contestedHurtsEnemyProduction =
    isProductiveNode(node) &&
    hasEnemyShipAtNode(state, node.id, factionId) &&
    !getEnemyFactionIds(state, factionId).some((enemyFactionId) =>
      hasPendingAction(state, node.id, enemyFactionId)
    );
  const reason =
    projectedDvAfterTwoUpkeeps < 0
      ? "CONTESTED_REJECTED_UNSUSTAINABLE"
      : !hasSurvivalRoute
        ? "CONTESTED_REJECTED_UNSUSTAINABLE"
        : tritiumCollapseRisk
          ? "CONTESTED_COLLAPSE_RISK"
          : enemyCanAffordUpkeepBetter &&
              enemyProductiveNodesWorking >= 2 &&
              !contestedHurtsEnemyProduction
            ? "CONTESTED_COLLAPSE_RISK"
            : projectedDvAfterUpkeep < AI_MIN_DV_RESERVE && !contestedHurtsEnemyProduction
              ? "CONTESTED_REJECTED_UNSUSTAINABLE"
              : null;

  return {
    nodeId: node.id,
    reason,
    sustainable: reason === null,
    currentDvReserve,
    activeTritiumIncome,
    hasFallbackTritium,
    expectedUpkeepCost,
    projectedDvAfterUpkeep,
    projectedDvAfterTwoUpkeeps,
    hasSurvivalRoute,
    canLeaveNextTurn,
    lastRelevantShip,
    tritiumCollapseRisk,
    enemyCanAffordUpkeepBetter,
    enemyProductiveNodesWorking,
    contestedHurtsEnemyProduction
  };
}

function hasAffordableFallbackTritiumBurn(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string,
  availableDv: number
): boolean {
  if (availableDv <= 0) {
    return false;
  }

  return content.nodes.some((destination) => {
    if (
      destination.id === originNodeId ||
      destination.type !== "tritium" ||
      hasEnemyShipAtNode(state, destination.id, factionId) ||
      isNodeContested(state.nodeOccupancies, destination.id)
    ) {
      return false;
    }

    const plan = calculateBurnPlan(content, state, originNodeId, destination.id);

    return plan !== null && plan.burnCost <= availableDv;
  });
}

function isFactionLastRelevantShip(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): boolean {
  const totalShipCount =
    state.nodeOccupancies
      .filter((occupancy) => occupancy.factionId === factionId)
      .reduce((total, occupancy) => total + occupancy.shipCount, 0) +
    state.activeBurnTransits
      .filter((transit) => transit.factionId === factionId)
      .reduce((total, transit) => total + transit.shipCount, 0);

  return totalShipCount <= 1 || getFactionProductiveShipCount(content, state, factionId) <= 1;
}

function canAnyEnemyOutlastContested(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  projectedDvAfterUpkeep: number,
  activeTritiumIncome: number
): boolean {
  return getEnemyFactionIds(state, factionId).some((enemyFactionId) => {
    const enemyAfterUpkeep =
      getProjectedFactionDv(state, enemyFactionId) +
      getExpectedNextTritiumIncome(content, state, enemyFactionId) -
      getProjectedFactionContestedUpkeepCost(state, enemyFactionId);
    const enemyIncome = getExpectedNextTritiumIncome(content, state, enemyFactionId);

    return (
      enemyAfterUpkeep >= projectedDvAfterUpkeep + contestedUpkeepDvCost &&
      enemyIncome >= activeTritiumIncome
    );
  });
}

function getEnemyWorkingProductiveNodeCount(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): number {
  return content.nodes.filter(isProductiveNode).filter((node) => {
    return getEnemyFactionIds(state, factionId).some((enemyFactionId) => {
      return (
        hasFactionShipAtNode(state, node.id, enemyFactionId) &&
        !isNodeContested(state.nodeOccupancies, node.id) &&
        !hasPendingAction(state, node.id, enemyFactionId)
      );
    });
  }).length;
}

function isImmediateAiLethalThreatAtNode(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): boolean {
  const nextTurn = state.turn + 1;
  const imminentMissiles = state.activeMissiles.filter((missile) => {
    return (
      missile.targetNodeId === nodeId &&
      missile.targetFactionId === factionId &&
      missile.impactTurn <= nextTurn
    );
  }).length;
  const availableDvAfterUpkeep =
    getProjectedFactionDv(state, factionId, nodeId) -
    getProjectedFactionContestedUpkeepCost(state, factionId);

  return (
    isNodeContested(state.nodeOccupancies, nodeId) ||
    getIncomingEnemyBurnsToNode(state, nodeId, factionId, nextTurn).length > 0 ||
    imminentMissiles * automaticEvadeDvCost > availableDvAfterUpkeep
  );
}

function hasReliableTritiumAfterLeavingNodes(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  excludedNodeIds: readonly string[]
): boolean {
  const excluded = new Set(excludedNodeIds);
  const currentDv = getProjectedFactionDv(state, factionId);
  const hasSafeCurrentTritium = getFactionAccessibleTritiumNodeIds(content, state, factionId).some(
    (nodeId) => {
      if (excluded.has(nodeId)) {
        return false;
      }

      return getAiTritiumNodeKnownThreatSurvival(content, state, factionId, nodeId, {
        arrivalTurn: state.turn,
        firstWorkTurnOffset: 1,
        projectedDvAfterCommitment: currentDv,
        excludedIncomeNodeIds: excludedNodeIds
      }).survivesKnownThreats;
    }
  );

  if (hasSafeCurrentTritium) {
    return true;
  }

  return [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
    const destinationNode = getNodeById(content, order.destinationNodeId);

    return (
      order.factionId === factionId &&
      !excluded.has(order.destinationNodeId) &&
      destinationNode?.type === "tritium" &&
      getAiTritiumNodeKnownThreatSurvival(content, state, factionId, destinationNode.id, {
        arrivalTurn: order.arrivalTurn,
        firstWorkTurnOffset: Math.max(1, order.arrivalTurn - state.turn + 1),
        projectedDvAfterCommitment: currentDv,
        excludedIncomeNodeIds: excludedNodeIds
      }).survivesKnownThreats
    );
  });
}

function getAiVoluntaryContestedEntryEconomy(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  plan: BurnPlan,
  factionId: FactionId,
  excludedIncomeNodeIds: readonly string[],
  purpose: AiBurnPurpose
): Readonly<{ reason: string | null; projectedDvAfterBurnAndUpkeep: number }> {
  const projectedDv = getProjectedFactionDv(state, factionId, plan.originNodeId);
  const remainingDv = projectedDv - plan.burnCost;
  const tritiumAccess = getFactionAccessibleTritiumNodeIds(content, state, factionId).length;
  const projectedContestedShips = getProjectedFactionContestedShipCountAfterEntry(
    state,
    factionId,
    node.id
  );
  const projectedContestedUpkeep = projectedContestedShips * contestedUpkeepDvCost;
  const expectedNextIncome = getExpectedNextTritiumIncome(
    content,
    state,
    factionId,
    excludedIncomeNodeIds
  );
  const projectedDvAfterBurnAndUpkeep = remainingDv + expectedNextIncome - projectedContestedUpkeep;
  const posture = getAiStrategicPosture(content, state, factionId);
  const isEmergencyShipyardAction =
    node.type === "shipyard" &&
    (purpose === "shipyard-recovery" || posture === "shipyard-emergency");
  const reserveFloor = getAiStrategicReserveFloor(content, state, factionId, node, purpose);
  const sustainability = getAiContestedSustainabilityCheck(content, state, factionId, node, {
    entryNodeId: node.id,
    excludedIncomeNodeIds,
    currentDvReserve: remainingDv
  });

  if (getFactionDv(state, factionId) <= AI_CRITICAL_DV && !isEmergencyShipyardAction) {
    return { reason: "contested-entry:critical-dv", projectedDvAfterBurnAndUpkeep };
  }

  if (tritiumAccess === 0 && !isEmergencyShipyardAction) {
    return { reason: "contested-entry:no-tritium-access", projectedDvAfterBurnAndUpkeep };
  }

  if (node.type === "barren" || node.type === "protected") {
    return { reason: "contested-entry:barren-low-value", projectedDvAfterBurnAndUpkeep };
  }

  if (sustainability.reason === "CONTESTED_REJECTED_UNSUSTAINABLE") {
    return {
      reason: "contested-entry:CONTESTED_REJECTED_UNSUSTAINABLE",
      projectedDvAfterBurnAndUpkeep
    };
  }

  const maxContestedShips = isEmergencyShipyardAction
    ? 2
    : getFactionDv(state, factionId) <= AI_MIN_DV_RESERVE + contestedUpkeepDvCost ||
        tritiumAccess <= 1
      ? 1
      : 2;

  if (projectedContestedShips > maxContestedShips) {
    return {
      reason:
        maxContestedShips === 1
          ? "contested-entry:cap-low-economy"
          : "contested-entry:cap-stable-economy",
      projectedDvAfterBurnAndUpkeep
    };
  }

  if (projectedDvAfterBurnAndUpkeep < reserveFloor) {
    return { reason: "contested-entry:upkeep-budget", projectedDvAfterBurnAndUpkeep };
  }

  if (sustainability.reason === "CONTESTED_EXIT_REQUIRED") {
    return {
      reason: "contested-entry:CONTESTED_EXIT_REQUIRED",
      projectedDvAfterBurnAndUpkeep
    };
  }

  if (sustainability.reason === "CONTESTED_COLLAPSE_RISK") {
    return {
      reason: "contested-entry:CONTESTED_COLLAPSE_RISK",
      projectedDvAfterBurnAndUpkeep
    };
  }

  return { reason: null, projectedDvAfterBurnAndUpkeep };
}

function hasAffordableContestedExitBurn(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  originNodeId: string,
  availableDv: number
): boolean {
  return content.nodes.some((destination) => {
    if (
      destination.id === originNodeId ||
      !destination.contestable ||
      destination.protectedNoWar ||
      hasEnemyShipAtNode(state, destination.id, factionId) ||
      isNodeContested(state.nodeOccupancies, destination.id)
    ) {
      return false;
    }

    const plan = calculateBurnPlan(content, state, originNodeId, destination.id);

    return plan !== null && plan.burnCost <= availableDv;
  });
}

function getAiBurnTargetScore(
  state: GameState,
  content: SimulationContent,
  node: SimulationContent["nodes"][number],
  factionId: FactionId,
  purpose: AiBurnPurpose
): number {
  const isNeutral = !state.nodeOccupancies.some((occupancy) => {
    return occupancy.nodeId === node.id && occupancy.shipCount > 0;
  });
  const hasEnemyShip = hasEnemyShipAtNode(state, node.id, factionId);

  if (purpose === "escape") {
    const hasActiveTritium =
      getFactionAccessibleTritiumNodeIds(content, state, factionId).length > 0;

    if (node.type === "tritium") {
      return hasActiveTritium ? 70 : 130;
    }

    return node.type === "barren" ? 80 : 10;
  }

  if (purpose === "shipyard-recovery") {
    if (node.type === "shipyard") {
      const progress = getShipyardProgress(state.shipyardProgress, node.id);
      return 900 + progress * 80 + (hasEnemyShip ? 420 : 0) + (isNeutral ? 120 : 0);
    }

    return 0;
  }

  if (isNeutral && node.type === "tritium") {
    return 500;
  }

  if (isNeutral && node.type === "shipyard") {
    return 400 + getShipyardProgress(state.shipyardProgress, node.id);
  }

  if (hasEnemyShip && node.type === "tritium") {
    return 300;
  }

  if (hasEnemyShip && node.type === "shipyard") {
    return 420 + getShipyardProgress(state.shipyardProgress, node.id);
  }

  if (node.type === "barren") {
    const stagingPressureScore = getAiStagingPressureScore(content, state, node.id, factionId);
    return stagingPressureScore > 0 ? 70 + stagingPressureScore : 50;
  }

  return 0;
}

function evaluateBurnAwayDestination(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId,
  originNodeId: string,
  destinationNode: SimulationContent["nodes"][number],
  plan: BurnPlan
): AiBurnAwayDestinationEvaluation {
  const projectedDvAfterArrival =
    getProjectedFactionDv(state, factionId, originNodeId) -
    plan.burnCost -
    getProjectedFactionContestedUpkeepCost(state, factionId);
  const projectedContestRisk =
    hasEnemyShipAtNode(state, destinationNode.id, factionId) ||
    isNodeContested(state.nodeOccupancies, destinationNode.id) ||
    getIncomingEnemyBurnsToNode(state, destinationNode.id, factionId, plan.arrivalTurn).length >
      0 ||
    isTritiumFallbackEasilyContestable(
      content,
      state,
      factionId,
      destinationNode.id,
      plan.arrivalTurn
    );
  const symmetricEscapeRisk = getEnemyFactionIds(state, factionId).some((enemyFactionId) => {
    return (
      hasFactionShipAtNode(state, originNodeId, enemyFactionId) &&
      getLegalBurnPlan(content, state, originNodeId, destinationNode.id, enemyFactionId) !== null
    );
  });
  const breaksMissileSolution = [...state.pendingFireOrders, ...state.activeMissiles].some(
    (missile) => {
      return missile.targetFactionId === factionId && missile.targetNodeId === originNodeId;
    }
  );
  const isTritium = destinationNode.type === "tritium";
  const isProductive = isProductiveNode(destinationNode);
  const knownThreatSurvival = isTritium
    ? getAiTritiumNodeKnownThreatSurvival(content, state, factionId, destinationNode.id, {
        arrivalTurn: plan.arrivalTurn,
        firstWorkTurnOffset: Math.max(1, plan.arrivalTurn - state.turn + 1),
        projectedDvAfterCommitment: projectedDvAfterArrival,
        excludedIncomeNodeIds: [originNodeId]
      })
    : null;
  const isSafe =
    !hasEnemyShipAtNode(state, destinationNode.id, factionId) &&
    !isNodeContested(state.nodeOccupancies, destinationNode.id) &&
    (knownThreatSurvival?.survivesKnownThreats ?? !projectedContestRisk);
  const projectedIncomeAfterArrival = isSafe && isTritium ? tritiumWorkOutput : 0;
  const projectedDvAfterFirstUpkeep = projectedDvAfterArrival - contestedUpkeepDvCost;
  const solventTritiumRecovery =
    isTritium &&
    isSafe &&
    projectedDvAfterFirstUpkeep >= 0 &&
    hasAffordableContestedExitBurn(
      content,
      state,
      factionId,
      destinationNode.id,
      projectedDvAfterFirstUpkeep
    );
  const supportsRecovery =
    solventTritiumRecovery ||
    hasReliableTritiumAfterLeavingNodes(content, state, factionId, [originNodeId]) ||
    hasAffordableFallbackTritiumBurn(
      content,
      state,
      factionId,
      destinationNode.id,
      Math.max(0, projectedDvAfterArrival)
    );
  const supportsFinishMode =
    hasEnemyShipAtNode(state, destinationNode.id, factionId) &&
    isProductive &&
    getFactionAccessibleTritiumNodeIds(content, state, factionId).length > 0;
  const score =
    120 +
    (isTritium ? 760 : isProductive ? 360 : 80) +
    (isSafe ? 420 : -120) +
    (breaksMissileSolution ? 260 : 0) +
    (supportsRecovery ? 260 : -540) +
    (supportsFinishMode ? 180 : 0) +
    projectedIncomeAfterArrival * 90 +
    projectedDvAfterArrival * 12 -
    (projectedContestRisk ? 520 : 0) -
    (symmetricEscapeRisk ? 640 : 0) -
    plan.burnCost * 34 -
    plan.etaTurns * 26;
  const reason = [
    isTritium ? "tritium" : isProductive ? "productive" : "barren",
    isSafe ? "safe" : "unsafe",
    projectedContestRisk ? "contest-risk" : "no-contest-risk",
    symmetricEscapeRisk ? "symmetric-escape-risk" : "asymmetric",
    breaksMissileSolution ? "breaks-missile-solution" : "no-missile-solution",
    supportsRecovery ? "supports-recovery" : "no-recovery-support"
  ].join(":");

  return {
    isTritium,
    isProductive,
    isSafe,
    projectedContestRisk,
    symmetricEscapeRisk,
    projectedDvAfterArrival,
    projectedIncomeAfterArrival,
    breaksMissileSolution,
    supportsRecovery,
    supportsFinishMode,
    score,
    reason
  };
}

function getAiProductivePathBurnBonus(
  state: GameState,
  content: SimulationContent,
  originNodeId: string,
  node: SimulationContent["nodes"][number],
  plan: BurnPlan,
  factionId: FactionId,
  purpose: AiBurnPurpose
): number {
  if (!isProductiveNode(node) || hasFactionShipAtNode(state, node.id, factionId)) {
    return 0;
  }

  const originNode = getNodeById(content, originNodeId);
  const originIsWorkingProductive =
    originNode !== undefined &&
    getAiPotentialWorkOpportunityValue(state, originNode, factionId) > 0;

  if (purpose === "expansion" && !originIsWorkingProductive) {
    const productiveTypeBonus = node.type === "tritium" ? 250 : 190;
    const neutralBonus = hasEnemyShipAtNode(state, node.id, factionId) ? 0 : 180;

    return 520 + productiveTypeBonus + neutralBonus - plan.etaTurns * 34 - plan.burnCost * 26;
  }

  if (purpose === "escape") {
    return node.type === "tritium" ? 80 : 45;
  }

  return 0;
}

function getAiStagingPressureScore(
  content: SimulationContent,
  state: GameState,
  stagingNodeId: string,
  factionId: FactionId
): number {
  const threatenedNodes = content.nodes.filter((node) => {
    if (!isProductiveNode(node) || !hasEnemyShipAtNode(state, node.id, factionId)) {
      return false;
    }

    return calculateFirePlan(content, state, stagingNodeId, node.id) !== null;
  });

  if (threatenedNodes.length < 2) {
    return 0;
  }

  return threatenedNodes.reduce((score, node) => {
    const progress = getShipyardProgress(state.shipyardProgress, node.id);
    return score + 110 + (node.type === "shipyard" ? 80 + progress * 16 : 40);
  }, 0);
}

function getAvoidedShipyardCompletionReason(
  state: GameState,
  content: SimulationContent,
  nodeId: string,
  factionId: FactionId
): string | null {
  if (getShipyardProgress(state.shipyardProgress, nodeId) < shipyardCompletionProgress - 1) {
    return null;
  }

  const producedState: GameState = {
    ...state,
    nodeOccupancies: produceShipAtShipyard(state.nodeOccupancies, nodeId, factionId)
  };
  const launch = chooseMandatoryLaunchBurn(
    content,
    producedState,
    nodeId,
    factionId,
    `mandatory-precheck:${factionId}:${nodeId}:T${state.turn + 1}`
  );

  if (launch === null) {
    return "mandatory-launch:no-affordable-launch-next-turn";
  }

  const projectedDvAfterLaunch =
    getProjectedFactionDv(producedState, factionId, nodeId) -
    getFactionContestedUpkeepCost(state, factionId) -
    launch.order.burnCost;

  return projectedDvAfterLaunch < AI_MIN_DV_RESERVE ? "mandatory-launch:would-break-reserve" : null;
}

function getAiShipyardCompletionReserveAudits(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): readonly Readonly<{
  nodeId: string;
  launchAffordable: boolean;
  availableDvBeforeLaunch: number;
  committedBurnCost: number;
  contestedUpkeepCost: number;
  evadeCost: number;
}>[] {
  const committedBurnCost = state.pendingBurnOrders
    .filter((order) => order.factionId === factionId)
    .reduce((total, order) => total + order.burnCost, 0);
  const contestedUpkeepCost = getFactionContestedUpkeepCost(state, factionId);
  const evadeCost = getPlannedEvadeCostBeforeShipyardProduction(state, factionId);
  let projectedState: GameState = {
    ...state,
    factionDv: {
      ...state.factionDv,
      [factionId]: Math.max(0, getFactionDv(state, factionId) - contestedUpkeepCost - evadeCost)
    }
  };
  const audits: Array<{
    nodeId: string;
    launchAffordable: boolean;
    availableDvBeforeLaunch: number;
    committedBurnCost: number;
    contestedUpkeepCost: number;
    evadeCost: number;
  }> = [];

  for (const occupancy of state.nodeOccupancies) {
    const node = getNodeById(content, occupancy.nodeId);

    if (
      occupancy.factionId !== factionId ||
      occupancy.shipCount <= 0 ||
      node?.type !== "shipyard" ||
      getShipyardProgress(state.shipyardProgress, node.id) < shipyardCompletionProgress - 1 ||
      hasPendingAction(state, node.id, factionId) ||
      isNodeContested(state.nodeOccupancies, node.id)
    ) {
      continue;
    }

    const availableDvBeforeLaunch = getProjectedFactionDv(projectedState, factionId, node.id);
    const producedState: GameState = {
      ...projectedState,
      nodeOccupancies: produceShipAtShipyard(projectedState.nodeOccupancies, node.id, factionId)
    };
    const launch = chooseMandatoryLaunchBurn(
      content,
      producedState,
      node.id,
      factionId,
      `mandatory-reserve:${factionId}:${node.id}:T${state.turn + 1}:${audits.length}`
    );

    audits.push({
      nodeId: node.id,
      launchAffordable: launch !== null,
      availableDvBeforeLaunch,
      committedBurnCost,
      contestedUpkeepCost,
      evadeCost
    });

    if (launch !== null) {
      projectedState = {
        ...producedState,
        pendingBurnOrders: [...producedState.pendingBurnOrders, launch.order]
      };
    }
  }

  return audits;
}

function getPlannedEvadeCostBeforeShipyardProduction(
  state: GameState,
  factionId: FactionId
): number {
  const nextTurn = state.turn + 1;
  const plannedFullDepartureBurnOrigins = new Set(
    state.pendingBurnOrders
      .filter((order) => {
        if (order.factionId !== factionId) {
          return false;
        }

        const occupancy = state.nodeOccupancies.find((candidate) => {
          return candidate.nodeId === order.originNodeId && candidate.factionId === order.factionId;
        });

        return occupancy !== undefined && occupancy.shipCount <= order.shipCount;
      })
      .map((order) => order.originNodeId)
  );

  return (
    state.activeMissiles.filter((missile) => {
      return (
        missile.targetFactionId === factionId &&
        missile.impactTurn <= nextTurn &&
        !plannedFullDepartureBurnOrigins.has(missile.targetNodeId) &&
        !isNodeContested(state.nodeOccupancies, missile.targetNodeId)
      );
    }).length * automaticEvadeDvCost
  );
}

function getCriticalShipyardHoldReason(
  state: GameState,
  content: SimulationContent,
  factionId: FactionId
): string | null {
  if (getFactionDv(state, factionId) > AI_CRITICAL_DV) {
    return null;
  }

  return getFactionOccupiedTritiumNodeIds(content, state, factionId).length === 0
    ? "shipyard:critical-dv-no-tritium"
    : null;
}

function compareEnemyTargetOptions(
  first: Readonly<{ nodeId: string; score: number; etaTurns: number; burnCost?: number }>,
  second: Readonly<{ nodeId: string; score: number; etaTurns: number; burnCost?: number }>
): number {
  if (first.score !== second.score) {
    return second.score - first.score;
  }

  if (first.etaTurns !== second.etaTurns) {
    return first.etaTurns - second.etaTurns;
  }

  if ((first.burnCost ?? 0) !== (second.burnCost ?? 0)) {
    return (first.burnCost ?? 0) - (second.burnCost ?? 0);
  }

  return first.nodeId.localeCompare(second.nodeId);
}

function getAiBurnWindowScore(plan: BurnPlan): number {
  const windowScore =
    plan.transferWindowQuality === "favorable"
      ? 42
      : plan.transferWindowQuality === "unfavorable"
        ? -36
        : 0;
  const motionScore =
    plan.motionRelation === "moving-toward" ? 24 : plan.motionRelation === "moving-away" ? -20 : 0;
  const arcScore =
    plan.visualArcType === "clean-window" ? 18 : plan.visualArcType === "strained-window" ? -16 : 0;

  return windowScore + motionScore + arcScore - plan.burnCost * 5 - plan.etaTurns * 3;
}

function hasPendingAction(state: GameState, nodeId: string, factionId: FactionId): boolean {
  return [...state.pendingBurnOrders, ...state.pendingFireOrders].some((order) => {
    return order.originNodeId === nodeId && order.factionId === factionId;
  });
}

function getOpposingFactionId(factionId: FactionId): FactionId {
  return factionId === "player" ? "opponent" : "player";
}

function hasFactionShipAtNode(state: GameState, nodeId: string, factionId: FactionId): boolean {
  return state.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.nodeId === nodeId && occupancy.factionId === factionId && occupancy.shipCount > 0
    );
  });
}

function hasEnemyShipAtNode(state: GameState, nodeId: string, factionId: FactionId): boolean {
  return state.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.nodeId === nodeId && occupancy.factionId !== factionId && occupancy.shipCount > 0
    );
  });
}

function getPrimaryEnemyFactionAtNode(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): FactionId | null {
  return (
    state.nodeOccupancies
      .filter((occupancy) => {
        return (
          occupancy.nodeId === nodeId &&
          occupancy.factionId !== factionId &&
          occupancy.shipCount > 0
        );
      })
      .sort((first, second) => {
        if (first.shipCount !== second.shipCount) {
          return second.shipCount - first.shipCount;
        }

        return first.factionId.localeCompare(second.factionId);
      })[0]?.factionId ?? null
  );
}

function getFireTargetAtNode(
  state: GameState,
  plan: FirePlan,
  shooterFactionId: FactionId
): Readonly<{ factionId: FactionId; availableTurn: number }> | undefined {
  const currentOccupancy = state.nodeOccupancies.find((occupancy) => {
    return (
      occupancy.nodeId === plan.targetNodeId &&
      occupancy.factionId !== shooterFactionId &&
      occupancy.shipCount > 0
    );
  });

  if (currentOccupancy !== undefined) {
    return { factionId: currentOccupancy.factionId, availableTurn: plan.issuedTurn };
  }

  const futureBurnTargets = [...state.pendingBurnOrders, ...state.activeBurnTransits]
    .filter((order) => {
      return order.destinationNodeId === plan.targetNodeId && order.factionId !== shooterFactionId;
    })
    .sort((first, second) => {
      if (first.arrivalTurn !== second.arrivalTurn) {
        return first.arrivalTurn - second.arrivalTurn;
      }

      return first.factionId.localeCompare(second.factionId);
    });
  const futureBurnTarget = futureBurnTargets[0];

  return futureBurnTarget === undefined
    ? undefined
    : { factionId: futureBurnTarget.factionId, availableTurn: futureBurnTarget.arrivalTurn + 1 };
}

function adjustFirePlanForTargetAvailability(
  content: SimulationContent,
  plan: FirePlan,
  target: Readonly<{ availableTurn: number }>
): FirePlan {
  const impactTurn = Math.max(plan.impactTurn, target.availableTurn);

  if (impactTurn === plan.impactTurn) {
    return plan;
  }

  const targetNode = getNodeById(content, plan.targetNodeId);

  if (targetNode === undefined) {
    return plan;
  }

  return {
    ...plan,
    missileEtaTurns: impactTurn - plan.issuedTurn,
    impactTurn,
    targetPositionAtImpact: computeBodyPosition(content, targetNode.bodyId, impactTurn)
  };
}

function hasFireOrderTargetReference(
  state: GameState,
  occupancies: readonly NodeOccupancy[],
  activeBurnTransits: readonly ActiveBurnTransit[],
  order: PendingFireOrder,
  destroyedTransitIds: ReadonlySet<string>
): boolean {
  const currentOccupancy = occupancies.find((occupancy) => {
    return (
      occupancy.nodeId === order.targetNodeId &&
      occupancy.factionId === order.targetFactionId &&
      occupancy.shipCount > 0
    );
  });

  if (currentOccupancy !== undefined) {
    return true;
  }

  if (
    state.pendingBurnOrders.some((burnOrder) => {
      return (
        burnOrder.destinationNodeId === order.targetNodeId &&
        burnOrder.factionId === order.targetFactionId &&
        burnOrder.arrivalTurn < order.impactTurn
      );
    })
  ) {
    return true;
  }

  return activeBurnTransits.some((transit) => {
    return (
      !destroyedTransitIds.has(transit.id) &&
      transit.destinationNodeId === order.targetNodeId &&
      transit.factionId === order.targetFactionId &&
      transit.arrivalTurn < order.impactTurn
    );
  });
}

function hasAnyMissileTargetingNode(state: GameState, nodeId: string): boolean {
  return [...state.pendingFireOrders, ...state.activeMissiles].some((missile) => {
    return missile.targetNodeId === nodeId;
  });
}

function hasMissileTargetReference(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): boolean {
  if (hasFactionShipAtNode(state, nodeId, factionId)) {
    return true;
  }

  return [...state.pendingBurnOrders, ...state.activeBurnTransits].some((order) => {
    return order.destinationNodeId === nodeId && order.factionId === factionId;
  });
}

function countFactionShips(state: GameState, factionId: FactionId): number {
  const stationaryShips = state.nodeOccupancies
    .filter((occupancy) => occupancy.factionId === factionId)
    .reduce((total, occupancy) => total + occupancy.shipCount, 0);
  const shipsInTransit = state.activeBurnTransits
    .filter((transit) => transit.factionId === factionId)
    .reduce((total, transit) => total + transit.shipCount, 0);

  return stationaryShips + shipsInTransit;
}

function sumDebugAmounts(
  debugEvents: readonly TurnDebugEvent[],
  eventType: TurnDebugEvent["type"]
): number {
  return debugEvents
    .filter((event) => event.type === eventType)
    .reduce((total, event) => total + (event.amount ?? 0), 0);
}

function getContestedNodeIds(occupancies: readonly NodeOccupancy[]): readonly string[] {
  return [...new Set(occupancies.map((occupancy) => occupancy.nodeId))]
    .filter((nodeId) => isNodeContested(occupancies, nodeId))
    .sort();
}

function getFactionContestedUpkeepCost(state: GameState, factionId: FactionId): number {
  return state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        isNodeContested(state.nodeOccupancies, occupancy.nodeId)
      );
    })
    .reduce((total, occupancy) => total + contestedUpkeepDvCost * occupancy.shipCount, 0);
}

function getProjectedFactionContestedUpkeepCost(state: GameState, factionId: FactionId): number {
  return (
    getProjectedFactionContestedShipCountAfterEntry(state, factionId, null) * contestedUpkeepDvCost
  );
}

function getProjectedFactionContestedShipCountAfterEntry(
  state: GameState,
  factionId: FactionId,
  entryNodeId: string | null
): number {
  const pendingLeaveOrigins = new Set(
    state.pendingBurnOrders
      .filter((order) => order.factionId === factionId)
      .map((order) => order.originNodeId)
  );
  const currentContestedShips = state.nodeOccupancies
    .filter((occupancy) => {
      return (
        occupancy.factionId === factionId &&
        occupancy.shipCount > 0 &&
        !pendingLeaveOrigins.has(occupancy.nodeId) &&
        isNodeContested(state.nodeOccupancies, occupancy.nodeId)
      );
    })
    .reduce((total, occupancy) => total + occupancy.shipCount, 0);
  const pendingContestedEntries = state.pendingBurnOrders
    .filter((order) => {
      return (
        order.factionId === factionId &&
        hasEnemyShipAtNode(state, order.destinationNodeId, factionId)
      );
    })
    .reduce((total, order) => total + order.shipCount, 0);
  const extraEntry =
    entryNodeId !== null && hasEnemyShipAtNode(state, entryNodeId, factionId) ? 1 : 0;

  return currentContestedShips + pendingContestedEntries + extraEntry;
}

function getExpectedNextTritiumIncome(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId,
  excludedNodeIds: readonly string[] = []
): number {
  const excluded = new Set(excludedNodeIds);

  return content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => {
      return (
        !excluded.has(node.id) &&
        hasFactionShipAtNode(state, node.id, factionId) &&
        !isNodeContested(state.nodeOccupancies, node.id) &&
        !hasPendingAction(state, node.id, factionId)
      );
    })
    .reduce((total) => total + tritiumWorkOutput, 0);
}

function getFactionAccessibleTritiumNodeIds(
  content: SimulationContent,
  state: GameState,
  factionId: FactionId
): readonly string[] {
  return content.nodes
    .filter((node) => node.type === "tritium")
    .filter((node) => {
      return (
        hasFactionShipAtNode(state, node.id, factionId) &&
        !isNodeContested(state.nodeOccupancies, node.id) &&
        !hasPendingAction(state, node.id, factionId)
      );
    })
    .map((node) => node.id);
}

function getIncomingActiveMissiles(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): readonly ActiveMissile[] {
  return state.activeMissiles.filter((missile) => {
    return missile.targetNodeId === nodeId && missile.targetFactionId === factionId;
  });
}

function hasIncomingMissileTargetingNode(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): boolean {
  return [...state.activeMissiles, ...state.pendingFireOrders].some((missile) => {
    return missile.targetNodeId === nodeId && missile.targetFactionId === factionId;
  });
}

function getIncomingEnemyBurnsToNode(
  state: GameState,
  nodeId: string,
  factionId: FactionId,
  nextTurn: number
): readonly (PendingBurnOrder | ActiveBurnTransit)[] {
  return [...state.pendingBurnOrders, ...state.activeBurnTransits].filter((transit) => {
    return (
      transit.factionId !== factionId &&
      transit.destinationNodeId === nodeId &&
      transit.arrivalTurn <= nextTurn
    );
  });
}

function getLegalBurnPlan(
  content: SimulationContent,
  state: GameState,
  originNodeId: string,
  destinationNodeId: string,
  factionId: FactionId
): BurnPlan | null {
  const plan = calculateBurnPlan(content, state, originNodeId, destinationNodeId);

  if (plan === null) {
    return null;
  }

  const legalPlan: BurnPlan = isNodeContested(state.nodeOccupancies, originNodeId)
    ? {
        ...plan,
        burnCost: plan.burnCost + contestedLeaveDvCost
      }
    : plan;

  if (wouldStackShipsAtDestination(state, legalPlan, factionId, undefined, 1)) {
    return null;
  }

  if (legalPlan.burnCost > getProjectedFactionDv(state, factionId, originNodeId)) {
    return null;
  }

  return legalPlan;
}

function getLegalMandatoryLaunchBurnPlan(
  content: SimulationContent,
  state: GameState,
  originNodeId: string,
  destinationNodeId: string,
  factionId: FactionId
): BurnPlan | null {
  if (isNodeContested(state.nodeOccupancies, destinationNodeId)) {
    return null;
  }

  return getLegalBurnPlan(content, state, originNodeId, destinationNodeId, factionId);
}

function chooseMandatoryLaunchBurn(
  content: SimulationContent,
  state: GameState,
  originNodeId: string,
  factionId: FactionId,
  orderId: string
): MandatoryLaunchBurnSelection | null {
  const candidates = content.nodes
    .filter((destination) => destination.id !== originNodeId)
    .map((destination) => {
      const plan = getLegalMandatoryLaunchBurnPlan(
        content,
        state,
        originNodeId,
        destination.id,
        factionId
      );

      if (plan === null) {
        return null;
      }

      return {
        order: {
          ...plan,
          id: orderId,
          factionId,
          shipCount: 1
        },
        destinationType: destination.type
      } satisfies MandatoryLaunchBurnSelection;
    })
    .filter((candidate): candidate is MandatoryLaunchBurnSelection => candidate !== null)
    .sort(compareMandatoryLaunchBurnSelections);

  return candidates[0] ?? null;
}

function compareMandatoryLaunchBurnSelections(
  first: MandatoryLaunchBurnSelection,
  second: MandatoryLaunchBurnSelection
): number {
  if (first.order.burnCost !== second.order.burnCost) {
    return first.order.burnCost - second.order.burnCost;
  }

  const firstTypePriority = getMandatoryLaunchDestinationTypePriority(first.destinationType);
  const secondTypePriority = getMandatoryLaunchDestinationTypePriority(second.destinationType);

  if (firstTypePriority !== secondTypePriority) {
    return firstTypePriority - secondTypePriority;
  }

  return first.order.destinationNodeId.localeCompare(second.order.destinationNodeId);
}

function getMandatoryLaunchDestinationTypePriority(
  nodeType: SimulationContent["nodes"][number]["type"]
): number {
  if (nodeType === "barren" || nodeType === "protected") {
    return 0;
  }

  if (nodeType === "tritium") {
    return 1;
  }

  return 2;
}

function applyContestedUpkeep(
  occupancies: readonly NodeOccupancy[],
  factionDv: FactionDvReserve,
  debugEvents: TurnDebugEvent[],
  turn: number,
  content: SimulationContent | undefined
): Readonly<{
  nodeOccupancies: NodeOccupancy[];
  factionDv: FactionDvReserve;
  destroyedShipKeys: readonly string[];
}> {
  let nextOccupancies = [...occupancies];
  let nextFactionDv = factionDv;
  const destroyedShipKeys: string[] = [];
  const contestedNodeIds = new Set(
    occupancies
      .filter((occupancy) => isNodeContested(occupancies, occupancy.nodeId))
      .map((occupancy) => occupancy.nodeId)
  );

  for (const occupancy of [...occupancies].sort(compareOccupancies)) {
    if (!contestedNodeIds.has(occupancy.nodeId) || occupancy.shipCount <= 0) {
      continue;
    }

    const cost = contestedUpkeepDvCost * occupancy.shipCount;

    if (getFactionDv({ factionDv: nextFactionDv }, occupancy.factionId) >= cost) {
      nextFactionDv = adjustFactionDv(nextFactionDv, occupancy.factionId, -cost);
      debugEvents.push({
        turn,
        type: "CONTESTED_UPKEEP_PAID",
        message: `${getNodeDisplayName(content, occupancy.nodeId)} contested upkeep: -${cost} ΔV`,
        nodeId: occupancy.nodeId,
        factionId: occupancy.factionId,
        amount: -cost
      });
      continue;
    }

    nextOccupancies = adjustNodeOccupancy(
      nextOccupancies,
      occupancy.nodeId,
      occupancy.factionId,
      -occupancy.shipCount
    );
    destroyedShipKeys.push(createNodeFactionKey(occupancy.nodeId, occupancy.factionId));
    debugEvents.push({
      turn,
      type: "CONTESTED_UPKEEP_FAILED",
      message: `${getNodeDisplayName(content, occupancy.nodeId)} contested upkeep failed`,
      nodeId: occupancy.nodeId,
      factionId: occupancy.factionId
    });
    debugEvents.push({
      turn,
      type: "SHIP_DESTROYED",
      message: `Ship destroyed after failed contested upkeep at ${getNodeDisplayName(content, occupancy.nodeId)}`,
      nodeId: occupancy.nodeId,
      factionId: occupancy.factionId
    });
  }

  return {
    nodeOccupancies: nextOccupancies,
    factionDv: nextFactionDv,
    destroyedShipKeys
  };
}

function removeDestroyedShipReferences(
  _state: GameState,
  activeMissiles: readonly ActiveMissile[],
  nodeId: string,
  factionId: FactionId
): Readonly<{ activeMissiles: ActiveMissile[] }> {
  return {
    activeMissiles: activeMissiles.filter((missile) => {
      return !(missile.targetNodeId === nodeId && missile.targetFactionId === factionId);
    })
  };
}

function compareOccupancies(first: NodeOccupancy, second: NodeOccupancy): number {
  if (first.nodeId !== second.nodeId) {
    return first.nodeId.localeCompare(second.nodeId);
  }

  return first.factionId.localeCompare(second.factionId);
}

function comparePendingBurnOrdersForResolution(
  first: PendingBurnOrder,
  second: PendingBurnOrder
): number {
  if (first.mandatoryLaunchId !== undefined && second.mandatoryLaunchId === undefined) {
    return -1;
  }

  if (first.mandatoryLaunchId === undefined && second.mandatoryLaunchId !== undefined) {
    return 1;
  }

  return first.id.localeCompare(second.id);
}

function getPendingBurnAwayOrder(
  state: GameState,
  occupancies: readonly NodeOccupancy[],
  nodeId: string,
  factionId: FactionId,
  ignoredOrderIds: ReadonlySet<string> = new Set()
): PendingBurnOrder | undefined {
  const occupancy = occupancies.find((candidate) => {
    return candidate.nodeId === nodeId && candidate.factionId === factionId;
  });

  if (occupancy === undefined || occupancy.shipCount <= 0) {
    return undefined;
  }

  return state.pendingBurnOrders.find((order) => {
    return (
      !ignoredOrderIds.has(order.id) &&
      order.originNodeId === nodeId &&
      order.destinationNodeId !== nodeId &&
      order.factionId === factionId &&
      order.shipCount >= occupancy.shipCount
    );
  });
}

function getMissileTargetOccupancy(
  occupancies: readonly NodeOccupancy[],
  missile: ActiveMissile
): NodeOccupancy | undefined {
  return occupancies.find((occupancy) => {
    return (
      occupancy.nodeId === missile.targetNodeId &&
      occupancy.factionId === missile.targetFactionId &&
      occupancy.shipCount > 0
    );
  });
}

function getMissileTargetArrivingTransit(
  activeBurnTransits: readonly ActiveBurnTransit[],
  missile: ActiveMissile,
  turn: number,
  destroyedTransitIds: ReadonlySet<string>
): ActiveBurnTransit | undefined {
  return activeBurnTransits.find((transit) => {
    return (
      !destroyedTransitIds.has(transit.id) &&
      transit.destinationNodeId === missile.targetNodeId &&
      transit.factionId === missile.targetFactionId &&
      transit.arrivalTurn <= turn &&
      transit.shipCount > 0
    );
  });
}

function getMissileImpactTargetOccupancy(
  occupancies: readonly NodeOccupancy[],
  missile: ActiveMissile
): NodeOccupancy | undefined {
  const recordedTarget = getMissileTargetOccupancy(occupancies, missile);

  if (recordedTarget !== undefined && recordedTarget.factionId !== missile.factionId) {
    return recordedTarget;
  }

  return occupancies.find((occupancy) => {
    return (
      occupancy.nodeId === missile.targetNodeId &&
      occupancy.factionId !== missile.factionId &&
      occupancy.shipCount > 0
    );
  });
}

function getNodeById(
  content: SimulationContent,
  nodeId: string
): SimulationContent["nodes"][number] | undefined {
  return content.nodes.find((node) => node.id === nodeId);
}

function wouldStackShipsAtDestination(
  state: GameState,
  plan: BurnPlan,
  factionId: FactionId,
  replacedOrder: PendingBurnOrder | undefined,
  shipCount: number
): boolean {
  const currentDestinationShipCount = Math.max(
    0,
    state.nodeOccupancies
      .filter((occupancy) => {
        return occupancy.nodeId === plan.destinationNodeId && occupancy.shipCount > 0;
      })
      .reduce((total, occupancy) => total + occupancy.shipCount, 0) -
      getCommittedMandatoryLaunchDepartureCountAtNode(state, plan.destinationNodeId, replacedOrder)
  );
  const pendingDestinationShipCount = state.pendingBurnOrders
    .filter((occupancy) => {
      return (
        occupancy.destinationNodeId === plan.destinationNodeId && occupancy.id !== replacedOrder?.id
      );
    })
    .reduce((total, order) => total + order.shipCount, 0);
  const activeDestinationShipCount = state.activeBurnTransits
    .filter((order) => {
      return order.destinationNodeId === plan.destinationNodeId;
    })
    .reduce((total, transit) => total + transit.shipCount, 0);

  if (
    currentDestinationShipCount +
      pendingDestinationShipCount +
      activeDestinationShipCount +
      shipCount >
    2
  ) {
    return true;
  }

  const hasOccupiedDestination = state.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.nodeId === plan.destinationNodeId &&
      occupancy.factionId === factionId &&
      occupancy.shipCount > 0
    );
  });

  if (hasOccupiedDestination) {
    return true;
  }

  const hasPendingDestination = state.pendingBurnOrders.some((order) => {
    return (
      order.factionId === factionId &&
      order.destinationNodeId === plan.destinationNodeId &&
      order.id !== replacedOrder?.id
    );
  });

  if (hasPendingDestination) {
    return true;
  }

  return state.activeBurnTransits.some((transit) => {
    return transit.factionId === factionId && transit.destinationNodeId === plan.destinationNodeId;
  });
}

function getCommittedMandatoryLaunchDepartureCountAtNode(
  state: GameState,
  nodeId: string,
  replacedOrder: PendingBurnOrder | undefined
): number {
  const unresolvedLaunchDepartures = state.mandatoryLaunches.filter((launch) => {
    return launch.nodeId === nodeId;
  }).length;
  const queuedLaunchDepartures = state.pendingBurnOrders
    .filter((order) => {
      return (
        order.originNodeId === nodeId &&
        order.mandatoryLaunchId !== undefined &&
        order.id !== replacedOrder?.id
      );
    })
    .reduce((total, order) => total + order.shipCount, 0);

  return unresolvedLaunchDepartures + queuedLaunchDepartures;
}

function hasEnemyOccupiedDestination(
  state: GameState,
  destinationNodeId: string,
  factionId: FactionId
): boolean {
  return state.nodeOccupancies.some((occupancy) => {
    return (
      occupancy.nodeId === destinationNodeId &&
      occupancy.factionId !== factionId &&
      occupancy.shipCount > 0
    );
  });
}

function hasAffordableMandatoryLaunchDestination(
  content: SimulationContent,
  state: GameState,
  originNodeId: string,
  factionId: FactionId
): boolean {
  const projectedDv = getProjectedFactionDv(state, factionId, originNodeId);

  return content.nodes.some((destination) => {
    if (destination.id === originNodeId) {
      return false;
    }

    const plan = getLegalMandatoryLaunchBurnPlan(
      content,
      state,
      originNodeId,
      destination.id,
      factionId
    );
    return plan !== null && plan.burnCost <= projectedDv;
  });
}

function getNextMandatoryLaunch(
  state: Pick<GameState, "mandatoryLaunches">,
  factionId: FactionId
): MandatoryLaunch | undefined {
  return [...state.mandatoryLaunches]
    .filter((launch) => launch.factionId === factionId)
    .sort(compareMandatoryLaunches)[0];
}

function compareMandatoryLaunches(first: MandatoryLaunch, second: MandatoryLaunch): number {
  if (first.createdTurn !== second.createdTurn) {
    return first.createdTurn - second.createdTurn;
  }

  return first.id.localeCompare(second.id);
}

function createMandatoryLaunch(
  factionId: FactionId,
  nodeId: string,
  turn: number,
  index: number
): MandatoryLaunch {
  return {
    id: `launch:${factionId}:${nodeId}:T${turn}:${index}`,
    nodeId,
    factionId,
    createdTurn: turn
  };
}

function adjustNodeOccupancy(
  occupancies: readonly NodeOccupancy[],
  nodeId: string,
  factionId: FactionId,
  delta: number
): NodeOccupancy[] {
  const nextOccupancies: NodeOccupancy[] = [];
  let applied = false;

  for (const occupancy of occupancies) {
    if (occupancy.nodeId !== nodeId || occupancy.factionId !== factionId) {
      nextOccupancies.push(occupancy);
      continue;
    }

    const shipCount = occupancy.shipCount + delta;
    applied = true;

    if (shipCount > 0) {
      nextOccupancies.push({
        ...occupancy,
        shipCount
      });
    }
  }

  if (!applied && delta > 0) {
    nextOccupancies.push({
      nodeId,
      factionId,
      shipCount: delta
    });
  }

  return nextOccupancies;
}

export function produceShipAtShipyard(
  occupancies: readonly NodeOccupancy[],
  nodeId: string,
  factionId: FactionId
): NodeOccupancy[] {
  return adjustNodeOccupancy(occupancies, nodeId, factionId, 1);
}

function adjustFactionDv(
  reserves: FactionDvReserve,
  factionId: FactionId,
  delta: number
): FactionDvReserve {
  return {
    ...reserves,
    [factionId]: Math.max(0, (reserves[factionId] ?? 0) + delta)
  };
}

function getShipyardProgress(progressEntries: readonly ShipyardProgress[], nodeId: string): number {
  return progressEntries.find((entry) => entry.nodeId === nodeId)?.progress ?? 0;
}

function getShipyardWorkerFactionId(
  progressEntries: readonly ShipyardProgress[],
  nodeId: string
): FactionId | undefined {
  return progressEntries.find((entry) => entry.nodeId === nodeId)?.workerFactionId;
}

function setShipyardProgress(
  progressEntries: readonly ShipyardProgress[],
  nodeId: string,
  progress: number,
  workerFactionId?: FactionId
): ShipyardProgress[] {
  const normalizedProgress = clamp(Math.floor(progress), 0, shipyardCompletionProgress - 1);
  const nextEntries = progressEntries.filter((entry) => entry.nodeId !== nodeId);

  if (normalizedProgress <= 0) {
    return nextEntries;
  }

  return [
    ...nextEntries,
    {
      nodeId,
      progress: normalizedProgress,
      ...(workerFactionId === undefined ? {} : { workerFactionId })
    }
  ];
}

function getShipyardProductionOccupancyStatus(
  nodeOccupancies: readonly NodeOccupancy[],
  pendingBurnOrders: readonly PendingBurnOrder[],
  activeBurnTransits: readonly ActiveBurnTransit[],
  factionDv: FactionDvReserve,
  nextTurn: number,
  nodeId: string,
  burnAwayOrderIds: ReadonlySet<string>
): ShipyardProductionOccupancyStatus {
  const occupanciesAfterMovement = projectNodeOccupanciesAfterTurnMovementForProduction(
    nodeOccupancies,
    pendingBurnOrders,
    activeBurnTransits,
    factionDv,
    nextTurn,
    burnAwayOrderIds
  );
  const occupantsByFaction = getOccupantsByFaction(occupanciesAfterMovement, nodeId);
  const occupyingFactionIds = getOccupyingFactionIds(occupantsByFaction);

  return {
    occupanciesAfterMovement,
    occupantsByFaction,
    occupyingFactionIds,
    isContested: occupyingFactionIds.length > 1
  };
}

function projectNodeOccupanciesAfterTurnMovementForProduction(
  nodeOccupancies: readonly NodeOccupancy[],
  pendingBurnOrders: readonly PendingBurnOrder[],
  activeBurnTransits: readonly ActiveBurnTransit[],
  factionDv: FactionDvReserve,
  nextTurn: number,
  burnAwayOrderIds: ReadonlySet<string>
): NodeOccupancy[] {
  let projectedOccupancies = [...nodeOccupancies];
  let projectedFactionDv: FactionDvReserve = { ...factionDv };
  const sortedPendingBurnOrders = [...pendingBurnOrders].sort((first, second) => {
    const firstIsBurnAway = burnAwayOrderIds.has(first.id);
    const secondIsBurnAway = burnAwayOrderIds.has(second.id);

    if (firstIsBurnAway !== secondIsBurnAway) {
      return firstIsBurnAway ? -1 : 1;
    }

    return first.id.localeCompare(second.id);
  });

  for (const order of sortedPendingBurnOrders) {
    const occupancy = projectedOccupancies.find((candidate) => {
      return candidate.nodeId === order.originNodeId && candidate.factionId === order.factionId;
    });

    if (
      occupancy === undefined ||
      occupancy.shipCount < order.shipCount ||
      getFactionDv({ factionDv: projectedFactionDv }, order.factionId) < order.burnCost
    ) {
      continue;
    }

    projectedFactionDv = adjustFactionDv(projectedFactionDv, order.factionId, -order.burnCost);
    projectedOccupancies = adjustNodeOccupancy(
      projectedOccupancies,
      order.originNodeId,
      order.factionId,
      -order.shipCount
    );

    if (order.arrivalTurn <= nextTurn) {
      projectedOccupancies = adjustNodeOccupancy(
        projectedOccupancies,
        order.destinationNodeId,
        order.factionId,
        order.shipCount
      );
    }
  }

  for (const transit of activeBurnTransits) {
    if (transit.arrivalTurn > nextTurn) {
      continue;
    }

    projectedOccupancies = adjustNodeOccupancy(
      projectedOccupancies,
      transit.destinationNodeId,
      transit.factionId,
      transit.shipCount
    );
  }

  return projectedOccupancies;
}

function getOccupantsByFaction(
  occupancies: readonly NodeOccupancy[],
  nodeId: string
): Partial<Record<string, number>> {
  const occupantsByFaction: Partial<Record<string, number>> = {};

  for (const occupancy of occupancies) {
    if (occupancy.nodeId !== nodeId || occupancy.shipCount <= 0) {
      continue;
    }

    occupantsByFaction[occupancy.factionId] =
      (occupantsByFaction[occupancy.factionId] ?? 0) + occupancy.shipCount;
  }

  return occupantsByFaction;
}

function getOccupyingFactionIds(
  occupantsByFaction: Partial<Record<string, number>>
): readonly FactionId[] {
  return knownFactionIds.filter((factionId) => {
    return (occupantsByFaction[factionId] ?? 0) > 0;
  });
}

function createProducedShipDebugId(factionId: FactionId, nodeId: string, turn: number): string {
  return `ship:${factionId}:${nodeId}:T${turn}`;
}

function createShipyardProductionCheckEvent(
  turn: number,
  nodeId: string,
  factionId: FactionId,
  occupancyStatus: ShipyardProductionOccupancyStatus,
  progressBefore: number,
  progressAfter: number,
  productionAllowed: boolean,
  reason: string,
  producedShipId?: string,
  mandatoryLaunchId?: string
): TurnDebugEvent {
  return {
    turn,
    type: "SHIPYARD_PRODUCTION_CHECK",
    message: [
      `Shipyard production check ${nodeId}`,
      `occupants ${formatOccupantsByFaction(occupancyStatus.occupantsByFaction)}`,
      `contested ${formatYesNo(occupancyStatus.isContested)}`,
      `progress ${progressBefore}/${shipyardCompletionProgress}->${progressAfter}/${shipyardCompletionProgress}`,
      `allowed ${formatYesNo(productionAllowed)}`,
      `reason ${reason}`,
      `produced ${producedShipId ?? "-"}`,
      `mandatory ${mandatoryLaunchId ?? "-"}`
    ].join("; "),
    nodeId,
    factionId,
    reason,
    progressBefore,
    progressAfter,
    occupantsByFaction: occupancyStatus.occupantsByFaction,
    contested: occupancyStatus.isContested,
    productionAllowed,
    ...(producedShipId === undefined ? {} : { producedShipId }),
    ...(mandatoryLaunchId === undefined ? {} : { mandatoryLaunchId })
  };
}

function createProductiveAuditEvents(
  content: SimulationContent,
  plannedState: GameState,
  turn: number,
  nodeOccupancies: readonly NodeOccupancy[],
  orderedShipKeys: ReadonlySet<string>,
  evadedShipKeys: ReadonlySet<string>,
  skippedWorkShipKeys: ReadonlySet<string>,
  contestedNodeIdsAtTurnStart: ReadonlySet<string>,
  arrivedShipCounts: ReadonlyMap<string, number>,
  debugEvents: readonly TurnDebugEvent[]
): readonly TurnDebugEvent[] {
  const tritiumNodeIds = new Set(
    content.nodes.filter((node) => node.type === "tritium").map((node) => node.id)
  );
  const incomeKeys = new Set(
    debugEvents
      .filter((event) => {
        return (
          event.turn === turn &&
          event.type === "TRITIUM_INCOME" &&
          event.nodeId !== undefined &&
          event.factionId !== undefined
        );
      })
      .map((event) => createNodeFactionKey(event.nodeId!, event.factionId!))
  );
  const burnOrderKeys = new Set(
    plannedState.pendingBurnOrders.map((order) =>
      createNodeFactionKey(order.originNodeId, order.factionId)
    )
  );
  const fireOrderKeys = new Set(
    plannedState.pendingFireOrders.map((order) =>
      createNodeFactionKey(order.originNodeId, order.factionId)
    )
  );
  const events: TurnDebugEvent[] = [];

  for (const occupancy of nodeOccupancies) {
    if (occupancy.shipCount <= 0 || !tritiumNodeIds.has(occupancy.nodeId)) {
      continue;
    }

    const key = createNodeFactionKey(occupancy.nodeId, occupancy.factionId);
    const generatedIncome = incomeKeys.has(key);
    const arrivedThisTurn = hasOnlyArrivedShips(arrivedShipCounts, occupancy);
    const contested =
      isNodeContested(nodeOccupancies, occupancy.nodeId) ||
      contestedNodeIdsAtTurnStart.has(occupancy.nodeId);
    const action: TurnDebugEvent["action"] = generatedIncome
      ? "WORK"
      : burnOrderKeys.has(key)
        ? "BURN"
        : fireOrderKeys.has(key)
          ? "FIRE"
          : undefined;
    const reason = generatedIncome
      ? "income-generated"
      : arrivedThisTurn
        ? "arrived-this-turn"
        : contested
          ? "contested"
          : burnOrderKeys.has(key)
            ? "burn-ordered"
            : fireOrderKeys.has(key)
              ? "fire-ordered"
              : evadedShipKeys.has(key)
                ? "evaded"
                : skippedWorkShipKeys.has(key)
                  ? "ai-held"
                  : orderedShipKeys.has(key)
                    ? "ordered"
                    : "not-worked";

    events.push({
      turn,
      type: "PRODUCTIVE_AUDIT",
      message: [
        `PRODUCTIVE_AUDIT ${getNodeDisplayName(content, occupancy.nodeId)} ${occupancy.factionId}`,
        `income ${generatedIncome ? `+${tritiumWorkOutput}` : "0"}`,
        `reason ${reason}`,
        `contested ${formatYesNo(contested)}`,
        `action ${action ?? "-"}`
      ].join("; "),
      nodeId: occupancy.nodeId,
      factionId: occupancy.factionId,
      reason,
      amount: generatedIncome ? tritiumWorkOutput : 0,
      contested,
      ...(action === undefined ? {} : { action })
    });
  }

  return events;
}

function createContestedShipyardProductionInvariantViolationEvents(
  content: SimulationContent | undefined,
  state: GameState,
  debugEvents: readonly TurnDebugEvent[]
): readonly TurnDebugEvent[] {
  const producedOrLaunchedNodeIds = new Set(
    debugEvents
      .filter((event) => {
        return (
          (event.type === "SHIP_PRODUCED" || event.type === "MANDATORY_LAUNCH") &&
          event.nodeId !== undefined
        );
      })
      .map((event) => event.nodeId!)
  );
  const violationEvents: TurnDebugEvent[] = [];

  for (const nodeId of producedOrLaunchedNodeIds) {
    if (!isNodeContested(state.nodeOccupancies, nodeId)) {
      continue;
    }

    const productionEvent = debugEvents.find((event) => {
      return event.type === "SHIP_PRODUCED" && event.nodeId === nodeId;
    });
    const launchEvent = debugEvents.find((event) => {
      return event.type === "MANDATORY_LAUNCH" && event.nodeId === nodeId;
    });

    const factionId = productionEvent?.factionId ?? launchEvent?.factionId;

    violationEvents.push({
      turn: state.turn,
      type: "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION",
      message: [
        "BUG DETECTED",
        `turn: ${state.turn}`,
        `nodeId: ${nodeId}`,
        "phase: shipyard_production",
        "rule: contested shipyard cannot produce",
        "expected: production suspended, progress unchanged",
        "actual: ship produced / mandatory launch created / progress reset"
      ].join("\n"),
      nodeId,
      ...(factionId === undefined ? {} : { factionId }),
      phase: "shipyard_production",
      rule: "contested shipyard cannot produce",
      expected: "production suspended, progress unchanged",
      actual: "ship produced / mandatory launch created / progress reset",
      occupantsByFaction: getOccupantsByFaction(state.nodeOccupancies, nodeId),
      contested: true,
      productionAllowed: false,
      progressAfter: getShipyardProgress(state.shipyardProgress, nodeId),
      ...(productionEvent?.producedShipId === undefined
        ? {}
        : { producedShipId: productionEvent.producedShipId }),
      ...(launchEvent?.mandatoryLaunchId === undefined
        ? {}
        : { mandatoryLaunchId: launchEvent.mandatoryLaunchId }),
      reason:
        content === undefined
          ? "contested-shipyard-production"
          : `contested-shipyard-production:${getNodeDisplayName(content, nodeId)}`
    });
  }

  return violationEvents;
}

function createNonContestedNodeStackingInvariantViolationEvents(
  content: SimulationContent | undefined,
  state: GameState
): readonly TurnDebugEvent[] {
  return getNonContestedNodeStackingViolations(state).map((violation) => {
    return {
      turn: state.turn,
      type: "NODE_STACKING_INVARIANT_VIOLATION",
      message: [
        "BUG DETECTED",
        `turn: ${state.turn}`,
        `nodeId: ${violation.nodeId}`,
        "phase: turn_resolution",
        "rule: non-contested node cannot contain shipCount > 1 for same faction",
        "expected: at most one ship per faction unless unresolved mandatory launch",
        `actual: ${violation.factionId} shipCount ${violation.shipCount}`
      ].join("\n"),
      nodeId: violation.nodeId,
      factionId: violation.factionId,
      phase: "turn_resolution",
      rule: "non-contested node cannot contain shipCount > 1 for same faction",
      expected: "at most one ship per faction unless unresolved mandatory launch",
      actual: `${violation.factionId} shipCount ${violation.shipCount}`,
      occupantsByFaction: violation.occupantsByFaction,
      contested: false,
      productionAllowed: false,
      reason:
        content === undefined
          ? "non-contested-node-stacking"
          : `non-contested-node-stacking:${getNodeDisplayName(content, violation.nodeId)}`
    };
  });
}

function getNonContestedNodeStackingViolations(
  state: GameState
): readonly NonContestedNodeStackingViolation[] {
  const nodeIds = [...new Set(state.nodeOccupancies.map((occupancy) => occupancy.nodeId))].sort();
  const violations: NonContestedNodeStackingViolation[] = [];

  for (const nodeId of nodeIds) {
    if (isNodeContested(state.nodeOccupancies, nodeId)) {
      continue;
    }

    const occupantsByFaction = getOccupantsByFaction(state.nodeOccupancies, nodeId);

    for (const factionId of knownFactionIds) {
      const shipCount = occupantsByFaction[factionId] ?? 0;

      if (shipCount <= 1) {
        continue;
      }

      const unresolvedMandatoryLaunchCount = countUnresolvedMandatoryLaunches(
        state,
        nodeId,
        factionId
      );
      const allowedShipCount = 1 + unresolvedMandatoryLaunchCount;

      if (shipCount <= allowedShipCount) {
        continue;
      }

      violations.push({
        nodeId,
        factionId,
        shipCount,
        allowedShipCount,
        unresolvedMandatoryLaunchCount,
        occupantsByFaction
      });
    }
  }

  return violations;
}

function countUnresolvedMandatoryLaunches(
  state: GameState,
  nodeId: string,
  factionId: FactionId
): number {
  return state.mandatoryLaunches.filter((launch) => {
    return launch.nodeId === nodeId && launch.factionId === factionId;
  }).length;
}

function formatOccupantsByFaction(occupantsByFaction: Partial<Record<string, number>>): string {
  const parts = knownFactionIds
    .map((factionId) => `${factionId}:${occupantsByFaction[factionId] ?? 0}`)
    .join(",");

  return parts;
}

function isNodeContested(occupancies: readonly NodeOccupancy[], nodeId: string): boolean {
  return getContestingFactionIds(occupancies, nodeId).length > 1;
}

function getContestingFactionIds(
  occupancies: readonly NodeOccupancy[],
  nodeId: string
): readonly FactionId[] {
  const factionIds: FactionId[] = [];

  for (const occupancy of occupancies) {
    if (
      occupancy.nodeId === nodeId &&
      occupancy.shipCount > 0 &&
      !factionIds.includes(occupancy.factionId)
    ) {
      factionIds.push(occupancy.factionId);
    }
  }

  return factionIds;
}

function createNodeFactionKey(nodeId: string, factionId: FactionId): string {
  return `${nodeId}:${factionId}`;
}

function recordArrivedShips(
  arrivedShipCounts: Map<string, number>,
  nodeId: string,
  factionId: FactionId,
  shipCount: number
): void {
  const key = createNodeFactionKey(nodeId, factionId);
  arrivedShipCounts.set(key, (arrivedShipCounts.get(key) ?? 0) + shipCount);
}

function hasOnlyArrivedShips(
  arrivedShipCounts: ReadonlyMap<string, number>,
  occupancy: NodeOccupancy
): boolean {
  return (
    (arrivedShipCounts.get(createNodeFactionKey(occupancy.nodeId, occupancy.factionId)) ?? 0) >=
    occupancy.shipCount
  );
}

function getNodeDisplayName(content: SimulationContent | undefined, nodeId: string): string {
  const node = content?.nodes.find((candidate) => candidate.id === nodeId);
  const body =
    node === undefined
      ? undefined
      : content?.bodies.find((candidate) => {
          return candidate.id === node.bodyId;
        });

  return body?.name ?? nodeId;
}

function estimateContinuousBurnTransfer(
  content: SimulationContent,
  originNode: SimulationContent["nodes"][number],
  destinationNode: SimulationContent["nodes"][number],
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  originPosition: Vec2,
  originGravityWell: number,
  issuedTurn: number
): BurnTransferEstimate {
  const fixedRouteEtaTurns = getFixedTransferRuleEta(
    content,
    originNode,
    destinationNode,
    originBody,
    destinationBody
  );
  let etaTurns = fixedRouteEtaTurns ?? 3;
  let scores = computeContinuousBurnScores(
    content,
    originNode,
    destinationNode,
    originBody,
    destinationBody,
    originPosition,
    originGravityWell,
    issuedTurn,
    etaTurns
  );

  if (fixedRouteEtaTurns !== null) {
    return {
      etaTurns: fixedRouteEtaTurns,
      burnCost: scoreToBurnCostForRoute(content, originBody, destinationBody, scores.energyScore),
      scores
    };
  }

  for (let index = 0; index < continuousBurnTuning.iterationCount; index += 1) {
    etaTurns = scoreToBurnEtaForRoute(
      content,
      originBody,
      destinationBody,
      scores.transferDifficultyScore,
      scores
    );
    scores = computeContinuousBurnScores(
      content,
      originNode,
      destinationNode,
      originBody,
      destinationBody,
      originPosition,
      originGravityWell,
      issuedTurn,
      etaTurns
    );
  }

  return {
    etaTurns: scoreToBurnEtaForRoute(
      content,
      originBody,
      destinationBody,
      scores.transferDifficultyScore,
      scores
    ),
    burnCost: scoreToBurnCostForRoute(content, originBody, destinationBody, scores.energyScore),
    scores
  };
}

function getFixedTransferRuleEta(
  content: SimulationContent,
  originNode: SimulationContent["nodes"][number],
  destinationNode: SimulationContent["nodes"][number],
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number]
): number | null {
  const rules = content.transferRules;
  const routeOverride =
    rules?.routeEtaOverrides[`${originNode.id}->${destinationNode.id}`] ??
    rules?.routeEtaOverrides[`${destinationNode.id}->${originNode.id}`] ??
    null;

  if (routeOverride !== null) {
    return routeOverride;
  }

  if (rules !== undefined) {
    return getTransferRulesLocalEta(content, originBody, destinationBody);
  }

  return getFixedSingleMoonPlanetTransferEta(content, originBody, destinationBody);
}

function computeContinuousBurnScores(
  content: SimulationContent,
  originNode: SimulationContent["nodes"][number],
  destinationNode: SimulationContent["nodes"][number],
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  originPosition: Vec2,
  originGravityWell: number,
  issuedTurn: number,
  etaTurns: number
): BurnTransferScores {
  const originReferenceBody = getTransferReferenceBody(content, originBody);
  const destinationReferenceBody = getTransferReferenceBody(content, destinationBody);
  const sameReferenceBody = originReferenceBody.id === destinationReferenceBody.id;
  const destinationCurrentPosition = computeBodyPosition(
    content,
    destinationNode.bodyId,
    issuedTurn
  );
  const arrivalTurn = issuedTurn + etaTurns;
  const destinationFuturePosition = computeBodyPosition(
    content,
    destinationNode.bodyId,
    arrivalTurn
  );
  const originFuturePosition = computeBodyPosition(content, originBody.id, arrivalTurn);
  const visualPreviewLength = getDistance(originPosition, destinationFuturePosition);
  const currentPreviewLength = getDistance(originPosition, destinationCurrentPosition);
  const scoreDistance = sameReferenceBody
    ? getDistance(originFuturePosition, destinationFuturePosition)
    : visualPreviewLength;
  const radialChange = sameReferenceBody
    ? Math.abs(
        getLocalOrbitRadius(originBody, originReferenceBody) -
          getLocalOrbitRadius(destinationBody, destinationReferenceBody)
      ) * 0.7
    : Math.abs(originReferenceBody.orbitRadius - destinationReferenceBody.orbitRadius);
  const category = getBurnTransferCategory(
    originReferenceBody,
    destinationReferenceBody,
    visualPreviewLength,
    radialChange
  );
  const angleFactor = getBurnAngularFactor(
    content,
    originBody,
    destinationBody,
    originReferenceBody,
    destinationReferenceBody,
    issuedTurn,
    arrivalTurn
  );
  const transferDirection = normalizeVec2OrNull({
    x: destinationFuturePosition.x - originPosition.x,
    y: destinationFuturePosition.y - originPosition.y
  });
  const destinationMotion = {
    x: destinationFuturePosition.x - destinationCurrentPosition.x,
    y: destinationFuturePosition.y - destinationCurrentPosition.y
  };
  const targetMotionFactor =
    transferDirection === null
      ? 0
      : clamp(
          dotVec2(destinationMotion, transferDirection) / Math.max(visualPreviewLength, 1),
          -0.55,
          0.55
        );
  const stretchFactor = clamp(
    (visualPreviewLength - currentPreviewLength) / Math.max(currentPreviewLength, 1),
    -0.45,
    0.75
  );
  const curveComplexity = getBurnCurveComplexity(
    originBody,
    destinationBody,
    originReferenceBody,
    destinationReferenceBody,
    sameReferenceBody,
    scoreDistance,
    angleFactor
  );
  const windowScore = clamp(stretchFactor * 0.58 + targetMotionFactor * 0.86, -0.7, 0.9);
  const transferDifficultyScore =
    continuousBurnTuning.categoryBaseScore[category] +
    scoreDistance / continuousBurnTuning.distanceScale[category] +
    radialChange / continuousBurnTuning.radialScale[category] +
    visualPreviewLength / continuousBurnTuning.visualPreviewLengthScale[category] +
    angleFactor * continuousBurnTuning.angleWeight[category] +
    Math.max(0, stretchFactor) * continuousBurnTuning.stretchWeight -
    Math.max(0, -stretchFactor) * continuousBurnTuning.stretchWeight * 0.72 +
    Math.max(0, targetMotionFactor) * continuousBurnTuning.targetMotionWeight -
    Math.max(0, -targetMotionFactor) * continuousBurnTuning.targetMotionWeight * 0.86 +
    curveComplexity * continuousBurnTuning.curveComplexityWeight;
  const energyScore =
    continuousBurnTuning.energyBaseScore[category] +
    scoreDistance / continuousBurnTuning.energyDistanceScale[category] +
    radialChange / continuousBurnTuning.energyRadialScale[category] +
    visualPreviewLength / continuousBurnTuning.energyVisualPreviewLengthScale +
    Math.max(0, stretchFactor) * continuousBurnTuning.energyPositiveStretchWeight +
    -Math.max(0, -stretchFactor) * continuousBurnTuning.energyCleanStretchBonusWeight +
    Math.max(0, targetMotionFactor) * continuousBurnTuning.energyPositiveMotionWeight -
    Math.max(0, -targetMotionFactor) * continuousBurnTuning.energyCleanMotionBonusWeight +
    angleFactor * continuousBurnTuning.energyAngleWeight +
    Math.max(0, transferDifficultyScore - 4) * continuousBurnTuning.energyDifficultyWeight +
    originGravityWell * continuousBurnTuning.originGravityWeight +
    destinationNode.gravityWell * continuousBurnTuning.destinationGravityWeight;

  return {
    transferDifficultyScore,
    energyScore,
    category,
    visualPreviewLength,
    scoreDistance,
    radialChange,
    angleFactor,
    stretchFactor,
    targetMotionFactor,
    curveComplexity,
    windowScore
  };
}

function getFixedSingleMoonPlanetTransferEta(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number]
): number | null {
  const route = getDirectPlanetMoonRoute(originBody, destinationBody);

  if (route === null) {
    return null;
  }

  const activeMoonCount = content.bodies.filter((body) => {
    return body.kind === "moon" && body.parentId === route.parentBody.id;
  }).length;

  if (activeMoonCount !== 1) {
    return null;
  }

  return route.parentBody.id === "earth" && route.moonBody.id === "moon" ? 1 : 2;
}

function getTransferRulesLocalEta(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number]
): number | null {
  const rules = content.transferRules;

  if (rules === undefined) {
    return null;
  }

  const originReferenceBody = getTransferReferenceBody(content, originBody);
  const destinationReferenceBody = getTransferReferenceBody(content, destinationBody);

  if (originReferenceBody.id !== destinationReferenceBody.id) {
    return null;
  }

  const directPlanetMoonRoute = getDirectPlanetMoonRoute(originBody, destinationBody);

  if (directPlanetMoonRoute !== null) {
    return isNearParentMoon(directPlanetMoonRoute.moonBody)
      ? rules.sameSystemPlanetMoonEta
      : rules.sameSystemMoonEta;
  }

  if (
    originBody.kind === "moon" &&
    destinationBody.kind === "moon" &&
    originBody.parentId === destinationBody.parentId
  ) {
    return rules.sameSystemMoonEta;
  }

  return null;
}

function isNearParentMoon(body: SimulationContent["bodies"][number]): boolean {
  return body.orbitRadius <= 40;
}

function getDirectPlanetMoonRoute(
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number]
): Readonly<{
  parentBody: SimulationContent["bodies"][number];
  moonBody: SimulationContent["bodies"][number];
}> | null {
  if (originBody.kind === "moon" && originBody.parentId === destinationBody.id) {
    return { parentBody: destinationBody, moonBody: originBody };
  }

  if (destinationBody.kind === "moon" && destinationBody.parentId === originBody.id) {
    return { parentBody: originBody, moonBody: destinationBody };
  }

  return null;
}

function getTransferReferenceBody(
  content: SimulationContent,
  body: SimulationContent["bodies"][number]
): SimulationContent["bodies"][number] {
  if (body.parentId === null || body.parentId === "sun") {
    return body;
  }

  return content.bodies.find((candidate) => candidate.id === body.parentId) ?? body;
}

function getLocalOrbitRadius(
  body: SimulationContent["bodies"][number],
  referenceBody: SimulationContent["bodies"][number]
): number {
  return body.id === referenceBody.id ? 0 : body.orbitRadius;
}

function getBurnTransferCategory(
  originReferenceBody: SimulationContent["bodies"][number],
  destinationReferenceBody: SimulationContent["bodies"][number],
  visualPreviewLength: number,
  radialChange: number
): TransferCategory {
  if (originReferenceBody.id === destinationReferenceBody.id) {
    return "local";
  }

  const outerRadius = Math.max(
    originReferenceBody.orbitRadius,
    destinationReferenceBody.orbitRadius
  );

  if (radialChange >= 480 || visualPreviewLength >= 760) {
    return "cross-map";
  }

  if (outerRadius >= 520 || radialChange >= 300 || visualPreviewLength >= 520) {
    return "outer";
  }

  return "intersystem";
}

function getTransferWindowQuality(scores: BurnTransferScores): TransferWindowQuality {
  if (scores.windowScore <= continuousBurnTuning.favorableWindowThreshold) {
    return "favorable";
  }

  if (scores.windowScore >= continuousBurnTuning.unfavorableWindowThreshold) {
    return "unfavorable";
  }

  return "neutral";
}

function getTransferMotionRelation(scores: BurnTransferScores): TransferMotionRelation {
  if (scores.targetMotionFactor <= continuousBurnTuning.movingTowardThreshold) {
    return "moving-toward";
  }

  if (scores.targetMotionFactor >= continuousBurnTuning.movingAwayThreshold) {
    return "moving-away";
  }

  return "neutral";
}

function getTransferVisualArcType(scores: BurnTransferScores): TransferVisualArcType {
  if (scores.category === "local") {
    return "local-hop";
  }

  if (scores.category === "cross-map") {
    return "cross-map";
  }

  const windowQuality = getTransferWindowQuality(scores);

  if (windowQuality === "favorable" && scores.curveComplexity < 0.75) {
    return "clean-window";
  }

  if (
    windowQuality === "unfavorable" ||
    scores.curveComplexity > 1.2 ||
    scores.transferDifficultyScore >= 5.1
  ) {
    return "strained-window";
  }

  return "strategic-arc";
}

function getTransferVisualArcHeight(scores: BurnTransferScores, etaTurns: number): number {
  const categoryHeight = {
    local: 8,
    intersystem: 16,
    outer: 26,
    "cross-map": 38
  } satisfies Record<TransferCategory, number>;
  const windowModifier =
    getTransferWindowQuality(scores) === "favorable"
      ? -4
      : getTransferWindowQuality(scores) === "unfavorable"
        ? 8
        : 0;

  return roundTransferDiagnostic(
    clamp(
      categoryHeight[scores.category] +
        scores.visualPreviewLength * 0.028 +
        scores.curveComplexity * 8 +
        etaTurns * 2.4 +
        windowModifier,
      5,
      92
    )
  );
}

function roundTransferDiagnostic(value: number): number {
  return Math.round(value * 100) / 100;
}

function getBurnAngularFactor(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  originReferenceBody: SimulationContent["bodies"][number],
  destinationReferenceBody: SimulationContent["bodies"][number],
  issuedTurn: number,
  arrivalTurn: number
): number {
  if (originReferenceBody.id === destinationReferenceBody.id) {
    if (
      getLocalOrbitRadius(originBody, originReferenceBody) <= 0 ||
      getLocalOrbitRadius(destinationBody, destinationReferenceBody) <= 0
    ) {
      return 0;
    }

    const parentPosition = computeBodyPosition(content, originReferenceBody.id, arrivalTurn);
    return getAngleFactor(
      angleFromPoint(parentPosition, computeBodyPosition(content, originBody.id, arrivalTurn)),
      angleFromPoint(parentPosition, computeBodyPosition(content, destinationBody.id, arrivalTurn))
    );
  }

  const sunPosition = { x: 0, y: 0 };
  return getAngleFactor(
    angleFromPoint(sunPosition, computeBodyPosition(content, originReferenceBody.id, issuedTurn)),
    angleFromPoint(
      sunPosition,
      computeBodyPosition(content, destinationReferenceBody.id, arrivalTurn)
    )
  );
}

function getBurnCurveComplexity(
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  originReferenceBody: SimulationContent["bodies"][number],
  destinationReferenceBody: SimulationContent["bodies"][number],
  sameReferenceBody: boolean,
  scoreDistance: number,
  angleFactor: number
): number {
  const radius = sameReferenceBody
    ? Math.max(
        getLocalOrbitRadius(originBody, originReferenceBody),
        getLocalOrbitRadius(destinationBody, destinationReferenceBody)
      )
    : (originReferenceBody.orbitRadius + destinationReferenceBody.orbitRadius) / 2;
  const arcLength = radius * angleFactor * Math.PI;

  return Math.max(0, arcLength / Math.max(scoreDistance, 1) - 0.5);
}

function scoreToBurnEta(score: number): number {
  return clamp(
    Math.round(score),
    continuousBurnTuning.minEtaTurns,
    continuousBurnTuning.maxEtaTurns
  );
}

function scoreToBurnEtaForRoute(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  score: number,
  scores: BurnTransferScores
): number {
  const transferRuleEta = getTransferRulesInterplanetaryEta(
    content,
    originBody,
    destinationBody,
    scores
  );

  if (transferRuleEta !== null) {
    return transferRuleEta;
  }

  return scoreToBurnEta(score);
}

function getTransferRulesInterplanetaryEta(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  scores: BurnTransferScores
): number | null {
  const rules = content.transferRules;

  if (rules === undefined) {
    return null;
  }

  const originReferenceBody = getTransferReferenceBody(content, originBody);
  const destinationReferenceBody = getTransferReferenceBody(content, destinationBody);

  if (originReferenceBody.id === destinationReferenceBody.id) {
    return null;
  }

  const originScale = rules.planetDistanceScale[originReferenceBody.id];
  const destinationScale = rules.planetDistanceScale[destinationReferenceBody.id];

  if (originScale === undefined || destinationScale === undefined) {
    return null;
  }

  const distance = Math.abs(originScale - destinationScale);
  const baseEta = getTransferRuleDistanceEtaScore(rules.planetDistanceEtaTable, distance);

  if (baseEta === null) {
    return null;
  }

  const minEta = getMinTransferRuleEta(rules.planetDistanceEtaTable);
  const maxEta = getMaxTransferRuleEta(rules.planetDistanceEtaTable);
  const windowAdjustment = scores.windowScore * continuousBurnTuning.proceduralEtaWindowWeight;
  const curveComplexityAdjustment = clamp(
    (scores.curveComplexity - 0.72) * continuousBurnTuning.proceduralEtaCurveComplexityWeight,
    -0.18,
    0.36
  );
  const motionAdjustment =
    scores.targetMotionFactor * continuousBurnTuning.proceduralEtaMotionWeight;
  const etaScore =
    baseEta * rules.globalEtaMultiplier +
    windowAdjustment +
    curveComplexityAdjustment +
    motionAdjustment;

  return clamp(Math.round(etaScore), minEta, maxEta);
}

function getTransferRuleDistanceEta(
  etaTable: Readonly<Record<string, number>>,
  distance: number
): number | null {
  const exact = etaTable[String(distance)];

  if (exact !== undefined) {
    return exact;
  }

  const numericKeys = Object.keys(etaTable)
    .map((key) => Number(key))
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (numericKeys.length === 0) {
    return null;
  }

  const floorKey =
    [...numericKeys].reverse().find((key) => {
      return key <= distance;
    }) ?? numericKeys[0];

  return floorKey === undefined ? null : (etaTable[String(floorKey)] ?? null);
}

function getTransferRuleDistanceEtaScore(
  etaTable: Readonly<Record<string, number>>,
  distance: number
): number | null {
  const tableEta = getTransferRuleDistanceEta(etaTable, distance);

  if (tableEta === null) {
    return null;
  }

  const numericKeys = Object.keys(etaTable)
    .map((key) => Number(key))
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (numericKeys.length < 2) {
    return tableEta;
  }

  const minDistance = numericKeys[0];
  const maxDistance = numericKeys[numericKeys.length - 1];
  const minEta = getMinTransferRuleEta(etaTable);
  const maxEta = getMaxTransferRuleEta(etaTable);

  if (
    minDistance === undefined ||
    maxDistance === undefined ||
    maxDistance <= minDistance ||
    maxEta <= minEta
  ) {
    return tableEta;
  }

  const distanceProgress = clamp((distance - minDistance) / (maxDistance - minDistance), 0, 1);
  const curvedEta =
    minEta +
    Math.pow(distanceProgress, continuousBurnTuning.proceduralEtaDistanceCurveExponent) *
      (maxEta - minEta);

  return (
    tableEta * continuousBurnTuning.proceduralEtaTableWeight +
    curvedEta * (1 - continuousBurnTuning.proceduralEtaTableWeight)
  );
}

function getTransferRuleDistanceBurnCostAdjustment(
  adjustmentTable: Readonly<Record<string, number>>,
  distance: number
): number {
  const exact = adjustmentTable[String(distance)];

  if (exact !== undefined) {
    return exact;
  }

  const numericKeys = Object.keys(adjustmentTable)
    .map((key) => Number(key))
    .filter(Number.isFinite)
    .sort((first, second) => first - second);

  if (numericKeys.length === 0) {
    return 0;
  }

  const floorKey =
    [...numericKeys].reverse().find((key) => {
      return key <= distance;
    }) ?? numericKeys[0];

  return floorKey === undefined ? 0 : (adjustmentTable[String(floorKey)] ?? 0);
}

function getMinTransferRuleEta(etaTable: Readonly<Record<string, number>>): number {
  const values = Object.values(etaTable).filter(Number.isFinite);

  return values.length === 0 ? continuousBurnTuning.minEtaTurns : Math.min(...values);
}

function getMaxTransferRuleEta(etaTable: Readonly<Record<string, number>>): number {
  const values = Object.values(etaTable).filter(Number.isFinite);

  return values.length === 0 ? continuousBurnTuning.maxEtaTurns : Math.max(...values);
}

function scoreToBurnCost(score: number): number {
  return clamp(
    Math.round(score),
    continuousBurnTuning.minBurnCost,
    continuousBurnTuning.maxBurnCost
  );
}

function scoreToBurnCostForRoute(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number],
  score: number
): number {
  return scoreToBurnCost(
    score + getTransferRulesInterplanetaryBurnCostAdjustment(content, originBody, destinationBody)
  );
}

function getTransferRulesInterplanetaryBurnCostAdjustment(
  content: SimulationContent,
  originBody: SimulationContent["bodies"][number],
  destinationBody: SimulationContent["bodies"][number]
): number {
  const rules = content.transferRules;

  if (rules === undefined) {
    return 0;
  }

  const originReferenceBody = getTransferReferenceBody(content, originBody);
  const destinationReferenceBody = getTransferReferenceBody(content, destinationBody);

  if (originReferenceBody.id === destinationReferenceBody.id) {
    return 0;
  }

  const originScale = rules.planetDistanceScale[originReferenceBody.id];
  const destinationScale = rules.planetDistanceScale[destinationReferenceBody.id];

  if (originScale === undefined || destinationScale === undefined) {
    return 0;
  }

  return getTransferRuleDistanceBurnCostAdjustment(
    rules.planetDistanceBurnCostAdjustmentTable ?? {},
    Math.abs(originScale - destinationScale)
  );
}

function getDistance(first: Vec2, second: Vec2): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function dotVec2(first: Vec2, second: Vec2): number {
  return first.x * second.x + first.y * second.y;
}

function angleFromPoint(origin: Vec2, point: Vec2): number {
  return Math.atan2(point.y - origin.y, point.x - origin.x);
}

function getAngleFactor(firstAngle: number, secondAngle: number): number {
  const fullTurnRadians = Math.PI * 2;
  const rawDelta = Math.abs(firstAngle - secondAngle) % fullTurnRadians;
  const shortestDelta = rawDelta > Math.PI ? fullTurnRadians - rawDelta : rawDelta;

  return shortestDelta / Math.PI;
}

function findNearestBodyAtTurn(
  content: SimulationContent,
  position: Vec2,
  turn: number
): SimulationContent["bodies"][number] | null {
  let nearestBody: SimulationContent["bodies"][number] | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const body of content.bodies) {
    const bodyPosition = computeBodyPosition(content, body.id, turn);
    const distance = getDistance(position, bodyPosition);

    if (distance < nearestDistance) {
      nearestBody = body;
      nearestDistance = distance;
    }
  }

  return nearestBody;
}

function normalizeVec2OrNull(vector: Vec2): Vec2 | null {
  const length = Math.hypot(vector.x, vector.y);

  if (length <= 0.0001) {
    return null;
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

function createBurnOrderId(
  factionId: FactionId,
  originNodeId: string,
  destinationNodeId: string,
  issuedTurn: number
): string {
  return `burn:${factionId}:${originNodeId}:${destinationNodeId}:T${issuedTurn}`;
}

function createFireOrderId(
  factionId: FactionId,
  originNodeId: string,
  targetNodeId: string,
  issuedTurn: number
): string {
  return `fire:${factionId}:${originNodeId}:${targetNodeId}:T${issuedTurn}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
