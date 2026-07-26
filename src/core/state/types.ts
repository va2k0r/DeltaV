import type { BodyKind, NodeType, SolarSystemData, VisualClass } from "../../data";

export type Vec2 = Readonly<{
  x: number;
  y: number;
}>;

export type Bounds = Readonly<{
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}>;

export type GameState = Readonly<{
  turn: number;
  gameMode: GameModeId;
  factions: readonly FactionIdentity[];
  factionDv: FactionDvReserve;
  nodeOccupancies: readonly NodeOccupancy[];
  shipyardProgress: readonly ShipyardProgress[];
  mandatoryLaunches: readonly MandatoryLaunch[];
  pendingBurnOrders: readonly PendingBurnOrder[];
  pendingFireOrders: readonly PendingFireOrder[];
  activeBurnTransits: readonly ActiveBurnTransit[];
  activeMissiles: readonly ActiveMissile[];
  debugEvents: readonly TurnDebugEvent[];
}>;

export type FactionId = "player" | "opponent" | "ai_2";

export type GameModeId = "1p" | "2p" | "3p";

export type FactionControlType = "human" | "ai";

export type FactionIdentity = Readonly<{
  id: FactionId;
  displayName: string;
  color: string;
  accent: string;
  controlType: FactionControlType;
}>;

export type FactionDvReserve = Readonly<Record<string, number>>;

export type NodeOccupancy = Readonly<{
  nodeId: string;
  factionId: FactionId;
  shipCount: number;
}>;

export type ShipyardProgress = Readonly<{
  nodeId: string;
  progress: number;
  workerFactionId?: FactionId;
}>;

export type MandatoryLaunch = Readonly<{
  id: string;
  nodeId: string;
  factionId: FactionId;
  createdTurn: number;
}>;

export type TransferCategory = "local" | "intersystem" | "outer" | "cross-map";

export type TransferWindowQuality = "favorable" | "neutral" | "unfavorable";

export type TransferMotionRelation = "moving-toward" | "neutral" | "moving-away";

export type TransferVisualArcType =
  | "local-hop"
  | "clean-window"
  | "strained-window"
  | "strategic-arc"
  | "cross-map";

