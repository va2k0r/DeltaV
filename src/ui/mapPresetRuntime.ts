import { createInitialGameState, type GameState } from "../core";
import {
  createProceduralMapSeed,
  generateProceduralMap,
  parseSolarSystemData,
  type MapPreset,
  type ProceduralMapDebug,
  type ProceduralMapGeneration,
  type SolarSystemData
} from "../data";

export type AutomaticProceduralMapGenerationAudit = Readonly<{
  requestedSeed: string;
  finalEffectiveMapSeed: string;
  attempts: readonly ProceduralMapGenerationAttemptAudit[];
  usedStaticFallback: boolean;
}>;

export type ProceduralBatchMapGeneration = AutomaticProceduralMapGenerationAudit &
  Readonly<{
    effectiveMapSeed: string;
    generation: ProceduralMapGeneration;
  }>;

export type ProceduralMapGenerationAttemptAudit = Readonly<{
  attempt: number;
  seed: string;
  candidatesEvaluated: number;
  candidatesAccepted: number;
  candidatesRejected: number;
  rejectionCauses: readonly string[];
  producedStaticFallback: boolean;
}>;

export const AUTOMATIC_PROCEDURAL_MAP_MAX_ATTEMPTS = 3;

export type ProceduralBatchMapCycle = Readonly<{
  createNext(preset: MapPreset): ProceduralBatchMapGeneration;
}>;

export async function loadMapPresetContent(
  preset: MapPreset,
  cache: Map<string, SolarSystemData>,
  proceduralSeed: string,
  proceduralGenerationBySeed: Map<string, ProceduralMapGeneration>
): Promise<SolarSystemData> {
  const cacheKey = getPresetCacheKey(preset, proceduralSeed);
  const cachedContent = cache.get(cacheKey);

  if (cachedContent !== undefined) {
    return cachedContent;
  }

  if (preset.procedural === true) {
    const generated = getProceduralGeneration(preset, proceduralSeed, proceduralGenerationBySeed);
    cache.set(cacheKey, generated.content);
    return generated.content;
  }

  if (preset.content !== undefined) {
    cache.set(cacheKey, preset.content);
    return preset.content;
  }

  if (preset.contentUrl === undefined) {
    throw new Error(`Map preset "${preset.label}" has no content source.`);
  }

  const response = await fetch(preset.contentUrl);

  if (!response.ok) {
    throw new Error(`Failed to load ${preset.contentUrl}: ${response.status}`);
  }

  const parsedContent = parseSolarSystemData(await response.json());
  cache.set(cacheKey, parsedContent);
  return parsedContent;
}

export function createInitialStateForPreset(
  preset: MapPreset,
  proceduralSeed: string,
  proceduralGenerationBySeed: Map<string, ProceduralMapGeneration>
): GameState {
  if (preset.procedural === true) {
    return createInitialGameState({
      nodeOccupancies: getProceduralGeneration(preset, proceduralSeed, proceduralGenerationBySeed)
        .initialOccupancies
    });
  }

  if (preset.initialOccupancies === undefined) {
    return createInitialGameState();
  }

  return createInitialGameState({
    nodeOccupancies: preset.initialOccupancies
  });
}

export function getPresetCacheKey(preset: MapPreset, proceduralSeed: string): string {
  return preset.procedural === true
    ? `${preset.id}:${normalizeProceduralSeedForUi(proceduralSeed)}`
    : preset.id;
}

export function getProceduralDebugForPreset(
  preset: MapPreset,
  proceduralSeed: string,
  proceduralGenerationBySeed: Map<string, ProceduralMapGeneration>
): ProceduralMapDebug | null {
  return preset.procedural === true
    ? getProceduralGeneration(preset, proceduralSeed, proceduralGenerationBySeed).debug
    : null;
}

export function getProceduralGeneration(
  preset: MapPreset,
  proceduralSeed: string,
  proceduralGenerationBySeed: Map<string, ProceduralMapGeneration>
): ProceduralMapGeneration {
  const normalizedSeed = normalizeProceduralSeedForUi(proceduralSeed);
  const cacheKey = getProceduralGenerationCacheKeyForPreset(preset, normalizedSeed);
  const cachedGeneration = proceduralGenerationBySeed.get(cacheKey);

  if (cachedGeneration !== undefined) {
    return cachedGeneration;
  }

  const generated = generateProceduralMap(normalizedSeed, preset.proceduralGenerator ?? "balanced");
  proceduralGenerationBySeed.set(cacheKey, generated);
  return generated;
}

