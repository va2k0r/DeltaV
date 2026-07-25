import type {
  SimulationPerformanceCounterName,
  SimulationPerformanceCounterSnapshot
} from "../core";
import type {
  CinematicDebugCounterName,
  CinematicPerformanceStats
} from "../renderers/cinematic3d";
import { isPresentationLikelyExternallyCapped } from "../renderers/cinematic3d/performancePacing";

export type BrowserPerformanceCounterName = "getCommandWarnings" | CinematicDebugCounterName;
export type BrowserPerformanceCounterSnapshot = Readonly<
  Record<BrowserPerformanceCounterName, number>
>;
export type PerformanceCounterRateSnapshot = BrowserPerformanceCounterSnapshot &
  SimulationPerformanceCounterSnapshot;

const browserPerformanceCounterNames = [
  "getCommandWarnings",
  "syncNodePresentation"
] as const satisfies readonly BrowserPerformanceCounterName[];

const simulationPerformanceCounterNamesForUi = [
  "evaluateFactionRecoveryPath",
  "getAiSolvencyTritiumCountAudits",
  "calculateBurnPlan",
  "calculateBurnPlanFromPosition"
] as const satisfies readonly SimulationPerformanceCounterName[];

export function createBrowserPerformanceCounterRecord(): Record<
  BrowserPerformanceCounterName,
  number
> {
  return Object.fromEntries(browserPerformanceCounterNames.map((name) => [name, 0])) as Record<
    BrowserPerformanceCounterName,
    number
  >;
}

export function createPerformanceCounterRateRecord(): Record<
  BrowserPerformanceCounterName | SimulationPerformanceCounterName,
  number
> {
  return {
    ...createBrowserPerformanceCounterRecord(),
    ...createSimulationPerformanceCounterRecordForUi()
  };
}

function createSimulationPerformanceCounterRecordForUi(): Record<
  SimulationPerformanceCounterName,
  number
> {
  return Object.fromEntries(
    simulationPerformanceCounterNamesForUi.map((name) => [name, 0])
  ) as Record<SimulationPerformanceCounterName, number>;
}

export function formatCinematicPerformanceDebugLines(
  stats: CinematicPerformanceStats | null,
  counters: PerformanceCounterRateSnapshot
): readonly string[] {
  if (stats === null) {
    return [];
  }

  const orderedSections = Object.entries(stats.sections)
    .filter(([key]) => key !== "frame")
    .sort((first, second) => second[1].averageMs - first[1].averageMs)
    .slice(0, 12)
    .map(([key, value]) => {
      return `${key} ${value.averageMs.toFixed(2)}ms avg / ${value.lastMs.toFixed(2)}ms last`;
    });

  const gpuTiming = stats.gpuFrame;
  const framePacing = stats.framePacing;
  const gpuLine = !gpuTiming.supported
    ? "GPU render timing unavailable"
    : gpuTiming.averageMs === null
      ? `GPU render timing sampling (${gpuTiming.pendingQueries} pending)`
      : `GPU render ${gpuTiming.averageMs.toFixed(2)}ms avg / ${gpuTiming.lastMs?.toFixed(2) ?? "—"}ms last`;
  const isPresentationLikelyCapped = isPresentationLikelyExternallyCapped({
    estimatedFps: stats.estimatedFps,
    averageCpuMs: stats.sections.frame.averageMs,
    maxCpuMs: stats.sections.frame.maxMs,
    averageGpuMs: gpuTiming.averageMs
  });

  return [
    `Mode ${stats.mode.toUpperCase()} | ${stats.estimatedFps.toFixed(
      1
    )} present fps | rAF ${stats.smoothedFrameMs.toFixed(2)}ms | CPU ${stats.sections.frame.averageMs.toFixed(2)}ms`,
    `Pacing ${framePacing.lastIntervalMs.toFixed(2)}ms last / ${framePacing.longestIntervalMs.toFixed(
      2
    )}ms max in ${(framePacing.windowMs / 1000).toFixed(1)}s | >20ms ${framePacing.framesOver20Ms} / >=30ms ${framePacing.framesOver30Ms}`,
    gpuLine,
    ...(isPresentationLikelyCapped
      ? [
          gpuTiming.averageMs === null
            ? "Presentation appears capped externally; CPU fits a 60 FPS budget."
            : "Presentation cadence is likely capped externally; CPU and GPU fit a 60 FPS budget."
        ]
      : []),
    `Counts draw ${stats.counts.drawCalls} / tris ${stats.counts.triangles} / objects ${stats.counts.sceneObjects} / dpr ${stats.counts.rendererPixelRatio.toFixed(2)} / px ${formatMegapixels(stats.counts.rendererPixels)}`,
    `Visible renderables ${stats.counts.visibleRenderables} / world ${stats.counts.visibleWorldRenderables} / UI bloom ${stats.counts.visibleUiBloomRenderables} / ships ${stats.counts.visibleShipRenderables}`,
    `Entities ships ${stats.counts.ships} / burn ${stats.counts.burnTrajectories} / fire ${stats.counts.fireTrajectories} / labels ${stats.counts.labels}`,
    ...formatPerformanceCounterRateLines(counters),
    ...orderedSections
  ];
}

export function formatPerformanceCounterRateLines(
  counters: PerformanceCounterRateSnapshot
): readonly string[] {
  return [
    `Calls/s warnings ${formatCounterRate(counters.getCommandWarnings)} / recovery ${formatCounterRate(
      counters.evaluateFactionRecoveryPath
    )} / solvency ${formatCounterRate(counters.getAiSolvencyTritiumCountAudits)}`,
    `Calls/s burnPlan ${formatCounterRate(counters.calculateBurnPlan)} / burnFromPos ${formatCounterRate(
      counters.calculateBurnPlanFromPosition
    )} / nodeSync ${formatCounterRate(counters.syncNodePresentation)}`
  ];
}

function formatMegapixels(pixelCount: number): string {
  return `${(pixelCount / 1_000_000).toFixed(2)}M`;
}

function formatCounterRate(value: number): string {
  return value >= 100 ? value.toFixed(0) : value.toFixed(1);
}