export type TurnDebugEventType =
  | "AI_DECISION"
  | "AI_CONSIDERED_ACTION"
  | "AI_REJECTED_ACTION"
  | "AI_PHASE_SELECTED"
  | "AI_COMBO_CONSIDERED"
  | "AI_COMBO_REJECTED"
  | "AI_COMBO_EXECUTED"
  | "AI_STRATEGIC_READ"
  | "AI_SOLVENCY_FORECAST"
  | "AI_EMERGENCY_SOLVENCY_ENTERED"
  | "AI_TRITIUM_VALUE_EVAL"
  | "AI_FINITE_TRITIUM_STOCK_EVAL"
  | "AI_YIELD_AWARE_TARGETING"
  | "AI_SHIPYARD_THREAT_EVAL"
  | "AI_EVADE_TAX_VALUED"
  | "AI_CONTESTED_UPKEEP_ATTACK"
  | "AI_LAST_TRITIUM_OVERRIDE"
  | "AI_LEADER_DENIAL_ACTION"
  | "AI_DEPLETED_POSITION_VALUE"
  | "AI_PASSIVE_WHILE_BEHIND_AVOIDED"
  | "AI_ACTION_SCORE_BREAKDOWN"
  | "AI_STRATEGY_READ"
  | "AI_TRYHARD_STRATEGY_READ"
  | "AI_RUNAWAY_DETECTION_AUDIT"
  | "AI_ANTI_RUNAWAY_ACTION_AUDIT"
  | "AI_STRATEGY_READ_TOO_LATE"
  | "AI_TRITIUM_RACE_DETECTED"
  | "AI_TRITIUM_RACE_RESPONSE"
  | "AI_SECOND_TRITIUM_REQUIRED"
  | "AI_HUMAN_TRITIUM_EXPANSION_DETECTED"
  | "AI_COUNTER_TRITIUM_PLAN_SELECTED"
  | "AI_TRITIUM_EMERGENCY"
  | "AI_SECOND_TRITIUM_OVERRIDE"
  | "AI_SECOND_TRITIUM_REJECTED_WITH_REASON"
  | "AI_KILLBOX_CANDIDATE"
  | "AI_KILLBOX_SELECTED"
  | "AI_SHIPYARD_THEFT_CANDIDATE"
  | "AI_SHIPYARD_THEFT_SELECTED"
  | "AI_SOLVENCY_PROJECTION"
  | "AI_SOLVENCY_COUNTS_TRITIUM"
  | "AI_TACTICAL_LINE_AUDIT"
  | "AI_CONTESTED_SUSTAINABILITY_CHECK"
  | "AI_AGGREGATE_CONTESTED_SOLVENCY"
  | "AI_RESERVE_VIOLATION_ALLOWED"
  | "AI_RESERVE_VIOLATION_REJECTED"
  | "AI_REJECTED_OPENING_BURN"
  | "AI_REJECTED_CONTEST"
  | "AI_SHIPYARD_COMPLETION_LOCK"
  | "AI_REJECTED_FIRE"
  | "AI_GREEDY_EXPANSION_DETECTED_EARLY"
  | "AI_SOLVENCY_RESERVE"
  | "AI_BURN_REJECTED_INSOLVENCY"
  | "AI_FIRE_REJECTED_HARMLESS_EVADE_TAX"
  | "AI_FIRE_REJECTED_CONSERVATIVE_TRITIUM_FIRST"
  | "AI_FORK_SELECTED"
  | "AI_ECONOMIC_FIRE_SELECTED"
  | "AI_ACTION_REJECTED_WITH_REASON"
  | "FIRE_ECONOMIC_DENIAL"
  | "PRODUCTIVE_NODE_PRESSURE"
  | "SHIPYARD_PRESSURE"
  | "ANTI_RUNAWAY_TARGET"
  | "STAGING_POSITION"
  | "AI_INTENT_SET"
  | "AI_INTENT_FOLLOWED"
  | "AI_INTENT_CANCELLED"
  | "AI_TRITIUM_FALLBACK_TRIGGERED"
  | "AI_TRITIUM_FALLBACK_ASSIGNED"
  | "AI_TRITIUM_FALLBACK_REJECTED"
  | "AI_FORCED_ECONOMIC_MATE_FOUND"
  | "AI_ENDGAME_CLOSURE_SELECTED"
  | "AI_PROJECTED_INSOLVENCY"
  | "AI_RESERVED_FALLBACK_COST"
  | "AI_REJECTED_SUICIDAL_CONTEST"
  | "AI_EARLY_CONTESTED_EXIT"
  | "AI_NEAREST_TRITIUM_DEFAULT_BURN"
  | "AI_FALLBACK_TOO_LATE_OR_UNAVAILABLE"
  | "AI_BURN_AWAY_DESTINATION_EVAL"
  | "AI_REJECTED_LEAVING_LAST_TRITIUM"
  | "AI_LAST_TRITIUM_PROTECTION"
  | "AI_LAST_TRITIUM_PARALYSIS_AUDIT"
  | "AI_TRITIUM_SURVIVAL_REQUIRED"
  | "CONTESTED_SUSTAINABILITY_CHECK"
  | "CONTESTED_REJECTED_UNSUSTAINABLE"
  | "CONTESTED_COLLAPSE_RISK"
  | "CONTESTED_EXIT_REQUIRED"
  | "START_STATE_AUDIT"
  | "FACTION_ELIMINATED"
  | "PRODUCTIVE_AUDIT"
  | "ALPHA_STRIKE_THREAT"
  | "SIMULTANEOUS_TURN_AUDIT"
  | "AI_EVADE_EXCLUDED"
  | "AI_EVADE_FAILED"
  | "TRITIUM_INCOME"
  | "SHIPYARD_PROGRESS"
  | "SHIPYARD_PRODUCTION_CHECK"
  | "SHIPYARD_PRODUCTION_SUSPENDED_CONTESTED"
  | "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION"
  | "NODE_STACKING_INVARIANT_VIOLATION"
  | "SHIP_PRODUCED"
  | "MANDATORY_LAUNCH"
  | "MANDATORY_LAUNCH_DESTROYED"
  | "CONTESTED_UPKEEP_PAID"
  | "CONTESTED_UPKEEP_FAILED"
  | "FIRE_LAUNCHED"
  | "MISSILE_IMPACT"
  | "MISSILE_MISSED"
  | "MISSILE_SOLUTION_BROKEN"
  | "SHIP_DESTROYED"
  | "WRECK_FIELD_CREATED"
  | "EVADE"
  | "EVADE_BLOCKED"
  | "BURN_DEPARTED"
  | "BURN_FAILED";

