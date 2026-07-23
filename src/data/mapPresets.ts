import { parseSolarSystemData } from "./loadSolarSystem";
import type { BodyData, NodeData, NodeType, SolarSystemData } from "./schemas/solarSystem";
import { DEFAULT_INITIAL_OCCUPANCIES } from "../shared/startingSetup";
import { calculateFirePlan, describeTransferRoute, type TransferRouteDebug } from "../core";
import type { FactionId, GameModeId } from "../core/state/types";
import { BALANCED_PROCEDURAL_GENERATOR_CONFIG } from "./proceduralMapBalanced";
import { CLASSIC_PROCEDURAL_GENERATOR_CONFIG } from "./proceduralMapClassic";
import {
  PROCEDURAL_DEFAULT_SEED,
  PROCEDURAL_FACTION_IDS,
  PROCEDURAL_TWO_PLAYER_FACTION_IDS,
  type ProceduralGeneratorConfig,
  type ProceduralMapGeneratorId
} from "./proceduralMapConfig";

export { STARTING_SETUP } from "../shared/startingSetup";
export type { ProceduralMapGeneratorId } from "./proceduralMapConfig";

export const CURRENT_MAP_PRESET_ID = "current";
export const STRATEGIC_MAP_PRESET_ID = "strategic";
export const PROCEDURAL_MAP_PRESET_ID = "procedural";
export const CLASSIC_PROCEDURAL_MAP_PRESET_ID = "procedural-classic";
export const DEFAULT_MAP_PRESET_ID = PROCEDURAL_MAP_PRESET_ID;

export type MapPresetId =
  | typeof CURRENT_MAP_PRESET_ID
  | typeof STRATEGIC_MAP_PRESET_ID
  | typeof PROCEDURAL_MAP_PRESET_ID
  | typeof CLASSIC_PROCEDURAL_MAP_PRESET_ID;

export type MapPresetInitialOccupancy = Readonly<{
  nodeId: string;
  factionId: FactionId;
  shipCount: number;
}>;

export type ProceduralMapControllerType = "human" | "ai" | "idle";

export type ProceduralMapStart = Readonly<{
  factionId: FactionId;
  controllerType: ProceduralMapControllerType;
  tritium: string;
  shipyard: string;
  staging: string;
  startingShips: readonly MapPresetInitialOccupancy[];
}>;

export type ProceduralTritiumOptionAudit = Readonly<{
  nodeId: string;
  burnTurns: number;
  burnCost: number;
  normalizedQuality: number;
  enemyPressureRisk: number;
}>;

export type ProceduralTritiumAccessAudit = Readonly<{
  startingTritium: string;
  nearestFallbackTritium: string | null;
  nearestFallbackBurnTurns: number | null;
  nearestFallbackBurnCost: number | null;
  fallbackPaybackEstimate: number | null;
  rankedTritiumOptions: readonly ProceduralTritiumOptionAudit[];
  tritiumAccessScore: number;
  tritiumRecoveryScore: number;
}>;

export type ProceduralShipyardExposureAudit = Readonly<{
  startingShipyard: string;
  incomingBurnPressureFromEnemies: number;
  incomingFirePressureFromEnemies: number;
  contestRisk: number;
  progressStealRisk: number;
  outgoingFireValue: number;
  outgoingBurnValue: number;
  mandatoryLaunchRisk: number;
  shipyardSecurityScore: number;
  notes: readonly string[];
}>;

export type ProceduralOpeningCurveAudit = Readonly<{
  expectedDvByTurn: readonly number[];
  expectedShipyardProgressByTurn: readonly number[];
  likelySecondTritiumTiming: number | null;
  likelyFirstPressureReceived: number | null;
  likelyFirstPressureApplied: number | null;
  predictedCollapseRisk: number;
}>;

export type ProceduralStarterRaidAudit = Readonly<{
  startingTritium: string;
  enemyFaction: ProceduralFactionId | null;
  enemyOriginNode: string | null;
  enemyBurnTurns: number | null;
  enemyBurnCost: number | null;
  reciprocalBurnTurns: number | null;
  reciprocalBurnCost: number | null;
  exceptionalSymmetryUsed: boolean;
  hardGatePassed: boolean;
  rejectionReason: string | null;
}>;

export type ProceduralNeutralExpansionAudit = Readonly<{
  neutralTritium: string | null;
  burnTurns: number | null;
  burnCost: number | null;
  firstWorkTurn: number | null;
  hardGatePassed: boolean;
  rejectionReason: string | null;
}>;

export type ProceduralFallbackRecoverySolvencyAudit = Readonly<{
  fallbackTritium: string | null;
  burnTurns: number | null;
  burnCost: number | null;
  firstWorkTurn: number | null;
  projectedDvAtArrival: number | null;
  firstUpkeepCost: number;
  cheapestExitBurnCost: number | null;
  projectedDvAfterUpkeepAndExit: number | null;
  hardGatePassed: boolean;
  rejectionReason: string | null;
}>;

export type ProceduralFactionFairnessAudit = Readonly<{
  tritiumAccessScore: number;
  shipyardSecurityScore: number;
  stagingValueScore: number;
  pressureReceivedScore: number;
  pressureAppliedScore: number;
  dogpileRisk: number;
  fallbackTritiumQuality: number;
  fallbackShipyardQuality: number;
  tritiumAccess: ProceduralTritiumAccessAudit;
  shipyardAudit: ProceduralShipyardExposureAudit;
  openingCurve: ProceduralOpeningCurveAudit;
  starterRaid: ProceduralStarterRaidAudit;
  neutralExpansion: ProceduralNeutralExpansionAudit;
  fallbackRecoverySolvency: ProceduralFallbackRecoverySolvencyAudit;
}>;

export type ProceduralEarlyCollapseAudit = Readonly<{
  faction: ProceduralFactionId;
  startingTritium: string;
  startingShipyard: string;
  stagingNode: string;
  nearestFallbackTritium: string | null;
  fallbackArrivalTurn: number | null;
  contestedRiskByT3: number;
  dogpileRisk: number;
  tritiumAccessScore: number;
  predictedContestedUpkeepBurden: number;
  hardGatePassed: boolean;
  rejectionReason: string | null;
}>;

export type ProceduralMapFairnessAudit = Readonly<{
  hardGatePassed: boolean;
  hardGateFailures: readonly string[];
  activeFactionIds: readonly ProceduralFactionId[];
  factionScores: Readonly<Partial<Record<ProceduralFactionId, ProceduralFactionFairnessAudit>>>;
  earlyCollapseAudits: readonly ProceduralEarlyCollapseAudit[];
  worstAsymmetryReason: string;
  fallbackStaticLayoutUsed: boolean;
}>;

export type ProceduralMapDebug = Readonly<{
  seed: string;
  selectedTritiumNodes: readonly string[];
  selectedShipyardNodes: readonly string[];
  playerStart: ProceduralMapStart;
  opponentStart: ProceduralMapStart;
  ai_2Start: ProceduralMapStart;
  excludedNodes: Readonly<{
    productive: readonly string[];
    starting: readonly string[];
  }>;
  finalScore: number;
  distributionScore: number;
  fairnessScore: number;
  expansionScore: number;
  conflictScore: number;
  killboxWarnings: readonly string[];
  acceptedMapWarnings: readonly string[];
  evaluatedCandidateCount: number;
  acceptedCandidateCount: number;
  rejectedCandidateCount: number;
  candidateDiscardStats: readonly string[];
  candidateRejectionStats: readonly string[];
  rigidAuditRejectedCandidates: number;
  rigidAuditRejectionStats: readonly string[];
  hardGatePassed: boolean;
  hardGateFailures: readonly string[];
  fairnessAudit: ProceduralMapFairnessAudit;
  fairnessAuditByMode: Readonly<Record<GameModeId, ProceduralMapFairnessAudit>>;
}>;

export type ProceduralMapGeneration = Readonly<{
  seed: string;
  content: SolarSystemData;
  initialOccupancies: readonly MapPresetInitialOccupancy[];
  debug: ProceduralMapDebug;
}>;

export type MapPreset = Readonly<{
  id: MapPresetId;
  label: string;
  statusLabel: string;
  contentUrl?: string;
  content?: SolarSystemData;
  initialOccupancies?: readonly MapPresetInitialOccupancy[];
  procedural?: boolean;
  proceduralGenerator?: ProceduralMapGeneratorId;
}>;

type StrategicNodeInput = Omit<NodeData, "weaponsOffline"> &
  Readonly<{
    weaponsOffline?: boolean;
  }>;
type OrbitDynamicsConfig = Readonly<{
  useRigidPlanetFormation: boolean;
  globalPlanetAngularSpeed: number;
  perPlanetAngularSpeedOverrides: Readonly<Partial<Record<string, number>>>;
  globalMoonAngularSpeed: number;
  perMoonSystemAngularSpeedOverrides: Readonly<Partial<Record<string, number>>>;
}>;

const CURRENT_MAP_CONTENT_URL = `${import.meta.env.BASE_URL}content/vanilla/data/bodies.json`;

// Future small-body additions belong here when a later milestone activates them.
export const FUTURE_SMALL_BODY_PLACEHOLDERS = ["ceres", "vesta", "pallas"] as const;

const STRATEGIC_MAP_GLOBAL_SCALE_MULTIPLIER = 1;
const STRATEGIC_MAP_ORBIT_BASE_OFFSET = 28;
const STRATEGIC_MAP_ORBIT_UNITS_PER_SCALE = 42;

// Edit orbital motion here. Rigid formation keeps all planets at the same angular speed for now.
const ORBIT_DYNAMICS: OrbitDynamicsConfig = {
  useRigidPlanetFormation: true,
  globalPlanetAngularSpeed: 5,
  perPlanetAngularSpeedOverrides: {},
  globalMoonAngularSpeed: 30,
  perMoonSystemAngularSpeedOverrides: {}
};

// Edit node visual position by changing orbit radius scale or initial angle here.
const PLANET_DISTANCE_SCALE = {
  mercury: 1,
  venus: 2,
  earth: 3,
  mars: 4,
  jupiter: 7,
  saturn: 10,
  uranus: 13,
  neptune: 16,
  pluto: 20
} as const;

const PLANET_INITIAL_ANGLES = {
  mercury: 270,
  venus: 90,
  earth: 180,
  mars: 0,
  jupiter: 270,
  saturn: 90,
  uranus: 180,
  neptune: 0,
  pluto: 270
} as const;

const MOON_INITIAL_ANGLES = {
  moon: 90,
  phobos: 0,
  deimos: 180,
  io: 0,
  europa: 90,
  ganymede: 180,
  callisto: 270,
  titan: 90,
  iapetus: 270,
  oberon: 90,
  titania: 270,
  triton: 246,
  charon: 180
} as const;

// Edit productive role here. All unlisted active nodes are barren.
const PRODUCTIVE_NODES = {
  tritium: ["titan", "europa", "venus", "titania", "triton"],
  shipyard: ["deimos", "iapetus", "callisto", "oberon", "charon"]
} as const;

// Edit weapons offline flag here. These nodes cannot originate FIRE orders.
const WEAPONS_OFFLINE_BODIES = ["earth", "moon"] as const;

const STRATEGIC_INITIAL_OCCUPANCIES: readonly MapPresetInitialOccupancy[] = [
  ...DEFAULT_INITIAL_OCCUPANCIES
];
const CURRENT_INITIAL_OCCUPANCIES: readonly MapPresetInitialOccupancy[] = [
  { nodeId: "jupiter_node", factionId: "player", shipCount: 1 },
  { nodeId: "mars_node", factionId: "player", shipCount: 1 },
  { nodeId: "callisto_node", factionId: "player", shipCount: 1 },
  { nodeId: "neptune_node", factionId: "opponent", shipCount: 1 },
  { nodeId: "pluto_charon_node", factionId: "opponent", shipCount: 1 },
  { nodeId: "triton_node", factionId: "opponent", shipCount: 1 }
];
const PROCEDURAL_TRITIUM_NODE_COUNT = 6;
const PROCEDURAL_SHIPYARD_NODE_COUNT = 5;

const STRATEGIC_BODIES: readonly BodyData[] = [
  createBody("sun", "Sun", "star", null, 0, 0, 0, 18, "star"),
  createPlanet("mercury", "Mercury", 5, "rocky"),
  createPlanet("venus", "Venus", 7, "rocky"),
  createPlanet("earth", "Earth", 8, "protected"),
  createMoon("moon", "Moon", "earth", 38, 3, "protectedMoon"),
  createPlanet("mars", "Mars", 6, "rocky"),
  createMoon("phobos", "Phobos", "mars", 18, 2, "moon"),
  createMoon("deimos", "Deimos", "mars", 28, 2, "moon"),
  createPlanet("jupiter", "Jupiter", 15, "gasGiant"),
  createMoon("io", "Io", "jupiter", 38, 3, "moon"),
  createMoon("europa", "Europa", "jupiter", 52, 3, "moon"),
  createMoon("ganymede", "Ganymede", "jupiter", 62, 4, "moon"),
  createMoon("callisto", "Callisto", "jupiter", 72, 4, "moon"),
  createPlanet("saturn", "Saturn", 14, "gasGiant"),
  createMoon("titan", "Titan", "saturn", 66, 5, "moon"),
  createMoon("iapetus", "Iapetus", "saturn", 92, 3, "moon"),
  createPlanet("uranus", "Uranus", 12, "iceGiant"),
  createMoon("oberon", "Oberon", "uranus", 58, 3, "moon"),
  createMoon("titania", "Titania", "uranus", 46, 3, "moon"),
  createPlanet("neptune", "Neptune", 12, "iceGiant"),
  createMoon("triton", "Triton", "neptune", 60, 4, "moon"),
  createBody(
    "pluto",
    "Pluto",
    "dwarfPlanet",
    "sun",
    scaledOrbitRadius("pluto"),
    getPlanetOrbitPeriod("pluto"),
    PLANET_INITIAL_ANGLES.pluto,
    6,
    "dwarfBinary"
  ),
  createMoon("charon", "Charon", "pluto", 34, 3, "moon")
];

