import type { FactionId } from "../core/state/types";
import type { SolarSystemData } from "./schemas/solarSystem";

export type ProceduralMapGeneratorId = "balanced" | "classic";

export type ProceduralGeneratorConfig = Readonly<{
  id: ProceduralMapGeneratorId;
  candidateCount: number;
  transferRules?: NonNullable<SolarSystemData["transferRules"]>;
  productiveExclusions: readonly string[];
  startingExclusions: readonly string[];
  excludeMultiMoonParentProductiveNodes: boolean;
  maxProductiveNodesPerSystem: number;
  maxSameRoleProductiveNodesPerSystem: number;
  fairnessMinAcceptable: number;
  fairnessHardReject: number;
  majorOutlierSpread: number;
  startingShipyardSecurityOutlierSpread: number;
  startingShipyardOpeningPressureOutlierSpread: number;
  threePlayerTritiumAccessSpreadHardReject: number;
  threePlayerShipyardSecuritySpreadHardReject: number;
  threePlayerDogpileRiskHardReject: number;
  threePlayerEarlyCollapseRiskHardReject: number;
  rejectSameFallbackRaceByT3: boolean;
  rejectSimultaneousEarlyHighRisk: boolean;
  starterRaidMinEtaTurns: number;
  starterRaidMaxSymmetryEtaDelta: number;
  starterRaidMaxSymmetryBurnCostDelta: number;
  neutralExpansionMaxEtaTurns: number;
  neutralExpansionMaxBurnCost: number;
  fallbackRecoveryStartingDv: number;
  fallbackRecoveryFirstUpkeep: number;
  killboxPenalty: number;
  scoreWeights: Readonly<{
    distribution: number;
    fairness: number;
    expansion: number;
    conflict: number;
  }>;
}>;

export const PROCEDURAL_DEFAULT_SEED = "deltav-procedural";
export const PROCEDURAL_CANDIDATE_COUNT = 500;
export const PROCEDURAL_FAIRNESS_MIN_ACCEPTABLE = 60;
export const PROCEDURAL_FAIRNESS_HARD_REJECT = 30;
export const PROCEDURAL_MAJOR_OUTLIER_SPREAD = 42;
export const PROCEDURAL_STARTING_SHIPYARD_SECURITY_OUTLIER_SPREAD = 18;
export const PROCEDURAL_STARTING_SHIPYARD_OPENING_PRESSURE_OUTLIER_SPREAD = 30;
export const PROCEDURAL_3P_TRITIUM_ACCESS_SPREAD_HARD_REJECT = 38;
export const PROCEDURAL_3P_SHIPYARD_SECURITY_SPREAD_HARD_REJECT = 32;
export const PROCEDURAL_3P_DOGPILE_RISK_HARD_REJECT = 92;
export const PROCEDURAL_3P_EARLY_COLLAPSE_RISK_HARD_REJECT = 84;
export const PROCEDURAL_FACTION_IDS = [
  "player",
  "opponent",
  "ai_2"
] as const satisfies readonly FactionId[];
export const PROCEDURAL_TWO_PLAYER_FACTION_IDS = [
  "player",
  "opponent"
] as const satisfies readonly FactionId[];