export function createProceduralBatchMapForSeed(
  preset: MapPreset,
  requestedSeed: string
): Readonly<{
  requestedSeed: string;
  effectiveMapSeed: string;
  generation: ProceduralMapGeneration;
}> {
  if (preset.procedural !== true) {
    throw new Error(`Map preset "${preset.label}" is not procedural.`);
  }

  const normalizedRequestedSeed = normalizeProceduralSeedForUi(requestedSeed);
  const generation = generateProceduralMap(
    normalizedRequestedSeed,
    preset.proceduralGenerator ?? "balanced"
  );
  const effectiveMapSeed = generation.debug.seed;

  if (effectiveMapSeed !== normalizedRequestedSeed) {
    throw new Error(
      `Procedural batch seed mismatch: requested "${normalizedRequestedSeed}", generated "${effectiveMapSeed}".`
    );
  }

  return {
    requestedSeed: normalizedRequestedSeed,
    effectiveMapSeed,
    generation
  };
}

export function createAutomaticProceduralMapForSeed(
  preset: MapPreset,
  requestedSeed: string,
  retrySeedFactory: () => string = createProceduralMapSeed
): ProceduralBatchMapGeneration {
  const normalizedRequestedSeed = normalizeProceduralSeedForUi(requestedSeed);
  const attemptedSeeds = new Set<string>();
  const attempts: ProceduralMapGenerationAttemptAudit[] = [];
  let attemptSeed = normalizedRequestedSeed;
  let finalMap = createProceduralBatchMapForSeed(preset, attemptSeed);

  for (let attempt = 1; attempt <= AUTOMATIC_PROCEDURAL_MAP_MAX_ATTEMPTS; attempt += 1) {
    attemptedSeeds.add(attemptSeed);
    finalMap = attempt === 1 ? finalMap : createProceduralBatchMapForSeed(preset, attemptSeed);
    const producedStaticFallback = finalMap.generation.debug.fairnessAudit.fallbackStaticLayoutUsed;

    attempts.push({
      attempt,
      seed: finalMap.effectiveMapSeed,
      candidatesEvaluated: finalMap.generation.debug.evaluatedCandidateCount,
      candidatesAccepted: finalMap.generation.debug.acceptedCandidateCount,
      candidatesRejected: finalMap.generation.debug.rejectedCandidateCount,
      rejectionCauses: finalMap.generation.debug.candidateDiscardStats,
      producedStaticFallback
    });

    if (!producedStaticFallback || attempt === AUTOMATIC_PROCEDURAL_MAP_MAX_ATTEMPTS) {
      return {
        requestedSeed: normalizedRequestedSeed,
        effectiveMapSeed: finalMap.effectiveMapSeed,
        finalEffectiveMapSeed: finalMap.effectiveMapSeed,
        attempts,
        usedStaticFallback: producedStaticFallback,
        generation: finalMap.generation
      };
    }

    const retrySeedCandidate = normalizeProceduralSeedForUi(retrySeedFactory());
    attemptSeed = attemptedSeeds.has(retrySeedCandidate)
      ? `${retrySeedCandidate}-retry-${attempt + 1}`
      : retrySeedCandidate;
  }

  throw new Error("Automatic procedural map generation exceeded its bounded attempt count.");
}

export function createProceduralBatchMapCycle(
  seedFactory: () => string = createProceduralMapSeed
): ProceduralBatchMapCycle {
  const issuedAttemptSeeds = new Set<string>();
  const issuedFinalEffectiveSeeds = new Set<string>();
  let collisionSequence = 0;
  let previousGeneration: ProceduralMapGeneration | null = null;

  const issueUniqueSeed = (): string => {
    const seedCandidate = normalizeProceduralSeedForUi(seedFactory());
    let issuedSeed = seedCandidate;

    while (issuedAttemptSeeds.has(issuedSeed)) {
      collisionSequence += 1;
      issuedSeed = `${seedCandidate}-batch-${collisionSequence.toString(36)}`;
    }

    issuedAttemptSeeds.add(issuedSeed);
    return issuedSeed;
  };

  return {
    createNext(preset: MapPreset): ProceduralBatchMapGeneration {
      const requestedSeed = issueUniqueSeed();
      const batchMap = createAutomaticProceduralMapForSeed(preset, requestedSeed, issueUniqueSeed);

      if (issuedFinalEffectiveSeeds.has(batchMap.finalEffectiveMapSeed)) {
        throw new Error(
          `Procedural batch reused effective map seed "${batchMap.finalEffectiveMapSeed}".`
        );
      }

      if (batchMap.generation === previousGeneration) {
        throw new Error("Procedural batch reused the previous map generation instance.");
      }

      issuedFinalEffectiveSeeds.add(batchMap.finalEffectiveMapSeed);
      previousGeneration = batchMap.generation;
      return batchMap;
    }
  };
}

export function getProceduralGenerationCacheKeyForPreset(
  preset: MapPreset,
  proceduralSeed: string
): string {
  return `${preset.id}:${normalizeProceduralSeedForUi(proceduralSeed)}`;
}

export function normalizeProceduralSeedForUi(proceduralSeed: string): string {
  const trimmedSeed = proceduralSeed.trim();

  return trimmedSeed.length > 0 ? trimmedSeed : "deltav-procedural";
}