const STRATEGIC_NODES: readonly StrategicNodeInput[] = STRATEGIC_BODIES.filter((body) => {
  return body.id !== "sun";
}).map(createStrategicNode);

const STRATEGIC_MAP_CONTENT = parseSolarSystemData({
  schemaVersion: 1,
  bodies: STRATEGIC_BODIES,
  nodes: STRATEGIC_NODES
});

export const MAP_PRESETS = [
  {
    id: CURRENT_MAP_PRESET_ID,
    label: "Canonical Map · v10",
    statusLabel: "v10 Solar System",
    contentUrl: CURRENT_MAP_CONTENT_URL,
    initialOccupancies: CURRENT_INITIAL_OCCUPANCIES
  },
  {
    id: PROCEDURAL_MAP_PRESET_ID,
    label: "Procedural Map · Balanced",
    statusLabel: "Procedural Balanced",
    procedural: true,
    proceduralGenerator: "balanced"
  },
  {
    id: CLASSIC_PROCEDURAL_MAP_PRESET_ID,
    label: "Procedural Map · Classic",
    statusLabel: "Procedural Classic",
    procedural: true,
    proceduralGenerator: "classic"
  },
  {
    id: STRATEGIC_MAP_PRESET_ID,
    label: "Curated Map",
    statusLabel: "Curated Map",
    content: STRATEGIC_MAP_CONTENT,
    initialOccupancies: STRATEGIC_INITIAL_OCCUPANCIES
  }
] as const satisfies readonly MapPreset[];

export function getMapPreset(id: MapPresetId): MapPreset {
  const preset = MAP_PRESETS.find((candidate) => candidate.id === id);

  if (preset === undefined) {
    throw new Error(`Unknown map preset "${id}".`);
  }

  return preset;
}

function createPlanet(
  id: keyof typeof PLANET_DISTANCE_SCALE,
  name: string,
  visualRadius: number,
  visualClass: BodyData["visualClass"]
): BodyData {
  return createBody(
    id,
    name,
    id === "pluto" ? "dwarfPlanet" : "planet",
    "sun",
    scaledOrbitRadius(id),
    getPlanetOrbitPeriod(id),
    PLANET_INITIAL_ANGLES[id],
    visualRadius,
    visualClass
  );
}

function createMoon(
  id: string,
  name: string,
  parentId: string,
  orbitRadius: number,
  visualRadius: number,
  visualClass: BodyData["visualClass"]
): BodyData {
  return createBody(
    id,
    name,
    "moon",
    parentId,
    orbitRadius,
    getMoonOrbitPeriod(parentId),
    MOON_INITIAL_ANGLES[id as keyof typeof MOON_INITIAL_ANGLES],
    visualRadius,
    visualClass
  );
}

function createBody(
  id: string,
  name: string,
  kind: BodyData["kind"],
  parentId: string | null,
  orbitRadius: number,
  orbitPeriodTurns: number,
  initialAngle: number,
  visualRadius: number,
  visualClass: BodyData["visualClass"]
): BodyData {
  return {
    id,
    name,
    kind,
    parentId,
    orbitRadius,
    orbitPeriodTurns,
    initialAngle,
    visualRadius,
    visualClass
  };
}

function createStrategicNode(body: BodyData): StrategicNodeInput {
  const type = getStrategicNodeType(body.id);

  return {
    id: `${body.id}_node`,
    bodyId: body.id,
    type,
    controllable: true,
    contestable: true,
    protectedNoWar: false,
    producesTritium: type === "tritium",
    allowsShipyard: type === "shipyard",
    ...(WEAPONS_OFFLINE_BODIES.includes(body.id as (typeof WEAPONS_OFFLINE_BODIES)[number])
      ? { weaponsOffline: true }
      : {}),
    gravityWell: getGravityWell(body),
    nodeOrbitRadius: getNodeOrbitRadius(body)
  };
}

function getStrategicNodeType(bodyId: string): NodeType {
  if (PRODUCTIVE_NODES.tritium.includes(bodyId as (typeof PRODUCTIVE_NODES.tritium)[number])) {
    return "tritium";
  }

  if (PRODUCTIVE_NODES.shipyard.includes(bodyId as (typeof PRODUCTIVE_NODES.shipyard)[number])) {
    return "shipyard";
  }

  return "barren";
}

function scaledOrbitRadius(bodyId: keyof typeof PLANET_DISTANCE_SCALE): number {
  return (
    (STRATEGIC_MAP_ORBIT_BASE_OFFSET +
      PLANET_DISTANCE_SCALE[bodyId] * STRATEGIC_MAP_ORBIT_UNITS_PER_SCALE) *
    STRATEGIC_MAP_GLOBAL_SCALE_MULTIPLIER
  );
}

function getPlanetOrbitPeriod(bodyId: keyof typeof PLANET_DISTANCE_SCALE): number {
  const angularSpeed = ORBIT_DYNAMICS.useRigidPlanetFormation
    ? ORBIT_DYNAMICS.globalPlanetAngularSpeed
    : (ORBIT_DYNAMICS.perPlanetAngularSpeedOverrides[bodyId] ??
      ORBIT_DYNAMICS.globalPlanetAngularSpeed);

  return angularSpeedToOrbitPeriod(angularSpeed);
}

function getMoonOrbitPeriod(parentId: string): number {
  const angularSpeed =
    ORBIT_DYNAMICS.perMoonSystemAngularSpeedOverrides[parentId] ??
    ORBIT_DYNAMICS.globalMoonAngularSpeed;

  return angularSpeedToOrbitPeriod(angularSpeed);
}

function angularSpeedToOrbitPeriod(degreesPerTurn: number): number {
  return 360 / degreesPerTurn;
}

function getGravityWell(body: BodyData): number {
  if (body.kind === "moon") {
    return body.visualRadius >= 4 ? 1 : 0;
  }

  if (body.visualClass === "gasGiant") {
    return 3;
  }

  if (body.visualClass === "iceGiant" || body.kind === "dwarfPlanet") {
    return 2;
  }

  return body.id === "sun" ? 0 : 1;
}

function getNodeOrbitRadius(body: BodyData): number {
  if (body.kind === "moon") {
    return Math.max(7, body.visualRadius * 2 + 4);
  }

  if (body.visualClass === "gasGiant") {
    return 27;
  }

  if (body.visualClass === "iceGiant") {
    return 22;
  }

  if (body.kind === "dwarfPlanet") {
    return 16;
  }

  return Math.max(13, body.visualRadius * 2);
}

type ProceduralFactionId = (typeof PROCEDURAL_FACTION_IDS)[number];

type ProceduralVec2 = Readonly<{
  x: number;
  y: number;
}>;

type ProceduralNodeFact = Readonly<{
  node: NodeData;
  body: BodyData;
  position: ProceduralVec2;
  systemId: string;
  region: "inner" | "middle" | "outer";
  order: number;
}>;

type ProceduralCandidate = Readonly<{
  tritiumNodeIds: readonly string[];
  shipyardNodeIds: readonly string[];
  playerStart: ProceduralMapStart;
  opponentStart: ProceduralMapStart;
  ai_2Start: ProceduralMapStart;
}>;

type ProceduralCandidateScore = Readonly<{
  finalScore: number;
  distributionScore: number;
  fairnessScore: number;
  expansionScore: number;
  conflictScore: number;
  killboxWarnings: readonly string[];
  hardGatePassed: boolean;
  hardGateFailures: readonly string[];
  fairnessAudit: ProceduralMapFairnessAudit;
}>;

type ProceduralRejectionTally = Map<string, number>;

type ProceduralRouteQuality = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  burnTurns: number;
  burnCost: number;
  burnQuality: number;
  burnTimingScore: number;
  burnAffordabilityScore: number;
  contestPressure: number;
  escapeValue: number;
  recoveryValue: number;
  fireFeasible: boolean;
  fireTurns: number | null;
  firePressure: number;
  transferCategory: string;
  windowQuality: TransferRouteDebug["windowQuality"];
  movementFavorability: TransferRouteDebug["motionRelation"];
}>;

type ProceduralReachabilityMatrix = Readonly<{
  routeByKey: ReadonlyMap<string, ProceduralRouteQuality>;
  relevantNodeIds: readonly string[];
  burnCosts: ProceduralDistributionStats;
  burnTurns: ProceduralDistributionStats;
  fireTurns: ProceduralDistributionStats;
}>;

type ProceduralDistributionStats = Readonly<{
  min: number;
  max: number;
  median: number;
  q1: number;
  q3: number;
  p90: number;
}>;

type ProceduralRouteInput = Readonly<{
  route: TransferRouteDebug;
  fireTurns: number | null;
}>;

const PROCEDURAL_GENERATOR_CONFIGS = {
  balanced: BALANCED_PROCEDURAL_GENERATOR_CONFIG,
  classic: CLASSIC_PROCEDURAL_GENERATOR_CONFIG
} as const satisfies Record<ProceduralMapGeneratorId, ProceduralGeneratorConfig>;

const proceduralRouteInputCache = new Map<string, ProceduralRouteInput | null>();
const proceduralGenerationCache = new Map<string, ProceduralMapGeneration>();

export function createProceduralMapSeed(): string {
  const timePart = Date.now().toString(36);
  const randomPart = Math.floor(Math.random() * 0xffffffff)
    .toString(36)
    .padStart(7, "0");

  return `proc-${timePart}-${randomPart}`;
}

