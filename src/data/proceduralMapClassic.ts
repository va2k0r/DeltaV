import {
  PROCEDURAL_3P_DOGPILE_RISK_HARD_REJECT,
  PROCEDURAL_3P_EARLY_COLLAPSE_RISK_HARD_REJECT,
  PROCEDURAL_3P_SHIPYARD_SECURITY_SPREAD_HARD_REJECT,
  PROCEDURAL_3P_TRITIUM_ACCESS_SPREAD_HARD_REJECT,
  PROCEDURAL_CANDIDATE_COUNT,
  PROCEDURAL_FAIRNESS_HARD_REJECT,
  PROCEDURAL_FAIRNESS_MIN_ACCEPTABLE,
  PROCEDURAL_MAJOR_OUTLIER_SPREAD,
  PROCEDURAL_STARTING_SHIPYARD_OPENING_PRESSURE_OUTLIER_SPREAD,
  PROCEDURAL_STARTING_SHIPYARD_SECURITY_OUTLIER_SPREAD,
  type ProceduralGeneratorConfig
} from "./proceduralMapConfig";

export const CLASSIC_PROCEDURAL_GENERATOR_CONFIG = {
  id: "classic",
  candidateCount: PROCEDURAL_CANDIDATE_COUNT,
  productiveExclusions: ["earth_node", "moon_node", "jupiter_node", "io_node"],
  startingExclusions: ["earth_node", "moon_node"],
  excludeMultiMoonParentProductiveNodes: true,
  maxProductiveNodesPerSystem: 99,
  maxSameRoleProductiveNodesPerSystem: 99,
  fairnessMinAcceptable: PROCEDURAL_FAIRNESS_MIN_ACCEPTABLE,
  fairnessHardReject: PROCEDURAL_FAIRNESS_HARD_REJECT,
  majorOutlierSpread: PROCEDURAL_MAJOR_OUTLIER_SPREAD,
  startingShipyardSecurityOutlierSpread: PROCEDURAL_STARTING_SHIPYARD_SECURITY_OUTLIER_SPREAD,
  startingShipyardOpeningPressureOutlierSpread:
    PROCEDURAL_STARTING_SHIPYARD_OPENING_PRESSURE_OUTLIER_SPREAD,
  threePlayerTritiumAccessSpreadHardReject: PROCEDURAL_3P_TRITIUM_ACCESS_SPREAD_HARD_REJECT,
  threePlayerShipyardSecuritySpreadHardReject: PROCEDURAL_3P_SHIPYARD_SECURITY_SPREAD_HARD_REJECT,
  threePlayerDogpileRiskHardReject: PROCEDURAL_3P_DOGPILE_RISK_HARD_REJECT,
  threePlayerEarlyCollapseRiskHardReject: PROCEDURAL_3P_EARLY_COLLAPSE_RISK_HARD_REJECT,
  rejectSameFallbackRaceByT3: true,
  rejectSimultaneousEarlyHighRisk: true,
  starterRaidMinEtaTurns: 3,
  starterRaidMaxSymmetryEtaDelta: 1,
  starterRaidMaxSymmetryBurnCostDelta: 1,
  neutralExpansionMaxEtaTurns: 3,
  neutralExpansionMaxBurnCost: 4,
  fallbackRecoveryStartingDv: 10,
  fallbackRecoveryFirstUpkeep: 2,
  killboxPenalty: 16,
  scoreWeights: {
    distribution: 0.34,
    fairness: 0.31,
    expansion: 0.18,
    conflict: 0.17
  }
} as const satisfies ProceduralGeneratorConfig;
