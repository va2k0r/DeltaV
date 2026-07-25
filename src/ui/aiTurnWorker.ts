import {
  advanceTurn,
  createSolarSystemSnapshot,
  type AiPlanningOptions,
  type FactionId,
  type GameState,
  type SimulationContent
} from "../core";
import type { MapPreset } from "../data";
import {
  createAutomaticProceduralMapForSeed,
  type ProceduralBatchMapGeneration
} from "./mapPresetRuntime";
import {
  createVictoryDelayAudit,
  createVictoryAudit,
  createVictoryAuditContradictions,
  detectPostMatchOutcome,
  type PostMatchOutcome,
  type VictoryAudit
} from "./postMatchReport";

export type AiTurnWorkerRequest =
  | Readonly<{
      kind: "advance-turn";
      id: number;
      state: GameState;
      content: SimulationContent;
      automaticMandatoryLaunchFactionIds: readonly FactionId[] | undefined;
      planningOptions: AiPlanningOptions;
    }>
  | Readonly<{
      kind: "generate-map";
      id: number;
      preset: MapPreset;
      requestedSeed: string;
      retrySeeds: readonly string[];
    }>;

export type AiTurnWorkerResponse =
  | Readonly<{
      kind: "advance-turn";
      id: number;
      state: GameState;
      postMatchEvaluation: Readonly<{
        outcome: PostMatchOutcome | null;
        victoryAudit: VictoryAudit;
        victoryContradictions: readonly Readonly<Record<string, unknown>>[];
        victoryDelayAudit: Readonly<Record<string, unknown>> | null;
      }>;
    }>
  | Readonly<{
      kind: "generate-map";
      id: number;
      automaticMap: ProceduralBatchMapGeneration;
    }>
  | Readonly<{
      id: number;
      error: string;
    }>;

const workerScope = globalThis as unknown as Readonly<{
  addEventListener: (
    type: "message",
    listener: (event: MessageEvent<AiTurnWorkerRequest>) => void
  ) => void;
  postMessage: (message: AiTurnWorkerResponse) => void;
}>;

workerScope.addEventListener("message", (event) => {
  const request = event.data;

  try {
    if (request.kind === "advance-turn") {
      const state = advanceTurn(
        request.state,
        request.content,
        request.automaticMandatoryLaunchFactionIds,
        request.planningOptions
      );
      const snapshot = createSolarSystemSnapshot(request.content, state);
      const outcome = detectPostMatchOutcome(request.content, state, snapshot);
      const victoryAudit = createVictoryAudit(request.content, state, snapshot, outcome);
      workerScope.postMessage({
        kind: "advance-turn",
        id: request.id,
        state,
        postMatchEvaluation: {
          outcome,
          victoryAudit,
          victoryDelayAudit: createVictoryDelayAudit(request.content, state, snapshot),
          victoryContradictions:
            outcome === null
              ? []
              : createVictoryAuditContradictions(
                  request.content,
                  state,
                  snapshot,
                  outcome,
                  victoryAudit
                )
        }
      });
      return;
    }

    let retrySeedIndex = 0;
    workerScope.postMessage({
      kind: "generate-map",
      id: request.id,
      automaticMap: createAutomaticProceduralMapForSeed(
        request.preset,
        request.requestedSeed,
        () => request.retrySeeds[retrySeedIndex++] ?? `${request.requestedSeed}-retry`
      )
    });
  } catch (error) {
    workerScope.postMessage({
      id: request.id,
      error: error instanceof Error ? error.message : String(error)
    });
  }
});