export function generateProceduralMap(
  seed: string = PROCEDURAL_DEFAULT_SEED,
  generator: ProceduralMapGeneratorId = "balanced"
): ProceduralMapGeneration {
  const normalizedSeed = normalizeProceduralSeed(seed);
  const config = getProceduralGeneratorConfig(generator);
  const generationCacheKey = createProceduralGenerationCacheKey(config.id, normalizedSeed);
  const cachedGeneration = proceduralGenerationCache.get(generationCacheKey);

  if (cachedGeneration !== undefined) {
    return cachedGeneration;
  }

  const rng = createSeededRandom(normalizedSeed);
  const excludedNodes = getProceduralExcludedNodes(config);
  const nodeFacts = createProceduralNodeFacts(STRATEGIC_MAP_CONTENT);
  const rejectionTally: ProceduralRejectionTally = new Map();
  const eligibleProductiveNodes = STRATEGIC_MAP_CONTENT.nodes.filter((node) => {
    return !excludedNodes.productive.has(node.id) && node.controllable;
  });
  const eligibleStartingNodes = STRATEGIC_MAP_CONTENT.nodes.filter((node) => {
    return !excludedNodes.starting.has(node.id) && node.controllable;
  });
  const candidateConstructionRejectionTally: ProceduralRejectionTally = new Map();
  const candidateDiscardTally: ProceduralRejectionTally = new Map();
  let bestCandidate: ProceduralCandidate | null = null;
  let bestScore: ProceduralCandidateScore | null = null;
  let acceptedCandidateCount = 0;
  let rejectedCandidateCount = 0;

  for (let index = 0; index < config.candidateCount; index += 1) {
    const candidate = createProceduralCandidate(
      rng,
      eligibleProductiveNodes,
      eligibleStartingNodes,
      nodeFacts,
      config,
      candidateConstructionRejectionTally
    );

    if (candidate === null) {
      rejectedCandidateCount += 1;
      continue;
    }

    const score = scoreProceduralCandidate(candidate, nodeFacts, config);
    const threePlayerScore = scoreProceduralCandidate(
      candidate,
      nodeFacts,
      config,
      false,
      getProceduralActiveFactionIdsForMode("3p")
    );
    const generationHardGateFailures = uniqueStrings([
      ...score.hardGateFailures,
      ...threePlayerScore.hardGateFailures.map((failure) => `3p:${failure}`)
    ]);

    for (const warning of score.killboxWarnings) {
      tallyRejection(rejectionTally, warning);
    }

    for (const failure of generationHardGateFailures) {
      tallyRejection(rejectionTally, failure);
    }

    if (generationHardGateFailures.length > 0) {
      rejectedCandidateCount += 1;
      for (const failure of generationHardGateFailures) {
        tallyRejection(candidateDiscardTally, failure);
      }
      if (generationHardGateFailures.some(isRigidProceduralAuditFailure)) {
        tallyRejection(rejectionTally, "rigid-audit-candidate-rejected");
      }
      continue;
    }

    acceptedCandidateCount += 1;
    if (bestScore === null || score.finalScore > bestScore.finalScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  mergeRejectionTallies(rejectionTally, candidateConstructionRejectionTally);
  mergeRejectionTallies(candidateDiscardTally, candidateConstructionRejectionTally);

  if (bestCandidate === null || bestScore === null) {
    tallyRejection(rejectionTally, "procedural-fallback-static-layout-used");
    bestCandidate = createProceduralFallbackCandidate(config.id);
    bestScore = scoreProceduralCandidate(bestCandidate, nodeFacts, config, true);
    const fallbackThreePlayerScore = scoreProceduralCandidate(
      bestCandidate,
      nodeFacts,
      config,
      true,
      getProceduralActiveFactionIdsForMode("3p")
    );

    const fallbackRigidFailures = [
      ...bestScore.hardGateFailures,
      ...fallbackThreePlayerScore.hardGateFailures.map((failure) => `3p:${failure}`)
    ].filter(isRigidProceduralAuditFailure);

    if (fallbackRigidFailures.length > 0) {
      throw new Error(
        `Procedural map ${normalizedSeed} rejected: no candidate or static fallback passed rigid fairness audits (${fallbackRigidFailures.join(", ")})`
      );
    }
  }

  const content = createProceduralContent(bestCandidate, config);
  const initialOccupancies = createProceduralInitialOccupancies(bestCandidate);
  const onePlayerScore = scoreProceduralCandidate(
    bestCandidate,
    nodeFacts,
    config,
    bestScore.fairnessAudit.fallbackStaticLayoutUsed,
    getProceduralActiveFactionIdsForMode("1p")
  );
  const threePlayerScore = scoreProceduralCandidate(
    bestCandidate,
    nodeFacts,
    config,
    bestScore.fairnessAudit.fallbackStaticLayoutUsed,
    getProceduralActiveFactionIdsForMode("3p")
  );
  const acceptedMapWarnings = getAcceptedMapWarnings(bestScore);
  const debug: ProceduralMapDebug = {
    seed: normalizedSeed,
    selectedTritiumNodes: sortNodeIds(bestCandidate.tritiumNodeIds),
    selectedShipyardNodes: sortNodeIds(bestCandidate.shipyardNodeIds),
    playerStart: bestCandidate.playerStart,
    opponentStart: bestCandidate.opponentStart,
    ai_2Start: bestCandidate.ai_2Start,
    excludedNodes: {
      productive: sortNodeIds([...excludedNodes.productive]),
      starting: sortNodeIds([...excludedNodes.starting])
    },
    finalScore: roundScore(bestScore.finalScore),
    distributionScore: roundScore(bestScore.distributionScore),
    fairnessScore: roundScore(bestScore.fairnessScore),
    expansionScore: roundScore(bestScore.expansionScore),
    conflictScore: roundScore(bestScore.conflictScore),
    killboxWarnings: acceptedMapWarnings,
    acceptedMapWarnings,
    evaluatedCandidateCount: config.candidateCount,
    acceptedCandidateCount,
    rejectedCandidateCount,
    candidateDiscardStats: formatFullRejectionTally(candidateDiscardTally),
    candidateRejectionStats: formatRejectionTally(rejectionTally),
    rigidAuditRejectedCandidates: rejectionTally.get("rigid-audit-candidate-rejected") ?? 0,
    rigidAuditRejectionStats: formatRigidAuditRejectionTally(rejectionTally),
    hardGatePassed: bestScore.hardGatePassed,
    hardGateFailures: bestScore.hardGateFailures,
    fairnessAudit: bestScore.fairnessAudit,
    fairnessAuditByMode: {
      "1p": onePlayerScore.fairnessAudit,
      "2p": bestScore.fairnessAudit,
      "3p": threePlayerScore.fairnessAudit
    }
  };

  const generation: ProceduralMapGeneration = {
    seed: normalizedSeed,
    content,
    initialOccupancies,
    debug
  };

  proceduralGenerationCache.set(generationCacheKey, generation);
  return generation;
}

export function generateClassicProceduralMap(
  seed: string = PROCEDURAL_DEFAULT_SEED
): ProceduralMapGeneration {
  return generateProceduralMap(seed, "classic");
}

export function formatProceduralMapDebug(
  debug: ProceduralMapDebug | null,
  mode: GameModeId = "2p"
): string {
  if (debug === null) {
    return "";
  }

  const fairnessAudit = debug.fairnessAuditByMode[mode] ?? debug.fairnessAudit;

  return [
    "Procedural Map Debug",
    `Seed ${debug.seed}`,
    `Tritium ${debug.selectedTritiumNodes.join(", ")}`,
    `Shipyards ${debug.selectedShipyardNodes.join(", ")}`,
    formatProceduralStartDebugLine("Player", debug.playerStart),
    ...(mode === "1p"
      ? [formatProceduralStartDebugLine("inactiveOpponentStartCandidate", debug.opponentStart)]
      : [formatProceduralStartDebugLine("Opponent", debug.opponentStart)]),
    formatProceduralStartDebugLine(
      mode === "3p" ? "AI 2" : "inactiveThirdStartCandidate",
      debug.ai_2Start
    ),
    `Excluded productive ${debug.excludedNodes.productive.join(", ")}`,
    `Excluded starting ${debug.excludedNodes.starting.join(", ")}`,
    `Scores final ${debug.finalScore} | distribution ${debug.distributionScore} | fairness ${debug.fairnessScore} | expansion ${debug.expansionScore} | conflict ${debug.conflictScore}`,
    "MAP_FAIRNESS_AUDIT",
    `accepted ${debug.hardGatePassed}`,
    `hardGatePassed ${debug.hardGatePassed}`,
    `hardGateFailures ${debug.hardGateFailures.join(", ") || "-"}`,
    `activeFactions ${fairnessAudit.activeFactionIds.join(", ")}`,
    "MAP_EARLY_COLLAPSE_AUDIT",
    ...formatProceduralEarlyCollapseAuditDebug(fairnessAudit.earlyCollapseAudits),
    ...fairnessAudit.activeFactionIds.flatMap((factionId) => {
      const score = fairnessAudit.factionScores[factionId];

      if (score === undefined) {
        return [`${factionId}: missing fairness score`];
      }

      return [
        `${factionId}:`,
        `tritiumAccessScore ${roundScore(score.tritiumAccessScore)}`,
        `shipyardSecurityScore ${roundScore(score.shipyardSecurityScore)}`,
        `stagingValueScore ${roundScore(score.stagingValueScore)}`,
        `pressureReceivedScore ${roundScore(score.pressureReceivedScore)}`,
        `pressureAppliedScore ${roundScore(score.pressureAppliedScore)}`,
        `dogpileRisk ${roundScore(score.dogpileRisk)}`,
        `fallbackTritiumQuality ${roundScore(score.fallbackTritiumQuality)}`,
        `fallbackShipyardQuality ${roundScore(score.fallbackShipyardQuality)}`,
        formatProceduralStarterRaidDebug(score.starterRaid),
        formatProceduralNeutralExpansionDebug(score.neutralExpansion),
        formatProceduralFallbackRecoverySolvencyDebug(score.fallbackRecoverySolvency),
        ...formatProceduralTritiumAccessDebug(score.tritiumAccess),
        ...formatProceduralShipyardAuditDebug(score.shipyardAudit),
        ...formatProceduralOpeningCurveDebug(score.openingCurve)
      ];
    }),
    `worstAsymmetry ${fairnessAudit.worstAsymmetryReason}`,
    `fallbackStaticLayoutUsed ${fairnessAudit.fallbackStaticLayoutUsed}`,
    `acceptedMapWarnings ${debug.acceptedMapWarnings.join(", ") || "-"}`,
    `evaluatedCandidates ${debug.evaluatedCandidateCount}`,
    `acceptedCandidates ${debug.acceptedCandidateCount}`,
    `rejectedCandidates ${debug.rejectedCandidateCount}`,
    `candidateDiscardStats ${debug.candidateDiscardStats.join(", ") || "-"}`,
    `candidateRejectionStats ${debug.candidateRejectionStats.join(", ") || "-"}`,
    `rigidAuditRejectedCandidates ${debug.rigidAuditRejectedCandidates}`,
    `rigidAuditRejectionStats ${debug.rigidAuditRejectionStats.join(", ") || "-"}`
  ].join("\n");
}

function formatProceduralStarterRaidDebug(audit: ProceduralStarterRaidAudit): string {
  return `starterRaid startingTritium ${audit.startingTritium} enemy ${audit.enemyFaction ?? "-"} origin ${audit.enemyOriginNode ?? "-"} T+${audit.enemyBurnTurns ?? "-"} cost ${audit.enemyBurnCost ?? "-"} reciprocal T+${audit.reciprocalBurnTurns ?? "-"} cost ${audit.reciprocalBurnCost ?? "-"} symmetricException ${audit.exceptionalSymmetryUsed} hardGatePassed ${audit.hardGatePassed} rejectionReason ${audit.rejectionReason ?? "-"}`;
}

function formatProceduralNeutralExpansionDebug(audit: ProceduralNeutralExpansionAudit): string {
  return `neutralExpansion node ${audit.neutralTritium ?? "-"} T+${audit.burnTurns ?? "-"} cost ${audit.burnCost ?? "-"} firstWorkTurn ${audit.firstWorkTurn ?? "-"} hardGatePassed ${audit.hardGatePassed} rejectionReason ${audit.rejectionReason ?? "-"}`;
}

function formatProceduralFallbackRecoverySolvencyDebug(
  audit: ProceduralFallbackRecoverySolvencyAudit
): string {
  return `fallbackRecoverySolvency node ${audit.fallbackTritium ?? "-"} T+${audit.burnTurns ?? "-"} cost ${audit.burnCost ?? "-"} firstWorkTurn ${audit.firstWorkTurn ?? "-"} arrivalDv ${audit.projectedDvAtArrival ?? "-"} firstUpkeep ${audit.firstUpkeepCost} exitCost ${audit.cheapestExitBurnCost ?? "-"} finalDv ${audit.projectedDvAfterUpkeepAndExit ?? "-"} hardGatePassed ${audit.hardGatePassed} rejectionReason ${audit.rejectionReason ?? "-"}`;
}

function formatProceduralEarlyCollapseAuditDebug(
  audits: readonly ProceduralEarlyCollapseAudit[]
): readonly string[] {
  if (audits.length === 0) {
    return ["-"];
  }

  return audits.map((audit) => {
    return `${audit.faction}: startingTritium ${audit.startingTritium}; startingShipyard ${audit.startingShipyard}; staging ${audit.stagingNode}; nearestFallbackTritium ${audit.nearestFallbackTritium ?? "-"}; fallbackArrivalTurn ${audit.fallbackArrivalTurn ?? "-"}; contestedRiskByT3 ${roundScore(audit.contestedRiskByT3)}; dogpileRisk ${roundScore(audit.dogpileRisk)}; tritiumAccessScore ${roundScore(audit.tritiumAccessScore)}; predictedContestedUpkeepBurden ${audit.predictedContestedUpkeepBurden}; hardGatePassed ${audit.hardGatePassed}; rejectionReason ${audit.rejectionReason ?? "-"}`;
  });
}

function formatProceduralTritiumAccessDebug(
  audit: ProceduralTritiumAccessAudit
): readonly string[] {
  return [
    "tritiumAccess:",
    `startingTritium ${audit.startingTritium}`,
    `nearestFallbackTritium ${audit.nearestFallbackTritium ?? "-"}`,
    `nearestFallbackBurnTurns ${audit.nearestFallbackBurnTurns ?? "-"}`,
    `nearestFallbackBurnCost ${audit.nearestFallbackBurnCost ?? "-"}`,
    `fallbackPaybackEstimate ${audit.fallbackPaybackEstimate ?? "-"}`,
    `rankedTritiumOptions ${audit.rankedTritiumOptions.map(formatProceduralTritiumOptionDebug).join(" | ") || "-"}`,
    `tritiumAccessScore ${roundScore(audit.tritiumAccessScore)}`,
    `tritiumRecoveryScore ${roundScore(audit.tritiumRecoveryScore)}`
  ];
}

function formatProceduralTritiumOptionDebug(option: ProceduralTritiumOptionAudit): string {
  return `${option.nodeId} T+${option.burnTurns} -${option.burnCost} ΔV q${roundScore(option.normalizedQuality)} risk${roundScore(option.enemyPressureRisk)}`;
}

function formatProceduralShipyardAuditDebug(
  audit: ProceduralShipyardExposureAudit
): readonly string[] {
  return [
    "shipyardAudit:",
    `startingShipyard ${audit.startingShipyard}`,
    `incomingBurnPressureFromEnemies ${roundScore(audit.incomingBurnPressureFromEnemies)}`,
    `incomingFirePressureFromEnemies ${roundScore(audit.incomingFirePressureFromEnemies)}`,
    `contestRisk ${roundScore(audit.contestRisk)}`,
    `progressStealRisk ${roundScore(audit.progressStealRisk)}`,
    `outgoingFireValue ${roundScore(audit.outgoingFireValue)}`,
    `outgoingBurnValue ${roundScore(audit.outgoingBurnValue)}`,
    `mandatoryLaunchRisk ${roundScore(audit.mandatoryLaunchRisk)}`,
    `shipyardSecurityScore ${roundScore(audit.shipyardSecurityScore)}`,
    `shipyardNotes ${audit.notes.join(" | ") || "-"}`
  ];
}

function formatProceduralOpeningCurveDebug(audit: ProceduralOpeningCurveAudit): readonly string[] {
  return [
    "openingCurve:",
    `expectedDvByTurn ${audit.expectedDvByTurn.join(",")}`,
    `expectedShipyardProgressByTurn ${audit.expectedShipyardProgressByTurn.join(",")}`,
    `likelySecondTritiumTiming ${audit.likelySecondTritiumTiming ?? "-"}`,
    `likelyFirstPressureReceived ${audit.likelyFirstPressureReceived ?? "-"}`,
    `likelyFirstPressureApplied ${audit.likelyFirstPressureApplied ?? "-"}`,
    `predictedCollapseRisk ${roundScore(audit.predictedCollapseRisk)}`
  ];
}

export function getProceduralInitialOccupanciesForMode(
  generation: ProceduralMapGeneration,
  mode: GameModeId
): readonly MapPresetInitialOccupancy[] {
  if (mode === "1p") {
    return generation.debug.playerStart.startingShips;
  }

  const factionIds = mode === "3p" ? PROCEDURAL_FACTION_IDS : PROCEDURAL_TWO_PLAYER_FACTION_IDS;

  return factionIds.flatMap((factionId) => {
    return getProceduralStartFromDebug(generation.debug, factionId).startingShips;
  });
}

function getProceduralActiveFactionIdsForMode(mode: GameModeId): readonly ProceduralFactionId[] {
  if (mode === "1p") {
    return ["player"];
  }

  return mode === "3p" ? PROCEDURAL_FACTION_IDS : PROCEDURAL_TWO_PLAYER_FACTION_IDS;
}

function getProceduralStartFromDebug(
  debug: ProceduralMapDebug,
  factionId: ProceduralFactionId
): ProceduralMapStart {
  switch (factionId) {
    case "player":
      return debug.playerStart;
    case "opponent":
      return debug.opponentStart;
    case "ai_2":
      return debug.ai_2Start;
  }
}

function formatProceduralStartDebugLine(label: string, start: ProceduralMapStart): string {
  const startingShips = start.startingShips
    .map((ship) => `${ship.factionId}:${ship.nodeId}x${ship.shipCount}`)
    .join(", ");

  return `${label} start faction ${start.factionId} | controller ${start.controllerType} | tritium ${start.tritium} | shipyard ${start.shipyard} | staging ${start.staging} | ships ${startingShips}`;
}

function normalizeProceduralSeed(seed: string): string {
  const trimmedSeed = seed.trim();

  return trimmedSeed.length > 0 ? trimmedSeed : PROCEDURAL_DEFAULT_SEED;
}

function getProceduralGeneratorConfig(
  generator: ProceduralMapGeneratorId
): ProceduralGeneratorConfig {
  return PROCEDURAL_GENERATOR_CONFIGS[generator];
}

function createProceduralGenerationCacheKey(
  generator: ProceduralMapGeneratorId,
  seed: string
): string {
  return `${generator}:${seed}`;
}

function createProceduralCandidate(
  rng: () => number,
  eligibleProductiveNodes: readonly NodeData[],
  eligibleStartingNodes: readonly NodeData[],
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>,
  config: ProceduralGeneratorConfig,
  rejectionTally: ProceduralRejectionTally
): ProceduralCandidate | null {
  const tritiumNodes = takeRandomUniqueWithProductiveSystemLimits(
    rng,
    eligibleProductiveNodes,
    PROCEDURAL_TRITIUM_NODE_COUNT,
    nodeFacts,
    config.maxSameRoleProductiveNodesPerSystem,
    config.maxProductiveNodesPerSystem
  );

  if (tritiumNodes === null) {
    tallyRejection(rejectionTally, "not-enough-spread-tritium-candidates");
    return null;
  }

  if (
    exceedsSystemProductiveLimit(
      tritiumNodes.map((node) => node.id),
      nodeFacts,
      config.maxSameRoleProductiveNodesPerSystem
    )
  ) {
    tallyRejection(rejectionTally, "same-system-tritium-cluster");
    return null;
  }

  const tritiumNodeIds = new Set(tritiumNodes.map((node) => node.id));
  const shipyardNodes = takeRandomUniqueWithProductiveSystemLimits(
    rng,
    eligibleProductiveNodes.filter((node) => !tritiumNodeIds.has(node.id)),
    PROCEDURAL_SHIPYARD_NODE_COUNT,
    nodeFacts,
    config.maxSameRoleProductiveNodesPerSystem,
    config.maxProductiveNodesPerSystem,
    [...tritiumNodeIds]
  );

  if (shipyardNodes === null) {
    tallyRejection(rejectionTally, "not-enough-spread-shipyard-candidates");
    return null;
  }

  if (
    exceedsSystemProductiveLimit(
      shipyardNodes.map((node) => node.id),
      nodeFacts,
      config.maxSameRoleProductiveNodesPerSystem
    )
  ) {
    tallyRejection(rejectionTally, "same-system-shipyard-cluster");
    return null;
  }

  if (
    exceedsSystemProductiveLimit(
      [...tritiumNodes, ...shipyardNodes].map((node) => node.id),
      nodeFacts,
      config.maxProductiveNodesPerSystem
    )
  ) {
    tallyRejection(rejectionTally, "productive-system-overcluster");
    return null;
  }

  const tritiumStartNodes = takeRandomUnique(rng, tritiumNodes, PROCEDURAL_FACTION_IDS.length);
  const shipyardStartNodes = takeRandomUnique(rng, shipyardNodes, PROCEDURAL_FACTION_IDS.length);

  if (tritiumStartNodes === null || shipyardStartNodes === null) {
    tallyRejection(rejectionTally, "not-enough-starting-economy");
    return null;
  }

  const productiveNodeIds = new Set([
    ...tritiumNodes.map((node) => node.id),
    ...shipyardNodes.map((node) => node.id)
  ]);
  const stagingNodes = takeRandomUnique(
    rng,
    eligibleStartingNodes.filter((node) => !productiveNodeIds.has(node.id)),
    PROCEDURAL_FACTION_IDS.length
  );

  if (stagingNodes === null) {
    tallyRejection(rejectionTally, "not-enough-staging-candidates");
    return null;
  }

  const [playerTritium, opponentTritium, ai2Tritium] = tritiumStartNodes;
  const [playerShipyard, opponentShipyard, ai2Shipyard] = shipyardStartNodes;
  const [playerStaging, opponentStaging, ai2Staging] = stagingNodes;

  if (
    playerTritium === undefined ||
    opponentTritium === undefined ||
    ai2Tritium === undefined ||
    playerShipyard === undefined ||
    opponentShipyard === undefined ||
    ai2Shipyard === undefined ||
    playerStaging === undefined ||
    opponentStaging === undefined ||
    ai2Staging === undefined
  ) {
    tallyRejection(rejectionTally, "incomplete-starting-pick");
    return null;
  }

  return {
    tritiumNodeIds: tritiumNodes.map((node) => node.id),
    shipyardNodeIds: shipyardNodes.map((node) => node.id),
    playerStart: createProceduralStart(
      "player",
      "human",
      playerTritium.id,
      playerShipyard.id,
      playerStaging.id
    ),
    opponentStart: createProceduralStart(
      "opponent",
      "ai",
      opponentTritium.id,
      opponentShipyard.id,
      opponentStaging.id
    ),
    ai_2Start: createProceduralStart("ai_2", "ai", ai2Tritium.id, ai2Shipyard.id, ai2Staging.id)
  };
}

function createProceduralStart(
  factionId: ProceduralFactionId,
  controllerType: ProceduralMapControllerType,
  tritium: string,
  shipyard: string,
  staging: string
): ProceduralMapStart {
  return {
    factionId,
    controllerType,
    tritium,
    shipyard,
    staging,
    startingShips: [
      { nodeId: tritium, factionId, shipCount: 1 },
      { nodeId: shipyard, factionId, shipCount: 1 },
      { nodeId: staging, factionId, shipCount: 1 }
    ]
  };
}

function scoreProceduralCandidate(
  candidate: ProceduralCandidate,
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>,
  config: ProceduralGeneratorConfig,
  fallbackStaticLayoutUsed = false,
  activeFactionIds: readonly ProceduralFactionId[] = PROCEDURAL_TWO_PLAYER_FACTION_IDS
): ProceduralCandidateScore {
  const scoringContent = createProceduralContent(candidate, config);
  const reachability = buildProceduralReachabilityMatrix(scoringContent, candidate, config);
  const fairnessAudit = auditProceduralFairness(
    candidate,
    reachability,
    fallbackStaticLayoutUsed,
    activeFactionIds,
    config
  );
  const distributionScore = scoreProductiveDistribution(candidate, nodeFacts);
  const fairnessScore = scoreStartingFairness(fairnessAudit);
  const expansionScore = scoreExpansionAccess(fairnessAudit);
  const conflictScore = scoreConflictZones(fairnessAudit);
  const killboxWarnings = getKillboxWarnings(fairnessAudit);
  const hardGateFailures = getProceduralHardGateFailures(fairnessScore, fairnessAudit, config);
  const hardGatePassed = hardGateFailures.length === 0;
  const killboxPenalty = killboxWarnings.length * config.killboxPenalty;
  const hardGatePenalty = hardGatePassed ? 0 : 1000 + hardGateFailures.length * 80;
  const finalScore =
    distributionScore * config.scoreWeights.distribution +
    fairnessScore * config.scoreWeights.fairness +
    expansionScore * config.scoreWeights.expansion +
    conflictScore * config.scoreWeights.conflict -
    killboxPenalty -
    hardGatePenalty;

  return {
    finalScore,
    distributionScore,
    fairnessScore,
    expansionScore,
    conflictScore,
    killboxWarnings,
    hardGatePassed,
    hardGateFailures,
    fairnessAudit: {
      ...fairnessAudit,
      hardGatePassed,
      hardGateFailures
    }
  };
}

function isRigidProceduralAuditFailure(failure: string): boolean {
  const normalizedFailure = failure.startsWith("3p:") ? failure.slice(3) : failure;

  return (
    normalizedFailure.startsWith("starter-raid:") ||
    normalizedFailure.startsWith("neutral-expansion:") ||
    normalizedFailure.startsWith("fallback-recovery:") ||
    normalizedFailure.startsWith("rigid-audit:")
  );
}

function createProceduralFallbackCandidate(
  generator: ProceduralMapGeneratorId
): ProceduralCandidate {
  if (generator === "classic") {
    return {
      tritiumNodeIds: [
        "venus_node",
        "europa_node",
        "pluto_node",
        "titan_node",
        "titania_node",
        "triton_node"
      ],
      shipyardNodeIds: [
        "mercury_node",
        "deimos_node",
        "callisto_node",
        "iapetus_node",
        "oberon_node"
      ],
      playerStart: createProceduralStart(
        "player",
        "human",
        "venus_node",
        "mercury_node",
        "ganymede_node"
      ),
      opponentStart: createProceduralStart(
        "opponent",
        "ai",
        "triton_node",
        "iapetus_node",
        "charon_node"
      ),
      ai_2Start: createProceduralStart("ai_2", "ai", "titania_node", "oberon_node", "saturn_node")
    };
  }

  return {
    tritiumNodeIds: [
      "deimos_node",
      "ganymede_node",
      "iapetus_node",
      "oberon_node",
      "triton_node",
      "pluto_node"
    ],
    shipyardNodeIds: ["mercury_node", "venus_node", "jupiter_node", "saturn_node", "titania_node"],
    playerStart: createProceduralStart(
      "player",
      "human",
      "triton_node",
      "jupiter_node",
      "callisto_node"
    ),
    opponentStart: createProceduralStart(
      "opponent",
      "ai",
      "oberon_node",
      "venus_node",
      "phobos_node"
    ),
    ai_2Start: createProceduralStart("ai_2", "ai", "pluto_node", "mercury_node", "titan_node")
  };
}

function takeRandomUniqueWithProductiveSystemLimits(
  rng: () => number,
  source: readonly NodeData[],
  count: number,
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>,
  maxRoleNodesPerSystem: number,
  maxProductiveNodesPerSystem: number,
  existingProductiveNodeIds: readonly string[] = []
): readonly NodeData[] | null {
  if (source.length < count) {
    return null;
  }

  const available = [...source];
  const selected: NodeData[] = [];
  const selectedRoleCounts = new Map<string, number>();
  const totalProductiveCounts = countNodeIdsBySystem(existingProductiveNodeIds, nodeFacts);

  while (selected.length < count) {
    const viableNodes = available.filter((node) => {
      const systemId = getNodeFact(nodeFacts, node.id).systemId;
      const roleCount = selectedRoleCounts.get(systemId) ?? 0;
      const totalCount = totalProductiveCounts.get(systemId) ?? 0;

      return roleCount < maxRoleNodesPerSystem && totalCount < maxProductiveNodesPerSystem;
    });

    if (viableNodes.length === 0) {
      return null;
    }

    const chosen = viableNodes[Math.floor(rng() * viableNodes.length)];

    if (chosen === undefined) {
      return null;
    }

    selected.push(chosen);
    available.splice(available.indexOf(chosen), 1);

    const systemId = getNodeFact(nodeFacts, chosen.id).systemId;
    selectedRoleCounts.set(systemId, (selectedRoleCounts.get(systemId) ?? 0) + 1);
    totalProductiveCounts.set(systemId, (totalProductiveCounts.get(systemId) ?? 0) + 1);
  }

  return selected;
}

function exceedsSystemProductiveLimit(
  nodeIds: readonly string[],
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>,
  limit: number
): boolean {
  if (limit >= nodeIds.length) {
    return false;
  }

  const counts = countBy(nodeIds, (nodeId) => getNodeFact(nodeFacts, nodeId).systemId);

  for (const count of counts.values()) {
    if (count > limit) {
      return true;
    }
  }

  return false;
}

function countNodeIdsBySystem(
  nodeIds: readonly string[],
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>
): Map<string, number> {
  const counts = new Map<string, number>();

  for (const nodeId of nodeIds) {
    const systemId = getNodeFact(nodeFacts, nodeId).systemId;
    counts.set(systemId, (counts.get(systemId) ?? 0) + 1);
  }

  return counts;
}

function scoreProductiveDistribution(
  candidate: ProceduralCandidate,
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>
): number {
  const productiveNodeIds = [...candidate.tritiumNodeIds, ...candidate.shipyardNodeIds];
  const regionCounts = countBy(
    productiveNodeIds,
    (nodeId) => getNodeFact(nodeFacts, nodeId).region
  );
  const systemCounts = countBy(
    productiveNodeIds,
    (nodeId) => getNodeFact(nodeFacts, nodeId).systemId
  );
  const tritiumSystems = countBy(candidate.tritiumNodeIds, (nodeId) => {
    return getNodeFact(nodeFacts, nodeId).systemId;
  });
  const shipyardSystems = countBy(candidate.shipyardNodeIds, (nodeId) => {
    return getNodeFact(nodeFacts, nodeId).systemId;
  });
  const inner = regionCounts.get("inner") ?? 0;
  const middle = regionCounts.get("middle") ?? 0;
  const outer = regionCounts.get("outer") ?? 0;
  const regionPenalty =
    Math.abs(inner - 3) * 7 + Math.abs(middle - 4) * 5 + Math.abs(outer - 4) * 5;
  let clusterPenalty = 0;

  for (const count of systemCounts.values()) {
    if (count > 2) {
      clusterPenalty += (count - 2) * 11;
    }
  }

  for (const count of [...tritiumSystems.values(), ...shipyardSystems.values()]) {
    if (count > 1) {
      clusterPenalty += (count - 1) * 5;
    }
  }

  const uniqueSystemReward = Math.min(28, systemCounts.size * 3.1);
  const separationScore = scorePairwiseSeparation(productiveNodeIds, nodeFacts);

  return clampScore(
    74 + uniqueSystemReward + separationScore * 0.22 - regionPenalty - clusterPenalty
  );
}

function scorePairwiseSeparation(
  nodeIds: readonly string[],
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>
): number {
  let closePairPenalty = 0;

  for (let firstIndex = 0; firstIndex < nodeIds.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < nodeIds.length; secondIndex += 1) {
      const firstId = nodeIds[firstIndex];
      const secondId = nodeIds[secondIndex];

      if (firstId === undefined || secondId === undefined) {
        continue;
      }

      const distance = distanceBetweenNodeIds(firstId, secondId, nodeFacts);

      if (distance < 44) {
        closePairPenalty += 8;
      } else if (distance < 74) {
        closePairPenalty += 3;
      }
    }
  }

  return clampScore(100 - closePairPenalty);
}

function scoreStartingFairness(audit: ProceduralMapFairnessAudit): number {
  const scores = getProceduralFactionAuditScores(audit);
  const beneficialSpread =
    rangeOf(scores.map((score) => score.tritiumAccessScore)) * 0.32 +
    rangeOf(scores.map((score) => score.shipyardSecurityScore)) * 0.3 +
    rangeOf(scores.map((score) => score.stagingValueScore)) * 0.22 +
    rangeOf(scores.map((score) => score.fallbackTritiumQuality)) * 0.18 +
    rangeOf(scores.map((score) => score.fallbackShipyardQuality)) * 0.14;
  const pressureSpread =
    rangeOf(scores.map((score) => score.pressureReceivedScore)) * 0.28 +
    rangeOf(scores.map((score) => score.pressureAppliedScore)) * 0.2 +
    rangeOf(scores.map((score) => score.dogpileRisk)) * 0.34;

  return clampScore(100 - beneficialSpread - pressureSpread);
}

function scoreExpansionAccess(audit: ProceduralMapFairnessAudit): number {
  const scores = getProceduralFactionAuditScores(audit);
  const averageFallback = average(
    scores.map((score) => (score.fallbackTritiumQuality + score.fallbackShipyardQuality) / 2)
  );
  const spreadPenalty =
    rangeOf(scores.map((score) => score.fallbackTritiumQuality)) * 0.32 +
    rangeOf(scores.map((score) => score.fallbackShipyardQuality)) * 0.24;

  return clampScore(averageFallback - spreadPenalty);
}

function scoreConflictZones(audit: ProceduralMapFairnessAudit): number {
  const scores = getProceduralFactionAuditScores(audit);
  const averageAppliedPressure = average(scores.map((score) => score.pressureAppliedScore));
  const pressureBalance =
    100 -
    rangeOf(scores.map((score) => score.pressureReceivedScore)) * 0.25 -
    rangeOf(scores.map((score) => score.pressureAppliedScore)) * 0.18 -
    rangeOf(scores.map((score) => score.dogpileRisk)) * 0.32;

  return clampScore(pressureBalance * 0.64 + averageAppliedPressure * 0.36);
}

function getKillboxWarnings(audit: ProceduralMapFairnessAudit): readonly string[] {
  return audit.hardGateFailures.filter((failure) => {
    return (
      failure.includes("pressure") ||
      failure.includes("dogpile") ||
      failure.includes("tritium") ||
      failure.includes("shipyard")
    );
  });
}

function getAcceptedMapWarnings(score: ProceduralCandidateScore): readonly string[] {
  if (!score.hardGatePassed) {
    return [];
  }

  const hardGateFailures = new Set(score.hardGateFailures);

  return score.killboxWarnings.filter((warning) => {
    return !isSevereProceduralMapWarning(warning, hardGateFailures);
  });
}

function isSevereProceduralMapWarning(
  warning: string,
  hardGateFailures: ReadonlySet<string>
): boolean {
  return (
    hardGateFailures.has(warning) ||
    warning.includes("hard-reject") ||
    warning.includes("hard-gate") ||
    warning.includes("below-minimum") ||
    warning.includes("major-outlier") ||
    warning.includes("STARTING_SHIPYARD_SECURITY_OUTLIER")
  );
}

function buildProceduralReachabilityMatrix(
  content: SolarSystemData,
  candidate: ProceduralCandidate,
  config: ProceduralGeneratorConfig
): ProceduralReachabilityMatrix {
  const relevantNodeIds = uniqueNodeIds([
    ...candidate.tritiumNodeIds,
    ...candidate.shipyardNodeIds,
    ...getAllStartNodeIds(candidate)
  ]);
  const routeInputs: ProceduralRouteInput[] = [];

  for (const originNodeId of relevantNodeIds) {
    for (const destinationNodeId of relevantNodeIds) {
      if (originNodeId === destinationNodeId) {
        continue;
      }

      const routeInput = getProceduralRouteInput(content, originNodeId, destinationNodeId, config);

      if (routeInput === null) {
        continue;
      }

      routeInputs.push(routeInput);
    }
  }

  const routeEnergyScores = routeInputs.map(
    (input) => input.route.energyScore || input.route.burnCost
  );
  const routeDifficultyScores = routeInputs.map((input) => {
    return input.route.transferDifficultyScore || input.route.transferTurns;
  });
  const fireTurnValues = routeInputs.flatMap((input) => {
    return input.fireTurns === null ? [] : [input.fireTurns];
  });
  const sortedRouteEnergyScores = sortFiniteNumbers(routeEnergyScores);
  const sortedRouteDifficultyScores = sortFiniteNumbers(routeDifficultyScores);
  const sortedFireTurnValues = sortFiniteNumbers(fireTurnValues);
  const burnCosts = createDistributionStats(sortedRouteEnergyScores);
  const burnTurns = createDistributionStats(sortedRouteDifficultyScores);
  const fireTurns = createDistributionStats(sortedFireTurnValues);
  const routeByKey = new Map<string, ProceduralRouteQuality>();

  for (const input of routeInputs) {
    const burnCostRank = percentileRank(sortedRouteEnergyScores, input.route.energyScore);
    const burnTurnRank = percentileRank(
      sortedRouteDifficultyScores,
      input.route.transferDifficultyScore
    );
    const fireTurnRank =
      input.fireTurns === null ? 1 : percentileRank(sortedFireTurnValues, input.fireTurns);
    const burnAffordabilityScore = clampScore(100 - burnCostRank * 100);
    const burnTimingScore = clampScore(100 - burnTurnRank * 100);
    const windowAdjustment =
      input.route.windowQuality === "favorable"
        ? 5
        : input.route.windowQuality === "unfavorable"
          ? -5
          : 0;
    const motionAdjustment =
      input.route.motionRelation === "moving-toward"
        ? 4
        : input.route.motionRelation === "moving-away"
          ? -4
          : 0;
    const burnQuality = clampScore(
      burnAffordabilityScore * 0.48 + burnTimingScore * 0.52 + windowAdjustment + motionAdjustment
    );
    const firePressure =
      input.fireTurns === null
        ? 0
        : clampScore(burnTimingScore * 0.55 + (100 - fireTurnRank * 100) * 0.45);

    routeByKey.set(
      createProceduralRouteKey(input.route.originNodeId, input.route.destinationNodeId),
      {
        originNodeId: input.route.originNodeId,
        destinationNodeId: input.route.destinationNodeId,
        burnTurns: input.route.transferTurns,
        burnCost: input.route.burnCost,
        burnQuality,
        burnTimingScore,
        burnAffordabilityScore,
        contestPressure: burnQuality,
        escapeValue: burnQuality,
        recoveryValue: burnQuality,
        fireFeasible: input.fireTurns !== null,
        fireTurns: input.fireTurns,
        firePressure,
        transferCategory: input.route.visualArcType,
        windowQuality: input.route.windowQuality,
        movementFavorability: input.route.motionRelation
      }
    );
  }

  return {
    routeByKey,
    relevantNodeIds,
    burnCosts,
    burnTurns,
    fireTurns
  };
}

function getProceduralRouteInput(
  content: SolarSystemData,
  originNodeId: string,
  destinationNodeId: string,
  config: ProceduralGeneratorConfig
): ProceduralRouteInput | null {
  const cacheKey = `${config.id}:${createProceduralRouteKey(originNodeId, destinationNodeId)}`;
  const cached = proceduralRouteInputCache.get(cacheKey);

  if (cached !== undefined) {
    return cached;
  }

  const route = describeTransferRoute(content, 0, originNodeId, destinationNodeId);

  if (route === null) {
    proceduralRouteInputCache.set(cacheKey, null);
    return null;
  }

  const fire = calculateFirePlan(content, 0, originNodeId, destinationNodeId);
  const input: ProceduralRouteInput = {
    route,
    fireTurns: fire?.missileEtaTurns ?? null
  };

  proceduralRouteInputCache.set(cacheKey, input);
  return input;
}

function auditProceduralFairness(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  fallbackStaticLayoutUsed: boolean,
  activeFactionIds: readonly ProceduralFactionId[],
  config: ProceduralGeneratorConfig
): ProceduralMapFairnessAudit {
  const factionScores = Object.fromEntries(
    activeFactionIds.map((factionId) => {
      return [
        factionId,
        auditProceduralFaction(candidate, reachability, factionId, activeFactionIds, config)
      ];
    })
  ) as Partial<Record<ProceduralFactionId, ProceduralFactionFairnessAudit>>;
  const earlyCollapseAudits = createProceduralEarlyCollapseAudits(
    candidate,
    factionScores,
    activeFactionIds,
    config
  );
  const provisionalAudit: ProceduralMapFairnessAudit = {
    hardGatePassed: true,
    hardGateFailures: [],
    activeFactionIds,
    factionScores,
    earlyCollapseAudits,
    worstAsymmetryReason: getWorstProceduralAsymmetryReason(factionScores, activeFactionIds),
    fallbackStaticLayoutUsed
  };

  return provisionalAudit;
}

function createProceduralEarlyCollapseAudits(
  candidate: ProceduralCandidate,
  factionScores: Readonly<Partial<Record<ProceduralFactionId, ProceduralFactionFairnessAudit>>>,
  activeFactionIds: readonly ProceduralFactionId[],
  config: ProceduralGeneratorConfig
): readonly ProceduralEarlyCollapseAudit[] {
  return activeFactionIds.map((factionId) => {
    const start = getProceduralCandidateStart(candidate, factionId);
    const score = factionScores[factionId];
    const contestedRiskByT3 =
      score === undefined
        ? 100
        : clampScore(
            Math.max(
              score.openingCurve.predictedCollapseRisk,
              score.shipyardAudit.contestRisk,
              score.dogpileRisk
            )
          );
    const rejectionReason =
      score === undefined
        ? "missing-fairness-score"
        : getProceduralEarlyCollapseRejectionReason(score, contestedRiskByT3, config);

    return {
      faction: factionId,
      startingTritium: start.tritium,
      startingShipyard: start.shipyard,
      stagingNode: start.staging,
      nearestFallbackTritium: score?.tritiumAccess.nearestFallbackTritium ?? null,
      fallbackArrivalTurn: score?.tritiumAccess.nearestFallbackBurnTurns ?? null,
      contestedRiskByT3: roundScore(contestedRiskByT3),
      dogpileRisk: roundScore(score?.dogpileRisk ?? 100),
      tritiumAccessScore: roundScore(score?.tritiumAccessScore ?? 0),
      predictedContestedUpkeepBurden: estimateProceduralOpeningUpkeepBurden(contestedRiskByT3),
      hardGatePassed: rejectionReason === null,
      rejectionReason
    };
  });
}

function getProceduralEarlyCollapseRejectionReason(
  score: ProceduralFactionFairnessAudit,
  contestedRiskByT3: number,
  config: ProceduralGeneratorConfig
): string | null {
  const primaryTritiumOption = score.tritiumAccess.rankedTritiumOptions[0];

  if (score.dogpileRisk >= config.threePlayerDogpileRiskHardReject) {
    return "dogpile-risk-near-100";
  }

  if (
    contestedRiskByT3 >= config.threePlayerEarlyCollapseRiskHardReject &&
    score.tritiumAccessScore < 55
  ) {
    return "early-contested-tritium-collapse";
  }

  if (
    score.tritiumAccess.nearestFallbackBurnTurns !== null &&
    score.tritiumAccess.nearestFallbackBurnTurns <= 3 &&
    primaryTritiumOption !== undefined &&
    primaryTritiumOption.enemyPressureRisk >= 82
  ) {
    return "fallback-tritium-contested-immediately";
  }

  return null;
}

function estimateProceduralOpeningUpkeepBurden(contestedRiskByT3: number): number {
  if (contestedRiskByT3 >= 88) {
    return 4;
  }

  return contestedRiskByT3 >= 66 ? 2 : 0;
}

function auditProceduralFaction(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  factionId: ProceduralFactionId,
  activeFactionIds: readonly ProceduralFactionId[],
  config: ProceduralGeneratorConfig
): ProceduralFactionFairnessAudit {
  const start = getProceduralCandidateStart(candidate, factionId);
  const ownStartNodeIds = getStartNodeIds(start);
  const enemyStarts = getProceduralCandidateStarts(candidate).filter((enemy) => {
    return enemy.factionId !== factionId && activeFactionIds.includes(enemy.factionId);
  });
  const enemyProductiveNodeIds = enemyStarts.flatMap((enemy) => [enemy.tritium, enemy.shipyard]);
  const nonOwnedTritiumNodeIds = candidate.tritiumNodeIds.filter((nodeId) => {
    return nodeId !== start.tritium;
  });
  const nonOwnedShipyardNodeIds = candidate.shipyardNodeIds.filter((nodeId) => {
    return nodeId !== start.shipyard;
  });
  const triangleCohesion = averagePairRouteQuality(reachability, ownStartNodeIds);
  const tritiumDefense = bestRouteQuality(
    reachability,
    [start.shipyard, start.staging],
    [start.tritium],
    (route) => route.recoveryValue
  );
  const shipyardDefense = bestRouteQuality(
    reachability,
    [start.tritium, start.staging],
    [start.shipyard],
    (route) => route.recoveryValue
  );
  const tritiumPressure = combinedEnemyPressureToNode(reachability, enemyStarts, start.tritium);
  const shipyardPressure = combinedEnemyPressureToNode(reachability, enemyStarts, start.shipyard);
  const stagingPressure = combinedEnemyPressureToNode(reachability, enemyStarts, start.staging);
  const fallbackTritiumQuality = averageBestRouteQualities(
    reachability,
    ownStartNodeIds,
    nonOwnedTritiumNodeIds,
    2,
    (route) => route.recoveryValue
  );
  const fallbackShipyardQuality = averageBestRouteQualities(
    reachability,
    ownStartNodeIds,
    nonOwnedShipyardNodeIds,
    2,
    (route) => route.recoveryValue
  );
  const pressureAppliedScore = averageBestRouteQualities(
    reachability,
    ownStartNodeIds,
    enemyProductiveNodeIds,
    4,
    (route) => Math.max(route.contestPressure, route.firePressure)
  );
  const stagingProjection = averageBestRouteQualities(
    reachability,
    [start.staging],
    [...enemyProductiveNodeIds, ...nonOwnedTritiumNodeIds, ...nonOwnedShipyardNodeIds],
    4,
    (route) => Math.max(route.contestPressure, route.firePressure)
  );
  const stagingDefense = averageBestRouteQualities(
    reachability,
    [start.staging],
    [start.tritium, start.shipyard],
    2,
    (route) => route.recoveryValue
  );
  const pressureReceivedScore = clampScore(
    tritiumPressure * 0.38 + shipyardPressure * 0.42 + stagingPressure * 0.2
  );
  const dogpileRisk = Math.max(
    dogpilePressureForNode(reachability, enemyStarts, start.tritium),
    dogpilePressureForNode(reachability, enemyStarts, start.shipyard)
  );
  const tritiumAccessScore = clampScore(
    triangleCohesion * 0.24 +
      tritiumDefense * 0.24 +
      fallbackTritiumQuality * 0.32 +
      (100 - tritiumPressure) * 0.2
  );
  const shipyardSecurityScore = clampScore(
    triangleCohesion * 0.18 +
      shipyardDefense * 0.28 +
      fallbackShipyardQuality * 0.18 +
      pressureAppliedScore * 0.12 +
      (100 - shipyardPressure) * 0.24
  );
  const stagingValueScore = clampScore(
    stagingProjection * 0.45 + stagingDefense * 0.35 + triangleCohesion * 0.2
  );
  const tritiumAccess = createProceduralTritiumAccessAudit(
    candidate,
    reachability,
    start,
    enemyStarts,
    tritiumAccessScore,
    fallbackTritiumQuality
  );
  const shipyardAudit = createProceduralShipyardExposureAudit(
    candidate,
    reachability,
    start,
    enemyStarts,
    enemyProductiveNodeIds,
    shipyardSecurityScore
  );
  const openingCurve = createProceduralOpeningCurveAudit(
    reachability,
    tritiumAccess,
    shipyardAudit,
    pressureReceivedScore,
    pressureAppliedScore,
    dogpileRisk
  );
  const starterRaid = createProceduralStarterRaidAudit(reachability, start, enemyStarts, config);
  const neutralExpansion = createProceduralNeutralExpansionAudit(
    candidate,
    reachability,
    start,
    activeFactionIds,
    config
  );
  const fallbackRecoverySolvency = createProceduralFallbackRecoverySolvencyAudit(
    candidate,
    reachability,
    start,
    activeFactionIds,
    config
  );

  return {
    tritiumAccessScore,
    shipyardSecurityScore,
    stagingValueScore,
    pressureReceivedScore,
    pressureAppliedScore,
    dogpileRisk,
    fallbackTritiumQuality,
    fallbackShipyardQuality,
    tritiumAccess,
    shipyardAudit,
    openingCurve,
    starterRaid,
    neutralExpansion,
    fallbackRecoverySolvency
  };
}

function createProceduralStarterRaidAudit(
  reachability: ProceduralReachabilityMatrix,
  start: ProceduralMapStart,
  enemyStarts: readonly ProceduralMapStart[],
  config: ProceduralGeneratorConfig
): ProceduralStarterRaidAudit {
  const raid = enemyStarts
    .flatMap((enemy) => {
      const route = bestRoute(reachability, getStartNodeIds(enemy), [start.tritium]);

      return route === null ? [] : [{ enemy, route }];
    })
    .sort((first, second) => {
      if (first.route.burnTurns !== second.route.burnTurns) {
        return first.route.burnTurns - second.route.burnTurns;
      }

      if (first.route.burnCost !== second.route.burnCost) {
        return first.route.burnCost - second.route.burnCost;
      }

      return first.enemy.factionId.localeCompare(second.enemy.factionId);
    })[0];

  if (raid === undefined) {
    return {
      startingTritium: start.tritium,
      enemyFaction: null,
      enemyOriginNode: null,
      enemyBurnTurns: null,
      enemyBurnCost: null,
      reciprocalBurnTurns: null,
      reciprocalBurnCost: null,
      exceptionalSymmetryUsed: false,
      hardGatePassed: true,
      rejectionReason: null
    };
  }

  const reciprocal = bestRoute(reachability, getStartNodeIds(start), [raid.enemy.tritium]);
  const earlyRaid = raid.route.burnTurns < config.starterRaidMinEtaTurns;
  const symmetricException =
    earlyRaid &&
    reciprocal !== null &&
    Math.abs(raid.route.burnTurns - reciprocal.burnTurns) <=
      config.starterRaidMaxSymmetryEtaDelta &&
    Math.abs(raid.route.burnCost - reciprocal.burnCost) <=
      config.starterRaidMaxSymmetryBurnCostDelta;
  const hardGatePassed = !earlyRaid || symmetricException;

  return {
    startingTritium: start.tritium,
    enemyFaction: raid.enemy.factionId,
    enemyOriginNode: raid.route.originNodeId,
    enemyBurnTurns: raid.route.burnTurns,
    enemyBurnCost: raid.route.burnCost,
    reciprocalBurnTurns: reciprocal?.burnTurns ?? null,
    reciprocalBurnCost: reciprocal?.burnCost ?? null,
    exceptionalSymmetryUsed: symmetricException,
    hardGatePassed,
    rejectionReason: hardGatePassed ? null : "starter-raid-before-t3-asymmetric"
  };
}

function getProceduralNeutralExpansionRoutes(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  start: ProceduralMapStart,
  activeFactionIds: readonly ProceduralFactionId[],
  config: ProceduralGeneratorConfig
): readonly ProceduralRouteQuality[] {
  const occupiedStartingTritium = new Set(
    activeFactionIds.map((factionId) => getProceduralCandidateStart(candidate, factionId).tritium)
  );

  return candidate.tritiumNodeIds
    .filter((nodeId) => !occupiedStartingTritium.has(nodeId))
    .flatMap((nodeId) => {
      const route = bestRoute(reachability, [start.staging], [nodeId]);

      if (
        route === null ||
        route.burnTurns > config.neutralExpansionMaxEtaTurns ||
        route.burnCost > config.neutralExpansionMaxBurnCost
      ) {
        return [];
      }

      return [route];
    })
    .sort((first, second) => {
      if (first.burnTurns !== second.burnTurns) {
        return first.burnTurns - second.burnTurns;
      }

      if (first.burnCost !== second.burnCost) {
        return first.burnCost - second.burnCost;
      }

      return first.destinationNodeId.localeCompare(second.destinationNodeId);
    });
}

function createProceduralNeutralExpansionAudit(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  start: ProceduralMapStart,
  activeFactionIds: readonly ProceduralFactionId[],
  config: ProceduralGeneratorConfig
): ProceduralNeutralExpansionAudit {
  const route = getProceduralNeutralExpansionRoutes(
    candidate,
    reachability,
    start,
    activeFactionIds,
    config
  )[0];

  return {
    neutralTritium: route?.destinationNodeId ?? null,
    burnTurns: route?.burnTurns ?? null,
    burnCost: route?.burnCost ?? null,
    firstWorkTurn: route === undefined ? null : route.burnTurns + 1,
    hardGatePassed: route !== undefined,
    rejectionReason: route === undefined ? "neutral-expansion-over-t3-or-4dv" : null
  };
}

function createProceduralFallbackRecoverySolvencyAudit(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  start: ProceduralMapStart,
  activeFactionIds: readonly ProceduralFactionId[],
  config: ProceduralGeneratorConfig
): ProceduralFallbackRecoverySolvencyAudit {
  const routes = getProceduralNeutralExpansionRoutes(
    candidate,
    reachability,
    start,
    activeFactionIds,
    config
  );
  const solventOptions = routes
    .map((route) => {
      const exitBurnCost = reachability.relevantNodeIds
        .filter((nodeId) => nodeId !== route.destinationNodeId)
        .flatMap((nodeId) => {
          const exitRoute = reachability.routeByKey.get(
            createProceduralRouteKey(route.destinationNodeId, nodeId)
          );

          return exitRoute === undefined ? [] : [exitRoute.burnCost];
        })
        .sort((first, second) => first - second)[0];
      const projectedDvAtArrival = config.fallbackRecoveryStartingDv - route.burnCost;
      const projectedDvAfterUpkeepAndExit =
        exitBurnCost === undefined
          ? null
          : projectedDvAtArrival - config.fallbackRecoveryFirstUpkeep - exitBurnCost;

      return {
        route,
        exitBurnCost: exitBurnCost ?? null,
        projectedDvAtArrival,
        projectedDvAfterUpkeepAndExit
      };
    })
    .filter((option) => {
      return (
        option.exitBurnCost !== null &&
        option.projectedDvAfterUpkeepAndExit !== null &&
        option.projectedDvAfterUpkeepAndExit >= 0
      );
    })
    .sort((first, second) => {
      if (first.route.burnTurns !== second.route.burnTurns) {
        return first.route.burnTurns - second.route.burnTurns;
      }

      return first.route.burnCost - second.route.burnCost;
    });
  const selected = solventOptions[0];

  return {
    fallbackTritium: selected?.route.destinationNodeId ?? null,
    burnTurns: selected?.route.burnTurns ?? null,
    burnCost: selected?.route.burnCost ?? null,
    firstWorkTurn: selected === undefined ? null : selected.route.burnTurns + 1,
    projectedDvAtArrival: selected?.projectedDvAtArrival ?? null,
    firstUpkeepCost: config.fallbackRecoveryFirstUpkeep,
    cheapestExitBurnCost: selected?.exitBurnCost ?? null,
    projectedDvAfterUpkeepAndExit: selected?.projectedDvAfterUpkeepAndExit ?? null,
    hardGatePassed: selected !== undefined,
    rejectionReason: selected === undefined ? "fallback-recovery-insolvent" : null
  };
}

function getProceduralHardGateFailures(
  fairnessScore: number,
  audit: ProceduralMapFairnessAudit,
  config: ProceduralGeneratorConfig
): readonly string[] {
  const failures: string[] = [];
  const scores = getProceduralFactionAuditScores(audit);

  if (fairnessScore <= 0) {
    failures.push("fairness-score-zero");
  }

  if (fairnessScore < config.fairnessHardReject) {
    failures.push("fairness-hard-reject");
  }

  if (fairnessScore < config.fairnessMinAcceptable) {
    failures.push("fairness-below-minimum");
  }

  for (const factionId of audit.activeFactionIds) {
    const score = audit.factionScores[factionId];

    if (score === undefined) {
      failures.push(`rigid-audit:${factionId}:missing-fairness-score`);
      continue;
    }

    if (!score.starterRaid.hardGatePassed) {
      failures.push(
        `starter-raid:${factionId}:${score.starterRaid.rejectionReason ?? "hard-gate-failed"}`
      );
    }

    if (!score.neutralExpansion.hardGatePassed) {
      failures.push(
        `neutral-expansion:${factionId}:${score.neutralExpansion.rejectionReason ?? "hard-gate-failed"}`
      );
    }

    if (!score.fallbackRecoverySolvency.hardGatePassed) {
      failures.push(
        `fallback-recovery:${factionId}:${score.fallbackRecoverySolvency.rejectionReason ?? "hard-gate-failed"}`
      );
    }
  }

  addBeneficialOutlierFailure(
    failures,
    "tritium-access-major-outlier",
    scores.map((score) => score.tritiumAccessScore),
    config.majorOutlierSpread
  );
  addBeneficialOutlierFailure(
    failures,
    "shipyard-security-major-outlier",
    scores.map((score) => score.shipyardSecurityScore),
    config.majorOutlierSpread
  );
  addStartingShipyardSecurityHardGate(failures, scores, config);
  addBeneficialOutlierFailure(
    failures,
    "staging-value-major-outlier",
    scores.map((score) => score.stagingValueScore),
    config.majorOutlierSpread
  );
  addRiskOutlierFailure(
    failures,
    "pressure-received-major-outlier",
    scores.map((score) => score.pressureReceivedScore),
    config.majorOutlierSpread
  );
  addRiskOutlierFailure(
    failures,
    "dogpile-risk-major-outlier",
    scores.map((score) => score.dogpileRisk),
    config.majorOutlierSpread
  );

  failures.push(...getProceduralThreePlayerEarlyCollapseGateFailures(audit, config));

  return failures;
}

function getProceduralThreePlayerEarlyCollapseGateFailures(
  audit: ProceduralMapFairnessAudit,
  config: ProceduralGeneratorConfig
): readonly string[] {
  if (audit.activeFactionIds.length < 3) {
    return [];
  }

  const failures: string[] = [];
  const scores = getProceduralFactionAuditScores(audit);
  const tritiumAccessSpread = rangeOf(scores.map((score) => score.tritiumAccessScore));
  const shipyardSecuritySpread = rangeOf(scores.map((score) => score.shipyardSecurityScore));
  const earlyCollapseAudits = audit.earlyCollapseAudits;

  if (tritiumAccessSpread > config.threePlayerTritiumAccessSpreadHardReject) {
    failures.push("tritium-access-score-spread-3p");
  }

  if (shipyardSecuritySpread > config.threePlayerShipyardSecuritySpreadHardReject) {
    failures.push("starting-shipyard-security-spread-3p");
  }

  for (const earlyAudit of earlyCollapseAudits) {
    if (earlyAudit.rejectionReason !== null) {
      failures.push(`early-collapse:${earlyAudit.faction}:${earlyAudit.rejectionReason}`);
    }
  }

  if (config.rejectSameFallbackRaceByT3) {
    const fallbackRaces = getSameFallbackTritiumRaceFailures(earlyCollapseAudits);
    failures.push(...fallbackRaces);
  }

  const earlyHighRiskFactions = earlyCollapseAudits.filter((earlyAudit) => {
    return (
      earlyAudit.fallbackArrivalTurn !== null &&
      earlyAudit.fallbackArrivalTurn <= 3 &&
      earlyAudit.contestedRiskByT3 >= 76
    );
  });

  if (config.rejectSimultaneousEarlyHighRisk && earlyHighRiskFactions.length >= 2) {
    failures.push("two-simultaneous-contested-productive-nodes-by-t3");
  }

  return uniqueStrings(failures);
}

function getSameFallbackTritiumRaceFailures(
  earlyCollapseAudits: readonly ProceduralEarlyCollapseAudit[]
): readonly string[] {
  const byFallback = new Map<string, ProceduralEarlyCollapseAudit[]>();

  for (const audit of earlyCollapseAudits) {
    if (audit.nearestFallbackTritium === null || audit.fallbackArrivalTurn === null) {
      continue;
    }

    if (audit.fallbackArrivalTurn > 3) {
      continue;
    }

    byFallback.set(audit.nearestFallbackTritium, [
      ...(byFallback.get(audit.nearestFallbackTritium) ?? []),
      audit
    ]);
  }

  return [...byFallback.entries()].flatMap(([nodeId, audits]) => {
    if (audits.length < 2) {
      return [];
    }

    const arrivalTurns = audits.map((audit) => audit.fallbackArrivalTurn ?? 99);

    if (Math.max(...arrivalTurns) - Math.min(...arrivalTurns) > 1) {
      return [];
    }

    return [`same-fallback-tritium-race-by-t3:${nodeId}`];
  });
}

function addStartingShipyardSecurityHardGate(
  failures: string[],
  scores: readonly ProceduralFactionFairnessAudit[],
  config: ProceduralGeneratorConfig
): void {
  const shipyardSecurityScores = scores.map((score) => score.shipyardSecurityScore);
  const contestRisks = scores.map((score) => score.shipyardAudit.contestRisk);
  const progressStealRisks = scores.map((score) => score.shipyardAudit.progressStealRisk);
  const mandatoryLaunchRisks = scores.map((score) => score.shipyardAudit.mandatoryLaunchRisk);
  const incomingBurnPressures = scores.map(
    (score) => score.shipyardAudit.incomingBurnPressureFromEnemies
  );

  if (
    isMajorBeneficialOutlier(
      shipyardSecurityScores,
      config.startingShipyardSecurityOutlierSpread
    ) ||
    isMajorRiskOutlier(contestRisks, config.startingShipyardOpeningPressureOutlierSpread) ||
    isMajorRiskOutlier(progressStealRisks, config.startingShipyardOpeningPressureOutlierSpread) ||
    isMajorRiskOutlier(mandatoryLaunchRisks, config.startingShipyardOpeningPressureOutlierSpread) ||
    isMajorRiskOutlier(incomingBurnPressures, config.startingShipyardOpeningPressureOutlierSpread)
  ) {
    failures.push("STARTING_SHIPYARD_SECURITY_OUTLIER");
  }
}

function createProceduralTritiumAccessAudit(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  start: ProceduralMapStart,
  enemyStarts: readonly ProceduralMapStart[],
  tritiumAccessScore: number,
  fallbackTritiumQuality: number
): ProceduralTritiumAccessAudit {
  const options = candidate.tritiumNodeIds
    .filter((nodeId) => nodeId !== start.tritium)
    .map((nodeId): ProceduralTritiumOptionAudit | null => {
      const route = bestRoute(reachability, getStartNodeIds(start), [nodeId]);

      if (route === null) {
        return null;
      }

      return {
        nodeId,
        burnTurns: route.burnTurns,
        burnCost: route.burnCost,
        normalizedQuality: roundScore(route.recoveryValue),
        enemyPressureRisk: roundScore(
          combinedEnemyPressureToNode(reachability, enemyStarts, nodeId)
        )
      };
    })
    .filter((option): option is ProceduralTritiumOptionAudit => option !== null)
    .sort((first, second) => {
      const firstScore = first.normalizedQuality - first.enemyPressureRisk * 0.22;
      const secondScore = second.normalizedQuality - second.enemyPressureRisk * 0.22;

      if (firstScore !== secondScore) {
        return secondScore - firstScore;
      }

      if (first.burnTurns !== second.burnTurns) {
        return first.burnTurns - second.burnTurns;
      }

      return first.burnCost - second.burnCost;
    });
  const nearestFallback =
    [...options].sort((first, second) => {
      if (first.burnTurns !== second.burnTurns) {
        return first.burnTurns - second.burnTurns;
      }

      return first.burnCost - second.burnCost;
    })[0] ?? null;

  return {
    startingTritium: start.tritium,
    nearestFallbackTritium: nearestFallback?.nodeId ?? null,
    nearestFallbackBurnTurns: nearestFallback?.burnTurns ?? null,
    nearestFallbackBurnCost: nearestFallback?.burnCost ?? null,
    fallbackPaybackEstimate:
      nearestFallback === null
        ? null
        : roundScore(nearestFallback.burnTurns + nearestFallback.burnCost / 2),
    rankedTritiumOptions: options.slice(0, 5),
    tritiumAccessScore,
    tritiumRecoveryScore: fallbackTritiumQuality
  };
}

function createProceduralShipyardExposureAudit(
  candidate: ProceduralCandidate,
  reachability: ProceduralReachabilityMatrix,
  start: ProceduralMapStart,
  enemyStarts: readonly ProceduralMapStart[],
  enemyProductiveNodeIds: readonly string[],
  shipyardSecurityScore: number
): ProceduralShipyardExposureAudit {
  const incomingBurnPressureFromEnemies = combinedEnemyRoutePressureToNode(
    reachability,
    enemyStarts,
    start.shipyard,
    (route) => route.contestPressure
  );
  const incomingFirePressureFromEnemies = combinedEnemyRoutePressureToNode(
    reachability,
    enemyStarts,
    start.shipyard,
    (route) => route.firePressure
  );
  const outgoingFireValue = averageBestRouteQualities(
    reachability,
    [start.shipyard],
    enemyProductiveNodeIds,
    4,
    (route) => route.firePressure
  );
  const outgoingBurnValue = averageBestRouteQualities(
    reachability,
    [start.shipyard],
    enemyProductiveNodeIds,
    4,
    (route) => route.contestPressure
  );
  const launchEscapeValue = averageBestRouteQualities(
    reachability,
    [start.shipyard],
    uniqueNodeIds([...candidate.tritiumNodeIds, ...candidate.shipyardNodeIds, start.staging]),
    3,
    (route) => route.escapeValue
  );
  const contestRisk = clampScore(incomingBurnPressureFromEnemies);
  const progressStealRisk = clampScore(
    incomingBurnPressureFromEnemies * 0.72 + incomingFirePressureFromEnemies * 0.18
  );
  const mandatoryLaunchRisk = clampScore(100 - launchEscapeValue);

  return {
    startingShipyard: start.shipyard,
    incomingBurnPressureFromEnemies,
    incomingFirePressureFromEnemies,
    contestRisk,
    progressStealRisk,
    outgoingFireValue,
    outgoingBurnValue,
    mandatoryLaunchRisk,
    shipyardSecurityScore,
    notes: createProceduralShipyardAuditNotes(
      contestRisk,
      progressStealRisk,
      outgoingFireValue,
      outgoingBurnValue,
      mandatoryLaunchRisk
    )
  };
}

function createProceduralShipyardAuditNotes(
  contestRisk: number,
  progressStealRisk: number,
  outgoingFireValue: number,
  outgoingBurnValue: number,
  mandatoryLaunchRisk: number
): readonly string[] {
  return [
    contestRisk > 66
      ? "enemy burn contest pressure is high"
      : "enemy burn contest pressure is contained",
    progressStealRisk > 66
      ? "saved progress can be stolen quickly"
      : "saved progress has recovery space",
    Math.max(outgoingFireValue, outgoingBurnValue) > 55
      ? "shipyard projects useful pressure"
      : "shipyard is defensive more than projective",
    mandatoryLaunchRisk > 66
      ? "mandatory launch may have poor exits"
      : "mandatory launch has credible exits"
  ];
}

function createProceduralOpeningCurveAudit(
  reachability: ProceduralReachabilityMatrix,
  tritiumAccess: ProceduralTritiumAccessAudit,
  shipyardAudit: ProceduralShipyardExposureAudit,
  pressureReceivedScore: number,
  pressureAppliedScore: number,
  dogpileRisk: number
): ProceduralOpeningCurveAudit {
  const horizon = getProceduralOpeningCurveHorizon(reachability);
  const likelySecondTritiumTiming = tritiumAccess.nearestFallbackBurnTurns;
  const expectedDvByTurn = Array.from({ length: horizon + 1 }, (_, turn) => {
    const startingTritiumIncome = turn * 2;
    const secondTritiumIncome =
      likelySecondTritiumTiming === null || turn < likelySecondTritiumTiming
        ? 0
        : (turn - likelySecondTritiumTiming + 1) * 2;

    return 10 + startingTritiumIncome + secondTritiumIncome;
  });
  const expectedShipyardProgressByTurn = Array.from({ length: horizon + 1 }, (_, turn) => {
    return Math.min(turn, 5);
  });

  return {
    expectedDvByTurn,
    expectedShipyardProgressByTurn,
    likelySecondTritiumTiming,
    likelyFirstPressureReceived: estimateLikelyPressureTiming(pressureReceivedScore, reachability),
    likelyFirstPressureApplied: estimateLikelyPressureTiming(pressureAppliedScore, reachability),
    predictedCollapseRisk: clampScore(
      dogpileRisk * 0.32 +
        pressureReceivedScore * 0.22 +
        (100 - tritiumAccess.tritiumAccessScore) * 0.28 +
        (100 - shipyardAudit.shipyardSecurityScore) * 0.18
    )
  };
}

function getProceduralOpeningCurveHorizon(reachability: ProceduralReachabilityMatrix): number {
  return Math.max(4, Math.min(7, Math.ceil(reachability.burnTurns.q3 || 5)));
}

function estimateLikelyPressureTiming(
  pressureScore: number,
  reachability: ProceduralReachabilityMatrix
): number | null {
  if (pressureScore <= 0) {
    return null;
  }

  const normalizedPressure = clamp01(pressureScore / 100);
  const dynamicRange = Math.max(1, reachability.burnTurns.p90 - reachability.burnTurns.min);
  return Math.max(1, Math.round(reachability.burnTurns.p90 - dynamicRange * normalizedPressure));
}

function addBeneficialOutlierFailure(
  failures: string[],
  reason: string,
  values: readonly number[],
  spreadLimit: number
): void {
  if (isMajorBeneficialOutlier(values, spreadLimit)) {
    failures.push(reason);
  }
}

function addRiskOutlierFailure(
  failures: string[],
  reason: string,
  values: readonly number[],
  spreadLimit: number
): void {
  if (isMajorRiskOutlier(values, spreadLimit)) {
    failures.push(reason);
  }
}

function isMajorBeneficialOutlier(values: readonly number[], spreadLimit: number): boolean {
  return (
    values.length > 1 && rangeOf(values) >= spreadLimit && Math.min(...values) < median(values)
  );
}

function isMajorRiskOutlier(values: readonly number[], spreadLimit: number): boolean {
  return (
    values.length > 1 && rangeOf(values) >= spreadLimit && Math.max(...values) > median(values)
  );
}

function getWorstProceduralAsymmetryReason(
  factionScores: Readonly<Partial<Record<ProceduralFactionId, ProceduralFactionFairnessAudit>>>,
  activeFactionIds: readonly ProceduralFactionId[]
): string {
  const scores = activeFactionIds.flatMap((id) => {
    const score = factionScores[id];
    return score === undefined ? [] : [{ id, score }];
  });

  if (scores.length <= 1) {
    return "none";
  }

  const metricSpreads: Array<Readonly<{ label: string; spread: number }>> = [
    {
      label: "tritiumAccessScore",
      spread: rangeOf(scores.map(({ score }) => score.tritiumAccessScore))
    },
    {
      label: "shipyardSecurityScore",
      spread: rangeOf(scores.map(({ score }) => score.shipyardSecurityScore))
    },
    {
      label: "stagingValueScore",
      spread: rangeOf(scores.map(({ score }) => score.stagingValueScore))
    },
    {
      label: "pressureReceivedScore",
      spread: rangeOf(scores.map(({ score }) => score.pressureReceivedScore))
    },
    {
      label: "pressureAppliedScore",
      spread: rangeOf(scores.map(({ score }) => score.pressureAppliedScore))
    },
    {
      label: "dogpileRisk",
      spread: rangeOf(scores.map(({ score }) => score.dogpileRisk))
    }
  ].sort((first, second) => second.spread - first.spread);
  const worst = metricSpreads[0];

  return worst === undefined ? "none" : `${worst.label} spread ${roundScore(worst.spread)}`;
}

function getProceduralFactionAuditScores(
  audit: ProceduralMapFairnessAudit
): readonly ProceduralFactionFairnessAudit[] {
  return audit.activeFactionIds.flatMap((factionId) => {
    const score = audit.factionScores[factionId];
    return score === undefined ? [] : [score];
  });
}

function averagePairRouteQuality(
  reachability: ProceduralReachabilityMatrix,
  nodeIds: readonly string[]
): number {
  const qualities: number[] = [];

  for (let firstIndex = 0; firstIndex < nodeIds.length; firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < nodeIds.length; secondIndex += 1) {
      const firstNodeId = nodeIds[firstIndex];
      const secondNodeId = nodeIds[secondIndex];

      if (firstNodeId === undefined || secondNodeId === undefined) {
        continue;
      }

      qualities.push(
        bestRouteQuality(
          reachability,
          [firstNodeId, secondNodeId],
          [firstNodeId, secondNodeId],
          (route) => route.recoveryValue
        )
      );
    }
  }

  return average(qualities);
}

