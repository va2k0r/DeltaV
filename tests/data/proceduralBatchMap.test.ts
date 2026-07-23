import { describe, expect, it } from "vitest";
import { createInitialGameState, createMapGameplayHash } from "../../src/core";
import { PROCEDURAL_MAP_PRESET_ID, getMapPreset } from "../../src/data";
import {
  AUTOMATIC_PROCEDURAL_MAP_MAX_ATTEMPTS,
  createAutomaticProceduralMapForSeed,
  createProceduralBatchMapCycle,
  createProceduralBatchMapForSeed
} from "../../src/ui/mapPresetRuntime";

describe("AI-vs-AI procedural batch map cycle", () => {
  it("uses 20 distinct effective seeds, varies gameplay maps, and replays explicit seeds", () => {
    const preset = getMapPreset(PROCEDURAL_MAP_PRESET_ID);
    const acceptedSeeds = [
      "diag-direct-20260723-000",
      "diag-direct-20260723-002",
      "diag-direct-20260723-004",
      "diag-direct-20260723-005",
      "diag-direct-20260723-007",
      "diag-direct-20260723-008",
      "diag-direct-20260723-009",
      "diag-direct-20260723-010",
      "diag-direct-20260723-011",
      "diag-direct-20260723-012",
      "diag-direct-20260723-015",
      "diag-direct-20260723-016",
      "diag-direct-20260723-018",
      "diag-direct-20260723-020",
      "diag-direct-20260723-022",
      "diag-direct-20260723-023",
      "diag-direct-20260723-024",
      "diag-direct-20260723-025",
      "diag-direct-20260723-026",
      "diag-direct-20260723-027"
    ];
    let seedIndex = 0;
    const cycle = createProceduralBatchMapCycle(() => {
      const seed = acceptedSeeds[seedIndex];
      seedIndex += 1;

      if (seed === undefined) {
        throw new Error("Batch test exhausted its deterministic seed sequence.");
      }

      return seed;
    });
    const matches = Array.from({ length: 20 }, () => {
      const batchMap = cycle.createNext(preset);
      const initialState = createInitialGameState({
        nodeOccupancies: batchMap.generation.initialOccupancies
      });

      return {
        effectiveMapSeed: batchMap.effectiveMapSeed,
        attempts: batchMap.attempts.length,
        generation: batchMap.generation,
        mapGameplayHash: createMapGameplayHash(batchMap.generation.content, initialState)
      };
    });

    expect(new Set(matches.map((match) => match.effectiveMapSeed))).toHaveLength(20);
    expect(matches.every((match) => match.attempts === 1)).toBe(true);
    expect(new Set(matches.map((match) => match.generation))).toHaveLength(20);
    expect(new Set(matches.map((match) => match.mapGameplayHash)).size).toBeGreaterThan(1);

    const explicitSeed = "qa-ai-batch-explicit-replay";
    const firstReplay = createProceduralBatchMapForSeed(preset, explicitSeed);
    const secondReplay = createProceduralBatchMapForSeed(preset, explicitSeed);
    const firstReplayState = createInitialGameState({
      nodeOccupancies: firstReplay.generation.initialOccupancies
    });
    const secondReplayState = createInitialGameState({
      nodeOccupancies: secondReplay.generation.initialOccupancies
    });

    expect(firstReplay.effectiveMapSeed).toBe(explicitSeed);
    expect(secondReplay.effectiveMapSeed).toBe(explicitSeed);
    expect(createMapGameplayHash(firstReplay.generation.content, firstReplayState)).toBe(
      createMapGameplayHash(secondReplay.generation.content, secondReplayState)
    );
  }, 60_000);

  it("retries a failed automatic seed and succeeds with the second seed", () => {
    const preset = getMapPreset(PROCEDURAL_MAP_PRESET_ID);
    const automaticMap = createAutomaticProceduralMapForSeed(
      preset,
      "diag-direct-20260723-001",
      () => "diag-direct-20260723-000"
    );

    expect(automaticMap.attempts).toHaveLength(2);
    expect(automaticMap.attempts.map((attempt) => attempt.seed)).toEqual([
      "diag-direct-20260723-001",
      "diag-direct-20260723-000"
    ]);
    expect(automaticMap.attempts[0]?.producedStaticFallback).toBe(true);
    expect(automaticMap.attempts[1]?.producedStaticFallback).toBe(false);
    expect(automaticMap.finalEffectiveMapSeed).toBe("diag-direct-20260723-000");
    expect(automaticMap.usedStaticFallback).toBe(false);
    expect(
      automaticMap.attempts.every((attempt) => {
        return (
          attempt.candidatesEvaluated === 700 &&
          attempt.candidatesAccepted + attempt.candidatesRejected === 700 &&
          attempt.rejectionCauses.length > 0
        );
      })
    ).toBe(true);
  }, 30_000);

  it("uses the static fallback only after three consecutive failed seeds", () => {
    const preset = getMapPreset(PROCEDURAL_MAP_PRESET_ID);
    const retrySeeds = ["diag-direct-20260723-003", "diag-direct-20260723-006"];
    let retryIndex = 0;
    const automaticMap = createAutomaticProceduralMapForSeed(
      preset,
      "diag-direct-20260723-001",
      () => retrySeeds[retryIndex++] ?? "unexpected-extra-retry"
    );

    expect(automaticMap.attempts).toHaveLength(AUTOMATIC_PROCEDURAL_MAP_MAX_ATTEMPTS);
    expect(automaticMap.attempts.every((attempt) => attempt.producedStaticFallback)).toBe(true);
    expect(automaticMap.finalEffectiveMapSeed).toBe("diag-direct-20260723-006");
    expect(automaticMap.usedStaticFallback).toBe(true);
  }, 30_000);

  it("never requests more than two retry seeds", () => {
    const preset = getMapPreset(PROCEDURAL_MAP_PRESET_ID);
    const retrySeeds = ["diag-direct-20260723-003", "diag-direct-20260723-006"];
    let retryFactoryCalls = 0;

    const automaticMap = createAutomaticProceduralMapForSeed(
      preset,
      "diag-direct-20260723-001",
      () => {
        const seed = retrySeeds[retryFactoryCalls];
        retryFactoryCalls += 1;
        return seed ?? "unexpected-extra-retry";
      }
    );

    expect(retryFactoryCalls).toBe(2);
    expect(automaticMap.attempts).toHaveLength(3);
  }, 30_000);

  it("keeps explicit-seed generation single-attempt and reproducible", () => {
    const preset = getMapPreset(PROCEDURAL_MAP_PRESET_ID);
    const explicitSeed = "diag-direct-20260723-001";
    const first = createProceduralBatchMapForSeed(preset, explicitSeed);
    const second = createProceduralBatchMapForSeed(preset, explicitSeed);

    expect(first.effectiveMapSeed).toBe(explicitSeed);
    expect(second.effectiveMapSeed).toBe(explicitSeed);
    expect(first.generation).toBe(second.generation);
    expect(first.generation.debug.fairnessAudit.fallbackStaticLayoutUsed).toBe(true);
  }, 30_000);

  it("replays the same explicit seed with the same gameplay hash", () => {
    const preset = getMapPreset(PROCEDURAL_MAP_PRESET_ID);
    const replaySeed = "diag-direct-20260723-000";
    const first = createProceduralBatchMapForSeed(preset, replaySeed);
    const second = createProceduralBatchMapForSeed(preset, replaySeed);
    const firstState = createInitialGameState({
      nodeOccupancies: first.generation.initialOccupancies
    });
    const secondState = createInitialGameState({
      nodeOccupancies: second.generation.initialOccupancies
    });

    expect(createMapGameplayHash(first.generation.content, firstState)).toBe(
      createMapGameplayHash(second.generation.content, secondState)
    );
  }, 30_000);
});