export type TurnDebugEvent = Readonly<{
  turn: number;
  type: TurnDebugEventType;
  message: string;
  nodeId?: string;
  factionId?: FactionId;
  action?:
    | "WORK"
    | "BURN"
    | "FIRE"
    | "EVADE"
    | "LEAVE_CONTESTED"
    | "STAY_CONTESTED"
    | "MANDATORY_LAUNCH";
  reason?: string;
  originNodeId?: string;
  firingNodeId?: string;
  missileId?: string;
  destinationNodeId?: string;
  targetNodeId?: string;
  targetFactionId?: FactionId;
  amount?: number;
  projectedDv?: number;
  progress?: number;
  progressBefore?: number;
  progressAfter?: number;
  burnCost?: number;
  etaTurns?: number;
  missileEtaTurns?: number;
  burnArrivalTurn?: number;
  missileImpactTurn?: number;
  evadeBlocked?: boolean;
  intentKind?: string;
  expiresTurn?: number;
  score?: number;
  phase?: string;
  rule?: string;
  expected?: string;
  actual?: string;
  occupantsByFaction?: Partial<Record<FactionId, number>>;
  contested?: boolean;
  productionAllowed?: boolean;
  producedShipId?: string;
  mandatoryLaunchId?: string;
  initialBudget?: number;
  plannedSpending?: number;
  projectedUpkeep?: number;
  guaranteedIncome?: number;
  minimumReserve?: number;
  sacrificedFrontNodeId?: string;
}>;

export type BurnPlan = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  burnCost: number;
  etaTurns: number;
  issuedTurn: number;
  arrivalTurn: number;
  originPosition: Vec2;
  destinationPositionAtArrival: Vec2;
  departureDirection?: Vec2;
  transferCategory?: TransferCategory;
  transferWindowQuality?: TransferWindowQuality;
  motionRelation?: TransferMotionRelation;
  visualArcType?: TransferVisualArcType;
  visualArcHeight?: number;
  transferDifficultyScore?: number;
  energyScore?: number;
}>;

export type PendingBurnOrder = BurnPlan &
  Readonly<{
    id: string;
    factionId: FactionId;
    shipCount: number;
    mandatoryLaunchId?: string;
  }>;

export type FirePlan = Readonly<{
  originNodeId: string;
  targetNodeId: string;
  missileEtaTurns: number;
  issuedTurn: number;
  impactTurn: number;
  originPosition: Vec2;
  targetPositionAtImpact: Vec2;
  transferCategory?: TransferCategory;
  transferWindowQuality?: TransferWindowQuality;
  motionRelation?: TransferMotionRelation;
  visualArcType?: TransferVisualArcType;
  visualArcHeight?: number;
  transferDifficultyScore?: number;
  energyScore?: number;
}>;

export type PendingFireOrder = FirePlan &
  Readonly<{
    id: string;
    factionId: FactionId;
    targetFactionId: FactionId;
    targetShipKey: string;
  }>;

export type ActiveMissile = PendingFireOrder &
  Readonly<{
    launchedTurn: number;
  }>;

export type ActiveBurnTransit = PendingBurnOrder &
  Readonly<{
    departedTurn: number;
  }>;

export type BodySnapshot = Readonly<{
  id: string;
  name: string;
  kind: BodyKind;
  parentId: string | null;
  position: Vec2;
  orbitRadius: number;
  orbitPeriodTurns: number;
  initialAngle: number;
  visualRadius: number;
  visualClass: VisualClass;
}>;

export type NodeSnapshot = Readonly<{
  id: string;
  bodyId: string;
  label: string;
  type: NodeType;
  position: Vec2;
  nodeOrbitRadius: number;
  controllable: boolean;
  contestable: boolean;
  protectedNoWar: boolean;
  weaponsOffline: boolean;
  producesTritium: boolean;
  allowsShipyard: boolean;
  gravityWell: number;
  tritiumOutput: number;
  shipyardProgress: number;
  shipyardWorkerFactionId?: FactionId;
  isWorking: boolean;
  workingFactionId?: FactionId;
  isContested: boolean;
  contestedFactionIds: readonly FactionId[];
}>;

export type SolarSystemSnapshot = Readonly<{
  turn: number;
  gameMode?: GameModeId;
  factions?: readonly FactionIdentity[];
  factionDv: FactionDvReserve;
  bodies: readonly BodySnapshot[];
  nodes: readonly NodeSnapshot[];
  nodeOccupancies: readonly NodeOccupancy[];
  shipyardProgress: readonly ShipyardProgress[];
  mandatoryLaunches: readonly MandatoryLaunch[];
  pendingBurnOrders: readonly PendingBurnOrder[];
  pendingFireOrders: readonly PendingFireOrder[];
  activeBurnTransits: readonly ActiveBurnTransit[];
  activeMissiles: readonly ActiveMissile[];
  debugEvents: readonly TurnDebugEvent[];
  bounds: Bounds;
}>;

export type SimulationContent = SolarSystemData;