function combinedEnemyPressureToNode(
  reachability: ProceduralReachabilityMatrix,
  enemyStarts: readonly ProceduralMapStart[],
  targetNodeId: string
): number {
  return combinedEnemyRoutePressureToNode(reachability, enemyStarts, targetNodeId, (route) =>
    Math.max(route.contestPressure, route.firePressure)
  );
}

function combinedEnemyRoutePressureToNode(
  reachability: ProceduralReachabilityMatrix,
  enemyStarts: readonly ProceduralMapStart[],
  targetNodeId: string,
  getPressure: (route: ProceduralRouteQuality) => number
): number {
  return clampScore(
    average(
      enemyStarts.map((enemyStart) => {
        return bestRouteQuality(
          reachability,
          getStartNodeIds(enemyStart),
          [targetNodeId],
          getPressure
        );
      })
    )
  );
}

function dogpilePressureForNode(
  reachability: ProceduralReachabilityMatrix,
  enemyStarts: readonly ProceduralMapStart[],
  targetNodeId: string
): number {
  const pressures = enemyStarts
    .map((enemyStart) => {
      return bestRouteQuality(reachability, getStartNodeIds(enemyStart), [targetNodeId], (route) =>
        Math.max(route.contestPressure, route.firePressure)
      );
    })
    .sort((first, second) => second - first);
  const strongest = pressures[0] ?? 0;
  const second = pressures[1] ?? 0;

  if (strongest <= 0) {
    return 0;
  }

  return clampScore(((strongest + second) / 2) * (second / strongest));
}

