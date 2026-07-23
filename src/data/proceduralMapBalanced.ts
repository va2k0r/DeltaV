import type { SolarSystemData } from "./schemas/solarSystem";
import type { ProceduralGeneratorConfig } from "./proceduralMapConfig";

export const BALANCED_PROCEDURAL_TRANSFER_RULES = {
  globalEtaMultiplier: 1,
  sameSystemPlanetMoonEta: 1,
  sameSystemMoonEta: 2,
  planetDistanceScale: {
    mercury: 1,
    venus: 2,
    earth: 3,
    mars: 4,
    jupiter: 7,
    saturn: 10,
    uranus: 13,
    neptune: 16,
    pluto: 20
  },
  planetDistanceEtaTable: {
    "1": 3,
    "2": 3,
    "3": 4,
    "4": 4,
    "5": 5,
    "6": 5,
    "7": 6,
    "8": 6,
    "9": 7,
    "10": 7,
    "11": 7,
    "12": 7,
    "13": 7,
    "14": 7,
    "15": 7,
    "16": 7,
    "17": 7,
    "18": 7,
    "19": 7
  },
  planetDistanceBurnCostAdjustmentTable: {
    "15": -1,
    "16": -1,
    "17": -1,
    "18": -1,
    "19": -1
  },
  routeEtaOverrides: {}
} as const satisfies NonNullable<SolarSystemData["transferRules"]>;

export const BALANCED_PROCEDURAL_GENERATOR_CONFIG = {
  id: "balanced",
  candidateCount: 700,
  transferRules: BALANCED_PROCEDURAL_TRANSFER_RULES,
  productiveExclusions: ["earth_node", "moon_node"],
  startingExclusions: ["earth_node", "moon_node"],
  excludeMultiMoonParentProductiveNodes: false,
  maxProductiveNodesPerSystem: 2,
  maxSameRoleProductiveNodesPerSystem: 1,
  fairnessMinAcceptable: 64,
  fairnessHardReject: 38,
  majorOutlierSpread: 36,
  startingShipyardSecurityOutlierSpread: 28,
  startingShipyardOpeningPressureOutlierSpread: 40,
  threePlayerTritiumAccessSpreadHardReject: 34,
  threePlayerShipyardSecuritySpreadHardReject: 30,
  threePlayerDogpileRiskHardReject: 98,
  threePlayerEarlyCollapseRiskHardReject: 90,
  rejectSameFallbackRaceByT3: false,
  rejectSimultaneousEarlyHighRisk: false,
  starterRaidMinEtaTurns: 3,
  starterRaidMaxSymmetryEtaDelta: 1,
  starterRaidMaxSymmetryBurnCostDelta: 1,
  neutralExpansionMaxEtaTurns: 3,
  neutralExpansionMaxBurnCost: 4,
  fallbackRecoveryStartingDv: 10,
  fallbackRecoveryFirstUpkeep: 2,
  killboxPenalty: 6,
  scoreWeights: {
    distribution: 0.2,
    fairness: 0.43,
    expansion: 0.2,
    conflict: 0.17
  }
} as const satisfies ProceduralGeneratorConfig;
