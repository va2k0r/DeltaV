import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { createServer } from "vite";

const countArgumentIndex = process.argv.indexOf("--count");
const requestedCount = countArgumentIndex >= 0 ? Number(process.argv[countArgumentIndex + 1]) : 100;
const outputArgumentIndex = process.argv.indexOf("--output");
const outputPath = outputArgumentIndex >= 0 ? process.argv[outputArgumentIndex + 1] : undefined;

if (!Number.isInteger(requestedCount) || requestedCount <= 0) {
  throw new Error(`Invalid diagnostic count: ${String(requestedCount)}`);
}

const server = await createServer({
  appType: "custom",
  logLevel: "silent",
  server: { middlewareMode: true }
});

try {
  const core = await server.ssrLoadModule("/src/core/index.ts");
  const data = await server.ssrLoadModule("/src/data/index.ts");
  const runtime = await server.ssrLoadModule("/src/ui/mapPresetRuntime.ts");
  const preset = data.getMapPreset(data.PROCEDURAL_MAP_PRESET_ID);
  const rows = [];
  const diagnosticStartedAt = performance.now();

  for (let index = 0; index < requestedCount; index += 1) {
    const requestedSeed = data.createProceduralMapSeed();
    const generationStartedAt = performance.now();
    const automaticMap = runtime.createAutomaticProceduralMapForSeed(
      preset,
      requestedSeed,
      data.createProceduralMapSeed
    );
    const baseState = core.createInitialGameState({
      gameMode: "2p",
      nodeOccupancies: data.getProceduralInitialOccupanciesForMode(automaticMap.generation, "2p")
    });
    const allAiState = {
      ...baseState,
      factions: baseState.factions.map((faction) => ({
        ...faction,
        controlType: "ai"
      }))
    };

    rows.push({
      index,
      requestedSeed: automaticMap.requestedSeed,
      attempts: automaticMap.attempts,
      finalEffectiveMapSeed: automaticMap.finalEffectiveMapSeed,
      mapGameplayHash: core.createMapGameplayHash(automaticMap.generation.content, allAiState),
      usedStaticFallback: automaticMap.usedStaticFallback,
      generationTimeMs: roundMilliseconds(performance.now() - generationStartedAt)
    });
  }

  const totalGenerationTimeMs = performance.now() - diagnosticStartedAt;
  const generationTimes = rows
    .map((row) => row.generationTimeMs)
    .sort((first, second) => first - second);
  const hashCounts = countValues(rows.map((row) => row.mapGameplayHash));
  const attemptCountDistribution = countValues(rows.map((row) => String(row.attempts.length)));
  const fallbackCount = rows.filter((row) => row.usedStaticFallback).length;
  const summary = {
    sampleSize: rows.length,
    finalStaticFallbackCount: fallbackCount,
    finalStaticFallbackFrequency: fallbackCount / rows.length,
    distinctGameplayHashes: Object.keys(hashCounts).length,
    attemptCountDistribution,
    hashCounts,
    generationTimeMs: {
      total: roundMilliseconds(totalGenerationTimeMs),
      mean: roundMilliseconds(totalGenerationTimeMs / rows.length),
      min: generationTimes[0] ?? 0,
      median: percentile(generationTimes, 0.5),
      p95: percentile(generationTimes, 0.95),
      max: generationTimes.at(-1) ?? 0
    }
  };
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    rows
  };

  if (outputPath !== undefined) {
    const resolvedOutputPath = resolve(outputPath);
    await mkdir(dirname(resolvedOutputPath), { recursive: true });
    await writeFile(resolvedOutputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  console.log(JSON.stringify(summary, null, 2));
} finally {
  await server.close();
}

function countValues(values) {
  return Object.fromEntries(
    [...new Set(values)]
      .map((value) => [value, values.filter((candidate) => candidate === value).length])
      .sort((first, second) => second[1] - first[1] || first[0].localeCompare(second[0]))
  );
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * percentileValue) - 1)
  );
  return sortedValues[index];
}

function roundMilliseconds(value) {
  return Math.round(value * 100) / 100;
}