function averageBestRouteQualities(
  reachability: ProceduralReachabilityMatrix,
  originNodeIds: readonly string[],
  destinationNodeIds: readonly string[],
  count: number,
  getQuality: (route: ProceduralRouteQuality) => number
): number {
  const qualities = destinationNodeIds
    .map((destinationNodeId) => {
      return bestRouteQuality(reachability, originNodeIds, [destinationNodeId], getQuality);
    })
    .filter((quality) => quality > 0)
    .sort((first, second) => second - first);

  return average(qualities.slice(0, count));
}

function bestRouteQuality(
  reachability: ProceduralReachabilityMatrix,
  originNodeIds: readonly string[],
  destinationNodeIds: readonly string[],
  getQuality: (route: ProceduralRouteQuality) => number
): number {
  let bestQuality = 0;

  for (const originNodeId of originNodeIds) {
    for (const destinationNodeId of destinationNodeIds) {
      if (originNodeId === destinationNodeId) {
        continue;
      }

      const route = reachability.routeByKey.get(
        createProceduralRouteKey(originNodeId, destinationNodeId)
      );

      if (route === undefined) {
        continue;
      }

      bestQuality = Math.max(bestQuality, getQuality(route));
    }
  }

  return bestQuality;
}

function bestRoute(
  reachability: ProceduralReachabilityMatrix,
  originNodeIds: readonly string[],
  destinationNodeIds: readonly string[]
): ProceduralRouteQuality | null {
  let best: ProceduralRouteQuality | null = null;

  for (const originNodeId of originNodeIds) {
    for (const destinationNodeId of destinationNodeIds) {
      if (originNodeId === destinationNodeId) {
        continue;
      }

      const route = reachability.routeByKey.get(
        createProceduralRouteKey(originNodeId, destinationNodeId)
      );

      if (route === undefined) {
        continue;
      }

      if (
        best === null ||
        route.recoveryValue > best.recoveryValue ||
        (route.recoveryValue === best.recoveryValue && route.burnTurns < best.burnTurns) ||
        (route.recoveryValue === best.recoveryValue &&
          route.burnTurns === best.burnTurns &&
          route.burnCost < best.burnCost)
      ) {
        best = route;
      }
    }
  }

  return best;
}

function createProceduralRouteKey(originNodeId: string, destinationNodeId: string): string {
  return `${originNodeId}->${destinationNodeId}`;
}

function createDistributionStats(values: readonly number[]): ProceduralDistributionStats {
  const sortedValues = sortFiniteNumbers(values);

  if (sortedValues.length === 0) {
    return {
      min: 0,
      max: 0,
      median: 0,
      q1: 0,
      q3: 0,
      p90: 0
    };
  }

  return {
    min: sortedValues[0] ?? 0,
    max: sortedValues[sortedValues.length - 1] ?? 0,
    median: percentile(sortedValues, 0.5),
    q1: percentile(sortedValues, 0.25),
    q3: percentile(sortedValues, 0.75),
    p90: percentile(sortedValues, 0.9)
  };
}

function percentileRank(values: readonly number[], value: number): number {
  if (values.length <= 1) {
    return 0;
  }

  let lowerOrEqualCount = 0;

  for (const candidate of values) {
    if (candidate <= value) {
      lowerOrEqualCount += 1;
    }
  }

  return clamp01((lowerOrEqualCount - 1) / (values.length - 1));
}

function sortFiniteNumbers(values: readonly number[]): readonly number[] {
  return values.filter(Number.isFinite).sort((first, second) => first - second);
}

function percentile(sortedValues: readonly number[], ratio: number): number {
  if (sortedValues.length === 0) {
    return 0;
  }

  const clampedRatio = clamp01(ratio);
  const index = clampedRatio * (sortedValues.length - 1);
  const lowerIndex = Math.floor(index);
  const upperIndex = Math.ceil(index);
  const lower = sortedValues[lowerIndex] ?? sortedValues[0] ?? 0;
  const upper = sortedValues[upperIndex] ?? lower;

  return lower + (upper - lower) * (index - lowerIndex);
}

function median(values: readonly number[]): number {
  return percentile(
    [...values].sort((first, second) => first - second),
    0.5
  );
}

function average(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((total, value) => total + value, 0) / values.length;
}

function uniqueNodeIds(nodeIds: readonly string[]): readonly string[] {
  return [...new Set(nodeIds)];
}

function uniqueStrings(values: readonly string[]): readonly string[] {
  return [...new Set(values)];
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function createProceduralContent(
  candidate: ProceduralCandidate,
  config: ProceduralGeneratorConfig
): SolarSystemData {
  const tritiumNodeIds = new Set(candidate.tritiumNodeIds);
  const shipyardNodeIds = new Set(candidate.shipyardNodeIds);
  const nodes = STRATEGIC_MAP_CONTENT.nodes.map((node) => {
    if (tritiumNodeIds.has(node.id)) {
      return setNodeRole(node, "tritium");
    }

    if (shipyardNodeIds.has(node.id)) {
      return setNodeRole(node, "shipyard");
    }

    return setNodeRole(node, "barren");
  });

  return parseSolarSystemData({
    ...STRATEGIC_MAP_CONTENT,
    nodes,
    ...(config.transferRules === undefined ? {} : { transferRules: config.transferRules })
  });
}

function createProceduralInitialOccupancies(
  candidate: ProceduralCandidate
): readonly MapPresetInitialOccupancy[] {
  return PROCEDURAL_TWO_PLAYER_FACTION_IDS.flatMap((factionId) => {
    return getProceduralCandidateStart(candidate, factionId).startingShips;
  });
}

function setNodeRole(node: NodeData, type: NodeType): NodeData {
  if (type === "protected") {
    return {
      ...node,
      type,
      controllable: false,
      contestable: false,
      protectedNoWar: true,
      producesTritium: false,
      allowsShipyard: false
    };
  }

  return {
    ...node,
    type,
    controllable: true,
    contestable: true,
    protectedNoWar: false,
    producesTritium: type === "tritium",
    allowsShipyard: type === "shipyard"
  };
}

function getProceduralExcludedNodes(config: ProceduralGeneratorConfig): {
  readonly productive: ReadonlySet<string>;
  readonly starting: ReadonlySet<string>;
} {
  const productive = new Set<string>(config.productiveExclusions);
  const starting = new Set<string>(config.startingExclusions);
  const moonCountsByParent = new Map<string, number>();

  if (!config.excludeMultiMoonParentProductiveNodes) {
    return {
      productive,
      starting
    };
  }

  for (const body of STRATEGIC_MAP_CONTENT.bodies) {
    if (body.kind !== "moon" || body.parentId === null) {
      continue;
    }

    moonCountsByParent.set(body.parentId, (moonCountsByParent.get(body.parentId) ?? 0) + 1);
  }

  for (const [parentId, moonCount] of moonCountsByParent) {
    if (moonCount >= 2) {
      productive.add(`${parentId}_node`);
    }
  }

  return {
    productive,
    starting
  };
}

function createProceduralNodeFacts(
  content: SolarSystemData
): ReadonlyMap<string, ProceduralNodeFact> {
  const bodyById = new Map(content.bodies.map((body) => [body.id, body]));
  const nodeFacts = new Map<string, ProceduralNodeFact>();

  for (let order = 0; order < content.nodes.length; order += 1) {
    const node = content.nodes[order];

    if (node === undefined) {
      continue;
    }

    const body = bodyById.get(node.bodyId);

    if (body === undefined) {
      continue;
    }

    const systemId = body.kind === "moon" && body.parentId !== null ? body.parentId : body.id;
    const referenceBody =
      body.kind === "moon" && body.parentId !== null ? bodyById.get(body.parentId) : body;

    nodeFacts.set(node.id, {
      node,
      body,
      position: computeProceduralBodyPosition(content, node.bodyId, 0),
      systemId,
      region: getProceduralRegion(referenceBody ?? body),
      order
    });
  }

  return nodeFacts;
}

function getProceduralRegion(body: BodyData): ProceduralNodeFact["region"] {
  if (body.orbitRadius <= 220) {
    return "inner";
  }

  if (body.orbitRadius <= 520) {
    return "middle";
  }

  return "outer";
}

function computeProceduralBodyPosition(
  content: SolarSystemData,
  bodyId: string,
  turn: number
): ProceduralVec2 {
  const body = content.bodies.find((candidate) => candidate.id === bodyId);

  if (body === undefined) {
    throw new Error(`Cannot compute procedural body position for unknown body "${bodyId}".`);
  }

  if (body.parentId === null) {
    return { x: 0, y: 0 };
  }

  const parentPosition = computeProceduralBodyPosition(content, body.parentId, turn);
  const angleRadians = degreesToRadians(
    body.initialAngle + (body.orbitPeriodTurns === 0 ? 0 : (turn / body.orbitPeriodTurns) * 360)
  );

  return {
    x: parentPosition.x + Math.cos(angleRadians) * body.orbitRadius,
    y: parentPosition.y + Math.sin(angleRadians) * body.orbitRadius
  };
}

function takeRandomUnique<T>(
  rng: () => number,
  source: readonly T[],
  count: number
): readonly T[] | null {
  if (source.length < count) {
    return null;
  }

  const pool = [...source];
  const result: T[] = [];

  for (let index = 0; index < count; index += 1) {
    const selectedIndex = Math.floor(rng() * pool.length);
    const [selected] = pool.splice(selectedIndex, 1);

    if (selected === undefined) {
      return null;
    }

    result.push(selected);
  }

  return result;
}

function getStartNodeIds(start: ProceduralMapStart): readonly string[] {
  return [start.tritium, start.shipyard, start.staging];
}

function getProceduralCandidateStarts(
  candidate: ProceduralCandidate
): readonly ProceduralMapStart[] {
  return [candidate.playerStart, candidate.opponentStart, candidate.ai_2Start];
}

function getProceduralCandidateStart(
  candidate: ProceduralCandidate,
  factionId: ProceduralFactionId
): ProceduralMapStart {
  switch (factionId) {
    case "player":
      return candidate.playerStart;
    case "opponent":
      return candidate.opponentStart;
    case "ai_2":
      return candidate.ai_2Start;
  }
}

function getAllStartNodeIds(candidate: ProceduralCandidate): readonly string[] {
  return getProceduralCandidateStarts(candidate).flatMap(getStartNodeIds);
}

function distanceBetweenNodeIds(
  firstNodeId: string,
  secondNodeId: string,
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>
): number {
  const first = getNodeFact(nodeFacts, firstNodeId);
  const second = getNodeFact(nodeFacts, secondNodeId);

  return distance(first.position, second.position);
}

function rangeOf(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return Math.max(...values) - Math.min(...values);
}

function distance(first: ProceduralVec2, second: ProceduralVec2): number {
  return Math.hypot(first.x - second.x, first.y - second.y);
}

function getNodeFact(
  nodeFacts: ReadonlyMap<string, ProceduralNodeFact>,
  nodeId: string
): ProceduralNodeFact {
  const fact = nodeFacts.get(nodeId);

  if (fact === undefined) {
    throw new Error(`Procedural scoring references unknown node "${nodeId}".`);
  }

  return fact;
}

function countBy<T>(items: readonly T[], getKey: (item: T) => string): Map<string, number> {
  const counts = new Map<string, number>();

  for (const item of items) {
    const key = getKey(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return counts;
}

function sortNodeIds(nodeIds: readonly string[]): readonly string[] {
  const orderByNodeId = new Map(STRATEGIC_MAP_CONTENT.nodes.map((node, order) => [node.id, order]));

  return [...nodeIds].sort((first, second) => {
    return (orderByNodeId.get(first) ?? 999) - (orderByNodeId.get(second) ?? 999);
  });
}

function tallyRejection(rejectionTally: ProceduralRejectionTally, reason: string): void {
  rejectionTally.set(reason, (rejectionTally.get(reason) ?? 0) + 1);
}

function mergeRejectionTallies(
  targetTally: ProceduralRejectionTally,
  sourceTally: ProceduralRejectionTally
): void {
  for (const [reason, count] of sourceTally) {
    targetTally.set(reason, (targetTally.get(reason) ?? 0) + count);
  }
}

function formatRejectionTally(rejectionTally: ProceduralRejectionTally): readonly string[] {
  return formatFullRejectionTally(rejectionTally).slice(0, 8);
}

function formatFullRejectionTally(rejectionTally: ProceduralRejectionTally): readonly string[] {
  return [...rejectionTally.entries()]
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([reason, count]) => `${reason}:${count}`);
}

function formatRigidAuditRejectionTally(
  rejectionTally: ProceduralRejectionTally
): readonly string[] {
  return [...rejectionTally.entries()]
    .filter(([reason]) => reason !== "rigid-audit-candidate-rejected")
    .filter(([reason]) => isRigidProceduralAuditFailure(reason))
    .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
    .map(([reason, count]) => `${reason}:${count}`);
}

function clampScore(score: number): number {
  return Math.max(0, Math.min(100, score));
}

function roundScore(score: number): number {
  return Math.round(score * 100) / 100;
}

function degreesToRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

function createSeededRandom(seed: string): () => number {
  let state = hashSeed(seed);

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}
