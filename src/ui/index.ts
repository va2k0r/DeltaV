import {
  advanceTurn as advanceSimulationTurn,
  applyCommand,
  calculateBurnPlan,
  calculateFirePlan,
  computeBodyPosition,
  createMapGameplayHash,
  createEvadeTMinusOneDebugScenario,
  createInitialGameState,
  createMissileImpactTMinusOneDebugScenario,
  createPlayerFacingResolutionEvents,
  createSolarSystemSnapshot,
  createTrailerCaptureTimeline,
  createVictoryResolutionEvent,
  dumpTurnState,
  evaluateFactionRecoveryPath,
  flushSimulationPerformanceCounters,
  getActiveFactions,
  getFactionDv,
  getFactionIdentity,
  getProjectedFactionDv,
  runAIVsAIDiagnostics40T,
  runAiVsAiDebugSimulation,
  runFireVsAiDebugSimulation,
  setSimulationPerformanceCountersEnabled,
  type ActiveBurnTransit,
  type BurnPlan,
  type FactionRecoveryPath,
  type FirePlan,
  type AiPlanningLevel,
  type AiPlanningOptions,
  type AiStrategyProfile,
  type FactionId,
  type FactionIdentity,
  type GameModeId,
  type GameState,
  type PendingFireOrder,
  type ResolutionCue,
  type ResolutionEvent,
  type SolarSystemSnapshot,
  type TurnDebugEvent,
  type TurnDebugEventType,
  type TrailerCaptureScene,
  type TrailerCaptureTimeline,
  type Vec2
} from "../core";
import {
  DEFAULT_MAP_PRESET_ID,
  MAP_PRESETS,
  TRAILER_CAPTURE_MAP_PRESET_ID,
  createProceduralMapSeed,
  formatProceduralMapDebug,
  getMapPreset,
  getProceduralInitialOccupanciesForMode,
  type MapPreset,
  type MapPresetId,
  type ProceduralMapDebug,
  type ProceduralMapGeneration,
  type SolarSystemData
} from "../data";
import {
  CinematicSolarSystemRenderer,
  contestedUpkeepImpactVisualProgress,
  defaultCinematic3dVisualTuning,
  getNodeIdFromTargetKey,
  missileImpactVisualProgress,
  replayBurnArrivalVisualProgress,
  replayMandatoryLaunchVisualProgress,
  replayMissileDefenseVisualProgress,
  replayOrderLaunchVisualProgress,
  replayWorkVisualProgress,
  type CinematicInputGesture,
  type CinematicPerformanceMode,
  type CinematicPerformanceStats,
  type CinematicSelection,
  type CinematicTrajectoryReflectionMode,
  type ShipModelVariant,
  type CinematicTutorialAttentionPulse,
  type CinematicVisualPulse
} from "../renderers/cinematic3d";
import { renderTacticalMap2d } from "../renderers/tactical2d";
import { getBeatSynchronizedCycle } from "../shared/presentationBeat";
import type { AiTurnWorkerRequest, AiTurnWorkerResponse } from "./aiTurnWorker";
import {
  createCameraState,
  fitBoundsToViewport,
  panCameraByScreenDelta,
  zoomTowardScreenPoint,
  type ViewportSize
} from "./input/camera";
import { findFocusPosition, findNearestSnapshotTarget } from "./input/snapshotTargeting";
import { DeltaVMusicEngine } from "./audio";
import { DeltaVSfxEngine, type DeltaVSfxKey } from "./sfx";
import {
  createDebugModeButton,
  createOption,
  populateFocusSelect,
  resizeCanvasToDisplaySize
} from "./domControls";
import { factionColorPalette } from "./factionColors";
import { createFactionDvForIdentities, createRandomFactionIdentities } from "./factionIdentities";
import {
  displayBrightnessStep,
  formatDisplayBrightnessLabel,
  maximumDisplayBrightness,
  minimumDisplayBrightness,
  normalizeDisplayBrightness,
  parseStoredDisplayBrightness
} from "./displayBrightness";
import { resolveInitialNodeId } from "./initialSetupAliases";
import { shiftSolarSystemOrbitPhase } from "./gameMenuOrbitContinuity";
import {
  createBrowserPerformanceCounterRecord,
  createPerformanceCounterRateRecord,
  formatCinematicPerformanceDebugLines,
  type BrowserPerformanceCounterName
} from "./performanceDiagnostics";
import {
  createCommandConsoleTextParts,
  formatDvForConsole,
  formatTurnForConsole,
  getCommandFactionClass
} from "./commandConsoleFormatting";
import {
  applyGameGlossaryTokenSemantics,
  createGameGlossaryController,
  createGameGlossaryTextSpans,
  gameMenuGlossaryHoverDwellMs,
  tutorialLogbookOpenInstruction,
  type GameGlossaryLineContext
} from "./gameGlossaryController";
import { createPlayerFacingResolutionRows } from "./resolutionCommandRows";
import {
  createReplayEntries,
  shouldRecordReplayDebugEvent,
  type ReplayEntry,
  type ReplayTape,
  type ReplayTransition
} from "./replayTimeline";
import {
  fixedTimelineReviewReplayTurnDurationMs,
  getAcceleratedTimelineReviewDurationMs,
  getFixedTimelineReviewDurationMs,
  sampleAcceleratedTimelineReviewPosition,
  sampleFixedTimelineReviewPosition
} from "./replayPacing";
import { normalizeCommandLogWheelDelta } from "./commandLogScroll";
import { createDeferredFrameRefresh } from "./deferredFrameRefresh";
import { shiftPlanningTimerDeadlinesAfterPause } from "./planningTimerPause";
import {
  countRemainingShips,
  createMapOutcomeAudit,
  createPostMatchReport,
  createVictoryAudit,
  createVictoryAuditContradictions,
  createVictoryDelayAudit,
  detectPostMatchOutcome,
  formatFactionName,
  formatNodeName,
  type MapOutcomeAudit,
  type PostMatchOutcome,
  type VictoryAudit
} from "./postMatchReport";
import {
  createAutomaticProceduralMapForSeed,
  createInitialStateForPreset,
  getPresetCacheKey,
  getProceduralDebugForPreset,
  getProceduralGeneration,
  getProceduralGenerationCacheKeyForPreset,
  loadMapPresetContent,
  normalizeProceduralSeedForUi,
  type AutomaticProceduralMapGenerationAudit,
  type ProceduralBatchMapGeneration
} from "./mapPresetRuntime";
import { copyTextToClipboard, formatDebugRecord, stableStringify } from "./textUtils";
import {
  DeltaVDebugRecorder,
  formatDebugRecordingElapsed,
  stopMediaStream,
  type DeltaVDebugRecordingAudioSource
} from "./recording";
import { buildDiagnosticGameStateDump } from "./diagnostics";
import { deltaVExternalLinks } from "../site/externalLinks";
import {
  applyTutorialCameraHintDisplayLimits,
  removeTutorialCameraHintRows
} from "./tutorial/cameraHintDisplay";
import { shouldPanTutorialTarget } from "./tutorial/cameraPolicy";
import { findFirstTutorialEnemyKillResolutionEvent } from "./tutorial/firstEnemyKillReplay";
import { ensureTutorialOpponentFactionState } from "./tutorial/opponentFaction";
import { isTutorialSupportProductionDestinationAllowed } from "./tutorial/productiveBurnDestination";
import {
  getTutorialRequiredShipSelectionRecoveryTargetKey,
  isTutorialTargetInputAllowed
} from "./tutorial/selectionGate";
import { isCinematicGameplayInteractionLocked } from "./input/interactionLock";
import {
  createTutorialRuntimeDiagnosticDump,
  createTutorialRuntimeState,
  driveTutorialBurnToDestination,
  findTrackedTutorialFirstBurn,
  findTrackedTutorialMandatoryLaunchBurn,
  findTutorialQueuedFireOrder,
  getTutorialMandatoryLaunchResumePhase,
  recoverTutorialQueuedFireLessonAfterCancellation,
  shouldInterruptTutorialForMandatoryLaunch,
  shouldRestoreTutorialAutoAdvanceLock,
  type TutorialPhase,
  type TutorialRuntimeState,
  type TutorialTritiumLessonContinuation
} from "./tutorial/runtimeState";
import { getTutorialAiPlanningFactionIds } from "./tutorial/turnControl";
import {
  createTutorialConfirmBurnLiveRows,
  createTutorialEnterFireModeLiveRows,
  createTutorialEnemyContactVictoryRows,
  createTutorialConfirmFiringSolutionLiveRows,
  createTutorialConfirmTransferBurnLiveRows,
  createTutorialFirstBurnCostRows,
  createTutorialFirstBurnTimeCostRows,
  createTutorialMandatoryLaunchRows,
  createTutorialOpeningYearTimelineRows,
  createTutorialOpeningCameraControlLiveRows,
  createTutorialLogbookIntroductionLiveRow,
  createTutorialOverlayLiveHintRow,
  createTutorialPostVictoryActionRows,
  createTutorialPostVictoryAutomaticBehaviorRows,
  createTutorialSpacerRow,
  createTutorialSelectShipLiveRows,
  createTutorialShipyardContestedRuleRows,
  createTutorialShipyardFirePromptRows,
  createTutorialShipyardFireWorkChoiceRows,
  createTutorialShipyardProductionRows,
  expandTutorialSentenceRows,
  freezeTutorialLiveHintClassName,
  getTutorialDelayedLiveHintClassName,
  isTutorialInputHint,
  type TutorialCommandTimelineRow,
  tutorialLiveHintClassName
} from "./tutorial/commandRows";
import {
  mandatoryLaunchGuidanceDelayMs,
  tutorialCameraControlsHintMinimumGapMs,
  tutorialCameraControlsHintRetryDelayMs,
  tutorialCameraControlsIdleHintDelayMs,
  tutorialCameraGuidancePaused,
  tutorialCameraFocusHintText,
  tutorialCameraOrbitHintText,
  tutorialCameraPanOrbitHintDelayMs,
  tutorialCameraPanOrbitHintText,
  tutorialCameraPanHintText,
  tutorialCameraZoomHintDelayMs,
  tutorialCameraZoomHintText,
  tutorialConfirmCameraPanOrbitHintText,
  tutorialDefensiveEnemyAssaultNodeId,
  tutorialDefensiveEnemyFireNodeId,
  tutorialEnemyFireNodeId,
  tutorialEvadeDvCost,
  tutorialFallbackShipyardNodeId,
  tutorialFirstBurnConfusionDelayMs,
  tutorialFirstTritiumArrivalCameraPose,
  tutorialOpeningCameraPose,
  tutorialOpeningOriginNodeId,
  tutorialOverlayGuidanceDelayMs,
  tutorialProductiveShipyardHintDelayMs,
  tutorialProductiveShipyardHintIntensityFloor,
  tutorialProductiveShipyardHintPulseSeconds,
  tutorialShipyardArrivalCameraPose
} from "./tutorial/constants";
import {
  ONE_PLAYER_INITIAL_OCCUPANCIES,
  STARTING_SETUP,
  THREE_PLAYER_STARTING_SETUP,
  THREE_PLAYER_INITIAL_OCCUPANCIES
} from "../shared/startingSetup";

type PresentationView = "cinematic3d" | "tactical2d";
type MultiFactionGameModeId = Extract<GameModeId, "2p" | "3p">;
type StartStateControllerType = StartStateAuditDeclaration["controllerType"];
type StartStateAuditOptions = Readonly<{
  controllerOverrides?: Partial<Record<FactionId, StartStateControllerType>>;
  proceduralDebug?: ProceduralMapDebug | null;
}>;

const cinematicTrajectoryReflectionModeStorageKey = "deltavTrajectoryReflectionMode";
const displayBrightnessStorageKey = "deltav.displayBrightness.v1";
const fpsCounterSampleWindowMs = 300;
const fpsCounterSmoothing = 0.35;
const fpsCounterPacingWindowMs = 12_000;
const fpsCounterPauseIgnoreMs = 240;

type CinematicCameraState = ReturnType<CinematicSolarSystemRenderer["captureCameraState"]>;

type CommandLogTimeReviewState = {
  eventId: string | null;
  activeCommandRowKey: string | null;
  transitionIndex: number;
  currentPosition: number;
  focusTargetKeys: readonly string[];
  followTrackedFocus: boolean;
  liveState: GameState;
  liveSnapshot: SolarSystemSnapshot;
  liveSelectedTargetKey: string | null;
  liveLockedMandatoryLaunchId: string | null;
  liveCurrentView: PresentationView;
  liveHash: string;
  liveCameraState: CinematicCameraState;
  staticFocusTargetSignature: string | null;
};

type CommandLogTimeReviewRestoreOptions = Readonly<{
  preserveCurrentCamera?: boolean;
  preserveCurrentFocusTracking?: boolean;
}>;

type CommandLogReviewPacing = "standard" | "accelerated";

type CommandLogReviewPlaybackOptions = Readonly<{
  preserveCurrentFocus?: boolean;
  pacing?: CommandLogReviewPacing;
}>;

type CommandLogReviewNavigationOptions = Readonly<{
  preserveCurrentCameraAndFocus?: boolean;
}>;

type CommandLogReviewPositionOptions = Readonly<{
  deferRender?: boolean;
  includePresentationEffects?: boolean;
}>;

type CommandLogScrubState = {
  pointerId: number;
  captureElement: HTMLElement;
  startY: number;
  lastY: number;
  isArmed: boolean;
  hasScrubbed: boolean;
  startPosition: number;
  startedReviewFromLive: boolean;
  didChangePosition: boolean;
  longPressTimer: number | null;
  line: HTMLElement | null;
};

type StartStateAuditDeclaration = Readonly<{
  factionId: FactionId;
  controllerType: "human" | "ai" | "idle";
  tritium?: string;
  shipyard?: string;
  staging?: string;
  startingShips: readonly GameState["nodeOccupancies"][number][];
}>;

type MatchTerminationReason =
  | "strategic-victory"
  | "draw"
  | "manual-stop"
  | "turn-cap"
  | "debug-export"
  | "runtime-error";

type MatchLogSaveResponse =
  | Readonly<{
      ok: true;
      path: string;
    }>
  | Readonly<{
      ok: false;
      error?: string;
    }>;

type FactionCounts = Record<string, number>;

type CompactMatchLogDebugEvent = Readonly<{
  turn: number;
  type: TurnDebugEventType;
  message: string;
  factionId?: FactionId | undefined;
  nodeId?: string | undefined;
  originNodeId?: string | undefined;
  destinationNodeId?: string | undefined;
  targetNodeId?: string | undefined;
  targetFactionId?: FactionId | undefined;
  amount?: number | undefined;
  burnCost?: number | undefined;
  etaTurns?: number | undefined;
  missileEtaTurns?: number | undefined;
  reason?: string | undefined;
}>;

type CompactMatchLogPayload = Readonly<{
  label: "DeltaV Compact Match Log";
  version: 3;
  savedAt: string;
  gameMode: GameModeId;
  mapPreset: string;
  proceduralSeed: string | null;
  requestedSeed: string | null;
  effectiveMapSeed: string | null;
  mapGameplayHash: string;
  automaticProceduralGeneration: AutomaticProceduralMapGenerationAudit | null;
  turn: number;
  terminationReason: MatchTerminationReason;
  winner: FactionId | null;
  controllers: readonly Readonly<{
    id: FactionId;
    name: string;
    controlType: FactionIdentity["controlType"];
  }>[];
  factionDv: FactionCounts;
  stateHash: string;
  postMatchReport: string | null;
  victoryAudit: VictoryAudit | null;
  mapOutcomeAudit: MapOutcomeAudit | null;
  finalStateSummary: Readonly<Record<string, unknown>>;
  replaySummary: Readonly<Record<string, unknown>>;
  commandScrollbackRecent: readonly CommandScrollbackRow[];
  debugEventSummary: Readonly<{
    total: number;
    byType: Readonly<Record<string, number>>;
    byFaction: Readonly<Record<string, number>>;
    recentImportant: readonly CompactMatchLogDebugEvent[];
  }>;
}>;

type CommandConsolePart = Readonly<{
  text?: string;
  className?: string | undefined;
  element?: Node;
}>;

type CommandTimelineEntryKind = "commandSnapshot" | "resolutionEvent" | "victory" | "tutorial";
type CommandInputHintsMode = "on" | "off";
type TutorialOverlayMode = "on" | "off";

type CommandConsoleRowMetadata = Readonly<{
  entryId?: string | undefined;
  eventId?: string | undefined;
  kind?: CommandTimelineEntryKind | "live" | undefined;
  turn?: number | undefined;
  rowIndex?: number | undefined;
  rowKey?: string | undefined;
  glossaryContext?: GameGlossaryLineContext | undefined;
}>;

type CommandScrollbackRow = Readonly<{
  entryId: string;
  kind: CommandTimelineEntryKind;
  turn: number;
  rowIndex: number;
  eventId?: string | undefined;
  replayEntryIds: readonly string[];
  cue?: ResolutionCue | undefined;
}>;

type CommandConsoleRow = Readonly<{
  parts: readonly CommandConsolePart[];
  className?: string;
  key?: string;
  glossaryContext?: GameGlossaryLineContext;
  metadata?: CommandConsoleRowMetadata | undefined;
}>;

type CommandConsoleAppendOptions = Readonly<{
  typewriter: boolean;
  typewriteAllNonSpacerRows?: boolean;
}>;

type CommandTimelinePart =
  | Readonly<{
      text: string;
      className?: string | undefined;
    }>
  | Readonly<{
      dvBars: Readonly<{
        factionId: FactionId;
        values: readonly number[];
      }>;
    }>;

type CommandTimelineRow = Readonly<{
  parts: readonly CommandTimelinePart[];
  className?: string;
  key?: string;
  glossaryContext?: GameGlossaryLineContext;
}>;

type LiveCommandTimelineRowsOptions = Readonly<{
  includeTutorialHints?: boolean;
}>;

type CommandSnapshotOrder = Readonly<
  | {
      type: "BURN";
      id: string;
      factionId: FactionId;
      originNodeId: string;
      destinationNodeId: string;
      etaTurns: number;
      cost: number;
    }
  | {
      type: "FIRE";
      id: string;
      factionId: FactionId;
      originNodeId: string;
      targetNodeId: string;
      etaTurns: number;
    }
>;

type CommandTimelineEntry =
  | Readonly<{
      kind: "commandSnapshot";
      id: string;
      turn: number;
      frozenAt: number;
      rows: readonly CommandTimelineRow[];
      projectedDv: FactionCounts;
      warnings: readonly CommandWarning[];
      orders: readonly CommandSnapshotOrder[];
    }>
  | Readonly<{
      kind: "resolutionEvent";
      id: string;
      turn: number;
      event: ResolutionEvent;
    }>
  | Readonly<{
      kind: "victory";
      id: string;
      turn: number;
      event: ResolutionEvent;
    }>
  | Readonly<{
      kind: "tutorial";
      id: string;
      turn: number;
      rows: readonly CommandTimelineRow[];
    }>;

type ExecutePromptMode = "execute" | "launch" | "countdown" | "crew-lost";
type PlanningTimerMode = "auto" | "two" | "ten" | "twenty" | "zero";
type PlanningTimerPhase = "disabled" | "planning" | "executeCountdown" | "resolving";
type PlanningTimerAuthority = "server" | "local";
type GameMenuScreen = "main" | "new-game" | "options" | "quit";
type GameMenuActionTone = "bright" | "regular" | "soft" | "dim";
type GameMenuAccentsMode = "on" | "burn" | "fire" | "off";
type GameMenuNewGameMode = "2-factions" | "3-factions" | "ai-vs-ai" | "ai-vs-ai-vs-ai";
type GameMenuTypingTarget = Readonly<{
  element: HTMLElement;
  text: string;
}>;

const gameMenuOpeningCameraPose = {
  // Canonical DeltaV banner: a detached top-down composition where planets
  // cross the frame beneath the menu instead of being tracked by the camera.
  focus: [652.9258901215434, 0, 366.4386699181108],
  yaw: 6.141398437499985,
  pitch: 1.5707963267948966,
  distance: 1812.3634761265382,
  focusedTargetKey: null,
  trackedFocusTargetKey: null,
  displayScaleFocusTargetKey: "node:mercury_node",
  displayScaleDistance: 2535.4735630035007
} as const;
const trailerScreenOpeningCameraPose = {
  // Keep the Sun on the left visual third and reserve the quieter right half
  // for the stacked trailer title.
  focus: [698, 0, 430],
  yaw: 6.141398437499985,
  pitch: 1.5707963267948966,
  distance: 1740,
  focusedTargetKey: null,
  trackedFocusTargetKey: null,
  displayScaleFocusTargetKey: "node:mercury_node",
  displayScaleDistance: 2434
} as const;
const gameMenuCanonicalProceduralSeed = "proc-ms4v3wlj-0puste0";
const gameMenuCanonicalOpeningOrbitTurn = 76;

type PlanningTimerState = {
  phase: PlanningTimerPhase;
  turn: number;
  deadlineAtMs: number;
  executeCountdownEndsAtMs: number;
  authority: PlanningTimerAuthority;
  lockedFactionIds: Set<FactionId>;
};

type MultiplayerPlanningClockDetail = Readonly<{
  turn: number;
  deadlineEpochMs?: number;
  serverNowEpochMs?: number;
  lockedFactionIds?: readonly FactionId[];
  phase?: Exclude<PlanningTimerPhase, "disabled">;
}>;

type CommandConsoleLineElement = HTMLDivElement & {
  startTypewriter?: () => Promise<void>;
  typewriterDone?: Promise<void>;
};

type CommandWarning = Readonly<{
  nodeId: string;
  event: "LAUNCH" | "UPKEEP" | "EVADE" | "IMPACT" | "CONTESTED";
  detail: string;
  factionId?: FactionId;
  eventTurn?: number;
  currentDv?: number;
  projectedDvAtEvent?: number;
  guaranteedIncomeBeforeEvent?: number;
  committedCostsBeforeEvent?: number;
  projectionStatus?: "safe" | "unsafe";
  reason?: string;
}>;

type WarningLevel = "warning" | "critical";

type CommandWarningSnapshot = Readonly<{
  sourceContent: SolarSystemData;
  sourceState: GameState;
  sourceSnapshot: SolarSystemSnapshot;
  projectedDv: FactionCounts;
  warnings: readonly CommandWarning[];
  nodeWarningLevels: ReadonlyMap<string, WarningLevel>;
}>;

type TutorialGuidanceAttentionTarget = Readonly<{
  targetKey: string;
  candidateTargetKeys?: readonly string[];
  pulseCandidateTargets?: boolean;
  colorRole?: "burn-preview";
  nodeBlinkMode?: "on-off";
  intensityFloor?: number;
  secondsPerPulse?: number;
  fallbackStartedAt: number;
}>;

type TutorialRequiredShipSelection = Readonly<{
  nodeId: string;
  startedAt: number | null;
  liveHintKey: string;
}>;

type TutorialRequiredFireMode = Readonly<{
  nodeId: string;
  startedAt: number | null;
  liveHintKey: string;
}>;

const executePromptAttentionDelayMs = 3600;
const planningTimerDurationMs = 90_000;
const planningTimerShortExecuteCountdownMs = 2_000;
const planningTimerExecuteCountdownMs = 10_000;
const planningTimerLongExecuteCountdownMs = 20_000;
const planningTimerWarningMs = 10_000;
const zeroTimerAutoRestartDelayMs = 450;
const trailerModePlanningTimerLabel = "9:99";
const trailerModePlanningTimerDurationMs = (9 * 60 + 99) * 1_000;
// Zero removes planning downtime; it must not turn the match into an unreadable fast-forward.
// Keep a fixed presentation slot so turn interpolation and transient effects can complete smoothly.
const zeroTimerMinimumTurnPresentationMs = 2_000;
const postMatchAutoReturnDelayMs = 10_000;
const gameMenuDemoTurnDelayMs = 2_000;
const gameMenuDemoRestartDelayMs = 360;
const gameMenuCrtFlickerMinDelayMs = 1_200;
const gameMenuCrtFlickerMaxDelayMs = 3_400;
const gameMenuCrtFlickerMinDurationMs = 140;
const gameMenuCrtFlickerMaxDurationMs = 300;
const aiAutorunCommandTranscriptDomEntryLimit = 72;
const commandTypewriterMsPerCharacter = 6;
const commandTypewriterMinDurationMs = 80;
const commandTypewriterMaxDurationMs = 520;
const guidancePulseSeconds = 0.75;
const burnConfirmGuidancePulseSeconds = 0.42;
const burnConfirmGuidanceIntensityFloor = 0.38;
const guidancePulseAttackRatio = 0.085;
const guidancePulseDecayRatio = 0.56;
const executeQuestionBlinkLitPhase = 0.54;
const executeQuestionBlinkLitOpacity = 0.86;
const executeQuestionBlinkDimOpacity = 0.24;
const beatSynchronizedCssCycles = [
  {
    durationProperty: "--beat-fire-marker-duration",
    phaseProperty: "--beat-fire-marker-phase",
    baseDurationMs: 1160
  },
  {
    durationProperty: "--beat-tutorial-replay-duration",
    phaseProperty: "--beat-tutorial-replay-phase",
    baseDurationMs: 1400
  },
  {
    durationProperty: "--beat-command-warning-duration",
    phaseProperty: "--beat-command-warning-phase",
    baseDurationMs: 820
  },
  {
    durationProperty: "--beat-planning-execute-duration",
    phaseProperty: "--beat-planning-execute-phase",
    baseDurationMs: 760
  },
  {
    durationProperty: "--beat-tutorial-hint-duration",
    phaseProperty: "--beat-tutorial-hint-phase",
    baseDurationMs: 1050
  },
  {
    durationProperty: "--beat-command-cursor-duration",
    phaseProperty: "--beat-command-cursor-phase",
    baseDurationMs: 620
  },
  {
    durationProperty: "--beat-execute-launch-duration",
    phaseProperty: "--beat-execute-launch-phase",
    baseDurationMs: 720
  }
] as const;
// Presentation can keep animating, but it must never hold the next planning phase for long.
const turnResolutionPresentationMaxMs = 1600;
const turnTransitionWatchdogGraceMs = 180;
const turnTransitionWatchdogMaxMs = turnResolutionPresentationMaxMs;

export async function createDeltaVApp(root: HTMLElement): Promise<void> {
  root.innerHTML = "";
  const urlSearchParams = new URLSearchParams(window.location.search);
  const isTutorialRequested =
    urlSearchParams.get("tutorial") === "1" || urlSearchParams.get("tutorial") === "true";
  const isDebugUiEnabled = urlSearchParams.get("debug") === "1";
  const isTrailerCaptureRequested =
    urlSearchParams.get("trailer") === "1" ||
    urlSearchParams.get("trailer") === "true" ||
    urlSearchParams.get("mode") === "trailer";
  const requestedTrailerScreen = urlSearchParams.get("screen");
  const isTrailerScreenRequested = requestedTrailerScreen === "trailer";
  const isTrailerCtaScreenRequested = requestedTrailerScreen === "cta";

  const shell = document.createElement("section");
  shell.className = "app-shell";

  const header = document.createElement("header");
  header.className = "debug-drawer is-hidden";
  header.id = "debug-drawer";

  const debugToggleButton = document.createElement("button");
  debugToggleButton.type = "button";
  debugToggleButton.className = "debug-toggle";
  debugToggleButton.textContent = "DEBUG";
  debugToggleButton.setAttribute("aria-controls", header.id);
  debugToggleButton.setAttribute("aria-expanded", "false");

  const titleGroup = document.createElement("div");
  titleGroup.className = "title-group";

  const title = document.createElement("h1");
  title.className = "app-title";
  title.textContent = "ΔV";

  const status = document.createElement("p");
  status.className = "app-status";
  status.textContent = "Loading Solar System data";

  titleGroup.append(title, status);

  const controls = document.createElement("div");
  controls.className = "map-controls debug-controls";

  const musicEngine = new DeltaVMusicEngine();
  const isMusicTemporarilyUnavailable = false;
  let isMusicEnabled = true;
  const sfxEngine = new DeltaVSfxEngine();

  const nextTurnButton = document.createElement("button");
  nextTurnButton.type = "button";
  nextTurnButton.textContent = "Next Turn";

  const replayButton = document.createElement("button");
  replayButton.type = "button";
  replayButton.textContent = "Replay";
  replayButton.disabled = true;

  const fitButton = document.createElement("button");
  fitButton.type = "button";
  fitButton.textContent = "Fit System";

  const musicButton = document.createElement("button");
  musicButton.type = "button";
  musicButton.className = "music-button";
  musicButton.textContent = "Music On";
  musicButton.setAttribute("aria-pressed", "true");
  let musicAutoplayUnlockHandler: ((event: Event) => void) | null = null;

  const sfxButton = document.createElement("button");
  sfxButton.type = "button";
  sfxButton.className = "sfx-button";
  sfxButton.textContent = "SFX Off";
  sfxButton.setAttribute("aria-pressed", "false");
  let sfxAutoplayUnlockHandler: ((event: Event) => void) | null = null;

  const mapSelect = document.createElement("select");
  mapSelect.ariaLabel = "Map preset";
  mapSelect.autocomplete = "off";
  for (const preset of MAP_PRESETS) {
    mapSelect.append(createOption(preset.id, preset.label));
  }

  const proceduralSeedInput = document.createElement("input");
  proceduralSeedInput.type = "text";
  proceduralSeedInput.className = "seed-input";
  proceduralSeedInput.ariaLabel = "Procedural map seed";
  proceduralSeedInput.autocomplete = "off";
  proceduralSeedInput.spellcheck = false;

  const proceduralSeedButton = document.createElement("button");
  proceduralSeedButton.type = "button";
  proceduralSeedButton.textContent = "New Seed";

  const viewSelect = document.createElement("select");
  viewSelect.ariaLabel = "Presentation view";
  viewSelect.autocomplete = "off";
  viewSelect.append(createOption("cinematic3d", "3D Planetarium"));
  viewSelect.append(createOption("tactical2d", "2D Tactical"));

  const shipModelSelect = document.createElement("select");
  shipModelSelect.ariaLabel = "Ship model";
  shipModelSelect.autocomplete = "off";
  shipModelSelect.append(createOption("double-cylinder", "Ship Model · Twin Cyl"));
  shipModelSelect.append(createOption("hex-modular", "Ship Model · Hex Stack"));
  shipModelSelect.append(createOption("ring-hex", "Ship Model · Ring Hex"));
  shipModelSelect.append(createOption("legacy", "Ship Model · Legacy"));
  shipModelSelect.value = "ring-hex";

  const focusSelect = document.createElement("select");
  focusSelect.ariaLabel = "Focus body or orbit";
  focusSelect.autocomplete = "off";

  const aiVsAiButton = document.createElement("button");
  aiVsAiButton.type = "button";
  aiVsAiButton.className = "debug-button";
  aiVsAiButton.textContent = "AI vs AI 40T";

  const aiDiagnosticsButton = document.createElement("button");
  aiDiagnosticsButton.type = "button";
  aiDiagnosticsButton.className = "debug-button";
  aiDiagnosticsButton.textContent = "AI Dx 40T";

  const onePlayerModeButton = createDebugModeButton("1 PLAYER");
  const twoPlayerModeButton = createDebugModeButton("2 PLAYERS");
  const threePlayerModeButton = createDebugModeButton("3 PLAYERS");
  const gameMenuModeButton = createDebugModeButton("GAME MENU");
  const beautyModeButton = createDebugModeButton("BEAUTY MODE");
  const trailerScreenButton = createDebugModeButton("TRAILER SCREEN");
  const trailerCtaScreenButton = createDebugModeButton("CTA SCREEN");
  const trailerModeButton = createDebugModeButton("TRAILER MODE");
  const trailerCaptureButton = createDebugModeButton("PLAY TRAILER");
  const aiVsAiModeButton = createDebugModeButton("AIvsAI");
  const aiVsAiVsAiModeButton = createDebugModeButton("AIvsAIvsAI");
  const fireVsAiModeButton = createDebugModeButton("FIREvsAI");
  const missileImpactTestButton = createDebugModeButton("MISSILE T-1");
  const evadeTestButton = createDebugModeButton("EVADE");
  const commandInputHintsButton = createDebugModeButton("HINTS OFF");
  const planningTimerButton = createDebugModeButton("TIMER AUTO");
  const beatSyncButton = createDebugModeButton("BEAT ON");
  const performanceDiagnosticsButton = createDebugModeButton("PERF OFF");
  const burnPreviewEffectsButton = createDebugModeButton("BURN FX ON");
  const firePreviewEffectsButton = createDebugModeButton("FIRE FX ON");
  const solarHazeButton = createDebugModeButton("SOLAR HAZE OFF");
  const solarOcclusionButton = createDebugModeButton("OCCLUSION ON");
  const atmosphericScatteringButton = createDebugModeButton("ATMOSPHERE ON");
  const compactSunBloomButton = createDebugModeButton("SUN PASS ON");
  const uiBloomButton = createDebugModeButton("UI BLOOM ON");
  const lowBloomProfileButton = createDebugModeButton("BLOOM LOW");
  const heatDistortionButton = createDebugModeButton("HEAT DISTORT ON");
  const aiLevelSelect = document.createElement("select");
  aiLevelSelect.ariaLabel = "AI level";
  aiLevelSelect.autocomplete = "off";
  aiLevelSelect.append(createOption("0", "AI LEVEL 0 · DEBUG"));
  aiLevelSelect.append(createOption("1", "AI LEVEL 1 · SIMPLE"));
  aiLevelSelect.append(createOption("2", "AI LEVEL 2 · RESERVED"));
  aiLevelSelect.append(createOption("3", "AI LEVEL 3 · CURRENT"));
  aiLevelSelect.value = "0";
  const tutorialOverlayTextButton = createDebugModeButton("TUTORIAL TEXT OFF");
  const tutorialOverlayBlinkButton = createDebugModeButton("CONTEXT BLINK OFF");
  const recordButton = createDebugModeButton("RECORD");

  const copyAiReportButton = document.createElement("button");
  copyAiReportButton.type = "button";
  copyAiReportButton.className = "debug-button";
  copyAiReportButton.textContent = "Copy AI Report";
  copyAiReportButton.disabled = true;

  const copyFunctionalDebugButton = document.createElement("button");
  copyFunctionalDebugButton.type = "button";
  copyFunctionalDebugButton.className = "debug-button";
  copyFunctionalDebugButton.textContent = "Copy Functional Debug Log";

  const copyGameStateDumpButton = document.createElement("button");
  copyGameStateDumpButton.type = "button";
  copyGameStateDumpButton.className = "debug-button";
  copyGameStateDumpButton.textContent = "Copy GameState Dump";

  const copyCameraDebugButton = document.createElement("button");
  copyCameraDebugButton.type = "button";
  copyCameraDebugButton.className = "debug-button";
  copyCameraDebugButton.textContent = "Copy Camera Pose";

  controls.append(
    nextTurnButton,
    replayButton,
    fitButton,
    musicButton,
    sfxButton,
    mapSelect,
    proceduralSeedInput,
    proceduralSeedButton,
    viewSelect,
    shipModelSelect,
    focusSelect,
    onePlayerModeButton,
    twoPlayerModeButton,
    threePlayerModeButton,
    gameMenuModeButton,
    beautyModeButton,
    trailerScreenButton,
    trailerCtaScreenButton,
    trailerModeButton,
    trailerCaptureButton,
    aiVsAiModeButton,
    aiVsAiVsAiModeButton,
    fireVsAiModeButton,
    missileImpactTestButton,
    evadeTestButton,
    commandInputHintsButton,
    planningTimerButton,
    beatSyncButton,
    performanceDiagnosticsButton,
    burnPreviewEffectsButton,
    firePreviewEffectsButton,
    solarHazeButton,
    solarOcclusionButton,
    atmosphericScatteringButton,
    compactSunBloomButton,
    uiBloomButton,
    lowBloomProfileButton,
    heatDistortionButton,
    aiLevelSelect,
    tutorialOverlayTextButton,
    tutorialOverlayBlinkButton,
    recordButton,
    aiVsAiButton,
    aiDiagnosticsButton,
    copyAiReportButton,
    copyFunctionalDebugButton,
    copyGameStateDumpButton,
    copyCameraDebugButton
  );
  const canvasFrame = document.createElement("section");
  canvasFrame.className = "canvas-frame";

  const cinematicFrame = document.createElement("div");
  cinematicFrame.className = "cinematic-frame";

  const tacticalCanvas = document.createElement("canvas");
  tacticalCanvas.className = "tactical-map is-hidden";

  const debugPanel = document.createElement("pre");
  debugPanel.className = "debug-panel";
  const debugPanelDynamic = document.createElement("span");
  const debugPanelProcedural = document.createElement("span");
  debugPanel.append(debugPanelDynamic, debugPanelProcedural);
  let debugPanelProceduralSource: ProceduralMapDebug | null = null;
  let debugPanelProceduralMode: GameModeId | null = null;
  let debugPanelProceduralIsCompact = false;

  const debugRecordingIndicator = document.createElement("div");
  debugRecordingIndicator.className = "debug-recording-indicator is-hidden";

  const debugFps = document.createElement("output");
  debugFps.className = "debug-fps";
  debugFps.ariaLabel = "Frames per second";
  debugFps.textContent = "FPS sampling…";

  const aiReport = document.createElement("textarea");
  aiReport.className = "ai-report is-hidden";
  aiReport.readOnly = true;
  aiReport.spellcheck = false;
  aiReport.ariaLabel = "AI vs AI debug report";

  header.append(titleGroup, controls, debugFps, debugRecordingIndicator, debugPanel, aiReport);

  const commandConsole = document.createElement("section");
  commandConsole.className = "command-console";

  const commandModeLabel = document.createElement("div");
  commandModeLabel.className = "command-console__mode-label";

  const commandTranscript = document.createElement("div");
  commandTranscript.className = "command-console__transcript";

  const commandLiveRows = document.createElement("div");
  commandLiveRows.className = "command-console__live-rows";

  const commandLive = document.createElement("div");
  commandLive.className = "command-console__live";

  const commandPinnedLiveRow = document.createElement("div");
  commandPinnedLiveRow.className = "command-console__pinned-row";
  let commandPinnedLiveRowAnchor: Comment | null = null;

  const executePrompt = document.createElement("button");
  executePrompt.type = "button";
  executePrompt.className = "command-console__execute";
  renderExecutePrompt("execute");

  const commandGlossaryController = createGameGlossaryController(document, window, {
    onTutorialLogbookIntroductionComplete() {
      updateCommandConsole();
      redraw();
    },
    onTutorialLogbookIntroductionStepChange() {
      freezeCompletedTutorialLogbookOpenPrompt();
      updateCommandConsole();
      redraw();
    }
  });
  commandGlossaryController.bindRoot(commandTranscript);
  commandGlossaryController.bindRoot(commandLiveRows);
  commandGlossaryController.bindRoot(commandPinnedLiveRow);

  commandConsole.append(commandModeLabel, commandTranscript, commandLive);

  const gameMenu = document.createElement("nav");
  gameMenu.className = "game-menu is-hidden";
  gameMenu.ariaLabel = "Game menu";
  commandGlossaryController.bindHoverRoot(gameMenu, {
    dwellMs: gameMenuGlossaryHoverDwellMs
  });

  const trailerScreenTitle = document.createElement("div");
  trailerScreenTitle.className = "trailer-screen-title is-hidden";
  trailerScreenTitle.setAttribute("aria-label", "DELTAV ORBITAL STRATEGY");
  for (const lineText of ["DELTAV", "ORBITAL", "STRATEGY"]) {
    const line = document.createElement("div");
    line.className = "trailer-screen-title__line";
    line.dataset["trailerTitleText"] = lineText;
    setGameMenuGlyphText(line, lineText);
    trailerScreenTitle.append(line);
  }

  const trailerCtaScreen = document.createElement("div");
  trailerCtaScreen.className = "trailer-cta-screen is-hidden";
  trailerCtaScreen.setAttribute("aria-label", "DELTAV ORBITAL STRATEGY WISHLIST NOW ON STEAM");

  const trailerCtaTitle = document.createElement("div");
  trailerCtaTitle.className = "trailer-cta-screen__title";
  for (const lineText of ["DELTAV", "ORBITAL", "STRATEGY"]) {
    const line = document.createElement("div");
    line.className = "trailer-cta-screen__line";
    line.dataset["trailerTitleText"] = lineText;
    setGameMenuGlyphText(line, lineText);
    trailerCtaTitle.append(line);
  }

  const trailerCtaAction = document.createElement("div");
  trailerCtaAction.className = "trailer-cta-screen__action";
  trailerCtaAction.dataset["trailerTitleText"] = "WISHLIST NOW ON STEAM";
  setGameMenuGlyphText(trailerCtaAction, "WISHLIST NOW ON STEAM");
  trailerCtaScreen.append(trailerCtaTitle, trailerCtaAction);

  const replayIndicator = document.createElement("div");
  replayIndicator.className = "replay-indicator is-hidden";
  replayIndicator.textContent = "REPLAY";

  const trailerCaptureStatus = document.createElement("div");
  trailerCaptureStatus.className = "trailer-capture-status is-hidden";
  trailerCaptureStatus.setAttribute("aria-live", "polite");

  const postMatchReport = document.createElement("pre");
  postMatchReport.className = "post-match-report is-hidden";

  const postMatchDismissLayer = document.createElement("button");
  postMatchDismissLayer.type = "button";
  postMatchDismissLayer.className = "post-match-dismiss-layer is-hidden";
  postMatchDismissLayer.ariaLabel = "Return to main menu";

  canvasFrame.append(
    cinematicFrame,
    tacticalCanvas,
    replayIndicator,
    trailerCaptureStatus,
    postMatchDismissLayer,
    postMatchReport
  );
  if (isDebugUiEnabled) {
    canvasFrame.append(debugToggleButton, header);
  }
  canvasFrame.append(
    commandConsole,
    commandGlossaryController.hoverPanel,
    commandGlossaryController.detailPanel,
    gameMenu,
    trailerScreenTitle,
    trailerCtaScreen
  );
  shell.append(canvasFrame);
  root.append(shell);
  updateMusicButton();
  updateSfxButton();
  registerSfxAutoplayUnlock();

  let content: SolarSystemData;
  let state: GameState;
  let snapshot: SolarSystemSnapshot;
  let gameMenuBaseContent: SolarSystemData | null = null;
  let gameMenuCanonicalContent: SolarSystemData | null = null;
  let gameMenuOrbitEpochTurn = 0;
  let hasStartedGameMenuDemo = false;
  let selectedMapPreset: MapPreset = getMapPreset(DEFAULT_MAP_PRESET_ID);
  let proceduralSeed = createProceduralMapSeed();
  let currentProceduralDebug: ProceduralMapDebug | null = null;
  let currentRequestedSeed: string | null = null;
  let currentEffectiveMapSeed: string | null = null;
  let currentMapGameplayHash = "";
  let currentAutomaticProceduralMapAudit: AutomaticProceduralMapGenerationAudit | null = null;
  let currentView: PresentationView = "cinematic3d";
  let selectedShipModelVariant: ShipModelVariant = "ring-hex";
  let tacticalCamera = createCameraState({ minZoom: 0.24, maxZoom: 5 });
  let cinematicRenderer: CinematicSolarSystemRenderer | null = null;
  let dragStart: Vec2 | null = null;
  let selectedTargetKey: string | null = null;
  let isRestoringTutorialRequiredShipSelection = false;
  let isTurnTransitionActive = false;
  let aiTurnWorker: Worker | null = null;
  let aiTurnWorkerRequestId = 0;
  let hasReportedAiTurnWorkerFallback = false;
  let aiWorkerPostMatchEvaluation:
    | Extract<AiTurnWorkerResponse, { kind: "advance-turn" }>["postMatchEvaluation"]
    | null = null;
  let isCommandConsoleResolving = false;
  let turnPresentationDeadlineAt: number | null = null;
  let isCommandConsoleTypingLiveBlock = false;
  let shouldRefreshCommandConsoleAfterLiveUpdate = false;
  let shouldTypeNextLiveCommandBlock = false;
  const tutorialSelectionCommandConsoleRefresh = createDeferredFrameRefresh(
    () => {
      updateCommandConsole();
    },
    {
      requestFrame: (callback) => window.requestAnimationFrame(callback),
      cancelFrame: (requestId) => window.cancelAnimationFrame(requestId)
    }
  );
  let isReplayMode = false;
  let userReplayFocusTargetKeys: readonly string[] = [];
  let replayCancelRequested = false;
  let commandLogTimeReviewState: CommandLogTimeReviewState | null = null;
  let isCommandLogTimeReviewAnimating = false;
  let commandLogTimeReviewAnimationFrame: number | null = null;
  let commandLogTimeReviewAnimationResolve: (() => void) | null = null;
  let commandLogScrubState: CommandLogScrubState | null = null;
  let shouldSuppressNextCommandLogClick = false;
  let commandScrollbackPlayingEventId: string | null | undefined;
  let isTutorialFirstEnemyKillReplayCueInputPending = false;
  let postMatchReportText: string | null = null;
  let postMatchReturnTimer: number | null = null;
  let lastVictoryAudit: VictoryAudit | null = null;
  let lastMapOutcomeAudit: MapOutcomeAudit | null = null;
  let lastVictoryDelayLogKey: string | null = null;
  let lockedMandatoryLaunchId: string | null = null;
  let mandatoryLaunchGuidanceStartedAt: number | null = null;
  let hasAppendedVictoryTranscript = false;
  let requestedReplayStartTransitionIndex = 0;
  let commandLogCueCameraPreviewTimeout: number | null = null;
  let commandTranscriptScrollFrame: number | null = null;
  let commandTranscriptFollowsTail = true;
  let executePromptVisibleSince: number | null = null;
  let executePromptAttentionFrame: number | null = null;
  let suppressNextExecutePromptClick = false;
  let tutorialState: TutorialRuntimeState | null = null;
  let tutorialPostVictoryActionLessonTurn: number | null = null;
  let lastNonEmptyTutorialLiveHintRows: readonly CommandTimelineRow[] = [];
  let tutorialLogSequence = 0;
  let tutorialMandatoryLaunchAutoResumeQueued = false;
  let lastTutorialCameraHintAt: number | null = null;
  let lastTutorialCameraHintTurn: number | null = null;
  let lastTutorialPlayerActivityAt = performance.now();
  let tutorialConfirmCameraHintRefreshTimer: number | null = null;
  let tutorialZoomFocusHintRefreshTimer: number | null = null;
  let tutorialZoomFocusHintPostInputFrame: number | null = null;
  let tutorialZoomFocusHintPostInputTimer: number | null = null;
  let tutorialZoomFocusHintVisible = false;
  let hasMovedTutorialOpeningCamera = false;
  let tutorialCameraAssistAnchor: CinematicCameraState | null = null;
  let commandInputHintsMode: CommandInputHintsMode = "off";
  let isGameMenuDemoActive = false;
  let isInGameMenuActive = false;
  let isBeautyModeActive = false;
  let isTrailerScreenActive = false;
  let isTrailerCtaScreenActive = false;
  let forceCanonicalGameMenuOpening = false;
  let isTrailerModeActive = false;
  let isTrailerCaptureActive = false;
  let trailerCaptureTimeline: TrailerCaptureTimeline | null = null;
  let trailerCaptureSceneIndex = 0;
  let trailerCapturePlaybackGeneration = 0;
  let isTrailerCaptureScenePlaying = false;
  let isTrailerCapturePlayAll = false;
  let isTrailerCameraAutomationInterrupted = false;
  let gameMenuScreen: GameMenuScreen = "main";
  let gameMenuNewGameMode: GameMenuNewGameMode = "2-factions";
  let gameMenuNewGameTimerSeconds: 10 | 90 = 90;
  let gameMenuDemoTurnTimer: number | null = null;
  let gameMenuDemoRestartTimer: number | null = null;
  let gameMenuCrtFlickerTimer: number | null = null;
  let gameMenuCrtFlickerEndTimer: number | null = null;
  let gameMenuMainActions: HTMLElement | null = null;
  let gameMenuSubmenuActions: HTMLElement | null = null;
  let gameMenuFullscreenAction: HTMLButtonElement | null = null;
  let gameMenuTypingGeneration = 0;
  let planningTimerMode: PlanningTimerMode = "auto";
  let planningTimerDurationOverrideMs: number | null = null;
  let beatSyncMode: "on" | "off" = "on";
  let performanceDiagnosticsMode: "on" | "off" = "off";
  let burnPreviewEffectsMode: "on" | "off" = "on";
  let firePreviewEffectsMode: "on" | "off" = "on";
  let solarHazeMode: "on" | "off" = "off";
  let solarOcclusionMode: "on" | "off" = "on";
  let atmosphericScatteringMode: "on" | "off" = "on";
  let compactSunBloomMode: "on" | "off" = "on";
  let uiBloomMode: "on" | "off" = "on";
  let lowBloomProfileMode: "on" | "off" = "on";
  let heatDistortionMode: "on" | "off" = "on";
  let trajectoryReflectionMode = getStoredTrajectoryReflectionMode();
  let displayBrightness = parseStoredDisplayBrightness(
    window.localStorage.getItem(displayBrightnessStorageKey)
  );
  applyDisplayBrightness(displayBrightness);
  let cachedWarningSnapshot: CommandWarningSnapshot | null = null;
  const glossaryDvForecastsByState = new WeakMap<GameState, Map<FactionId, FactionRecoveryPath>>();
  let browserPerformanceCounters = createBrowserPerformanceCounterRecord();
  let browserPerformanceCounterSampleStartedAt = performance.now();
  let lastPerformanceCounterRates = createPerformanceCounterRateRecord();
  let debugAiLevel: AiPlanningLevel = 0;
  let debugAiStrategyProfiles: Partial<Record<FactionId, AiStrategyProfile>> = {};
  let tutorialEnemySimpleAiEnabled = false;
  let fallbackBeatSyncStartedAtMs = performance.now();
  let planningTimerState: PlanningTimerState = createDisabledPlanningTimerState(0);
  let planningTimerFrame: number | null = null;
  let planningTimerPausedAtMs: number | null = null;
  let hasConsumedZeroTimerInitialCountdown = false;
  let zeroTimerAutoRestartTimer: number | null = null;
  let isZeroTimerAutoRestarting = false;
  let pendingCinematicCameraRestore: CinematicCameraState | null = null;
  let serverPlanningClockOffsetMs = 0;
  let tutorialOverlayTextMode: TutorialOverlayMode = "off";
  let tutorialOverlayBlinkMode: TutorialOverlayMode = "off";
  let tutorialOverlayStartedAt = performance.now();
  let lastPlayerNodeSelectionAt: number | null = null;
  let hasConfirmedPlayerOrderAfterSelection = false;
  let fpsCounterFrame: number | null = null;
  let fpsCounterSampleStartedAt = performance.now();
  let fpsCounterFrames = 0;
  let smoothedFps = 0;
  let fpsCounterLastFrameAt: number | null = null;
  let fpsCounterPacingWindowStartedAt = performance.now();
  let fpsCounterLongestFrameMs = 0;
  let fpsCounterFramesOver20Ms = 0;
  let fpsCounterFramesOver30Ms = 0;
  let beatSynchronizedCssAnimationsActive = false;
  let lastCinematicPerformanceStats: CinematicPerformanceStats | null = null;
  const commandLogOptions = {
    cueCameraPreviewEnabled: false
  };
  const commandLogTimeReviewDurations = {
    replayTurnMs: fixedTimelineReviewReplayTurnDurationMs
  };
  const commandLogReplayFocusBeforePlaybackMs = 340;
  const commandScrollbackLineSelector =
    ".command-console__line--linked-event[data-entry-id], .command-console__line--linked-event[data-row-key]";
  const commandLogScrubLongPressMs = 115;
  const commandLogScrubMoveThresholdPixels = 2;
  const commandLogScrubPixelsPerTurn = 42;
  const commandLogScrubLineHitSlopPixels = 6;
  const commandTranscriptTailTolerancePixels = 2;
  const replayTape: ReplayTape = { transitions: [], entries: [] };
  const matchDebugEvents: TurnDebugEvent[] = [];
  const matchResolutionEvents: ResolutionEvent[] = [];
  const commandTimelineEntries: CommandTimelineEntry[] = [];
  const liveTutorialTimelineRows: CommandTimelineRow[] = [];
  const commandDvHistory: FactionCounts[] = [];
  const debugRecorderMessages: string[] = [];
  const debugPanelMessages: string[] = [];
  const contentByPresetKey = new Map<string, SolarSystemData>();
  const proceduralGenerationBySeed = new Map<string, ProceduralMapGeneration>();
  const aiAutorunIssuedProceduralSeeds = new Set<string>();
  let debugRecordingTimer: number | null = null;
  const debugRecorder = new DeltaVDebugRecorder({
    getCanvas: getActiveRecordingCanvas,
    getAudioSources: getActiveRecordingAudioSources
  });
  updateDebugRecordingUi();
  startFpsCounter();

  try {
    content = await loadMapPresetContent(
      selectedMapPreset,
      contentByPresetKey,
      proceduralSeed,
      proceduralGenerationBySeed
    );
    currentProceduralDebug = getProceduralDebugForPreset(
      selectedMapPreset,
      proceduralSeed,
      proceduralGenerationBySeed
    );
    state = appendStartStateAudit(createInitialStateForGameMode("2p"));
    snapshot = createSolarSystemSnapshot(content, state);
    captureCurrentMapIdentity();
  } catch (error) {
    status.textContent =
      error instanceof Error ? error.message : "Solar System data failed to load.";
    return;
  }

  mapSelect.value = selectedMapPreset.id;
  proceduralSeedInput.value = proceduralSeed;
  commandDvHistory.push({ ...snapshot.factionDv });
  populateFocusSelect(focusSelect, content);
  ensureCinematicRenderer();
  setPresentationView("cinematic3d");
  restartPlanningTimerForCurrentTurn();

  startMusicOnGameStart();
  startGameMenuDemo();
  if (isTutorialRequested) {
    startTutorialFromGameMenu();
  } else if (isTrailerCtaScreenRequested) {
    activateTrailerCtaScreen();
  } else if (isTrailerScreenRequested) {
    activateTrailerScreen();
  } else if (isTrailerCaptureRequested) {
    void activateTrailerCapture();
  }

  function tacticalViewport(): ViewportSize {
    return {
      width: tacticalCanvas.width,
      height: tacticalCanvas.height
    };
  }

  function updateStatus(): void {
    return updateStatusWithoutCommandConsoleRefresh({});
  }

  function updateStatusWithoutCommandConsoleRefresh(
    options: Readonly<{ skipCommandConsoleRefresh?: boolean }> = {}
  ): void {
    syncPlanningTimerWithCurrentTurn();
    const playerDv = getFactionDv(snapshot, "player");
    const mandatoryLaunchCount = snapshot.mandatoryLaunches.filter((launch) => {
      return launch.factionId === "player";
    }).length;
    const pendingPlayerBurnCost = snapshot.pendingBurnOrders
      .filter((order) => order.factionId === "player")
      .reduce((total, order) => total + order.burnCost, 0);
    const projectedDv =
      pendingPlayerBurnCost > 0 ? ` -> ${Math.max(0, playerDv - pendingPlayerBurnCost)}` : "";
    const burnState =
      snapshot.pendingBurnOrders.length > 0 || snapshot.activeBurnTransits.length > 0
        ? ` | BURN ${snapshot.pendingBurnOrders.length} pending / ${snapshot.activeBurnTransits.length} in transit`
        : "";
    const fireState =
      snapshot.pendingFireOrders.length > 0 || snapshot.activeMissiles.length > 0
        ? ` | FIRE ${snapshot.pendingFireOrders.length} pending / ${snapshot.activeMissiles.length} inbound`
        : "";
    const launchState =
      mandatoryLaunchCount > 0 ? ` | MANDATORY LAUNCH ${mandatoryLaunchCount}` : "";
    const matchState = postMatchReportText === null ? "" : " | MATCH ENDED";
    const beautyState = isBeautyModeActive ? " | BEAUTY · CLEAN UI · SLOW PAN/ZOOM" : "";
    syncFactionColorVariables();
    status.textContent = `Turn ${snapshot.turn} | ΔV ${playerDv}${projectedDv} | ${snapshot.nodes.length} active orbits | ${selectedMapPreset.statusLabel}${burnState}${fireState}${launchState}${matchState}${beautyState}`;
    updateInteractionLocks();
    updateDebugPanel();
    updateCommandConsoleModeControls();
    if (!options.skipCommandConsoleRefresh) {
      updateCommandConsole();
    }
  }

  function createDisabledPlanningTimerState(turn: number): PlanningTimerState {
    return {
      phase: "disabled",
      turn,
      deadlineAtMs: 0,
      executeCountdownEndsAtMs: 0,
      authority: "local",
      lockedFactionIds: new Set()
    };
  }

  function syncPlanningTimerWithCurrentTurn(): void {
    if (planningTimerState.phase === "resolving") {
      renderPlanningTimerPanel();
      return;
    }

    if (!isPlanningTimerEnabledForCurrentState()) {
      stopPlanningTimer();
      return;
    }

    if (
      planningTimerState.phase === "disabled" ||
      planningTimerState.turn !== state.turn ||
      planningTimerState.deadlineAtMs <= 0
    ) {
      restartPlanningTimerForCurrentTurn();
      return;
    }

    renderPlanningTimerPanel();
  }

  function restartPlanningTimerForCurrentTurn(
    options: Readonly<{ authority?: PlanningTimerAuthority; deadlineAtMs?: number }> = {}
  ): void {
    const shouldRemainPausedForGameMenu = isInGameMenuActive;
    stopPlanningTimerLoop();
    planningTimerPausedAtMs = shouldRemainPausedForGameMenu ? performance.now() : null;

    if (!isPlanningTimerEnabledForCurrentState()) {
      planningTimerState = createDisabledPlanningTimerState(state.turn);
      renderPlanningTimerPanel();
      return;
    }

    const now = performance.now();
    const timerDurationMs = getPlanningTimerDurationMs();

    planningTimerState = {
      phase: "planning",
      turn: state.turn,
      deadlineAtMs: options.deadlineAtMs ?? now + timerDurationMs,
      executeCountdownEndsAtMs: 0,
      authority: options.authority ?? getPlanningTimerAuthority(),
      lockedFactionIds: getInitialPlanningLockedFactionIds()
    };

    if (shouldStartPlanningTimerCountdown(options)) {
      if (planningTimerMode === "zero") {
        hasConsumedZeroTimerInitialCountdown = true;
      }
      lockAllPlanningPlayers();
      startPlanningExecuteCountdown(now);
      return;
    }

    if (shouldResolvePlanningTimerImmediately(options)) {
      void commitPlanningTimerAndResolve("timeout");
      return;
    }

    renderPlanningTimerPanel();
    startPlanningTimerLoop();
  }

  function stopPlanningTimer(): void {
    stopPlanningTimerLoop();
    planningTimerPausedAtMs = null;
    planningTimerState = createDisabledPlanningTimerState(state.turn);
    renderPlanningTimerPanel();
  }

  function getPlanningTimerAuthority(): PlanningTimerAuthority {
    return isMultiplayerPlanningTimerSession() ? "server" : "local";
  }

  function isPlanningTimerEnabledForCurrentState(): boolean {
    if (
      isTrailerModeActive ||
      isReplayMode ||
      tutorialState !== null ||
      postMatchReportText !== null
    ) {
      return false;
    }

    if (planningTimerMode !== "auto") {
      return getPlanningParticipantFactionIds().length > 0;
    }

    return isMultiplayerPlanningTimerSession();
  }

  function getPlanningTimerDurationMs(): number {
    const defaultTimerDurationMs = planningTimerMode === "auto" ? planningTimerDurationMs : 0;
    return planningTimerDurationOverrideMs ?? defaultTimerDurationMs;
  }

  function shouldResolvePlanningTimerImmediately(
    options: Readonly<{ deadlineAtMs?: number }>
  ): boolean {
    return (
      planningTimerMode === "zero" &&
      hasConsumedZeroTimerInitialCountdown &&
      !isTrailerAiMatchActive() &&
      options.deadlineAtMs === undefined
    );
  }

  function shouldStartPlanningTimerCountdown(
    options: Readonly<{ deadlineAtMs?: number }>
  ): boolean {
    return (
      options.deadlineAtMs === undefined &&
      (planningTimerMode === "two" ||
        planningTimerMode === "ten" ||
        planningTimerMode === "twenty" ||
        (planningTimerMode === "zero" && !hasConsumedZeroTimerInitialCountdown))
    );
  }

  function isMultiplayerPlanningTimerSession(): boolean {
    const participants = getPlanningParticipantFactionIds();

    if (state.gameMode === "1p" || participants.length <= 1) {
      return false;
    }

    return participants.some((factionId) => {
      return getFactionIdentity(state, factionId).controlType === "human";
    });
  }

  function getPlanningParticipantFactionIds(): readonly FactionId[] {
    return getActiveFactions(state).map((faction) => faction.id);
  }

  function getInitialPlanningLockedFactionIds(): Set<FactionId> {
    return new Set(
      getPlanningParticipantFactionIds().filter((factionId) => {
        return getFactionIdentity(state, factionId).controlType !== "human";
      })
    );
  }

  function isLocalPlayerPlanningLocked(): boolean {
    return (
      planningTimerState.phase !== "disabled" && planningTimerState.lockedFactionIds.has("player")
    );
  }

  function isPlanningTimerExecuteLocked(): boolean {
    return (
      planningTimerState.phase === "executeCountdown" ||
      planningTimerState.phase === "resolving" ||
      (planningTimerState.phase === "planning" &&
        isLocalPlayerPlanningLocked() &&
        !isTrailerAiMatchActive())
    );
  }

  function lockAllPlanningPlayers(): void {
    for (const factionId of getPlanningParticipantFactionIds()) {
      planningTimerState.lockedFactionIds.add(factionId);
    }
  }

  function startPlanningExecuteCountdown(
    now = performance.now(),
    executeCountdownEndsAtMs = now + getPlanningExecuteCountdownDurationMs()
  ): void {
    if (planningTimerState.phase !== "planning") {
      return;
    }

    planningTimerState.phase = "executeCountdown";
    planningTimerState.executeCountdownEndsAtMs = executeCountdownEndsAtMs;
    renderPlanningTimerPanel();
    startPlanningTimerLoop();
    updateInteractionLocks();
  }

  function getPlanningExecuteCountdownDurationMs(): number {
    if (planningTimerMode === "twenty") {
      return planningTimerLongExecuteCountdownMs;
    }

    return planningTimerMode === "two"
      ? planningTimerShortExecuteCountdownMs
      : planningTimerExecuteCountdownMs;
  }

  function startPlanningTimerLoop(): void {
    if (planningTimerFrame !== null || planningTimerPausedAtMs !== null) {
      return;
    }

    planningTimerFrame = window.requestAnimationFrame(updatePlanningTimerFrame);
  }

  function stopPlanningTimerLoop(): void {
    if (planningTimerFrame === null) {
      return;
    }

    window.cancelAnimationFrame(planningTimerFrame);
    planningTimerFrame = null;
  }

  function updatePlanningTimerFrame(now: number): void {
    planningTimerFrame = null;

    if (planningTimerPausedAtMs !== null) {
      renderPlanningTimerPanel();
      return;
    }

    if (planningTimerState.phase === "planning") {
      const remainingMs = getPlanningTimerRemainingMs(now);

      if (remainingMs <= 0) {
        lockAllPlanningPlayers();
        if (planningTimerMode === "zero") {
          void commitPlanningTimerAndResolve("timeout");
          return;
        }
        startPlanningExecuteCountdown(now);
        return;
      }

      renderPlanningTimerPanel();
      startPlanningTimerLoop();
      return;
    }

    if (planningTimerState.phase === "executeCountdown") {
      if (planningTimerState.executeCountdownEndsAtMs - now <= 0) {
        const reason = planningTimerState.deadlineAtMs <= now ? "timeout" : "all-locked";
        void commitPlanningTimerAndResolve(reason);
        return;
      }

      renderPlanningTimerPanel();
      startPlanningTimerLoop();
      return;
    }

    renderPlanningTimerPanel();
  }

  async function commitPlanningTimerAndResolve(reason: "timeout" | "all-locked"): Promise<void> {
    if (
      planningTimerState.phase !== "planning" &&
      planningTimerState.phase !== "executeCountdown"
    ) {
      return;
    }

    const shouldRestartMusicAtCountdownZero = shouldRestartMusicForZeroTimerCountdown(reason);

    lockAllPlanningPlayers();
    planningTimerState.phase = "resolving";
    planningTimerState.executeCountdownEndsAtMs = 0;
    stopPlanningTimerLoop();
    renderPlanningTimerPanel();
    updateInteractionLocks();
    if (shouldRestartMusicAtCountdownZero) {
      restartMusicForZeroTimerCountdown();
    }
    await resolveCurrentTurn(reason === "timeout" ? "planning-timeout" : "planning-all-locked");
  }

  function shouldRestartMusicForZeroTimerCountdown(reason: "timeout" | "all-locked"): boolean {
    return (
      planningTimerMode === "zero" &&
      reason === "timeout" &&
      planningTimerState.phase === "executeCountdown"
    );
  }

  function finishPlanningTimerResolution(): void {
    if (postMatchReportText !== null || !isPlanningTimerEnabledForCurrentState()) {
      stopPlanningTimer();
      return;
    }

    restartPlanningTimerForCurrentTurn();
  }

  function getPlanningTimerRemainingMs(now = performance.now()): number {
    return Math.max(0, planningTimerState.deadlineAtMs - now);
  }

  function pausePlanningTimerForGameMenu(): void {
    if (planningTimerPausedAtMs !== null) {
      return;
    }

    planningTimerPausedAtMs = performance.now();
    stopPlanningTimerLoop();
  }

  function resumePlanningTimerAfterGameMenu(): void {
    if (planningTimerPausedAtMs === null) {
      return;
    }

    const pausedDurationMs = performance.now() - planningTimerPausedAtMs;
    const shiftedDeadlines = shiftPlanningTimerDeadlinesAfterPause(
      planningTimerState.phase,
      planningTimerState,
      pausedDurationMs
    );
    planningTimerPausedAtMs = null;
    planningTimerState = {
      ...planningTimerState,
      ...shiftedDeadlines
    };
    renderPlanningTimerPanel();
    startPlanningTimerLoop();
  }

  function renderPlanningTimerPanel(): void {
    commandConsole.classList.toggle(
      "is-planning-final-countdown",
      planningTimerState.phase === "executeCountdown"
    );

    if (executePrompt.isConnected && shouldShowExecutePrompt()) {
      renderExecutePrompt(getExecutePromptMode());
    } else {
      executePrompt.remove();
    }

    updateCommandConsole();
  }

  function toggleDebugDrawer(): void {
    const isHidden = header.classList.toggle("is-hidden");
    debugToggleButton.setAttribute("aria-expanded", String(!isHidden));

    if (isHidden) {
      debugToggleButton.remove();
      return;
    }

    updateDebugFps();
  }

  function setBeautyModeActive(active: boolean): void {
    if (active && currentView !== "cinematic3d") {
      setPresentationView("cinematic3d");
    }

    isBeautyModeActive = active;
    cinematicRenderer?.setBeautyModeEnabled(active);
    if (active) {
      commandConsole.classList.add("is-hidden");
    } else if (!isGameMenuOpen() && !isTrailerScreenActive) {
      commandConsole.classList.remove("is-hidden");
    }
    updateCommandConsoleModeControls();
    redraw();
  }

  function activateTrailerMode(): void {
    if (isTrailerModeActive) {
      return;
    }

    enableTrailerPresentationMode();

    const returnToMainMenuWhenReady = (): void => {
      if (isTurnTransitionActive || isCommandConsoleResolving) {
        window.setTimeout(returnToMainMenuWhenReady, 40);
        return;
      }

      startGameMenuDemo();
    };

    returnToMainMenuWhenReady();
  }

  function enableTrailerPresentationMode(): void {
    isTrailerModeActive = true;
    header.classList.add("is-hidden");
    debugToggleButton.setAttribute("aria-expanded", "false");
    header.remove();
    debugToggleButton.remove();
  }

  function activateTrailerScreen(): void {
    if (isTrailerScreenActive) {
      return;
    }

    isTrailerScreenActive = true;
    isTrailerCtaScreenActive = false;
    forceCanonicalGameMenuOpening = true;
    shell.classList.add("is-trailer-screen");
    startGameMenuDemo();
    typeTrailerScreenTitle();
  }

  function activateTrailerCtaScreen(): void {
    if (isTrailerCtaScreenActive) {
      return;
    }

    isTrailerScreenActive = true;
    isTrailerCtaScreenActive = true;
    forceCanonicalGameMenuOpening = true;
    shell.classList.add("is-trailer-screen");
    startGameMenuDemo();
    typeTrailerCtaScreen();
  }

  function deactivateTrailerScreen(): void {
    if (!isTrailerScreenActive) {
      return;
    }

    isTrailerScreenActive = false;
    isTrailerCtaScreenActive = false;
    shell.classList.remove("is-trailer-screen");
    renderGameMenu();
    frameTutorialOpeningCamera();
    enforceGameMenuOpeningCameraNextFrame();
  }

  async function activateTrailerCapture(): Promise<void> {
    if (isTrailerModeActive) {
      return;
    }

    stopGameMenuDemo();

    try {
      const trailerPreset = getMapPreset(TRAILER_CAPTURE_MAP_PRESET_ID);
      content = await loadMapPresetContent(
        trailerPreset,
        contentByPresetKey,
        proceduralSeed,
        proceduralGenerationBySeed
      );
      selectedMapPreset = trailerPreset;
      currentProceduralDebug = null;
      currentAutomaticProceduralMapAudit = null;
      trailerCaptureTimeline = createTrailerCaptureTimeline(content);
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Trailer Capture failed to load.";
      return;
    }

    const timeline = trailerCaptureTimeline;

    if (timeline === null) {
      return;
    }

    isTrailerModeActive = true;
    isTrailerCaptureActive = true;
    planningTimerMode = "auto";
    planningTimerDurationOverrideMs = null;
    hasConsumedZeroTimerInitialCountdown = true;
    shell.classList.add("is-trailer-capture");
    header.classList.add("is-hidden");
    debugToggleButton.setAttribute("aria-expanded", "false");
    header.remove();
    debugToggleButton.remove();
    state = timeline.initialState;
    snapshot = createSolarSystemSnapshot(content, state);
    captureCurrentMapIdentity(timeline.seed, timeline.seed);
    currentView = "cinematic3d";
    viewSelect.value = "cinematic3d";
    cinematicFrame.classList.remove("is-hidden");
    tacticalCanvas.classList.add("is-hidden");
    resetRuntimeAfterGameReset({ preserveCinematicScene: true });
    revealCommandConsoleForActiveGame();
    cinematicRenderer?.setCameraInputEnabled(true);
    cinematicRenderer?.setBillboardsVisible(true);

    const requestedScene = Number.parseInt(urlSearchParams.get("scene") ?? "1", 10);
    trailerCaptureSceneIndex = clampNumber(
      Number.isFinite(requestedScene) ? requestedScene - 1 : 0,
      0,
      timeline.scenes.length - 1
    );
    installTrailerSceneStart(timeline.scenes[trailerCaptureSceneIndex] ?? timeline.scenes[0]);
    updateTrailerCaptureStatus();

    if (urlSearchParams.get("play") === "all") {
      void playAllTrailerCaptureScenes();
    }
  }

  function installTrailerSceneStart(scene: TrailerCaptureScene | undefined): void {
    if (scene === undefined) {
      return;
    }

    state = scene.beforeState;
    snapshot = scene.beforeSnapshot;
    selectedTargetKey = null;
    cinematicRenderer?.clearRoutePreview();
    cinematicRenderer?.selectTarget(null);
    cinematicRenderer?.clearPresentationEffects();
    cinematicRenderer?.setSnapshot(snapshot);
    resetRuntimeAfterGameReset({ preserveCinematicScene: true });
    stageTrailerCameraShot(scene, 0);
    stopPlanningTimer();
    revealCommandConsoleForActiveGame();
    commandConsole.classList.toggle("is-hidden", scene.camera.cleanSystemView === true);
    updateStatus();
  }

  function updateTrailerCaptureStatus(): void {
    const timeline = trailerCaptureTimeline;
    const scene = timeline?.scenes[trailerCaptureSceneIndex];

    if (
      timeline === null ||
      scene === undefined ||
      isTrailerCaptureScenePlaying ||
      isTrailerCapturePlayAll
    ) {
      trailerCaptureStatus.classList.add("is-hidden");
      return;
    }

    trailerCaptureStatus.textContent = `TRAILER ${String(scene.index).padStart(2, "0")}/${timeline.scenes.length} · R REPEAT · N NEXT · P PLAY ALL`;
    trailerCaptureStatus.classList.remove("is-hidden");
  }

  async function playCurrentTrailerCaptureScene(): Promise<void> {
    const timeline = trailerCaptureTimeline;
    const scene = timeline?.scenes[trailerCaptureSceneIndex];

    if (timeline === null || scene === undefined || isTrailerCaptureScenePlaying) {
      return;
    }

    installTrailerSceneStart(scene);
    const generation = ++trailerCapturePlaybackGeneration;
    isTrailerCaptureScenePlaying = true;
    updateTrailerCaptureStatus();

    try {
      await playTrailerCaptureSceneSegment(scene, generation);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Trailer Capture scene failed.";
    } finally {
      if (generation === trailerCapturePlaybackGeneration) {
        isTrailerCaptureScenePlaying = false;
        updateTrailerCaptureStatus();
      }
    }
  }

  async function playAllTrailerCaptureScenes(): Promise<void> {
    const timeline = trailerCaptureTimeline;

    if (timeline === null || isTrailerCaptureScenePlaying || isTrailerCapturePlayAll) {
      return;
    }

    const firstScene = timeline.scenes[0];

    if (firstScene === undefined) {
      return;
    }

    trailerCaptureSceneIndex = 0;
    installTrailerSceneStart(firstScene);
    const generation = ++trailerCapturePlaybackGeneration;
    isTrailerCapturePlayAll = true;
    isTrailerCaptureScenePlaying = true;
    let didCompleteAllScenes = false;
    updateTrailerCaptureStatus();

    try {
      for (const scene of timeline.scenes) {
        if (generation !== trailerCapturePlaybackGeneration) {
          break;
        }

        trailerCaptureSceneIndex = scene.index - 1;
        await playTrailerCaptureSceneSegment(scene, generation);
      }
      didCompleteAllScenes = generation === trailerCapturePlaybackGeneration;
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Trailer Capture PLAY ALL failed.";
    } finally {
      if (generation === trailerCapturePlaybackGeneration) {
        isTrailerCapturePlayAll = false;
        isTrailerCaptureScenePlaying = false;
        if (didCompleteAllScenes) {
          trailerCaptureStatus.classList.add("is-hidden");
        } else {
          updateTrailerCaptureStatus();
        }
      }
    }
  }

  async function playTrailerCaptureSceneSegment(
    scene: TrailerCaptureScene,
    generation: number
  ): Promise<void> {
    if (generation !== trailerCapturePlaybackGeneration) {
      return;
    }

    commandConsole.classList.toggle("is-hidden", scene.camera.cleanSystemView === true);
    isTrailerCameraAutomationInterrupted = false;
    cinematicRenderer?.clearRoutePreview();
    playTrailerCameraShot(scene, 0);
    await waitForCommandConsoleMs(scene.preRollMs);

    if (generation !== trailerCapturePlaybackGeneration) {
      return;
    }

    if (scene.previewBurn !== undefined) {
      cinematicRenderer?.previewBurnRoute(
        scene.previewBurn.originNodeId,
        scene.previewBurn.destinationNodeId
      );
      selectedTargetKey = `node:${scene.previewBurn.originNodeId}`;
      syncFocusSelectToTarget(selectedTargetKey);
      updateCommandConsole();
    }

    for (const [stepIndex, step] of scene.steps.entries()) {
      if (generation !== trailerCapturePlaybackGeneration) {
        return;
      }

      if (step.kind === "command") {
        state = applyCommand(state, step.command, content);
        assertTrailerCaptureState(scene, step.to);
        snapshot = createSolarSystemSnapshot(content, state);
        invalidateCommandWarningSnapshot();
        cinematicRenderer?.setSnapshot(snapshot);
        updateStatus();
        await waitForCommandConsoleMs(260);
        continue;
      }

      if (stepIndex > 0 && scene.steps[stepIndex - 1]?.kind === "command") {
        await waitForCommandConsoleMs(1_400);
      }

      await resolveCurrentTurn("manual");
      assertTrailerCaptureState(scene, step.to);
    }

    if (generation !== trailerCapturePlaybackGeneration) {
      return;
    }

    playTrailerCameraShot(scene, 1);
    await waitForCommandConsoleMs(scene.postRollMs);
  }

  function playTrailerCameraShot(scene: TrailerCaptureScene, shotIndex: number): void {
    if (isTrailerCameraAutomationInterrupted && shotIndex > 0) {
      return;
    }

    const renderer = cinematicRenderer;
    const shot = scene.camera.shots?.[shotIndex];

    if (renderer === null || renderer === undefined || shot === undefined) {
      return;
    }

    const targetKeys = getTrailerCameraShotTargetKeys(scene, shot.targetKeys);
    renderer.frameTargetsAroundFocusObliqueSmooth(shot.focusTargetKey, targetKeys, {
      padding: 1.2 * shot.distanceScale,
      yaw: shot.yawRadians,
      pitch: shot.pitchRadians,
      durationMs: shot.durationMs
    });
  }

  function stageTrailerCameraShot(scene: TrailerCaptureScene, shotIndex: number): void {
    const renderer = cinematicRenderer;
    const shot = scene.camera.shots?.[shotIndex];

    if (renderer === null || renderer === undefined || shot === undefined) {
      return;
    }

    renderer.frameTargetsAroundFocusObliqueInstant(
      shot.focusTargetKey,
      getTrailerCameraShotTargetKeys(scene, shot.targetKeys),
      {
        padding: 1.2 * shot.distanceScale,
        yaw: shot.yawRadians,
        pitch: shot.pitchRadians
      }
    );
  }

  function getTrailerCameraShotTargetKeys(
    scene: TrailerCaptureScene,
    shotTargetKeys: readonly string[]
  ): readonly string[] {
    return scene.camera.cleanSystemView === true
      ? snapshot.bodies.map((body) => `body:${body.id}`)
      : shotTargetKeys;
  }

  function stopTrailerCapturePlayback(): void {
    trailerCapturePlaybackGeneration += 1;
    isTrailerCapturePlayAll = false;
    isTrailerCaptureScenePlaying = false;
    isTrailerCameraAutomationInterrupted = true;
    updateTrailerCaptureStatus();
  }

  function advanceTrailerCaptureScene(): void {
    const timeline = trailerCaptureTimeline;

    if (timeline === null) {
      return;
    }

    stopTrailerCapturePlayback();
    trailerCaptureSceneIndex = Math.min(timeline.scenes.length - 1, trailerCaptureSceneIndex + 1);
    void playCurrentTrailerCaptureScene();
  }

  function assertTrailerCaptureState(scene: TrailerCaptureScene, expectedState: GameState): void {
    if (stableStringify(state) === stableStringify(expectedState)) {
      return;
    }

    throw new Error(
      `Trailer Capture deterministic state mismatch in scene ${scene.index} (${scene.id}).`
    );
  }

  function startGameMenuDemo(): void {
    if (
      postMatchReportText === null &&
      (isReplayMode || isMandatoryLaunchLockActive() || isTurnTransitionActive)
    ) {
      updateStatus();
      return;
    }

    const currentOrbitTurn = snapshot.turn;
    const shouldForceCanonicalOpening = forceCanonicalGameMenuOpening;
    forceCanonicalGameMenuOpening = false;
    clearGameMenuDemoTimers();
    clearZeroTimerAutoRestart();
    planningTimerMode = "auto";
    planningTimerDurationOverrideMs = null;
    hasConsumedZeroTimerInitialCountdown = false;
    debugAiStrategyProfiles = {};
    setDebugAiLevel(3);
    isInGameMenuActive = false;
    isGameMenuDemoActive = true;
    gameMenuScreen = "main";
    gameMenuNewGameMode = isTrailerModeActive ? "ai-vs-ai" : "2-factions";
    gameMenuNewGameTimerSeconds = 90;
    header.classList.add("is-hidden");
    debugToggleButton.setAttribute("aria-expanded", "false");
    dragStart = null;
    cinematicRenderer?.setCameraInputEnabled(false);
    cinematicRenderer?.setBillboardsVisible(false);
    cinematicRenderer?.setProductiveMarkersVisible(false);

    gameMenuBaseContent ??= content;
    const gameMenuPreset = getMapPreset(DEFAULT_MAP_PRESET_ID);
    const gameMenuGeneration =
      gameMenuPreset.procedural === true
        ? getProceduralGeneration(
            gameMenuPreset,
            gameMenuCanonicalProceduralSeed,
            proceduralGenerationBySeed
          )
        : null;
    gameMenuCanonicalContent = gameMenuGeneration?.content ?? content;
    gameMenuOrbitEpochTurn = shouldForceCanonicalOpening
      ? gameMenuCanonicalOpeningOrbitTurn
      : hasStartedGameMenuDemo
        ? currentOrbitTurn
        : gameMenuCanonicalOpeningOrbitTurn;
    hasStartedGameMenuDemo = true;
    content = shiftSolarSystemOrbitPhase(gameMenuCanonicalContent, gameMenuOrbitEpochTurn);
    state = createGameMenuDemoInitialState();
    snapshot = createSolarSystemSnapshot(content, state);
    resetRuntimeAfterGameReset();
    frameTutorialOpeningCamera();
    enforceGameMenuOpeningCameraNextFrame();
    renderGameMenu();
    scheduleGameMenuCrtFlicker();
    scheduleGameMenuDemoTurn(0);
    window.dispatchEvent(new CustomEvent("deltav:game-menu-opened"));
  }

  function createGameMenuDemoInitialState(): GameState {
    const gameMenuPreset = getMapPreset(DEFAULT_MAP_PRESET_ID);
    const gameMenuGeneration =
      gameMenuPreset.procedural === true
        ? getProceduralGeneration(
            gameMenuPreset,
            gameMenuCanonicalProceduralSeed,
            proceduralGenerationBySeed
          )
        : null;
    const nextState = withAiControlledFactions(
      createInitialStateForGameModeAndMap("3p", gameMenuPreset, content, gameMenuGeneration)
    );
    const controllerOverrides = createControllerAuditOverrides(nextState);

    return appendStartStateAudit(nextState, {
      controllerOverrides,
      proceduralDebug: gameMenuGeneration?.debug ?? null
    });
  }

  function stopGameMenuDemo(): void {
    isGameMenuDemoActive = false;
    isInGameMenuActive = false;
    isTrailerScreenActive = false;
    isTrailerCtaScreenActive = false;
    forceCanonicalGameMenuOpening = false;
    shell.classList.remove("is-trailer-screen");
    trailerScreenTitle.classList.add("is-hidden");
    trailerCtaScreen.classList.add("is-hidden");
    clearGameMenuDemoTimers();
    if (gameMenuBaseContent !== null) {
      content = gameMenuBaseContent;
      gameMenuBaseContent = null;
    }
    gameMenuCanonicalContent = null;
    gameMenuOrbitEpochTurn = 0;
    gameMenuScreen = "main";
    gameMenuTypingGeneration += 1;
    gameMenuMainActions = null;
    gameMenuSubmenuActions = null;
    gameMenu.innerHTML = "";
    gameMenu.classList.add("is-hidden");
    hideCommandConsoleForGameMenuLaunch();
    cinematicRenderer?.setForcedCameraFocusTarget(null);
    cinematicRenderer?.setCameraInputEnabled(true);
    cinematicRenderer?.setProductiveMarkersVisible(true);
  }

  function isGameMenuOpen(): boolean {
    return isGameMenuDemoActive || isInGameMenuActive;
  }

  function openInGameMenu(): void {
    if (isGameMenuOpen()) {
      return;
    }

    pausePlanningTimerForGameMenu();
    isInGameMenuActive = true;
    gameMenuScreen = "main";
    gameMenuMainActions = null;
    gameMenuSubmenuActions = null;
    dragStart = null;
    cinematicRenderer?.setCameraInputEnabled(false);
    renderGameMenu();
    updateInteractionLocks();
  }

  function resumeGameFromMenu(): void {
    if (!isInGameMenuActive) {
      return;
    }

    window.dispatchEvent(new CustomEvent("deltav:gameplay-entered"));
    isInGameMenuActive = false;
    resumePlanningTimerAfterGameMenu();
    gameMenuScreen = "main";
    renderGameMenu();
    cinematicRenderer?.setCameraInputEnabled(true);
    updateCommandConsole();
    commandGlossaryController.restoreTutorialLogbookIntroduction();
    updateInteractionLocks();
    redraw();
  }

  function hideCommandConsoleForGameMenuLaunch(): void {
    commandGlossaryController.closeAll();
    commandConsole.classList.add("is-hidden");
    clearCommandLiveRowsBlock();
    commandTranscriptFollowsTail = true;
    commandTranscript.replaceChildren();
    commandLive.replaceChildren();
  }

  function revealCommandConsoleForActiveGame(): void {
    commandConsole.classList.remove("is-hidden");
    updateCommandConsole();
    commandGlossaryController.restoreTutorialLogbookIntroduction();
  }

  function clearGameMenuDemoTimers(): void {
    if (gameMenuDemoTurnTimer !== null) {
      window.clearTimeout(gameMenuDemoTurnTimer);
      gameMenuDemoTurnTimer = null;
    }

    if (gameMenuDemoRestartTimer !== null) {
      window.clearTimeout(gameMenuDemoRestartTimer);
      gameMenuDemoRestartTimer = null;
    }

    if (gameMenuCrtFlickerTimer !== null) {
      window.clearTimeout(gameMenuCrtFlickerTimer);
      gameMenuCrtFlickerTimer = null;
    }

    if (gameMenuCrtFlickerEndTimer !== null) {
      window.clearTimeout(gameMenuCrtFlickerEndTimer);
      gameMenuCrtFlickerEndTimer = null;
    }

    clearGameMenuCrtFlickerGlyphs();
  }

  function scheduleGameMenuCrtFlicker(): void {
    if (
      !isGameMenuDemoActive ||
      gameMenuCrtFlickerTimer !== null ||
      gameMenuCrtFlickerEndTimer !== null ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    gameMenuCrtFlickerTimer = window.setTimeout(
      () => {
        gameMenuCrtFlickerTimer = null;

        if (!isGameMenuDemoActive) {
          return;
        }

        const durationMs = getRandomGameMenuCrtFlickerValue(
          gameMenuCrtFlickerMinDurationMs,
          gameMenuCrtFlickerMaxDurationMs
        );
        const availableGlyphs = Array.from(
          isTrailerCtaScreenActive
            ? trailerCtaScreen.querySelectorAll<HTMLElement>(".game-menu__glyph")
            : isTrailerScreenActive
              ? trailerScreenTitle.querySelectorAll<HTMLElement>(".game-menu__glyph")
              : gameMenu.querySelectorAll<HTMLElement>(".game-menu__glyph")
        );

        if (availableGlyphs.length === 0) {
          scheduleGameMenuCrtFlicker();
          return;
        }

        const flickeringGlyphs = selectGameMenuCrtFlickerGlyphs(availableGlyphs);
        for (const glyph of flickeringGlyphs) {
          glyph.style.setProperty("--game-menu-crt-flicker-duration", `${durationMs}ms`);
          glyph.classList.add("is-crt-flickering");
        }
        gameMenuCrtFlickerEndTimer = window.setTimeout(() => {
          gameMenuCrtFlickerEndTimer = null;
          for (const glyph of flickeringGlyphs) {
            glyph.classList.remove("is-crt-flickering");
            glyph.style.removeProperty("--game-menu-crt-flicker-duration");
          }
          scheduleGameMenuCrtFlicker();
        }, durationMs);
      },
      getRandomGameMenuCrtFlickerValue(gameMenuCrtFlickerMinDelayMs, gameMenuCrtFlickerMaxDelayMs)
    );
  }

  function getRandomGameMenuCrtFlickerValue(minimum: number, maximum: number): number {
    return Math.round(minimum + Math.random() * (maximum - minimum));
  }

  function selectGameMenuCrtFlickerGlyphs(
    availableGlyphs: readonly HTMLElement[]
  ): readonly HTMLElement[] {
    const firstIndex = getRandomGameMenuCrtFlickerValue(0, availableGlyphs.length - 1);
    const firstGlyph = availableGlyphs[firstIndex];

    if (firstGlyph === undefined) {
      return [];
    }

    if (availableGlyphs.length < 2 || Math.random() < 0.76) {
      return [firstGlyph];
    }

    let secondIndex = getRandomGameMenuCrtFlickerValue(0, availableGlyphs.length - 2);
    if (secondIndex >= firstIndex) {
      secondIndex += 1;
    }
    const secondGlyph = availableGlyphs[secondIndex];
    return secondGlyph === undefined ? [firstGlyph] : [firstGlyph, secondGlyph];
  }

  function clearGameMenuCrtFlickerGlyphs(): void {
    for (const glyph of gameMenu.querySelectorAll<HTMLElement>(
      ".game-menu__glyph.is-crt-flickering"
    )) {
      glyph.classList.remove("is-crt-flickering");
      glyph.style.removeProperty("--game-menu-crt-flicker-duration");
    }
    for (const glyph of trailerScreenTitle.querySelectorAll<HTMLElement>(
      ".game-menu__glyph.is-crt-flickering"
    )) {
      glyph.classList.remove("is-crt-flickering");
      glyph.style.removeProperty("--game-menu-crt-flicker-duration");
    }
    for (const glyph of trailerCtaScreen.querySelectorAll<HTMLElement>(
      ".game-menu__glyph.is-crt-flickering"
    )) {
      glyph.classList.remove("is-crt-flickering");
      glyph.style.removeProperty("--game-menu-crt-flicker-duration");
    }
  }

  function typeTrailerScreenTitle(): void {
    const generation = gameMenuTypingGeneration + 1;
    gameMenuTypingGeneration = generation;
    const targets = Array.from(
      trailerScreenTitle.querySelectorAll<HTMLElement>(".trailer-screen-title__line"),
      (element) => ({
        element,
        text: element.dataset["trailerTitleText"] ?? ""
      })
    );
    void typeGameMenuTargetsSequentially(targets, generation);
  }

  function typeTrailerCtaScreen(): void {
    const generation = gameMenuTypingGeneration + 1;
    gameMenuTypingGeneration = generation;
    const targets = Array.from(
      trailerCtaScreen.querySelectorAll<HTMLElement>(
        ".trailer-cta-screen__line, .trailer-cta-screen__action"
      ),
      (element) => ({
        element,
        text: element.dataset["trailerTitleText"] ?? ""
      })
    );
    void typeGameMenuTargetsSequentially(targets, generation);
  }

  function scheduleGameMenuDemoTurn(delayMs = gameMenuDemoTurnDelayMs): void {
    if (
      !isGameMenuDemoActive ||
      gameMenuDemoTurnTimer !== null ||
      gameMenuDemoRestartTimer !== null ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    gameMenuDemoTurnTimer = window.setTimeout(() => {
      gameMenuDemoTurnTimer = null;

      if (!isGameMenuDemoActive) {
        return;
      }

      if (isTurnTransitionActive || isCommandConsoleResolving || isReplayMode) {
        scheduleGameMenuDemoTurn();
        return;
      }

      void advanceGameMenuDemoTurn();
    }, delayMs);
  }

  async function advanceGameMenuDemoTurn(): Promise<void> {
    if (!isGameMenuDemoActive) {
      return;
    }

    await advanceTurn(undefined, { ignoreMandatoryLaunchLock: true });

    if (isGameMenuDemoActive) {
      frameTutorialOpeningCamera();
    }
  }

  function enforceGameMenuOpeningCameraNextFrame(): void {
    window.requestAnimationFrame(() => {
      if (isGameMenuDemoActive) {
        frameTutorialOpeningCamera();
      }
    });
  }

  function scheduleGameMenuDemoRestart(): void {
    if (!isGameMenuDemoActive || gameMenuDemoRestartTimer !== null) {
      return;
    }

    if (gameMenuDemoTurnTimer !== null) {
      window.clearTimeout(gameMenuDemoTurnTimer);
      gameMenuDemoTurnTimer = null;
    }

    gameMenuDemoRestartTimer = window.setTimeout(() => {
      gameMenuDemoRestartTimer = null;

      if (!isGameMenuDemoActive || isReplayMode || isTurnTransitionActive) {
        return;
      }

      gameMenuOrbitEpochTurn += state.turn;
      if (gameMenuCanonicalContent !== null) {
        content = shiftSolarSystemOrbitPhase(gameMenuCanonicalContent, gameMenuOrbitEpochTurn);
      }
      state = createGameMenuDemoInitialState();
      snapshot = createSolarSystemSnapshot(content, state);
      resetRuntimeAfterGameReset({ preserveCamera: true, preserveCinematicScene: true });
      frameTutorialOpeningCamera();
      enforceGameMenuOpeningCameraNextFrame();
      renderGameMenu();
      scheduleGameMenuDemoTurn(0);
    }, gameMenuDemoRestartDelayMs);
  }

  function renderGameMenu(): void {
    const isMenuOpen = isGameMenuOpen() && !isTrailerScreenActive;
    gameMenu.classList.toggle("is-hidden", !isMenuOpen);
    trailerScreenTitle.classList.toggle(
      "is-hidden",
      !isTrailerScreenActive || isTrailerCtaScreenActive
    );
    trailerCtaScreen.classList.toggle("is-hidden", !isTrailerCtaScreenActive);
    commandConsole.classList.toggle("is-hidden", isMenuOpen);
    if (isTrailerScreenActive) {
      commandConsole.classList.add("is-hidden");
    }
    if (isMenuOpen || isTrailerScreenActive) {
      commandGlossaryController.closeAll();
    }

    if (!isMenuOpen) {
      gameMenuTypingGeneration += 1;
      gameMenuMainActions = null;
      gameMenuSubmenuActions = null;
      gameMenu.innerHTML = "";
      return;
    }

    const typingGeneration = gameMenuTypingGeneration + 1;
    gameMenuTypingGeneration = typingGeneration;
    const typingTargets: GameMenuTypingTarget[] = [];

    if (gameMenuMainActions === null || gameMenuSubmenuActions === null) {
      gameMenu.innerHTML = "";

      const title = document.createElement("div");
      title.className = "game-menu__title";
      title.setAttribute("aria-label", "DELTAV — ORBITAL STRATEGY");
      title.tabIndex = 0;
      applyGameMenuHoverCopy(title, "DELTAV", "ORBITAL STRATEGY");
      typingTargets.push({ element: title, text: "DELTAV — ORBITAL STRATEGY" });

      const columns = document.createElement("div");
      columns.className = "game-menu__columns";

      const submenuActions = document.createElement("div");
      submenuActions.className = "game-menu__actions game-menu__submenu-actions";

      const mainColumn = document.createElement("div");
      mainColumn.className = "game-menu__main-column";

      const mainActions = document.createElement("div");
      mainActions.className = "game-menu__actions game-menu__main-actions";
      mainActions.append(
        createGameMenuAction(
          "PLAY TUTORIAL",
          startTutorialFromGameMenu,
          {
            actionScreen: "main",
            tone: isInGameMenuActive ? "regular" : "bright",
            tooltip: "Begin the guided introduction to movement, production and combat."
          },
          typingTargets
        ),
        createGameMenuAction(
          "WATCH TRAILER",
          playTrailerFromGameMenu,
          {
            actionScreen: "main",
            tone: "soft",
            tooltip: "Watch the trailer sequence inside the DeltaV engine."
          },
          typingTargets
        ),
        createGameMenuAction(
          "WISHLIST ON STEAM",
          openWishlistFromGameMenu,
          {
            actionScreen: "main",
            tone: "dim",
            tooltip:
              deltaVExternalLinks.steamWishlist === null
                ? "Open the Steam section. No official public URL is configured yet."
                : "Open the official DeltaV Steam page in a new tab."
          },
          typingTargets
        ),
        createGameMenuSpacer(),
        createGameMenuAction(
          "NEW GAME",
          () => {
            openUnavailableGameMenuLogbook("new-game");
          },
          {
            actionScreen: "main",
            tone: "dim",
            unavailable: true,
            tooltip:
              "Not active in version 0.7. Open the Logbook to see what the full match mode will include."
          },
          typingTargets
        ),
        createGameMenuAction(
          "PLAYER VS PLAYER",
          () => {
            openUnavailableGameMenuLogbook("player-vs-player");
          },
          {
            actionScreen: "main",
            tone: "dim",
            unavailable: true,
            tooltip:
              "Not active in version 0.7. Open the Logbook to see how matches between human commanders will work."
          },
          typingTargets
        ),
        createGameMenuAction(
          "OPTIONS",
          () => {
            toggleGameMenuSubmenu("options");
          },
          {
            actionScreen: "options",
            tone: "soft",
            tooltip: "Open audio, display and trajectory presentation settings."
          },
          typingTargets
        ),
        createGameMenuSpacer(),
        createGameMenuAction(
          "QUIT",
          () => {
            toggleGameMenuSubmenu("quit");
          },
          {
            actionScreen: "quit",
            tone: "dim",
            tooltip: "Open the command used to close this window."
          },
          typingTargets
        )
      );

      mainColumn.append(title, mainActions);
      columns.append(submenuActions, mainColumn);
      gameMenu.append(columns);
      gameMenuMainActions = mainActions;
      gameMenuSubmenuActions = submenuActions;
    }

    syncGameMenuMainActionSelection();
    renderGameMenuSubmenu(typingTargets);

    if (typingTargets.length > 0) {
      void typeGameMenuTargetsSequentially(typingTargets, typingGeneration);
    }
  }

  function syncGameMenuMainActionSelection(): void {
    for (const action of gameMenuMainActions?.querySelectorAll<HTMLButtonElement>(
      ".game-menu__action"
    ) ?? []) {
      const screen = action.dataset["screen"];
      action.classList.toggle("is-selected", screen !== "main" && screen === gameMenuScreen);
    }
  }

  function openUnavailableGameMenuLogbook(mode: "new-game" | "player-vs-player"): void {
    if (mode === "new-game") {
      commandGlossaryController.openContextualLogbook({
        id: "game-menu-new-game",
        label: "NEW GAME / CURRENTLY INACTIVE",
        detail: [
          "NEW GAME will be the route into a complete match without tutorial guidance. It will open the match setup, where faction count and planning time can be chosen before entering the full Solar System.",
          "This mode is currently inactive in version 0.7. PLAY TUTORIAL is the available way to play this build."
        ]
      });
      return;
    }

    commandGlossaryController.openContextualLogbook({
      id: "game-menu-player-vs-player",
      label: "PLAYER VS PLAYER / CURRENTLY INACTIVE",
      detail: [
        "PLAYER VS PLAYER will put human commanders on opposite sides of the same orbital war. Each side will plan movement, production and combat, then watch those orders resolve together.",
        "This mode is currently inactive in version 0.7. Online matches and matchmaking are not available yet."
      ]
    });
  }

  function renderGameMenuSubmenu(typingTargets: GameMenuTypingTarget[]): void {
    const submenuActions = gameMenuSubmenuActions;

    if (submenuActions === null) {
      return;
    }

    submenuActions.innerHTML = "";
    gameMenuFullscreenAction = null;
    submenuActions.dataset["screen"] = gameMenuScreen;

    if (gameMenuScreen === "new-game") {
      appendGameMenuNewGameOptions(submenuActions, typingTargets);
    } else if (gameMenuScreen === "options") {
      appendGameMenuOptions(submenuActions, typingTargets);
    } else if (gameMenuScreen === "quit") {
      submenuActions.append(
        createGameMenuAction(
          "CLOSE WINDOW",
          () => {
            window.close();
          },
          {
            tone: "dim",
            tooltip: "Close the DeltaV browser tab or window."
          },
          typingTargets
        )
      );
    }
  }

  function toggleGameMenuSubmenu(screen: Exclude<GameMenuScreen, "main">): void {
    gameMenuScreen = gameMenuScreen === screen ? "main" : screen;
    renderGameMenu();
  }

  function hideDebugUiAndMainMenuForMatchStart(): void {
    if (isGameMenuOpen()) {
      stopGameMenuDemo();
    }

    header.classList.add("is-hidden");
    debugToggleButton.setAttribute("aria-expanded", "false");
    debugToggleButton.classList.add("is-hidden");
  }

  function appendGameMenuNewGameOptions(
    actions: HTMLElement,
    typingTargets: GameMenuTypingTarget[]
  ): void {
    const timerAction = createGameMenuAction(
      getGameMenuNewGameTimerLabel(),
      (action) => {
        if (isTrailerModeActive || isGameMenuNewGameAiMode()) {
          return;
        }

        gameMenuNewGameTimerSeconds = gameMenuNewGameTimerSeconds === 90 ? 10 : 90;
        typeGameMenuAction(action, getGameMenuNewGameTimerLabel());
      },
      {
        tone: "regular",
        tooltipLabel: "PLANNING TIMER",
        tooltip: "Toggle the human planning limit between 90 and 10 seconds."
      },
      typingTargets
    );
    timerAction.disabled = isTrailerModeActive || isGameMenuNewGameAiMode();

    const modeAction = createGameMenuAction(
      getGameMenuModeLabel(),
      (action) => {
        gameMenuNewGameMode = getNextGameMenuNewGameMode();
        typeGameMenuAction(action, getGameMenuModeLabel());
        timerAction.disabled = isTrailerModeActive || isGameMenuNewGameAiMode();
        typeGameMenuAction(timerAction, getGameMenuNewGameTimerLabel());
      },
      {
        tone: "soft",
        tooltipLabel: "FACTIONS",
        tooltip: "Cycle between two-faction, three-faction and AI demonstration matches."
      },
      typingTargets
    );
    modeAction.classList.add("game-menu__action--nowrap");

    actions.append(
      modeAction,
      timerAction,
      createGameMenuAction(
        "START GAME",
        startConfiguredGameFromMenu,
        {
          tone: "bright",
          tooltip: "Start a new match with the displayed configuration."
        },
        typingTargets
      )
    );
  }

  function appendGameMenuOptions(
    actions: HTMLElement,
    typingTargets: GameMenuTypingTarget[]
  ): void {
    const musicAction = createGameMenuAction(
      getGameMenuMusicLabel(),
      toggleGameMenuMusic,
      {
        audioControl: "music",
        tone: "dim",
        tooltipLabel: "MUSIC",
        tooltip: "The current soundtrack is temporarily disabled while its replacement is prepared."
      },
      typingTargets
    );
    musicAction.disabled = isMusicTemporarilyUnavailable;
    const sfxAction = createGameMenuAction(
      getGameMenuSfxLabel(),
      toggleGameMenuSfx,
      {
        audioControl: "sfx",
        tone: isGameMenuSfxEnabled() ? "regular" : "dim",
        tooltipLabel: "SFX",
        tooltip: "Enable or disable interface and game sound effects."
      },
      typingTargets
    );
    const bloomAction = createGameMenuAction(
      getGameMenuBloomLabel(),
      (action) => {
        const currentBloomMode = getGameMenuBloomMode();
        const nextBloomMode =
          currentBloomMode === "high" ? "low" : currentBloomMode === "low" ? "off" : "high";
        uiBloomMode = nextBloomMode === "off" ? "off" : "on";
        lowBloomProfileMode = nextBloomMode === "low" ? "on" : "off";
        cinematicRenderer?.setBloomEnabled(uiBloomMode === "on");
        cinematicRenderer?.setUiBloomEnabled(uiBloomMode === "on");
        cinematicRenderer?.setLowBloomProfileEnabled(lowBloomProfileMode === "on");
        updateCommandConsoleModeControls();
        redraw();
        action.classList.toggle("game-menu__action--regular", nextBloomMode !== "off");
        action.classList.toggle("game-menu__action--dim", nextBloomMode === "off");
        typeGameMenuAction(action, getGameMenuBloomLabel());
      },
      {
        tone: uiBloomMode === "on" ? "regular" : "dim",
        tooltipLabel: "BLOOM",
        tooltip: "Cycle post-processing bloom between HIGH, LOW and OFF."
      },
      typingTargets
    );
    const reflectionsAction = createGameMenuAction(
      getGameMenuReflectionsLabel(),
      (action) => {
        trajectoryReflectionMode =
          trajectoryReflectionMode === "on"
            ? "hover"
            : trajectoryReflectionMode === "hover"
              ? "off"
              : "on";
        window.localStorage.setItem(
          cinematicTrajectoryReflectionModeStorageKey,
          trajectoryReflectionMode
        );
        cinematicRenderer?.setTrajectoryReflectionMode(trajectoryReflectionMode);
        action.classList.toggle("game-menu__action--bright", trajectoryReflectionMode === "on");
        action.classList.toggle("game-menu__action--regular", trajectoryReflectionMode === "hover");
        action.classList.toggle("game-menu__action--dim", trajectoryReflectionMode === "off");
        typeGameMenuAction(action, getGameMenuReflectionsLabel());
      },
      {
        tone:
          trajectoryReflectionMode === "on"
            ? "bright"
            : trajectoryReflectionMode === "hover"
              ? "regular"
              : "dim",
        tooltipLabel: "REFLECTIONS",
        tooltip: "Cycle trajectory-plane reflections between ON, HOVER and OFF."
      },
      typingTargets
    );
    reflectionsAction.classList.add("game-menu__action--nowrap");
    const accentsAction = createGameMenuAction(
      getGameMenuAccentsLabel(),
      (action) => {
        const nextAccentsMode = getNextGameMenuAccentsMode();
        setGameMenuAccentsMode(nextAccentsMode);
        action.classList.toggle("game-menu__action--bright", nextAccentsMode === "on");
        action.classList.toggle(
          "game-menu__action--regular",
          nextAccentsMode === "burn" || nextAccentsMode === "fire"
        );
        action.classList.toggle("game-menu__action--dim", nextAccentsMode === "off");
        typeGameMenuAction(action, getGameMenuAccentsLabel());
      },
      {
        tone:
          getGameMenuAccentsMode() === "on"
            ? "bright"
            : getGameMenuAccentsMode() === "off"
              ? "dim"
              : "regular",
        tooltipLabel: "ACCENTS",
        tooltip: "Cycle trajectory accents between all, burn-only, fire-only and off."
      },
      typingTargets
    );
    const fullscreenAction = createGameMenuAction(
      getGameMenuFullscreenLabel(),
      (action) => {
        void toggleGameMenuFullscreen(action);
      },
      {
        tone: document.fullscreenElement === null ? "regular" : "bright",
        tooltipLabel: "DISPLAY MODE",
        tooltip: document.fullscreenEnabled
          ? "Switch the browser between windowed and fullscreen display."
          : "This browser does not expose fullscreen mode."
      },
      typingTargets
    );
    fullscreenAction.disabled = !document.fullscreenEnabled;
    gameMenuFullscreenAction = fullscreenAction;
    const brightnessControl = createGameMenuBrightnessControl(typingTargets);
    actions.append(
      musicAction,
      sfxAction,
      bloomAction,
      reflectionsAction,
      accentsAction,
      fullscreenAction,
      brightnessControl
    );
  }

  function getGameMenuFullscreenLabel(): string {
    return document.fullscreenElement === null ? "DISPLAY WINDOWED" : "DISPLAY FULLSCREEN";
  }

  async function toggleGameMenuFullscreen(action: HTMLButtonElement): Promise<void> {
    action.disabled = true;

    try {
      if (document.fullscreenElement === null) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      status.textContent =
        error instanceof Error
          ? `Fullscreen unavailable: ${error.message}`
          : "Fullscreen unavailable.";
    } finally {
      syncGameMenuFullscreenAction();
    }
  }

  function syncGameMenuFullscreenAction(): void {
    const action = gameMenuFullscreenAction;
    if (action === null || !action.isConnected) {
      return;
    }

    action.disabled = !document.fullscreenEnabled;
    action.classList.toggle("game-menu__action--bright", document.fullscreenElement !== null);
    action.classList.toggle("game-menu__action--regular", document.fullscreenElement === null);
    typeGameMenuAction(action, getGameMenuFullscreenLabel());
  }

  function createGameMenuBrightnessControl(
    typingTargets: GameMenuTypingTarget[]
  ): HTMLLabelElement {
    const control = document.createElement("label");
    control.className = "game-menu__brightness-control";
    applyGameMenuHoverCopy(control, "BRIGHTNESS", "Set the global display brightness.");

    const readout = document.createElement("span");
    readout.className = "game-menu__brightness-readout";
    readout.setAttribute("aria-hidden", "true");
    typingTargets.push({
      element: readout,
      text: formatDisplayBrightnessLabel(displayBrightness)
    });

    const slider = document.createElement("input");
    slider.type = "range";
    slider.className = "game-menu__brightness-slider";
    slider.min = String(minimumDisplayBrightness);
    slider.max = String(maximumDisplayBrightness);
    slider.step = String(displayBrightnessStep);
    slider.value = String(displayBrightness);
    slider.ariaLabel = "Display brightness";
    slider.setAttribute("aria-valuetext", formatDisplayBrightnessLabel(displayBrightness));
    slider.addEventListener("pointerenter", () => {
      sfxEngine.play("ui.hoverCommand");
    });
    slider.addEventListener("input", () => {
      displayBrightness = normalizeDisplayBrightness(slider.valueAsNumber);
      applyDisplayBrightness(displayBrightness);
      window.localStorage.setItem(displayBrightnessStorageKey, String(displayBrightness));
      slider.setAttribute("aria-valuetext", formatDisplayBrightnessLabel(displayBrightness));
      setGameMenuGlyphText(readout, formatDisplayBrightnessLabel(displayBrightness));
    });
    slider.addEventListener("change", () => {
      sfxEngine.play("ui.select");
    });

    control.append(readout, slider);
    return control;
  }

  function applyDisplayBrightness(value: number): void {
    canvasFrame.style.setProperty("--display-brightness", String(value));
  }

  function toggleGameMenuMusic(action: HTMLButtonElement): void {
    action.disabled = true;
    void toggleMusic().finally(() => {
      if (!action.isConnected) {
        return;
      }

      syncGameMenuAudioAction(action, getGameMenuMusicLabel(), isMusicEnabled);
    });
  }

  function toggleGameMenuSfx(action: HTMLButtonElement): void {
    action.disabled = true;
    void toggleSfxFromGameMenu().finally(() => {
      if (!action.isConnected) {
        return;
      }

      syncGameMenuAudioAction(action, getGameMenuSfxLabel(), isGameMenuSfxEnabled());
    });
  }

  function syncGameMenuAudioAction(
    action: HTMLButtonElement,
    label: string,
    isEnabled: boolean
  ): void {
    action.disabled = false;
    action.classList.toggle("game-menu__action--regular", isEnabled);
    action.classList.toggle("game-menu__action--dim", !isEnabled);
    typeGameMenuAction(action, label);
  }

  function createGameMenuAction(
    label: string,
    onClick: (action: HTMLButtonElement, event: MouseEvent) => void,
    options: Readonly<{
      audioControl?: "music" | "sfx";
      selected?: boolean;
      actionScreen?: GameMenuScreen;
      tone?: GameMenuActionTone;
      unavailable?: boolean;
      tooltip?: string;
      tooltipLabel?: string;
    }> = {},
    typingTargets?: GameMenuTypingTarget[]
  ): HTMLButtonElement {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "game-menu__action";
    action.classList.toggle("is-selected", options.selected === true);
    if (options.tone !== undefined) {
      action.classList.add(`game-menu__action--${options.tone}`);
    }
    if (options.unavailable === true) {
      action.classList.add("is-unavailable");
      action.setAttribute("aria-disabled", "true");
    }
    action.dataset["screen"] = options.actionScreen ?? "";
    if (options.audioControl !== undefined) {
      action.dataset["menuAudioControl"] = options.audioControl;
    }
    action.setAttribute("aria-label", label);
    if (options.tooltip !== undefined) {
      applyGameMenuHoverCopy(action, options.tooltipLabel ?? label, options.tooltip);
    }
    if (typingTargets === undefined) {
      setGameMenuGlyphText(action, label);
    } else {
      typingTargets.push({ element: action, text: label });
    }
    action.addEventListener("pointerenter", () => {
      sfxEngine.play("ui.hoverCommand");
    });
    action.addEventListener("click", (event) => {
      onClick(action, event);
    });
    return action;
  }

  function createGameMenuSpacer(): HTMLDivElement {
    const spacer = document.createElement("div");
    spacer.className = "game-menu__spacer";
    spacer.setAttribute("aria-hidden", "true");
    return spacer;
  }

  function applyGameMenuHoverCopy(element: HTMLElement, label: string, text: string): void {
    element.classList.add("game-menu__tooltip-target");
    element.dataset["glossaryHoverLabel"] = label;
    element.dataset["glossaryHoverText"] = text;
  }

  async function typeGameMenuTargetsSequentially(
    targets: readonly GameMenuTypingTarget[],
    generation: number
  ): Promise<void> {
    for (const target of targets) {
      if (generation !== gameMenuTypingGeneration || !isGameMenuOpen()) {
        return;
      }

      await typeGameMenuTarget(target, generation);
    }
  }

  function typeGameMenuAction(element: HTMLElement, text: string): void {
    element.setAttribute("aria-label", text);
    void typeGameMenuTarget({ element, text }, gameMenuTypingGeneration);
  }

  function setGameMenuGlyphText(element: HTMLElement, text: string): void {
    const glyphs = Array.from(text, (character) => {
      if (character === " ") {
        return document.createTextNode(character);
      }

      const glyph = document.createElement("span");
      glyph.className = "game-menu__glyph";
      glyph.setAttribute("aria-hidden", "true");
      glyph.textContent = character;
      return glyph;
    });
    element.replaceChildren(...glyphs);
  }

  function typeGameMenuTarget(target: GameMenuTypingTarget, generation: number): Promise<void> {
    const { element, text } = target;
    const durationMs = clampNumber(
      text.length * commandTypewriterMsPerCharacter,
      commandTypewriterMinDurationMs,
      commandTypewriterMaxDurationMs
    );
    const startedAt = performance.now();
    const typingToken = (Number(element.dataset["typingToken"] ?? "0") || 0) + 1;
    element.dataset["typingToken"] = String(typingToken);
    const menuCursor = document.createElement("span");
    menuCursor.className = "command-console__type-cursor";
    element.classList.add("game-menu__typing");
    element.textContent = "";
    element.append(menuCursor);

    return new Promise((resolve) => {
      const finish = () => {
        if (
          generation === gameMenuTypingGeneration &&
          element.isConnected &&
          element.dataset["typingToken"] === String(typingToken)
        ) {
          setGameMenuGlyphText(element, text);
          element.classList.remove("game-menu__typing");
        }
        resolve();
      };

      const typeNextFrame = () => {
        const isCurrentTarget = element.dataset["typingToken"] === String(typingToken);

        if (generation !== gameMenuTypingGeneration || !element.isConnected || !isCurrentTarget) {
          menuCursor.remove();
          if (element.isConnected && isCurrentTarget) {
            setGameMenuGlyphText(element, text);
            element.classList.remove("game-menu__typing");
          }
          resolve();
          return;
        }

        const progress = clampNumber((performance.now() - startedAt) / durationMs, 0, 1);
        const visibleCharacters = Math.min(
          text.length,
          Math.max(1, Math.floor(progress * text.length))
        );
        element.textContent = text.slice(0, visibleCharacters);
        element.append(menuCursor);

        if (visibleCharacters >= text.length) {
          finish();
          return;
        }

        window.requestAnimationFrame(typeNextFrame);
      };

      window.requestAnimationFrame(typeNextFrame);
    });
  }

  function startTutorialFromGameMenu(): void {
    window.dispatchEvent(new CustomEvent("deltav:gameplay-entered"));
    stopGameMenuDemo();

    const waitForCurrentTurn = (): void => {
      if (isTurnTransitionActive || isCommandConsoleResolving) {
        window.setTimeout(waitForCurrentTurn, 40);
        return;
      }

      void startTutorialSegment01();
    };

    waitForCurrentTurn();
  }

  function playTrailerFromGameMenu(): void {
    window.dispatchEvent(new CustomEvent("deltav:gameplay-entered"));
    void activateTrailerCapture();
  }

  function openWishlistFromGameMenu(): void {
    if (deltaVExternalLinks.steamWishlist !== null) {
      window.open(deltaVExternalLinks.steamWishlist, "_blank", "noopener,noreferrer");
      return;
    }

    navigateToSiteSection("steam");
  }

  function navigateToSiteSection(target: "player-vs-player" | "steam"): void {
    if (!document.body.classList.contains("is-deltav-site")) {
      status.textContent =
        target === "steam"
          ? "No official Steam URL is configured yet."
          : "PLAYER VS PLAYER is a planned network expansion; the public service is not available yet.";
      return;
    }

    window.dispatchEvent(new CustomEvent("deltav:site-navigate", { detail: { target } }));
  }

  function startConfiguredGameFromMenu(): void {
    const mode = getGameMenuGameModeId();
    const isAiShowcaseMode = isGameMenuNewGameAiMode();
    const timerDurationMs = gameMenuNewGameTimerSeconds * 1000;

    if (isAiShowcaseMode) {
      enableTrailerPresentationMode();
    }

    window.dispatchEvent(new CustomEvent("deltav:gameplay-entered"));
    stopGameMenuDemo();

    const waitForCurrentTurn = (): void => {
      if (isTurnTransitionActive || isCommandConsoleResolving) {
        window.setTimeout(waitForCurrentTurn, 40);
        return;
      }

      planningTimerMode = isTrailerModeActive ? "zero" : "auto";
      planningTimerDurationOverrideMs = isTrailerModeActive
        ? trailerModePlanningTimerDurationMs
        : timerDurationMs;
      hasConsumedZeroTimerInitialCountdown = true;
      clearZeroTimerAutoRestart();

      if (selectedMapPreset.procedural === true) {
        resetNewGameWithAutomaticProceduralMap(mode, isTrailerModeActive);
      } else if (isTrailerModeActive) {
        resetDebugAiMode(mode);
      } else {
        resetDebugGameMode(mode);
      }
    };

    waitForCurrentTurn();
  }

  function resetNewGameWithAutomaticProceduralMap(
    mode: MultiFactionGameModeId,
    allAiControlled = false
  ): void {
    const requestedSeed = createProceduralMapSeed();
    const automaticMap = createAutomaticProceduralMapForSeed(selectedMapPreset, requestedSeed);

    installAutomaticProceduralMap(mode, automaticMap, allAiControlled, "new-game");
  }

  async function resetAiBatchWithAutomaticProceduralMap(
    mode: MultiFactionGameModeId
  ): Promise<void> {
    const automaticMap = await createNextAiAutorunProceduralMap(selectedMapPreset);

    installAutomaticProceduralMap(mode, automaticMap, true, "ai-vs-ai-batch-start");
  }

  function installAutomaticProceduralMap(
    mode: MultiFactionGameModeId,
    automaticMap: ProceduralBatchMapGeneration,
    allAiControlled: boolean,
    logContext: "new-game" | "ai-vs-ai-batch-start"
  ): void {
    proceduralSeed = automaticMap.finalEffectiveMapSeed;
    proceduralSeedInput.value = proceduralSeed;
    contentByPresetKey.set(
      getPresetCacheKey(selectedMapPreset, automaticMap.finalEffectiveMapSeed),
      automaticMap.generation.content
    );
    proceduralGenerationBySeed.set(
      getProceduralGenerationCacheKeyForPreset(
        selectedMapPreset,
        automaticMap.finalEffectiveMapSeed
      ),
      automaticMap.generation
    );
    content = automaticMap.generation.content;
    currentProceduralDebug = automaticMap.generation.debug;
    currentAutomaticProceduralMapAudit = createAutomaticProceduralMapAudit(automaticMap);
    debugAiStrategyProfiles = {};
    const initialState = createInitialStateForGameModeAndMap(
      mode,
      selectedMapPreset,
      content,
      automaticMap.generation
    );
    const nextState = allAiControlled ? withAiControlledFactions(initialState) : initialState;
    state = appendStartStateAudit(
      nextState,
      allAiControlled
        ? {
            controllerOverrides: createControllerAuditOverrides(nextState)
          }
        : undefined
    );
    snapshot = createSolarSystemSnapshot(content, state);
    captureCurrentMapIdentity(automaticMap.requestedSeed, automaticMap.finalEffectiveMapSeed);
    console.info("AUTOMATIC_PROCEDURAL_MAP_GENERATION", {
      context: logContext,
      ...currentAutomaticProceduralMapAudit,
      mapGameplayHash: currentMapGameplayHash
    });
    resetRuntimeAfterGameReset();
    revealCommandConsoleForActiveGame();
  }

  function getGameMenuNewGameTimerLabel(): string {
    if (isTrailerModeActive || isGameMenuNewGameAiMode()) {
      return `TIMER ${trailerModePlanningTimerLabel}`;
    }

    return `TIMER ${gameMenuNewGameTimerSeconds}`;
  }

  function getNextGameMenuNewGameMode(): GameMenuNewGameMode {
    if (gameMenuNewGameMode === "2-factions") {
      return "3-factions";
    }

    if (gameMenuNewGameMode === "3-factions") {
      return "ai-vs-ai";
    }

    return gameMenuNewGameMode === "ai-vs-ai" ? "ai-vs-ai-vs-ai" : "2-factions";
  }

  function getGameMenuModeLabel(): string {
    if (gameMenuNewGameMode === "2-factions") {
      return "2 FACTIONS";
    }

    if (gameMenuNewGameMode === "3-factions") {
      return "3 FACTIONS";
    }

    return gameMenuNewGameMode === "ai-vs-ai" ? "AI VS AI" : "AI VS AI VS AI";
  }

  function getGameMenuGameModeId(): MultiFactionGameModeId {
    return gameMenuNewGameMode === "2-factions" || gameMenuNewGameMode === "ai-vs-ai" ? "2p" : "3p";
  }

  function isGameMenuNewGameAiMode(): boolean {
    return gameMenuNewGameMode === "ai-vs-ai" || gameMenuNewGameMode === "ai-vs-ai-vs-ai";
  }

  function getGameMenuBloomLabel(): string {
    const mode = getGameMenuBloomMode();

    if (mode === "high") {
      return "BLOOM HIGH";
    }

    if (mode === "low") {
      return "BLOOM LOW";
    }

    return "BLOOM OFF";
  }

  function getGameMenuBloomMode(): "high" | "low" | "off" {
    if (uiBloomMode === "off") {
      return "off";
    }

    return lowBloomProfileMode === "on" ? "low" : "high";
  }

  function getGameMenuReflectionsLabel(): string {
    if (trajectoryReflectionMode === "hover") {
      return "REFLECTIONS HOVER";
    }

    return trajectoryReflectionMode === "on" ? "REFLECTIONS ON" : "REFLECTIONS OFF";
  }

  function getGameMenuAccentsMode(): GameMenuAccentsMode {
    if (burnPreviewEffectsMode === "on" && firePreviewEffectsMode === "on") {
      return "on";
    }

    if (burnPreviewEffectsMode === "on") {
      return "burn";
    }

    return firePreviewEffectsMode === "on" ? "fire" : "off";
  }

  function getNextGameMenuAccentsMode(): GameMenuAccentsMode {
    const mode = getGameMenuAccentsMode();

    if (mode === "on") {
      return "burn";
    }

    if (mode === "burn") {
      return "fire";
    }

    return mode === "fire" ? "off" : "on";
  }

  function setGameMenuAccentsMode(mode: GameMenuAccentsMode): void {
    burnPreviewEffectsMode = mode === "on" || mode === "burn" ? "on" : "off";
    firePreviewEffectsMode = mode === "on" || mode === "fire" ? "on" : "off";
    cinematicRenderer?.setBurnPreviewEffectsEnabled(burnPreviewEffectsMode === "on");
    cinematicRenderer?.setFirePreviewEffectsEnabled(firePreviewEffectsMode === "on");
    updateCommandConsoleModeControls();
    redraw();
  }

  function getGameMenuAccentsLabel(): string {
    return `ACCENTS ${getGameMenuAccentsMode().toUpperCase()}`;
  }

  function getGameMenuMusicLabel(): string {
    if (isMusicTemporarilyUnavailable) {
      return "MUSIC UNAVAILABLE";
    }

    return isMusicEnabled ? "MUSIC ON" : "MUSIC OFF";
  }

  function getGameMenuSfxLabel(): string {
    return isGameMenuSfxEnabled() ? "SFX ON" : "SFX OFF";
  }

  function isGameMenuSfxEnabled(): boolean {
    const settings = sfxEngine.currentSettings;
    return settings.enabled && !settings.muted;
  }

  function formatPlanningCountdown(ms: number): string {
    const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  function applyServerPlanningClock(detail: MultiplayerPlanningClockDetail): void {
    if (detail.turn !== state.turn) {
      return;
    }

    if (detail.serverNowEpochMs !== undefined) {
      serverPlanningClockOffsetMs = detail.serverNowEpochMs - Date.now();
    }

    const serverNowEpochMs = Date.now() + serverPlanningClockOffsetMs;
    const deadlineAtMs =
      detail.deadlineEpochMs === undefined
        ? planningTimerState.deadlineAtMs
        : performance.now() + Math.max(0, detail.deadlineEpochMs - serverNowEpochMs);
    planningTimerState = {
      phase: detail.phase ?? planningTimerState.phase,
      turn: detail.turn,
      deadlineAtMs,
      executeCountdownEndsAtMs:
        detail.phase === "executeCountdown"
          ? performance.now() + getPlanningExecuteCountdownDurationMs()
          : planningTimerState.executeCountdownEndsAtMs,
      authority: "server",
      lockedFactionIds: new Set(detail.lockedFactionIds ?? [...planningTimerState.lockedFactionIds])
    };
    renderPlanningTimerPanel();
    startPlanningTimerLoop();
    updateInteractionLocks();
  }

  function handleMultiplayerPlanningClockEvent(event: Event): void {
    const customEvent = event as CustomEvent<MultiplayerPlanningClockDetail>;

    if (customEvent.detail === undefined) {
      return;
    }

    applyServerPlanningClock(customEvent.detail);
  }

  function syncFactionColorVariables(): void {
    for (const faction of getActiveFactions(state)) {
      commandConsole.style.setProperty(
        `--faction-${faction.id.replace("_", "-")}-color`,
        faction.color
      );
    }
  }

  function updateCommandConsoleModeControls(): void {
    const isTutorialActive = tutorialState !== null;
    beautyModeButton.textContent = isBeautyModeActive ? "BEAUTY ON" : "BEAUTY MODE";
    commandInputHintsButton.textContent = commandInputHintsMode === "on" ? "HINTS ON" : "HINTS OFF";
    planningTimerButton.textContent = getPlanningTimerButtonText();
    beatSyncButton.textContent = beatSyncMode === "on" ? "BEAT ON" : "BEAT OFF";
    performanceDiagnosticsButton.textContent =
      performanceDiagnosticsMode === "on" ? "PERF ON" : "PERF OFF";
    burnPreviewEffectsButton.textContent =
      burnPreviewEffectsMode === "on" ? "BURN FX ON" : "BURN FX OFF";
    firePreviewEffectsButton.textContent =
      firePreviewEffectsMode === "on" ? "FIRE FX ON" : "FIRE FX OFF";
    solarHazeButton.textContent = solarHazeMode === "on" ? "SOLAR HAZE ON" : "SOLAR HAZE OFF";
    solarOcclusionButton.textContent =
      solarOcclusionMode === "on" ? "OCCLUSION ON" : "OCCLUSION OFF";
    atmosphericScatteringButton.textContent =
      atmosphericScatteringMode === "on" ? "ATMOSPHERE ON" : "ATMOSPHERE OFF";
    compactSunBloomButton.textContent =
      compactSunBloomMode === "on" ? "SUN PASS ON" : "SUN PASS OFF";
    uiBloomButton.textContent = uiBloomMode === "on" ? "BLOOM ON" : "BLOOM OFF";
    lowBloomProfileButton.textContent = lowBloomProfileMode === "on" ? "BLOOM LOW" : "BLOOM HIGH";
    heatDistortionButton.textContent =
      heatDistortionMode === "on" ? "HEAT DISTORT ON" : "HEAT DISTORT OFF";
    tutorialOverlayTextButton.textContent =
      tutorialOverlayTextMode === "on" ? "TUTORIAL TEXT ON" : "TUTORIAL TEXT OFF";
    tutorialOverlayBlinkButton.textContent =
      tutorialOverlayBlinkMode === "on" ? "CONTEXT BLINK ON" : "CONTEXT BLINK OFF";
    commandConsole.classList.toggle("is-tutorial", isTutorialActive);
    beautyModeButton.classList.toggle("is-active", isBeautyModeActive);
    commandInputHintsButton.setAttribute(
      "aria-pressed",
      commandInputHintsMode === "on" ? "true" : "false"
    );
    beautyModeButton.setAttribute("aria-pressed", isBeautyModeActive ? "true" : "false");
    planningTimerButton.classList.toggle("is-active", planningTimerMode !== "auto");
    beatSyncButton.classList.toggle("is-active", beatSyncMode === "on");
    performanceDiagnosticsButton.classList.toggle("is-active", performanceDiagnosticsMode === "on");
    burnPreviewEffectsButton.classList.toggle("is-active", burnPreviewEffectsMode === "on");
    firePreviewEffectsButton.classList.toggle("is-active", firePreviewEffectsMode === "on");
    solarHazeButton.classList.toggle("is-active", solarHazeMode === "on");
    solarOcclusionButton.classList.toggle("is-active", solarOcclusionMode === "on");
    atmosphericScatteringButton.classList.toggle("is-active", atmosphericScatteringMode === "on");
    compactSunBloomButton.classList.toggle("is-active", compactSunBloomMode === "on");
    uiBloomButton.classList.toggle("is-active", uiBloomMode === "on");
    lowBloomProfileButton.classList.toggle("is-active", lowBloomProfileMode === "on");
    heatDistortionButton.classList.toggle("is-active", heatDistortionMode === "on");
    planningTimerButton.setAttribute(
      "aria-pressed",
      planningTimerMode !== "auto" ? "true" : "false"
    );
    beatSyncButton.setAttribute("aria-pressed", beatSyncMode === "on" ? "true" : "false");
    performanceDiagnosticsButton.setAttribute(
      "aria-pressed",
      performanceDiagnosticsMode === "on" ? "true" : "false"
    );
    burnPreviewEffectsButton.setAttribute(
      "aria-pressed",
      burnPreviewEffectsMode === "on" ? "true" : "false"
    );
    firePreviewEffectsButton.setAttribute(
      "aria-pressed",
      firePreviewEffectsMode === "on" ? "true" : "false"
    );
    solarHazeButton.setAttribute("aria-pressed", solarHazeMode === "on" ? "true" : "false");
    solarOcclusionButton.setAttribute(
      "aria-pressed",
      solarOcclusionMode === "on" ? "true" : "false"
    );
    atmosphericScatteringButton.setAttribute(
      "aria-pressed",
      atmosphericScatteringMode === "on" ? "true" : "false"
    );
    compactSunBloomButton.setAttribute(
      "aria-pressed",
      compactSunBloomMode === "on" ? "true" : "false"
    );
    uiBloomButton.setAttribute("aria-pressed", uiBloomMode === "on" ? "true" : "false");
    lowBloomProfileButton.setAttribute(
      "aria-pressed",
      lowBloomProfileMode === "on" ? "true" : "false"
    );
    heatDistortionButton.setAttribute(
      "aria-pressed",
      heatDistortionMode === "on" ? "true" : "false"
    );
    tutorialOverlayTextButton.classList.toggle("is-active", tutorialOverlayTextMode === "on");
    tutorialOverlayBlinkButton.classList.toggle("is-active", tutorialOverlayBlinkMode === "on");
    tutorialOverlayTextButton.setAttribute(
      "aria-pressed",
      tutorialOverlayTextMode === "on" ? "true" : "false"
    );
    tutorialOverlayBlinkButton.setAttribute(
      "aria-pressed",
      tutorialOverlayBlinkMode === "on" ? "true" : "false"
    );
    commandModeLabel.textContent = "";
  }

  function getPlanningTimerButtonText(): string {
    switch (planningTimerMode) {
      case "two":
        return "TIMER 2 SEC";
      case "ten":
        return "TIMER 10 SEC";
      case "twenty":
        return "TIMER 20 SEC";
      case "zero":
        return "TIMER 0 SEC";
      case "auto":
        if (planningTimerDurationOverrideMs !== null) {
          return `TIMER ${Math.round(planningTimerDurationOverrideMs / 1000)} SEC`;
        }
        return "TIMER AUTO";
    }
  }

  function getNextPlanningTimerMode(): PlanningTimerMode {
    switch (planningTimerMode) {
      case "auto":
        return "two";
      case "two":
        return "ten";
      case "ten":
        return "twenty";
      case "twenty":
        return "zero";
      case "zero":
        return "auto";
    }
  }

  function isBeatSyncEnabled(): boolean {
    return beatSyncMode === "on";
  }

  function isPerformanceDiagnosticsEnabled(): boolean {
    return performanceDiagnosticsMode === "on";
  }

  function syncPerformanceDiagnosticsCountersEnabled(): void {
    setSimulationPerformanceCountersEnabled(isPerformanceDiagnosticsEnabled());
    resetBrowserPerformanceCounters();
    flushSimulationPerformanceCounters();
  }

  function resetBrowserPerformanceCounters(now = performance.now()): void {
    browserPerformanceCounters = createBrowserPerformanceCounterRecord();
    browserPerformanceCounterSampleStartedAt = now;
    lastPerformanceCounterRates = createPerformanceCounterRateRecord();
  }

  function recordBrowserPerformanceCounter(name: BrowserPerformanceCounterName): void {
    if (!isPerformanceDiagnosticsEnabled()) {
      return;
    }

    browserPerformanceCounters[name] += 1;
  }

  function samplePerformanceCounterRates(now: number): void {
    if (!isPerformanceDiagnosticsEnabled()) {
      resetBrowserPerformanceCounters(now);
      flushSimulationPerformanceCounters();
      return;
    }

    const elapsedSeconds = Math.max(0.001, (now - browserPerformanceCounterSampleStartedAt) / 1000);
    const simulationCounts = flushSimulationPerformanceCounters();
    lastPerformanceCounterRates = {
      getCommandWarnings: browserPerformanceCounters.getCommandWarnings / elapsedSeconds,
      syncNodePresentation: browserPerformanceCounters.syncNodePresentation / elapsedSeconds,
      evaluateFactionRecoveryPath: simulationCounts.evaluateFactionRecoveryPath / elapsedSeconds,
      getAiSolvencyTritiumCountAudits:
        simulationCounts.getAiSolvencyTritiumCountAudits / elapsedSeconds,
      calculateBurnPlan: simulationCounts.calculateBurnPlan / elapsedSeconds,
      calculateBurnPlanFromPosition: simulationCounts.calculateBurnPlanFromPosition / elapsedSeconds
    };
    browserPerformanceCounters = createBrowserPerformanceCounterRecord();
    browserPerformanceCounterSampleStartedAt = now;
  }

  function updateMusicButton(): void {
    if (isMusicTemporarilyUnavailable) {
      isMusicEnabled = false;
      cancelMusicAutoplayUnlock();
      musicEngine.stop();
      musicButton.textContent = "Music Unavailable";
      musicButton.disabled = true;
      musicButton.classList.remove("is-active");
      musicButton.setAttribute("aria-pressed", "false");
      return;
    }

    if (!musicEngine.isSupported) {
      musicButton.textContent = "Music N/A";
      musicButton.disabled = true;
      musicButton.classList.remove("is-active");
      musicButton.setAttribute("aria-pressed", "false");
      return;
    }

    const isMusicActive = isMusicEnabled;
    musicButton.textContent =
      isMusicEnabled && musicEngine.isAutoplayPending
        ? "Music Pending"
        : isMusicEnabled
          ? "Music On"
          : "Music Off";
    musicButton.disabled = false;
    musicButton.classList.toggle("is-active", isMusicActive);
    musicButton.setAttribute("aria-pressed", isMusicActive ? "true" : "false");
  }

  function updateSfxButton(): void {
    if (!sfxEngine.isSupported) {
      sfxButton.textContent = "SFX N/A";
      sfxButton.disabled = true;
      sfxButton.classList.remove("is-active");
      sfxButton.setAttribute("aria-pressed", "false");
      return;
    }

    const settings = sfxEngine.currentSettings;
    const isActive = settings.enabled && !settings.muted;
    const isPendingUnlock = isActive && !sfxEngine.isUnlocked;
    sfxButton.textContent = !settings.enabled
      ? "SFX Off"
      : settings.muted
        ? "SFX Muted"
        : isPendingUnlock
          ? "SFX Pending"
          : settings.zenMode
            ? "SFX Zen"
            : "SFX On";
    sfxButton.disabled = false;
    sfxButton.classList.toggle("is-active", isActive);
    sfxButton.setAttribute("aria-pressed", isActive ? "true" : "false");
    sfxButton.title = sfxEngine.debugState;
  }

  function startFpsCounter(): void {
    if (fpsCounterFrame !== null) {
      return;
    }

    fpsCounterSampleStartedAt = performance.now();
    fpsCounterFrames = 0;
    fpsCounterLastFrameAt = null;
    fpsCounterPacingWindowStartedAt = fpsCounterSampleStartedAt;
    fpsCounterLongestFrameMs = 0;
    fpsCounterFramesOver20Ms = 0;
    fpsCounterFramesOver30Ms = 0;
    fpsCounterFrame = window.requestAnimationFrame(updateFpsCounter);
  }

  function updateFpsCounter(now: number): void {
    recordFpsCounterFramePacing(now);
    syncBeatSynchronizedCssAnimations(now);
    fpsCounterFrames += 1;
    const sampleMs = now - fpsCounterSampleStartedAt;

    if (sampleMs >= fpsCounterSampleWindowMs) {
      const sampleFps = (fpsCounterFrames * 1000) / Math.max(1, sampleMs);
      samplePerformanceCounterRates(now);
      smoothedFps =
        smoothedFps <= 0
          ? sampleFps
          : smoothedFps * (1 - fpsCounterSmoothing) + sampleFps * fpsCounterSmoothing;
      lastCinematicPerformanceStats = isPerformanceDiagnosticsEnabled()
        ? (cinematicRenderer?.getPerformanceStats() ?? null)
        : null;
      fpsCounterSampleStartedAt = now;
      fpsCounterFrames = 0;

      // Keep the lightweight FPS probe current even when Trailer Mode hides the debug header.
      // This gives automated capture tests frame-pacing data without making debug UI visible.
      updateDebugFps();

      if (!header.classList.contains("is-hidden") && isPerformanceDiagnosticsEnabled()) {
        updateDebugPanel();
      }
    }

    fpsCounterFrame = window.requestAnimationFrame(updateFpsCounter);
  }

  function recordFpsCounterFramePacing(now: number): void {
    const previousFrameAt = fpsCounterLastFrameAt;
    fpsCounterLastFrameAt = now;

    if (previousFrameAt === null) {
      return;
    }

    const intervalMs = now - previousFrameAt;

    if (intervalMs >= fpsCounterPauseIgnoreMs) {
      fpsCounterPacingWindowStartedAt = now;
      fpsCounterLongestFrameMs = 0;
      fpsCounterFramesOver20Ms = 0;
      fpsCounterFramesOver30Ms = 0;
      return;
    }

    if (now - fpsCounterPacingWindowStartedAt >= fpsCounterPacingWindowMs) {
      fpsCounterPacingWindowStartedAt = now;
      fpsCounterLongestFrameMs = intervalMs;
      fpsCounterFramesOver20Ms = 0;
      fpsCounterFramesOver30Ms = 0;
    } else {
      fpsCounterLongestFrameMs = Math.max(fpsCounterLongestFrameMs, intervalMs);
    }

    if (intervalMs >= 20) {
      fpsCounterFramesOver20Ms += 1;
    }
    if (intervalMs >= 30) {
      fpsCounterFramesOver30Ms += 1;
    }
  }

  function syncBeatSynchronizedCssAnimations(now: number): void {
    const musicPulse = isBeatSyncEnabled() ? musicEngine.getVisualPulse() : null;

    if (musicPulse === null) {
      if (!beatSynchronizedCssAnimationsActive) {
        return;
      }

      beatSynchronizedCssAnimationsActive = false;
      shell.classList.remove("is-beat-synchronized");

      for (const cycle of beatSynchronizedCssCycles) {
        shell.style.removeProperty(cycle.durationProperty);
        shell.style.removeProperty(cycle.phaseProperty);
      }
      return;
    }

    if (!beatSynchronizedCssAnimationsActive) {
      beatSynchronizedCssAnimationsActive = true;
      shell.classList.add("is-beat-synchronized");
    }

    const elapsedSeconds = now / 1000;

    for (const cycle of beatSynchronizedCssCycles) {
      const synchronizedCycle = getBeatSynchronizedCycle(
        elapsedSeconds,
        cycle.baseDurationMs / 1000,
        musicPulse
      );
      shell.style.setProperty(
        cycle.durationProperty,
        `${(synchronizedCycle.cycleSeconds * 1000).toFixed(3)}ms`
      );
      shell.style.setProperty(
        cycle.phaseProperty,
        `${(synchronizedCycle.phase * synchronizedCycle.cycleSeconds * 1000).toFixed(3)}ms`
      );
    }
  }

  function getActiveRecordingCanvas(): HTMLCanvasElement | null {
    if (currentView === "tactical2d") {
      return tacticalCanvas;
    }

    return cinematicFrame.querySelector<HTMLCanvasElement>("canvas.cinematic-canvas");
  }

  function getActiveRecordingAudioSources(): readonly DeltaVDebugRecordingAudioSource[] {
    const sources: DeltaVDebugRecordingAudioSource[] = [];
    const musicStream = musicEngine.captureStream();

    if (musicStream !== null && musicStream.getAudioTracks().length > 0) {
      sources.push({
        label: "music",
        stream: musicStream,
        stop: () => stopMediaStream(musicStream)
      });
    }

    const sfxSource = sfxEngine.createCaptureStream();

    if (sfxSource !== null && sfxSource.stream.getAudioTracks().length > 0) {
      sources.push({
        label: "sfx",
        stream: sfxSource.stream,
        stop: sfxSource.stop
      });
    }

    return sources;
  }

  function updateDebugRecordingUi(): void {
    const isRecording = debugRecorder.isRecording;
    recordButton.textContent = isRecording ? "STOP RECORDING" : "RECORD";
    recordButton.classList.toggle("is-recording", isRecording);
    recordButton.classList.toggle("is-active", isRecording);
    recordButton.disabled = !debugRecorder.isSupported && !isRecording;
    recordButton.setAttribute("aria-pressed", isRecording ? "true" : "false");

    if (isRecording) {
      debugRecordingIndicator.textContent = `REC ${formatDebugRecordingElapsed(
        debugRecorder.elapsedMs
      )}`;
      debugRecordingIndicator.classList.remove("is-hidden");
    } else {
      debugRecordingIndicator.textContent = "";
      debugRecordingIndicator.classList.add("is-hidden");
    }
  }

  function appendDebugRecorderMessage(message: string): void {
    debugRecorderMessages.unshift(`${new Date().toLocaleTimeString()} ${message}`);
    debugRecorderMessages.splice(6);
    updateDebugPanel();
  }

  function appendDebugPanelMessage(message: string): void {
    debugPanelMessages.unshift(`${new Date().toLocaleTimeString()} ${message}`);
    debugPanelMessages.splice(8);
    updateDebugPanel();
  }

  function getEffectiveDebugAiPlanningOptions(): AiPlanningOptions {
    return {
      aiLevel: debugAiLevel === 0 ? 0 : debugAiLevel === 1 ? 1 : 3,
      factionStrategyProfiles: debugAiStrategyProfiles
    };
  }

  function getEffectiveAiPlanningOptions(): AiPlanningOptions {
    const debugOptions = getEffectiveDebugAiPlanningOptions();

    if (tutorialEnemySimpleAiEnabled || tutorialState?.enemySimpleAiEnabled === true) {
      return { ...debugOptions, aiLevel: 1 };
    }

    return debugOptions;
  }

  function isFireVsAiDebugMode(): boolean {
    return (
      debugAiStrategyProfiles.player === "FIRE" && debugAiStrategyProfiles.opponent === "NOFIRE"
    );
  }

  function getDebugAiLevelLabel(level: AiPlanningLevel = debugAiLevel): string {
    if (level === 0) {
      return "0 DEBUG";
    }

    if (level === 1) {
      return "1 SIMPLE";
    }

    if (level === 2) {
      return "2 RESERVED";
    }

    return "3 CURRENT";
  }

  function setDebugAiLevel(requestedLevel: AiPlanningLevel): void {
    if (requestedLevel === 2) {
      debugAiLevel = 3;
      aiLevelSelect.value = "3";
      appendDebugPanelMessage(`AI LEVEL ${requestedLevel} RESERVED - falling back to AI LEVEL 3`);
      return;
    }

    debugAiLevel = requestedLevel === 0 ? 0 : requestedLevel === 1 ? 1 : 3;
    aiLevelSelect.value = String(debugAiLevel);
    appendDebugPanelMessage(`AI LEVEL ${getDebugAiLevelLabel()} selected`);
  }

  function startDebugRecordingTimer(): void {
    if (debugRecordingTimer !== null) {
      return;
    }

    debugRecordingTimer = window.setInterval(() => {
      updateDebugRecordingUi();
      updateDebugPanel();
    }, 250);
  }

  function stopDebugRecordingTimer(): void {
    if (debugRecordingTimer === null) {
      return;
    }

    window.clearInterval(debugRecordingTimer);
    debugRecordingTimer = null;
  }

  async function toggleDebugRecording(): Promise<void> {
    if (debugRecorder.isRecording) {
      await stopDebugRecording();
      return;
    }

    await startDebugRecording();
  }

  async function startDebugRecording(): Promise<void> {
    recordButton.disabled = true;

    try {
      await sfxEngine.unlock();
      const result = await debugRecorder.start();
      startDebugRecordingTimer();
      appendDebugRecorderMessage(
        `RECORDING STARTED ${result.fileName} ${result.mimeType} audio ${result.audioTrackCount}/${result.videoTrackCount}`
      );

      for (const warning of result.warnings) {
        appendDebugRecorderMessage(`RECORDING WARNING ${warning}`);
      }
    } catch (error) {
      appendDebugRecorderMessage(
        `RECORDING FAILED ${error instanceof Error ? error.message : String(error)}`
      );
      sfxEngine.play("system.error");
    } finally {
      updateDebugRecordingUi();
    }
  }

  async function stopDebugRecording(): Promise<void> {
    recordButton.disabled = true;

    try {
      const result = await debugRecorder.stop();
      stopDebugRecordingTimer();
      appendDebugRecorderMessage(
        `RECORDING SAVED ${result.path} ${formatByteSize(result.sizeBytes)} ${result.mimeType}`
      );
      sfxEngine.play("system.save");
    } catch (error) {
      appendDebugRecorderMessage(
        `RECORDING FAILED ${error instanceof Error ? error.message : String(error)}`
      );
      sfxEngine.play("system.error");
    } finally {
      stopDebugRecordingTimer();
      updateDebugRecordingUi();
    }
  }

  function formatByteSize(sizeBytes: number): string {
    if (sizeBytes < 1024 * 1024) {
      return `${Math.max(1, Math.round(sizeBytes / 1024))} KB`;
    }

    return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function cycleSfxMode(): void {
    const settings = sfxEngine.currentSettings;

    if (!settings.enabled || settings.muted) {
      sfxEngine.updateSettings({ enabled: true, muted: false, zenMode: false });
      void sfxEngine.unlock().then(() => {
        sfxEngine.play("ui.toggle");
        updateSfxButton();
      });
    } else if (settings.zenMode) {
      sfxEngine.updateSettings({ muted: true, zenMode: false });
    } else {
      sfxEngine.updateSettings({ zenMode: true });
      sfxEngine.play("ui.toggle");
    }

    updateSfxButton();
  }

  function registerSfxAutoplayUnlock(): void {
    const settings = sfxEngine.currentSettings;

    if (!settings.enabled || settings.muted || sfxAutoplayUnlockHandler !== null) {
      return;
    }

    sfxAutoplayUnlockHandler = (event: Event) => {
      if (isMenuAudioControlEvent(event, "sfx")) {
        return;
      }

      void sfxEngine.unlock().then((unlocked) => {
        if (unlocked) {
          cancelSfxAutoplayUnlock();
        }

        updateSfxButton();
      });
    };

    window.addEventListener("pointerdown", sfxAutoplayUnlockHandler, true);
    window.addEventListener("pointerup", sfxAutoplayUnlockHandler, true);
    window.addEventListener("mousedown", sfxAutoplayUnlockHandler, true);
    window.addEventListener("click", sfxAutoplayUnlockHandler, true);
    window.addEventListener("touchstart", sfxAutoplayUnlockHandler, true);
    window.addEventListener("keydown", sfxAutoplayUnlockHandler, true);
  }

  function cancelSfxAutoplayUnlock(): void {
    if (sfxAutoplayUnlockHandler === null) {
      return;
    }

    window.removeEventListener("pointerdown", sfxAutoplayUnlockHandler, true);
    window.removeEventListener("pointerup", sfxAutoplayUnlockHandler, true);
    window.removeEventListener("mousedown", sfxAutoplayUnlockHandler, true);
    window.removeEventListener("click", sfxAutoplayUnlockHandler, true);
    window.removeEventListener("touchstart", sfxAutoplayUnlockHandler, true);
    window.removeEventListener("keydown", sfxAutoplayUnlockHandler, true);
    sfxAutoplayUnlockHandler = null;
  }

  async function toggleMusic(): Promise<void> {
    if (isMusicTemporarilyUnavailable) {
      isMusicEnabled = false;
      cancelMusicAutoplayUnlock();
      musicEngine.stop();
      updateMusicButton();
      return;
    }

    if (!musicEngine.isSupported) {
      updateMusicButton();
      return;
    }

    musicButton.disabled = true;
    const shouldRetryPendingPlayback = isMusicEnabled && musicEngine.isAutoplayPending;

    if (!shouldRetryPendingPlayback) {
      isMusicEnabled = !isMusicEnabled;
    }

    try {
      if (!isMusicEnabled) {
        cancelMusicAutoplayUnlock();
        musicEngine.stop();
      } else {
        const started = await musicEngine.start();
        if (started) {
          cancelMusicAutoplayUnlock();
        } else {
          registerMusicAutoplayUnlock();
        }
      }
    } catch (error) {
      console.error("DeltaV music failed.", error);
    } finally {
      updateMusicButton();
    }
  }

  function startMusicOnGameStart(): void {
    if (isMusicTemporarilyUnavailable || !musicEngine.isSupported || !isMusicEnabled) {
      if (!isMusicEnabled) {
        cancelMusicAutoplayUnlock();
        musicEngine.stop();
      }
      updateMusicButton();
      return;
    }

    void musicEngine.start().then((started) => {
      if (started) {
        cancelMusicAutoplayUnlock();
      } else {
        registerMusicAutoplayUnlock();
      }

      updateMusicButton();
    });
  }

  function restartMusicForZeroTimerCountdown(): void {
    fallbackBeatSyncStartedAtMs = performance.now();

    if (isMusicTemporarilyUnavailable || !musicEngine.isSupported || !isMusicEnabled) {
      if (!isMusicEnabled) {
        cancelMusicAutoplayUnlock();
        musicEngine.stop();
      }
      updateMusicButton();
      return;
    }

    void musicEngine.restartFromBeginning().then((started) => {
      if (started) {
        cancelMusicAutoplayUnlock();
      } else {
        registerMusicAutoplayUnlock();
      }

      updateMusicButton();
    });
  }

  function getFallbackBeatElapsedSeconds(now = performance.now()): number {
    return Math.max(0, (now - fallbackBeatSyncStartedAtMs) / 1000);
  }

  function registerMusicAutoplayUnlock(): void {
    if (isMusicTemporarilyUnavailable || musicAutoplayUnlockHandler !== null) {
      return;
    }

    musicAutoplayUnlockHandler = (event: Event): void => {
      if (
        (event.target instanceof Node && musicButton.contains(event.target)) ||
        isMenuAudioControlEvent(event, "music")
      ) {
        return;
      }

      cancelMusicAutoplayUnlock();
      void musicEngine.start().then((started) => {
        if (!started) {
          registerMusicAutoplayUnlock();
        }

        updateMusicButton();
      });
    };

    window.addEventListener("pointerdown", musicAutoplayUnlockHandler, true);
    window.addEventListener("keydown", musicAutoplayUnlockHandler, true);
  }

  function cancelMusicAutoplayUnlock(): void {
    if (musicAutoplayUnlockHandler === null) {
      return;
    }

    window.removeEventListener("pointerdown", musicAutoplayUnlockHandler, true);
    window.removeEventListener("keydown", musicAutoplayUnlockHandler, true);
    musicAutoplayUnlockHandler = null;
  }

  function isMenuAudioControlEvent(event: Event, control: "music" | "sfx"): boolean {
    return (
      event.target instanceof Element &&
      event.target.closest(`[data-menu-audio-control="${control}"]`) !== null
    );
  }

  async function toggleSfxFromGameMenu(): Promise<void> {
    if (!sfxEngine.isSupported) {
      updateSfxButton();
      return;
    }

    const isActive = isGameMenuSfxEnabled();

    if (isActive && !sfxEngine.isUnlocked) {
      const unlocked = await sfxEngine.unlock();

      if (unlocked) {
        sfxEngine.play("ui.toggle");
      }

      updateSfxButton();
      return;
    }

    if (isActive) {
      sfxEngine.updateSettings({ muted: true, zenMode: false });
    } else {
      sfxEngine.updateSettings({ enabled: true, muted: false, zenMode: false });
      const unlocked = await sfxEngine.unlock();

      if (unlocked) {
        sfxEngine.play("ui.toggle");
      }
    }

    updateSfxButton();
  }

  function copyDiagnosticGameStateDump(): void {
    let payload: string;

    try {
      payload = JSON.stringify(buildCurrentDiagnosticGameStateDump(), null, 2);
    } catch (error) {
      appendDebugPanelMessage(`GAMESTATE DUMP build failed: ${String(error)}`);
      return;
    }

    void copyTextToClipboard(payload)
      .then(() => {
        appendDebugPanelMessage("GAMESTATE DUMP copied to clipboard");
      })
      .catch((error: unknown) => {
        appendDebugPanelMessage(`GAMESTATE DUMP copy failed: ${String(error)}`);
      });
  }

  function buildCurrentDiagnosticGameStateDump(): Readonly<Record<string, unknown>> {
    const cameraState = cinematicRenderer?.captureCameraState();
    const rect = cinematicFrame.getBoundingClientRect();
    const commandScrollback = createCommandScrollbackRows(
      commandTimelineEntries,
      replayTape.entries
    );
    const cinematicPerformanceStats =
      cinematicRenderer?.getPerformanceStats() ?? lastCinematicPerformanceStats;

    return buildDiagnosticGameStateDump({
      copiedAt: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
      runtime: {
        view: currentView,
        selectedTargetKey,
        planningTimerMode,
        isReplayMode,
        isTurnTransitionActive,
        isCommandConsoleResolving,
        tutorial: createTutorialRuntimeDiagnosticDump(tutorialState)
      },
      camera:
        cameraState === undefined
          ? null
          : {
              viewport: {
                width: Math.round(rect.width),
                height: Math.round(rect.height)
              },
              focus: cameraState.focus.toArray(),
              yaw: cameraState.yaw,
              pitch: cameraState.pitch,
              distance: cameraState.distance,
              focusedTargetKey: cameraState.focusedTargetKey,
              trackedFocusTargetKey: cameraState.trackedFocusTargetKey,
              displayScaleFocusTargetKey: cameraState.displayScaleFocusTargetKey ?? null,
              displayScaleDistance: cameraState.displayScaleDistance ?? cameraState.distance,
              smoothWheelZoomTargetDistance: cameraState.smoothWheelZoomTargetDistance ?? null,
              arrivalChaseCamera: cameraState.arrivalChaseCamera ?? null,
              shipyardAssemblyChaseCamera: cameraState.shipyardAssemblyChaseCamera ?? null
            },
      map: {
        preset: selectedMapPreset.id,
        procedural: selectedMapPreset.procedural === true,
        proceduralSeed: selectedMapPreset.procedural === true ? proceduralSeed : null,
        proceduralDebug: getProceduralDebugForGameMode(
          currentProceduralDebug,
          snapshot.gameMode ?? state.gameMode
        )
      },
      stateHash: hashReplayState(state),
      summary: dumpTurnState(content, state),
      state,
      snapshot,
      trajectoryPreviews: cinematicRenderer?.captureTrajectoryPreviewDebugState() ?? null,
      solarVisuals: cinematicRenderer?.captureSolarVisualDebugState() ?? null,
      performance: {
        diagnosticsEnabled: isPerformanceDiagnosticsEnabled(),
        stats: cinematicPerformanceStats,
        sectionTimingNote: isPerformanceDiagnosticsEnabled()
          ? null
          : "Enable PERF diagnostics before copying the dump for live render-section timings."
      },
      warningProjectionAudit: createWarningProjectionAudit(),
      command: {
        dvHistory: commandDvHistory,
        timelineEntryCount: commandTimelineEntries.length,
        timelineEntriesRecent: commandTimelineEntries.slice(-120),
        scrollbackRowCount: commandScrollback.length,
        scrollbackRecent: commandScrollback.slice(-240)
      },
      replay: {
        transitionCount: replayTape.transitions.length,
        transitionsRecent: replayTape.transitions.slice(-12),
        entryCount: replayTape.entries.length,
        entriesRecent: replayTape.entries.slice(-240)
      },
      diagnostics: {
        matchDebugEventCount: matchDebugEvents.length,
        matchDebugEventsRecent: matchDebugEvents.slice(-240),
        matchResolutionEventCount: matchResolutionEvents.length,
        matchResolutionEventsRecent: matchResolutionEvents.slice(-120),
        victoryAudit: lastVictoryAudit,
        mapOutcomeAudit: lastMapOutcomeAudit,
        postMatchReport: postMatchReportText
      }
    });
  }

  function copyCameraDebugSnapshot(): void {
    const cameraState = cinematicRenderer?.captureCameraState();

    if (cameraState === undefined) {
      appendDebugPanelMessage("CAMERA POSE unavailable outside 3D Planetarium");
      return;
    }

    const rect = cinematicFrame.getBoundingClientRect();
    const payload = {
      label: "DeltaV Camera Pose",
      version: 1,
      copiedAt: new Date().toISOString(),
      turn: snapshot.turn,
      mode: state.gameMode,
      mapPreset: selectedMapPreset.id,
      proceduralSeed: selectedMapPreset.procedural ? proceduralSeed : null,
      view: currentView,
      selectedTargetKey,
      viewport: {
        width: Math.round(rect.width),
        height: Math.round(rect.height)
      },
      camera: {
        focus: cameraState.focus.toArray(),
        yaw: cameraState.yaw,
        pitch: cameraState.pitch,
        distance: cameraState.distance,
        focusedTargetKey: cameraState.focusedTargetKey,
        trackedFocusTargetKey: cameraState.trackedFocusTargetKey,
        displayScaleFocusTargetKey: cameraState.displayScaleFocusTargetKey ?? null,
        displayScaleDistance: cameraState.displayScaleDistance ?? cameraState.distance
      }
    };

    void copyTextToClipboard(JSON.stringify(payload, null, 2))
      .then(() => {
        appendDebugPanelMessage("CAMERA POSE copied to clipboard");
      })
      .catch((error: unknown) => {
        appendDebugPanelMessage(`CAMERA POSE copy failed: ${String(error)}`);
      });
  }

  function shouldIgnoreGlobalGameplayHotkey(event: KeyboardEvent): boolean {
    if (event.metaKey || event.ctrlKey || event.altKey) {
      return true;
    }

    if (!(event.target instanceof HTMLElement)) {
      return false;
    }

    return (
      event.target.closest(
        "input, textarea, select, button, a[href], [contenteditable='true'], .command-console"
      ) !== null
    );
  }

  function handleGlobalExecuteHotkey(event: KeyboardEvent): boolean {
    if ((event.key !== " " && event.code !== "Space") || shouldIgnoreGlobalGameplayHotkey(event)) {
      return false;
    }

    event.preventDefault();
    noteTutorialPlayerActivity();
    void executeCurrentTurn();

    return true;
  }

  function updateDebugPanel(): void {
    const debugState = dumpTurnState(content, state);
    const useCompactProceduralDebug = isZeroTimerAiAutorunMode();
    if (
      debugPanelProceduralSource !== currentProceduralDebug ||
      debugPanelProceduralMode !== state.gameMode ||
      debugPanelProceduralIsCompact !== useCompactProceduralDebug
    ) {
      const proceduralDebugText = useCompactProceduralDebug
        ? formatAiAutorunProceduralDebugSummary(currentProceduralDebug, state.gameMode)
        : formatProceduralMapDebug(currentProceduralDebug, state.gameMode);
      debugPanelProcedural.textContent =
        proceduralDebugText === "" ? "" : `\n\n${proceduralDebugText}`;
      debugPanelProceduralSource = currentProceduralDebug;
      debugPanelProceduralMode = state.gameMode;
      debugPanelProceduralIsCompact = useCompactProceduralDebug;
    }
    const activeFactionSummary = getActiveFactions(state)
      .map((faction) => `${faction.displayName} ${debugState.factionDv[faction.id] ?? 0}`)
      .join(" / ");
    const activeShipSummary = getActiveFactions(state)
      .map((faction) => `${faction.displayName} ${debugState.shipsPerFaction[faction.id] ?? 0}`)
      .join(" / ");
    const controllerSummary = getActiveFactions(state)
      .map((faction) => `${faction.displayName} ${faction.controlType.toUpperCase()}`)
      .join(" / ");
    const recordingStatus = debugRecorder.isRecording
      ? [`REC ${formatDebugRecordingElapsed(debugRecorder.elapsedMs)}`]
      : [];
    const recordingMessages =
      debugRecorderMessages.length === 0 ? [] : ["", "Recording", ...debugRecorderMessages];
    const debugMessages =
      debugPanelMessages.length === 0 ? [] : ["", "Debug", ...debugPanelMessages];
    const performanceMessages = isPerformanceDiagnosticsEnabled()
      ? [
          ...formatCinematicPerformanceDebugLines(
            cinematicRenderer?.getPerformanceStats() ?? lastCinematicPerformanceStats,
            lastPerformanceCounterRates
          )
        ]
      : [];
    debugPanelDynamic.textContent = [
      ...recordingStatus,
      `Turn ${debugState.turn}`,
      `Mode ${debugState.gameMode} | ΔV ${activeFactionSummary}`,
      `AI Level ${getDebugAiLevelLabel()}`,
      `Beat Sync ${beatSyncMode.toUpperCase()}`,
      `Controllers ${controllerSummary}`,
      `Income ${debugState.dvIncomeThisTurn}`,
      `Ships ${activeShipSummary}`,
      `Transit ${debugState.shipsInTransit} | Missiles ${debugState.missilesInFlight}`,
      sfxEngine.debugState,
      `Contested ${debugState.contestedNodes.join(", ") || "-"}`,
      `Tritium ${debugState.occupiedTritiumNodes.join(", ") || "-"}`,
      `Shipyards ${debugState.occupiedShipyards.join(", ") || "-"}`,
      `Progress ${formatDebugRecord(debugState.shipyardProgressByNode)}`,
      `AI ${formatDebugRecord(debugState.lastAIActionPerShip)}`,
      ...(performanceMessages.length === 0 ? [] : ["", "Perf", ...performanceMessages]),
      ...recordingMessages,
      ...debugMessages
    ].join("\n");
  }

  function formatAiAutorunProceduralDebugSummary(
    debug: ProceduralMapDebug | null,
    mode: GameModeId
  ): string {
    if (debug === null) {
      return "";
    }

    const fairnessAudit = debug.fairnessAuditByMode[mode] ?? debug.fairnessAudit;
    return [
      "Procedural Map Debug · compact autorun",
      `Seed ${debug.seed}`,
      `Tritium ${debug.selectedTritiumNodes.join(", ")}`,
      `Shipyards ${debug.selectedShipyardNodes.join(", ")}`,
      `Scores final ${debug.finalScore} | fairness ${debug.fairnessScore} | expansion ${debug.expansionScore} | conflict ${debug.conflictScore}`,
      `Hard gate ${debug.hardGatePassed ? "PASS" : "FAIL"} | fallback ${fairnessAudit.fallbackStaticLayoutUsed}`,
      `Candidates ${debug.acceptedCandidateCount}/${debug.evaluatedCandidateCount} accepted`,
      `Worst asymmetry ${fairnessAudit.worstAsymmetryReason}`
    ].join("\n");
  }

  function updateDebugFps(): void {
    debugFps.textContent = `FPS ${smoothedFps > 0 ? smoothedFps.toFixed(1) : "sampling…"}`;
    const stats = lastCinematicPerformanceStats;
    document.body.dataset["trailerFps"] = smoothedFps > 0 ? smoothedFps.toFixed(3) : "";
    document.body.dataset["trailerLongestFrameMs"] = fpsCounterLongestFrameMs.toFixed(3);
    document.body.dataset["trailerFramesOver20Ms"] = String(fpsCounterFramesOver20Ms);
    document.body.dataset["trailerFramesOver30Ms"] = String(fpsCounterFramesOver30Ms);

    if (stats === null) {
      delete debugFps.dataset["frameMs"];
      delete debugFps.dataset["longestFrameMs"];
      delete debugFps.dataset["framesOver20Ms"];
      delete debugFps.dataset["framesOver30Ms"];
      delete debugFps.dataset["syncSceneMs"];
      delete debugFps.dataset["sceneRenderMs"];
      document.body.dataset["trailerFrameMs"] =
        smoothedFps > 0 ? (1000 / smoothedFps).toFixed(3) : "";
      delete document.body.dataset["trailerSyncSceneMs"];
      delete document.body.dataset["trailerSceneRenderMs"];
      delete document.body.dataset["trailerReplayPreviewMs"];
      delete document.body.dataset["trailerPresentationOnlyMs"];
      delete document.body.dataset["trailerEffectAnimationMs"];
      delete document.body.dataset["trailerMissileAnimationMs"];
      delete document.body.dataset["trailerTacticalMs"];
      delete document.body.dataset["trailerInteractionMs"];
      delete document.body.dataset["trailerBurnPresentationMs"];
      delete document.body.dataset["trailerFirePresentationMs"];
      delete document.body.dataset["trailerLabelsMs"];
      delete document.body.dataset["trailerSlowestSection"];
      delete document.body.dataset["trailerPerformanceMode"];
      return;
    }

    debugFps.dataset["frameMs"] = stats.sections.frame.averageMs.toFixed(3);
    debugFps.dataset["longestFrameMs"] = stats.framePacing.longestIntervalMs.toFixed(3);
    debugFps.dataset["framesOver20Ms"] = String(stats.framePacing.framesOver20Ms);
    debugFps.dataset["framesOver30Ms"] = String(stats.framePacing.framesOver30Ms);
    debugFps.dataset["syncSceneMs"] = stats.sections.syncScene.averageMs.toFixed(3);
    debugFps.dataset["sceneRenderMs"] = stats.sections.sceneRender.averageMs.toFixed(3);
    document.body.dataset["trailerFrameMs"] = stats.sections.frame.averageMs.toFixed(3);
    document.body.dataset["trailerSyncSceneMs"] = stats.sections.syncScene.averageMs.toFixed(3);
    document.body.dataset["trailerSceneRenderMs"] = stats.sections.sceneRender.averageMs.toFixed(3);
    document.body.dataset["trailerReplayPreviewMs"] =
      stats.sections.replayPreview.averageMs.toFixed(3);
    document.body.dataset["trailerPresentationOnlyMs"] =
      stats.sections.presentationOnly.averageMs.toFixed(3);
    document.body.dataset["trailerEffectAnimationMs"] =
      stats.sections.effectAnimation.averageMs.toFixed(3);
    document.body.dataset["trailerMissileAnimationMs"] =
      stats.sections.missileAnimation.averageMs.toFixed(3);
    document.body.dataset["trailerTacticalMs"] = stats.sections.tactical.averageMs.toFixed(3);
    document.body.dataset["trailerInteractionMs"] = stats.sections.interaction.averageMs.toFixed(3);
    document.body.dataset["trailerBurnPresentationMs"] =
      stats.sections.burnPresentation.averageMs.toFixed(3);
    document.body.dataset["trailerFirePresentationMs"] =
      stats.sections.firePresentation.averageMs.toFixed(3);
    document.body.dataset["trailerLabelsMs"] = stats.sections.labels.averageMs.toFixed(3);
    document.body.dataset["trailerSlowestSection"] = stats.slowestSection;
    document.body.dataset["trailerPerformanceMode"] = stats.mode;
  }

  function updateCommandConsole(): void {
    if (isGameMenuDemoActive) {
      clearCommandLiveRowsBlock();
      commandLive.innerHTML = "";
      executePrompt.remove();
      return;
    }

    if (isCommandConsoleTypingLiveBlock) {
      shouldRefreshCommandConsoleAfterLiveUpdate = true;
      return;
    }

    shouldRefreshCommandConsoleAfterLiveUpdate = false;
    clearCommandLiveRowsBlock();
    commandLive.innerHTML = "";

    if (isCommandConsoleResolving) {
      executePrompt.disabled = true;
      syncExecutePromptAttentionState();
      clearTutorialConfirmCameraHintRefreshTimer();
      clearTutorialZoomFocusHintTimers();
      return;
    }

    const rows = getLiveCommandRows(false);
    syncTutorialConfirmCameraHintRefreshTimer();
    syncTutorialZoomFocusHintRefreshTimer();

    if (shouldTypeNextLiveCommandBlock) {
      shouldTypeNextLiveCommandBlock = false;
      isCommandConsoleTypingLiveBlock = true;
      void appendLiveCommandBlockSequential(rows, { typewriter: true })
        .then(() => {
          appendExecutePromptToLiveBlock();
        })
        .finally(() => {
          isCommandConsoleTypingLiveBlock = false;
          flushQueuedCommandConsoleRefresh();
        });
      return;
    }

    renderLiveCommandRowsInstant(rows);
  }

  async function renderNextLiveCommandBlockTyped(): Promise<void> {
    if (isCommandConsoleTypingLiveBlock) {
      return;
    }

    shouldTypeNextLiveCommandBlock = false;
    isCommandConsoleTypingLiveBlock = true;
    clearCommandLiveRowsBlock();
    commandLive.innerHTML = "";
    const rows = getLiveCommandRows(false);

    try {
      if (isZeroTimerAiAutorunMode()) {
        renderLiveCommandRowsInstant(rows);
        return;
      }

      await appendLiveCommandBlockSequential(rows, { typewriter: true });
      appendExecutePromptToLiveBlock();
    } finally {
      isCommandConsoleTypingLiveBlock = false;
      flushQueuedCommandConsoleRefresh();
    }
  }

  function flushQueuedCommandConsoleRefresh(): void {
    if (!shouldRefreshCommandConsoleAfterLiveUpdate) {
      return;
    }

    shouldRefreshCommandConsoleAfterLiveUpdate = false;
    updateCommandConsole();
  }

  function updateTutorialCommandConsoleWithTypewriter(): void {
    if (tutorialState !== null) {
      shouldTypeNextLiveCommandBlock = true;
    }

    updateCommandConsole();
  }

  function refreshCommandConsoleAfterTutorialSelection(): void {
    tutorialSelectionCommandConsoleRefresh.request();
  }

  function appendExecutePromptToLiveBlock(): void {
    const showExecutePrompt = shouldShowExecutePrompt();

    if (!showExecutePrompt) {
      executePrompt.remove();
      syncTutorialCommandLogPinnedRow(false);
      syncExecutePromptAttentionState();
      return;
    }

    syncTutorialCommandLogPinnedRow(true);
    executePrompt.disabled = isManualExecutePromptDisabled();
    renderExecutePrompt(getExecutePromptMode());
    commandLive.append(executePrompt);
    syncExecutePromptAttentionState();
    scrollCommandTranscriptToEnd();
  }

  function shouldShowExecutePrompt(): boolean {
    if (
      planningTimerMode !== "auto" &&
      planningTimerState.phase !== "executeCountdown" &&
      isPlanningTimerEnabledForCurrentState() &&
      !isTrailerAiMatchActive()
    ) {
      return false;
    }

    if (tutorialState === null) {
      return true;
    }

    if (tutorialState.inputLocked || tutorialState.autoAdvanceActive) {
      return false;
    }

    if (isTutorialCrewLostExecuteCueActive()) {
      return true;
    }

    if (
      tutorialState.phase === "shipyardFirePrompt" ||
      tutorialState.phase === "shipyardContestedFirePrompt" ||
      tutorialState.phase === "shipyardCounterContestBurnPrompt" ||
      tutorialState.phase === "shipyardContestedBurnPrompt"
    ) {
      return false;
    }

    if (
      tutorialState.phase === "shipyardFireQueued" ||
      tutorialState.phase === "shipyardContestedFireQueued"
    ) {
      return getTutorialQueuedFireOrder() !== undefined;
    }

    if (
      tutorialState.phase === "shipyardCounterContestBurnQueued" ||
      tutorialState.phase === "shipyardContestedBurnQueued"
    ) {
      return true;
    }

    if (
      tutorialState.phase === "shipyardProduction" ||
      tutorialState.phase === "shipyardSupportProduction" ||
      tutorialState.phase === "shipyardSupportProductionCompletion" ||
      tutorialState.phase === "shipyardFireWorkLesson" ||
      tutorialState.phase === "shipyardEnemyEvadeLesson"
    ) {
      return true;
    }

    if (isTutorialSupportProductionAdvancePrompt()) {
      return true;
    }

    if (tutorialState.phase === "evadeLesson") {
      return true;
    }

    if (tutorialState.phase === "mandatoryLaunchQueued") {
      return false;
    }

    if (isMandatoryLaunchLockActive()) {
      return true;
    }

    if (isTutorialMandatoryLaunchAutoAdvancePending()) {
      return false;
    }

    return (
      snapshot.pendingBurnOrders.length > 0 ||
      snapshot.pendingFireOrders.length > 0 ||
      snapshot.activeBurnTransits.length > 0 ||
      snapshot.activeMissiles.length > 0
    );
  }

  function isTutorialCrewLostExecuteCueActive(): boolean {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.inputLocked ||
      tutorial.autoAdvanceActive ||
      !isTutorialCrewLostExecuteCuePhase(tutorial.phase)
    ) {
      return false;
    }

    if (isTutorialForcedMandatoryLaunchToEnemyShipyardAutoAdvancing(tutorial)) {
      return false;
    }

    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    return getTutorialTurnEvents(snapshot).some((event) => {
      return (
        event.type === "SHIP_DESTROYED" &&
        (contestedNodeId === null || event.nodeId === contestedNodeId)
      );
    });
  }

  function isTutorialCrewLostExecuteCuePhase(phase: TutorialPhase): boolean {
    return phase === "autoAdvancingToShipyardContestedFireImpact";
  }

  function isTutorialSupportProductionAdvancePrompt(): boolean {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.inputLocked ||
      tutorial.autoAdvanceActive ||
      tutorial.phase !== "autoAdvancingToShipyardContestedSupport"
    ) {
      return false;
    }

    if (
      state.pendingBurnOrders.length > 0 ||
      state.pendingFireOrders.length > 0 ||
      state.activeBurnTransits.length > 0 ||
      state.activeMissiles.length > 0
    ) {
      return false;
    }

    return hasPlayerShipyardReadyForTutorialMandatoryLaunch();
  }

  function hasPlayerShipyardReadyForTutorialMandatoryLaunch(): boolean {
    return state.shipyardProgress.some((entry) => {
      if (entry.workerFactionId !== "player" || entry.progress < 4) {
        return false;
      }

      const node = content.nodes.find((candidate) => candidate.id === entry.nodeId);

      return (
        node?.type === "shipyard" &&
        hasFactionShipAtNode(state, entry.nodeId, "player") &&
        !isSnapshotNodeContested(entry.nodeId)
      );
    });
  }

  function isManualExecutePromptDisabled(): boolean {
    return (
      isReplayMode ||
      postMatchReportText !== null ||
      isCommandConsoleResolving ||
      isTutorialCrewLostExecuteCueActive() ||
      tutorialState?.inputLocked === true ||
      isPlanningTimerExecuteLocked() ||
      !shouldShowExecutePrompt() ||
      (isTurnTransitionActive &&
        defaultCinematic3dVisualTuning.turnAnimationDisableInputDuringTransition)
    );
  }

  function syncExecutePromptAttentionState(now = performance.now()): void {
    if (!executePrompt.isConnected || executePrompt.hidden) {
      executePromptVisibleSince = null;
      clearExecutePromptAttentionPulse();
      clearExecuteQuestionBeatPulse();
      stopExecutePromptAttentionLoop();
      return;
    }

    const isAttentionEligible = isExecutePromptAttentionEligible();
    const shouldPulseQuestion = shouldPulseExecuteQuestion(isAttentionEligible);

    if (shouldPulseQuestion) {
      applyExecuteQuestionBeatPulse(now);
    } else {
      clearExecuteQuestionBeatPulse();
    }

    if (!isAttentionEligible) {
      executePromptVisibleSince = null;
      clearExecutePromptAttentionPulse();
      if (shouldPulseQuestion) {
        startExecutePromptAttentionLoop();
      } else {
        stopExecutePromptAttentionLoop();
      }
      return;
    }

    if (executePromptVisibleSince === null && executePrompt.isConnected && !executePrompt.hidden) {
      executePromptVisibleSince = now;
    }

    applyExecutePromptAttentionPulse(now);
    if (executePromptVisibleSince !== null || executePrompt.isConnected) {
      startExecutePromptAttentionLoop();
    }
  }

  function isExecutePromptAttentionEligible(): boolean {
    const isTutorialShipyardProductionExecute = tutorialState?.phase === "shipyardProduction";
    const isTutorialSupportShipyardProductionExecute =
      tutorialState?.phase === "shipyardSupportProduction" ||
      tutorialState?.phase === "shipyardSupportProductionCompletion";
    const isTutorialSupportRecoveryExecute = isTutorialSupportProductionAdvancePrompt();
    const isTutorialShipyardFireWorkExecute = tutorialState?.phase === "shipyardFireWorkLesson";
    const isTutorialEvadeLessonExecute = tutorialState?.phase === "evadeLesson";

    return (
      tutorialState !== null &&
      !isReplayMode &&
      !isCommandConsoleResolving &&
      shouldShowExecutePrompt() &&
      getExecutePromptMode() === "execute" &&
      (isTutorialShipyardProductionExecute ||
        isTutorialSupportShipyardProductionExecute ||
        isTutorialSupportRecoveryExecute ||
        isTutorialShipyardFireWorkExecute ||
        isTutorialEvadeLessonExecute ||
        (hasConfirmedPlayerOrderAfterSelection && getPendingPlayerBurnOrFireOrderCount() > 0)) &&
      !isManualExecutePromptDisabled() &&
      !executePrompt.disabled &&
      !executePrompt.hidden
    );
  }

  function shouldPulseExecuteQuestion(isAttentionEligible: boolean): boolean {
    if (!isBeatSyncEnabled()) {
      return false;
    }

    const executePromptMode = getExecutePromptMode();
    return (
      executePromptMode === "launch" ||
      isAttentionEligible ||
      (executePromptMode === "execute" &&
        executePrompt.isConnected &&
        !executePrompt.hidden &&
        !executePrompt.disabled)
    );
  }

  function startExecutePromptAttentionLoop(): void {
    if (executePromptAttentionFrame !== null) {
      return;
    }

    executePromptAttentionFrame = window.requestAnimationFrame(() => {
      executePromptAttentionFrame = null;
      syncExecutePromptAttentionState();
    });
  }

  function stopExecutePromptAttentionLoop(): void {
    if (executePromptAttentionFrame === null) {
      return;
    }

    window.cancelAnimationFrame(executePromptAttentionFrame);
    executePromptAttentionFrame = null;
  }

  function applyExecutePromptAttentionPulse(now: number): void {
    if (
      !isBeatSyncEnabled() ||
      executePromptVisibleSince === null ||
      !executePrompt.isConnected ||
      executePrompt.hidden
    ) {
      clearExecutePromptAttentionPulse();
      return;
    }

    const delayedByMs = now - executePromptVisibleSince - executePromptAttentionDelayMs;

    if (delayedByMs < 0) {
      clearExecutePromptAttentionPulse();
      return;
    }

    const musicPulse = musicEngine.getVisualPulse();
    const fallbackPhase =
      ((delayedByMs / 1000) % guidancePulseSeconds) / Math.max(0.001, guidancePulseSeconds);
    const pulseIntensity =
      musicPulse === null ? getGuidanceFallbackPulseIntensity(fallbackPhase) : musicPulse.intensity;

    executePrompt.classList.add("is-attention-pulsing");
    executePrompt.style.setProperty("--execute-attention-pulse", pulseIntensity.toFixed(3));
  }

  function applyExecuteQuestionBeatPulse(now: number): void {
    if (!isBeatSyncEnabled()) {
      clearExecuteQuestionBeatPulse();
      return;
    }

    const musicPulse = musicEngine.getVisualPulse();
    const fallbackPhase =
      (getFallbackBeatElapsedSeconds(now) % guidancePulseSeconds) /
      Math.max(0.001, guidancePulseSeconds);
    const beatPhase = musicPulse === null ? fallbackPhase : clampNumber(musicPulse.phase, 0, 1);
    const pulseIntensity =
      musicPulse === null ? getGuidanceFallbackPulseIntensity(fallbackPhase) : musicPulse.intensity;
    const blinkOpacity = getExecuteQuestionBeatBlinkOpacity(beatPhase, pulseIntensity);

    executePrompt.style.setProperty("--execute-question-pulse", pulseIntensity.toFixed(3));
    executePrompt.style.setProperty("--execute-question-blink-opacity", blinkOpacity.toFixed(3));
  }

  function getExecuteQuestionBeatBlinkOpacity(beatPhase: number, pulseIntensity: number): number {
    const clampedPulseIntensity = clampNumber(pulseIntensity, 0, 1);
    const litOpacity =
      executeQuestionBlinkLitOpacity + clampedPulseIntensity * (1 - executeQuestionBlinkLitOpacity);
    const dimOpacity =
      executeQuestionBlinkDimOpacity +
      clampedPulseIntensity * executeQuestionBlinkDimOpacity * 0.34;
    return beatPhase < executeQuestionBlinkLitPhase ? litOpacity : dimOpacity;
  }

  function clearExecutePromptAttentionPulse(): void {
    executePrompt.classList.remove("is-attention-pulsing");
    executePrompt.style.removeProperty("--execute-attention-pulse");
  }

  function clearExecuteQuestionBeatPulse(): void {
    executePrompt.style.removeProperty("--execute-question-pulse");
    executePrompt.style.removeProperty("--execute-question-blink-opacity");
  }

  function appendFrozenCommandSnapshot(): Promise<void> {
    const entry = createCommandSnapshotTimelineEntry();
    const options = getFrozenCommandSnapshotAppendOptions();
    if (
      tutorialPostVictoryActionLessonTurn !== null &&
      snapshot.turn > tutorialPostVictoryActionLessonTurn
    ) {
      tutorialPostVictoryActionLessonTurn = null;
    }
    liveTutorialTimelineRows.length = 0;
    commandTimelineEntries.push(entry);
    return appendCommandTimelineEntrySequential(entry, options).then(() => {
      scrollCommandTranscriptToEnd();
    });
  }

  function appendTutorialTurnOnlySnapshot(): Promise<void> {
    const entry = createTurnOnlyCommandSnapshotTimelineEntry();
    const options = getTutorialTurnSnapshotAppendOptions();
    liveTutorialTimelineRows.length = 0;
    commandTimelineEntries.push(entry);
    return appendCommandTimelineEntrySequential(entry, options).then(() => {
      scrollCommandTranscriptToEnd();
    });
  }

  function getFrozenCommandSnapshotAppendOptions(): CommandConsoleAppendOptions {
    return { typewriter: false };
  }

  function getTutorialTurnSnapshotAppendOptions(): CommandConsoleAppendOptions {
    return {
      typewriter: tutorialState !== null,
      typewriteAllNonSpacerRows: tutorialState !== null
    };
  }

  function attachCommandLiveRowsBlock(): void {
    if (commandLiveRows.parentNode !== commandTranscript) {
      commandTranscript.append(commandLiveRows);
    }
  }

  function syncTutorialCommandLogPinnedRow(showExecutePrompt: boolean): void {
    releaseTutorialCommandLogPinnedRow();

    if (tutorialState === null || showExecutePrompt) {
      return;
    }

    const candidates = Array.from(commandLiveRows.children).filter(
      (child): child is HTMLElement =>
        child instanceof HTMLElement &&
        child.classList.contains("command-console__line") &&
        !child.classList.contains("command-console__line--spacer") &&
        !child.classList.contains("command-console__line--tutorial-spacer")
    );
    const blinkingCandidates = candidates.filter((line) =>
      line.classList.contains("command-console__line--tutorial-live-hint")
    );
    const pinnedLine =
      blinkingCandidates[blinkingCandidates.length - 1] ?? candidates[candidates.length - 1];

    if (pinnedLine === undefined) {
      return;
    }

    commandPinnedLiveRowAnchor = document.createComment("command-console-pinned-row");
    pinnedLine.before(commandPinnedLiveRowAnchor);
    commandPinnedLiveRow.append(pinnedLine);
    commandLive.prepend(commandPinnedLiveRow);
  }

  function releaseTutorialCommandLogPinnedRow(): void {
    const pinnedLine = commandPinnedLiveRow.firstChild;

    if (pinnedLine !== null) {
      if (commandPinnedLiveRowAnchor !== null && commandPinnedLiveRowAnchor.parentNode !== null) {
        commandPinnedLiveRowAnchor.replaceWith(pinnedLine);
      } else {
        commandLiveRows.append(pinnedLine);
      }
    }

    while (commandPinnedLiveRow.firstChild !== null) {
      commandLiveRows.append(commandPinnedLiveRow.firstChild);
    }
    commandPinnedLiveRowAnchor?.remove();
    commandPinnedLiveRowAnchor = null;
    commandPinnedLiveRow.remove();
  }

  function clearCommandLiveRowsBlock(): void {
    releaseTutorialCommandLogPinnedRow();
    commandLiveRows.innerHTML = "";
    commandLiveRows.remove();
  }

  function prepareCommandLiveRowsBlock(): void {
    commandLiveRows.innerHTML = "";
    attachCommandLiveRowsBlock();
  }

  function prepareCommandTranscriptForTimelineAppend(): void {
    releaseTutorialCommandLogPinnedRow();
    commandLiveRows.remove();
    commandTranscript.classList.add("has-scrollback");
  }

  function renderLiveCommandRowsInstant(rows: readonly CommandConsoleRow[]): void {
    prepareCommandLiveRowsBlock();
    appendCommandBlock(commandLiveRows, rows, { typewriter: false });
    appendExecutePromptToLiveBlock();
  }

  async function appendResolutionTranscriptRows(fromDebugEventIndex: number): Promise<void> {
    const resolutionEvents = createPlayerFacingResolutionEvents(
      matchDebugEvents.slice(fromDebugEventIndex)
    );
    matchResolutionEvents.push(...resolutionEvents);
    playResolutionEventsSfx(resolutionEvents);
    const entries = resolutionEvents.map(createResolutionTimelineEntry);
    commandTimelineEntries.push(...entries);

    const transcriptPromise = appendCommandTimelineEntriesSequential(
      getVisibleCommandTimelineEntries(entries),
      {
        typewriter: !isZeroTimerAiAutorunMode()
      }
    );
    await transcriptPromise;
    pruneAiAutorunCommandTranscriptDom();
    scrollCommandTranscriptToEnd();
  }

  function pruneAiAutorunCommandTranscriptDom(): void {
    if (!isZeroTimerAiAutorunMode()) {
      return;
    }

    const transcriptEntries = [...commandTranscript.children].filter(
      (child) => child !== commandLiveRows
    );
    const excessEntryCount = transcriptEntries.length - aiAutorunCommandTranscriptDomEntryLimit;

    for (let index = 0; index < excessEntryCount; index += 1) {
      transcriptEntries[index]?.remove();
    }
  }

  function playResolutionEventsSfx(events: readonly ResolutionEvent[]): void {
    if (events.length === 0) {
      return;
    }

    const eventKeys = new Set<DeltaVSfxKey>();

    for (const event of events) {
      switch (event.type) {
        case "WORK_TRITIUM":
          eventKeys.add("resource.gain");
          break;
        case "WORK_SHIPYARD":
          eventKeys.add(event.progress === 5 ? "shipyard.complete" : "shipyard.work");
          break;
        case "CONTESTED_UPKEEP":
          eventKeys.add("resource.spend");
          break;
        case "FIRE_LAUNCHED":
          eventKeys.add("ship.command");
          break;
        case "BURN_DEPARTED":
          eventKeys.add("event.burnExecute");
          break;
        case "EVADE":
          eventKeys.add("event.nearMiss");
          break;
        case "EVADE_BLOCKED":
          eventKeys.add("ui.criticalWarning");
          break;
        case "MISSILE_IMPACT":
          eventKeys.add("event.impact");
          break;
        case "SIGNAL_LOST":
          eventKeys.add(event.result === "SHIP_DESTROYED" ? "event.shipLost" : "event.nearMiss");
          break;
        case "MANDATORY_LAUNCH":
          eventKeys.add("ui.warning");
          break;
        case "MANDATORY_LAUNCH_DESTROYED":
        case "BURN_FAILED":
          eventKeys.add("ui.criticalWarning");
          break;
        case "VICTORY":
          eventKeys.add("game.victory");
          break;
      }
    }

    let delayMs = 0;
    for (const key of eventKeys) {
      window.setTimeout(() => {
        sfxEngine.play(key);
      }, delayMs);
      delayMs += key.startsWith("event.") || key.startsWith("game.") ? 160 : 70;
    }
  }

  function appendTutorialLog(text: string, key = text): void {
    appendTutorialRows([text], key);
  }

  function appendTutorialRows(rows: readonly string[], key = rows.join("\n")): void {
    appendTutorialTimelineRows(
      rows.map((text, rowIndex) =>
        text.trim().length === 0
          ? createTutorialSpacerRow(`${key}:spacer:${rowIndex}`)
          : {
              parts: [{ text }],
              className: "command-console__line--tutorial"
            }
      ),
      key
    );
  }

  function appendTutorialTimelineRows(
    rows: readonly TutorialCommandTimelineRow[],
    key = rows.map(getCommandTimelineRowText).join("\n"),
    options: Readonly<{ refresh?: boolean }> = {}
  ): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.loggedKeys.has(key)) {
      return;
    }

    if (
      rows.some((row) => isTutorialInputHint(getCommandTimelineRowText(row))) &&
      commandInputHintsMode === "off"
    ) {
      return;
    }

    tutorial.loggedKeys.add(key);
    noteTutorialPlayerActivity();
    pushLiveTutorialTimelineRows(expandTutorialSentenceRows(rows, key), key);
    if (options.refresh !== false) {
      updateCommandConsole();
    }
  }

  async function appendPersistentTutorialTimelineRows(
    rows: readonly CommandTimelineRow[],
    key: string,
    options: CommandConsoleAppendOptions
  ): Promise<void> {
    if (rows.length === 0) {
      return;
    }

    const entry: CommandTimelineEntry = {
      kind: "tutorial",
      id: `command-tutorial:${snapshot.turn}:${commandTimelineEntries.length}:${key}`,
      turn: snapshot.turn,
      rows
    };
    commandTimelineEntries.push(entry);
    await appendCommandTimelineEntrySequential(entry, options);
    scrollCommandTranscriptToEnd();
  }

  async function commitLiveTutorialTimelineRowsToTranscript(key: string): Promise<void> {
    if (liveTutorialTimelineRows.length === 0) {
      return;
    }

    const rows = liveTutorialTimelineRows.map(freezeTutorialLiveHintRow);
    liveTutorialTimelineRows.length = 0;
    await appendPersistentTutorialTimelineRows(rows, key, { typewriter: false });
  }

  function appendTutorialFirstBurnCostOnce(options: Readonly<{ refresh?: boolean }> = {}): void {
    appendTutorialTimelineRows(
      createTutorialFirstBurnCostRows(getCommandFactionClass("player")),
      "tutorial:first-burn-cost",
      options
    );
  }

  function appendTutorialFirstBurnTimeCostOnce(): void {
    appendTutorialTimelineRows(
      createTutorialFirstBurnTimeCostRows(getCommandFactionClass("player")),
      "tutorial:first-burn-time-cost"
    );
  }

  function getCommandTimelineRowText(row: CommandTimelineRow): string {
    return row.parts.map((part) => ("text" in part ? part.text : "")).join("");
  }

  function freezeTutorialLiveHintsToTranscript(
    key: string,
    options: Readonly<{ refresh?: boolean }> = {}
  ): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.loggedKeys.has(key)) {
      return;
    }

    const currentRows = getTutorialLiveHints();
    const rows = (currentRows.length > 0 ? currentRows : lastNonEmptyTutorialLiveHintRows)
      .filter((row) => {
        return row.className?.includes("command-console__line--tutorial") === true;
      })
      .map(freezeTutorialLiveHintRow);

    if (rows.length === 0) {
      return;
    }

    tutorial.loggedKeys.add(key);
    pushLiveTutorialTimelineRows(rows, key);

    if (options.refresh !== false) {
      updateCommandConsole();
    }
  }

  function pushLiveTutorialTimelineRows(rows: readonly CommandTimelineRow[], key: string): void {
    const sequence = tutorialLogSequence;
    tutorialLogSequence += 1;
    liveTutorialTimelineRows.push(
      ...rows.map((row, rowIndex) => {
        if (row.key !== undefined) {
          return row;
        }

        return {
          ...row,
          key: `tutorial-live:${sequence}:${rowIndex}:${key}`
        };
      })
    );
  }

  function freezeTutorialLiveHintRow(row: CommandTimelineRow): CommandTimelineRow {
    const className = freezeTutorialLiveHintClassName(row.className);

    if (className === row.className) {
      return row;
    }

    if (className === undefined) {
      return {
        parts: row.parts,
        ...(row.key === undefined ? {} : { key: row.key })
      };
    }

    return { ...row, className };
  }

  function clearTutorialTimers(): void {
    const tutorial = tutorialState;

    clearTutorialConfirmCameraHintRefreshTimer();
    clearTutorialZoomFocusHintTimers();

    if (tutorial === null) {
      return;
    }

    for (const timer of tutorial.timers) {
      window.clearTimeout(timer);
    }

    tutorial.timers.length = 0;
  }

  function createCommandSnapshotTimelineEntry(): CommandTimelineEntry {
    const warningSnapshot = getCachedCommandWarningSnapshot();
    const projectedDv = warningSnapshot.projectedDv;
    const warnings = warningSnapshot.warnings;
    const rows = [
      ...getLiveCommandTimelineRows(true, projectedDv, warnings, {
        includeTutorialHints: false
      })
    ];
    appendCommandResolutionBoundarySpacer(rows);

    return {
      kind: "commandSnapshot",
      id: `command-snapshot:${snapshot.turn}:${commandTimelineEntries.length}`,
      turn: snapshot.turn,
      frozenAt: performance.now(),
      rows,
      projectedDv: { ...projectedDv },
      warnings: warnings.map((warning) => ({ ...warning })),
      orders: createCommandSnapshotOrders()
    };
  }

  function createTurnOnlyCommandSnapshotTimelineEntry(): CommandTimelineEntry {
    const projectedDv = getCurrentCommandDv();
    const rows = getTurnOnlyCommandTimelineRows(projectedDv);

    return {
      kind: "commandSnapshot",
      id: `command-turn-snapshot:${snapshot.turn}:${commandTimelineEntries.length}`,
      turn: snapshot.turn,
      frozenAt: performance.now(),
      rows,
      projectedDv,
      warnings: [],
      orders: []
    };
  }

  function getCurrentCommandDv(): FactionCounts {
    const counts: FactionCounts = {};

    for (const faction of getActiveFactions(state)) {
      counts[faction.id] = getFactionDv(snapshot, faction.id);
    }

    return counts;
  }

  function getTurnOnlyCommandTimelineRows(
    projectedDv: FactionCounts
  ): readonly CommandTimelineRow[] {
    return [
      ...getCommandTurnBoundarySpacerRows(),
      ...getTutorialOpeningYearTimelineRows(),
      {
        parts: [{ text: `TURN ${formatTurnForConsole(snapshot.turn)}` }],
        className: "command-console__line--turn"
      },
      ...getActiveFactions(state).map((faction) =>
        createDvTelemetryTimelineRow(
          getConsoleFactionLabel(faction.id),
          faction.id,
          getFactionDv(snapshot, faction.id),
          projectedDv[faction.id] ?? 0
        )
      ),
      ...liveTutorialTimelineRows
    ];
  }

  function getTutorialOpeningYearTimelineRows(): readonly CommandTimelineRow[] {
    return createTutorialOpeningYearTimelineRows(tutorialState !== null, snapshot.turn);
  }

  function createCommandSnapshotOrders(): readonly CommandSnapshotOrder[] {
    return [
      ...snapshot.pendingFireOrders.map((order): CommandSnapshotOrder => {
        return {
          type: "FIRE",
          id: order.id,
          factionId: order.factionId,
          originNodeId: order.originNodeId,
          targetNodeId: order.targetNodeId,
          etaTurns: order.missileEtaTurns
        };
      }),
      ...snapshot.pendingBurnOrders.map((order): CommandSnapshotOrder => {
        return {
          type: "BURN",
          id: order.id,
          factionId: order.factionId,
          originNodeId: order.originNodeId,
          destinationNodeId: order.destinationNodeId,
          etaTurns: order.etaTurns,
          cost: order.burnCost
        };
      })
    ];
  }

  function getLiveCommandSnapshotOrders(): readonly CommandSnapshotOrder[] {
    return createCommandSnapshotOrders();
  }

  function createResolutionTimelineEntry(event: ResolutionEvent): CommandTimelineEntry {
    return {
      kind: "resolutionEvent",
      id: `command-resolution:${event.id}`,
      turn: event.turn,
      event
    };
  }

  function createVictoryTimelineEntry(event: ResolutionEvent): CommandTimelineEntry {
    return {
      kind: "victory",
      id: `command-victory:${event.id}`,
      turn: event.turn,
      event
    };
  }

  function appendCommandTimelineEntry(
    entry: CommandTimelineEntry,
    options: CommandConsoleAppendOptions
  ): void {
    if (!shouldShowCommandTimelineEntry(entry)) {
      return;
    }

    const rows = getCommandTimelineEntryRows(entry);
    prepareCommandTranscriptForTimelineAppend();

    if (entry.kind === "commandSnapshot") {
      const snapshotBlock = document.createElement("div");
      snapshotBlock.className = "command-console__block command-console__block--snapshot";
      commandTranscript.append(snapshotBlock);
      if (options.typewriter) {
        void appendCommandBlockSequential(snapshotBlock, rows, options);
      } else {
        appendCommandBlock(snapshotBlock, rows, options);
      }
      return;
    }

    if (options.typewriter) {
      void appendCommandBlockSequential(commandTranscript, rows, options);
      return;
    }

    appendCommandBlock(commandTranscript, rows, options);
  }

  async function appendCommandTimelineEntriesSequential(
    entries: readonly CommandTimelineEntry[],
    options: CommandConsoleAppendOptions
  ): Promise<void> {
    for (const entry of entries) {
      await appendCommandTimelineEntrySequential(entry, options);
    }
  }

  async function appendCommandTimelineEntrySequential(
    entry: CommandTimelineEntry,
    options: CommandConsoleAppendOptions
  ): Promise<void> {
    if (!shouldShowCommandTimelineEntry(entry)) {
      return;
    }

    const rows = getCommandTimelineEntryRows(entry);
    prepareCommandTranscriptForTimelineAppend();

    if (entry.kind === "commandSnapshot") {
      const snapshotBlock = document.createElement("div");
      snapshotBlock.className = "command-console__block command-console__block--snapshot";
      commandTranscript.append(snapshotBlock);
      await appendCommandBlockSequential(snapshotBlock, rows, options);
      scrollCommandTranscriptToEnd();
      return;
    }

    await appendCommandBlockSequential(commandTranscript, rows, options);
  }

  function getCommandTimelineEntryRows(entry: CommandTimelineEntry): readonly CommandConsoleRow[] {
    if (entry.kind === "commandSnapshot") {
      return createCommandConsoleRows(entry.rows).map((row, rowIndex) =>
        isCommandConsoleSpacerRow(row)
          ? row
          : withCommandConsoleRowMetadata(row, {
              entryId: entry.id,
              kind: entry.kind,
              turn: entry.turn,
              rowIndex
            })
      );
    }

    if (entry.kind === "tutorial") {
      return createCommandConsoleRows(entry.rows);
    }

    return createPlayerFacingResolutionRows(content, snapshot.factions, [entry.event]).map(
      (row, rowIndex) =>
        withCommandConsoleRowMetadata(row, {
          entryId: entry.id,
          eventId: entry.event.id,
          kind: entry.kind,
          turn: entry.turn,
          rowIndex: entry.event.index ?? rowIndex
        })
    );
  }

  function renderCommandTranscriptFromTimeline(): void {
    commandScrollbackPlayingEventId = undefined;
    commandTranscriptFollowsTail = true;
    commandTranscript.innerHTML = "";
    commandTranscript.classList.toggle("has-scrollback", commandTimelineEntries.length > 0);
    releaseTutorialCommandLogPinnedRow();
    commandLiveRows.remove();
    commandLiveRows.innerHTML = "";

    for (const entry of commandTimelineEntries) {
      appendCommandTimelineEntry(entry, { typewriter: false });
    }

    scrollCommandTranscriptToEnd();
  }

  function getVisibleCommandTimelineEntries(
    entries: readonly CommandTimelineEntry[]
  ): readonly CommandTimelineEntry[] {
    return entries.filter(shouldShowCommandTimelineEntry);
  }

  function shouldShowCommandTimelineEntry(entry: CommandTimelineEntry): boolean {
    if (entry.kind === "resolutionEvent" && entry.event.type === "MISSILE_IMPACT") {
      return false;
    }

    return true;
  }

  function appendCommandBlock(
    container: HTMLElement,
    rows: readonly CommandConsoleRow[],
    options: CommandConsoleAppendOptions
  ): void {
    for (const row of rows) {
      appendCommandConsoleLine(container, row.parts, row.className, {
        typewriter: options.typewriter,
        metadata: row.metadata
      });
    }
  }

  async function appendLiveCommandBlockSequential(
    rows: readonly CommandConsoleRow[],
    options: CommandConsoleAppendOptions
  ): Promise<void> {
    prepareCommandLiveRowsBlock();
    appendExecutePromptToLiveBlock();
    const lines = rows.map((row) =>
      appendCommandConsoleLine(commandLiveRows, row.parts, row.className, {
        metadata: row.metadata,
        typewriter: options.typewriter && shouldTypewriteLiveCommandRow(row),
        deferTypewriter: options.typewriter && shouldTypewriteLiveCommandRow(row)
      })
    );
    syncTutorialCommandLogPinnedRow(shouldShowExecutePrompt());
    scrollCommandTranscriptToEnd();

    for (const line of lines) {
      await line.startTypewriter?.();
      scrollCommandTranscriptToEnd();
    }
  }

  async function appendCommandBlockSequential(
    container: HTMLElement,
    rows: readonly CommandConsoleRow[],
    options: CommandConsoleAppendOptions
  ): Promise<void> {
    const lines = rows.map((row) => {
      const shouldTypewriteRow =
        options.typewriter && shouldTypewriteCommandTimelineRow(row, options);

      return appendCommandConsoleLine(container, row.parts, row.className, {
        typewriter: shouldTypewriteRow,
        metadata: row.metadata,
        deferTypewriter: shouldTypewriteRow
      });
    });
    scrollCommandTranscriptToEnd();

    for (const line of lines) {
      await line.startTypewriter?.();
      scrollCommandTranscriptToEnd();
    }
  }

  function getLiveCommandRows(isFrozen: boolean): readonly CommandConsoleRow[] {
    const warningSnapshot = getCachedCommandWarningSnapshot();
    return createCommandConsoleRows(
      getLiveCommandTimelineRows(isFrozen, warningSnapshot.projectedDv, warningSnapshot.warnings)
    ).map((row, rowIndex) => withLiveCommandConsoleRowMetadata(row, rowIndex));
  }

  function getLiveCommandTimelineRows(
    isFrozen: boolean,
    projectedDv: FactionCounts = getCachedCommandWarningSnapshot().projectedDv,
    warnings: readonly CommandWarning[] = getCachedCommandWarningSnapshot().warnings,
    options: LiveCommandTimelineRowsOptions = {}
  ): readonly CommandTimelineRow[] {
    let hasAppliedCommandSpacer = false;
    const committedSuffix = isTrailerModeActive ? "  COMMITTED" : "";
    const rows: CommandTimelineRow[] = [
      ...getCommandTurnBoundarySpacerRows(),
      ...getTutorialOpeningYearTimelineRows(),
      {
        parts: [
          { text: `TURN ${formatTurnForConsole(snapshot.turn)}${getPlanningTurnTimerSuffix()}` }
        ],
        className: getPlanningTurnLineClass(),
        key: `live-turn:${snapshot.turn}`
      },
      ...getActiveFactions(state).map((faction) =>
        createDvTelemetryTimelineRow(
          getConsoleFactionLabel(faction.id),
          faction.id,
          getFactionDv(snapshot, faction.id),
          projectedDv[faction.id] ?? 0
        )
      )
    ];

    if (tutorialPostVictoryActionLessonTurn === snapshot.turn) {
      rows.push(...createTutorialPostVictoryActionRows(getCommandFactionClass("player")));
    }

    if (
      tutorialPostVictoryActionLessonTurn !== null &&
      tutorialPostVictoryActionLessonTurn + 1 === snapshot.turn
    ) {
      rows.push(
        ...createTutorialPostVictoryAutomaticBehaviorRows(getCommandFactionClass("player"))
      );
    }

    const preTutorialBurnOrderIds = new Set<string>();
    const shouldShowOpponentBurnBeforeTutorial =
      tutorialState?.phase === "shipyardFirePrompt" ||
      tutorialState?.phase === "shipyardFireQueued" ||
      tutorialState?.phase === "shipyardFireWorkLesson";

    if (shouldShowOpponentBurnBeforeTutorial) {
      for (const order of [...snapshot.pendingBurnOrders, ...snapshot.activeBurnTransits]) {
        if (order.factionId === "player") {
          continue;
        }

        preTutorialBurnOrderIds.add(order.id);
        hasAppliedCommandSpacer = pushCommandOrderTimelineRow(
          rows,
          {
            parts: [
              { text: "BURN", className: getCommandFactionClass(order.factionId) },
              {
                text: ` from ${formatNodeName(content, order.originNodeId)} to ${formatNodeName(content, order.destinationNodeId)}; ETA T+${order.etaTurns}; cost -${order.burnCost} ΔV.`
              }
            ],
            key: `burn:${order.id}`
          },
          hasAppliedCommandSpacer
        );
      }
    }

    const tutorialLiveRows = splitTutorialLiveRowsByPriority(liveTutorialTimelineRows);
    rows.push(...tutorialLiveRows.primary);

    if (options.includeTutorialHints ?? true) {
      rows.push(...getTutorialLiveHints());
    }

    rows.push(...tutorialLiveRows.trailing);

    for (const order of snapshot.pendingFireOrders) {
      hasAppliedCommandSpacer = pushCommandOrderTimelineRow(
        rows,
        {
          parts: [
            { text: "FIRE", className: getCommandFactionClass(order.factionId) },
            {
              text: ` from ${formatNodeName(content, order.originNodeId)} to ${formatNodeName(content, order.targetNodeId)}; impact T-${order.missileEtaTurns}.${committedSuffix}`
            }
          ],
          key: `fire:${order.id}`
        },
        hasAppliedCommandSpacer
      );
    }

    for (const order of snapshot.pendingBurnOrders) {
      if (preTutorialBurnOrderIds.has(order.id)) {
        continue;
      }

      hasAppliedCommandSpacer = pushCommandOrderTimelineRow(
        rows,
        {
          parts: [
            { text: "BURN", className: getCommandFactionClass(order.factionId) },
            {
              text: ` from ${formatNodeName(content, order.originNodeId)} to ${formatNodeName(content, order.destinationNodeId)}; ETA T+${order.etaTurns}; cost -${order.burnCost} ΔV.${committedSuffix}`
            }
          ],
          key: `burn:${order.id}`
        },
        hasAppliedCommandSpacer
      );
    }

    if (tutorialLiveRows.postOrders.length > 0) {
      pushCommandTimelineSpacerIfNeeded(rows);
      rows.push(...tutorialLiveRows.postOrders);
    }

    for (const warning of warnings) {
      hasAppliedCommandSpacer = pushCommandOrderTimelineRow(
        rows,
        {
          parts: [
            {
              text: "WARNING",
              className: isFrozen
                ? "command-console__warning-word command-console__warning-word--frozen"
                : "command-console__warning-word"
            },
            {
              text: formatCommandWarningText(warning),
              className:
                warning.factionId === undefined
                  ? undefined
                  : getCommandFactionClass(warning.factionId)
            }
          ],
          key: `warning:${warning.nodeId}:${warning.event}:${warning.detail}:${warning.factionId ?? "neutral"}`
        },
        hasAppliedCommandSpacer
      );
    }

    return rows;
  }

  function getCommandTurnBoundarySpacerRows(): readonly CommandTimelineRow[] {
    return commandTimelineEntries.some(shouldShowCommandTimelineEntry)
      ? [createCommandSpacerRow()]
      : [];
  }

  function createCommandSpacerRow(): CommandTimelineRow {
    return {
      parts: [{ text: "" }],
      className: "command-console__line--spacer"
    };
  }

  function appendCommandResolutionBoundarySpacer(rows: CommandTimelineRow[]): void {
    pushCommandTimelineSpacerIfNeeded(rows);
  }

  function pushCommandTimelineSpacerIfNeeded(rows: CommandTimelineRow[]): void {
    const lastRow = rows.at(-1);

    if (lastRow === undefined || isCommandTimelineSpacerRow(lastRow)) {
      return;
    }

    rows.push(createCommandSpacerRow());
  }

  function pushCommandOrderTimelineRow(
    rows: CommandTimelineRow[],
    row: CommandTimelineRow,
    hasAppliedCommandSpacer: boolean
  ): boolean {
    if (!hasAppliedCommandSpacer) {
      pushCommandTimelineSpacerIfNeeded(rows);
    }

    rows.push(withCommandOrderLineSpacing(row, hasAppliedCommandSpacer));
    return true;
  }

  function isCommandConsoleSpacerRow(row: CommandConsoleRow): boolean {
    return (
      row.className?.includes("command-console__line--spacer") === true ||
      row.className?.includes("command-console__line--tutorial-spacer") === true
    );
  }

  function splitTutorialLiveRowsByPriority(rows: readonly CommandTimelineRow[]): Readonly<{
    primary: readonly CommandTimelineRow[];
    trailing: readonly CommandTimelineRow[];
    postOrders: readonly CommandTimelineRow[];
  }> {
    const primary: CommandTimelineRow[] = [];
    const trailing: CommandTimelineRow[] = [];
    const postOrders: CommandTimelineRow[] = [];

    for (const row of rows) {
      if (isPostOrderTutorialLiveRow(row)) {
        postOrders.push(row);
        continue;
      }

      (isTrailingTutorialLiveRow(row) ? trailing : primary).push(row);
    }

    return { primary, trailing, postOrders };
  }

  function isPostOrderTutorialLiveRow(row: CommandTimelineRow): boolean {
    return row.key === "tutorial:first-burn-time-cost";
  }

  function isTrailingTutorialLiveRow(row: CommandTimelineRow): boolean {
    if (row.className?.includes("command-console__line--tutorial-complete-hint") === true) {
      return false;
    }

    const key = row.key ?? "";
    const text = getCommandTimelineRowText(row);
    return (
      key.includes("tutorial:camera-pan-orbit-hint") ||
      key.includes("tutorial:camera-zoom-hint") ||
      text === tutorialCameraPanOrbitHintText ||
      text === tutorialCameraZoomHintText ||
      text === tutorialCameraFocusHintText ||
      text === tutorialConfirmCameraPanOrbitHintText
    );
  }

  function getPlanningTurnTimerSuffix(now = performance.now()): string {
    if (isTrailerAiMatchActive()) {
      return ` - ${trailerModePlanningTimerLabel}`;
    }

    if (planningTimerState.phase !== "planning") {
      return "";
    }

    return ` - ${formatPlanningCountdown(getPlanningTimerRemainingMs(now))}`;
  }

  function isTrailerAiMatchActive(): boolean {
    return (
      isTrailerModeActive &&
      !isGameMenuDemoActive &&
      tutorialState === null &&
      getActiveFactions(state).every((faction) => faction.controlType === "ai")
    );
  }

  function getPlanningTurnLineClass(now = performance.now()): string {
    if (isTrailerAiMatchActive()) {
      return "command-console__line--turn";
    }

    const remainingMs = getPlanningTimerRemainingMs(now);
    const isWarning =
      planningTimerState.phase === "planning" && remainingMs <= planningTimerWarningMs;

    return isWarning
      ? "command-console__line--turn command-console__line--turn-timer-warning"
      : "command-console__line--turn";
  }

  function getTutorialConfirmCameraPanOrbitHintText(startedAt: number | null): string | undefined {
    void startedAt;
    return undefined;
  }

  function getCurrentTutorialConfirmCameraPanOrbitHintDueAt(): number | null {
    return null;
  }

  function syncTutorialConfirmCameraHintRefreshTimer(): void {
    const dueAt = getCurrentTutorialConfirmCameraPanOrbitHintDueAt();

    if (dueAt === null || performance.now() >= dueAt) {
      clearTutorialConfirmCameraHintRefreshTimer();
      return;
    }

    clearTutorialConfirmCameraHintRefreshTimer();

    const timer = window.setTimeout(
      () => {
        tutorialConfirmCameraHintRefreshTimer = null;
        updateCommandConsole();
      },
      Math.max(0, dueAt - performance.now())
    );

    tutorialConfirmCameraHintRefreshTimer = timer;
  }

  function clearTutorialConfirmCameraHintRefreshTimer(): void {
    if (tutorialConfirmCameraHintRefreshTimer === null) {
      return;
    }

    window.clearTimeout(tutorialConfirmCameraHintRefreshTimer);
    tutorialConfirmCameraHintRefreshTimer = null;
  }

  function getTutorialLiveHints(): readonly CommandTimelineRow[] {
    const rows = getTutorialLivePromptRows();
    const turnScopedRows = isTutorialFirstTurn() ? rows : removeTutorialCameraHintRows(rows);
    const visibleRows = applyTutorialCameraHintDisplayLimits(turnScopedRows, tutorialState);

    if (visibleRows.length > 0) {
      lastNonEmptyTutorialLiveHintRows = visibleRows;
    }

    return visibleRows;
  }

  function isTutorialZoomFocusHintDue(now = performance.now()): boolean {
    const dueAt = getTutorialZoomFocusHintDueAt(now);
    return dueAt !== null && now >= dueAt;
  }

  function getTutorialZoomFocusHintDueAt(now = performance.now()): number | null {
    void now;
    return null;
  }

  function syncTutorialZoomFocusHintRefreshTimer(): void {
    const dueAt = getTutorialZoomFocusHintDueAt();

    if (dueAt === null || performance.now() >= dueAt) {
      clearTutorialZoomFocusHintRefreshTimer();
      return;
    }

    clearTutorialZoomFocusHintRefreshTimer();

    tutorialZoomFocusHintRefreshTimer = window.setTimeout(
      () => {
        tutorialZoomFocusHintRefreshTimer = null;
        updateCommandConsole();
      },
      Math.max(0, dueAt - performance.now())
    );
  }

  function queueTutorialZoomFocusHintCameraCheck(): void {
    if (tutorialState === null) {
      return;
    }

    if (tutorialZoomFocusHintPostInputFrame === null) {
      tutorialZoomFocusHintPostInputFrame = window.requestAnimationFrame(() => {
        tutorialZoomFocusHintPostInputFrame = null;
        refreshTutorialZoomFocusHintAfterCameraChange();
      });
    }

    if (tutorialZoomFocusHintPostInputTimer === null) {
      tutorialZoomFocusHintPostInputTimer = window.setTimeout(() => {
        tutorialZoomFocusHintPostInputTimer = null;
        refreshTutorialZoomFocusHintAfterCameraChange();
      }, 360);
    }
  }

  function refreshTutorialZoomFocusHintAfterCameraChange(): void {
    const wasVisible = tutorialZoomFocusHintVisible;
    const isVisible = isTutorialZoomFocusHintDue();
    tutorialZoomFocusHintVisible = isVisible;
    syncTutorialZoomFocusHintRefreshTimer();

    if (wasVisible !== isVisible) {
      updateCommandConsole();
    }
  }

  function clearTutorialZoomFocusHintTimers(): void {
    clearTutorialZoomFocusHintRefreshTimer();
    clearTutorialZoomFocusHintPostInputTimers();
    tutorialZoomFocusHintVisible = false;
  }

  function clearTutorialZoomFocusHintRefreshTimer(): void {
    if (tutorialZoomFocusHintRefreshTimer === null) {
      return;
    }

    window.clearTimeout(tutorialZoomFocusHintRefreshTimer);
    tutorialZoomFocusHintRefreshTimer = null;
  }

  function clearTutorialZoomFocusHintPostInputTimers(): void {
    if (tutorialZoomFocusHintPostInputFrame !== null) {
      window.cancelAnimationFrame(tutorialZoomFocusHintPostInputFrame);
      tutorialZoomFocusHintPostInputFrame = null;
    }

    if (tutorialZoomFocusHintPostInputTimer !== null) {
      window.clearTimeout(tutorialZoomFocusHintPostInputTimer);
      tutorialZoomFocusHintPostInputTimer = null;
    }
  }

  function getTutorialLivePromptRows(): readonly CommandTimelineRow[] {
    const tutorial = tutorialState;

    if (tutorial === null) {
      const overlayHint = getTutorialOverlayLiveHint();
      return overlayHint === null ? [] : [overlayHint];
    }

    if (isTutorialLogbookIntroductionBlockingOpening()) {
      return [
        ...createTutorialOpeningCameraControlLiveRows(
          "tutorial:opening-camera-controls",
          tutorialCameraZoomHintText,
          tutorialCameraOrbitHintText,
          tutorialCameraPanHintText,
          tutorialCameraFocusHintText
        ),
        createTutorialLogbookIntroductionLiveRow(
          tutorialLogbookOpenInstruction,
          commandGlossaryController.getTutorialLogbookIntroductionStep() === "open-prompt"
        )
      ];
    }

    const requiredShipSelection = getTutorialRequiredShipSelection(tutorial);

    if (requiredShipSelection !== null) {
      const selectRows = createTutorialSelectShipLiveRows(
        tutorial.phase === "awaitingInitialSelection"
          ? tutorialLiveHintClassName
          : getTutorialDelayedLiveHintClassName(requiredShipSelection.startedAt),
        requiredShipSelection.liveHintKey
      );

      if (tutorial.phase !== "awaitingInitialSelection") {
        return selectRows;
      }

      return [
        ...createTutorialOpeningCameraControlLiveRows(
          "tutorial:opening-camera-controls",
          tutorialCameraZoomHintText,
          tutorialCameraOrbitHintText,
          tutorialCameraPanHintText,
          tutorialCameraFocusHintText
        ),
        ...selectRows
      ];
    }

    const requiredFireMode = getTutorialRequiredFireMode(tutorial);

    if (requiredFireMode !== null) {
      return createTutorialEnterFireModeLiveRows(
        getTutorialDelayedLiveHintClassName(requiredFireMode.startedAt),
        requiredFireMode.liveHintKey,
        getCommandFactionClass("player")
      );
    }

    if (
      tutorial.phase === "awaitingFirstBurnPreview" ||
      tutorial.phase === "awaitingFirstBurnConfirm"
    ) {
      return createTutorialConfirmTransferBurnLiveRows(
        tutorialLiveHintClassName,
        "tutorial:live-confirm-first-burn",
        getCommandFactionClass("player"),
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            tutorial.firstSelectionAt
          )
        }
      );
    }

    if (
      (tutorial.phase === "awaitingProductiveBurnPreview" ||
        tutorial.phase === "awaitingProductiveBurnConfirm") &&
      tutorial.productiveBurnOriginNodeId !== null
    ) {
      return createTutorialConfirmTransferBurnLiveRows(
        getTutorialDelayedLiveHintClassName(tutorial.productiveBurnPromptStartedAt),
        "tutorial:live-confirm-productive-burn",
        getCommandFactionClass("player"),
        {
          zoomHintText: tutorialCameraZoomHintText,
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            tutorial.productiveBurnPromptStartedAt
          )
        }
      );
    }

    if (tutorial.phase === "shipyardFirePrompt" && isTutorialShipyardFireModeActive(tutorial)) {
      return createTutorialConfirmFiringSolutionLiveRows(
        getTutorialDelayedLiveHintClassName(tutorial.shipyardFirePromptStartedAt),
        "tutorial:live-confirm-shipyard-fire",
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            tutorial.shipyardFirePromptStartedAt
          )
        }
      );
    }

    if (
      tutorial.phase === "shipyardContestedFirePrompt" &&
      isTutorialSelectedFireModeActive(tutorial.shipyardSupportFireNodeId)
    ) {
      return createTutorialConfirmFiringSolutionLiveRows(
        getTutorialDelayedLiveHintClassName(tutorial.shipyardSupportFirePromptStartedAt),
        "tutorial:live-confirm-shipyard-contested-fire",
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            tutorial.shipyardSupportFirePromptStartedAt
          )
        }
      );
    }

    if (tutorial.phase === "shipyardContestedBurnPrompt") {
      return createTutorialConfirmBurnLiveRows(
        getTutorialDelayedLiveHintClassName(tutorial.shipyardContestedPromptStartedAt),
        "tutorial:live-confirm-contested-burn",
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            tutorial.shipyardContestedPromptStartedAt
          )
        }
      );
    }

    if (tutorial.phase === "shipyardCounterContestBurnPrompt") {
      return createTutorialConfirmTransferBurnLiveRows(
        getTutorialDelayedLiveHintClassName(tutorial.shipyardContestedPromptStartedAt),
        "tutorial:live-confirm-counter-contest-burn",
        getCommandFactionClass("player"),
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            tutorial.shipyardContestedPromptStartedAt
          )
        }
      );
    }

    if (tutorial.phase === "enemyBurnTarget") {
      return createTutorialConfirmTransferBurnLiveRows(
        getTutorialDelayedLiveHintClassName(lastTutorialPlayerActivityAt),
        "tutorial:live-confirm-enemy-burn",
        getCommandFactionClass("player"),
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            lastTutorialPlayerActivityAt
          )
        }
      );
    }

    if (tutorial.phase === "awaitingBurnOut") {
      return createTutorialConfirmBurnLiveRows(
        getTutorialDelayedLiveHintClassName(lastTutorialPlayerActivityAt),
        "tutorial:live-confirm-burn-out",
        {
          cameraPanOrbitHintText: getTutorialConfirmCameraPanOrbitHintText(
            lastTutorialPlayerActivityAt
          )
        }
      );
    }

    return [];
  }

  function getTutorialRequiredShipSelection(
    tutorial: TutorialRuntimeState
  ): TutorialRequiredShipSelection | null {
    if (isTutorialLogbookIntroductionBlockingOpening()) {
      return null;
    }

    const selectedNodeId = getNodeIdFromTargetKey(selectedTargetKey);

    if (tutorial.phase === "awaitingInitialSelection") {
      return selectedNodeId === tutorialOpeningOriginNodeId
        ? null
        : {
            nodeId: tutorialOpeningOriginNodeId,
            startedAt: tutorial.startedAt,
            liveHintKey: "tutorial:live-select-ship"
          };
    }

    if (
      tutorial.phase === "awaitingFirstBurnPreview" ||
      tutorial.phase === "awaitingFirstBurnConfirm"
    ) {
      return selectedNodeId === tutorialOpeningOriginNodeId
        ? null
        : {
            nodeId: tutorialOpeningOriginNodeId,
            startedAt: tutorial.firstBurnReselectionStartedAt ?? lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-first-burn-ship"
          };
    }

    if (
      (tutorial.phase === "awaitingProductiveBurnPreview" ||
        tutorial.phase === "awaitingProductiveBurnConfirm") &&
      tutorial.productiveBurnOriginNodeId !== null
    ) {
      return selectedNodeId === tutorial.productiveBurnOriginNodeId
        ? null
        : {
            nodeId: tutorial.productiveBurnOriginNodeId,
            startedAt: tutorial.productiveBurnReselectionStartedAt ?? lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-productive-burn-ship"
          };
    }

    if (tutorial.phase === "shipyardFirePrompt") {
      return selectedNodeId === tutorial.shipyardLessonNodeId
        ? null
        : {
            nodeId: tutorial.shipyardLessonNodeId,
            startedAt: tutorial.shipyardFirePromptStartedAt ?? lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-shipyard-fire-ship"
          };
    }

    if (
      tutorial.phase === "shipyardContestedFirePrompt" &&
      tutorial.shipyardSupportFireNodeId !== null
    ) {
      return selectedNodeId === tutorial.shipyardSupportFireNodeId
        ? null
        : {
            nodeId: tutorial.shipyardSupportFireNodeId,
            startedAt: tutorial.shipyardSupportFirePromptStartedAt ?? lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-shipyard-contested-fire-ship"
          };
    }

    if (tutorial.phase === "shipyardContestedBurnPrompt") {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (contestedNodeId === null || selectedNodeId === contestedNodeId) {
        return null;
      }

      return {
        nodeId: contestedNodeId,
        startedAt: tutorial.shipyardContestedPromptStartedAt ?? lastTutorialPlayerActivityAt,
        liveHintKey: "tutorial:live-reselect-contested-burn-ship"
      };
    }

    if (
      tutorial.phase === "shipyardCounterContestBurnPrompt" &&
      tutorial.shipyardCounterContestOriginNodeId !== null
    ) {
      return selectedNodeId === tutorial.shipyardCounterContestOriginNodeId
        ? null
        : {
            nodeId: tutorial.shipyardCounterContestOriginNodeId,
            startedAt: tutorial.shipyardContestedPromptStartedAt ?? lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-counter-contest-burn-ship"
          };
    }

    if (tutorial.phase === "enemyBurnTarget") {
      if (selectedNodeId !== null && isPlayerOccupiedNode(selectedNodeId)) {
        return null;
      }

      const originNodeId = findPlayerOccupiedNodeIdExcluding(
        new Set([tutorial.enemyNodeId].filter((nodeId): nodeId is string => nodeId !== null))
      );

      return originNodeId === null
        ? null
        : {
            nodeId: originNodeId,
            startedAt: lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-enemy-burn-ship"
          };
    }

    if (tutorial.phase === "awaitingBurnOut" && tutorial.defensivePlayerNodeId !== null) {
      return selectedNodeId === tutorial.defensivePlayerNodeId
        ? null
        : {
            nodeId: tutorial.defensivePlayerNodeId,
            startedAt: lastTutorialPlayerActivityAt,
            liveHintKey: "tutorial:live-reselect-burn-out-ship"
          };
    }

    return null;
  }

  function getTutorialRequiredFireMode(
    tutorial: TutorialRuntimeState
  ): TutorialRequiredFireMode | null {
    if (
      tutorial.phase === "shipyardFirePrompt" &&
      getNodeIdFromTargetKey(selectedTargetKey) === tutorial.shipyardLessonNodeId &&
      cinematicRenderer?.isFireModeActive() !== true
    ) {
      return {
        nodeId: tutorial.shipyardLessonNodeId,
        startedAt: tutorial.shipyardFirePromptStartedAt ?? lastTutorialPlayerActivityAt,
        liveHintKey: "tutorial:live-enter-shipyard-fire-mode"
      };
    }

    if (
      tutorial.phase === "shipyardContestedFirePrompt" &&
      tutorial.shipyardSupportFireNodeId !== null &&
      getNodeIdFromTargetKey(selectedTargetKey) === tutorial.shipyardSupportFireNodeId &&
      cinematicRenderer?.isFireModeActive() !== true
    ) {
      return {
        nodeId: tutorial.shipyardSupportFireNodeId,
        startedAt: tutorial.shipyardSupportFirePromptStartedAt ?? lastTutorialPlayerActivityAt,
        liveHintKey: "tutorial:live-enter-shipyard-contested-fire-mode"
      };
    }

    return null;
  }

  function isTutorialShipyardFireModeActive(tutorial: TutorialRuntimeState): boolean {
    return (
      tutorial.phase === "shipyardFirePrompt" &&
      isTutorialSelectedFireModeActive(tutorial.shipyardLessonNodeId)
    );
  }

  function isTutorialSelectedFireModeActive(nodeId: string | null): boolean {
    return (
      nodeId !== null &&
      getNodeIdFromTargetKey(selectedTargetKey) === nodeId &&
      cinematicRenderer?.isFireModeActive() === true
    );
  }

  function getTutorialOverlayLiveHint(): CommandTimelineRow | null {
    if (
      tutorialOverlayTextMode === "off" ||
      isReplayMode ||
      postMatchReportText !== null ||
      !isPlayerFactionHuman()
    ) {
      return null;
    }

    const selectedNodeId = getNodeIdFromTargetKey(selectedTargetKey);
    const pendingPlayerOrderCount = getPendingPlayerBurnOrFireOrderCount();

    if (isMandatoryLaunchLockActive()) {
      return createTutorialOverlayLiveHintRow(
        "Shipyard output must launch. Select a destination, confirm BURN, then resolve."
      );
    }

    if (pendingPlayerOrderCount > 0) {
      return createTutorialOverlayLiveHintRow("Order queued. Resolve the turn when you are ready.");
    }

    if (selectedNodeId !== null) {
      return createTutorialOverlayLiveHintRow(
        tutorialState === null
          ? "Ship selected. Hover another orbit for BURN, or use FIRE mode against enemy ships."
          : "Ship selected. Hover another orbit for BURN."
      );
    }

    return createTutorialOverlayLiveHintRow(
      "Select one of your occupied orbits when you want to plan a move or shot."
    );
  }

  function getCinematicGuidanceAttentionPulse(): CinematicTutorialAttentionPulse | null {
    return getTutorialGuidanceAttentionPulse() ?? getMandatoryLaunchGuidanceAttentionPulse();
  }

  function getTutorialGuidanceAttentionPulse(): CinematicTutorialAttentionPulse | null {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return getTutorialOverlayGuidanceAttentionPulse();
    }

    if (tutorial.inputLocked || tutorial.autoAdvanceActive) {
      return null;
    }

    const target = getTutorialGuidanceAttentionTarget(tutorial);

    if (target === null) {
      return null;
    }

    ensureGuidanceAttentionTargetVisible(target);
    const isBurnConfirmAttention = target.colorRole === "burn-preview";
    const musicPulse = musicEngine.getVisualPulse();

    if (musicPulse !== null && !isBurnConfirmAttention) {
      return {
        targetKey: target.targetKey,
        ...(target.candidateTargetKeys === undefined
          ? {}
          : { candidateTargetKeys: target.candidateTargetKeys }),
        ...(target.pulseCandidateTargets === true ? { pulseCandidateTargets: true } : {}),
        ...(target.colorRole === undefined ? {} : { colorRole: target.colorRole }),
        ...(target.nodeBlinkMode === undefined ? {} : { nodeBlinkMode: target.nodeBlinkMode }),
        phase: musicPulse.phase,
        intensity: musicPulse.intensity,
        secondsPerPulse: musicPulse.secondsPerPulse
      };
    }

    const elapsedSeconds = Math.max(0, (performance.now() - target.fallbackStartedAt) / 1000);
    const secondsPerPulse =
      target.secondsPerPulse ??
      (isBurnConfirmAttention ? burnConfirmGuidancePulseSeconds : guidancePulseSeconds);
    const phase = (elapsedSeconds % secondsPerPulse) / Math.max(0.001, secondsPerPulse);
    const fallbackIntensity = getGuidanceFallbackPulseIntensity(phase);
    const intensityFloor =
      target.intensityFloor ?? (isBurnConfirmAttention ? burnConfirmGuidanceIntensityFloor : 0);

    return {
      targetKey: target.targetKey,
      ...(target.candidateTargetKeys === undefined
        ? {}
        : { candidateTargetKeys: target.candidateTargetKeys }),
      ...(target.pulseCandidateTargets === true ? { pulseCandidateTargets: true } : {}),
      ...(target.colorRole === undefined ? {} : { colorRole: target.colorRole }),
      ...(target.nodeBlinkMode === undefined ? {} : { nodeBlinkMode: target.nodeBlinkMode }),
      phase,
      intensity:
        intensityFloor > 0
          ? clampNumber(intensityFloor + fallbackIntensity * (1 - intensityFloor), 0, 1)
          : fallbackIntensity,
      secondsPerPulse
    };
  }

  function getTutorialOverlayGuidanceAttentionPulse(): CinematicTutorialAttentionPulse | null {
    if (
      tutorialOverlayBlinkMode === "off" ||
      isReplayMode ||
      postMatchReportText !== null ||
      !isPlayerFactionHuman()
    ) {
      return null;
    }

    const target = getTutorialOverlayGuidanceAttentionTarget();

    if (target === null) {
      return null;
    }

    ensureGuidanceAttentionTargetVisible(target);
    const musicPulse = musicEngine.getVisualPulse();

    if (musicPulse !== null) {
      const slowPulseSlot = ((musicPulse.pulseIndex % 2) + 2) % 2;
      return {
        targetKey: target.targetKey,
        ...(target.candidateTargetKeys === undefined
          ? {}
          : { candidateTargetKeys: target.candidateTargetKeys }),
        ...(target.pulseCandidateTargets === true ? { pulseCandidateTargets: true } : {}),
        phase: (slowPulseSlot + musicPulse.phase) / 2,
        intensity: slowPulseSlot === 0 ? musicPulse.intensity : 0,
        secondsPerPulse: musicPulse.secondsPerPulse * 2
      };
    }

    const elapsedSeconds = Math.max(0, (performance.now() - target.fallbackStartedAt) / 1000);
    const secondsPerPulse = guidancePulseSeconds * 2;
    const phase = (elapsedSeconds % secondsPerPulse) / Math.max(0.001, secondsPerPulse);

    return {
      targetKey: target.targetKey,
      ...(target.candidateTargetKeys === undefined
        ? {}
        : { candidateTargetKeys: target.candidateTargetKeys }),
      ...(target.pulseCandidateTargets === true ? { pulseCandidateTargets: true } : {}),
      phase,
      intensity: getGuidanceFallbackPulseIntensity(phase),
      secondsPerPulse
    };
  }

  function getTutorialOverlayGuidanceAttentionTarget(): TutorialGuidanceAttentionTarget | null {
    if (getPendingPlayerBurnOrFireOrderCount() > 0 || isMandatoryLaunchLockActive()) {
      return null;
    }

    const selectedNodeId = getNodeIdFromTargetKey(selectedTargetKey);

    if (selectedNodeId === null || !isPlayerOccupiedNode(selectedNodeId)) {
      if (performance.now() - tutorialOverlayStartedAt < tutorialOverlayGuidanceDelayMs) {
        return null;
      }

      const playerNodeTargetKeys = getPlayerOccupiedNodeTargetKeys();
      const primaryTargetKey = playerNodeTargetKeys[0];

      if (primaryTargetKey === undefined) {
        return null;
      }

      return {
        targetKey: primaryTargetKey,
        candidateTargetKeys: playerNodeTargetKeys.slice(1),
        fallbackStartedAt: tutorialOverlayStartedAt + tutorialOverlayGuidanceDelayMs
      };
    }

    if (
      lastPlayerNodeSelectionAt === null ||
      performance.now() - lastPlayerNodeSelectionAt < tutorialOverlayGuidanceDelayMs
    ) {
      return null;
    }

    const promptTargetKeys = getContextualBurnPromptTargetKeys(selectedNodeId);
    const primaryTargetKey = promptTargetKeys[0];

    if (primaryTargetKey === undefined) {
      return null;
    }

    return {
      targetKey: primaryTargetKey,
      candidateTargetKeys: promptTargetKeys.slice(1),
      fallbackStartedAt: lastPlayerNodeSelectionAt + tutorialOverlayGuidanceDelayMs
    };
  }

  function getMandatoryLaunchGuidanceAttentionPulse(): CinematicTutorialAttentionPulse | null {
    const tutorial = tutorialState;

    if (
      isReplayMode ||
      postMatchReportText !== null ||
      !isPlayerFactionHuman() ||
      (tutorial === null && tutorialOverlayBlinkMode === "off") ||
      (tutorial !== null && (tutorial.inputLocked || tutorial.autoAdvanceActive))
    ) {
      return null;
    }

    const target = getMandatoryLaunchGuidanceAttentionTarget();

    if (target === null) {
      return null;
    }

    ensureGuidanceAttentionTargetVisible(target);
    const musicPulse = musicEngine.getVisualPulse();

    if (musicPulse !== null) {
      const slowPulseSlot = ((musicPulse.pulseIndex % 2) + 2) % 2;
      return {
        targetKey: target.targetKey,
        ...(target.candidateTargetKeys === undefined
          ? {}
          : { candidateTargetKeys: target.candidateTargetKeys }),
        ...(target.pulseCandidateTargets === true ? { pulseCandidateTargets: true } : {}),
        phase: (slowPulseSlot + musicPulse.phase) / 2,
        intensity: slowPulseSlot === 0 ? musicPulse.intensity : 0,
        secondsPerPulse: musicPulse.secondsPerPulse * 2
      };
    }

    const elapsedSeconds = Math.max(0, (performance.now() - target.fallbackStartedAt) / 1000);
    const secondsPerPulse = guidancePulseSeconds * 2;
    const phase = (elapsedSeconds % secondsPerPulse) / Math.max(0.001, secondsPerPulse);

    return {
      targetKey: target.targetKey,
      ...(target.candidateTargetKeys === undefined
        ? {}
        : { candidateTargetKeys: target.candidateTargetKeys }),
      ...(target.pulseCandidateTargets === true ? { pulseCandidateTargets: true } : {}),
      phase,
      intensity: getGuidanceFallbackPulseIntensity(phase),
      secondsPerPulse
    };
  }

  function getMandatoryLaunchGuidanceAttentionTarget(): TutorialGuidanceAttentionTarget | null {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (mandatoryLaunch === undefined) {
      return null;
    }

    const now = performance.now();
    const startedAt = mandatoryLaunchGuidanceStartedAt ?? now;
    mandatoryLaunchGuidanceStartedAt = startedAt;

    if (now - startedAt < mandatoryLaunchGuidanceDelayMs) {
      return null;
    }

    const promptTargetKeys = getMandatoryLaunchPromptTargetKeys(mandatoryLaunch.nodeId);
    const primaryTargetKey = promptTargetKeys[0];

    if (primaryTargetKey === undefined) {
      return null;
    }

    return {
      targetKey: primaryTargetKey,
      candidateTargetKeys: promptTargetKeys.slice(1),
      fallbackStartedAt: startedAt + mandatoryLaunchGuidanceDelayMs
    };
  }

  function getMandatoryLaunchPromptTargetKeys(originNodeId: string): readonly string[] {
    const forcedTutorialDestinationNodeId =
      getTutorialForcedMandatoryLaunchDestinationNodeId(originNodeId);

    if (forcedTutorialDestinationNodeId !== null) {
      return [`node:${forcedTutorialDestinationNodeId}`];
    }

    return content.nodes
      .flatMap((node) => {
        if (node.id === originNodeId || !isSuggestedBurnGuidanceNode(node)) {
          return [];
        }

        const plan = withBurnAffordability(
          calculateBurnPlan(content, state, originNodeId, node.id),
          originNodeId,
          node.id
        );

        if (plan?.isAffordable !== true) {
          return [];
        }

        return [
          {
            nodeId: node.id,
            etaTurns: plan.etaTurns,
            burnCost: plan.burnCost
          }
        ];
      })
      .sort((first, second) => {
        const firstType = content.nodes.find((node) => node.id === first.nodeId)?.type ?? "barren";
        const secondType =
          content.nodes.find((node) => node.id === second.nodeId)?.type ?? "barren";
        const firstShipyardPriority = firstType === "shipyard" ? 0 : 1;
        const secondShipyardPriority = secondType === "shipyard" ? 0 : 1;

        if (firstShipyardPriority !== secondShipyardPriority) {
          return firstShipyardPriority - secondShipyardPriority;
        }

        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }

        return first.nodeId.localeCompare(second.nodeId);
      })
      .map((target) => `node:${target.nodeId}`);
  }

  function getTutorialForcedMandatoryLaunchDestinationNodeId(originNodeId: string): string | null {
    const tutorial = tutorialState;

    if (tutorial === null || !isTutorialCounterContestRecoveryRouteActive(tutorial)) {
      return null;
    }

    const targetNodeId = findTutorialEnemyOccupiedShipyardNodeId(tutorial, originNodeId);

    if (targetNodeId === null) {
      return null;
    }

    const plan = withBurnAffordability(
      calculateBurnPlan(content, state, originNodeId, targetNodeId),
      originNodeId,
      targetNodeId
    );

    return plan?.isAffordable === true ? targetNodeId : null;
  }

  function isTutorialCounterContestRecoveryRouteActive(tutorial: TutorialRuntimeState): boolean {
    return (
      tutorial.shipyardContestedRecoveryActive ||
      tutorial.shipyardPlayerEscapeNodeId !== null ||
      tutorial.shipyardCounterContestOriginNodeId !== null ||
      tutorial.loggedKeys.has("tutorial:shipyard-contested-rule") ||
      tutorial.loggedKeys.has("tutorial:shipyard-contested-support-fire") ||
      tutorial.loggedKeys.has("tutorial:shipyard-counter-contest-burn")
    );
  }

  function findTutorialEnemyOccupiedShipyardNodeId(
    tutorial: TutorialRuntimeState,
    originNodeId: string
  ): string | null {
    const preferredNodeIds = [
      tutorial.contestedNodeId,
      tutorial.shipyardLessonNodeId,
      tutorial.shipyardEnemyDestinationNodeId
    ];

    for (const nodeId of preferredNodeIds) {
      if (nodeId !== null && isTutorialEnemyOccupiedShipyardNode(nodeId, originNodeId)) {
        return nodeId;
      }
    }

    return (
      content.nodes
        .filter((node) => isTutorialEnemyOccupiedShipyardNode(node.id, originNodeId))
        .sort((first, second) => first.id.localeCompare(second.id))[0]?.id ?? null
    );
  }

  function isTutorialEnemyOccupiedShipyardNode(nodeId: string, originNodeId: string): boolean {
    return (
      nodeId !== originNodeId &&
      content.nodes.find((node) => node.id === nodeId)?.type === "shipyard" &&
      hasFactionShipAtNode(state, nodeId, "opponent") &&
      !hasFactionShipAtNode(state, nodeId, "player")
    );
  }

  function ensureGuidanceAttentionTargetVisible(target: TutorialGuidanceAttentionTarget): void {
    void target;
  }

  function getContextualBurnPromptTargetKeys(originNodeId: string): readonly string[] {
    return content.nodes
      .filter((node) => {
        return (
          node.id !== originNodeId &&
          isSuggestedBurnGuidanceNode(node) &&
          calculateBurnPlan(content, state, originNodeId, node.id) !== null
        );
      })
      .map((node) => `node:${node.id}`);
  }

  function getPlayerOccupiedNodeTargetKeys(): readonly string[] {
    return snapshot.nodeOccupancies
      .filter((occupancy) => occupancy.factionId === "player" && occupancy.shipCount > 0)
      .map((occupancy) => `node:${occupancy.nodeId}`);
  }

  function isSuggestedBurnGuidanceNode(node: SolarSystemData["nodes"][number]): boolean {
    return !node.protectedNoWar && node.type !== "protected" && !isEarthOrMoonNodeId(node.id);
  }

  function isPlayerOccupiedNode(nodeId: string): boolean {
    return snapshot.nodeOccupancies.some((occupancy) => {
      return (
        occupancy.nodeId === nodeId && occupancy.factionId === "player" && occupancy.shipCount > 0
      );
    });
  }

  function getPendingPlayerBurnOrFireOrderCount(): number {
    return (
      snapshot.pendingBurnOrders.filter((order) => order.factionId === "player").length +
      snapshot.pendingFireOrders.filter((order) => order.factionId === "player").length
    );
  }

  function getProductiveMarkerVisualPulse(): CinematicVisualPulse {
    const musicPulse = musicEngine.getVisualPulse();

    if (musicPulse !== null) {
      const slowPulseSlot = ((musicPulse.pulseIndex % 2) + 2) % 2;
      return {
        phase: (slowPulseSlot + musicPulse.phase) / 2,
        intensity: slowPulseSlot === 0 ? musicPulse.intensity : 0,
        pulseIndex: Math.floor(musicPulse.pulseIndex / 2),
        secondsPerPulse: musicPulse.secondsPerPulse * 2
      };
    }

    const secondsPerPulse = guidancePulseSeconds * 2;
    const elapsedSeconds = getFallbackBeatElapsedSeconds();
    const phase = (elapsedSeconds % secondsPerPulse) / Math.max(0.001, secondsPerPulse);

    return {
      phase,
      intensity: getGuidanceFallbackPulseIntensity(phase),
      pulseIndex: Math.floor(elapsedSeconds / secondsPerPulse),
      secondsPerPulse
    };
  }

  function getRawMusicBeatVisualPulse(): CinematicVisualPulse | null {
    const musicPulse = musicEngine.getVisualPulse();

    if (musicPulse === null) {
      return null;
    }

    return {
      phase: musicPulse.phase,
      intensity: musicPulse.intensity,
      pulseIndex: musicPulse.pulseIndex,
      secondsPerPulse: musicPulse.secondsPerPulse
    };
  }

  function getTutorialGuidanceAttentionTarget(
    tutorial: TutorialRuntimeState
  ): TutorialGuidanceAttentionTarget | null {
    if (isTutorialLogbookIntroductionBlockingOpening()) {
      return null;
    }

    const requiredShipSelection = getTutorialRequiredShipSelection(tutorial);

    if (requiredShipSelection !== null) {
      const now = performance.now();
      const startedAt = requiredShipSelection.startedAt ?? now;

      if (tutorial.phase !== "awaitingInitialSelection") {
        if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
          return null;
        }

        return {
          targetKey: `node:${requiredShipSelection.nodeId}`,
          colorRole: "burn-preview" as const,
          fallbackStartedAt: startedAt + tutorialFirstBurnConfusionDelayMs
        };
      }

      return {
        targetKey: `node:${requiredShipSelection.nodeId}`,
        colorRole: "burn-preview" as const,
        fallbackStartedAt: startedAt
      };
    }

    const requiredFireMode = getTutorialRequiredFireMode(tutorial);

    if (requiredFireMode !== null) {
      const now = performance.now();
      const startedAt = requiredFireMode.startedAt ?? now;

      if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
        return null;
      }

      return {
        targetKey: `node:${requiredFireMode.nodeId}`,
        fallbackStartedAt: startedAt + tutorialFirstBurnConfusionDelayMs
      };
    }

    if (
      tutorial.phase === "shipyardFirePrompt" &&
      tutorial.shipyardEnemyDestinationNodeId !== null
    ) {
      const now = performance.now();
      const startedAt = tutorial.shipyardFirePromptStartedAt ?? now;
      tutorial.shipyardFirePromptStartedAt = startedAt;
      const enemyBurnTargetKey = getTutorialShipyardEnemyBurnTargetKey(tutorial);

      return {
        targetKey: `node:${tutorial.shipyardEnemyDestinationNodeId}`,
        candidateTargetKeys: enemyBurnTargetKey === null ? [] : [enemyBurnTargetKey],
        pulseCandidateTargets: true,
        fallbackStartedAt: startedAt
      };
    }

    if (
      tutorial.phase === "shipyardContestedFirePrompt" &&
      tutorial.shipyardSupportFireNodeId !== null &&
      isTutorialSelectedFireModeActive(tutorial.shipyardSupportFireNodeId)
    ) {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (contestedNodeId === null) {
        return null;
      }

      const now = performance.now();
      const startedAt = tutorial.shipyardSupportFirePromptStartedAt ?? now;
      tutorial.shipyardSupportFirePromptStartedAt = startedAt;

      if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
        return null;
      }

      return {
        targetKey: `node:${contestedNodeId}`,
        candidateTargetKeys: [`node:${tutorial.shipyardSupportFireNodeId}`],
        pulseCandidateTargets: true,
        fallbackStartedAt: startedAt
      };
    }

    if (tutorial.phase === "shipyardContestedBurnPrompt") {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (contestedNodeId === null) {
        return null;
      }

      const now = performance.now();
      const startedAt = tutorial.shipyardContestedPromptStartedAt ?? now;
      tutorial.shipyardContestedPromptStartedAt = startedAt;

      if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
        return null;
      }

      const promptTargetKeys = getTutorialShipyardContestedBurnPromptTargetKeys(contestedNodeId);

      if (promptTargetKeys.length === 0) {
        return null;
      }

      return {
        targetKey: promptTargetKeys[0] ?? `node:${contestedNodeId}`,
        candidateTargetKeys: promptTargetKeys.slice(1),
        fallbackStartedAt: startedAt
      };
    }

    if (
      tutorial.phase === "shipyardCounterContestBurnPrompt" &&
      tutorial.shipyardCounterContestOriginNodeId !== null
    ) {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (contestedNodeId === null) {
        return null;
      }

      const now = performance.now();
      const startedAt = tutorial.shipyardContestedPromptStartedAt ?? now;
      tutorial.shipyardContestedPromptStartedAt = startedAt;

      if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
        return null;
      }

      return {
        targetKey: `node:${contestedNodeId}`,
        candidateTargetKeys: [`node:${tutorial.shipyardCounterContestOriginNodeId}`],
        pulseCandidateTargets: true,
        fallbackStartedAt: startedAt
      };
    }

    if (tutorial.phase === "awaitingInitialSelection") {
      return {
        targetKey: `node:${tutorialOpeningOriginNodeId}`,
        fallbackStartedAt: tutorial.startedAt
      };
    }

    const isAwaitingProductiveBurnTarget =
      tutorial.phase === "awaitingProductiveBurnPreview" ||
      tutorial.phase === "awaitingProductiveBurnConfirm";

    if (isAwaitingProductiveBurnTarget && tutorial.productiveBurnOriginNodeId !== null) {
      const now = performance.now();
      const hasSelectedProductiveBurnShip =
        getNodeIdFromTargetKey(selectedTargetKey) === tutorial.productiveBurnOriginNodeId;

      if (!hasSelectedProductiveBurnShip) {
        const startedAt = tutorial.productiveBurnReselectionStartedAt ?? now;
        tutorial.productiveBurnReselectionStartedAt = startedAt;

        if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
          return null;
        }

        return {
          targetKey: `node:${tutorial.productiveBurnOriginNodeId}`,
          fallbackStartedAt: startedAt + tutorialFirstBurnConfusionDelayMs
        };
      }

      const startedAt = tutorial.productiveBurnPromptStartedAt ?? now;
      tutorial.productiveBurnPromptStartedAt = startedAt;
      tutorial.productiveBurnReselectionStartedAt = null;
      const shouldUseShipyardHintPulse =
        tutorial.shipyardContestedRecoveryActive !== true &&
        tutorial.productiveBurnOriginNodeId === tutorialEnemyFireNodeId;
      const promptDelayMs = shouldUseShipyardHintPulse
        ? tutorialProductiveShipyardHintDelayMs
        : tutorialFirstBurnConfusionDelayMs;

      if (now - startedAt < promptDelayMs) {
        return null;
      }

      const promptTargetKeys = getTutorialProductiveBurnPromptTargetKeys(
        tutorial.productiveBurnOriginNodeId
      );

      if (promptTargetKeys.length === 0) {
        return null;
      }

      const productiveShipyardTargetKey = `node:${tutorialFallbackShipyardNodeId}`;
      const primaryTargetKey = shouldUseShipyardHintPulse
        ? productiveShipyardTargetKey
        : (promptTargetKeys[0] ?? `node:${tutorial.productiveBurnOriginNodeId}`);
      const candidateTargetKeys = shouldUseShipyardHintPulse ? [] : promptTargetKeys.slice(1);
      const shouldPulseProductiveShipyard =
        shouldUseShipyardHintPulse && primaryTargetKey === `node:${tutorialFallbackShipyardNodeId}`;

      if (shouldUseShipyardHintPulse && !promptTargetKeys.includes(productiveShipyardTargetKey)) {
        return null;
      }

      return {
        targetKey: primaryTargetKey,
        candidateTargetKeys,
        colorRole: "burn-preview" as const,
        ...(shouldPulseProductiveShipyard
          ? {
              intensityFloor: tutorialProductiveShipyardHintIntensityFloor,
              secondsPerPulse: tutorialProductiveShipyardHintPulseSeconds
            }
          : {}),
        fallbackStartedAt: startedAt + promptDelayMs
      };
    }

    const isAwaitingFirstBurnTarget =
      tutorial.phase === "awaitingFirstBurnPreview" ||
      tutorial.phase === "awaitingFirstBurnConfirm";

    if (!isAwaitingFirstBurnTarget || tutorial.firstSelectionAt === null) {
      return null;
    }

    if (getNodeIdFromTargetKey(selectedTargetKey) !== tutorialOpeningOriginNodeId) {
      const now = performance.now();
      const startedAt = tutorial.firstBurnReselectionStartedAt ?? now;
      tutorial.firstBurnReselectionStartedAt = startedAt;

      if (now - startedAt < tutorialFirstBurnConfusionDelayMs) {
        return null;
      }

      return {
        targetKey: `node:${tutorialOpeningOriginNodeId}`,
        fallbackStartedAt: startedAt + tutorialFirstBurnConfusionDelayMs
      };
    }

    if (performance.now() - tutorial.firstSelectionAt < tutorialFirstBurnConfusionDelayMs) {
      return null;
    }

    const promptTargetKeys = getTutorialFirstBurnAttentionTargetKeys();

    if (promptTargetKeys.length === 0) {
      return null;
    }

    return {
      targetKey: promptTargetKeys[0] ?? `node:${tutorialEnemyFireNodeId}`,
      candidateTargetKeys: [],
      colorRole: "burn-preview" as const,
      fallbackStartedAt: tutorial.firstSelectionAt + tutorialFirstBurnConfusionDelayMs
    };
  }

  function getTutorialFirstBurnAttentionTargetKeys(): readonly string[] {
    return content.nodes.some((node) => node.id === tutorialEnemyFireNodeId)
      ? [`node:${tutorialEnemyFireNodeId}`]
      : [];
  }

  function getTutorialProductiveBurnPromptTargetKeys(originNodeId: string): readonly string[] {
    const originType = content.nodes.find((node) => node.id === originNodeId)?.type ?? "barren";
    const recoveryNeedsShipyard = tutorialState?.shipyardContestedRecoveryActive === true;
    const contestedShipyardNodeId =
      recoveryNeedsShipyard && tutorialState !== null
        ? getTutorialShipyardContestedTargetNodeId(tutorialState)
        : null;

    return content.nodes
      .flatMap((node) => {
        if (
          node.id === originNodeId ||
          !isSuggestedBurnGuidanceNode(node) ||
          (recoveryNeedsShipyard &&
            !isTutorialSupportProductionShipyardDestination(
              originNodeId,
              node.id,
              contestedShipyardNodeId
            )) ||
          (node.type !== "tritium" && node.type !== "shipyard")
        ) {
          return [];
        }

        const plan = withBurnAffordability(
          calculateBurnPlan(content, state, originNodeId, node.id),
          originNodeId,
          node.id
        );

        if (plan?.isAffordable !== true) {
          return [];
        }

        return [
          {
            nodeId: node.id,
            tutorialPriority:
              originNodeId === tutorialEnemyFireNodeId && node.id === tutorialFallbackShipyardNodeId
                ? -1
                : 0,
            typePriority: recoveryNeedsShipyard
              ? 0
              : getTutorialProductiveBurnTypePriority(originType, node.type),
            etaTurns: plan.etaTurns,
            burnCost: plan.burnCost
          }
        ];
      })
      .sort((first, second) => {
        if (first.tutorialPriority !== second.tutorialPriority) {
          return first.tutorialPriority - second.tutorialPriority;
        }

        if (first.typePriority !== second.typePriority) {
          return first.typePriority - second.typePriority;
        }

        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }

        return first.nodeId.localeCompare(second.nodeId);
      })
      .map((target) => `node:${target.nodeId}`);
  }

  function getTutorialShipyardContestedBurnPromptTargetKeys(
    originNodeId: string
  ): readonly string[] {
    const candidateTargets = content.nodes.flatMap((node) => {
      if (
        node.id === originNodeId ||
        (node.type !== "shipyard" && node.type !== "tritium" && node.type !== "barren") ||
        !isSuggestedBurnGuidanceNode(node) ||
        wouldPlayerStackAtDestination(node.id)
      ) {
        return [];
      }

      const plan = withBurnAffordability(
        calculateBurnPlan(content, state, originNodeId, node.id),
        originNodeId,
        node.id
      );

      if (plan?.isAffordable !== true) {
        return [];
      }

      return [
        {
          nodeId: node.id,
          typePriority: node.type === "shipyard" ? 0 : node.type === "tritium" ? 1 : 2,
          etaTurns: plan.etaTurns,
          burnCost: plan.burnCost
        }
      ];
    });

    const hasShipyardTarget = candidateTargets.some((target) => target.typePriority === 0);

    return candidateTargets
      .filter((target) => !hasShipyardTarget || target.typePriority === 0)
      .sort((first, second) => {
        if (first.typePriority !== second.typePriority) {
          return first.typePriority - second.typePriority;
        }

        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }

        return first.nodeId.localeCompare(second.nodeId);
      })
      .map((target) => `node:${target.nodeId}`);
  }

  function getTutorialProductiveBurnTypePriority(
    originType: SolarSystemData["nodes"][number]["type"],
    targetType: SolarSystemData["nodes"][number]["type"]
  ): number {
    if (originType === "shipyard") {
      return targetType === "tritium" ? 0 : 1;
    }

    if (originType === "tritium") {
      return targetType === "shipyard" ? 0 : 1;
    }

    return targetType === "tritium" ? 0 : 1;
  }

  function getGuidanceFallbackPulseIntensity(phase: number): number {
    if (phase < guidancePulseAttackRatio) {
      const progress = phase / Math.max(0.001, guidancePulseAttackRatio);
      return 1 - (1 - progress) ** 3;
    }

    if (phase < guidancePulseDecayRatio) {
      const progress =
        (phase - guidancePulseAttackRatio) /
        Math.max(0.001, guidancePulseDecayRatio - guidancePulseAttackRatio);
      return 1 - progress ** 3 * 0.82;
    }

    return 0;
  }

  function formatCommandWarningText(warning: CommandWarning): string {
    const nodeName = formatNodeName(content, warning.nodeId);
    const projectedDv = warning.projectedDvAtEvent ?? 0;

    if (warning.reason === "evade-blocked-contested") {
      return `: EVADE will be blocked at ${nodeName} because the orbit is CONTESTED. BURN out before impact to break the firing solution.`;
    }

    if (warning.event === "CONTESTED") {
      return `: ${nodeName} will become CONTESTED ${formatWarningCountdown(warning.eventTurn ?? snapshot.turn + 1)}. WORK, FIRE and EVADE will then be unavailable there.`;
    }

    if (warning.event === "UPKEEP") {
      return `: contested upkeep at ${nodeName} will cost 2 ΔV ${formatWarningCountdown(warning.eventTurn ?? snapshot.turn + 1)}, but the faction is projected to have ${projectedDv} ΔV.`;
    }

    if (warning.event === "EVADE") {
      return `: ${nodeName} will need 1 ΔV to EVADE ${formatWarningCountdown(warning.eventTurn ?? snapshot.turn + 1)}, but the faction is projected to have ${projectedDv} ΔV.`;
    }

    if (warning.event === "LAUNCH") {
      return `: MANDATORY LAUNCH is due at ${nodeName} next turn, but no valid destination is affordable with the projected ${projectedDv} ΔV.`;
    }

    return `: ${warning.event} at ${nodeName}. ${warning.detail}.`;
  }

  function createDvTelemetryTimelineRow(
    label: string,
    factionId: FactionId,
    currentDv: number,
    projectedDv: number
  ): CommandTimelineRow {
    const recovery = getGlossaryDvForecast(factionId);
    const history = getCommandDvTelemetryValues(factionId, projectedDv);
    const upkeepCost = recovery.projectedUpkeepByTurn[0] ?? 0;
    const committedCosts = recovery.committedCostsByTurn[0] ?? upkeepCost;
    const glossaryContext: GameGlossaryLineContext = {
      kind: "dv",
      factionLabel: getConsoleFactionLabel(factionId),
      currentDv,
      committedDv: projectedDv,
      nextTurnDv: recovery.projectedDvByTurn[0] ?? projectedDv,
      pendingBurnCost: Math.max(0, currentDv - recovery.currentDv),
      upkeepCost,
      evadeCost: Math.max(0, committedCosts - upkeepCost),
      income: recovery.projectedIncomeByTurn[0] ?? 0,
      history
    };

    return {
      parts: [
        { text: label, className: getCommandFactionClass(factionId) },
        {
          text: ` ${formatDvForConsole(currentDv)} ΔV -> ${formatDvForConsole(projectedDv)} ΔV `
        },
        {
          dvBars: {
            factionId,
            values: history
          }
        }
      ],
      className: "command-console__line--dv-telemetry",
      key: `dv:${factionId}`,
      glossaryContext
    };
  }

  function getGlossaryDvForecast(factionId: FactionId): FactionRecoveryPath {
    let forecasts = glossaryDvForecastsByState.get(state);

    if (forecasts === undefined) {
      forecasts = new Map();
      glossaryDvForecastsByState.set(state, forecasts);
    }

    const cached = forecasts.get(factionId);

    if (cached !== undefined) {
      return cached;
    }

    const forecast = evaluateFactionRecoveryPath(content, state, factionId);
    forecasts.set(factionId, forecast);
    return forecast;
  }

  function getConsoleFactionLabel(factionId: FactionId): string {
    const identity = getFactionIdentity(state, factionId);
    const displayName = identity.displayName.trim();

    if (tutorialState !== null && factionId === "player") {
      return "PLAYER";
    }

    return (displayName.length > 0 ? displayName : factionId).toUpperCase();
  }

  function getCommandDvTelemetryValues(
    factionId: FactionId,
    projectedDv: number
  ): readonly number[] {
    const historicalDvSamples = commandDvHistory.slice(0, -1);
    const completedTurnHistory = historicalDvSamples.map((entry) => entry[factionId] ?? 0);
    return [...completedTurnHistory.slice(-4), projectedDv];
  }

  function createCommandConsoleRows(
    rows: readonly CommandTimelineRow[]
  ): readonly CommandConsoleRow[] {
    return rows.map((row) => {
      return {
        ...row,
        parts: row.parts.flatMap((part): readonly CommandConsolePart[] => {
          if ("dvBars" in part) {
            return [
              {
                element: createDvBarsElement(part.dvBars.factionId, part.dvBars.values)
              }
            ];
          }

          return createCommandConsoleTextParts(part.text, part.className);
        })
      };
    });
  }

  function withCommandConsoleRowMetadata(
    row: CommandConsoleRow,
    metadata: CommandConsoleRowMetadata
  ): CommandConsoleRow {
    return {
      ...row,
      metadata: {
        ...metadata,
        ...(row.glossaryContext === undefined ? {} : { glossaryContext: row.glossaryContext })
      }
    };
  }

  function withLiveCommandConsoleRowMetadata(
    row: CommandConsoleRow,
    rowIndex: number
  ): CommandConsoleRow {
    if (row.key === undefined) {
      return row;
    }

    return withCommandConsoleRowMetadata(row, {
      kind: "live",
      turn: snapshot.turn,
      rowIndex,
      rowKey: row.key
    });
  }

  function createDvBarsElement(factionId: FactionId, values: readonly number[]): HTMLSpanElement {
    const bars = document.createElement("span");
    bars.className = `dv-bars ${getCommandFactionClass(factionId)}`;
    const bounded = values.slice(-5);
    const maxValue = Math.max(10, ...bounded);
    const factionLabel = getConsoleFactionLabel(factionId);
    const valuesLabel = bounded.join(" → ");
    const sampleExplanation =
      bounded.length <= 1
        ? "The only bar is the live projection; no resolved history is available yet."
        : "Left bars are resolved history; the right bar is the live projection.";
    applyGameGlossaryTokenSemantics(bars, "dv-chart", `${factionLabel} ΔV trend`);
    bars.dataset["glossaryShort"] =
      `${factionLabel} ΔV trend: ${valuesLabel}. ${sampleExplanation}`;

    for (const value of bounded) {
      const bar = document.createElement("span");
      const height = Math.max(2, Math.round(2 + (Math.max(0, value) / maxValue) * 12));
      bar.style.height = `${height}px`;
      bars.append(bar);
    }

    return bars;
  }

  function getExecutePromptMode(): ExecutePromptMode {
    if (isTutorialCrewLostExecuteCueActive()) {
      return "crew-lost";
    }

    if (planningTimerState.phase === "executeCountdown") {
      return "countdown";
    }

    if (isMandatoryLaunchLockActive()) {
      return "launch";
    }

    return "execute";
  }

  function getCommandOrderLineClass(hasAppliedCommandSpacer: boolean): string | undefined {
    return hasAppliedCommandSpacer ? undefined : "command-console__line--command-start";
  }

  function withCommandOrderLineSpacing(
    row: CommandTimelineRow,
    hasAppliedCommandSpacer: boolean
  ): CommandTimelineRow {
    const className = getCommandOrderLineClass(hasAppliedCommandSpacer);

    return className === undefined ? row : { ...row, className };
  }

  function shouldTypewriteLiveCommandRow(row: CommandConsoleRow): boolean {
    const className = row.className ?? "";

    return (
      !className.includes("command-console__line--turn") &&
      !className.includes("command-console__line--dv-telemetry") &&
      !isCommandConsoleSpacerRow(row)
    );
  }

  function shouldTypewriteCommandTimelineRow(
    row: CommandConsoleRow,
    options: CommandConsoleAppendOptions
  ): boolean {
    if (options.typewriteAllNonSpacerRows === true && !isCommandConsoleSpacerRow(row)) {
      return true;
    }

    return shouldTypewriteLiveCommandRow(row);
  }

  function renderExecutePrompt(mode: ExecutePromptMode): void {
    executePrompt.innerHTML = "";
    executePrompt.classList.toggle("command-console__execute--launch", mode === "launch");
    executePrompt.classList.toggle("command-console__execute--countdown", mode === "countdown");
    executePrompt.classList.toggle("command-console__execute--crew-lost", mode === "crew-lost");
    executePrompt.append(createExecutePromptLabel(mode));
  }

  function createExecutePromptLabel(mode: ExecutePromptMode): DocumentFragment {
    const fragment = document.createDocumentFragment();

    if (mode === "launch") {
      const launch = document.createElement("span");
      launch.className = "execute-launch-word";
      launch.textContent = "MANDATORY LAUNCH";
      fragment.append(launch);
      return fragment;
    }

    if (mode === "countdown") {
      fragment.append(
        document.createTextNode(`EXECUTE IN ${getPlanningExecuteCountdownSeconds()}`)
      );
      return fragment;
    }

    if (mode === "crew-lost") {
      const crewLost = document.createElement("span");
      crewLost.className = "execute-crew-lost-word";
      crewLost.textContent = "CREW LOST";
      fragment.append(crewLost);
      return fragment;
    }

    fragment.append(document.createTextNode("EXECUTE"));

    const question = document.createElement("span");
    question.className = "execute-question";
    question.textContent = "?";
    fragment.append(question);

    return fragment;
  }

  function getPlanningExecuteCountdownSeconds(now = performance.now()): number {
    return Math.max(
      1,
      Math.ceil(Math.max(0, planningTimerState.executeCountdownEndsAtMs - now) / 1000)
    );
  }

  function scrollCommandTranscriptToEnd(): void {
    if (!commandTranscriptFollowsTail) {
      return;
    }

    if (commandTranscriptScrollFrame !== null) {
      return;
    }

    commandTranscriptScrollFrame = window.requestAnimationFrame(() => {
      commandTranscriptScrollFrame = null;

      if (!commandTranscriptFollowsTail) {
        return;
      }

      scrollCommandTranscriptTo(getCommandTranscriptScrollEnd(), getCommandTranscriptBehavior());
    });
  }

  function snapCommandTranscriptToLiveTail(): void {
    commandTranscriptFollowsTail = true;
    cancelCommandTranscriptScrollAnimation();
    scrollCommandTranscriptTo(getCommandTranscriptScrollEnd(), "auto");
  }

  function getCommandTranscriptBehavior(): ScrollBehavior {
    return typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";
  }

  function scrollCommandTranscriptTo(top: number, behavior: ScrollBehavior): void {
    if (typeof commandTranscript.scrollTo === "function") {
      commandTranscript.scrollTo({ top, behavior });
      return;
    }

    commandTranscript.scrollTop = top;
  }

  function cancelCommandTranscriptScrollAnimation(): void {
    if (commandTranscriptScrollFrame !== null) {
      window.cancelAnimationFrame(commandTranscriptScrollFrame);
    }

    commandTranscriptScrollFrame = null;
  }

  function getCommandTranscriptScrollEnd(): number {
    return Math.max(0, commandTranscript.scrollHeight - commandTranscript.clientHeight);
  }

  function isCommandTranscriptAtEnd(): boolean {
    return (
      getCommandTranscriptScrollEnd() - commandTranscript.scrollTop <=
      commandTranscriptTailTolerancePixels
    );
  }

  function appendCommandConsoleLine(
    container: HTMLElement,
    parts: readonly CommandConsolePart[],
    className?: string,
    options: Readonly<{
      deferTypewriter?: boolean;
      typewriter?: boolean;
      metadata?: CommandConsoleRowMetadata | undefined;
    }> = {}
  ): CommandConsoleLineElement {
    const line = document.createElement("div") as CommandConsoleLineElement;
    line.className =
      className === undefined ? "command-console__line" : `command-console__line ${className}`;
    applyCommandConsoleRowMetadata(line, options.metadata);

    const typewriterTargets: Array<Readonly<{ span: HTMLSpanElement; text: string }>> = [];
    const deferredElements: HTMLSpanElement[] = [];

    for (const part of parts) {
      if (part.text !== undefined) {
        const textSpans = createGameGlossaryTextSpans(document, part.text, part.className);

        for (const span of textSpans) {
          if (options.typewriter === true) {
            const text = span.textContent ?? "";
            span.textContent = "";
            typewriterTargets.push({ span, text });
          }
          line.append(span);
        }
      }
      if (part.element !== undefined) {
        const span = document.createElement("span");
        span.append(part.element);
        if (options.typewriter === true) {
          span.hidden = true;
          deferredElements.push(span);
        }
        if (part.className !== undefined) {
          span.className = part.className;
        }
        line.append(span);
      }
    }

    if (line.matches('[role="button"]') && line.querySelector(".command-glossary-token") !== null) {
      line.removeAttribute("role");
      line.removeAttribute("tabindex");
      line.removeAttribute("aria-label");
    }

    container.append(line);

    if (options.typewriter === true) {
      line.classList.add("is-typewriting");
      reserveTypewriterLineHeight(line, typewriterTargets, deferredElements);
      line.startTypewriter = () => {
        if (line.typewriterDone !== undefined) {
          return line.typewriterDone;
        }

        const cursor = document.createElement("span");
        cursor.className = "command-console__type-cursor";
        line.append(cursor);
        line.typewriterDone = startCommandLineTypewriter(
          line,
          typewriterTargets,
          deferredElements,
          cursor
        );
        return line.typewriterDone;
      };

      if (options.deferTypewriter !== true) {
        void line.startTypewriter();
      }
    }

    return line;
  }

  function reserveTypewriterLineHeight(
    line: HTMLElement,
    targets: readonly Readonly<{ span: HTMLSpanElement; text: string }>[],
    deferredElements: readonly HTMLSpanElement[]
  ): void {
    for (const target of targets) {
      target.span.textContent = target.text;
    }

    for (const element of deferredElements) {
      element.hidden = false;
    }

    const reservedHeight = line.getBoundingClientRect().height;

    for (const target of targets) {
      target.span.textContent = "";
    }

    for (const element of deferredElements) {
      element.hidden = true;
    }

    if (reservedHeight > 0) {
      line.style.height = `${reservedHeight}px`;
    }
  }

  function applyCommandConsoleRowMetadata(
    line: HTMLElement,
    metadata: CommandConsoleRowMetadata | undefined
  ): void {
    if (metadata === undefined) {
      return;
    }

    if (metadata.entryId !== undefined) {
      line.dataset["entryId"] = metadata.entryId;
    }

    if (
      metadata.eventId !== undefined ||
      metadata.kind === "commandSnapshot" ||
      metadata.rowKey !== undefined
    ) {
      if (metadata.eventId !== undefined) {
        line.dataset["eventId"] = metadata.eventId;
      }
      if (isTutorialFirstEnemyKillReplayEventId(metadata.eventId)) {
        line.classList.add("command-console__line--tutorial-replay-cue");
      }
      line.classList.add("command-console__line--linked-event");
      line.tabIndex = 0;
      line.setAttribute("role", "button");
      line.setAttribute("aria-label", createCommandScrollbackRowLabel(metadata));
    }

    if (metadata.rowKey !== undefined) {
      line.dataset["rowKey"] = metadata.rowKey;
    }

    if (metadata.kind !== undefined) {
      line.dataset["kind"] = metadata.kind;
    }

    if (metadata.turn !== undefined) {
      line.dataset["turn"] = String(metadata.turn);
    }

    if (metadata.rowIndex !== undefined) {
      line.dataset["rowIndex"] = String(metadata.rowIndex);
    }

    if (metadata.glossaryContext !== undefined) {
      line.dataset["glossaryContext"] = JSON.stringify(metadata.glossaryContext);
    }
  }

  function createCommandScrollbackRowLabel(metadata: CommandConsoleRowMetadata): string {
    if (metadata.kind === "live") {
      return metadata.rowKey?.startsWith("warning:") === true
        ? "Focus current warning"
        : "Focus current command";
    }

    const turnLabel = metadata.turn === undefined ? "unknown turn" : `turn ${metadata.turn + 1}`;
    const rowLabel =
      metadata.rowIndex === undefined
        ? "event"
        : `event ${String(metadata.rowIndex).padStart(2, "0")}`;
    return `Review ${turnLabel}, ${rowLabel}`;
  }

  function getCommandScrollbackLine(target: EventTarget | null): HTMLElement | null {
    if (!(target instanceof Element)) {
      return null;
    }

    return target.closest<HTMLElement>(commandScrollbackLineSelector);
  }

  function getCommandScrollbackLineAtPoint(clientX: number, clientY: number): HTMLElement | null {
    for (const container of getCommandLogInteractiveContainers()) {
      const containerRect = container.getBoundingClientRect();

      if (
        clientX < containerRect.left ||
        clientX > containerRect.right ||
        clientY < containerRect.top ||
        clientY > containerRect.bottom
      ) {
        continue;
      }

      for (const line of container.querySelectorAll<HTMLElement>(commandScrollbackLineSelector)) {
        const rect = line.getBoundingClientRect();

        if (
          clientY >= rect.top - commandLogScrubLineHitSlopPixels &&
          clientY <= rect.bottom + commandLogScrubLineHitSlopPixels
        ) {
          return line;
        }
      }
    }

    return null;
  }

  function getCommandLogInteractiveContainers(): readonly HTMLElement[] {
    return [commandTranscript];
  }

  function getCommandScrollbackLineFromPointer(
    event: Readonly<Pick<MouseEvent, "clientX" | "clientY" | "target">>
  ): HTMLElement | null {
    return (
      getCommandScrollbackLine(event.target) ??
      getCommandScrollbackLineAtPoint(event.clientX, event.clientY)
    );
  }

  function getCommandScrollbackLineTargetId(line: HTMLElement | null): string | null {
    return line?.dataset["eventId"] ?? line?.dataset["entryId"] ?? null;
  }

  function getCommandScrollbackLineReviewKey(line: HTMLElement | null): string | null {
    if (line === null) {
      return null;
    }

    const eventId = line.dataset["eventId"];

    if (eventId !== undefined) {
      return `event:${eventId}`;
    }

    const entryId = line.dataset["entryId"];

    if (entryId !== undefined) {
      const rowIndex = line.dataset["rowIndex"];
      return rowIndex === undefined ? `entry:${entryId}` : `entry:${entryId}:row:${rowIndex}`;
    }

    const rowKey = line.dataset["rowKey"];
    return rowKey === undefined ? null : `row:${rowKey}`;
  }

  function isCommandLogTurnHeaderLine(line: HTMLElement | null): boolean {
    return (
      line?.classList.contains("command-console__line--turn") === true ||
      line?.classList.contains("command-console__line--dv-telemetry") === true
    );
  }

  function startCommandLineTypewriter(
    line: HTMLElement,
    targets: readonly Readonly<{ span: HTMLSpanElement; text: string }>[],
    deferredElements: readonly HTMLSpanElement[],
    cursor: HTMLSpanElement
  ): Promise<void> {
    const totalCharacters = targets.reduce((total, target) => {
      return total + target.text.length;
    }, 0);
    const durationMs = clampNumber(
      totalCharacters * commandTypewriterMsPerCharacter,
      commandTypewriterMinDurationMs,
      commandTypewriterMaxDurationMs
    );
    const startedAt = performance.now();

    const renderVisibleCharacters = (visibleCharacters: number) => {
      let remainingCharacters = visibleCharacters;

      for (const target of targets) {
        const visibleInTarget = clampNumber(remainingCharacters, 0, target.text.length);
        target.span.textContent = target.text.slice(0, visibleInTarget);
        remainingCharacters -= visibleInTarget;
      }
    };

    return new Promise((resolve) => {
      const finishTypewriter = () => {
        renderVisibleCharacters(totalCharacters);
        for (const element of deferredElements) {
          element.hidden = false;
        }
        cursor.remove();
        releaseTypewriterLineHeight(line);
        scrollCommandTranscriptToEnd();
        resolve();
      };

      if (
        totalCharacters === 0 ||
        (turnPresentationDeadlineAt !== null && performance.now() >= turnPresentationDeadlineAt)
      ) {
        finishTypewriter();
        return;
      }

      const typeNextFrame = () => {
        const now = performance.now();
        const progress =
          turnPresentationDeadlineAt !== null && now >= turnPresentationDeadlineAt
            ? 1
            : clampNumber((now - startedAt) / durationMs, 0, 1);
        const visibleCharacters = Math.min(
          totalCharacters,
          Math.max(1, Math.floor(progress * totalCharacters))
        );
        renderVisibleCharacters(visibleCharacters);

        if (visibleCharacters >= totalCharacters) {
          for (const element of deferredElements) {
            element.hidden = false;
          }
          cursor.remove();
          releaseTypewriterLineHeight(line);
          scrollCommandTranscriptToEnd();
          resolve();
          return;
        }

        window.requestAnimationFrame(typeNextFrame);
      };

      window.requestAnimationFrame(typeNextFrame);
    });
  }

  function releaseTypewriterLineHeight(line: HTMLElement): void {
    const reservedHeight = Number.parseFloat(line.style.height);
    line.classList.remove("is-typewriting");
    const finalHeight = line.getBoundingClientRect().height;
    const stableHeight = Math.max(
      Number.isFinite(reservedHeight) ? reservedHeight : 0,
      finalHeight
    );

    if (stableHeight > 0) {
      line.style.minHeight = `${stableHeight}px`;
    }

    line.style.height = "";
  }

  function waitForCommandConsoleMs(durationMs: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, durationMs);
    });
  }

  function clampNumber(value: number, minimum: number, maximum: number): number {
    return Math.min(maximum, Math.max(minimum, value));
  }

  function getProjectedCommandDv(): FactionCounts {
    const projected = getPendingOrderProjectedDv();

    for (const occupancy of snapshot.nodeOccupancies) {
      if (occupancy.shipCount <= 0 || !isSnapshotNodeContested(occupancy.nodeId)) {
        continue;
      }

      projected[occupancy.factionId] = Math.max(
        0,
        (projected[occupancy.factionId] ?? 0) - 2 * occupancy.shipCount
      );
    }

    for (const missile of snapshot.activeMissiles) {
      if (
        missile.impactTurn !== snapshot.turn + 1 ||
        isSnapshotNodeContested(missile.targetNodeId) ||
        hasPendingBurnAwayForMissile(missile)
      ) {
        continue;
      }

      projected[missile.targetFactionId] = Math.max(
        0,
        (projected[missile.targetFactionId] ?? 0) - 1
      );
    }

    return projected;
  }

  function invalidateCommandWarningSnapshot(): void {
    cachedWarningSnapshot = null;
  }

  function getCachedCommandWarningSnapshot(): CommandWarningSnapshot {
    if (
      cachedWarningSnapshot !== null &&
      cachedWarningSnapshot.sourceContent === content &&
      cachedWarningSnapshot.sourceState === state &&
      cachedWarningSnapshot.sourceSnapshot === snapshot
    ) {
      return cachedWarningSnapshot;
    }

    cachedWarningSnapshot = computeCommandWarningSnapshot(state);
    return cachedWarningSnapshot;
  }

  function computeCommandWarningSnapshot(gameState: GameState): CommandWarningSnapshot {
    const projectedDv = getProjectedCommandDv();
    if (isZeroTimerAiAutorunMode()) {
      return {
        sourceContent: content,
        sourceState: gameState,
        sourceSnapshot: snapshot,
        projectedDv,
        warnings: [],
        nodeWarningLevels: new Map()
      };
    }

    const warnings = getCommandWarnings(projectedDv);

    return {
      sourceContent: content,
      sourceState: gameState,
      sourceSnapshot: snapshot,
      projectedDv,
      warnings,
      nodeWarningLevels: computeCachedNodeWarningLevels(warnings)
    };
  }

  function computeCachedNodeWarningLevels(
    warnings: readonly CommandWarning[]
  ): ReadonlyMap<string, WarningLevel> {
    const levels = new Map<string, WarningLevel>();

    for (const warning of warnings) {
      if (warning.event !== "CONTESTED") {
        continue;
      }

      levels.set(warning.nodeId, "warning");
    }

    return levels;
  }

  function getCachedNodeWarningLevels(): ReadonlyMap<string, WarningLevel> {
    return getCachedCommandWarningSnapshot().nodeWarningLevels;
  }

  function getPendingOrderProjectedDv(): FactionCounts {
    const projected: FactionCounts = { ...snapshot.factionDv };

    for (const order of snapshot.pendingBurnOrders) {
      projected[order.factionId] = Math.max(0, (projected[order.factionId] ?? 0) - order.burnCost);
    }

    return projected;
  }

  function hasPendingBurnAwayForMissile(
    missile: SolarSystemSnapshot["activeMissiles"][number]
  ): boolean {
    return snapshot.pendingBurnOrders.some((order) => {
      return (
        order.factionId === missile.targetFactionId &&
        order.originNodeId === missile.targetNodeId &&
        order.destinationNodeId !== missile.targetNodeId &&
        order.shipCount > 0
      );
    });
  }

  function hasPendingPlayerBurnAwayFromNode(nodeId: string): boolean {
    return snapshot.pendingBurnOrders.some((order) => {
      return (
        order.factionId === "player" &&
        order.originNodeId === nodeId &&
        order.destinationNodeId !== nodeId &&
        order.shipCount > 0
      );
    });
  }

  function hasPlayerShipAtNode(nodeId: string): boolean {
    return snapshot.nodeOccupancies.some((occupancy) => {
      return (
        occupancy.nodeId === nodeId && occupancy.factionId === "player" && occupancy.shipCount > 0
      );
    });
  }

  function getUpcomingContestedWarnings(): readonly CommandWarning[] {
    const warningsByNode = new Map<string, CommandWarning>();

    for (const transit of snapshot.activeBurnTransits) {
      if (transit.factionId === "player") {
        continue;
      }

      const node = snapshot.nodes.find((candidate) => candidate.id === transit.destinationNodeId);

      if (node === undefined || node.protectedNoWar) {
        continue;
      }

      if (!hasPlayerShipAtNode(node.id)) {
        continue;
      }

      if (hasPendingPlayerBurnAwayFromNode(node.id)) {
        continue;
      }

      if (!shouldShowActiveTransitWarning(transit)) {
        continue;
      }

      warningsByNode.set(node.id, {
        nodeId: node.id,
        event: "CONTESTED",
        detail: `contested ${formatWarningCountdown(transit.arrivalTurn)}`,
        factionId: "player",
        eventTurn: transit.arrivalTurn
      });
    }

    return [...warningsByNode.values()].sort((first, second) => {
      return formatNodeName(content, first.nodeId).localeCompare(
        formatNodeName(content, second.nodeId)
      );
    });
  }

  function getCommandWarnings(projectedDv: FactionCounts): readonly CommandWarning[] {
    recordBrowserPerformanceCounter("getCommandWarnings");

    const upcomingContestedWarnings = getUpcomingContestedWarnings();
    const upcomingContestedNodeIds = new Set(
      upcomingContestedWarnings.map((warning) => warning.nodeId)
    );
    const warnings: CommandWarning[] = [...upcomingContestedWarnings];
    const playerRecovery = evaluateFactionRecoveryPath(content, state, "player");

    for (const occupancy of snapshot.nodeOccupancies) {
      if (occupancy.shipCount <= 0 || !isSnapshotNodeContested(occupancy.nodeId)) {
        continue;
      }

      if (occupancy.factionId !== "player") {
        continue;
      }

      const upkeepCost = 2 * occupancy.shipCount;
      const upkeepThreat = playerRecovery.knownThreats.find((threat) => {
        return (
          threat.kind === "upkeep" &&
          threat.status === "unsafe" &&
          threat.eventTurn === snapshot.turn + 1 &&
          threat.projectedDvAtEvent < upkeepCost
        );
      });

      if (upkeepThreat !== undefined) {
        warnings.push({
          nodeId: occupancy.nodeId,
          event: "UPKEEP",
          detail: `${formatWarningCountdown(upkeepThreat.eventTurn)} ΔV < ${upkeepCost}`,
          factionId: occupancy.factionId,
          eventTurn: upkeepThreat.eventTurn,
          currentDv: upkeepThreat.currentDv,
          projectedDvAtEvent: upkeepThreat.projectedDvAtEvent,
          guaranteedIncomeBeforeEvent: 0,
          committedCostsBeforeEvent: getCommittedCostsBeforeRecoveryEvent(
            playerRecovery,
            upkeepThreat.eventTurn
          ),
          projectionStatus: "unsafe",
          reason: upkeepThreat.reason
        });
      }
    }

    for (const missile of snapshot.activeMissiles) {
      if (missile.targetFactionId !== "player") {
        continue;
      }

      if (hasPendingBurnAwayForMissile(missile)) {
        continue;
      }

      if (upcomingContestedNodeIds.has(missile.targetNodeId)) {
        continue;
      }

      if (!shouldShowActiveMissileWarning(missile)) {
        continue;
      }

      if (isSnapshotNodeContested(missile.targetNodeId)) {
        warnings.push({
          nodeId: missile.targetNodeId,
          event: "EVADE",
          detail: "BLOCKED — CONTESTED",
          factionId: missile.targetFactionId,
          eventTurn: missile.impactTurn,
          projectionStatus: "unsafe",
          reason: "evade-blocked-contested"
        });
        continue;
      }

      const missileThreat = playerRecovery.knownThreats.find((threat) => {
        return threat.kind === "missile" && threat.id === missile.id;
      });

      if (
        missileThreat === undefined ||
        missileThreat.status !== "unsafe" ||
        missileThreat.reason !== "evade-dv-insufficient-at-impact" ||
        missileThreat.projectedDvAtEvent >= 1
      ) {
        continue;
      }

      warnings.push({
        nodeId: missile.targetNodeId,
        event: "EVADE",
        detail: `unavailable ${formatWarningCountdown(missile.impactTurn)} ΔV < 1`,
        factionId: missile.targetFactionId,
        eventTurn: missileThreat.eventTurn,
        currentDv: missileThreat.currentDv,
        projectedDvAtEvent: missileThreat.projectedDvAtEvent,
        guaranteedIncomeBeforeEvent: getGuaranteedIncomeBeforeRecoveryEvent(
          playerRecovery,
          missileThreat.eventTurn
        ),
        committedCostsBeforeEvent: getCommittedCostsBeforeRecoveryEvent(
          playerRecovery,
          missileThreat.eventTurn
        ),
        projectionStatus: "unsafe",
        reason: missileThreat.reason
      });
    }

    for (const node of snapshot.nodes) {
      if (node.type !== "shipyard" || isSnapshotNodeContested(node.id)) {
        continue;
      }

      const occupancy = snapshot.nodeOccupancies.find((candidate) => {
        return candidate.nodeId === node.id && candidate.shipCount > 0;
      });

      if (occupancy === undefined) {
        continue;
      }

      if (occupancy.factionId !== "player") {
        continue;
      }

      const progress = snapshot.shipyardProgress.find((candidate) => candidate.nodeId === node.id);

      if ((progress?.progress ?? 0) < 4) {
        continue;
      }

      if (
        !hasAffordableLaunchCandidate(
          node.id,
          occupancy.factionId,
          playerRecovery.projectedDvByTurn[0] ?? projectedDv[occupancy.factionId] ?? 0
        )
      ) {
        const projectedDvAtLaunch =
          playerRecovery.projectedDvByTurn[0] ?? projectedDv[occupancy.factionId] ?? 0;
        warnings.push({
          nodeId: node.id,
          event: "LAUNCH",
          detail: `T+1 projected ${projectedDvAtLaunch} ΔV`,
          factionId: occupancy.factionId,
          eventTurn: snapshot.turn + 1,
          currentDv: playerRecovery.currentDv,
          projectedDvAtEvent: projectedDvAtLaunch,
          guaranteedIncomeBeforeEvent: playerRecovery.projectedIncomeByTurn[0] ?? 0,
          committedCostsBeforeEvent: playerRecovery.committedCostsByTurn[0] ?? 0,
          projectionStatus: "unsafe",
          reason: "mandatory-launch-no-affordable-destination"
        });
      }
    }

    return warnings;
  }

  function shouldShowActiveMissileWarning(
    missile: SolarSystemSnapshot["activeMissiles"][number]
  ): boolean {
    return missile.impactTurn - snapshot.turn === 1;
  }

  function shouldShowActiveTransitWarning(
    transit: SolarSystemSnapshot["activeBurnTransits"][number]
  ): boolean {
    return transit.arrivalTurn - snapshot.turn === 1;
  }

  function formatWarningCountdown(eventTurn: number): string {
    return `T-${Math.max(0, eventTurn - snapshot.turn)}`;
  }

  function getGuaranteedIncomeBeforeRecoveryEvent(
    recovery: FactionRecoveryPath,
    eventTurn: number
  ): number {
    const offset = Math.max(0, eventTurn - snapshot.turn);
    return recovery.projectedIncomeByTurn.slice(0, Math.max(0, offset - 1)).reduce(sumNumbers, 0);
  }

  function getCommittedCostsBeforeRecoveryEvent(
    recovery: FactionRecoveryPath,
    eventTurn: number
  ): number {
    const offset = Math.max(0, eventTurn - snapshot.turn);
    return recovery.committedCostsByTurn.slice(0, Math.max(0, offset)).reduce(sumNumbers, 0);
  }

  function sumNumbers(total: number, value: number): number {
    return total + value;
  }

  function getCommandNodeWarningLevel(nodeId: string): "warning" | "critical" | null {
    return getCachedNodeWarningLevels().get(nodeId) ?? null;
  }

  function hasAffordableLaunchCandidate(
    originNodeId: string,
    factionId: FactionId,
    availableDv: number
  ): boolean {
    return snapshot.nodes.some((node) => {
      if (node.id === originNodeId || isSnapshotNodeContested(node.id)) {
        return false;
      }

      const plan = calculateBurnPlan(content, state, originNodeId, node.id);
      const wouldStackAtDestination = snapshot.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === node.id &&
          occupancy.factionId === factionId &&
          occupancy.shipCount > 0
        );
      });
      return plan !== null && plan.burnCost <= availableDv && !wouldStackAtDestination;
    });
  }

  function buildFunctionalDebugLog(): string {
    const turnDump = dumpTurnState(content, state);
    const performanceDiagnosticsEnabled = isPerformanceDiagnosticsEnabled();
    const cinematicPerformanceStats = performanceDiagnosticsEnabled
      ? (cinematicRenderer?.getPerformanceStats() ?? lastCinematicPerformanceStats)
      : null;
    const contestedNodeIds = snapshot.nodes
      .filter((node) => node.isContested)
      .map((node) => node.id);
    const ships = snapshot.nodeOccupancies
      .filter((occupancy) => occupancy.shipCount > 0)
      .map((occupancy) => ({
        id: `${occupancy.factionId}:${occupancy.nodeId}`,
        factionId: occupancy.factionId,
        status: snapshot.pendingBurnOrders.some(
          (order) =>
            order.originNodeId === occupancy.nodeId && order.factionId === occupancy.factionId
        )
          ? "pending-burn"
          : contestedNodeIds.includes(occupancy.nodeId)
            ? "contested"
            : "ready",
        nodeId: occupancy.nodeId,
        shipCount: occupancy.shipCount,
        destinationNodeId:
          snapshot.pendingBurnOrders.find(
            (order) =>
              order.originNodeId === occupancy.nodeId && order.factionId === occupancy.factionId
          )?.destinationNodeId ?? null,
        eta:
          snapshot.pendingBurnOrders.find(
            (order) =>
              order.originNodeId === occupancy.nodeId && order.factionId === occupancy.factionId
          )?.etaTurns ?? null
      }));
    const activeTransits = snapshot.activeBurnTransits.map((transit) => ({
      id: transit.id,
      factionId: transit.factionId,
      status: "in-transit",
      originNodeId: transit.originNodeId,
      destinationNodeId: transit.destinationNodeId,
      arrivalTurn: transit.arrivalTurn,
      etaRemaining: Math.max(0, transit.arrivalTurn - snapshot.turn),
      shipCount: transit.shipCount
    }));
    const payload = {
      label: "ΔV Functional Debug Log",
      mapPreset: selectedMapPreset.id,
      proceduralMap: getProceduralDebugForGameMode(
        currentProceduralDebug,
        snapshot.gameMode ?? state.gameMode
      ),
      automaticProceduralGeneration: currentAutomaticProceduralMapAudit,
      mapOutcomeAudit: lastMapOutcomeAudit,
      victoryAudit: lastVictoryAudit,
      turn: snapshot.turn,
      stateHash: hashReplayState(state),
      tutorial: createTutorialRuntimeDiagnosticDump(tutorialState),
      factionDv: snapshot.factionDv,
      summary: turnDump,
      ships,
      activeTransits,
      shipyardProgress: snapshot.shipyardProgress,
      contestedNodes: snapshot.nodes
        .filter((node) => node.isContested)
        .map((node) => ({
          nodeId: node.id,
          occupants: snapshot.nodeOccupancies.filter((occupancy) => occupancy.nodeId === node.id)
        })),
      mandatoryLaunches: snapshot.mandatoryLaunches,
      submittedOrders: {
        pendingBurnOrders: snapshot.pendingBurnOrders,
        pendingFireOrders: snapshot.pendingFireOrders
      },
      camera: cinematicRenderer?.captureCameraState() ?? null,
      solarVisuals: cinematicRenderer?.captureSolarVisualDebugState() ?? null,
      performance: {
        diagnosticsEnabled: performanceDiagnosticsEnabled,
        stats: cinematicPerformanceStats,
        sectionTimingNote: performanceDiagnosticsEnabled
          ? null
          : "Enable PERF diagnostics before copying the functional debug log."
      },
      warningProjectionAudit: createWarningProjectionAudit(),
      commandScrollback: createCommandScrollbackRows(commandTimelineEntries, replayTape.entries),
      missiles: snapshot.activeMissiles,
      debugEvents: snapshot.debugEvents
    };

    return stableStringify(payload);
  }

  function shouldPersistCompletedMatchLog(): boolean {
    return getActiveFactions(state).length > 0;
  }

  function buildCompletedMatchLog(
    outcome: PostMatchOutcome | null,
    terminationReason: MatchTerminationReason
  ): string {
    const savedAt = new Date().toISOString();
    const activeFactions = getActiveFactions(state);
    const payload = buildCompactCompletedMatchLogPayload(outcome, savedAt, terminationReason);
    const header = [
      "DeltaV Compact Match Log",
      `Saved: ${savedAt}`,
      `Mode: ${state.gameMode}`,
      `Preset: ${selectedMapPreset.id}`,
      `Requested seed: ${currentRequestedSeed ?? "-"}`,
      `Effective map seed: ${currentEffectiveMapSeed ?? "-"}`,
      `Generation attempts: ${currentAutomaticProceduralMapAudit?.attempts.length ?? "-"}`,
      `Used static fallback: ${currentAutomaticProceduralMapAudit?.usedStaticFallback ?? "-"}`,
      `Map gameplay hash: ${currentMapGameplayHash}`,
      `Turn: ${snapshot.turn}`,
      `Termination: ${terminationReason}`,
      `Winner: ${outcome === null ? "-" : formatFactionName(snapshot.factions, outcome.winner)}`,
      `Controllers: ${activeFactions
        .map((faction) => `${faction.displayName}=${faction.controlType}`)
        .join(", ")}`
    ].join("\n");

    return [
      header,
      "",
      "=== AAR ===",
      postMatchReportText ?? "",
      "",
      "=== JSON ===",
      JSON.stringify(payload, null, 2)
    ].join("\n");
  }

  function buildCompactCompletedMatchLogPayload(
    outcome: PostMatchOutcome | null,
    savedAt: string,
    terminationReason: MatchTerminationReason
  ): CompactMatchLogPayload {
    const activeFactions = getActiveFactions(state);

    return {
      label: "DeltaV Compact Match Log",
      version: 3,
      savedAt,
      gameMode: state.gameMode,
      mapPreset: selectedMapPreset.id,
      proceduralSeed: currentRequestedSeed,
      requestedSeed: currentRequestedSeed,
      effectiveMapSeed: currentEffectiveMapSeed,
      mapGameplayHash: currentMapGameplayHash,
      automaticProceduralGeneration: currentAutomaticProceduralMapAudit,
      turn: snapshot.turn,
      terminationReason,
      winner: outcome?.winner ?? null,
      controllers: activeFactions.map((faction) => ({
        id: faction.id,
        name: faction.displayName,
        controlType: faction.controlType
      })),
      factionDv: snapshot.factionDv,
      stateHash: hashReplayState(state),
      postMatchReport: postMatchReportText,
      victoryAudit: lastVictoryAudit,
      mapOutcomeAudit: lastMapOutcomeAudit,
      finalStateSummary: createCompactFinalStateSummary(),
      replaySummary: createCompactReplaySummary(),
      commandScrollbackRecent: createCompactCommandScrollbackRows(),
      debugEventSummary: createCompactDebugEventSummary(matchDebugEvents)
    };
  }

  function createCompactFinalStateSummary(): Readonly<Record<string, unknown>> {
    return {
      turn: snapshot.turn,
      factionDv: snapshot.factionDv,
      shipsPerFaction: countRemainingShips(snapshot),
      occupiedNodes: snapshot.nodeOccupancies
        .filter((occupancy) => occupancy.shipCount > 0)
        .map((occupancy) => ({
          nodeId: occupancy.nodeId,
          factionId: occupancy.factionId,
          shipCount: occupancy.shipCount
        })),
      activeTransits: snapshot.activeBurnTransits.map((transit) => ({
        id: transit.id,
        factionId: transit.factionId,
        originNodeId: transit.originNodeId,
        destinationNodeId: transit.destinationNodeId,
        arrivalTurn: transit.arrivalTurn,
        shipCount: transit.shipCount
      })),
      activeMissiles: snapshot.activeMissiles.map((missile) => ({
        id: missile.id,
        factionId: missile.factionId,
        targetFactionId: missile.targetFactionId,
        originNodeId: missile.originNodeId,
        targetNodeId: missile.targetNodeId,
        impactTurn: missile.impactTurn
      })),
      shipyardProgress: snapshot.shipyardProgress,
      mandatoryLaunches: snapshot.mandatoryLaunches,
      contestedNodes: snapshot.nodes.filter((node) => node.isContested).map((node) => node.id),
      pendingOrders: {
        burns: snapshot.pendingBurnOrders.length,
        fires: snapshot.pendingFireOrders.length
      }
    };
  }

  function createCompactReplaySummary(): Readonly<Record<string, unknown>> {
    return {
      transitions: replayTape.transitions.length,
      entries: replayTape.entries.length,
      entriesByType: countReplayEntriesByType(replayTape.entries),
      note: "Full replay entries and per-turn snapshots are intentionally omitted from compact logs."
    };
  }

  function countReplayEntriesByType(
    entries: readonly ReplayEntry[]
  ): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const entry of entries) {
      counts[entry.type] = (counts[entry.type] ?? 0) + 1;
    }

    return counts;
  }

  function createCompactCommandScrollbackRows(): readonly CommandScrollbackRow[] {
    return createCommandScrollbackRows(commandTimelineEntries, replayTape.entries)
      .slice(-120)
      .map((row) => ({
        ...row,
        replayEntryIds: row.replayEntryIds.slice(0, 6)
      }));
  }

  function createCompactDebugEventSummary(
    events: readonly TurnDebugEvent[]
  ): CompactMatchLogPayload["debugEventSummary"] {
    return {
      total: events.length,
      byType: countDebugEventsByType(events),
      byFaction: countDebugEventsByFactionId(events),
      recentImportant: events
        .filter(isImportantMatchLogEvent)
        .slice(-160)
        .map(compactMatchLogDebugEvent)
    };
  }

  function countDebugEventsByType(
    events: readonly TurnDebugEvent[]
  ): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const event of events) {
      counts[event.type] = (counts[event.type] ?? 0) + 1;
    }

    return counts;
  }

  function countDebugEventsByFactionId(
    events: readonly TurnDebugEvent[]
  ): Readonly<Record<string, number>> {
    const counts: Record<string, number> = {};

    for (const event of events) {
      if (event.factionId !== undefined) {
        counts[event.factionId] = (counts[event.factionId] ?? 0) + 1;
      }
    }

    return counts;
  }

  function isImportantMatchLogEvent(event: TurnDebugEvent): boolean {
    return (
      event.type === "SHIP_PRODUCED" ||
      event.type === "MANDATORY_LAUNCH" ||
      event.type === "MANDATORY_LAUNCH_DESTROYED" ||
      event.type === "FIRE_LAUNCHED" ||
      event.type === "MISSILE_IMPACT" ||
      event.type === "MISSILE_MISSED" ||
      event.type === "MISSILE_SOLUTION_BROKEN" ||
      event.type === "SHIP_DESTROYED" ||
      event.type === "EVADE" ||
      event.type === "AI_EVADE_FAILED" ||
      event.type === "BURN_DEPARTED" ||
      event.type === "BURN_FAILED" ||
      event.type === "CONTESTED_UPKEEP_PAID" ||
      event.type === "CONTESTED_UPKEEP_FAILED" ||
      event.type === "TRITIUM_INCOME" ||
      event.type === "SHIPYARD_PROGRESS" ||
      event.type === "AI_TRITIUM_FALLBACK_ASSIGNED" ||
      event.type === "AI_TRITIUM_FALLBACK_REJECTED" ||
      event.type === "ALPHA_STRIKE_THREAT" ||
      event.type === "SHIPYARD_PRODUCTION_INVARIANT_VIOLATION" ||
      event.type === "NODE_STACKING_INVARIANT_VIOLATION"
    );
  }

  function compactMatchLogDebugEvent(event: TurnDebugEvent): CompactMatchLogDebugEvent {
    return {
      turn: event.turn,
      type: event.type,
      message: truncateMatchLogText(event.message, 220),
      ...(event.factionId === undefined ? {} : { factionId: event.factionId }),
      ...(event.nodeId === undefined ? {} : { nodeId: event.nodeId }),
      ...(event.originNodeId === undefined ? {} : { originNodeId: event.originNodeId }),
      ...(event.destinationNodeId === undefined
        ? {}
        : { destinationNodeId: event.destinationNodeId }),
      ...(event.targetNodeId === undefined ? {} : { targetNodeId: event.targetNodeId }),
      ...(event.targetFactionId === undefined ? {} : { targetFactionId: event.targetFactionId }),
      ...(event.amount === undefined ? {} : { amount: event.amount }),
      ...(event.burnCost === undefined ? {} : { burnCost: event.burnCost }),
      ...(event.etaTurns === undefined ? {} : { etaTurns: event.etaTurns }),
      ...(event.missileEtaTurns === undefined ? {} : { missileEtaTurns: event.missileEtaTurns }),
      ...(event.reason === undefined ? {} : { reason: truncateMatchLogText(event.reason, 160) })
    };
  }

  function truncateMatchLogText(text: string, maxLength: number): string {
    return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}...`;
  }

  async function persistCompletedMatchLog(
    outcome: PostMatchOutcome | null,
    terminationReason: MatchTerminationReason
  ): Promise<void> {
    if (!shouldPersistCompletedMatchLog()) {
      return;
    }

    const text = buildCompletedMatchLog(outcome, terminationReason);

    try {
      const response = await fetch("/__deltav/match-log", {
        method: "POST",
        headers: {
          "content-type": "application/json"
        },
        body: JSON.stringify({
          gameMode: state.gameMode,
          turn: snapshot.turn,
          seed: currentEffectiveMapSeed ?? selectedMapPreset.id,
          terminationReason,
          text
        })
      });
      const result = (await response.json()) as MatchLogSaveResponse;

      if (!response.ok || result.ok !== true) {
        const errorMessage =
          result.ok === false && result.error !== undefined
            ? result.error
            : `HTTP ${response.status}`;
        throw new Error(errorMessage);
      }

      console.info("MATCH_LOG_SAVED", { path: result.path });
    } catch (error) {
      console.warn("MATCH_LOG_SAVE_FAILED", {
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  function createWarningProjectionAudit(): readonly Readonly<Record<string, unknown>>[] {
    const recovery = evaluateFactionRecoveryPath(content, state, "player");

    return recovery.knownThreats.map((threat) => ({
      type: "WARNING_PROJECTION_AUDIT",
      warningType: threat.kind,
      eventTurn: threat.eventTurn,
      nodeId: threat.nodeId ?? null,
      currentDv: threat.currentDv,
      projectedDvAtEvent: threat.projectedDvAtEvent,
      guaranteedIncomeBeforeEvent: getGuaranteedIncomeBeforeRecoveryEvent(
        recovery,
        threat.eventTurn
      ),
      committedCostsBeforeEvent: getCommittedCostsBeforeRecoveryEvent(recovery, threat.eventTurn),
      result: threat.status === "safe" ? "safe" : "unsafe",
      reason: threat.reason
    }));
  }

  function getProceduralDebugForGameMode(
    debug: ProceduralMapDebug | null,
    mode: GameModeId
  ): ProceduralMapDebug | null {
    if (debug === null) {
      return null;
    }

    const fairnessAudit = debug.fairnessAuditByMode[mode] ?? debug.fairnessAudit;

    return {
      ...debug,
      fairnessAudit
    };
  }

  function recordReplayTransition(from: SolarSystemSnapshot, to: SolarSystemSnapshot): void {
    const transitionIndex = replayTape.transitions.length;
    const recordedDebugEvents = to.debugEvents.filter(shouldRecordReplayDebugEvent);
    const resolutionEvents = createPlayerFacingResolutionEvents(recordedDebugEvents);
    const entries = createReplayEntries(
      from,
      to,
      transitionIndex,
      replayTape.entries.length,
      defaultCinematic3dVisualTuning.turnAnimationDurationMs,
      recordedDebugEvents,
      resolutionEvents
    );
    const transition: ReplayTransition = {
      id: `replay:${from.turn}->${to.turn}:${transitionIndex}`,
      from,
      to,
      entries
    };

    replayTape.transitions.push(transition);
    replayTape.entries.push(...entries);
    matchDebugEvents.push(...recordedDebugEvents);
    updateInteractionLocks();
  }

  function maybeShowPostMatchReport(): void {
    if (isTrailerModeActive || postMatchReportText !== null) {
      return;
    }

    if (tutorialState !== null) {
      return;
    }

    const workerEvaluation = isZeroTimerAiAutorunMode() ? aiWorkerPostMatchEvaluation : null;
    const outcome =
      workerEvaluation === null
        ? detectPostMatchOutcome(content, state, snapshot)
        : workerEvaluation.outcome;

    if (isGameMenuDemoActive) {
      if (outcome !== null) {
        scheduleGameMenuDemoRestart();
      }
      return;
    }

    let victoryAudit =
      workerEvaluation?.victoryAudit ?? createVictoryAudit(content, state, snapshot, outcome);
    lastVictoryAudit = victoryAudit;

    if (outcome === null) {
      logVictoryDelayAudit(null, workerEvaluation?.victoryDelayAudit);
      return;
    }

    const victoryContradictions =
      workerEvaluation?.victoryContradictions ??
      createVictoryAuditContradictions(content, state, snapshot, outcome, victoryAudit);

    if (victoryContradictions.length > 0) {
      victoryAudit = {
        ...victoryAudit,
        contradictions: victoryContradictions
      };
      lastVictoryAudit = victoryAudit;
      console.info("VICTORY_AUDIT_CONTRADICTION", victoryContradictions);
      logVictoryDelayAudit(
        {
          reason: "victory-audit-contradiction",
          contradictions: victoryContradictions
        },
        workerEvaluation?.victoryDelayAudit
      );
      return;
    }

    lastMapOutcomeAudit = createMapOutcomeAudit(
      content,
      currentProceduralDebug,
      replayTape,
      snapshot,
      outcome,
      victoryAudit
    );
    console.info("VICTORY_AUDIT", victoryAudit);
    console.info("MAP_OUTCOME_AUDIT", lastMapOutcomeAudit);
    console.info("VICTORY_CONFIRMED", {
      winner: outcome.winner,
      reason: victoryAudit.reason,
      survivingTritiumPath: victoryAudit.factionStates[outcome.winner]?.countedTritium ?? [],
      missilesRemainInFlight: snapshot.activeMissiles.length > 0,
      irrelevantMissiles: snapshot.activeMissiles
        .filter((missile) => missile.targetFactionId !== outcome.winner)
        .map((missile) => missile.id)
    });
    postMatchReportText = createPostMatchReport(
      content,
      replayTape,
      matchDebugEvents,
      snapshot,
      outcome
    );
    showPostMatchReport(postMatchReportText);
    void persistCompletedMatchLog(outcome, "strategic-victory");
    if (!hasAppendedVictoryTranscript) {
      const victoryEvent = createVictoryResolutionEvent(snapshot.turn, outcome.winner);
      const victoryEntry = createVictoryTimelineEntry(victoryEvent);
      matchResolutionEvents.push(victoryEvent);
      playResolutionEventsSfx([victoryEvent]);
      commandTimelineEntries.push(victoryEntry);
      appendCommandTimelineEntry(victoryEntry, { typewriter: true });
      hasAppendedVictoryTranscript = true;
      scrollCommandTranscriptToEnd();
    }
    updateStatus();
  }

  function showPostMatchReport(report: string): void {
    clearPostMatchReturnTimer();
    const isZeroTimerAutorun = shouldAutoRestartZeroTimerMatch();
    postMatchReportText = `${report}\n\n${
      isZeroTimerAutorun
        ? "STARTING NEXT AI MATCH..."
        : "CLICK OR PRESS ANY KEY TO RETURN TO MAIN MENU."
    }`;
    postMatchReport.textContent = postMatchReportText;
    postMatchDismissLayer.classList.remove("is-hidden");
    postMatchReport.classList.remove("is-hidden");
    postMatchDismissLayer.focus({ preventScroll: true });

    if (isZeroTimerAutorun) {
      scheduleZeroTimerAutoRestart();
      return;
    }

    postMatchReturnTimer = window.setTimeout(() => {
      postMatchReturnTimer = null;
      returnToMainMenuFromPostMatch();
    }, postMatchAutoReturnDelayMs);
  }

  function returnToMainMenuFromPostMatch(): void {
    if (postMatchReportText === null) {
      return;
    }

    clearPostMatchReturnTimer();
    clearZeroTimerAutoRestart();
    startGameMenuDemo();
  }

  function clearPostMatchReturnTimer(): void {
    if (postMatchReturnTimer === null) {
      return;
    }

    window.clearTimeout(postMatchReturnTimer);
    postMatchReturnTimer = null;
  }

  function shouldAutoRestartZeroTimerMatch(): boolean {
    return tutorialState === null && isZeroTimerAiAutorunMode();
  }

  function isZeroTimerAiAutorunMode(): boolean {
    return (
      planningTimerMode === "zero" &&
      getActiveFactions(state).every((faction) => faction.controlType === "ai")
    );
  }

  function scheduleZeroTimerAutoRestart(): void {
    if (!shouldAutoRestartZeroTimerMatch() || zeroTimerAutoRestartTimer !== null) {
      return;
    }

    zeroTimerAutoRestartTimer = window.setTimeout(() => {
      zeroTimerAutoRestartTimer = null;
      isZeroTimerAutoRestarting = true;
      void restartZeroTimerAutorunMatch().finally(() => {
        isZeroTimerAutoRestarting = false;
      });
    }, zeroTimerAutoRestartDelayMs);
  }

  function clearZeroTimerAutoRestart(): void {
    if (zeroTimerAutoRestartTimer === null) {
      return;
    }

    window.clearTimeout(zeroTimerAutoRestartTimer);
    zeroTimerAutoRestartTimer = null;
  }

  async function restartZeroTimerAutorunMatch(): Promise<void> {
    if (!shouldAutoRestartZeroTimerMatch() || isReplayMode) {
      return;
    }

    if (isTurnTransitionActive || isCommandConsoleResolving) {
      isZeroTimerAutoRestarting = false;
      scheduleZeroTimerAutoRestart();
      return;
    }

    const nextMode = state.gameMode;
    const controllerOverrides = createControllerAuditOverrides(state);
    const restartPreset = selectedMapPreset;

    try {
      if (restartPreset.procedural === true) {
        const batchMap = await createNextAiAutorunProceduralMap(restartPreset);
        const nextContent = batchMap.generation.content;
        const nextState = withControllerOverrides(
          createInitialStateForGameModeAndMap(
            nextMode,
            restartPreset,
            nextContent,
            batchMap.generation
          ),
          controllerOverrides
        );

        proceduralSeed = batchMap.finalEffectiveMapSeed;
        proceduralSeedInput.value = proceduralSeed;
        contentByPresetKey.set(
          getPresetCacheKey(restartPreset, batchMap.effectiveMapSeed),
          nextContent
        );
        proceduralGenerationBySeed.set(
          getProceduralGenerationCacheKeyForPreset(restartPreset, batchMap.effectiveMapSeed),
          batchMap.generation
        );
        content = nextContent;
        selectedMapPreset = restartPreset;
        currentProceduralDebug = batchMap.generation.debug;
        currentAutomaticProceduralMapAudit = createAutomaticProceduralMapAudit(batchMap);
        state = appendStartStateAudit(nextState, { controllerOverrides });
        snapshot = createSolarSystemSnapshot(content, state);
        captureCurrentMapIdentity(batchMap.requestedSeed, batchMap.finalEffectiveMapSeed);
        console.info("ZERO_TIMER_AUTORUN_RESTART", {
          mode: nextMode,
          preset: restartPreset.id,
          requestedSeed: batchMap.requestedSeed,
          attempts: batchMap.attempts,
          finalEffectiveMapSeed: batchMap.finalEffectiveMapSeed,
          mapGameplayHash: currentMapGameplayHash,
          usedStaticFallback: batchMap.usedStaticFallback,
          controllers: controllerOverrides
        });
        hasConsumedZeroTimerInitialCountdown = true;
        resetRuntimeAfterGameReset({ preserveCamera: true, preserveCinematicScene: true });
        return;
      }

      content = await loadMapPresetContent(
        restartPreset,
        contentByPresetKey,
        proceduralSeed,
        proceduralGenerationBySeed
      );
      selectedMapPreset = restartPreset;
      currentAutomaticProceduralMapAudit = null;
      currentProceduralDebug = getProceduralDebugForPreset(
        restartPreset,
        proceduralSeed,
        proceduralGenerationBySeed
      );
      const nextState = withControllerOverrides(
        createInitialStateForGameMode(nextMode),
        controllerOverrides
      );
      state = appendStartStateAudit(nextState, { controllerOverrides });
      snapshot = createSolarSystemSnapshot(content, state);
      captureCurrentMapIdentity();
      console.info("ZERO_TIMER_AUTORUN_RESTART", {
        mode: nextMode,
        preset: restartPreset.id,
        requestedSeed: currentRequestedSeed,
        effectiveMapSeed: currentEffectiveMapSeed,
        mapGameplayHash: currentMapGameplayHash,
        controllers: controllerOverrides
      });
      hasConsumedZeroTimerInitialCountdown = true;
      resetRuntimeAfterGameReset({ preserveCamera: true, preserveCinematicScene: true });
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Zero timer autorun restart failed.";
      planningTimerMode = "auto";
      updateStatus();
    }
  }

  function logVictoryDelayAudit(
    extra: Readonly<Record<string, unknown>> | null = null,
    precomputedAudit?: Readonly<Record<string, unknown>> | null
  ): void {
    const audit =
      precomputedAudit === undefined
        ? createVictoryDelayAudit(content, state, snapshot)
        : precomputedAudit;

    if (audit === null && extra === null) {
      return;
    }

    const payload = extra === null ? audit : { ...(audit ?? {}), ...extra };
    const key = stableStringify(payload);

    if (key === lastVictoryDelayLogKey) {
      return;
    }

    lastVictoryDelayLogKey = key;
    console.info("VICTORY_DELAYED", payload);
  }

  function detachCinematicCameraTracking(cameraState: CinematicCameraState): CinematicCameraState {
    return {
      ...cameraState,
      focusedTargetKey: null,
      trackedFocusTargetKey: null
    };
  }

  function getTimelineReviewCameraFocusTargetKeys(
    cameraState: CinematicCameraState
  ): readonly string[] {
    const targetKey = cameraState.trackedFocusTargetKey ?? cameraState.focusedTargetKey;
    return targetKey === null ? [] : [targetKey];
  }

  async function playReplay(): Promise<void> {
    if (tutorialState !== null || isReplayMode || replayTape.transitions.length === 0) {
      requestedReplayStartTransitionIndex = 0;
      return;
    }

    ensureCinematicRenderer();

    if (cinematicRenderer === null) {
      requestedReplayStartTransitionIndex = 0;
      return;
    }

    const firstTransitionIndex = clampReplayStartTransitionIndex(
      requestedReplayStartTransitionIndex
    );
    requestedReplayStartTransitionIndex = 0;
    const liveState = state;
    const liveSnapshot = snapshot;
    const liveSelectedTargetKey = selectedTargetKey;
    const liveLockedMandatoryLaunchId = lockedMandatoryLaunchId;
    const liveCurrentView = currentView;
    const liveHash = hashReplayState(liveState);
    const liveCameraState = cinematicRenderer.captureCameraState();
    const liveReplayFocusTargetKeys =
      liveCurrentView === "cinematic3d"
        ? getTimelineReviewCameraFocusTargetKeys(liveCameraState)
        : [];

    isReplayMode = true;
    userReplayFocusTargetKeys = liveReplayFocusTargetKeys;
    replayCancelRequested = false;
    replayIndicator.textContent = "REPLAY";
    isTurnTransitionActive = false;
    replayIndicator.classList.remove("is-hidden");
    updateInteractionLocks();

    try {
      cinematicRenderer.clearPresentationEffects();

      if (currentView !== "cinematic3d") {
        currentView = "cinematic3d";
        viewSelect.value = "cinematic3d";
        cinematicFrame.classList.remove("is-hidden");
        tacticalCanvas.classList.add("is-hidden");
        resizeActiveView();
      }

      for (const [offset, transition] of replayTape.transitions
        .slice(firstTransitionIndex)
        .entries()) {
        if (replayCancelRequested) {
          break;
        }

        const transitionIndex = firstTransitionIndex + offset;
        setCommandScrollbackPlayingEvent(getCommandLogEventIdNearReviewPosition(transitionIndex));
        if (userReplayFocusTargetKeys.length > 0) {
          focusReplayCameraForTransition(transition, userReplayFocusTargetKeys);
        } else {
          focusReplayCameraForTransition(transition);
        }
        await cinematicRenderer.animateReplayTransition(transition.from, transition.to);
      }
    } finally {
      const capturedReplayEndCameraState = cinematicRenderer.captureCameraState();
      const replayEndCameraState =
        userReplayFocusTargetKeys.length > 0
          ? capturedReplayEndCameraState
          : detachCinematicCameraTracking(capturedReplayEndCameraState);

      state = liveState;
      snapshot = liveSnapshot;
      selectedTargetKey = liveSelectedTargetKey;
      lockedMandatoryLaunchId = liveLockedMandatoryLaunchId;
      currentView = liveCurrentView;
      viewSelect.value = liveCurrentView;
      cinematicFrame.classList.toggle("is-hidden", liveCurrentView !== "cinematic3d");
      tacticalCanvas.classList.toggle("is-hidden", liveCurrentView !== "tactical2d");
      cinematicRenderer.setSnapshot(liveSnapshot);
      cinematicRenderer.restoreCameraState(replayEndCameraState);
      isReplayMode = false;
      userReplayFocusTargetKeys = [];
      replayCancelRequested = false;
      replayIndicator.textContent = "REPLAY";
      setCommandScrollbackPlayingEvent(null);
      replayIndicator.classList.add("is-hidden");
      validateReplayStateIntegrity(liveHash, liveState, state);
      resizeActiveView();
      syncFocusSelectToTarget(selectedTargetKey);
      redraw();
    }
  }

  function focusReplayCameraForTransition(
    transition: ReplayTransition,
    preferredTargetKeys: readonly string[] = []
  ): void {
    if (cinematicRenderer === null || currentView !== "cinematic3d") {
      return;
    }

    const targetKeys =
      preferredTargetKeys.length > 0
        ? preferredTargetKeys
        : getReplayTransitionFocusTargetKeys(transition);

    if (targetKeys.length === 0) {
      return;
    }

    cinematicRenderer.focusFirstAvailableTargetWithoutZoom(targetKeys);
  }

  function playReplayFromCommandRow(
    targetId: string,
    focusTargetKeys: readonly string[] = [],
    commandRowKey: string | null = null,
    options: CommandLogReviewNavigationOptions = {}
  ): void {
    if (
      (isReplayMode && commandLogTimeReviewState === null) ||
      isTurnTransitionActive ||
      isCommandConsoleResolving ||
      isCommandLogTimeReviewAnimating
    ) {
      return;
    }

    const targetPosition = getReplayPositionForCommandScrollbackTarget(targetId);

    if (targetPosition === null) {
      return;
    }

    if (
      commandLogTimeReviewState !== null &&
      commandRowKey !== null &&
      commandLogTimeReviewState.activeCommandRowKey === commandRowKey
    ) {
      void playCommandLogReviewForwardToPosition(
        replayTape.transitions.length,
        null,
        focusTargetKeys,
        commandRowKey,
        {
          preserveCurrentFocus: options.preserveCurrentCameraAndFocus === true,
          pacing: options.preserveCurrentCameraAndFocus === true ? "accelerated" : "standard"
        }
      );
      return;
    }

    if (commandLogTimeReviewState === null) {
      void rewindCommandLogToEvent(targetId, focusTargetKeys, commandRowKey, options);
      return;
    }

    const reviewState = ensureCommandLogTimeReviewState();

    if (reviewState === null) {
      return;
    }

    void animateCommandLogTimeReviewToPosition(
      targetPosition,
      targetId,
      focusTargetKeys,
      commandRowKey,
      options
    );
  }

  async function rewindCommandLogToEvent(
    targetId: string,
    focusTargetKeys: readonly string[] = [],
    commandRowKey: string | null = null,
    options: CommandLogReviewNavigationOptions = {}
  ): Promise<void> {
    const targetPosition = getReplayPositionForCommandScrollbackTarget(targetId);

    if (targetPosition === null) {
      return;
    }

    await animateCommandLogTimeReviewToPosition(
      targetPosition,
      targetId,
      focusTargetKeys,
      commandRowKey,
      options
    );
  }

  function ensureCommandLogTimeReviewState(): CommandLogTimeReviewState | null {
    if (!isCommandLogTemporalReviewEnabled()) {
      return null;
    }

    if (commandLogTimeReviewState !== null) {
      return commandLogTimeReviewState;
    }

    ensureCinematicRenderer();

    if (cinematicRenderer === null) {
      return null;
    }

    const liveState = state;
    const liveSnapshot = snapshot;
    const liveSelectedTargetKey = selectedTargetKey;
    const liveLockedMandatoryLaunchId = lockedMandatoryLaunchId;
    const liveCurrentView = currentView;
    const liveHash = hashReplayState(liveState);
    const capturedLiveCameraState =
      cinematicRenderer.captureCommandLogCueReturnCameraState() ??
      cinematicRenderer.captureCameraState();
    const liveCameraFocusTargetKeys =
      liveCurrentView === "cinematic3d"
        ? getTimelineReviewCameraFocusTargetKeys(capturedLiveCameraState)
        : [];

    commandLogTimeReviewState = {
      eventId: null,
      activeCommandRowKey: null,
      transitionIndex: replayTape.transitions.length,
      currentPosition: replayTape.transitions.length,
      focusTargetKeys: liveCameraFocusTargetKeys,
      followTrackedFocus: liveCameraFocusTargetKeys.length > 0,
      liveState,
      liveSnapshot,
      liveSelectedTargetKey,
      liveLockedMandatoryLaunchId,
      liveCurrentView,
      liveHash,
      liveCameraState: capturedLiveCameraState,
      staticFocusTargetSignature: null
    };
    isReplayMode = true;
    userReplayFocusTargetKeys = liveCameraFocusTargetKeys;
    replayCancelRequested = false;
    replayIndicator.textContent = "REWIND";
    replayIndicator.classList.remove("is-hidden");
    setCommandLogReviewPromptDimmed(true);
    setCommandScrollbackPlayingEvent(null);
    clearCommandLogCueCameraPreviewDelay();
    updateInteractionLocks();

    if (currentView !== "cinematic3d") {
      currentView = "cinematic3d";
      viewSelect.value = "cinematic3d";
      cinematicFrame.classList.remove("is-hidden");
      tacticalCanvas.classList.add("is-hidden");
      resizeActiveView();
    }

    if (liveCameraFocusTargetKeys.length === 0) {
      cinematicRenderer.freezeTimelineReviewCamera();
    } else {
      cinematicRenderer.restoreCameraState(capturedLiveCameraState);
      syncLogReviewStaticFocusTargetKeys(liveCameraFocusTargetKeys);
    }
    return commandLogTimeReviewState;
  }

  async function animateCommandLogTimeReviewToPosition(
    targetPosition: number,
    targetEventId: string | null,
    focusTargetKeys: readonly string[] = [],
    activeCommandRowKey: string | null = null,
    options: CommandLogReviewNavigationOptions = {}
  ): Promise<void> {
    const reviewState = ensureCommandLogTimeReviewState();

    if (reviewState === null) {
      return Promise.resolve();
    }

    cancelCommandLogTimeReviewAnimation();
    setCommandScrollbackPlayingEvent(targetEventId);
    reviewState.eventId = targetEventId;
    reviewState.activeCommandRowKey = activeCommandRowKey;
    const preserveCurrentCameraAndFocus = options.preserveCurrentCameraAndFocus === true;

    if (preserveCurrentCameraAndFocus) {
      reviewState.followTrackedFocus = false;
    } else {
      reviewState.focusTargetKeys = focusTargetKeys;
      reviewState.followTrackedFocus = focusTargetKeys.length > 0;
      reviewState.staticFocusTargetSignature = null;
    }

    if (!preserveCurrentCameraAndFocus && focusTargetKeys.length === 0) {
      cinematicRenderer?.freezeTimelineReviewCamera();
    } else if (!preserveCurrentCameraAndFocus) {
      syncLogReviewStaticFocusTargetKeys(focusTargetKeys);
      isCommandLogTimeReviewAnimating = true;
      await waitForCommandLogReplayFocusBeforePlayback();
      isCommandLogTimeReviewAnimating = false;
      if (commandLogTimeReviewState !== reviewState) {
        return;
      }
    }

    const clampedTarget = clampCommandLogReviewPosition(targetPosition);
    const startPosition = reviewState.currentPosition;

    if (clampedTarget > startPosition + 0.001) {
      await playCommandLogReviewForwardToPosition(
        clampedTarget,
        targetEventId,
        focusTargetKeys,
        activeCommandRowKey,
        {
          preserveCurrentFocus: preserveCurrentCameraAndFocus,
          pacing: "accelerated"
        }
      );
      return;
    }

    const isRewind = clampedTarget < startPosition;
    const durationMs = getAcceleratedTimelineReviewDurationMs(
      startPosition,
      clampedTarget,
      commandLogTimeReviewDurations.replayTurnMs
    );
    const startedAt = performance.now();
    isCommandLogTimeReviewAnimating = true;
    replayCancelRequested = false;
    replayIndicator.textContent = isRewind ? "REWIND" : "REPLAY";
    replayIndicator.classList.remove("is-hidden");
    reviewState.transitionIndex = Math.min(
      Math.floor(clampedTarget),
      Math.max(0, replayTape.transitions.length - 1)
    );

    return new Promise((resolve) => {
      const finish = () => {
        commandLogTimeReviewAnimationFrame = null;
        commandLogTimeReviewAnimationResolve = null;
        isCommandLogTimeReviewAnimating = false;

        if (clampedTarget >= replayTape.transitions.length) {
          restoreCommandLogTimeReviewToLive({ preserveCurrentCamera: true });
          resolve();
          return;
        }

        setCommandLogReviewPosition(clampedTarget, targetEventId);
        replayIndicator.textContent = isRewind ? "REWIND" : "REPLAY";
        resolve();
      };

      const tick = () => {
        const elapsedMs = performance.now() - startedAt;

        if (elapsedMs >= durationMs) {
          finish();
          return;
        }

        const position = sampleAcceleratedTimelineReviewPosition(
          startPosition,
          clampedTarget,
          elapsedMs,
          commandLogTimeReviewDurations.replayTurnMs
        );
        setCommandLogReviewPosition(position, targetEventId, {
          deferRender: true
        });

        commandLogTimeReviewAnimationFrame = window.requestAnimationFrame(tick);
      };

      commandLogTimeReviewAnimationResolve = resolve;
      tick();
    });
  }

  function playFixedCommandLogTimeReviewToPosition(
    targetPosition: number,
    direction: "REWIND" | "REPLAY"
  ): Promise<void> {
    const reviewState = ensureCommandLogTimeReviewState();

    if (reviewState === null || cinematicRenderer === null) {
      return Promise.resolve();
    }

    clearCommandLogScrubState();
    cancelCommandLogTimeReviewAnimation();
    const clampedTarget = clampCommandLogReviewPosition(targetPosition);
    const startPosition = reviewState.currentPosition;

    reviewState.activeCommandRowKey = null;
    reviewState.staticFocusTargetSignature = null;
    replayCancelRequested = false;
    cinematicRenderer.clearPresentationEffects();
    if (reviewState.focusTargetKeys.length === 0) {
      cinematicRenderer.freezeTimelineReviewCamera();
    } else {
      syncLogReviewStaticFocusTargetKeys(reviewState.focusTargetKeys);
    }

    if (Math.abs(clampedTarget - startPosition) <= 0.0001) {
      if (clampedTarget >= replayTape.transitions.length) {
        restoreCommandLogTimeReviewToLive({
          preserveCurrentCamera: true,
          preserveCurrentFocusTracking: reviewState.focusTargetKeys.length > 0
        });
      } else {
        replayIndicator.textContent = direction;
        replayIndicator.classList.remove("is-hidden");
      }
      return Promise.resolve();
    }

    const durationMs = getFixedTimelineReviewDurationMs(
      startPosition,
      clampedTarget,
      commandLogTimeReviewDurations.replayTurnMs
    );
    const startedAt = performance.now();
    const includePresentationEffects = direction === "REPLAY";
    isCommandLogTimeReviewAnimating = true;
    replayIndicator.textContent = direction;
    replayIndicator.classList.remove("is-hidden");

    return new Promise((resolve) => {
      const finish = () => {
        commandLogTimeReviewAnimationFrame = null;
        commandLogTimeReviewAnimationResolve = null;
        isCommandLogTimeReviewAnimating = false;
        const eventId = getCommandLogEventIdNearReviewPosition(clampedTarget);
        setCommandScrollbackPlayingEvent(eventId);
        setCommandLogReviewPosition(clampedTarget, eventId, {
          includePresentationEffects
        });

        if (clampedTarget >= replayTape.transitions.length) {
          restoreCommandLogTimeReviewToLive({
            preserveCurrentCamera: true,
            preserveCurrentFocusTracking: reviewState.focusTargetKeys.length > 0
          });
        } else {
          replayIndicator.textContent = direction;
        }
        resolve();
      };

      const tick = () => {
        const elapsedMs = performance.now() - startedAt;

        if (elapsedMs >= durationMs) {
          finish();
          return;
        }

        const position = sampleFixedTimelineReviewPosition(
          startPosition,
          clampedTarget,
          elapsedMs,
          commandLogTimeReviewDurations.replayTurnMs
        );
        const eventId = getCommandLogEventIdNearReviewPosition(position);
        setCommandScrollbackPlayingEvent(eventId);
        setCommandLogReviewPosition(position, eventId, {
          deferRender: true,
          includePresentationEffects
        });

        commandLogTimeReviewAnimationFrame = window.requestAnimationFrame(tick);
      };

      commandLogTimeReviewAnimationResolve = resolve;
      tick();
    });
  }

  function pauseCommandLogTimeReview(): void {
    const reviewState = commandLogTimeReviewState;

    replayCancelRequested = true;
    clearCommandLogScrubState();
    cancelCommandLogTimeReviewAnimation();

    if (reviewState === null || cinematicRenderer === null) {
      return;
    }

    cinematicRenderer.clearPresentationEffects();
    if (reviewState.focusTargetKeys.length === 0) {
      cinematicRenderer.freezeTimelineReviewCamera();
    } else {
      reviewState.staticFocusTargetSignature = null;
      syncLogReviewStaticFocusTargetKeys(reviewState.focusTargetKeys);
    }
    const eventId = getCommandLogEventIdNearReviewPosition(reviewState.currentPosition);
    setCommandScrollbackPlayingEvent(eventId);
    setCommandLogReviewPosition(reviewState.currentPosition, eventId);
    replayIndicator.textContent = "PAUSE";
    replayIndicator.classList.remove("is-hidden");
  }

  async function playCommandLogReviewForwardToPosition(
    targetPosition: number,
    targetEventId: string | null,
    focusTargetKeys: readonly string[] = [],
    activeCommandRowKey: string | null = null,
    options: CommandLogReviewPlaybackOptions = {}
  ): Promise<void> {
    const reviewState = ensureCommandLogTimeReviewState();

    if (reviewState === null || cinematicRenderer === null) {
      return;
    }

    cancelCommandLogTimeReviewAnimation();
    clearCommandLogScrubState();
    const clampedTarget = clampCommandLogReviewPosition(targetPosition);

    if (clampedTarget <= reviewState.currentPosition + 0.001) {
      setCommandLogReviewPosition(clampedTarget, targetEventId, {
        includePresentationEffects: true
      });
      return;
    }

    const startPosition = reviewState.currentPosition;
    const pacing = options.pacing ?? "standard";
    const durationMs =
      pacing === "accelerated"
        ? getAcceleratedTimelineReviewDurationMs(
            startPosition,
            clampedTarget,
            commandLogTimeReviewDurations.replayTurnMs
          )
        : getFixedTimelineReviewDurationMs(
            startPosition,
            clampedTarget,
            commandLogTimeReviewDurations.replayTurnMs
          );
    const startedAt = performance.now();
    let lastFocusedTransitionIndex = -1;
    isCommandLogTimeReviewAnimating = true;
    replayCancelRequested = false;
    replayIndicator.textContent = "REPLAY";
    replayIndicator.classList.remove("is-hidden");
    reviewState.eventId = targetEventId;
    reviewState.activeCommandRowKey = activeCommandRowKey;
    if (options.preserveCurrentFocus !== true) {
      reviewState.focusTargetKeys = focusTargetKeys;
      reviewState.followTrackedFocus = focusTargetKeys.length > 0;
      reviewState.staticFocusTargetSignature = null;
    }
    cinematicRenderer.clearPresentationEffects();

    return new Promise((resolve) => {
      const finish = () => {
        commandLogTimeReviewAnimationFrame = null;
        commandLogTimeReviewAnimationResolve = null;
        isCommandLogTimeReviewAnimating = false;
        const eventId = getCommandLogEventIdNearReviewPosition(clampedTarget) ?? targetEventId;
        setCommandScrollbackPlayingEvent(eventId);
        setCommandLogReviewPosition(clampedTarget, eventId, {
          includePresentationEffects: true
        });

        if (clampedTarget >= replayTape.transitions.length) {
          restoreCommandLogTimeReviewToLive({ preserveCurrentCamera: true });
        } else {
          replayIndicator.textContent = "REPLAY";
        }
        resolve();
      };

      const tick = () => {
        const elapsedMs = performance.now() - startedAt;

        if (elapsedMs >= durationMs) {
          finish();
          return;
        }

        const position =
          pacing === "accelerated"
            ? sampleAcceleratedTimelineReviewPosition(
                startPosition,
                clampedTarget,
                elapsedMs,
                commandLogTimeReviewDurations.replayTurnMs
              )
            : sampleFixedTimelineReviewPosition(
                startPosition,
                clampedTarget,
                elapsedMs,
                commandLogTimeReviewDurations.replayTurnMs
              );
        const transitionIndex = Math.min(
          Math.floor(position),
          Math.max(0, replayTape.transitions.length - 1)
        );
        const transition = replayTape.transitions[transitionIndex];

        if (
          transition !== undefined &&
          transitionIndex !== lastFocusedTransitionIndex &&
          options.preserveCurrentFocus !== true
        ) {
          focusReplayCameraForTransition(transition, focusTargetKeys);
          lastFocusedTransitionIndex = transitionIndex;
        }

        const eventId = getCommandLogEventIdNearReviewPosition(position);
        setCommandScrollbackPlayingEvent(eventId);
        setCommandLogReviewPosition(position, eventId, {
          deferRender: true,
          includePresentationEffects: true
        });

        commandLogTimeReviewAnimationFrame = window.requestAnimationFrame(tick);
      };

      commandLogTimeReviewAnimationResolve = resolve;
      tick();
    });
  }

  function setCommandLogReviewPosition(
    position: number,
    eventId: string | null,
    options: CommandLogReviewPositionOptions = {}
  ): void {
    const reviewState = commandLogTimeReviewState;

    if (reviewState === null || cinematicRenderer === null) {
      return;
    }

    const clampedPosition = clampCommandLogReviewPosition(position);
    reviewState.currentPosition = clampedPosition;
    reviewState.eventId = eventId;
    reviewState.transitionIndex = Math.min(
      Math.floor(clampedPosition),
      Math.max(0, replayTape.transitions.length - 1)
    );
    syncLogReviewStaticFocusTargetKeys(reviewState.focusTargetKeys);
    renderCommandLogReviewPosition(clampedPosition, options);
  }

  function syncLogReviewStaticFocusTargetKeys(targetKeys: readonly string[]): void {
    const reviewState = commandLogTimeReviewState;

    if (reviewState === null || targetKeys.length === 0 || cinematicRenderer === null) {
      return;
    }

    const signature = targetKeys.join("|");

    if (reviewState.staticFocusTargetSignature === signature) {
      return;
    }

    const focusedTargetKey = cinematicRenderer.focusFirstAvailableTargetWithoutZoom(targetKeys);

    if (focusedTargetKey !== null) {
      reviewState.staticFocusTargetSignature = signature;
    }
  }

  function renderCommandLogReviewPosition(
    position: number,
    options: CommandLogReviewPositionOptions = {}
  ): void {
    if (cinematicRenderer === null || replayTape.transitions.length === 0) {
      return;
    }

    const transitionCount = replayTape.transitions.length;

    if (position >= transitionCount) {
      const lastTransition = replayTape.transitions[transitionCount - 1];

      if (lastTransition !== undefined) {
        cinematicRenderer.previewReplayTransition(lastTransition.from, lastTransition.to, 1, {
          deferRender: options.deferRender === true,
          followTrackedFocus: commandLogTimeReviewState?.followTrackedFocus === true,
          trackedFocusTargetKeys:
            commandLogTimeReviewState?.followTrackedFocus === true
              ? commandLogTimeReviewState.focusTargetKeys
              : [],
          includePresentationEffects: options.includePresentationEffects === true,
          destructionTimeline: {
            transitions: replayTape.transitions,
            position
          }
        });
      }

      return;
    }

    const transitionIndex = clampNumber(Math.floor(position), 0, transitionCount - 1);
    const transition = replayTape.transitions[transitionIndex];

    if (transition === undefined) {
      return;
    }

    cinematicRenderer.previewReplayTransition(
      transition.from,
      transition.to,
      position - transitionIndex,
      {
        deferRender: options.deferRender === true,
        followTrackedFocus: commandLogTimeReviewState?.followTrackedFocus === true,
        trackedFocusTargetKeys:
          commandLogTimeReviewState?.followTrackedFocus === true
            ? commandLogTimeReviewState.focusTargetKeys
            : [],
        includePresentationEffects: options.includePresentationEffects === true,
        destructionTimeline: {
          transitions: replayTape.transitions,
          position
        }
      }
    );
  }

  function cancelCommandLogTimeReviewAnimation(): void {
    if (commandLogTimeReviewAnimationFrame !== null) {
      window.cancelAnimationFrame(commandLogTimeReviewAnimationFrame);
      commandLogTimeReviewAnimationFrame = null;
    }

    const resolveAnimation = commandLogTimeReviewAnimationResolve;
    commandLogTimeReviewAnimationResolve = null;
    isCommandLogTimeReviewAnimating = false;
    resolveAnimation?.();
  }

  function skipCommandLogTimeReviewToLive(): void {
    if (commandLogTimeReviewState === null) {
      return;
    }

    clearCommandLogScrubState();
    cancelCommandLogTimeReviewAnimation();
    restoreCommandLogTimeReviewToLive({ preserveCurrentCamera: true });
  }

  function isCommandLogTemporalReviewEnabled(): boolean {
    return !isTutorialCommandLogLocked() && replayTape.transitions.length > 0;
  }

  function handleCommandLogTransportHotkey(event: KeyboardEvent): boolean {
    if (
      isTrailerCaptureActive ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement ||
      event.target instanceof HTMLSelectElement ||
      (event.target instanceof HTMLElement && event.target.isContentEditable)
    ) {
      return false;
    }

    const key = event.key;

    if (key !== "1" && key !== "2" && key !== "3") {
      return false;
    }

    if (
      !isCommandLogTemporalReviewEnabled() ||
      (isReplayMode && commandLogTimeReviewState === null)
    ) {
      return false;
    }

    if (key === "2" && commandLogTimeReviewState === null) {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (event.repeat) {
      return true;
    }

    if (key === "1") {
      void playFixedCommandLogTimeReviewToPosition(0, "REWIND");
      return true;
    }

    if (key === "2") {
      pauseCommandLogTimeReview();
      return true;
    }

    void playFixedCommandLogTimeReviewToPosition(replayTape.transitions.length, "REPLAY");
    return true;
  }

  function clampCommandLogReviewPosition(position: number): number {
    return clampNumber(position, 0, replayTape.transitions.length);
  }

  function restoreCommandLogTimeReviewToLive(
    options: CommandLogTimeReviewRestoreOptions = {}
  ): void {
    const reviewState = commandLogTimeReviewState;
    clearCommandLogScrubState();

    if (reviewState === null || cinematicRenderer === null) {
      commandLogTimeReviewState = null;
      isReplayMode = false;
      userReplayFocusTargetKeys = [];
      replayCancelRequested = false;
      replayIndicator.textContent = "REPLAY";
      replayIndicator.classList.add("is-hidden");
      setCommandLogReviewPromptDimmed(false);
      setCommandScrollbackPlayingEvent(null);
      updateInteractionLocks();
      return;
    }

    cancelCommandLogTimeReviewAnimation();
    setCommandLogReviewPromptDimmed(false);
    const currentCameraState = cinematicRenderer.captureCameraState();
    const cameraStateToRestore =
      options.preserveCurrentCamera !== true
        ? reviewState.liveCameraState
        : options.preserveCurrentFocusTracking === true
          ? currentCameraState
          : detachCinematicCameraTracking(currentCameraState);
    const shouldResizeRestoredView = currentView !== reviewState.liveCurrentView;
    state = reviewState.liveState;
    snapshot = reviewState.liveSnapshot;
    selectedTargetKey = reviewState.liveSelectedTargetKey;
    lockedMandatoryLaunchId = reviewState.liveLockedMandatoryLaunchId;
    currentView = reviewState.liveCurrentView;
    viewSelect.value = reviewState.liveCurrentView;
    cinematicFrame.classList.toggle("is-hidden", reviewState.liveCurrentView !== "cinematic3d");
    tacticalCanvas.classList.toggle("is-hidden", reviewState.liveCurrentView !== "tactical2d");
    cinematicRenderer.setSnapshot(reviewState.liveSnapshot, { deferRender: true });
    cinematicRenderer.syncReplayDestructionTimeline(
      replayTape.transitions,
      replayTape.transitions.length
    );
    cinematicRenderer.restoreCameraState(cameraStateToRestore, { deferRender: true });
    validateReplayStateIntegrity(reviewState.liveHash, reviewState.liveState, state);
    commandLogTimeReviewState = null;
    isReplayMode = false;
    userReplayFocusTargetKeys = [];
    replayCancelRequested = false;
    replayIndicator.textContent = "REPLAY";
    replayIndicator.classList.add("is-hidden");
    setCommandScrollbackPlayingEvent(null);
    updateInteractionLocks();
    if (shouldResizeRestoredView) {
      resizeActiveView();
    }
    syncFocusSelectToTarget(selectedTargetKey);
    updateStatus();
  }

  function setCommandLogReviewPromptDimmed(isReviewingPast: boolean): void {
    executePrompt.classList.toggle("is-command-log-reviewing", isReviewingPast);
  }

  function getTutorialFirstEnemyKillReplayCue(): Readonly<{
    eventId: string;
    nodeId: string | null;
  }> | null {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "firstEnemyKillReplayCue" ||
      tutorial.firstEnemyKillReplayEventId === null
    ) {
      return null;
    }

    return {
      eventId: tutorial.firstEnemyKillReplayEventId,
      nodeId: tutorial.firstEnemyKillReplayNodeId
    };
  }

  function isTutorialFirstEnemyKillReplayCueActive(): boolean {
    return getTutorialFirstEnemyKillReplayCue() !== null;
  }

  function isTutorialCommandLogLocked(): boolean {
    return tutorialState !== null && !isTutorialFirstEnemyKillReplayCueActive();
  }

  function isTutorialFirstEnemyKillReplayEventId(eventId: string | undefined): boolean {
    const cue = getTutorialFirstEnemyKillReplayCue();
    return cue !== null && eventId === cue.eventId;
  }

  function syncTutorialFirstEnemyKillReplayCueLine(): void {
    const cue = getTutorialFirstEnemyKillReplayCue();

    for (const line of commandTranscript.querySelectorAll<HTMLElement>(
      ".command-console__line--linked-event"
    )) {
      const isCueLine = cue !== null && line.dataset["eventId"] === cue.eventId;
      const isDisabledByCue = cue !== null && !isCueLine;
      const isSelectedCueLine =
        isCueLine && tutorialState?.firstEnemyKillReplayLineSelected === true;
      line.classList.toggle("command-console__line--tutorial-replay-cue", isCueLine);
      line.classList.toggle("command-console__line--tutorial-replay-selected", isSelectedCueLine);
      line.classList.toggle("command-console__line--tutorial-replay-disabled", isDisabledByCue);
      line.tabIndex = isDisabledByCue ? -1 : 0;
      if (isDisabledByCue) {
        line.setAttribute("aria-disabled", "true");
      } else {
        line.removeAttribute("aria-disabled");
      }
    }
  }

  function getReplayTransitionIndexForResolutionEventId(eventId: string): number | null {
    for (const [transitionIndex, transition] of replayTape.transitions.entries()) {
      if (
        transition.entries.some((entry) => {
          return entry.logLink?.resolutionEventId === eventId;
        })
      ) {
        return transitionIndex;
      }
    }

    return null;
  }

  function getReplayPositionForResolutionEventId(eventId: string): number | null {
    for (const [transitionIndex, transition] of replayTape.transitions.entries()) {
      const replayEntry = transition.entries.find((entry) => {
        return entry.logLink?.resolutionEventId === eventId;
      });

      if (replayEntry !== undefined) {
        return transitionIndex + getReplayEntryVisualProgress(replayEntry);
      }
    }

    return null;
  }

  function getReplayPositionForCommandScrollbackTarget(targetId: string): number | null {
    return (
      getReplayPositionForResolutionEventId(targetId) ??
      getReplayPositionForCommandTimelineEntryId(targetId)
    );
  }

  function getReplayPositionForCommandTimelineEntryId(entryId: string): number | null {
    const entry = commandTimelineEntries.find((candidate) => candidate.id === entryId);

    if (entry === undefined) {
      return null;
    }

    if (entry.kind === "resolutionEvent" || entry.kind === "victory") {
      return getReplayPositionForResolutionEventId(entry.event.id);
    }

    return getReplayTransitionIndexForTurn(entry.turn);
  }

  function getReplayTransitionIndexForTurn(turn: number): number | null {
    const index = replayTape.transitions.findIndex((transition) => {
      return transition.from.turn === turn;
    });

    return index < 0 ? null : index;
  }

  function getCommandLogEventIdNearReviewPosition(position: number): string | null {
    if (replayTape.transitions.length === 0 || position >= replayTape.transitions.length) {
      return null;
    }

    const transitionIndex = clampNumber(Math.floor(position), 0, replayTape.transitions.length - 1);
    const transition = replayTape.transitions[transitionIndex];
    const localProgress = position - transitionIndex;
    const reachedEntry = transition?.entries
      .filter((entry) => {
        return (
          entry.logLink !== undefined &&
          getReplayEntryVisualProgress(entry) <= localProgress + 0.001
        );
      })
      .at(-1);
    return reachedEntry?.logLink?.resolutionEventId ?? null;
  }

  function getReplayEntryVisualProgress(entry: ReplayEntry): number {
    switch (entry.type) {
      case "CONTESTED_UPKEEP_PAID":
      case "CONTESTED_UPKEEP_FAILED":
        return contestedUpkeepImpactVisualProgress;
      case "FIRE_LAUNCHED":
      case "BURN_DEPARTED":
      case "BURN_FAILED":
        return replayOrderLaunchVisualProgress;
      case "TRITIUM_INCOME":
      case "SHIPYARD_PROGRESS":
      case "SHIP_PRODUCED":
        return replayWorkVisualProgress;
      case "MANDATORY_LAUNCH":
      case "MANDATORY_LAUNCH_DESTROYED":
        return replayMandatoryLaunchVisualProgress;
      case "EVADE":
      case "EVADE_BLOCKED":
      case "AI_EVADE_FAILED":
      case "MISSILE_SOLUTION_BROKEN":
        return replayMissileDefenseVisualProgress;
      case "BURN_ARRIVED":
        return replayBurnArrivalVisualProgress;
      case "MISSILE_IMPACT":
      case "MISSILE_MISSED":
      case "SHIP_DESTROYED":
        return missileImpactVisualProgress;
      default:
        return 0.5;
    }
  }

  function clampReplayStartTransitionIndex(index: number): number {
    return clampNumber(index, 0, Math.max(0, replayTape.transitions.length - 1));
  }

  function setCommandScrollbackHover(line: HTMLElement | null): void {
    for (const container of getCommandLogInteractiveContainers()) {
      for (const candidate of container.querySelectorAll<HTMLElement>(
        ".command-console__line--linked-event.is-command-scrollback-hovered"
      )) {
        candidate.classList.remove("is-command-scrollback-hovered");
      }
    }

    line?.classList.add("is-command-scrollback-hovered");
  }

  function scheduleCommandLogCueCameraPreview(line: HTMLElement | null): void {
    clearCommandLogCueCameraPreviewDelay();

    if (
      line === null ||
      !commandLogOptions.cueCameraPreviewEnabled ||
      currentView !== "cinematic3d" ||
      isReplayMode ||
      isTurnTransitionActive ||
      isCommandConsoleResolving
    ) {
      return;
    }

    const eventId = line.dataset["eventId"];
    const nodeIds = eventId === undefined ? [] : getCommandLogCueNodeIds(eventId);

    if (nodeIds.length === 0) {
      return;
    }

    commandLogCueCameraPreviewTimeout = window.setTimeout(() => {
      commandLogCueCameraPreviewTimeout = null;

      if (
        !line.classList.contains("is-command-scrollback-hovered") ||
        currentView !== "cinematic3d" ||
        isReplayMode ||
        isTurnTransitionActive ||
        isCommandConsoleResolving
      ) {
        return;
      }

      ensureCinematicRenderer();
      cinematicRenderer?.previewCommandLogCueCamera(nodeIds);
    }, 80);
  }

  function clearCommandLogCueCameraPreviewDelay(): void {
    if (commandLogCueCameraPreviewTimeout === null) {
      return;
    }

    window.clearTimeout(commandLogCueCameraPreviewTimeout);
    commandLogCueCameraPreviewTimeout = null;
  }

  function restoreCommandLogCueCameraPreview(): void {
    clearCommandLogCueCameraPreviewDelay();

    if (isReplayMode) {
      return;
    }

    cinematicRenderer?.restoreCommandLogCueCamera();
  }

  function getCommandLogCueNodeIds(eventId: string): readonly string[] {
    const event = matchResolutionEvents.find((candidate) => candidate.id === eventId);
    return event?.replayCue?.nodeIds ?? event?.mapCue.nodeIds ?? [];
  }

  function getCommandScrollbackLineFocusTargetKeys(line: HTMLElement | null): readonly string[] {
    if (line === null) {
      return [];
    }

    const eventId = line.dataset["eventId"];

    if (eventId !== undefined) {
      const event = matchResolutionEvents.find((candidate) => candidate.id === eventId);
      return event === undefined ? [] : getResolutionEventFocusTargetKeys(event);
    }

    const liveRowKey = line.dataset["rowKey"];

    if (liveRowKey !== undefined) {
      return getCommandRowKeyFocusTargetKeys(liveRowKey);
    }

    const entryId = line.dataset["entryId"];
    const rowIndex =
      line.dataset["rowIndex"] === undefined ? Number.NaN : Number(line.dataset["rowIndex"]);

    if (entryId === undefined || !Number.isInteger(rowIndex)) {
      return [];
    }

    const entry = commandTimelineEntries.find((candidate) => candidate.id === entryId);
    return entry?.kind === "commandSnapshot"
      ? getCommandSnapshotRowFocusTargetKeys(entry, rowIndex)
      : [];
  }

  function getCommandScrollbackLineReviewFocusTargetKeys(
    line: HTMLElement | null
  ): readonly string[] {
    return preferCommandLogOrbitFocusTargetKeys(getCommandScrollbackLineFocusTargetKeys(line));
  }

  function focusCommandScrollbackLineTarget(line: HTMLElement | null): readonly string[] {
    const warningNodeTargetKey = getCommandWarningNodeTargetKey(line);

    if (warningNodeTargetKey !== null) {
      focusTargetWithoutZoom(warningNodeTargetKey, { tutorialPan: true });
      return [warningNodeTargetKey];
    }

    const targetKeys = getCommandScrollbackLineReviewFocusTargetKeys(line);

    if (targetKeys.length === 0 || currentView !== "cinematic3d") {
      return targetKeys;
    }

    ensureCinematicRenderer();
    const focusedTargetKey = cinematicRenderer?.focusFirstAvailableTargetWithoutZoom(targetKeys);

    if (focusedTargetKey !== undefined && focusedTargetKey !== null) {
      selectedTargetKey = focusedTargetKey;
      syncFocusSelectToTarget(selectedTargetKey);
    }

    return targetKeys;
  }

  function preferCommandLogOrbitFocusTargetKeys(targetKeys: readonly string[]): readonly string[] {
    const orbitTargetKeys = targetKeys.filter((targetKey) => targetKey.startsWith("node:"));
    return orbitTargetKeys.length > 0 ? orbitTargetKeys : targetKeys;
  }

  function getCommandWarningNodeTargetKey(line: HTMLElement | null): string | null {
    const rowKey = line?.dataset["rowKey"];

    if (rowKey === undefined || !rowKey.startsWith("warning:")) {
      return null;
    }

    const [, nodeId] = rowKey.split(":");
    return nodeId === undefined || nodeId === "" ? null : `node:${nodeId}`;
  }

  function getCommandSnapshotRowFocusTargetKeys(
    entry: Extract<CommandTimelineEntry, { kind: "commandSnapshot" }>,
    rowIndex: number
  ): readonly string[] {
    const rowKey = entry.rows[rowIndex]?.key;

    if (rowKey === undefined) {
      return [];
    }

    return getCommandRowKeyFocusTargetKeys(rowKey, entry);
  }

  function getCommandRowKeyFocusTargetKeys(
    rowKey: string,
    entry?: Extract<CommandTimelineEntry, { kind: "commandSnapshot" }>
  ): readonly string[] {
    if (rowKey.startsWith("fire:")) {
      const orderId = rowKey.slice("fire:".length);
      const order = (entry?.orders ?? getLiveCommandSnapshotOrders()).find((candidate) => {
        return candidate.type === "FIRE" && candidate.id === orderId;
      });

      return order?.type === "FIRE"
        ? uniqueTargetKeys([
            `missile:${order.id}`,
            `node:${order.targetNodeId}`,
            `node:${order.originNodeId}`
          ])
        : [];
    }

    if (rowKey.startsWith("burn:")) {
      const orderId = rowKey.slice("burn:".length);
      const order = (entry?.orders ?? getLiveCommandSnapshotOrders()).find((candidate) => {
        return candidate.type === "BURN" && candidate.id === orderId;
      });

      return order?.type === "BURN"
        ? uniqueTargetKeys([
            `burn:${order.id}`,
            `node:${order.destinationNodeId}`,
            `node:${order.originNodeId}`
          ])
        : [];
    }

    if (rowKey.startsWith("warning:")) {
      const [, nodeId, warningEvent] = rowKey.split(":");

      if (nodeId === undefined) {
        return [];
      }

      const incomingMissileTargetKey =
        warningEvent === "EVADE" || warningEvent === "IMPACT"
          ? snapshot.activeMissiles.find((missile) => missile.targetNodeId === nodeId)
          : undefined;
      const incomingTransitTargetKey =
        warningEvent === "CONTESTED"
          ? snapshot.activeBurnTransits.find((transit) => {
              return transit.factionId !== "player" && transit.destinationNodeId === nodeId;
            })
          : undefined;

      return uniqueTargetKeys([
        `node:${nodeId}`,
        incomingMissileTargetKey === undefined
          ? undefined
          : `missile:${incomingMissileTargetKey.id}`,
        incomingTransitTargetKey === undefined ? undefined : `burn:${incomingTransitTargetKey.id}`,
        incomingTransitTargetKey === undefined
          ? undefined
          : `node:${incomingTransitTargetKey.originNodeId}`,
        incomingMissileTargetKey === undefined
          ? undefined
          : `node:${incomingMissileTargetKey.originNodeId}`
      ]);
    }

    return [];
  }

  function getResolutionEventFocusTargetKeys(event: ResolutionEvent): readonly string[] {
    switch (event.type) {
      case "FIRE_LAUNCHED":
        return uniqueTargetKeys([
          getLaunchedMissileTargetKey(event),
          event.targetNodeId === undefined ? undefined : `node:${event.targetNodeId}`,
          event.originNodeId === undefined ? undefined : `node:${event.originNodeId}`
        ]);
      case "BURN_DEPARTED":
        return uniqueTargetKeys([
          getDepartingBurnTargetKey(event),
          event.destinationNodeId === undefined ? undefined : `node:${event.destinationNodeId}`,
          event.originNodeId === undefined ? undefined : `node:${event.originNodeId}`
        ]);
      case "WORK_TRITIUM":
      case "WORK_SHIPYARD":
      case "CONTESTED_UPKEEP":
      case "EVADE":
      case "EVADE_BLOCKED":
      case "MISSILE_IMPACT":
      case "SIGNAL_LOST":
      case "MANDATORY_LAUNCH":
      case "MANDATORY_LAUNCH_DESTROYED":
      case "BURN_FAILED":
        return event.nodeId === undefined ? [] : [`node:${event.nodeId}`];
      case "VICTORY":
        return [];
    }
  }

  function getLaunchedMissileTargetKey(event: ResolutionEvent): string | undefined {
    const transitionIndex = getReplayTransitionIndexForResolutionEventId(event.id);
    const transition =
      transitionIndex === null ? undefined : replayTape.transitions[transitionIndex];
    const missile = transition?.to.activeMissiles.find((candidate) => {
      return (
        candidate.factionId === event.actorFactionId &&
        candidate.originNodeId === event.originNodeId &&
        candidate.targetNodeId === event.targetNodeId
      );
    });

    return missile === undefined ? undefined : `missile:${missile.id}`;
  }

  function getDepartingBurnTargetKey(event: ResolutionEvent): string | undefined {
    const transitionIndex = getReplayTransitionIndexForResolutionEventId(event.id);
    const transition =
      transitionIndex === null ? undefined : replayTape.transitions[transitionIndex];
    const transit = transition?.to.activeBurnTransits.find((candidate) => {
      return (
        candidate.factionId === event.actorFactionId &&
        candidate.originNodeId === event.originNodeId &&
        candidate.destinationNodeId === event.destinationNodeId
      );
    });

    return transit === undefined ? undefined : `burn:${transit.id}`;
  }

  function getReplayTransitionFocusTargetKeys(transition: ReplayTransition): readonly string[] {
    const sortedEntries = [...transition.entries].sort((first, second) => {
      const priorityDelta =
        getReplayEntryFocusPriority(first) - getReplayEntryFocusPriority(second);
      return priorityDelta === 0 ? first.orderingIndex - second.orderingIndex : priorityDelta;
    });

    for (const entry of sortedEntries) {
      const targetKeys = getReplayEntryFocusTargetKeys(entry, transition);

      if (targetKeys.length > 0) {
        return targetKeys;
      }
    }

    return [];
  }

  function getReplayEntryFocusPriority(entry: ReplayEntry): number {
    switch (entry.type) {
      case "MISSILE_IMPACT":
      case "SHIP_DESTROYED":
      case "CONTESTED_UPKEEP_FAILED":
        return 0;
      case "MISSILE_SOLUTION_BROKEN":
      case "EVADE":
      case "EVADE_BLOCKED":
        return 1;
      case "CONTESTED_STARTED":
      case "CONTESTED_ENDED":
      case "CONTESTED_UPKEEP_PAID":
        return 2;
      case "FIRE_LAUNCHED":
      case "MISSILE_IN_FLIGHT":
        return 3;
      case "BURN_DEPARTED":
      case "BURN_IN_TRANSIT":
      case "BURN_ARRIVED":
        return 4;
      default:
        return 8;
    }
  }

  function getReplayEntryFocusTargetKeys(
    entry: ReplayEntry,
    transition: ReplayTransition
  ): readonly string[] {
    const activeTransitIds = new Set([
      ...transition.from.activeBurnTransits.map((transit) => transit.id),
      ...transition.to.activeBurnTransits.map((transit) => transit.id)
    ]);
    const activeMissileIds = new Set([
      ...transition.from.activeMissiles.map((missile) => missile.id),
      ...transition.to.activeMissiles.map((missile) => missile.id)
    ]);
    const burnTargetKeys = entry.involved.shipIds
      .filter((shipId) => activeTransitIds.has(shipId))
      .map((shipId) => `burn:${shipId}`);
    const missileTargetKeys = entry.involved.missileIds
      .filter((missileId) => activeMissileIds.has(missileId))
      .map((missileId) => `missile:${missileId}`);
    const nodeTargetKeys = entry.involved.nodeIds.map((nodeId) => `node:${nodeId}`);

    return uniqueTargetKeys([...missileTargetKeys, ...burnTargetKeys, ...nodeTargetKeys]);
  }

  function uniqueTargetKeys(values: readonly (string | undefined)[]): readonly string[] {
    return [...new Set(values.filter((value): value is string => value !== undefined))];
  }

  function setCommandScrollbackPlayingEvent(eventId: string | null): void {
    if (commandScrollbackPlayingEventId === eventId) {
      return;
    }

    commandScrollbackPlayingEventId = eventId;

    for (const line of commandTranscript.querySelectorAll<HTMLElement>(
      ".command-console__line--linked-event"
    )) {
      const isTarget =
        eventId !== null &&
        (line.dataset["eventId"] === eventId || line.dataset["entryId"] === eventId);
      line.classList.toggle("is-command-scrollback-playing", isTarget);
      line.classList.toggle("is-command-scrollback-review-target", isTarget);
    }
  }

  let shouldSkipCommandConsoleRefreshOnRedraw = false;

  function redraw(): void {
    if (shouldSkipCommandConsoleRefreshOnRedraw) {
      shouldSkipCommandConsoleRefreshOnRedraw = false;
      updateStatusWithoutCommandConsoleRefresh({ skipCommandConsoleRefresh: true });
    } else {
      updateStatus();
    }

    if (currentView === "cinematic3d") {
      ensureCinematicRenderer();
      if (isTurnTransitionActive) {
        return;
      }
      cinematicRenderer?.setSnapshot(snapshot);
      if (pendingCinematicCameraRestore !== null && cinematicRenderer !== null) {
        cinematicRenderer.restoreCameraState(pendingCinematicCameraRestore);
        pendingCinematicCameraRestore = null;
      }
      syncMandatoryLaunchFocus();
      return;
    }

    if (tacticalCanvas.width <= 0 || tacticalCanvas.height <= 0) {
      return;
    }

    renderTacticalMap2d(tacticalCanvas, snapshot, tacticalCamera, {
      viewport: tacticalViewport()
    });
  }

  function redrawSkippingCommandConsoleRefresh(): void {
    shouldSkipCommandConsoleRefreshOnRedraw = true;
    redraw();
  }

  function getCinematicPerformanceMode(): CinematicPerformanceMode {
    return "auto";
  }

  function getStoredTrajectoryReflectionMode(): CinematicTrajectoryReflectionMode {
    const storedMode = window.localStorage.getItem(cinematicTrajectoryReflectionModeStorageKey);
    return storedMode === "on" || storedMode === "off" ? storedMode : "hover";
  }

  function getCinematicRendererPerformanceMode(): CinematicPerformanceMode {
    return getCinematicPerformanceMode();
  }

  function playSelectionChangedSfx(selection: CinematicSelection | null): void {
    if (selection === null) {
      sfxEngine.play("ui.deselect");
      return;
    }

    const selectedNodeId = getNodeIdFromTargetKey(selection.targetKey);

    if (selectedNodeId === null) {
      sfxEngine.play("ui.select");
      return;
    }

    if (isPlayerOccupiedNode(selectedNodeId)) {
      sfxEngine.play("ship.select");
      return;
    }

    const node = content.nodes.find((candidate) => candidate.id === selectedNodeId);
    sfxEngine.play(node?.type === "shipyard" ? "shipyard.select" : "ui.select");
  }

  function isCinematicGameplayInputLocked(): boolean {
    return isCinematicGameplayInteractionLocked({
      isCommandConsoleResolving,
      isTurnTransitionActive,
      tutorialInputLocked: tutorialState?.inputLocked === true,
      tutorialAutoAdvanceActive: tutorialState?.autoAdvanceActive === true
    });
  }

  function isCinematicCommandInputLocked(): boolean {
    return (
      isCinematicGameplayInputLocked() ||
      isReplayMode ||
      postMatchReportText !== null ||
      !isPlayerFactionHuman() ||
      isLocalPlayerPlanningLocked()
    );
  }

  function ensureCinematicRenderer(): void {
    if (cinematicRenderer !== null) {
      return;
    }

    cinematicRenderer = new CinematicSolarSystemRenderer(cinematicFrame, {
      onSelectionChange(selection: CinematicSelection | null) {
        if (isRestoringTutorialRequiredShipSelection) {
          return;
        }

        if (isReplayMode) {
          if (selection !== null) {
            cinematicRenderer?.focusTargetWithoutZoom(selection.targetKey);
            setUserReplayFocusTarget(selection.targetKey);
          }
          return;
        }

        const previousTargetKey = selectedTargetKey;
        const mandatoryLaunch = getNextPlayerMandatoryLaunch();
        const lockedTarget =
          mandatoryLaunch === undefined ? null : `node:${mandatoryLaunch.nodeId}`;

        if (lockedTarget !== null && selection?.targetKey !== lockedTarget) {
          selectedTargetKey = lockedTarget;
          syncFocusSelectToTarget(lockedTarget);
          window.queueMicrotask(syncMandatoryLaunchFocus);
          return;
        }

        selectedTargetKey = selection?.targetKey ?? null;
        if (restoreTutorialRequiredShipSelectionAfterDeselect()) {
          return;
        }

        if (selectedTargetKey !== previousTargetKey) {
          playSelectionChangedSfx(selection);
        }
        syncFocusSelectToTarget(selectedTargetKey);
        handleTutorialOverlaySelection(selection);
        handleTutorialSelection(selection);
        if (tutorialState !== null) {
          updateStatusWithoutCommandConsoleRefresh({ skipCommandConsoleRefresh: true });
          refreshCommandConsoleAfterTutorialSelection();
        } else {
          updateStatus();
        }
      },
      onUserFocusChange(targetKey: string) {
        setUserReplayFocusTarget(targetKey);
      },
      isTargetInputAllowed(targetKey: string) {
        return (
          !isCinematicGameplayInputLocked() &&
          !isTutorialLogbookIntroductionBlockingOpening() &&
          isTutorialTargetInputAllowed(tutorialState, targetKey)
        );
      },
      onInputGesture(gesture) {
        if (isTrailerCaptureActive) {
          isTrailerCameraAutomationInterrupted = true;
        }
        handleTutorialInputGesture(gesture);
      },
      getTutorialAttentionPulse() {
        return isBeatSyncEnabled() ? getCinematicGuidanceAttentionPulse() : null;
      },
      getMusicVisualPulse() {
        return isBeatSyncEnabled() ? getProductiveMarkerVisualPulse() : null;
      },
      getRawMusicVisualPulse() {
        return isBeatSyncEnabled() ? getRawMusicBeatVisualPulse() : null;
      },
      getBeatSyncEnabled() {
        return isBeatSyncEnabled();
      },
      getPerformanceMode() {
        return getCinematicRendererPerformanceMode();
      },
      getPerformanceDiagnosticsEnabled() {
        return isPerformanceDiagnosticsEnabled();
      },
      recordDebugCounter(name) {
        recordBrowserPerformanceCounter(name);
      },
      getNodeWarningLevel(nodeId: string) {
        return getCommandNodeWarningLevel(nodeId);
      },
      getBurnPlan(originNodeId: string, destinationNodeId: string) {
        if (isCinematicCommandInputLocked()) {
          return null;
        }

        if (!isTutorialBurnPlanAllowed(originNodeId, destinationNodeId)) {
          return null;
        }

        const plan = withBurnAffordability(
          calculateBurnPlan(content, state, originNodeId, destinationNodeId),
          originNodeId,
          destinationNodeId
        );
        handleTutorialBurnPreviewSeen(originNodeId, destinationNodeId, plan);
        return plan;
      },
      getFirePlan(originNodeId: string, targetNodeId: string) {
        if (isCinematicCommandInputLocked()) {
          return null;
        }

        if (!isTutorialFirePlanAllowed(originNodeId, targetNodeId)) {
          return null;
        }

        if (isSnapshotNodeContested(originNodeId)) {
          return null;
        }

        return withFireValidity(calculateFirePlan(content, state, originNodeId, targetNodeId));
      },
      isFireModeAllowed() {
        return (
          !isCinematicCommandInputLocked() &&
          (tutorialState === null ||
            tutorialState.phase === "shipyardFirePrompt" ||
            tutorialState.phase === "shipyardContestedFirePrompt")
        );
      },
      getBurnPlanFailureReason(originNodeId: string, destinationNodeId: string) {
        return getBurnPlanFailureReason(originNodeId, destinationNodeId);
      },
      getFirePlanFailureReason(originNodeId: string, targetNodeId: string) {
        return getFirePlanFailureReason(originNodeId, targetNodeId);
      },
      getSnapshotAtTurn(turn: number) {
        // Historical and future trajectory anchors must use the orbital phase of the requested
        // turn. Returning the live snapshot during time review detached BURN/FIRE geometry from
        // the rewound bodies because every off-frame lookup reused the current orbital phase.
        return createSolarSystemSnapshot(content, {
          ...state,
          turn
        });
      },
      onBurnOrderRequested(originNodeId: string, destinationNodeId: string) {
        if (
          isCinematicCommandInputLocked() ||
          !isTutorialBurnPlanAllowed(originNodeId, destinationNodeId)
        ) {
          return;
        }

        const burnPlan = calculateBurnPlan(content, state, originNodeId, destinationNodeId);
        state = applyCommand(
          state,
          {
            type: "ASSIGN_BURN_ORDER",
            originNodeId,
            destinationNodeId
          },
          content
        );
        snapshot = createSolarSystemSnapshot(content, state);
        markPlayerOrderConfirmedAfterSelection();
        handleTutorialBurnOrderQueued(originNodeId, destinationNodeId);
        sfxEngine.play("planning.burnCommit", {
          intensity: burnPlan === null ? 0.5 : Math.min(1, burnPlan.burnCost / 6)
        });
        sfxEngine.play("queue.add");
        redrawSkippingCommandConsoleRefresh();
        refreshTutorialCommandConsole();
      },
      onFireOrderRequested(originNodeId: string, targetNodeId: string) {
        if (
          isCinematicCommandInputLocked() ||
          !isTutorialFirePlanAllowed(originNodeId, targetNodeId)
        ) {
          return;
        }

        const previousPendingOrderCount = state.pendingFireOrders.length;
        state = applyCommand(
          state,
          {
            type: "ASSIGN_FIRE_ORDER",
            originNodeId,
            targetNodeId
          },
          content
        );
        snapshot = createSolarSystemSnapshot(content, state);
        markPlayerOrderConfirmedAfterSelection();
        handleTutorialFireOrderQueued(originNodeId, targetNodeId, previousPendingOrderCount);
        sfxEngine.play("queue.add");
        redrawSkippingCommandConsoleRefresh();
        refreshTutorialCommandConsole();
      },
      onBurnOrderCancelled(originNodeId: string) {
        if (isCinematicCommandInputLocked()) {
          return;
        }

        state = applyCommand(state, {
          type: "CANCEL_PENDING_BURN_ORDER",
          originNodeId
        });
        snapshot = createSolarSystemSnapshot(content, state);
        sfxEngine.play("queue.remove");
        redraw();
      },
      onFireOrderCancelled(originNodeId: string) {
        if (isCinematicCommandInputLocked()) {
          return;
        }

        const queuedTutorialOrder = getTutorialQueuedFireOrder();
        const cancelledTutorialOrder =
          queuedTutorialOrder?.originNodeId === originNodeId ? queuedTutorialOrder : undefined;
        state = applyCommand(state, {
          type: "CANCEL_PENDING_FIRE_ORDER",
          originNodeId
        });
        snapshot = createSolarSystemSnapshot(content, state);
        if (
          cancelledTutorialOrder !== undefined &&
          !state.pendingFireOrders.some((order) => order.id === cancelledTutorialOrder.id)
        ) {
          handleTutorialFireOrderCancelled(cancelledTutorialOrder);
        }
        sfxEngine.play("queue.remove");
        redraw();
      },
      onInvalidAction(reason: string) {
        const key =
          reason.includes("ΔV") || reason.includes("dV") ? "resource.insufficient" : "ui.invalid";
        sfxEngine.play(key);
      }
    });
    cinematicRenderer.setShipModelVariant(selectedShipModelVariant);
    cinematicRenderer.setBurnPreviewEffectsEnabled(burnPreviewEffectsMode === "on");
    cinematicRenderer.setFirePreviewEffectsEnabled(firePreviewEffectsMode === "on");
    cinematicRenderer.setSolarHazeEnabled(solarHazeMode === "on");
    cinematicRenderer.setSolarOcclusionEnabled(solarOcclusionMode === "on");
    cinematicRenderer.setAtmosphericScatteringEnabled(atmosphericScatteringMode === "on");
    cinematicRenderer.setCompactSunBloomEnabled(compactSunBloomMode === "on");
    cinematicRenderer.setBloomEnabled(uiBloomMode === "on");
    cinematicRenderer.setUiBloomEnabled(uiBloomMode === "on");
    cinematicRenderer.setLowBloomProfileEnabled(lowBloomProfileMode === "on");
    cinematicRenderer.setHeatDistortionEnabled(heatDistortionMode === "on");
    cinematicRenderer.setTrajectoryReflectionMode(trajectoryReflectionMode);
    cinematicRenderer.setBeautyModeEnabled(isBeautyModeActive);
    cinematicRenderer.setCameraInputEnabled(!isGameMenuOpen());
    cinematicRenderer.setBillboardsVisible(!isGameMenuDemoActive);
    cinematicRenderer.setProductiveMarkersVisible(!isGameMenuDemoActive);
    resizeActiveView();
  }

  function setUserReplayFocusTarget(targetKey: string): void {
    if (!isReplayMode) {
      return;
    }

    userReplayFocusTargetKeys = [targetKey];
    const reviewState = commandLogTimeReviewState;

    if (reviewState === null) {
      return;
    }

    reviewState.focusTargetKeys = [targetKey];
    reviewState.followTrackedFocus = true;
    reviewState.staticFocusTargetSignature = null;
  }

  function disposeCinematicRenderer(): void {
    cinematicRenderer?.dispose();
    cinematicRenderer = null;
  }

  function setPresentationView(view: PresentationView): void {
    if (isMandatoryLaunchLockActive() && view !== currentView) {
      viewSelect.value = currentView;
      return;
    }

    if (view !== "cinematic3d" && isBeautyModeActive) {
      setBeautyModeActive(false);
    }

    currentView = view;
    viewSelect.value = view;
    for (const option of viewSelect.options) {
      option.selected = option.value === view;
    }
    cinematicFrame.classList.toggle("is-hidden", view !== "cinematic3d");
    tacticalCanvas.classList.toggle("is-hidden", view !== "tactical2d");
    resizeActiveView();
    if (view === "cinematic3d") {
      cinematicRenderer?.setSnapshot(snapshot);
      syncMandatoryLaunchFocus();
    }
    fitSystem();
    redraw();
  }

  function resizeActiveView(): void {
    const rect = canvasFrame.getBoundingClientRect();

    if (cinematicRenderer !== null) {
      cinematicRenderer.resize(rect.width, rect.height);
    }

    resizeCanvasToDisplaySize(tacticalCanvas);
  }

  function fitSystem(): void {
    if (isMandatoryLaunchLockActive()) {
      syncMandatoryLaunchFocus();
      return;
    }

    if (currentView === "cinematic3d") {
      cinematicRenderer?.fitSystem();
      return;
    }

    tacticalCamera = fitBoundsToViewport(snapshot.bounds, tacticalViewport(), tacticalCamera);
  }

  function focusTarget(target: string): void {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();
    const lockedTarget = mandatoryLaunch === undefined ? null : `node:${mandatoryLaunch.nodeId}`;

    if (lockedTarget !== null && target !== lockedTarget) {
      syncMandatoryLaunchFocus();
      return;
    }

    const selectedTarget = target === "" ? null : target;
    selectedTargetKey = selectedTarget;
    const focused = findFocusPosition(snapshot, target);

    if (focused === null) {
      if (currentView === "cinematic3d" && selectedTarget === null) {
        cinematicRenderer?.selectTarget(null);
      }
      return;
    }

    if (currentView === "cinematic3d") {
      // The focus control is also the debug and keyboard selection path. Keep the renderer's
      // interaction state in sync with the UI selection so burn/fire hover previews are rebuilt.
      cinematicRenderer?.selectTarget(selectedTarget);
      cinematicRenderer?.focusTarget(target);
      return;
    }

    tacticalCamera = {
      ...tacticalCamera,
      center: focused,
      zoom: Math.max(tacticalCamera.zoom, 1)
    };
    redraw();
  }

  function focusTargetWithoutZoom(
    target: string,
    options: Readonly<{ tutorialPan?: boolean }> = {}
  ): void {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();
    const lockedTarget = mandatoryLaunch === undefined ? null : `node:${mandatoryLaunch.nodeId}`;
    const tutorialCameraOnly =
      options.tutorialPan === true && lockedTarget !== null && target !== lockedTarget;

    if (lockedTarget !== null && target !== lockedTarget && !tutorialCameraOnly) {
      syncMandatoryLaunchFocus();
      return;
    }

    const selectedTarget = target === "" ? null : target;

    if (!tutorialCameraOnly) {
      selectedTargetKey = selectedTarget;
    }
    const focused = findFocusPosition(snapshot, target);

    if (focused === null) {
      if (!tutorialCameraOnly && currentView === "cinematic3d" && selectedTarget === null) {
        cinematicRenderer?.selectTarget(null);
      }
      return;
    }

    if (currentView === "cinematic3d") {
      if (!tutorialCameraOnly) {
        cinematicRenderer?.selectTarget(selectedTarget);
      }
      if (options.tutorialPan === true) {
        cinematicRenderer?.focusTutorialTargetWithoutZoom(target);
      } else {
        cinematicRenderer?.focusTargetWithoutZoom(target);
      }
      return;
    }

    tacticalCamera = {
      ...tacticalCamera,
      center: focused
    };
    redraw();
  }

  function selectTutorialTarget(
    target: string,
    options: Readonly<{ isArrival?: boolean }> = {}
  ): void {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();
    const isCameraOnlyTarget =
      mandatoryLaunch !== undefined && target !== `node:${mandatoryLaunch.nodeId}`;

    if (isTutorialFirstTurn()) {
      focusTargetWithoutZoom(target, { tutorialPan: true });
    } else if (
      shouldPanTutorialTarget({
        isFirstTurn: false,
        isArrival: options.isArrival === true
      })
    ) {
      focusTargetWithoutZoom(target, { tutorialPan: true });
    }

    if (!isCameraOnlyTarget) {
      selectedTargetKey = target;
      syncFocusSelectToTarget(target);
      cinematicRenderer?.selectTarget(target);
    }

    redraw();
  }

  function focusTutorialArrivalTarget(target: string): void {
    selectTutorialTarget(target, { isArrival: true });
  }

  function focusTutorialTurnSkipArrivalNode(nodeId: string | null | undefined): void {
    if (nodeId === null || nodeId === undefined) {
      return;
    }

    focusTutorialArrivalTarget(`node:${nodeId}`);
  }

  function rememberTutorialCameraAssistAnchor(cameraState?: CinematicCameraState | null): void {
    if (tutorialState === null) {
      tutorialCameraAssistAnchor = null;
      return;
    }

    tutorialCameraAssistAnchor = cameraState ?? cinematicRenderer?.captureCameraState() ?? null;
  }

  function rememberTutorialSettledCameraAssistAnchor(): void {
    rememberTutorialCameraAssistAnchor(
      cinematicRenderer?.captureTutorialCameraAnchorState() ?? null
    );
  }

  function isTutorialFirstTurn(): boolean {
    return tutorialState !== null && state.turn === 0;
  }

  function areTutorialCameraMovesEnabled(): boolean {
    return isTutorialFirstTurn() && !tutorialCameraGuidancePaused;
  }

  function canStartTutorialCameraAssist(targetKey: string, referenceDistance: number): boolean {
    if (
      !areTutorialCameraMovesEnabled() ||
      currentView !== "cinematic3d" ||
      cinematicRenderer === null
    ) {
      return false;
    }

    return cinematicRenderer.isTutorialCameraAssistAllowed({
      anchorCamera: tutorialCameraAssistAnchor,
      targetKey,
      referenceDistance
    });
  }

  function frameTutorialShipyardProductionArrival(shipyardNodeId: string): void {
    const target = `node:${shipyardNodeId}`;
    selectTutorialTarget(target);
  }

  function frameTutorialNodeShipCloseup(nodeId: string): void {
    const target = `node:${nodeId}`;
    selectTutorialTarget(target);
  }

  function frameTutorialShipyardContestedNodeCloseup(nodeId: string): void {
    const target = `node:${nodeId}`;
    selectTutorialTarget(target);
  }

  function syncFocusSelectToTarget(targetKey: string | null): void {
    const selectValue = targetKey ?? "";
    const hasOption = Array.from(focusSelect.options).some(
      (option) => option.value === selectValue
    );
    focusSelect.value = hasOption ? selectValue : "";
  }

  function handleTutorialSelection(selection: CinematicSelection | null): void {
    const tutorial = tutorialState;

    if (tutorial === null || isTutorialLogbookIntroductionBlockingOpening()) {
      return;
    }

    const selectedNodeId = getNodeIdFromTargetKey(selection?.targetKey ?? null);
    noteTutorialPlayerActivity();

    if (
      tutorial.phase === "awaitingInitialSelection" &&
      selectedNodeId === tutorialOpeningOriginNodeId
    ) {
      snapCommandTranscriptToLiveTail();
      freezeTutorialLiveHintsToTranscript("tutorial:opening-live-hints-frozen", {
        refresh: false
      });
      const openingTargetKey = `node:${tutorialOpeningOriginNodeId}`;
      const canPlayOpeningCloseup =
        (areTutorialCameraMovesEnabled() && !hasMovedTutorialOpeningCamera) ||
        canStartTutorialCameraAssist(openingTargetKey, tutorialOpeningCameraPose.distance);

      if (
        canPlayOpeningCloseup &&
        cinematicRenderer?.focusTutorialOpeningNodeCloseupSmooth(openingTargetKey) === true
      ) {
        rememberTutorialSettledCameraAssistAnchor();
      }

      tutorial.phase = "awaitingFirstBurnPreview";
      tutorial.firstSelectionAt = performance.now();
      tutorial.firstBurnPreviewDestinationNodeId = null;
      tutorial.firstBurnReselectionStartedAt = null;
      lastPlayerNodeSelectionAt = tutorial.firstSelectionAt;
      hasConfirmedPlayerOrderAfterSelection = false;
      appendTutorialFirstBurnCostOnce({ refresh: false });
      refreshCommandConsoleAfterTutorialSelection();
      return;
    }

    if (
      tutorial.phase === "awaitingFirstBurnPreview" ||
      tutorial.phase === "awaitingFirstBurnConfirm"
    ) {
      if (selectedNodeId === tutorialOpeningOriginNodeId) {
        if (tutorial.firstBurnReselectionStartedAt !== null) {
          tutorial.firstSelectionAt = performance.now();
          tutorial.firstBurnPreviewDestinationNodeId = null;
          tutorial.firstBurnReselectionStartedAt = null;
          lastPlayerNodeSelectionAt = tutorial.firstSelectionAt;
          refreshCommandConsoleAfterTutorialSelection();
        }
        return;
      }

      if (tutorial.firstBurnReselectionStartedAt === null) {
        tutorial.firstBurnReselectionStartedAt = performance.now();
        refreshCommandConsoleAfterTutorialSelection();
      }
    }

    if (
      (tutorial.phase === "awaitingProductiveBurnPreview" ||
        tutorial.phase === "awaitingProductiveBurnConfirm") &&
      tutorial.productiveBurnOriginNodeId !== null
    ) {
      if (selectedNodeId === tutorial.productiveBurnOriginNodeId) {
        if (
          tutorial.productiveBurnReselectionStartedAt !== null ||
          tutorial.productiveBurnPromptStartedAt === null
        ) {
          tutorial.productiveBurnPromptStartedAt = performance.now();
          tutorial.productiveBurnReselectionStartedAt = null;
          lastPlayerNodeSelectionAt = tutorial.productiveBurnPromptStartedAt;
          refreshCommandConsoleAfterTutorialSelection();
        }
        return;
      }

      if (tutorial.productiveBurnReselectionStartedAt === null) {
        tutorial.productiveBurnReselectionStartedAt = performance.now();
        tutorial.productiveBurnPromptStartedAt = null;
        refreshCommandConsoleAfterTutorialSelection();
      }
    }
  }

  function isTutorialLogbookIntroductionBlockingOpening(): boolean {
    return (
      tutorialState?.phase === "awaitingInitialSelection" &&
      commandGlossaryController.isTutorialLogbookIntroductionActive()
    );
  }

  function freezeCompletedTutorialLogbookOpenPrompt(): void {
    if (commandGlossaryController.getTutorialLogbookIntroductionStep() === "open-prompt") {
      return;
    }

    for (const line of commandConsole.querySelectorAll<HTMLElement>(
      '[data-row-key="tutorial:live-logbook-introduction"]'
    )) {
      line.className = freezeTutorialLiveHintClassName(line.className) ?? line.className;
    }
  }

  function restoreTutorialRequiredShipSelectionAfterDeselect(): boolean {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return false;
    }

    const requiredNodeId = getTutorialRequiredShipSelection(tutorial)?.nodeId ?? null;
    const recoveryTargetKey = getTutorialRequiredShipSelectionRecoveryTargetKey(
      tutorial,
      selectedTargetKey,
      requiredNodeId
    );

    if (recoveryTargetKey === null) {
      return false;
    }

    selectedTargetKey = recoveryTargetKey;
    syncFocusSelectToTarget(recoveryTargetKey);
    isRestoringTutorialRequiredShipSelection = true;

    try {
      cinematicRenderer?.selectTarget(recoveryTargetKey);
    } finally {
      isRestoringTutorialRequiredShipSelection = false;
    }

    return true;
  }

  function handleTutorialOverlaySelection(selection: CinematicSelection | null): void {
    if (tutorialState !== null || isReplayMode) {
      return;
    }

    const selectedNodeId = getNodeIdFromTargetKey(selection?.targetKey ?? null);

    if (selectedNodeId !== null && isPlayerOccupiedNode(selectedNodeId)) {
      lastPlayerNodeSelectionAt = performance.now();
      return;
    }

    lastPlayerNodeSelectionAt = null;
  }

  function markPlayerOrderConfirmedAfterSelection(): void {
    if (lastPlayerNodeSelectionAt === null) {
      return;
    }

    hasConfirmedPlayerOrderAfterSelection = true;
  }

  function handleTutorialInputGesture(gesture: CinematicInputGesture): void {
    noteTutorialPlayerActivity();

    const tutorial = tutorialState;

    if (
      tutorial !== null &&
      gesture === "right-click" &&
      (tutorial.phase === "shipyardFirePrompt" || tutorial.phase === "shipyardContestedFirePrompt")
    ) {
      const fireOriginNodeId =
        tutorial.phase === "shipyardFirePrompt"
          ? tutorial.shipyardLessonNodeId
          : tutorial.shipyardSupportFireNodeId;
      window.queueMicrotask(() => {
        if (tutorialState === tutorial && isTutorialSelectedFireModeActive(fireOriginNodeId)) {
          snapCommandTranscriptToLiveTail();
        }
      });
    }

    if (tutorial !== null && gesture === "wheel-zoom-out") {
      tutorial.hasZoomedOutCamera = true;
    }

    if (
      tutorial?.phase === "awaitingInitialSelection" &&
      isTutorialCameraMovementGesture(gesture)
    ) {
      hasMovedTutorialOpeningCamera = true;
    }

    if (isTutorialCameraMovementGesture(gesture)) {
      queueTutorialZoomFocusHintCameraCheck();
    }
  }

  function isTutorialCameraMovementGesture(gesture: CinematicInputGesture): boolean {
    return gesture !== "right-click";
  }

  function noteTutorialPlayerActivity(): void {
    if (tutorialState !== null) {
      const hintDueAt = getCurrentTutorialConfirmCameraPanOrbitHintDueAt();
      const shouldRefreshVisibleConfirmHint = hintDueAt !== null && performance.now() >= hintDueAt;

      lastTutorialPlayerActivityAt = performance.now();

      if (shouldRefreshVisibleConfirmHint) {
        refreshTutorialCommandConsole();
      } else {
        syncTutorialConfirmCameraHintRefreshTimer();
      }
    }
  }

  function refreshTutorialCommandConsole(): void {
    if (tutorialState === null) {
      updateCommandConsole();
      return;
    }

    refreshCommandConsoleAfterTutorialSelection();
  }

  function appendTutorialCameraPanOrbitHint(): void {
    appendTutorialCameraHint("tutorial:camera-pan-orbit-hint", tutorialCameraPanOrbitHintText, () =>
      scheduleTutorialCameraPanOrbitHint(tutorialCameraControlsHintRetryDelayMs)
    );
  }

  function appendTutorialCameraZoomHint(): void {
    appendTutorialCameraHint("tutorial:camera-zoom-hint", tutorialCameraZoomHintText, () =>
      scheduleTutorialCameraZoomHint(tutorialCameraControlsHintRetryDelayMs)
    );
  }

  function appendTutorialCameraHint(key: string, text: string, retry: () => void): void {
    if (tutorialCameraGuidancePaused || !isTutorialFirstTurn()) {
      return;
    }

    const tutorial = tutorialState;

    if (tutorial === null || tutorial.loggedKeys.has(key)) {
      return;
    }

    if (!canAppendTutorialCameraHint(key)) {
      retry();
      return;
    }

    lastTutorialCameraHintAt = performance.now();
    lastTutorialCameraHintTurn = state.turn;
    appendTutorialLog(text, key);

    if (key === "tutorial:camera-pan-orbit-hint") {
      scheduleTutorialCameraZoomHint(tutorialCameraZoomHintDelayMs);
    }
  }

  function canAppendTutorialCameraHint(key: string): boolean {
    const tutorial = tutorialState;
    const now = performance.now();

    if (
      tutorial === null ||
      !isTutorialFirstTurn() ||
      tutorial.inputLocked ||
      tutorial.autoAdvanceActive
    ) {
      return false;
    }

    if (isCommandConsoleResolving || isCommandConsoleTypingLiveBlock) {
      return false;
    }

    if (now - lastTutorialPlayerActivityAt < tutorialCameraControlsIdleHintDelayMs) {
      return false;
    }

    if (
      lastTutorialCameraHintAt !== null &&
      now - lastTutorialCameraHintAt < tutorialCameraControlsHintMinimumGapMs
    ) {
      return false;
    }

    if (liveTutorialTimelineRows.some((row) => !isTrailingTutorialLiveRow(row))) {
      return false;
    }

    if (
      key === "tutorial:camera-zoom-hint" &&
      (!tutorial.loggedKeys.has("tutorial:camera-pan-orbit-hint") ||
        lastTutorialCameraHintTurn === state.turn)
    ) {
      return false;
    }

    return true;
  }

  function scheduleTutorialCameraPanOrbitHint(delayMs = tutorialCameraPanOrbitHintDelayMs): void {
    if (tutorialCameraGuidancePaused || !isTutorialFirstTurn()) {
      return;
    }

    const tutorial = tutorialState;

    if (tutorial === null || tutorial.loggedKeys.has("tutorial:camera-pan-orbit-hint")) {
      return;
    }

    const timer = window.setTimeout(() => {
      const activeTutorial = tutorialState;

      if (
        activeTutorial === null ||
        !isTutorialFirstTurn() ||
        activeTutorial.loggedKeys.has("tutorial:camera-pan-orbit-hint")
      ) {
        return;
      }

      if (activeTutorial.inputLocked || activeTutorial.autoAdvanceActive) {
        scheduleTutorialCameraPanOrbitHint(tutorialCameraControlsHintRetryDelayMs);
        return;
      }

      appendTutorialCameraPanOrbitHint();
    }, delayMs);

    tutorial.timers.push(timer);
  }

  function scheduleTutorialCameraZoomHint(delayMs = tutorialCameraZoomHintDelayMs): void {
    if (tutorialCameraGuidancePaused || !isTutorialFirstTurn()) {
      return;
    }

    const tutorial = tutorialState;

    if (tutorial === null || tutorial.loggedKeys.has("tutorial:camera-zoom-hint")) {
      return;
    }

    const timer = window.setTimeout(() => {
      const activeTutorial = tutorialState;

      if (
        activeTutorial === null ||
        !isTutorialFirstTurn() ||
        activeTutorial.loggedKeys.has("tutorial:camera-zoom-hint")
      ) {
        return;
      }

      if (activeTutorial.inputLocked || activeTutorial.autoAdvanceActive) {
        scheduleTutorialCameraZoomHint(tutorialCameraControlsHintRetryDelayMs);
        return;
      }

      appendTutorialCameraZoomHint();
    }, delayMs);

    tutorial.timers.push(timer);
  }

  function handleTutorialBurnPreviewSeen(
    originNodeId: string,
    destinationNodeId: string,
    plan: BurnPlan | null
  ): void {
    const tutorial = tutorialState;

    if (tutorial === null || plan === null) {
      return;
    }

    const isFirstBurnPreview =
      (tutorial.phase === "awaitingFirstBurnPreview" ||
        tutorial.phase === "awaitingFirstBurnConfirm") &&
      originNodeId === tutorialOpeningOriginNodeId &&
      destinationNodeId !== tutorialOpeningOriginNodeId;

    if (isFirstBurnPreview) {
      const previousDestinationNodeId = tutorial.firstBurnPreviewDestinationNodeId;
      tutorial.firstBurnPreviewDestinationNodeId = destinationNodeId;

      if (tutorial.phase === "awaitingFirstBurnPreview") {
        snapCommandTranscriptToLiveTail();
        tutorial.phase = "awaitingFirstBurnConfirm";
        tutorial.firstBurnReselectionStartedAt = null;
        refreshCommandConsoleAfterTutorialSelection();
        return;
      }

      if (previousDestinationNodeId !== destinationNodeId) {
        refreshCommandConsoleAfterTutorialSelection();
      }
      return;
    }

    if (
      tutorial.phase === "awaitingProductiveBurnPreview" &&
      originNodeId === tutorial.productiveBurnOriginNodeId &&
      destinationNodeId !== originNodeId
    ) {
      snapCommandTranscriptToLiveTail();
      tutorial.phase = "awaitingProductiveBurnConfirm";
      tutorial.productiveBurnPromptStartedAt = performance.now();
      tutorial.productiveBurnReselectionStartedAt = null;
      refreshCommandConsoleAfterTutorialSelection();
    }
  }

  function isTutorialBurnPlanAllowed(originNodeId: string, destinationNodeId: string): boolean {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return true;
    }

    recoverStaleTutorialQueuedBurnIfNeeded();

    if (tutorial.inputLocked) {
      return false;
    }

    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (mandatoryLaunch !== undefined && originNodeId === mandatoryLaunch.nodeId) {
      const forcedTutorialMandatoryLaunchDestinationNodeId =
        getTutorialForcedMandatoryLaunchDestinationNodeId(originNodeId);

      if (forcedTutorialMandatoryLaunchDestinationNodeId !== null) {
        return destinationNodeId === forcedTutorialMandatoryLaunchDestinationNodeId;
      }

      return destinationNodeId !== originNodeId;
    }

    if (
      tutorial.phase === "awaitingInitialSelection" ||
      tutorial.phase === "awaitingFirstBurnPreview" ||
      tutorial.phase === "awaitingFirstBurnConfirm"
    ) {
      return originNodeId === tutorialOpeningOriginNodeId && destinationNodeId !== originNodeId;
    }

    if (
      tutorial.phase === "awaitingProductiveBurnPreview" ||
      tutorial.phase === "awaitingProductiveBurnConfirm"
    ) {
      return (
        originNodeId === tutorial.productiveBurnOriginNodeId &&
        destinationNodeId !== originNodeId &&
        (tutorial.shipyardContestedRecoveryActive !== true ||
          isTutorialSupportProductionShipyardDestination(
            originNodeId,
            destinationNodeId,
            getTutorialShipyardContestedTargetNodeId(tutorial)
          ))
      );
    }

    if (tutorial.phase === "mandatoryLaunch") {
      return originNodeId === tutorial.shipyardLessonNodeId && destinationNodeId !== originNodeId;
    }

    if (tutorial.phase === "shipyardContestedBurnPrompt") {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      return (
        contestedNodeId !== null &&
        originNodeId === contestedNodeId &&
        destinationNodeId !== originNodeId
      );
    }

    if (tutorial.phase === "shipyardCounterContestBurnPrompt") {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      return (
        originNodeId === tutorial.shipyardCounterContestOriginNodeId &&
        contestedNodeId !== null &&
        destinationNodeId === contestedNodeId
      );
    }

    if (tutorial.phase === "enemyBurnTarget") {
      return destinationNodeId === tutorial.enemyNodeId && originNodeId !== destinationNodeId;
    }

    if (tutorial.phase === "awaitingBurnOut") {
      return (
        originNodeId === tutorial.defensivePlayerNodeId &&
        destinationNodeId !== tutorial.defensivePlayerNodeId
      );
    }

    if (
      tutorial.phase === "shipyardProduction" ||
      tutorial.phase === "shipyardSupportProduction" ||
      tutorial.phase === "shipyardSupportProductionCompletion" ||
      tutorial.phase === "shipyardArrivalWork" ||
      tutorial.phase === "shipyardFirePrompt" ||
      tutorial.phase === "shipyardFireQueued" ||
      tutorial.phase === "shipyardFireWorkLesson" ||
      tutorial.phase === "autoAdvancingToShipyardEnemyEvade" ||
      tutorial.phase === "shipyardEnemyEvadeLesson" ||
      tutorial.phase === "autoAdvancingToShipyardEnemyArrival" ||
      tutorial.phase === "autoAdvancingToShipyardContestedBurn" ||
      tutorial.phase === "shipyardContestedFirePrompt" ||
      tutorial.phase === "shipyardContestedFireQueued" ||
      tutorial.phase === "autoAdvancingToShipyardContestedFireImpact" ||
      tutorial.phase === "autoAdvancingToShipyardContestedSupport" ||
      tutorial.phase === "shipyardCounterContestBurnQueued" ||
      tutorial.phase === "autoAdvancingToShipyardCounterContestArrival" ||
      tutorial.phase === "shipyardContestedBurnQueued" ||
      tutorial.phase === "shipyardProductionCompletion" ||
      tutorial.phase === "awaitingFirstTritiumWorkTurn" ||
      tutorial.phase === "tritiumArrivalExecute" ||
      tutorial.phase === "awaitingFirstArrival" ||
      tutorial.phase === "productiveBurnQueued" ||
      tutorial.phase === "awaitingProductiveArrival" ||
      tutorial.phase === "evadeLesson" ||
      tutorial.phase === "autoAdvancingToEvadeImpact" ||
      tutorial.phase === "contestedFireSetup" ||
      tutorial.phase === "defensiveForecast" ||
      tutorial.phase === "autoAdvancingToDefensiveContested" ||
      tutorial.phase === "burnOutQueued"
    ) {
      return false;
    }

    return true;
  }

  function recoverStaleTutorialQueuedBurnIfNeeded(): void {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.inputLocked ||
      tutorial.autoAdvanceActive ||
      (tutorial.phase !== "productiveBurnQueued" && tutorial.phase !== "awaitingProductiveArrival")
    ) {
      return;
    }

    const destinationNodeId = tutorial.productiveBurnDestinationNodeId;

    if (destinationNodeId === null) {
      return;
    }

    if (hasFactionShipAtNode(state, destinationNodeId, "player")) {
      resolveTutorialProductiveArrival(destinationNodeId);
      updateInteractionLocks();
      updateTutorialCommandConsoleWithTypewriter();
      return;
    }

    if (isTutorialBurnStillPendingOrInFlight(tutorial, destinationNodeId)) {
      return;
    }

    const currentOriginNodeId =
      tutorial.productiveBurnOriginNodeId !== null &&
      hasFactionShipAtNode(state, tutorial.productiveBurnOriginNodeId, "player")
        ? tutorial.productiveBurnOriginNodeId
        : (state.nodeOccupancies.find((occupancy) => {
            return (
              occupancy.factionId === "player" &&
              occupancy.shipCount > 0 &&
              occupancy.nodeId !== destinationNodeId
            );
          })?.nodeId ?? null);

    if (currentOriginNodeId === null) {
      return;
    }

    tutorial.phase = "awaitingProductiveBurnPreview";
    tutorial.productiveBurnOriginNodeId = currentOriginNodeId;
    tutorial.productiveBurnDestinationNodeId = null;
    tutorial.productiveBurnArrivalTurn = null;
    tutorial.productiveBurnPromptStartedAt = performance.now();
    tutorial.productiveBurnReselectionStartedAt = null;
    tutorial.tutorialBurnDestinationNodeId = null;
    tutorial.tutorialBurnArrivalTurn = null;
    lastPlayerNodeSelectionAt = tutorial.productiveBurnPromptStartedAt;
    hasConfirmedPlayerOrderAfterSelection = false;
    updateInteractionLocks();
    updateCommandConsole();
  }

  function isTutorialFirePlanAllowed(originNodeId: string, targetNodeId: string): boolean {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return true;
    }

    if (
      tutorial.phase === "shipyardFirePrompt" &&
      originNodeId === tutorial.shipyardLessonNodeId &&
      targetNodeId === tutorial.shipyardEnemyDestinationNodeId
    ) {
      return true;
    }

    if (tutorial.phase === "shipyardContestedFirePrompt") {
      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      return (
        originNodeId === tutorial.shipyardSupportFireNodeId &&
        contestedNodeId !== null &&
        targetNodeId === contestedNodeId
      );
    }

    return false;
  }

  function handleTutorialFireOrderQueued(
    originNodeId: string,
    targetNodeId: string,
    previousPendingOrderCount: number
  ): void {
    const tutorial = tutorialState;

    if (tutorial === null || state.pendingFireOrders.length <= previousPendingOrderCount) {
      return;
    }
    snapCommandTranscriptToLiveTail();
    noteTutorialPlayerActivity();

    if (
      tutorial.phase === "shipyardFirePrompt" &&
      originNodeId === tutorial.shipyardLessonNodeId &&
      targetNodeId === tutorial.shipyardEnemyDestinationNodeId
    ) {
      const order = state.pendingFireOrders.find((candidate) => {
        return (
          candidate.factionId === "player" &&
          candidate.originNodeId === originNodeId &&
          candidate.targetNodeId === targetNodeId &&
          candidate.targetFactionId === "opponent"
        );
      });

      tutorial.shipyardEnemyFireImpactTurn = order?.impactTurn ?? null;
      tutorial.shipyardEnemyEvadeObserved = false;
      freezeTutorialLiveHintsToTranscript("tutorial:shipyard-fire-live-hints-frozen");
      appendTutorialShipyardFireWorkChoiceRows();
      tutorial.phase = "shipyardFireQueued";
      tutorial.shipyardFirePromptStartedAt = null;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
    }

    const contestedFireTargetNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (
      tutorial.phase === "shipyardContestedFirePrompt" &&
      originNodeId === tutorial.shipyardSupportFireNodeId &&
      contestedFireTargetNodeId !== null &&
      targetNodeId === contestedFireTargetNodeId
    ) {
      freezeTutorialLiveHintsToTranscript("tutorial:shipyard-contested-fire-live-hints-frozen");
      tutorial.phase = "shipyardContestedFireQueued";
      tutorial.shipyardSupportFirePromptStartedAt = null;
      tutorial.contestedNodeId = contestedFireTargetNodeId;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
    }
  }

  function getTutorialQueuedFireOrder(): PendingFireOrder | undefined {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return undefined;
    }

    return findTutorialQueuedFireOrder(
      tutorial,
      getTutorialShipyardContestedTargetNodeId(tutorial),
      state.pendingFireOrders
    );
  }

  function handleTutorialFireOrderCancelled(cancelledOrder: PendingFireOrder): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const lesson = recoverTutorialQueuedFireLessonAfterCancellation(
      tutorial,
      getTutorialShipyardContestedTargetNodeId(tutorial),
      cancelledOrder,
      performance.now()
    );

    if (lesson === null) {
      return;
    }

    noteTutorialPlayerActivity();
    hasConfirmedPlayerOrderAfterSelection = false;

    updateInteractionLocks();
    refreshTutorialCommandConsole();
  }

  function appendTutorialShipyardFireWorkChoiceRows(): void {
    appendTutorialTimelineRows(
      createTutorialShipyardFireWorkChoiceRows(getCommandFactionClass("player")),
      "tutorial:shipyard-fire-work-choice"
    );
  }

  function handleTutorialBurnOrderQueued(originNodeId: string, destinationNodeId: string): void {
    const tutorial = tutorialState;
    const order = getPendingBurnOrder(originNodeId, "player");

    if (tutorial === null || order?.destinationNodeId !== destinationNodeId) {
      return;
    }
    snapCommandTranscriptToLiveTail();
    noteTutorialPlayerActivity();

    tutorial.tutorialBurnDestinationNodeId = order.destinationNodeId;
    tutorial.tutorialBurnArrivalTurn = order.arrivalTurn;
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (
      (tutorial.phase === "awaitingFirstBurnPreview" ||
        tutorial.phase === "awaitingFirstBurnConfirm") &&
      originNodeId === tutorialOpeningOriginNodeId
    ) {
      freezeTutorialLiveHintsToTranscript("tutorial:first-burn-live-hints-frozen");
      appendTutorialFirstBurnTimeCostOnce();
      tutorial.phase = "firstBurnQueued";
      tutorial.firstBurnReselectionStartedAt = null;
      tutorial.firstBurnPreviewDestinationNodeId = null;
      tutorial.firstBurnDestinationNodeId = order.destinationNodeId;
      tutorial.firstBurnArrivalTurn = order.arrivalTurn;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
      return;
    }

    if (
      (tutorial.phase === "awaitingProductiveBurnPreview" ||
        tutorial.phase === "awaitingProductiveBurnConfirm") &&
      originNodeId === tutorial.productiveBurnOriginNodeId &&
      destinationNodeId !== originNodeId
    ) {
      freezeTutorialLiveHintsToTranscript("tutorial:productive-burn-live-hints-frozen");
      tutorial.phase = "productiveBurnQueued";
      tutorial.productiveBurnDestinationNodeId = destinationNodeId;
      tutorial.productiveBurnArrivalTurn = order?.arrivalTurn ?? null;
      tutorial.productiveBurnPromptStartedAt = null;
      tutorial.productiveBurnReselectionStartedAt = null;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
      return;
    }

    if (
      mandatoryLaunch !== undefined &&
      originNodeId === mandatoryLaunch.nodeId &&
      destinationNodeId !== originNodeId
    ) {
      const forcedTutorialMandatoryLaunchDestinationNodeId =
        getTutorialForcedMandatoryLaunchDestinationNodeId(originNodeId);

      if (forcedTutorialMandatoryLaunchDestinationNodeId === destinationNodeId) {
        tutorial.shipyardContestedRecoveryActive = true;
        tutorial.contestedNodeId = destinationNodeId;
      }

      tutorial.phase = "mandatoryLaunchQueued";
      tutorial.activeMandatoryLaunchId = mandatoryLaunch.id;
      tutorial.tutorialBurnDestinationNodeId = destinationNodeId;
      tutorial.tutorialBurnArrivalTurn = order?.arrivalTurn ?? null;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
      void autoAdvanceTutorialMandatoryLaunchToDestination();
      return;
    }

    const contestedBurnTargetNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (
      tutorial.phase === "shipyardContestedBurnPrompt" &&
      contestedBurnTargetNodeId !== null &&
      originNodeId === contestedBurnTargetNodeId &&
      destinationNodeId !== originNodeId
    ) {
      freezeTutorialLiveHintsToTranscript("tutorial:shipyard-contested-burn-live-hints-frozen");
      tutorial.phase = "shipyardContestedBurnQueued";
      tutorial.shipyardPlayerEscapeNodeId = destinationNodeId;
      tutorial.contestedNodeId = contestedBurnTargetNodeId;
      tutorial.shipyardContestedPromptStartedAt = null;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
      return;
    }

    const counterContestTargetNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (
      tutorial.phase === "shipyardCounterContestBurnPrompt" &&
      originNodeId === tutorial.shipyardCounterContestOriginNodeId &&
      counterContestTargetNodeId !== null &&
      destinationNodeId === counterContestTargetNodeId
    ) {
      freezeTutorialLiveHintsToTranscript("tutorial:shipyard-counter-contest-live-hints-frozen");
      tutorial.phase = "shipyardCounterContestBurnQueued";
      tutorial.tutorialBurnDestinationNodeId = destinationNodeId;
      tutorial.tutorialBurnArrivalTurn = order?.arrivalTurn ?? null;
      tutorial.shipyardCounterContestArrivalTurn = order?.arrivalTurn ?? null;
      tutorial.contestedNodeId = counterContestTargetNodeId;
      tutorial.shipyardContestedPromptStartedAt = null;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
      return;
    }

    if (tutorial.phase === "enemyBurnTarget" && destinationNodeId === tutorial.enemyNodeId) {
      tutorial.phase = "enemyBurnQueued";
      tutorial.contestedNodeId = destinationNodeId;
      updateInteractionLocks();
      refreshTutorialCommandConsole();
      return;
    }

    if (tutorial.phase === "awaitingBurnOut" && originNodeId === tutorial.defensivePlayerNodeId) {
      tutorial.phase = "burnOutQueued";
      tutorial.defensiveEscapeNodeId = destinationNodeId;
      appendTutorialRows(
        [
          "BURN OUT order queued.",
          "The ship will leave its contested orbit when EXECUTE resolves."
        ],
        "tutorial:burn-out-queued"
      );
      updateInteractionLocks();
      refreshTutorialCommandConsole();
    }
  }

  function getPendingBurnOrder(
    originNodeId: string,
    factionId: FactionId
  ): GameState["pendingBurnOrders"][number] | undefined {
    return state.pendingBurnOrders.find((order) => {
      return order.originNodeId === originNodeId && order.factionId === factionId;
    });
  }

  function recoverTutorialFirstBurnTracking(events: readonly TurnDebugEvent[] = []): string | null {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return null;
    }

    const tracking = findTrackedTutorialFirstBurn({
      burns: [...state.pendingBurnOrders, ...state.activeBurnTransits],
      departures: events,
      openingOriginNodeId: tutorialOpeningOriginNodeId,
      cachedTutorialDestinationNodeId: tutorial.tutorialBurnDestinationNodeId,
      cachedTutorialArrivalTurn: tutorial.tutorialBurnArrivalTurn,
      cachedFirstDestinationNodeId: tutorial.firstBurnDestinationNodeId,
      cachedFirstArrivalTurn: tutorial.firstBurnArrivalTurn
    });

    if (tracking === null) {
      return null;
    }

    tutorial.firstBurnDestinationNodeId = tracking.destinationNodeId;
    tutorial.firstBurnArrivalTurn = tracking.arrivalTurn;
    tutorial.tutorialBurnDestinationNodeId = tracking.destinationNodeId;
    tutorial.tutorialBurnArrivalTurn = tracking.arrivalTurn;
    return tracking.destinationNodeId;
  }

  function withBurnAffordability(
    plan: BurnPlan | null,
    originNodeId?: string,
    destinationNodeId?: string
  ) {
    if (plan === null) {
      return null;
    }

    if (
      isMandatoryLaunchDestinationUnavailable(
        originNodeId ?? plan.originNodeId,
        destinationNodeId ?? plan.destinationNodeId,
        plan.burnCost
      )
    ) {
      return null;
    }

    return {
      ...plan,
      isAffordable:
        plan.burnCost <= getProjectedFactionDv(state, "player", originNodeId ?? plan.originNodeId)
    };
  }

  function getBurnPlanFailureReason(
    originNodeId: string,
    destinationNodeId: string
  ): string | null {
    if (
      isReplayMode ||
      postMatchReportText !== null ||
      !isPlayerFactionHuman() ||
      isLocalPlayerPlanningLocked()
    ) {
      return "ORDERS LOCKED";
    }

    if (!isTutorialBurnPlanAllowed(originNodeId, destinationNodeId)) {
      return getTutorialPlanFailureReason();
    }

    if (originNodeId === destinationNodeId) {
      return null;
    }

    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (mandatoryLaunch !== undefined && mandatoryLaunch.nodeId !== originNodeId) {
      return "MANDATORY LAUNCH REQUIRED";
    }

    if (
      state.pendingFireOrders.some((order) => {
        return order.originNodeId === originNodeId && order.factionId === "player";
      })
    ) {
      return "FIRE QUEUED";
    }

    if (
      !state.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === originNodeId &&
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0
        );
      })
    ) {
      return "NO SHIP";
    }

    if (mandatoryLaunch !== undefined && isSnapshotNodeContested(destinationNodeId)) {
      return "DESTINATION CONTESTED";
    }

    if (wouldPlayerStackAtDestination(destinationNodeId)) {
      return "OWN SHIP PRESENT";
    }

    const plan = calculateBurnPlan(content, state, originNodeId, destinationNodeId);

    if (plan === null) {
      return "NO BURN SOLUTION";
    }

    return plan.burnCost > getProjectedFactionDv(state, "player", originNodeId)
      ? "ΔV INSUFFICIENT"
      : null;
  }

  function getFirePlanFailureReason(originNodeId: string, targetNodeId: string): string | null {
    if (
      isReplayMode ||
      postMatchReportText !== null ||
      !isPlayerFactionHuman() ||
      isLocalPlayerPlanningLocked()
    ) {
      return "ORDERS LOCKED";
    }

    if (getNextPlayerMandatoryLaunch() !== undefined) {
      return "MANDATORY LAUNCH REQUIRED";
    }

    if (!isTutorialFirePlanAllowed(originNodeId, targetNodeId)) {
      return getTutorialPlanFailureReason();
    }

    if (
      !state.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === originNodeId &&
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0
        );
      })
    ) {
      return "NO SHIP";
    }

    if (isSnapshotNodeContested(originNodeId)) {
      return "orbit CONTESTED";
    }

    if (
      state.pendingBurnOrders.some((order) => {
        return order.originNodeId === originNodeId && order.factionId === "player";
      })
    ) {
      return "BURN QUEUED";
    }

    const plan = calculateFirePlan(content, state, originNodeId, targetNodeId);

    if (plan === null) {
      return "NO FIRE SOLUTION";
    }

    return withFireValidity(plan)?.isValidTarget === false ? "NO ENEMY TARGET" : null;
  }

  function getTutorialPlanFailureReason(): "PRESS EXECUTE?" | "TUTORIAL LOCKED" {
    return shouldShowExecutePrompt() && getExecutePromptMode() === "execute"
      ? "PRESS EXECUTE?"
      : "TUTORIAL LOCKED";
  }

  function isMandatoryLaunchDestinationUnavailable(
    originNodeId: string,
    destinationNodeId: string,
    burnCost: number
  ): boolean {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (mandatoryLaunch === undefined || mandatoryLaunch.nodeId !== originNodeId) {
      return false;
    }

    if (isSnapshotNodeContested(destinationNodeId)) {
      return true;
    }

    if (wouldPlayerStackAtDestination(destinationNodeId)) {
      return true;
    }

    return burnCost > getProjectedFactionDv(state, "player", originNodeId);
  }

  function isSnapshotNodeContested(nodeId: string): boolean {
    return snapshot.nodes.some((node) => node.id === nodeId && node.isContested);
  }

  function wouldPlayerStackAtDestination(destinationNodeId: string): boolean {
    if (
      snapshot.nodeOccupancies.some((occupancy) => {
        return (
          occupancy.nodeId === destinationNodeId &&
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0
        );
      })
    ) {
      return true;
    }

    if (
      state.pendingBurnOrders.some((order) => {
        return order.destinationNodeId === destinationNodeId && order.factionId === "player";
      })
    ) {
      return true;
    }

    return state.activeBurnTransits.some((transit) => {
      return transit.destinationNodeId === destinationNodeId && transit.factionId === "player";
    });
  }

  function prepareTutorialOpponentMandatoryLaunches(): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const opponentLaunches = state.mandatoryLaunches
      .filter((launch) => launch.factionId === "opponent")
      .sort((first, second) => {
        if (first.createdTurn !== second.createdTurn) {
          return first.createdTurn - second.createdTurn;
        }

        return first.id.localeCompare(second.id);
      });

    if (opponentLaunches.length === 0) {
      return;
    }

    let nextState = ensureTutorialOpponentFaction(state);
    let didQueueLaunch = false;

    for (const launch of opponentLaunches) {
      const plan = findTutorialOpponentMandatoryLaunchPlan(nextState, launch.nodeId);

      if (plan === null) {
        continue;
      }

      if (plan.burnCost > getFactionDv(nextState, "opponent")) {
        nextState = withTutorialFactionDv(nextState, "opponent", plan.burnCost);
      }

      nextState = applyCommand(
        nextState,
        {
          type: "ASSIGN_BURN_ORDER",
          factionId: "opponent",
          originNodeId: launch.nodeId,
          destinationNodeId: plan.destinationNodeId
        },
        content
      );
      didQueueLaunch = true;
    }

    if (!didQueueLaunch) {
      return;
    }

    state = nextState;
    snapshot = createSolarSystemSnapshot(content, state);
  }

  function findTutorialOpponentMandatoryLaunchPlan(
    nextState: GameState,
    originNodeId: string
  ): BurnPlan | null {
    const occupiedNodeIds = new Set(
      nextState.nodeOccupancies
        .filter((occupancy) => occupancy.shipCount > 0)
        .map((occupancy) => occupancy.nodeId)
    );
    const reservedDestinationNodeIds = new Set([
      ...nextState.pendingBurnOrders
        .filter((order) => order.factionId === "opponent")
        .map((order) => order.destinationNodeId),
      ...nextState.activeBurnTransits
        .filter((transit) => transit.factionId === "opponent")
        .map((transit) => transit.destinationNodeId)
    ]);

    const candidates = content.nodes
      .flatMap((node) => {
        if (
          node.id === originNodeId ||
          node.type === "shipyard" ||
          isTutorialProtectedInterdictionNode(node.id) ||
          occupiedNodeIds.has(node.id) ||
          reservedDestinationNodeIds.has(node.id) ||
          isSnapshotNodeContested(node.id)
        ) {
          return [];
        }

        const plan = calculateBurnPlan(content, nextState, originNodeId, node.id);

        if (plan === null) {
          return [];
        }

        return [
          {
            plan,
            typePriority: node.type === "barren" ? 0 : node.type === "tritium" ? 1 : 2
          }
        ];
      })
      .sort((first, second) => {
        if (first.typePriority !== second.typePriority) {
          return first.typePriority - second.typePriority;
        }

        if (first.plan.burnCost !== second.plan.burnCost) {
          return first.plan.burnCost - second.plan.burnCost;
        }

        if (first.plan.etaTurns !== second.plan.etaTurns) {
          return first.plan.etaTurns - second.plan.etaTurns;
        }

        return first.plan.destinationNodeId.localeCompare(second.plan.destinationNodeId);
      });

    return candidates[0]?.plan ?? null;
  }

  function withFireValidity(plan: FirePlan | null) {
    if (plan === null) {
      return null;
    }

    if (isSnapshotNodeContested(plan.originNodeId)) {
      return {
        ...plan,
        isValidTarget: false
      };
    }

    const targetOccupancy = state.nodeOccupancies.find((occupancy) => {
      return (
        occupancy.nodeId === plan.targetNodeId &&
        occupancy.factionId !== "player" &&
        occupancy.shipCount > 0
      );
    });

    if (targetOccupancy !== undefined) {
      return {
        ...plan,
        isValidTarget: true,
        targetFactionId: targetOccupancy.factionId,
        targetShipKey: `${plan.targetNodeId}:${targetOccupancy.factionId}`
      };
    }

    const targetFutureBurn = [...state.pendingBurnOrders, ...state.activeBurnTransits]
      .filter((order) => {
        return order.destinationNodeId === plan.targetNodeId && order.factionId !== "player";
      })
      .sort((first, second) => {
        if (first.arrivalTurn !== second.arrivalTurn) {
          return first.arrivalTurn - second.arrivalTurn;
        }

        return first.factionId.localeCompare(second.factionId);
      })[0];

    if (targetFutureBurn === undefined) {
      return {
        ...plan,
        isValidTarget: false
      };
    }

    const impactTurn = Math.max(plan.impactTurn, targetFutureBurn.arrivalTurn + 1);
    const targetNode = content.nodes.find((node) => node.id === plan.targetNodeId);
    const adjustedPlan =
      impactTurn === plan.impactTurn || targetNode === undefined
        ? plan
        : {
            ...plan,
            missileEtaTurns: impactTurn - plan.issuedTurn,
            impactTurn,
            targetPositionAtImpact: computeBodyPosition(content, targetNode.bodyId, impactTurn)
          };

    return {
      ...adjustedPlan,
      isValidTarget: true,
      targetFactionId: targetFutureBurn.factionId,
      targetShipKey: `${plan.targetNodeId}:${targetFutureBurn.factionId}`
    };
  }

  function getNextPlayerMandatoryLaunch() {
    if (!isPlayerFactionHuman()) {
      return undefined;
    }

    return [...snapshot.mandatoryLaunches]
      .filter((launch) => launch.factionId === "player")
      .sort((first, second) => {
        if (first.createdTurn !== second.createdTurn) {
          return first.createdTurn - second.createdTurn;
        }

        return first.id.localeCompare(second.id);
      })[0];
  }

  function isPlayerFactionHuman(): boolean {
    return getFactionIdentity(state, "player").controlType === "human";
  }

  function isMandatoryLaunchLockActive(): boolean {
    return getNextPlayerMandatoryLaunch() !== undefined;
  }

  function recoverTutorialMandatoryLaunchAutoDestination(
    tutorial: TutorialRuntimeState
  ): string | null {
    if (tutorial.phase !== "mandatoryLaunchQueued") {
      return tutorial.tutorialBurnDestinationNodeId;
    }

    const trackedBurn = findTrackedTutorialMandatoryLaunchBurn({
      burns: [...state.pendingBurnOrders, ...state.activeBurnTransits],
      activeMandatoryLaunchId: tutorial.activeMandatoryLaunchId,
      cachedDestinationNodeId: tutorial.tutorialBurnDestinationNodeId,
      shipyardLessonNodeId: tutorial.shipyardLessonNodeId,
      currentTurn: state.turn
    });

    if (trackedBurn !== undefined) {
      tutorial.tutorialBurnDestinationNodeId = trackedBurn.destinationNodeId;
      tutorial.tutorialBurnArrivalTurn = trackedBurn.arrivalTurn;
    }

    return tutorial.tutorialBurnDestinationNodeId;
  }

  function isTutorialMandatoryLaunchAutoAdvancePending(): boolean {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "mandatoryLaunchQueued") {
      return false;
    }

    const destinationNodeId = recoverTutorialMandatoryLaunchAutoDestination(tutorial);

    if (destinationNodeId === null) {
      return false;
    }

    return (
      state.pendingBurnOrders.some((order) => {
        return order.factionId === "player" && order.destinationNodeId === destinationNodeId;
      }) ||
      state.activeBurnTransits.some((transit) => {
        return (
          transit.factionId === "player" &&
          transit.destinationNodeId === destinationNodeId &&
          transit.arrivalTurn >= state.turn
        );
      })
    );
  }

  function maybeResumeTutorialMandatoryLaunchAutoAdvance(): void {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "mandatoryLaunchQueued" ||
      tutorial.inputLocked ||
      tutorial.autoAdvanceActive ||
      tutorialMandatoryLaunchAutoResumeQueued ||
      isCommandConsoleResolving ||
      isTurnTransitionActive ||
      !isTutorialMandatoryLaunchAutoAdvancePending()
    ) {
      return;
    }

    tutorialMandatoryLaunchAutoResumeQueued = true;
    window.queueMicrotask(() => {
      tutorialMandatoryLaunchAutoResumeQueued = false;

      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "mandatoryLaunchQueued" ||
        tutorial.inputLocked ||
        tutorial.autoAdvanceActive ||
        !isTutorialMandatoryLaunchAutoAdvancePending()
      ) {
        return;
      }

      void startTutorialPostMandatoryLaunchEvadeSequence();
    });
  }

  function getAutomaticMandatoryLaunchFactionIdsForResolution(
    ignoreMandatoryLaunchLock: boolean
  ): readonly FactionId[] | undefined {
    if (!ignoreMandatoryLaunchLock) {
      return undefined;
    }

    if (planningTimerMode !== "auto" && tutorialState === null) {
      return getPlanningParticipantFactionIds();
    }

    return getTutorialAiPlanningFactionIds(getActiveFactions(state));
  }

  function updateInteractionLocks(): void {
    maybeResumeTutorialMandatoryLaunchAutoAdvance();
    const isMandatoryLaunchLocked = isMandatoryLaunchLockActive();
    const isPlanningLocked = isPlanningTimerExecuteLocked();
    const isMatchEnded = postMatchReportText !== null;
    const isTutorialInputLocked = tutorialState?.inputLocked === true;
    nextTurnButton.disabled =
      isGameMenuOpen() ||
      isReplayMode ||
      isMatchEnded ||
      isCommandConsoleResolving ||
      isPlanningLocked ||
      isTutorialInputLocked ||
      !shouldShowExecutePrompt() ||
      isMandatoryLaunchLocked ||
      (isTurnTransitionActive &&
        defaultCinematic3dVisualTuning.turnAnimationDisableInputDuringTransition);
    replayButton.disabled =
      tutorialState !== null ||
      isReplayMode ||
      isMandatoryLaunchLocked ||
      replayTape.transitions.length === 0;
    fitButton.disabled = isReplayMode || isMandatoryLaunchLocked;
    mapSelect.disabled = isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    proceduralSeedInput.disabled =
      selectedMapPreset.procedural !== true ||
      isReplayMode ||
      isMandatoryLaunchLocked ||
      isTurnTransitionActive;
    proceduralSeedButton.disabled =
      selectedMapPreset.procedural !== true ||
      isReplayMode ||
      isMandatoryLaunchLocked ||
      isTurnTransitionActive;
    viewSelect.disabled = isReplayMode || isMandatoryLaunchLocked;
    shipModelSelect.disabled = isReplayMode || isMandatoryLaunchLocked;
    focusSelect.disabled = isReplayMode || isMandatoryLaunchLocked;
    onePlayerModeButton.disabled =
      isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    twoPlayerModeButton.disabled =
      isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    threePlayerModeButton.disabled =
      isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    gameMenuModeButton.disabled =
      isGameMenuOpen() || isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    beautyModeButton.disabled = isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    trailerScreenButton.disabled =
      isTrailerScreenActive || isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    trailerCtaScreenButton.disabled =
      isTrailerCtaScreenActive || isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    trailerModeButton.disabled =
      isTrailerModeActive || isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    trailerCaptureButton.disabled =
      isTrailerModeActive || isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    aiVsAiModeButton.disabled = isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    aiVsAiVsAiModeButton.disabled =
      isReplayMode || isMandatoryLaunchLocked || isTurnTransitionActive;
    aiLevelSelect.disabled = isReplayMode || isTurnTransitionActive;
    aiVsAiButton.disabled = isReplayMode || isMatchEnded;
    aiDiagnosticsButton.disabled = isReplayMode || isMatchEnded;
    copyFunctionalDebugButton.disabled = isReplayMode;
    copyGameStateDumpButton.disabled = isReplayMode;
    copyCameraDebugButton.disabled = currentView !== "cinematic3d";
    executePrompt.hidden = !shouldShowExecutePrompt();
    if (!executePrompt.hidden) {
      renderExecutePrompt(getExecutePromptMode());
    }
    executePrompt.disabled = isManualExecutePromptDisabled();
    syncExecutePromptAttentionState();
  }

  async function executeCurrentTurn(): Promise<void> {
    if (isGameMenuOpen()) {
      return;
    }

    const shouldStartTutorialFirstBurnCameraAssist =
      tutorialState?.phase === "firstBurnQueued" &&
      tutorialState.firstBurnDestinationNodeId === tutorialEnemyFireNodeId &&
      !isManualExecutePromptDisabled();
    const shouldStartTutorialProductiveBurnCameraAssist =
      tutorialState?.phase === "productiveBurnQueued" &&
      tutorialState.productiveBurnOriginNodeId === tutorialEnemyFireNodeId &&
      tutorialState.productiveBurnDestinationNodeId === tutorialFallbackShipyardNodeId &&
      !isManualExecutePromptDisabled();
    const shouldStartTutorialShipyardFirePressure =
      tutorialState?.phase === "shipyardProduction" && !isManualExecutePromptDisabled();
    const shouldAdvanceTutorialSupportShipyardProduction =
      tutorialState?.phase === "shipyardSupportProduction" && !isManualExecutePromptDisabled();
    const shouldAdvanceTutorialSupportShipyardProductionCompletion =
      tutorialState?.phase === "shipyardSupportProductionCompletion" &&
      !isManualExecutePromptDisabled();
    const shouldRecoverTutorialSupportProductionAdvance =
      isTutorialSupportProductionAdvancePrompt() && !isManualExecutePromptDisabled();
    const shouldContinueTutorialShipyardFireQueued =
      tutorialState?.phase === "shipyardFireQueued" &&
      getTutorialQueuedFireOrder() !== undefined &&
      !isManualExecutePromptDisabled();
    const shouldContinueTutorialShipyardEnemyEvadeLesson =
      tutorialState?.phase === "shipyardEnemyEvadeLesson" && !isManualExecutePromptDisabled();
    if (shouldContinueTutorialShipyardEnemyEvadeLesson) {
      prepareTutorialShipyardEnemyReturnBurn();
    }

    const shouldAutoAdvanceTutorialMandatoryLaunch =
      tutorialState?.phase === "mandatoryLaunchQueued" &&
      tutorialState.autoAdvanceActive !== true &&
      !isManualExecutePromptDisabled();
    const shouldAutoAdvanceTutorialShipyardContestedFire =
      tutorialState?.phase === "shipyardContestedFireQueued" &&
      getTutorialQueuedFireOrder() !== undefined &&
      !isManualExecutePromptDisabled();
    const shouldAutoAdvanceTutorialShipyardCounterContest =
      tutorialState?.phase === "shipyardCounterContestBurnQueued" &&
      tutorialState.shipyardCounterContestAutoAdvanceConsumed !== true &&
      !isManualExecutePromptDisabled();
    const shouldContinueTutorialShipyardCounterContestManually =
      tutorialState?.phase === "shipyardCounterContestBurnQueued" &&
      tutorialState.shipyardCounterContestAutoAdvanceConsumed === true &&
      !isManualExecutePromptDisabled();
    const shouldCompleteTutorialShipyardContestedBurn =
      tutorialState?.phase === "shipyardContestedBurnQueued" && !isManualExecutePromptDisabled();
    const shouldContinueTutorialAfterEvadeLesson =
      tutorialState?.phase === "evadeLesson" && !isManualExecutePromptDisabled();

    if (shouldStartTutorialFirstBurnCameraAssist) {
      startTutorialFirstBurnCameraAssist();
    }

    if (shouldStartTutorialProductiveBurnCameraAssist) {
      startTutorialShipyardBurnCameraAssist();
    }

    await resolveCurrentTurn("manual");

    if (shouldStartTutorialShipyardFirePressure && tutorialState?.phase === "shipyardProduction") {
      void startTutorialShipyardFirePressure();
    }

    if (
      shouldAdvanceTutorialSupportShipyardProduction &&
      tutorialState?.phase === "shipyardSupportProduction"
    ) {
      tutorialState.phase = "shipyardSupportProductionCompletion";
      updateInteractionLocks();
      updateCommandConsole();
      void autoAdvanceTutorialSupportShipyardProductionToCompletion();
    }

    if (
      shouldAdvanceTutorialSupportShipyardProductionCompletion &&
      tutorialState?.phase === "shipyardSupportProductionCompletion"
    ) {
      if (state.mandatoryLaunches.some((launch) => launch.factionId === "player")) {
        beginTutorialMandatoryLaunchLesson(tutorialState);
      } else {
        void autoAdvanceTutorialSupportShipyardProductionToCompletion();
      }
    }

    if (
      shouldRecoverTutorialSupportProductionAdvance &&
      tutorialState?.phase === "autoAdvancingToShipyardContestedSupport"
    ) {
      if (state.mandatoryLaunches.some((launch) => launch.factionId === "player")) {
        tutorialState.phase = "shipyardProductionCompletion";
        completeTutorialShipyardProductionLesson();
      } else {
        tutorialState.phase = "shipyardSupportProductionCompletion";
        updateInteractionLocks();
        updateCommandConsole();
        void autoAdvanceTutorialSupportShipyardProductionToCompletion();
      }
    }

    if (shouldContinueTutorialShipyardFireQueued && tutorialState?.phase === "shipyardFireQueued") {
      tutorialState.phase = "autoAdvancingToShipyardEnemyEvade";
      updateInteractionLocks();
      updateCommandConsole();
      void continueTutorialToShipyardEnemyEvadeOrMandatoryLaunch();
    }

    if (
      shouldContinueTutorialShipyardEnemyEvadeLesson &&
      tutorialState?.phase === "shipyardEnemyEvadeLesson"
    ) {
      tutorialState.phase = "autoAdvancingToShipyardContestedBurn";
      updateInteractionLocks();
      updateCommandConsole();
      if (state.mandatoryLaunches.some((launch) => launch.factionId === "player")) {
        beginTutorialMandatoryLaunchLesson(tutorialState);
      } else {
        void continueTutorialShipyardEnemyContestedApproach();
      }
    }

    if (
      shouldAutoAdvanceTutorialMandatoryLaunch &&
      tutorialState?.phase === "mandatoryLaunchQueued" &&
      tutorialState.autoAdvanceActive !== true
    ) {
      void startTutorialPostMandatoryLaunchEvadeSequence();
    }

    if (
      shouldAutoAdvanceTutorialShipyardContestedFire &&
      tutorialState?.phase === "shipyardContestedFireQueued"
    ) {
      tutorialState.phase = "autoAdvancingToShipyardContestedFireImpact";
      updateInteractionLocks();
      updateCommandConsole();
      void continueTutorialShipyardContestedFireToEnemyDestroyed();
    }

    if (
      shouldAutoAdvanceTutorialShipyardCounterContest &&
      tutorialState?.phase === "shipyardCounterContestBurnQueued"
    ) {
      tutorialState.shipyardCounterContestAutoAdvanceConsumed = true;
      tutorialState.phase = "autoAdvancingToShipyardCounterContestArrival";
      updateInteractionLocks();
      updateCommandConsole();
      void continueTutorialShipyardCounterContestArrival();
    }

    if (
      shouldContinueTutorialShipyardCounterContestManually &&
      tutorialState?.phase === "shipyardCounterContestBurnQueued" &&
      finishTutorialShipyardCounterContestArrival(tutorialState)
    ) {
      updateInteractionLocks();
      updateCommandConsole();
    }

    if (
      shouldCompleteTutorialShipyardContestedBurn &&
      tutorialState?.phase === "shipyardContestedBurnQueued"
    ) {
      void continueTutorialAfterShipyardContestedBurn();
    }

    if (shouldContinueTutorialAfterEvadeLesson && tutorialState?.phase === "evadeLesson") {
      continueTutorialAfterEvadeLessonExecute();
    }
  }

  function startTutorialFirstBurnCameraAssist(): void {
    if (!areTutorialCameraMovesEnabled()) {
      return;
    }

    if (currentView !== "cinematic3d" || cinematicRenderer === null) {
      return;
    }

    const targetKey = `node:${tutorialEnemyFireNodeId}`;

    if (!canStartTutorialCameraAssist(targetKey, tutorialFirstTritiumArrivalCameraPose.distance)) {
      return;
    }

    const targetTurn = tutorialState?.firstBurnArrivalTurn ?? undefined;
    const didStartNodeToNodeAssist = cinematicRenderer.startTutorialNodeToNodeBurnCameraAssist({
      originTargetKey: `node:${tutorialOpeningOriginNodeId}`,
      destinationTargetKey: targetKey,
      arrivalPose: tutorialFirstTritiumArrivalCameraPose
    });

    if (didStartNodeToNodeAssist) {
      return;
    }

    cinematicRenderer.startTutorialTargetScreenNudgeCameraAssist({
      targetKey,
      ...(targetTurn === undefined ? {} : { targetTurn }),
      minZoomOutRatio: 0.34,
      marginRatio: 0.2,
      maxScreenPixels: 180,
      durationMs: 1250
    });
  }

  function startTutorialShipyardBurnCameraAssist(): void {
    if (!areTutorialCameraMovesEnabled()) {
      return;
    }

    const tutorial = tutorialState;

    if (currentView !== "cinematic3d" || cinematicRenderer === null || tutorial === null) {
      return;
    }

    if (
      tutorial.productiveBurnOriginNodeId !== tutorialEnemyFireNodeId ||
      tutorial.productiveBurnDestinationNodeId !== tutorialFallbackShipyardNodeId
    ) {
      return;
    }

    const targetKey = `node:${tutorialFallbackShipyardNodeId}`;

    if (!canStartTutorialCameraAssist(targetKey, tutorialShipyardArrivalCameraPose.distance)) {
      return;
    }

    const didStartNodeToNodeAssist = cinematicRenderer.startTutorialNodeToNodeBurnCameraAssist({
      originTargetKey: `node:${tutorial.productiveBurnOriginNodeId}`,
      destinationTargetKey: targetKey,
      arrivalPose: tutorialShipyardArrivalCameraPose
    });

    if (didStartNodeToNodeAssist) {
      return;
    }

    const targetTurn = tutorial.productiveBurnArrivalTurn ?? undefined;
    cinematicRenderer.startTutorialTargetScreenNudgeCameraAssist({
      targetKey,
      ...(targetTurn === undefined ? {} : { targetTurn }),
      minZoomOutRatio: 0.34,
      marginRatio: 0.2,
      maxScreenPixels: 180,
      durationMs: 1250
    });
  }

  async function resolveCurrentTurn(
    source: "manual" | "planning-timeout" | "planning-all-locked"
  ): Promise<void> {
    if (
      (source === "manual" && isManualExecutePromptDisabled()) ||
      isReplayMode ||
      isCommandConsoleResolving
    ) {
      return;
    }

    if (source === "manual" && isMandatoryLaunchLockActive()) {
      syncMandatoryLaunchFocus();
      updateStatus();
      return;
    }

    if (source === "manual") {
      snapCommandTranscriptToLiveTail();
    }

    sfxEngine.play("turn.execute");
    const transcriptStartIndex = matchDebugEvents.length;
    isCommandConsoleResolving = true;
    planningTimerState =
      source === "manual" || planningTimerState.phase === "disabled"
        ? planningTimerState
        : {
            ...planningTimerState,
            phase: "resolving",
            lockedFactionIds: new Set(getPlanningParticipantFactionIds())
          };
    stopPlanningTimerLoop();
    renderPlanningTimerPanel();
    hasConfirmedPlayerOrderAfterSelection = false;
    const frozenSnapshotTranscriptPromise = appendFrozenCommandSnapshot();
    updateInteractionLocks();
    updateCommandConsole();
    await advanceTurn(transcriptStartIndex, {
      ignoreMandatoryLaunchLock: source !== "manual",
      transcriptPrefixPromise: frozenSnapshotTranscriptPromise
    });
  }

  function forceCinematicViewForMandatoryLaunch(): void {
    if (currentView === "cinematic3d") {
      return;
    }

    currentView = "cinematic3d";
    viewSelect.value = "cinematic3d";
    for (const option of viewSelect.options) {
      option.selected = option.value === currentView;
    }
    cinematicFrame.classList.remove("is-hidden");
    tacticalCanvas.classList.add("is-hidden");
    resizeActiveView();
    cinematicRenderer?.setSnapshot(snapshot);
  }

  function syncMandatoryLaunchFocus(): void {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();
    const targetKey = mandatoryLaunch === undefined ? null : `node:${mandatoryLaunch.nodeId}`;

    if (mandatoryLaunch !== undefined) {
      forceCinematicViewForMandatoryLaunch();
    }

    cinematicRenderer?.setSelectionLock(targetKey);

    if (mandatoryLaunch === undefined) {
      lockedMandatoryLaunchId = null;
      mandatoryLaunchGuidanceStartedAt = null;
      return;
    }

    const lockedTargetKey = `node:${mandatoryLaunch.nodeId}`;
    selectedTargetKey = lockedTargetKey;
    syncFocusSelectToTarget(lockedTargetKey);

    if (mandatoryLaunch.id !== lockedMandatoryLaunchId) {
      lockedMandatoryLaunchId = mandatoryLaunch.id;
      mandatoryLaunchGuidanceStartedAt = performance.now();
    } else if (mandatoryLaunchGuidanceStartedAt === null) {
      mandatoryLaunchGuidanceStartedAt = performance.now();
    }
  }

  const resizeObserver = new ResizeObserver(() => {
    resizeActiveView();
    redraw();
  });
  resizeObserver.observe(canvasFrame);

  window.addEventListener("deltav:planning-clock", handleMultiplayerPlanningClockEvent);
  window.addEventListener("deltav:start-tutorial", startTutorialFromGameMenu);
  window.addEventListener("deltav:play-trailer", playTrailerFromGameMenu);
  document.addEventListener("fullscreenchange", syncGameMenuFullscreenAction);

  nextTurnButton.addEventListener("click", () => {
    void executeCurrentTurn();
  });

  debugToggleButton.addEventListener("click", toggleDebugDrawer);

  executePrompt.addEventListener("pointerenter", () => {
    if (!executePrompt.disabled && !executePrompt.hidden) {
      sfxEngine.play("ui.hoverCommand");
    }
  });

  executePrompt.addEventListener("pointerup", (event) => {
    if (event.button !== 0 || executePrompt.disabled || executePrompt.hidden) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    suppressNextExecutePromptClick = true;
    window.setTimeout(() => {
      suppressNextExecutePromptClick = false;
    }, 0);
    void executeCurrentTurn();
  });

  executePrompt.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (suppressNextExecutePromptClick) {
      suppressNextExecutePromptClick = false;
      return;
    }

    void executeCurrentTurn();
  });

  replayButton.addEventListener("click", () => {
    void playReplay();
  });

  onePlayerModeButton.addEventListener("click", () => {
    void startTutorialSegment01();
  });

  twoPlayerModeButton.addEventListener("click", () => {
    resetDebugGameMode("2p");
  });

  threePlayerModeButton.addEventListener("click", () => {
    resetDebugGameMode("3p");
  });

  gameMenuModeButton.addEventListener("click", () => {
    startGameMenuDemo();
  });

  beautyModeButton.addEventListener("click", () => {
    setBeautyModeActive(!isBeautyModeActive);
  });

  trailerScreenButton.addEventListener("click", activateTrailerScreen);
  trailerCtaScreenButton.addEventListener("click", activateTrailerCtaScreen);

  trailerModeButton.addEventListener("click", () => {
    activateTrailerMode();
  });

  trailerCaptureButton.addEventListener("click", () => {
    void activateTrailerCapture();
  });

  aiVsAiModeButton.addEventListener("click", () => {
    startDebugAiAutorunMode("2p");
  });

  aiVsAiVsAiModeButton.addEventListener("click", () => {
    startDebugAiAutorunMode("3p");
  });

  fireVsAiModeButton.addEventListener("click", () => {
    resetDebugFireVsAiMode();
  });

  missileImpactTestButton.addEventListener("click", () => {
    resetDebugMissileImpactTest();
  });

  evadeTestButton.addEventListener("click", () => {
    resetDebugEvadeTest();
  });

  commandInputHintsButton.addEventListener("click", () => {
    commandInputHintsMode = commandInputHintsMode === "on" ? "off" : "on";
    updateCommandConsoleModeControls();
  });

  planningTimerButton.addEventListener("click", () => {
    planningTimerDurationOverrideMs = null;
    planningTimerMode = getNextPlanningTimerMode();
    hasConsumedZeroTimerInitialCountdown = planningTimerMode !== "zero";
    clearZeroTimerAutoRestart();
    restartPlanningTimerForCurrentTurn();
    updateStatus();
  });

  beatSyncButton.addEventListener("click", () => {
    beatSyncMode = beatSyncMode === "on" ? "off" : "on";
    clearExecuteQuestionBeatPulse();
    clearExecutePromptAttentionPulse();
    appendDebugPanelMessage(`BEAT SYNC ${beatSyncMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    updateDebugPanel();
    redraw();
  });

  performanceDiagnosticsButton.addEventListener("click", () => {
    performanceDiagnosticsMode = performanceDiagnosticsMode === "on" ? "off" : "on";
    lastCinematicPerformanceStats = null;
    syncPerformanceDiagnosticsCountersEnabled();
    appendDebugPanelMessage(`PERF DIAGNOSTICS ${performanceDiagnosticsMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    updateDebugPanel();
  });

  burnPreviewEffectsButton.addEventListener("click", () => {
    burnPreviewEffectsMode = burnPreviewEffectsMode === "on" ? "off" : "on";
    cinematicRenderer?.setBurnPreviewEffectsEnabled(burnPreviewEffectsMode === "on");
    appendDebugPanelMessage(`BURN PREVIEW FX ${burnPreviewEffectsMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  firePreviewEffectsButton.addEventListener("click", () => {
    firePreviewEffectsMode = firePreviewEffectsMode === "on" ? "off" : "on";
    cinematicRenderer?.setFirePreviewEffectsEnabled(firePreviewEffectsMode === "on");
    appendDebugPanelMessage(`FIRE PREVIEW FX ${firePreviewEffectsMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  solarHazeButton.addEventListener("click", () => {
    solarHazeMode = solarHazeMode === "on" ? "off" : "on";
    cinematicRenderer?.setSolarHazeEnabled(solarHazeMode === "on");
    appendDebugPanelMessage(`SOLAR HAZE ${solarHazeMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  solarOcclusionButton.addEventListener("click", () => {
    solarOcclusionMode = solarOcclusionMode === "on" ? "off" : "on";
    cinematicRenderer?.setSolarOcclusionEnabled(solarOcclusionMode === "on");
    appendDebugPanelMessage(`SOLAR OCCLUSION ${solarOcclusionMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  atmosphericScatteringButton.addEventListener("click", () => {
    atmosphericScatteringMode = atmosphericScatteringMode === "on" ? "off" : "on";
    cinematicRenderer?.setAtmosphericScatteringEnabled(atmosphericScatteringMode === "on");
    appendDebugPanelMessage(`ATMOSPHERIC SCATTERING ${atmosphericScatteringMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  compactSunBloomButton.addEventListener("click", () => {
    compactSunBloomMode = compactSunBloomMode === "on" ? "off" : "on";
    cinematicRenderer?.setCompactSunBloomEnabled(compactSunBloomMode === "on");
    appendDebugPanelMessage(`SUN BLOOM PASS ${compactSunBloomMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  uiBloomButton.addEventListener("click", () => {
    uiBloomMode = uiBloomMode === "on" ? "off" : "on";
    cinematicRenderer?.setBloomEnabled(uiBloomMode === "on");
    cinematicRenderer?.setUiBloomEnabled(uiBloomMode === "on");
    appendDebugPanelMessage(`BLOOM ${uiBloomMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  lowBloomProfileButton.addEventListener("click", () => {
    lowBloomProfileMode = lowBloomProfileMode === "on" ? "off" : "on";
    cinematicRenderer?.setLowBloomProfileEnabled(lowBloomProfileMode === "on");
    appendDebugPanelMessage(`BLOOM PROFILE ${lowBloomProfileMode === "on" ? "LOW" : "HIGH"}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  heatDistortionButton.addEventListener("click", () => {
    heatDistortionMode = heatDistortionMode === "on" ? "off" : "on";
    cinematicRenderer?.setHeatDistortionEnabled(heatDistortionMode === "on");
    appendDebugPanelMessage(`HEAT DISTORTION ${heatDistortionMode.toUpperCase()}`);
    updateCommandConsoleModeControls();
    redraw();
  });

  aiLevelSelect.addEventListener("change", () => {
    const selectedLevel = Number(aiLevelSelect.value);
    setDebugAiLevel(
      selectedLevel === 0 || selectedLevel === 1 || selectedLevel === 2 ? selectedLevel : 3
    );
    updateStatus();
  });

  tutorialOverlayTextButton.addEventListener("click", () => {
    tutorialOverlayTextMode = tutorialOverlayTextMode === "on" ? "off" : "on";
    tutorialOverlayStartedAt = performance.now();
    updateStatus();
  });

  tutorialOverlayBlinkButton.addEventListener("click", () => {
    tutorialOverlayBlinkMode = tutorialOverlayBlinkMode === "on" ? "off" : "on";
    tutorialOverlayStartedAt = performance.now();
    lastPlayerNodeSelectionAt = null;
    updateStatus();
  });

  function handleCommandTranscriptHover(event: Event): void {
    if (
      isTutorialCommandLogLocked() ||
      isTutorialFirstEnemyKillReplayCueActive() ||
      !isCommandLogTemporalReviewEnabled()
    ) {
      return;
    }

    const line = getCommandScrollbackLine(event.target);
    setCommandScrollbackHover(line);
    if (line === null) {
      restoreCommandLogCueCameraPreview();
    } else {
      scheduleCommandLogCueCameraPreview(line);
    }
  }

  function handleCommandTranscriptLeave(): void {
    if (
      isTutorialCommandLogLocked() ||
      isTutorialFirstEnemyKillReplayCueActive() ||
      !isCommandLogTemporalReviewEnabled()
    ) {
      return;
    }

    setCommandScrollbackHover(null);
    restoreCommandLogCueCameraPreview();
  }

  function handleCommandTranscriptPointerDown(event: PointerEvent): void {
    if (isTutorialCommandLogLocked()) {
      clearCommandLogScrubState();
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (isTutorialFirstEnemyKillReplayCueActive()) {
      clearCommandLogScrubState();
      return;
    }

    if (
      event.button !== 0 ||
      !isCommandLogTemporalReviewEnabled() ||
      (event.target instanceof Element && event.target.closest(".command-console__execute"))
    ) {
      return;
    }

    const line = getCommandScrollbackLineFromPointer(event);

    if (line === null) {
      return;
    }

    clearCommandLogScrubState();
    const captureElement =
      event.currentTarget instanceof HTMLElement ? event.currentTarget : commandTranscript;
    line.classList.add("is-command-scrub-primed");
    commandLogScrubState = {
      pointerId: event.pointerId,
      captureElement,
      startY: event.clientY,
      lastY: event.clientY,
      isArmed: false,
      hasScrubbed: false,
      startPosition: commandLogTimeReviewState?.currentPosition ?? replayTape.transitions.length,
      startedReviewFromLive: false,
      didChangePosition: false,
      longPressTimer: window.setTimeout(() => {
        armCommandLogScrub(event.pointerId);
      }, commandLogScrubLongPressMs),
      line
    };

    captureElement.setPointerCapture(event.pointerId);
    event.stopPropagation();
  }

  function handleCommandTranscriptPointerMove(event: PointerEvent): void {
    const scrubState = commandLogScrubState;

    if (scrubState === null || scrubState.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    scrubState.lastY = event.clientY;

    if (!scrubState.isArmed) {
      return;
    }

    updateCommandLogScrubPosition(scrubState, event.clientY);
    event.preventDefault();
  }

  function armCommandLogScrub(pointerId: number): void {
    const scrubState = commandLogScrubState;

    if (
      scrubState === null ||
      scrubState.pointerId !== pointerId ||
      scrubState.isArmed ||
      isTutorialCommandLogLocked() ||
      isTutorialFirstEnemyKillReplayCueActive() ||
      !isCommandLogTemporalReviewEnabled()
    ) {
      return;
    }

    if (scrubState.longPressTimer !== null) {
      window.clearTimeout(scrubState.longPressTimer);
      scrubState.longPressTimer = null;
    }

    const startedReviewFromLive = commandLogTimeReviewState === null;
    const reviewState = ensureCommandLogTimeReviewState();

    if (reviewState === null) {
      return;
    }

    cancelCommandLogTimeReviewAnimation();
    scrubState.isArmed = true;
    scrubState.startY = scrubState.lastY;
    scrubState.startPosition = reviewState.currentPosition;
    scrubState.startedReviewFromLive = startedReviewFromLive;
    reviewState.activeCommandRowKey = null;
    reviewState.focusTargetKeys = [];
    reviewState.followTrackedFocus = false;
    reviewState.staticFocusTargetSignature = null;
    replayIndicator.textContent = "SCRUB";
    replayIndicator.classList.remove("is-hidden");
    setCommandScrollbackPlayingEvent(
      getCommandLogEventIdNearReviewPosition(reviewState.currentPosition)
    );
  }

  function updateCommandLogScrubPosition(
    scrubState: CommandLogScrubState,
    pointerClientY: number
  ): void {
    const reviewState = commandLogTimeReviewState;

    if (reviewState === null) {
      return;
    }

    const deltaY = pointerClientY - scrubState.startY;

    if (!scrubState.hasScrubbed) {
      if (Math.abs(deltaY) < commandLogScrubMoveThresholdPixels) {
        return;
      }

      scrubState.hasScrubbed = true;
    }

    const targetPosition = clampCommandLogReviewPosition(
      scrubState.startPosition + deltaY / commandLogScrubPixelsPerTurn
    );

    if (Math.abs(targetPosition - reviewState.currentPosition) <= 0.0001) {
      return;
    }

    scrubState.didChangePosition = true;
    const eventId = getCommandLogEventIdNearReviewPosition(targetPosition);
    setCommandScrollbackPlayingEvent(eventId);
    setCommandLogReviewPosition(targetPosition, eventId);
  }

  function handleCommandTranscriptPointerUp(event: PointerEvent): void {
    const scrubState = commandLogScrubState;

    if (scrubState === null || scrubState.pointerId !== event.pointerId) {
      return;
    }

    event.stopPropagation();
    if (scrubState.captureElement.hasPointerCapture(event.pointerId)) {
      scrubState.captureElement.releasePointerCapture(event.pointerId);
    }

    clearCommandLogScrubState();

    if (scrubState.startedReviewFromLive && scrubState.isArmed && !scrubState.didChangePosition) {
      restoreCommandLogTimeReviewToLive({ preserveCurrentCamera: true });
    }

    if (scrubState.isArmed || scrubState.hasScrubbed) {
      shouldSuppressNextCommandLogClick = true;
      window.setTimeout(() => {
        shouldSuppressNextCommandLogClick = false;
      }, 0);
    }
  }

  function clearCommandLogScrubState(): void {
    const scrubState = commandLogScrubState;

    if (scrubState === null) {
      return;
    }

    if (scrubState.longPressTimer !== null) {
      window.clearTimeout(scrubState.longPressTimer);
    }

    scrubState.line?.classList.remove("is-command-scrub-primed");
    commandLogScrubState = null;
  }

  function handleGlobalTimeReviewPointerDown(event: PointerEvent): void {
    if (tutorialState !== null) {
      return;
    }

    if (
      commandLogTimeReviewState === null ||
      event.button !== 2 ||
      !isCommandLogInteractionTarget(event.target)
    ) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    skipCommandLogTimeReviewToLive();
  }

  function isCommandLogInteractionTarget(target: EventTarget | null): boolean {
    return (
      target instanceof Node &&
      getCommandLogInteractiveContainers().some((container) => container.contains(target))
    );
  }

  function handleCommandLogContextMenu(event: MouseEvent): void {
    if (tutorialState !== null || !isCommandLogInteractionTarget(event.target)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (commandLogTimeReviewState !== null) {
      skipCommandLogTimeReviewToLive();
    }
  }

  function playCommandLogReviewToLiveFromLine(line: HTMLElement | null): void {
    const preserveCurrentCameraAndFocus = isCommandLogTurnHeaderLine(line);
    const focusTargetKeys = preserveCurrentCameraAndFocus
      ? []
      : getCommandScrollbackLineReviewFocusTargetKeys(line);

    void animateCommandLogTimeReviewToPosition(
      replayTape.transitions.length,
      null,
      focusTargetKeys,
      getCommandScrollbackLineReviewKey(line),
      { preserveCurrentCameraAndFocus }
    );
  }

  function handleCommandLiveClick(event: MouseEvent): void {
    if (tutorialState !== null) {
      if (isTutorialCommandLogLocked()) {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    const line = getCommandScrollbackLine(event.target);
    const targetKeys = getCommandScrollbackLineFocusTargetKeys(line);

    if (targetKeys.length > 0) {
      event.preventDefault();
      focusCommandScrollbackLineTarget(line);
      return;
    }

    if (commandLogTimeReviewState === null) {
      return;
    }

    if (event.target instanceof Element && event.target.closest(".command-console__execute")) {
      return;
    }

    event.preventDefault();
    playCommandLogReviewToLiveFromLine(line);
  }

  function handleCommandLogClick(event: MouseEvent): void {
    if (isTutorialCommandLogLocked()) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    if (!isCommandLogTemporalReviewEnabled()) {
      return;
    }

    if (shouldSuppressNextCommandLogClick) {
      shouldSuppressNextCommandLogClick = false;
      return;
    }

    const line = getCommandScrollbackLineFromPointer(event);
    commandGlossaryController.closeAll();

    if (handleTutorialFirstEnemyKillReplayCueInput(line)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const targetId = getCommandScrollbackLineTargetId(line);
    const commandRowKey = getCommandScrollbackLineReviewKey(line);
    const preserveCurrentCameraAndFocus = isCommandLogTurnHeaderLine(line);

    if (targetId === null) {
      if (line?.dataset["kind"] === "live") {
        if (commandLogTimeReviewState !== null) {
          event.preventDefault();
          event.stopPropagation();
          playCommandLogReviewToLiveFromLine(line);
          return;
        }

        const targetKeys = getCommandScrollbackLineFocusTargetKeys(line);
        if (targetKeys.length > 0) {
          event.preventDefault();
          event.stopPropagation();
          focusCommandScrollbackLineTarget(line);
        }
      }
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    playReplayFromCommandRow(
      targetId,
      preserveCurrentCameraAndFocus ? [] : getCommandScrollbackLineReviewFocusTargetKeys(line),
      commandRowKey,
      { preserveCurrentCameraAndFocus }
    );
  }

  function handleCommandLogKeydown(event: KeyboardEvent): void {
    if (isTutorialCommandLogLocked()) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        event.stopPropagation();
      }
      return;
    }

    if (!isCommandLogTemporalReviewEnabled()) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    const line = getCommandScrollbackLine(event.target);
    commandGlossaryController.closeAll();

    if (handleTutorialFirstEnemyKillReplayCueInput(line)) {
      event.preventDefault();
      return;
    }

    const targetId = getCommandScrollbackLineTargetId(line);
    const commandRowKey = getCommandScrollbackLineReviewKey(line);
    const preserveCurrentCameraAndFocus = isCommandLogTurnHeaderLine(line);

    if (targetId === null) {
      if (line?.dataset["kind"] === "live" && commandLogTimeReviewState !== null) {
        event.preventDefault();
        playCommandLogReviewToLiveFromLine(line);
        return;
      }

      return;
    }

    event.preventDefault();
    playReplayFromCommandRow(
      targetId,
      preserveCurrentCameraAndFocus ? [] : getCommandScrollbackLineReviewFocusTargetKeys(line),
      commandRowKey,
      { preserveCurrentCameraAndFocus }
    );
  }

  function handleTutorialFirstEnemyKillReplayCueInput(line: HTMLElement | null): boolean {
    const cue = getTutorialFirstEnemyKillReplayCue();

    if (cue === null) {
      return false;
    }

    if (line?.dataset["eventId"] !== cue.eventId) {
      return true;
    }

    void playTutorialFirstEnemyKillReplayCue(line);
    return true;
  }

  async function playTutorialFirstEnemyKillReplayCue(line: HTMLElement | null): Promise<void> {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "firstEnemyKillReplayCue" ||
      isCommandLogTimeReviewAnimating ||
      isTutorialFirstEnemyKillReplayCueInputPending
    ) {
      return;
    }

    isTutorialFirstEnemyKillReplayCueInputPending = true;

    try {
      if (commandLogTimeReviewState !== null) {
        await playCommandLogReviewForwardToPosition(replayTape.transitions.length, null, [], null, {
          preserveCurrentFocus: true
        });
        freezeTutorialFirstEnemyKillReplayHint("return");
        await completeTutorialFirstEnemyKillReplayCue();
        scrollCommandTranscriptToEnd();
        return;
      }

      if (!tutorial.firstEnemyKillReplayLineSelected) {
        tutorial.firstEnemyKillReplayLineSelected = true;
        focusCommandScrollbackLineTarget(line);
        syncTutorialFirstEnemyKillReplayCueLine();
        return;
      }

      const targetId = getCommandScrollbackLineTargetId(line);

      if (targetId === null || getReplayPositionForCommandScrollbackTarget(targetId) === null) {
        return;
      }

      const commandRowKey = getCommandScrollbackLineReviewKey(line);
      const focusTargetKeys = focusCommandScrollbackLineTarget(line);

      await rewindCommandLogToEvent(targetId, focusTargetKeys, commandRowKey);
      if (commandLogTimeReviewState !== null) {
        tutorial.firstEnemyKillReplayLineSelected = false;
        freezeTutorialFirstEnemyKillReplayHint("rewind");
        showTutorialFirstEnemyKillReplayReturnHint(tutorial);
      }
      syncTutorialFirstEnemyKillReplayCueLine();
    } finally {
      isTutorialFirstEnemyKillReplayCueInputPending = false;
    }
  }

  function waitForCommandLogReplayFocusBeforePlayback(): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(resolve, commandLogReplayFocusBeforePlaybackMs);
    });
  }

  function showTutorialFirstEnemyKillReplayRewindHint(tutorial: TutorialRuntimeState): void {
    const key = "tutorial:first-enemy-kill-replay-rewind-hint";

    if (tutorial.loggedKeys.has(key)) {
      return;
    }

    tutorial.loggedKeys.add(key);
    pushLiveTutorialTimelineRows(
      [
        {
          parts: [
            {
              text: "Left-click the blinking log line once to select it, then left-click it again to rewind to that event."
            }
          ],
          className: tutorialLiveHintClassName,
          key: `${key}:rewind`
        }
      ],
      key
    );
    updateCommandConsole();
  }

  function showTutorialFirstEnemyKillReplayReturnHint(tutorial: TutorialRuntimeState): void {
    const key = "tutorial:first-enemy-kill-replay-return-hint";

    if (tutorial.loggedKeys.has(key)) {
      return;
    }

    tutorial.loggedKeys.add(key);
    pushLiveTutorialTimelineRows(
      [
        createTutorialSpacerRow(`${key}:spacer`),
        {
          parts: [{ text: "Left-click the selected log line again to return to the present." }],
          className: tutorialLiveHintClassName,
          key: `${key}:return`
        }
      ],
      key
    );
    updateCommandConsole();
  }

  function freezeTutorialFirstEnemyKillReplayHint(kind: "rewind" | "return"): void {
    const hintRowKey =
      kind === "rewind"
        ? "tutorial:first-enemy-kill-replay-rewind-hint:rewind"
        : "tutorial:first-enemy-kill-replay-return-hint:return";
    let didFreezeHint = false;

    for (const [rowIndex, row] of liveTutorialTimelineRows.entries()) {
      if (row.key !== hintRowKey) {
        continue;
      }

      const frozenRow = freezeTutorialLiveHintRow(row);

      if (frozenRow === row) {
        continue;
      }

      liveTutorialTimelineRows[rowIndex] = frozenRow;
      didFreezeHint = true;
    }

    if (didFreezeHint) {
      updateCommandConsole();
    }
  }

  function handleCommandLiveRowsWheel(event: WheelEvent): void {
    if (!commandTranscript.isConnected) {
      return;
    }

    const computedLineHeight = Number.parseFloat(getComputedStyle(commandTranscript).lineHeight);
    const lineHeightPixels = Number.isFinite(computedLineHeight) ? computedLineHeight : 18;
    const deltaPixels = normalizeCommandLogWheelDelta(
      event.deltaY,
      event.deltaMode,
      lineHeightPixels,
      commandTranscript.clientHeight
    );
    commandTranscript.scrollTop = clampNumber(
      commandTranscript.scrollTop + deltaPixels,
      0,
      getCommandTranscriptScrollEnd()
    );
    commandTranscriptFollowsTail = isCommandTranscriptAtEnd();
    event.preventDefault();
    event.stopPropagation();
  }

  commandTranscript.addEventListener("pointerover", handleCommandTranscriptHover);
  commandTranscript.addEventListener("mouseover", handleCommandTranscriptHover);
  commandLiveRows.addEventListener("pointerover", handleCommandTranscriptHover);
  commandLiveRows.addEventListener("mouseover", handleCommandTranscriptHover);

  commandTranscript.addEventListener("pointerleave", handleCommandTranscriptLeave);
  commandTranscript.addEventListener("mouseleave", handleCommandTranscriptLeave);
  commandLiveRows.addEventListener("pointerleave", handleCommandTranscriptLeave);
  commandLiveRows.addEventListener("mouseleave", handleCommandTranscriptLeave);
  commandTranscript.addEventListener("pointerdown", handleCommandTranscriptPointerDown);
  commandTranscript.addEventListener("pointermove", handleCommandTranscriptPointerMove);
  commandTranscript.addEventListener("pointerup", handleCommandTranscriptPointerUp);
  commandTranscript.addEventListener("pointercancel", handleCommandTranscriptPointerUp);
  commandLiveRows.addEventListener("pointerdown", handleCommandTranscriptPointerDown);
  commandLiveRows.addEventListener("pointermove", handleCommandTranscriptPointerMove);
  commandLiveRows.addEventListener("pointerup", handleCommandTranscriptPointerUp);
  commandLiveRows.addEventListener("pointercancel", handleCommandTranscriptPointerUp);
  commandTranscript.addEventListener("wheel", handleCommandLiveRowsWheel, { passive: false });
  commandLive.addEventListener("wheel", handleCommandLiveRowsWheel, { passive: false });
  commandLive.addEventListener("click", handleCommandLiveClick);
  commandTranscript.addEventListener("click", handleCommandLogClick);
  commandLiveRows.addEventListener("click", handleCommandLogClick);
  commandTranscript.addEventListener("keydown", handleCommandLogKeydown);
  commandLiveRows.addEventListener("keydown", handleCommandLogKeydown);
  window.addEventListener("pointerdown", handleGlobalTimeReviewPointerDown, true);
  window.addEventListener("contextmenu", handleCommandLogContextMenu);

  aiVsAiButton.addEventListener("click", () => {
    if (isReplayMode) {
      return;
    }

    const result = isFireVsAiDebugMode()
      ? runFireVsAiDebugSimulation(content, state, 40, getEffectiveDebugAiPlanningOptions())
      : runAiVsAiDebugSimulation(content, state, 40, getEffectiveDebugAiPlanningOptions());
    aiReport.value = result.report;
    aiReport.classList.remove("is-hidden");
    copyAiReportButton.disabled = false;

    if (result.errors.length > 0) {
      console.error("AI vs AI debug simulation validation failed.", result.errors);
    }
  });

  aiDiagnosticsButton.addEventListener("click", () => {
    if (isReplayMode) {
      return;
    }

    const result = runAIVsAIDiagnostics40T(
      content,
      createInitialStateForPreset(selectedMapPreset, proceduralSeed, proceduralGenerationBySeed),
      40,
      getEffectiveDebugAiPlanningOptions()
    );
    aiReport.value = result.report;
    aiReport.classList.remove("is-hidden");
    copyAiReportButton.disabled = false;

    if (result.errors.length > 0) {
      console.error("AI vs AI diagnostics validation failed.", result.errors);
    }
  });

  copyAiReportButton.addEventListener("click", () => {
    void copyTextToClipboard(aiReport.value);
  });

  copyFunctionalDebugButton.addEventListener("click", () => {
    void copyTextToClipboard(buildFunctionalDebugLog());
  });

  copyGameStateDumpButton.addEventListener("click", copyDiagnosticGameStateDump);

  copyCameraDebugButton.addEventListener("click", copyCameraDebugSnapshot);

  recordButton.addEventListener("click", () => {
    void toggleDebugRecording();
  });

  musicButton.addEventListener("click", () => {
    void toggleMusic();
  });

  sfxButton.addEventListener("click", () => {
    const settings = sfxEngine.currentSettings;

    if (settings.enabled && !settings.muted && !sfxEngine.isUnlocked) {
      void sfxEngine.unlock().then((unlocked) => {
        if (unlocked) {
          sfxEngine.play("ui.toggle");
        }

        updateSfxButton();
      });
      return;
    }

    void sfxEngine.unlock().finally(() => {
      cycleSfxMode();
    });
  });

  fitButton.addEventListener("click", () => {
    if (isReplayMode) {
      return;
    }

    fitSystem();
    redraw();
  });

  viewSelect.addEventListener("change", () => {
    if (isReplayMode) {
      viewSelect.value = currentView;
      return;
    }

    setPresentationView(viewSelect.value as PresentationView);
  });

  shipModelSelect.addEventListener("change", () => {
    const nextShipModelVariant = shipModelSelect.value;
    selectedShipModelVariant =
      nextShipModelVariant === "legacy" ||
      nextShipModelVariant === "hex-modular" ||
      nextShipModelVariant === "ring-hex"
        ? nextShipModelVariant
        : "double-cylinder";
    cinematicRenderer?.setShipModelVariant(selectedShipModelVariant);
    redraw();
  });

  mapSelect.addEventListener("change", () => {
    if (isReplayMode) {
      mapSelect.value = selectedMapPreset.id;
      return;
    }

    void setMapPreset(mapSelect.value as MapPresetId);
  });

  proceduralSeedInput.addEventListener("change", () => {
    if (isReplayMode || selectedMapPreset.procedural !== true) {
      proceduralSeedInput.value = proceduralSeed;
      return;
    }

    proceduralSeed = normalizeProceduralSeedForUi(proceduralSeedInput.value);
    proceduralSeedInput.value = proceduralSeed;
    void setMapPreset(selectedMapPreset.id, { forceReload: true });
  });

  proceduralSeedButton.addEventListener("click", () => {
    if (isReplayMode || selectedMapPreset.procedural !== true) {
      return;
    }

    proceduralSeed = createProceduralMapSeed();
    proceduralSeedInput.value = proceduralSeed;
    void setMapPreset(selectedMapPreset.id, { forceReload: true });
  });

  focusSelect.addEventListener("change", () => {
    if (isReplayMode) {
      syncFocusSelectToTarget(selectedTargetKey);
      return;
    }

    focusTarget(focusSelect.value);
  });

  async function setMapPreset(
    mapPresetId: MapPresetId,
    options: Readonly<{ forceReload?: boolean }> = {}
  ): Promise<void> {
    if (isReplayMode) {
      mapSelect.value = selectedMapPreset.id;
      return;
    }

    if (mapPresetId === selectedMapPreset.id && options.forceReload !== true) {
      return;
    }

    if (isMandatoryLaunchLockActive() || isTurnTransitionActive) {
      mapSelect.value = selectedMapPreset.id;
      updateStatus();
      return;
    }

    const previousMapPreset = selectedMapPreset;
    const currentGameMode = state.gameMode;
    status.textContent = "Loading map preset";

    try {
      const nextMapPreset = getMapPreset(mapPresetId);

      if (nextMapPreset.procedural === true && options.forceReload === true) {
        const nextCacheKey = getPresetCacheKey(nextMapPreset, proceduralSeed);
        contentByPresetKey.delete(nextCacheKey);
        proceduralGenerationBySeed.delete(
          getProceduralGenerationCacheKeyForPreset(nextMapPreset, proceduralSeed)
        );
      }

      const nextContent = await loadMapPresetContent(
        nextMapPreset,
        contentByPresetKey,
        proceduralSeed,
        proceduralGenerationBySeed
      );
      selectedMapPreset = nextMapPreset;
      content = nextContent;
      currentAutomaticProceduralMapAudit = null;
      currentProceduralDebug = getProceduralDebugForPreset(
        nextMapPreset,
        proceduralSeed,
        proceduralGenerationBySeed
      );
      debugAiStrategyProfiles = {};
      state = appendStartStateAudit(createInitialStateForGameMode(currentGameMode));
      snapshot = createSolarSystemSnapshot(content, state);
      captureCurrentMapIdentity();
    } catch (error) {
      mapSelect.value = previousMapPreset.id;
      status.textContent = error instanceof Error ? error.message : "Map preset failed to load.";
      return;
    }

    resetRuntimeAfterGameReset();
  }

  function resetDebugGameMode(mode: GameModeId): void {
    if (isReplayMode || isMandatoryLaunchLockActive() || isTurnTransitionActive) {
      updateStatus();
      return;
    }
    hideDebugUiAndMainMenuForMatchStart();

    debugAiStrategyProfiles = {};
    currentProceduralDebug = getProceduralDebugForPreset(
      selectedMapPreset,
      proceduralSeed,
      proceduralGenerationBySeed
    );
    state = appendStartStateAudit(createInitialStateForGameMode(mode));
    snapshot = createSolarSystemSnapshot(content, state);
    captureCurrentMapIdentity();
    resetRuntimeAfterGameReset();
    revealCommandConsoleForActiveGame();
  }

  function resetDebugAiMode(mode: MultiFactionGameModeId): void {
    if (isReplayMode || isTurnTransitionActive) {
      updateStatus();
      return;
    }
    hideDebugUiAndMainMenuForMatchStart();

    debugAiStrategyProfiles = {};
    currentProceduralDebug = getProceduralDebugForPreset(
      selectedMapPreset,
      proceduralSeed,
      proceduralGenerationBySeed
    );
    const nextState = createInitialAiStateForGameMode(mode);
    state = appendStartStateAudit(nextState, {
      controllerOverrides: createControllerAuditOverrides(nextState)
    });
    snapshot = createSolarSystemSnapshot(content, state);
    captureCurrentMapIdentity();
    resetRuntimeAfterGameReset();
    revealCommandConsoleForActiveGame();
  }

  function startDebugAiAutorunMode(mode: MultiFactionGameModeId): void {
    if (isReplayMode) {
      updateStatus();
      return;
    }

    const startWhenCurrentTurnSettles = async (): Promise<void> => {
      if (isTurnTransitionActive || isCommandConsoleResolving) {
        window.setTimeout(() => {
          void startWhenCurrentTurnSettles();
        }, 40);
        return;
      }

      hideDebugUiAndMainMenuForMatchStart();

      planningTimerMode = "zero";
      planningTimerDurationOverrideMs = null;
      hasConsumedZeroTimerInitialCountdown = true;
      clearZeroTimerAutoRestart();

      if (selectedMapPreset.procedural === true) {
        await resetAiBatchWithAutomaticProceduralMap(mode);
      } else {
        resetDebugAiMode(mode);
      }
    };

    void startWhenCurrentTurnSettles();
  }

  function resetDebugFireVsAiMode(): void {
    if (isReplayMode || isMandatoryLaunchLockActive() || isTurnTransitionActive) {
      updateStatus();
      return;
    }
    hideDebugUiAndMainMenuForMatchStart();

    debugAiStrategyProfiles = {
      player: "FIRE",
      opponent: "NOFIRE"
    };
    currentProceduralDebug = getProceduralDebugForPreset(
      selectedMapPreset,
      proceduralSeed,
      proceduralGenerationBySeed
    );
    const nextState = createInitialFireVsAiState();
    state = appendStartStateAudit(nextState, {
      controllerOverrides: createControllerAuditOverrides(nextState)
    });
    snapshot = createSolarSystemSnapshot(content, state);
    captureCurrentMapIdentity();
    resetRuntimeAfterGameReset();
  }

  function resetDebugMissileImpactTest(): void {
    if (isReplayMode || isMandatoryLaunchLockActive() || isTurnTransitionActive) {
      updateStatus();
      return;
    }
    hideDebugUiAndMainMenuForMatchStart();

    let scenario;

    try {
      scenario = createMissileImpactTMinusOneDebugScenario(content);
    } catch (error) {
      status.textContent =
        error instanceof Error ? error.message : "Missile impact debug scenario failed.";
      return;
    }

    currentProceduralDebug = null;
    debugAiStrategyProfiles = {};
    state = scenario.state;
    snapshot = createSolarSystemSnapshot(content, state);
    resetRuntimeAfterGameReset();
    const impactMissile = snapshot.activeMissiles.find((missile) => {
      return (
        missile.targetNodeId === scenario.targetNodeId && missile.impactTurn === snapshot.turn + 1
      );
    });
    if (impactMissile === undefined) {
      focusTargetWithoutZoom(`node:${scenario.targetNodeId}`);
    } else {
      const missileTargetKey = `missile:${impactMissile.id}`;
      selectedTargetKey = missileTargetKey;
      cinematicRenderer?.selectTarget(missileTargetKey);
      cinematicRenderer?.focusTargetWithoutZoom(missileTargetKey);
    }
  }

  function resetDebugEvadeTest(): void {
    if (isReplayMode || isMandatoryLaunchLockActive() || isTurnTransitionActive) {
      updateStatus();
      return;
    }
    hideDebugUiAndMainMenuForMatchStart();

    let scenario;

    try {
      scenario = createEvadeTMinusOneDebugScenario(content);
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "Evade debug scenario failed.";
      return;
    }

    currentProceduralDebug = null;
    debugAiStrategyProfiles = {};
    state = scenario.state;
    snapshot = createSolarSystemSnapshot(content, state);
    resetRuntimeAfterGameReset();
    focusTargetWithoutZoom(`node:${scenario.targetNodeId}`);
  }

  async function startTutorialSegment01(): Promise<void> {
    if (isReplayMode || isMandatoryLaunchLockActive() || isTurnTransitionActive) {
      updateStatus();
      return;
    }
    hideDebugUiAndMainMenuForMatchStart();

    const tutorialPreset = selectedMapPreset;
    status.textContent = "Loading tutorial";

    try {
      content = applyTutorialContentOverrides(
        await loadMapPresetContent(
          tutorialPreset,
          contentByPresetKey,
          proceduralSeed,
          proceduralGenerationBySeed
        )
      );
      currentProceduralDebug = getProceduralDebugForPreset(
        tutorialPreset,
        proceduralSeed,
        proceduralGenerationBySeed
      );
      clearTutorialTimers();
      debugAiStrategyProfiles = {};
      tutorialEnemySimpleAiEnabled = false;
      clearZeroTimerAutoRestart();
      planningTimerMode = "auto";
      planningTimerDurationOverrideMs = null;
      hasConsumedZeroTimerInitialCountdown = false;
      commandInputHintsMode = "on";
      hasMovedTutorialOpeningCamera = false;
      tutorialCameraAssistAnchor = null;
      tutorialState = createTutorialRuntimeState({
        startedAt: performance.now(),
        shipyardLessonNodeId: tutorialFallbackShipyardNodeId
      });
      state = createTutorialSegment01InitialState();
      snapshot = createSolarSystemSnapshot(content, state);
      resetRuntimeAfterGameReset({ preserveTutorial: true });
      updateCommandConsoleModeControls();
      commandGlossaryController.beginTutorialLogbookIntroduction();
      revealCommandConsoleForActiveGame();
      frameTutorialOpeningCamera();
      lastTutorialCameraHintAt = null;
      lastTutorialCameraHintTurn = null;
      lastTutorialPlayerActivityAt = performance.now();
      scheduleTutorialCameraPanOrbitHint();
    } catch (error) {
      tutorialState = null;
      commandGlossaryController.endTutorialLogbookIntroduction();
      hideCommandConsoleForGameMenuLaunch();
      commandConsole.classList.remove("is-hidden");
      status.textContent = error instanceof Error ? error.message : "Tutorial failed to load.";
    }
  }

  function createTutorialSegment01InitialState(): GameState {
    const playerFaction = normalizeTutorialPlayerFaction({
      id: "player",
      displayName: "PLAYER",
      color: factionColorPalette[0].color,
      accent: factionColorPalette[0].accent,
      controlType: "human" as const
    });

    return createInitialGameState({
      gameMode: "1p",
      factions: [playerFaction],
      factionDv: {
        ...createFactionDvForIdentities([playerFaction]),
        player: 50
      },
      nodeOccupancies: [
        {
          nodeId: tutorialOpeningOriginNodeId,
          factionId: "player",
          shipCount: 1
        }
      ],
      shipyardProgress: [],
      debugEvents: []
    });
  }

  function applyTutorialContentOverrides(baseContent: SolarSystemData): SolarSystemData {
    return {
      ...baseContent,
      nodes: baseContent.nodes.map((node) => {
        if (node.id === tutorialEnemyFireNodeId) {
          return {
            ...node,
            type: "tritium",
            controllable: true,
            contestable: true,
            protectedNoWar: false,
            producesTritium: true,
            allowsShipyard: false
          };
        }

        if (node.id === tutorialFallbackShipyardNodeId) {
          return {
            ...node,
            type: "shipyard",
            controllable: true,
            contestable: true,
            protectedNoWar: false,
            producesTritium: false,
            allowsShipyard: true
          };
        }

        return node;
      })
    };
  }

  function normalizeTutorialPlayerFaction(faction: FactionIdentity): FactionIdentity {
    return {
      ...faction,
      id: "player",
      displayName: "PLAYER",
      controlType: "human"
    };
  }

  function frameTutorialOpeningCamera(): void {
    if (currentView !== "cinematic3d") {
      currentView = "cinematic3d";
      viewSelect.value = "cinematic3d";
      cinematicFrame.classList.remove("is-hidden");
      tacticalCanvas.classList.add("is-hidden");
      resizeActiveView();
    }

    ensureCinematicRenderer();
    const renderer = cinematicRenderer;

    if (renderer === null) {
      return;
    }

    renderer.setSnapshot(snapshot);
    selectedTargetKey = null;
    syncFocusSelectToTarget(null);
    renderer.selectTarget(null);
    // The menu used to restore the tutorial pose first and the menu pose immediately afterward.
    // That rebuilt BURN ribbons in the tutorial camera's display scale, then rendered the menu
    // camera before the throttled tactical presentation had rebuilt them again. The stale ribbon
    // geometry was visible for one frame at the end of every demo turn. Select the final pose up
    // front so a menu refresh has exactly one camera/display-scale coordinate system.
    const openingCameraPose = isGameMenuDemoActive
      ? gameMenuOpeningCameraPose
      : tutorialOpeningCameraPose;
    const activeOpeningCameraPose = isTrailerScreenActive
      ? trailerScreenOpeningCameraPose
      : openingCameraPose;
    const currentCamera = renderer.captureCameraState();
    const focus = currentCamera.focus.clone();
    focus.fromArray([...activeOpeningCameraPose.focus]);
    renderer.restoreCameraState({
      ...currentCamera,
      focus,
      yaw: activeOpeningCameraPose.yaw,
      pitch: activeOpeningCameraPose.pitch,
      distance: activeOpeningCameraPose.distance,
      focusedTargetKey: activeOpeningCameraPose.focusedTargetKey,
      trackedFocusTargetKey: activeOpeningCameraPose.trackedFocusTargetKey,
      displayScaleFocusTargetKey: activeOpeningCameraPose.displayScaleFocusTargetKey,
      displayScaleDistance: activeOpeningCameraPose.displayScaleDistance
    });

    if (isGameMenuDemoActive) {
      renderer.setForcedCameraFocusTarget(null);
    }

    if (!areTutorialCameraMovesEnabled()) {
      tutorialCameraAssistAnchor = null;
      return;
    }

    rememberTutorialCameraAssistAnchor(renderer.captureCameraState());
  }

  function appendStartStateAudit(
    nextState: GameState,
    options: StartStateAuditOptions = {}
  ): GameState {
    const auditEvents = createStartStateAuditEvents(nextState, options);

    for (const event of auditEvents) {
      if (event.reason !== "ok") {
        console.error("DEBUG ERROR START_STATE_AUDIT", {
          faction: event.factionId,
          expected: event.expected,
          actual: event.actual,
          reason: event.reason
        });
      }
    }

    return {
      ...nextState,
      debugEvents: [...nextState.debugEvents, ...auditEvents]
    };
  }

  function createStartStateAuditEvents(
    auditState: GameState,
    options: StartStateAuditOptions
  ): readonly TurnDebugEvent[] {
    const auditProceduralDebug =
      options.proceduralDebug === undefined
        ? selectedMapPreset.procedural === true
          ? currentProceduralDebug
          : null
        : options.proceduralDebug;
    const declarations = getStartStateAuditDeclarations(
      auditState.gameMode,
      auditProceduralDebug
    ).map((declaration) => {
      const controllerType = options.controllerOverrides?.[declaration.factionId];
      return controllerType === undefined ? declaration : { ...declaration, controllerType };
    });
    const productiveNodeIds = new Set(
      content.nodes
        .filter((node) => node.type === "tritium" || node.type === "shipyard")
        .map((node) => node.id)
    );
    const events: TurnDebugEvent[] = [];

    for (const declaration of declarations) {
      const actualFaction = auditState.factions.find(
        (faction) => faction.id === declaration.factionId
      );
      const actualOccupancies = auditState.nodeOccupancies.filter((occupancy) => {
        return occupancy.factionId === declaration.factionId && occupancy.shipCount > 0;
      });
      const expectedOccupancies = declaration.startingShips;
      const expectedNodeIds = new Set(expectedOccupancies.map((occupancy) => occupancy.nodeId));
      const actualProductiveNodes = actualOccupancies
        .filter((occupancy) => productiveNodeIds.has(occupancy.nodeId))
        .map((occupancy) => occupancy.nodeId)
        .sort();
      const expectedProductiveNodes = [declaration.tritium, declaration.shipyard]
        .filter((nodeId): nodeId is string => nodeId !== undefined)
        .sort();
      const mismatchReasons: string[] = [];

      for (const expected of expectedOccupancies) {
        const actual = actualOccupancies.find((occupancy) => occupancy.nodeId === expected.nodeId);

        if (actual === undefined) {
          mismatchReasons.push(`missing ship ${expected.nodeId}`);
          continue;
        }

        if (actual.shipCount !== expected.shipCount) {
          mismatchReasons.push(
            `ship count ${expected.nodeId} expected ${expected.shipCount} actual ${actual.shipCount}`
          );
        }
      }

      for (const actual of actualOccupancies) {
        if (!expectedNodeIds.has(actual.nodeId)) {
          mismatchReasons.push(`unexpected ship ${actual.nodeId}x${actual.shipCount}`);
        }
      }

      if (declaration.controllerType === "idle") {
        if (actualFaction !== undefined) {
          mismatchReasons.push(`controller expected idle actual ${actualFaction.controlType}`);
        }
      } else if (actualFaction?.controlType !== declaration.controllerType) {
        mismatchReasons.push(
          `controller expected ${declaration.controllerType} actual ${actualFaction?.controlType ?? "missing"}`
        );
      }

      if (
        declaration.controllerType !== "idle" &&
        getFactionDv(auditState, declaration.factionId) !== 10
      ) {
        mismatchReasons.push(
          `ΔV expected 10 actual ${getFactionDv(auditState, declaration.factionId)}`
        );
      }

      const reason = mismatchReasons.length === 0 ? "ok" : mismatchReasons.join("; ");

      events.push({
        turn: auditState.turn,
        type: "START_STATE_AUDIT",
        message:
          reason === "ok"
            ? `START_STATE_AUDIT ${declaration.factionId}: ok`
            : `START_STATE_AUDIT ${declaration.factionId}: DEBUG ERROR ${reason}`,
        factionId: declaration.factionId,
        reason,
        phase: "setup_reset",
        rule: "declared starts match actual ships, ΔV, controllers, and productive occupancy",
        expected: `controller ${declaration.controllerType}; ships ${formatOccupancyList(expectedOccupancies)}; productive ${expectedProductiveNodes.join(",") || "-"}`,
        actual: `controller ${actualFaction?.controlType ?? "missing"}; ships ${formatOccupancyList(actualOccupancies)}; productive ${actualProductiveNodes.join(",") || "-"}`
      });
    }

    return events;
  }

  function getStartStateAuditDeclarations(
    mode: GameModeId,
    proceduralDebug: ProceduralMapDebug | null
  ): readonly StartStateAuditDeclaration[] {
    if (proceduralDebug !== null) {
      const starts =
        mode === "1p"
          ? [proceduralDebug.playerStart]
          : mode === "3p"
            ? [
                proceduralDebug.playerStart,
                proceduralDebug.opponentStart,
                proceduralDebug.ai_2Start
              ]
            : [proceduralDebug.playerStart, proceduralDebug.opponentStart];

      return starts.map((start) => ({
        factionId: start.factionId,
        controllerType: start.controllerType,
        tritium: start.tritium,
        shipyard: start.shipyard,
        staging: start.staging,
        startingShips: start.startingShips
      }));
    }

    if (mode === "1p") {
      return [
        {
          factionId: "player",
          controllerType: "human",
          staging: resolveInitialNodeId(
            ONE_PLAYER_INITIAL_OCCUPANCIES[0]?.nodeId ?? "moon_node",
            new Set(content.nodes.map((node) => node.id))
          ),
          startingShips: resolveInitialOccupanciesForContent(
            ONE_PLAYER_INITIAL_OCCUPANCIES,
            content
          )
        }
      ];
    }

    if (mode === "3p") {
      return [
        createStaticStartAuditDeclaration("player", "human", THREE_PLAYER_STARTING_SETUP.player),
        createStaticStartAuditDeclaration("opponent", "ai", THREE_PLAYER_STARTING_SETUP.opponent),
        createStaticStartAuditDeclaration("ai_2", "ai", THREE_PLAYER_STARTING_SETUP.ai_2)
      ];
    }

    if (selectedMapPreset.initialOccupancies !== undefined) {
      return [
        createPresetStartAuditDeclaration("player", "human"),
        createPresetStartAuditDeclaration("opponent", "ai")
      ];
    }

    return [
      createStaticStartAuditDeclaration("player", "human", STARTING_SETUP.player),
      createStaticStartAuditDeclaration("opponent", "ai", STARTING_SETUP.opponent)
    ];
  }

  function createPresetStartAuditDeclaration(
    factionId: FactionId,
    controllerType: "human" | "ai"
  ): StartStateAuditDeclaration {
    const presetOccupancies = selectedMapPreset.initialOccupancies ?? [];
    const startingShips = resolveInitialOccupanciesForContent(
      presetOccupancies.filter((occupancy) => occupancy.factionId === factionId),
      content
    );
    const nodeById = new Map(content.nodes.map((node) => [node.id, node]));
    const tritium = startingShips.find(
      (occupancy) => nodeById.get(occupancy.nodeId)?.type === "tritium"
    )?.nodeId;
    const shipyard = startingShips.find(
      (occupancy) => nodeById.get(occupancy.nodeId)?.type === "shipyard"
    )?.nodeId;
    const staging = startingShips.find((occupancy) => {
      const nodeType = nodeById.get(occupancy.nodeId)?.type;
      return nodeType !== "tritium" && nodeType !== "shipyard";
    })?.nodeId;

    return {
      factionId,
      controllerType,
      ...(tritium === undefined ? {} : { tritium }),
      ...(shipyard === undefined ? {} : { shipyard }),
      ...(staging === undefined ? {} : { staging }),
      startingShips
    };
  }

  function createStaticStartAuditDeclaration(
    factionId: FactionId,
    controllerType: "human" | "ai",
    setup: Readonly<{ tritium: string; shipyard: string; staging: string }>
  ): StartStateAuditDeclaration {
    const nodeIds = new Set(content.nodes.map((node) => node.id));
    const tritium = resolveInitialNodeId(setup.tritium, nodeIds);
    const shipyard = resolveInitialNodeId(setup.shipyard, nodeIds);
    const staging = resolveInitialNodeId(setup.staging, nodeIds);

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

  function formatOccupancyList(
    occupancies: readonly GameState["nodeOccupancies"][number][]
  ): string {
    return (
      occupancies
        .map((occupancy) => `${occupancy.factionId}:${occupancy.nodeId}x${occupancy.shipCount}`)
        .sort()
        .join(",") || "-"
    );
  }

  function createControllerAuditOverrides(
    auditState: GameState
  ): Partial<Record<FactionId, StartStateControllerType>> {
    return Object.fromEntries(
      auditState.factions.map((faction) => [faction.id, faction.controlType])
    );
  }

  function createInitialStateForGameMode(mode: GameModeId): GameState {
    const generation =
      selectedMapPreset.procedural === true
        ? getProceduralGeneration(selectedMapPreset, proceduralSeed, proceduralGenerationBySeed)
        : null;

    return createInitialStateForGameModeAndMap(mode, selectedMapPreset, content, generation);
  }

  function createInitialStateForGameModeAndMap(
    mode: GameModeId,
    mapPreset: MapPreset,
    mapContent: SolarSystemData,
    generation: ProceduralMapGeneration | null
  ): GameState {
    const factions = createRandomFactionIdentities(mode);
    const nodeOccupancies = getInitialOccupanciesForGameModeAndMap(
      mode,
      mapPreset,
      mapContent,
      generation
    );

    return createInitialGameState({
      gameMode: mode,
      factions,
      factionDv: createFactionDvForIdentities(factions),
      nodeOccupancies
    });
  }

  function createInitialAiStateForGameMode(mode: MultiFactionGameModeId): GameState {
    return withAiControlledFactions(createInitialStateForGameMode(mode));
  }

  function createInitialFireVsAiState(): GameState {
    const baseState = createInitialAiStateForGameMode("2p");

    return {
      ...baseState,
      factions: baseState.factions.map((faction) => {
        if (faction.id === "player") {
          return {
            ...faction,
            displayName: "FIRE",
            color: "#7fe8ff",
            accent: "#d9f8ff",
            controlType: "ai" as const
          };
        }

        if (faction.id === "opponent") {
          return {
            ...faction,
            displayName: "NOFIRE",
            color: "#c982ff",
            accent: "#f3dcff",
            controlType: "ai" as const
          };
        }

        return faction;
      })
    };
  }

  function withAiControlledFactions(nextState: GameState): GameState {
    return {
      ...nextState,
      factions: nextState.factions.map((faction) => ({
        ...faction,
        controlType: "ai" as const
      }))
    };
  }

  function withControllerOverrides(
    nextState: GameState,
    controllerOverrides: Partial<Record<FactionId, StartStateControllerType>>
  ): GameState {
    return {
      ...nextState,
      factions: nextState.factions.map((faction) => {
        const controlType = controllerOverrides[faction.id];

        return controlType === undefined || controlType === "idle"
          ? faction
          : {
              ...faction,
              controlType
            };
      })
    };
  }

  function getInitialOccupanciesForGameModeAndMap(
    mode: GameModeId,
    mapPreset: MapPreset,
    mapContent: SolarSystemData,
    generation: ProceduralMapGeneration | null
  ): readonly GameState["nodeOccupancies"][number][] {
    if (mode === "1p") {
      return resolveInitialOccupanciesForContent(ONE_PLAYER_INITIAL_OCCUPANCIES, mapContent);
    }

    if (mapPreset.procedural === true) {
      if (generation === null) {
        throw new Error(`Procedural map preset "${mapPreset.label}" has no generated map.`);
      }

      return getProceduralInitialOccupanciesForMode(generation, mode);
    }

    if (mode === "3p") {
      return resolveInitialOccupanciesForContent(THREE_PLAYER_INITIAL_OCCUPANCIES, mapContent);
    }

    return mapPreset.initialOccupancies ?? createInitialGameState().nodeOccupancies;
  }

  function captureCurrentMapIdentity(
    requestedSeed: string | null = selectedMapPreset.procedural === true ? proceduralSeed : null,
    effectiveMapSeed: string | null = selectedMapPreset.procedural === true
      ? (currentProceduralDebug?.seed ?? normalizeProceduralSeedForUi(proceduralSeed))
      : null
  ): void {
    currentRequestedSeed = requestedSeed;
    currentEffectiveMapSeed = effectiveMapSeed;
    currentMapGameplayHash = createMapGameplayHash(content, state);
  }

  function createAutomaticProceduralMapAudit(
    automaticMap: ProceduralBatchMapGeneration
  ): AutomaticProceduralMapGenerationAudit {
    return {
      requestedSeed: automaticMap.requestedSeed,
      attempts: automaticMap.attempts,
      finalEffectiveMapSeed: automaticMap.finalEffectiveMapSeed,
      usedStaticFallback: automaticMap.usedStaticFallback
    };
  }

  function resolveInitialOccupanciesForContent(
    occupancies: readonly GameState["nodeOccupancies"][number][],
    solarSystem: SolarSystemData
  ): readonly GameState["nodeOccupancies"][number][] {
    const nodeIds = new Set(solarSystem.nodes.map((node) => node.id));

    return occupancies.map((occupancy) => ({
      ...occupancy,
      nodeId: resolveInitialNodeId(occupancy.nodeId, nodeIds)
    }));
  }

  function resetRuntimeAfterGameReset(
    options: Readonly<{
      preserveTutorial?: boolean;
      preserveCamera?: boolean;
      preserveCinematicScene?: boolean;
    }> = {}
  ): void {
    const preservedCinematicCamera =
      options.preserveCamera === true ? (cinematicRenderer?.captureCameraState() ?? null) : null;
    const preservedTacticalCamera = options.preserveCamera === true ? tacticalCamera : null;
    pendingCinematicCameraRestore = null;
    tutorialSelectionCommandConsoleRefresh.cancel();
    commandGlossaryController.endTutorialLogbookIntroduction();

    if (options.preserveTutorial !== true) {
      clearTutorialTimers();
      tutorialState = null;
      tutorialPostVictoryActionLessonTurn = null;
      tutorialEnemySimpleAiEnabled = false;
      commandInputHintsMode = "off";
      hasMovedTutorialOpeningCamera = false;
      tutorialCameraAssistAnchor = null;
    }

    mapSelect.value = selectedMapPreset.id;
    proceduralSeedInput.value = proceduralSeed;
    selectedTargetKey = null;
    lockedMandatoryLaunchId = null;
    isReplayMode = false;
    replayCancelRequested = false;
    if (!isZeroTimerAutoRestarting) {
      clearZeroTimerAutoRestart();
    }
    cancelCommandLogTimeReviewAnimation();
    commandLogTimeReviewState = null;
    isCommandLogTimeReviewAnimating = false;
    clearCommandLogScrubState();
    shouldSuppressNextCommandLogClick = false;
    isCommandConsoleResolving = false;
    isCommandConsoleTypingLiveBlock = false;
    shouldTypeNextLiveCommandBlock = true;
    planningTimerState = createDisabledPlanningTimerState(state.turn);
    planningTimerPausedAtMs = null;
    stopPlanningTimerLoop();
    setCommandLogReviewPromptDimmed(false);
    clearPostMatchReturnTimer();
    postMatchReportText = null;
    lastVictoryAudit = null;
    lastMapOutcomeAudit = null;
    lastVictoryDelayLogKey = null;
    hasAppendedVictoryTranscript = false;
    postMatchReport.textContent = "";
    postMatchDismissLayer.classList.add("is-hidden");
    postMatchReport.classList.add("is-hidden");
    replayTape.transitions.length = 0;
    replayTape.entries.length = 0;
    matchDebugEvents.length = 0;
    matchResolutionEvents.length = 0;
    commandTimelineEntries.length = 0;
    liveTutorialTimelineRows.length = 0;
    lastNonEmptyTutorialLiveHintRows = [];
    lastTutorialCameraHintAt = null;
    commandDvHistory.length = 0;
    commandDvHistory.push({ ...snapshot.factionDv });
    invalidateCommandWarningSnapshot();
    renderCommandTranscriptFromTimeline();
    dragStart = null;
    tacticalCamera = preservedTacticalCamera ?? createCameraState({ minZoom: 0.24, maxZoom: 5 });
    pendingCinematicCameraRestore = preservedCinematicCamera;
    populateFocusSelect(focusSelect, content);
    if (options.preserveCinematicScene !== true) {
      disposeCinematicRenderer();
    } else {
      cinematicRenderer?.clearPresentationEffects();
    }
    resizeActiveView();

    if (currentView === "cinematic3d") {
      ensureCinematicRenderer();
      cinematicRenderer?.setSnapshot(snapshot);
    }

    if (
      pendingCinematicCameraRestore === null &&
      (!frameMultiplayerOpeningCamera() || currentView !== "cinematic3d")
    ) {
      fitSystem();
    }

    restartPlanningTimerForCurrentTurn();
    redraw();
  }

  function frameMultiplayerOpeningCamera(): boolean {
    if (state.gameMode === "1p" || currentView !== "cinematic3d") {
      return false;
    }

    ensureCinematicRenderer();
    return cinematicRenderer?.frameMultiplayerOpeningCameraInstant() ?? false;
  }

  function handleTutorialAfterTurn(
    _previousSnapshot: SolarSystemSnapshot,
    nextSnapshot: SolarSystemSnapshot
  ): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const events = getTutorialTurnEvents(nextSnapshot);
    maybeActivateTutorialSimpleEnemyAiAfterFirstKill(tutorial, events);

    if (pauseTutorialForFirstEnemyKillReplayCue()) {
      return;
    }

    if (tutorial.firstEnemyKillReplayVictoryLessonPending) {
      void appendTutorialFirstEnemyKillPostReplayVictoryLesson(tutorial);
      return;
    }

    if (maybePauseTutorialForMandatoryLaunch()) {
      return;
    }

    if (resumeTutorialShipyardContestedSupportFireAfterMandatoryLaunch(tutorial)) {
      return;
    }

    if (maybePresentTutorialShipyardContestedCheckpoint()) {
      return;
    }

    if (
      tutorial.phase === "firstBurnQueued" &&
      events.some(
        (event) =>
          event.type === "BURN_DEPARTED" &&
          event.factionId === "player" &&
          event.nodeId === tutorialOpeningOriginNodeId
      )
    ) {
      recoverTutorialFirstBurnTracking(events);
      tutorial.phase = "awaitingFirstArrival";
      updateInteractionLocks();
      void autoAdvanceTutorialToFirstArrival();
      return;
    }

    const recoveredFirstBurnDestinationNodeId =
      tutorial.phase === "awaitingFirstArrival"
        ? recoverTutorialFirstBurnTracking(events)
        : tutorial.firstBurnDestinationNodeId;

    if (
      tutorial.phase === "awaitingFirstArrival" &&
      recoveredFirstBurnDestinationNodeId !== null &&
      hasFactionShipAtNode(state, recoveredFirstBurnDestinationNodeId, "player")
    ) {
      resolveTutorialFirstArrival(recoveredFirstBurnDestinationNodeId);
      return;
    }

    if (
      tutorial.phase === "productiveBurnQueued" &&
      events.some(
        (event) =>
          event.type === "BURN_DEPARTED" &&
          event.factionId === "player" &&
          event.nodeId === tutorial.productiveBurnOriginNodeId
      )
    ) {
      tutorial.phase = "awaitingProductiveArrival";
      updateInteractionLocks();
      void autoAdvanceTutorialToProductiveArrival();
      return;
    }

    if (
      tutorial.phase === "awaitingProductiveArrival" &&
      tutorial.productiveBurnDestinationNodeId !== null &&
      hasFactionShipAtNode(state, tutorial.productiveBurnDestinationNodeId, "player")
    ) {
      resolveTutorialProductiveArrival(tutorial.productiveBurnDestinationNodeId);
      return;
    }

    if (
      tutorial.phase === "shipyardProductionCompletion" &&
      nextSnapshot.mandatoryLaunches.some((launch) => launch.factionId === "player")
    ) {
      completeTutorialShipyardProductionLesson();
      return;
    }

    if (
      (tutorial.phase === "shipyardSupportProductionCompletion" ||
        tutorial.phase === "autoAdvancingToShipyardContestedSupport") &&
      nextSnapshot.mandatoryLaunches.some((launch) => launch.factionId === "player")
    ) {
      tutorial.phase = "shipyardProductionCompletion";
      completeTutorialShipyardProductionLesson();
      return;
    }

    if (
      tutorial.phase === "autoAdvancingToShipyardContestedBurn" &&
      isTutorialShipyardContestedByPlayerAndOpponent(tutorial)
    ) {
      presentTutorialShipyardContestedBurnPrompt();
      return;
    }

    if (
      tutorial.phase === "mandatoryLaunchQueued" &&
      tutorial.autoAdvanceActive !== true &&
      (events.some((event) => event.type === "BURN_DEPARTED" && event.factionId === "player") ||
        (_previousSnapshot.mandatoryLaunches.some((launch) => launch.factionId === "player") &&
          !nextSnapshot.mandatoryLaunches.some((launch) => launch.factionId === "player")))
    ) {
      void startTutorialPostMandatoryLaunchEvadeSequence();
      return;
    }

    if (
      tutorial.phase === "enemyBurnQueued" &&
      events.some((event) => event.type === "BURN_DEPARTED" && event.factionId === "player")
    ) {
      void continueTutorialToEnemyContestedArrival();
      return;
    }

    const burnOutBrokenSolution = events.find((event) => {
      return event.type === "MISSILE_SOLUTION_BROKEN" && event.factionId === "player";
    });
    const burnOutDeparted = events.find((event) => {
      return event.type === "BURN_DEPARTED" && event.factionId === "player";
    });

    if (
      tutorial.phase === "burnOutQueued" &&
      (burnOutBrokenSolution ?? burnOutDeparted) !== undefined
    ) {
      appendTutorialRows(
        [
          "The missile lost track when its target left the contested orbit.",
          "That BURN cancelled every firing solution attached to the departing ship."
        ],
        "tutorial:defensive-solution-broken"
      );
      void continueTutorialBurnOutToDestination();
    }
  }

  async function tutorialAutoResolveTurn(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    if (maybePresentTutorialShipyardContestedCheckpoint()) {
      return;
    }

    const previousInputLocked = tutorial.inputLocked;
    const previousAutoAdvanceActive = tutorial.autoAdvanceActive;
    const phaseBeforeTurn = tutorial.phase;
    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = true;
    updateInteractionLocks();
    updateTutorialCommandConsoleWithTypewriter();
    await resolveTutorialAutoFramedTurn();

    if (isTutorialFirstEnemyKillReplayCueActive()) {
      return;
    }

    if (tutorialState === tutorial && stopTutorialAutoAdvanceAtShipyardContested(tutorial)) {
      return;
    }

    if (
      tutorialState === tutorial &&
      shouldRestoreTutorialAutoAdvanceLock(phaseBeforeTurn, tutorial.phase)
    ) {
      tutorial.inputLocked = previousInputLocked;
      tutorial.autoAdvanceActive = previousAutoAdvanceActive;
      updateInteractionLocks();
      updateTutorialCommandConsoleWithTypewriter();
    }
  }

  function stopTutorialAutoAdvanceAtShipyardContested(tutorial: TutorialRuntimeState): boolean {
    if (tutorialState !== tutorial) {
      return false;
    }

    return maybePresentTutorialShipyardContestedCheckpoint();
  }

  async function resolveTutorialAutoFramedTurn(): Promise<void> {
    await resolveTutorialSkippedTurn();
  }

  async function resolveTutorialSkippedTurn(): Promise<void> {
    const transcriptStartIndex = matchDebugEvents.length;
    const turnSnapshotTranscriptPromise = appendTutorialTurnOnlySnapshot();
    isCommandConsoleResolving = true;
    updateInteractionLocks();
    updateCommandConsole();
    await advanceTurn(transcriptStartIndex, {
      ignoreMandatoryLaunchLock: true,
      transcriptPrefixPromise: turnSnapshotTranscriptPromise
    });
  }

  async function autoAdvanceTutorialToFirstArrival(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "awaitingFirstArrival") {
      return;
    }

    const destinationNodeId = recoverTutorialFirstBurnTracking();

    if (destinationNodeId === null) {
      return;
    }

    if (hasFactionShipAtNode(state, destinationNodeId, "player")) {
      resolveTutorialFirstArrival(destinationNodeId);
      return;
    }

    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = true;
    updateInteractionLocks();
    updateTutorialCommandConsoleWithTypewriter();

    const remainingTurns =
      tutorial.firstBurnArrivalTurn === null
        ? 8
        : Math.max(1, Math.min(12, tutorial.firstBurnArrivalTurn - state.turn + 1));

    try {
      for (let index = 0; index < remainingTurns; index += 1) {
        if (
          tutorialState !== tutorial ||
          tutorial.phase !== "awaitingFirstArrival" ||
          hasFactionShipAtNode(state, destinationNodeId, "player")
        ) {
          break;
        }

        await resolveTutorialAutoFramedTurn();
      }
    } finally {
      if (tutorialState === tutorial) {
        tutorial.inputLocked = false;
        tutorial.autoAdvanceActive = false;

        if (
          tutorial.phase === "awaitingFirstArrival" &&
          hasFactionShipAtNode(state, destinationNodeId, "player")
        ) {
          resolveTutorialFirstArrival(destinationNodeId);
        }

        updateInteractionLocks();
        updateTutorialCommandConsoleWithTypewriter();
      }
    }
  }

  async function autoAdvanceTutorialToProductiveArrival(): Promise<void> {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "awaitingProductiveArrival" ||
      tutorial.productiveBurnDestinationNodeId === null
    ) {
      return;
    }

    const destinationNodeId = tutorial.productiveBurnDestinationNodeId;

    if (hasFactionShipAtNode(state, destinationNodeId, "player")) {
      resolveTutorialProductiveArrival(destinationNodeId);
      return;
    }

    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = true;
    updateInteractionLocks();
    updateTutorialCommandConsoleWithTypewriter();

    const remainingTurns =
      tutorial.productiveBurnArrivalTurn === null
        ? 8
        : Math.max(1, Math.min(12, tutorial.productiveBurnArrivalTurn - state.turn + 1));

    try {
      for (let index = 0; index < remainingTurns; index += 1) {
        if (
          tutorialState !== tutorial ||
          tutorial.phase !== "awaitingProductiveArrival" ||
          hasFactionShipAtNode(state, destinationNodeId, "player")
        ) {
          break;
        }

        await resolveTutorialAutoFramedTurn();
      }
    } finally {
      if (tutorialState === tutorial) {
        tutorial.inputLocked = false;
        tutorial.autoAdvanceActive = false;

        if (
          tutorial.phase === "awaitingProductiveArrival" &&
          hasFactionShipAtNode(state, destinationNodeId, "player")
        ) {
          resolveTutorialProductiveArrival(destinationNodeId);
        }

        updateInteractionLocks();
        updateTutorialCommandConsoleWithTypewriter();
      }
    }
  }

  async function startTutorialPostMandatoryLaunchEvadeSequence(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "mandatoryLaunchQueued") {
      return;
    }

    if (
      tutorial.shipyardEnemyDestinationNodeId !== null &&
      hasFactionShipAtNode(state, tutorial.shipyardEnemyDestinationNodeId, "opponent")
    ) {
      prepareTutorialShipyardEnemyReturnBurn();
    }

    await autoAdvanceTutorialBurnToDestination(
      "mandatory-launch-arrival",
      "mandatoryLaunchQueued",
      continueTutorialAfterMandatoryLaunchArrival,
      12
    );

    if (
      tutorialState === tutorial &&
      tutorial.phase === "mandatoryLaunchQueued" &&
      !isTutorialMandatoryLaunchAutoAdvancePending()
    ) {
      const resumePhase = clearTutorialMandatoryLaunchTracking(tutorial);

      if (!(await resumeTutorialAfterMandatoryLaunchInterruption(tutorial, resumePhase))) {
        finishTutorialAfterUnrecoverableMandatoryLaunch(tutorial);
      }
    }
  }

  async function autoAdvanceTutorialMandatoryLaunchToDestination(): Promise<void> {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "mandatoryLaunchQueued" ||
      tutorial.autoAdvanceActive
    ) {
      return;
    }

    await startTutorialPostMandatoryLaunchEvadeSequence();
  }

  async function continueTutorialAfterMandatoryLaunchArrival(arrivalNodeId: string): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "mandatoryLaunchQueued") {
      return;
    }

    const resumePhase = clearTutorialMandatoryLaunchTracking(tutorial);

    rememberTutorialCameraAssistAnchor();
    focusTutorialArrivalTarget(`node:${arrivalNodeId}`);
    const arrivalNodeType = content.nodes.find((node) => node.id === arrivalNodeId)?.type ?? null;
    const tritiumArrivalNodeId =
      !hasTutorialIntroducedTritium(tutorial) && arrivalNodeType === "tritium"
        ? arrivalNodeId
        : findUnintroducedPlayerTritiumNodeId();
    const counterContestRecoveryActive = isTutorialCounterContestRecoveryRouteActive(tutorial);

    if (counterContestRecoveryActive && isNodeContestedByPlayerAndOpponent(arrivalNodeId)) {
      tutorial.shipyardContestedRecoveryActive = true;
      tutorial.contestedNodeId = arrivalNodeId;

      if (maybePresentTutorialShipyardContestedCheckpoint()) {
        return;
      }
    }

    const existingContestedNodeId = findTutorialPlayerOpponentContestedNodeId(tutorial);

    if (counterContestRecoveryActive && existingContestedNodeId !== null) {
      tutorial.shipyardContestedRecoveryActive = true;
      tutorial.contestedNodeId = existingContestedNodeId;

      if (maybePresentTutorialShipyardContestedCheckpoint()) {
        return;
      }
    }

    if (
      counterContestRecoveryActive &&
      hasFactionShipAtNode(state, tutorial.shipyardLessonNodeId, "opponent")
    ) {
      tutorial.shipyardContestedRecoveryActive = true;

      if (tritiumArrivalNodeId !== null) {
        void startTutorialFirstTritiumPostArrivalWorkTurn(
          tritiumArrivalNodeId,
          "shipyardContestedRecovery"
        );
        return;
      }

      tutorial.phase = "shipyardContestedBurnQueued";
      await continueTutorialAfterShipyardContestedBurn();
      return;
    }

    if (tritiumArrivalNodeId !== null) {
      void startTutorialFirstTritiumPostArrivalWorkTurn(tritiumArrivalNodeId, "evadeSetup");
      return;
    }

    if (await resumeTutorialAfterMandatoryLaunchInterruption(tutorial, resumePhase)) {
      return;
    }

    if (tutorial.shipyardEnemyDestinationNodeId !== null) {
      await resumeTutorialShipyardEnemyFlowAfterPause();
      return;
    }

    if (tutorial.loggedKeys.has("tutorial:evade-resolution")) {
      tutorial.phase = "evadeLesson";
      continueTutorialAfterEvadeLessonExecute();
      return;
    }

    await startTutorialEvadeLesson();
  }

  function clearTutorialMandatoryLaunchTracking(
    tutorial: TutorialRuntimeState
  ): TutorialPhase | null {
    const resumePhase = tutorial.mandatoryLaunchResumePhase;
    tutorial.activeMandatoryLaunchId = null;
    tutorial.mandatoryLaunchResumePhase = null;
    return resumePhase;
  }

  async function resumeTutorialAfterMandatoryLaunchInterruption(
    tutorial: TutorialRuntimeState,
    resumePhase: TutorialPhase | null
  ): Promise<boolean> {
    switch (resumePhase) {
      case "shipyardContestedBurnQueued":
      case "autoAdvancingToShipyardContestedSupport":
        tutorial.phase = "shipyardContestedBurnQueued";
        await continueTutorialAfterShipyardContestedBurn();
        return true;
      case "autoAdvancingToShipyardContestedBurn":
        tutorial.phase = "autoAdvancingToShipyardContestedBurn";
        await continueTutorialShipyardEnemyContestedApproach();
        return true;
      case "autoAdvancingToShipyardCounterContestArrival":
        tutorial.phase = "autoAdvancingToShipyardCounterContestArrival";
        await continueTutorialShipyardCounterContestArrival();
        return true;
      case "autoAdvancingToShipyardContestedFireImpact":
        tutorial.phase = "autoAdvancingToShipyardContestedFireImpact";
        await continueTutorialShipyardContestedFireToEnemyDestroyed();
        return true;
      case "autoAdvancingToShipyardEnemyEvade":
      case "autoAdvancingToShipyardEnemyArrival":
        await resumeTutorialShipyardEnemyFlowAfterPause();
        return true;
      case "shipyardProductionCompletion":
        tutorial.phase = "shipyardProductionCompletion";
        await autoAdvanceTutorialShipyardProductionToCompletion();
        return true;
      case "shipyardSupportProductionCompletion":
        tutorial.phase = "shipyardSupportProductionCompletion";
        await autoAdvanceTutorialSupportShipyardProductionToCompletion();
        return true;
      default:
        return false;
    }
  }

  function finishTutorialAfterUnrecoverableMandatoryLaunch(tutorial: TutorialRuntimeState): void {
    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "complete";
    appendTutorialRows(
      [
        "The mandatory launch route could not be completed.",
        "Normal control has been restored, so continue the operation with the surviving ships."
      ],
      "tutorial:mandatory-launch-recovery"
    );
    completeTutorialGuidedSegment();
  }

  async function continueTutorialBurnOutToDestination(): Promise<void> {
    await autoAdvanceTutorialBurnToDestination(
      "burn-out-arrival",
      "burnOutQueued",
      (arrivalNodeId) => {
        const activeTutorial = tutorialState;

        if (activeTutorial === null) {
          return;
        }

        rememberTutorialCameraAssistAnchor();
        focusTutorialArrivalTarget(`node:${arrivalNodeId}`);
        activeTutorial.phase = "complete";
        completeTutorialGuidedSegment();
      }
    );
  }

  async function autoAdvanceTutorialBurnToDestination(
    keyPrefix: string,
    expectedPhase: TutorialPhase,
    onArrival: (arrivalNodeId: string) => void | Promise<void>,
    maxTurns = 12
  ): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== expectedPhase) {
      return;
    }

    const destinationNodeId =
      expectedPhase === "mandatoryLaunchQueued"
        ? recoverTutorialMandatoryLaunchAutoDestination(tutorial)
        : tutorial.tutorialBurnDestinationNodeId;

    if (destinationNodeId === null) {
      return;
    }

    if (hasTutorialBurnReachedDestination(tutorial, destinationNodeId)) {
      focusTutorialTurnSkipArrivalNode(destinationNodeId);
      await onArrival(destinationNodeId);
      return;
    }

    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = true;
    updateInteractionLocks();
    updateTutorialCommandConsoleWithTypewriter();

    try {
      await driveTutorialBurnToDestination({
        maxTurns,
        observe: () => {
          if (expectedPhase === "mandatoryLaunchQueued") {
            recoverTutorialMandatoryLaunchAutoDestination(tutorial);
          }

          return {
            turn: state.turn,
            isActive: tutorialState === tutorial && tutorial.phase === expectedPhase,
            hasReachedDestination:
              tutorialState === tutorial &&
              tutorial.phase === expectedPhase &&
              hasTutorialBurnReachedDestination(tutorial, destinationNodeId)
          };
        },
        advanceTurn: resolveTutorialAutoFramedTurn
      });
    } finally {
      if (tutorialState === tutorial) {
        tutorial.inputLocked = false;
        tutorial.autoAdvanceActive = false;

        if (
          tutorial.phase === expectedPhase &&
          hasTutorialBurnReachedDestination(tutorial, destinationNodeId)
        ) {
          focusTutorialTurnSkipArrivalNode(destinationNodeId);
          await onArrival(destinationNodeId);
        }

        updateInteractionLocks();
        updateTutorialCommandConsoleWithTypewriter();
      }
    }
  }

  function hasTutorialBurnReachedDestination(
    tutorial: TutorialRuntimeState,
    destinationNodeId: string
  ): boolean {
    if (isTutorialBurnStillPendingOrInFlight(tutorial, destinationNodeId)) {
      return false;
    }

    return (
      (tutorial.tutorialBurnArrivalTurn === null ||
        state.turn >= tutorial.tutorialBurnArrivalTurn) &&
      hasFactionShipAtNode(state, destinationNodeId, "player")
    );
  }

  function isTutorialBurnStillPendingOrInFlight(
    tutorial: TutorialRuntimeState,
    destinationNodeId: string
  ): boolean {
    const expectedArrivalTurn = tutorial.tutorialBurnArrivalTurn;

    return (
      state.pendingBurnOrders.some((order) => {
        return (
          order.factionId === "player" &&
          order.destinationNodeId === destinationNodeId &&
          (expectedArrivalTurn === null || order.arrivalTurn === expectedArrivalTurn)
        );
      }) ||
      state.activeBurnTransits.some((transit) => {
        return (
          transit.factionId === "player" &&
          transit.destinationNodeId === destinationNodeId &&
          (expectedArrivalTurn === null || transit.arrivalTurn === expectedArrivalTurn)
        );
      })
    );
  }

  function completeTutorialGuidedSegment(options: Readonly<{ immediate?: boolean }> = {}): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.loggedKeys.has("tutorial:return-normal")) {
      return;
    }

    tutorial.loggedKeys.add("tutorial:return-normal");
    const returnToNormalMatch = async () => {
      if (tutorialState !== tutorial) {
        return;
      }

      await commitLiveTutorialTimelineRowsToTranscript("tutorial:quiet-handoff");
      tutorial.inputLocked = false;
      tutorial.autoAdvanceActive = false;
      tutorial.phase = "complete";
      handOffTutorialToNormalMatch(tutorial);
      updateInteractionLocks();
      updateCommandConsole();
      updateStatus();
    };

    if (options.immediate === true) {
      void returnToNormalMatch();
      return;
    }

    const timer = window.setTimeout(() => {
      void returnToNormalMatch();
    }, 900);
    tutorial.timers.push(timer);
  }

  function getTutorialTurnEvents(nextSnapshot: SolarSystemSnapshot): readonly TurnDebugEvent[] {
    return nextSnapshot.debugEvents.filter((event) => event.turn === nextSnapshot.turn);
  }

  function maybeActivateTutorialSimpleEnemyAiAfterFirstKill(
    tutorial: TutorialRuntimeState,
    events: readonly TurnDebugEvent[]
  ): void {
    const key = "tutorial:enemy-simple-ai-after-first-kill";

    if (tutorial.loggedKeys.has(key)) {
      return;
    }

    const destroyedEnemyShip = events.some((event) => {
      return event.type === "SHIP_DESTROYED" && event.factionId === "opponent";
    });

    if (!destroyedEnemyShip) {
      return;
    }

    const remainingEnemyNodeIds = getOccupiedNodeIdsForFaction(state, "opponent");

    if (remainingEnemyNodeIds.length === 0) {
      return;
    }

    const reinforcementType = getTutorialEnemyReinforcementType(remainingEnemyNodeIds);
    const reinforcementNodeId =
      reinforcementType === null ? null : findTutorialEnemyReinforcementNodeId(reinforcementType);

    tutorial.loggedKeys.add(key);
    tutorial.enemySimpleAiEnabled = true;
    tutorialEnemySimpleAiEnabled = true;

    let nextState: GameState = {
      ...state,
      factions: state.factions.map((faction) =>
        faction.id === "opponent" ? { ...faction, controlType: "ai" as const } : faction
      )
    };

    if (reinforcementNodeId !== null) {
      nextState = addTutorialEnemyReinforcementShip(nextState, reinforcementNodeId);
    }

    nextState = {
      ...nextState,
      debugEvents: [
        ...nextState.debugEvents,
        {
          turn: nextState.turn,
          type: "START_STATE_AUDIT",
          message:
            reinforcementNodeId === null
              ? "TUTORIAL_ENEMY_SIMPLE_AI: opponent switched to AI LEVEL 1"
              : `TUTORIAL_ENEMY_SIMPLE_AI: opponent switched to AI LEVEL 1; reinforcement staged at ${getNodeDebugName(reinforcementNodeId)}`,
          factionId: "opponent",
          reason: "tutorial-first-enemy-destroyed",
          ...(reinforcementNodeId === null ? {} : { nodeId: reinforcementNodeId })
        }
      ]
    };

    state = nextState;
    snapshot = createSolarSystemSnapshot(content, state);
    appendDebugPanelMessage(
      reinforcementNodeId === null
        ? "Tutorial enemy AI LEVEL 1 enabled"
        : `Tutorial enemy AI LEVEL 1 enabled; reinforcement at ${getNodeDebugName(reinforcementNodeId)}`
    );
  }

  function getOccupiedNodeIdsForFaction(
    nextState: Pick<GameState, "nodeOccupancies">,
    factionId: FactionId
  ): readonly string[] {
    return nextState.nodeOccupancies
      .filter((occupancy) => occupancy.factionId === factionId && occupancy.shipCount > 0)
      .map((occupancy) => occupancy.nodeId);
  }

  function getTutorialEnemyReinforcementType(
    nodeIds: readonly string[]
  ): "tritium" | "barren" | null {
    const occupiedNodes = nodeIds
      .map((nodeId) => content.nodes.find((node) => node.id === nodeId) ?? null)
      .filter((node): node is SolarSystemData["nodes"][number] => node !== null);

    if (occupiedNodes.some((node) => node.type === "tritium")) {
      return "barren";
    }

    if (occupiedNodes.some((node) => node.type === "barren")) {
      return "tritium";
    }

    return null;
  }

  function findTutorialEnemyReinforcementNodeId(nodeType: "tritium" | "barren"): string | null {
    const candidates = content.nodes
      .filter((node) => node.type === nodeType)
      .map((node) => {
        let score = 0;

        if (!hasFactionShipAtNode(state, node.id, "opponent")) {
          score += 8;
        }

        if (!hasFactionShipAtNode(state, node.id, "player")) {
          score += 4;
        }

        return { node, score };
      })
      .sort((a, b) => b.score - a.score || a.node.id.localeCompare(b.node.id));

    return candidates[0]?.node.id ?? null;
  }

  function addTutorialEnemyReinforcementShip(nextState: GameState, nodeId: string): GameState {
    let updated = false;
    const nodeOccupancies = nextState.nodeOccupancies.map((occupancy) => {
      if (occupancy.nodeId === nodeId && occupancy.factionId === "opponent") {
        updated = true;
        return { ...occupancy, shipCount: occupancy.shipCount + 1 };
      }

      return occupancy;
    });

    return {
      ...nextState,
      nodeOccupancies: updated
        ? nodeOccupancies
        : [...nodeOccupancies, { nodeId, factionId: "opponent", shipCount: 1 }]
    };
  }

  function getNodeDebugName(nodeId: string): string {
    return formatNodeName(content, nodeId);
  }

  function resolveTutorialFirstArrival(arrivalNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    tutorial.phase = "firstArrival";
    rememberTutorialCameraAssistAnchor();
    focusTutorialTurnSkipArrivalNode(arrivalNodeId);
    beginFirstNodeBranch(arrivalNodeId);
  }

  function resolveTutorialProductiveArrival(arrivalNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    tutorial.phase = "firstArrival";
    rememberTutorialCameraAssistAnchor();
    focusTutorialTurnSkipArrivalNode(arrivalNodeId);
    beginProductiveNodeBranch(arrivalNodeId);
  }

  function getTutorialProtectedInterdictionLessonRows(): readonly string[] {
    return [
      "Nuclear warfare is actively interdicted in Earth and lunar orbits.",
      "Beyond that protected corridor, the same acts remain unlawful but immediate enforcement is no longer available."
    ];
  }

  function beginFirstNodeBranch(destinationNodeId: string): void {
    const tutorial = tutorialState;
    const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);

    if (tutorial === null) {
      return;
    }

    if (destinationNode?.type === "tritium") {
      void startTutorialFirstTritiumPostArrivalWorkTurn(destinationNodeId, "productiveBurnPrompt");
      return;
    }

    if (destinationNode?.type === "shipyard") {
      if (tutorial.shipyardContestedRecoveryActive) {
        void startTutorialSupportShipyardArrivalWorkSequence(destinationNodeId);
        return;
      }

      void startTutorialShipyardArrivalWorkSequence(destinationNodeId, false);
      return;
    }

    if (isTutorialProtectedInterdictionNode(destinationNodeId)) {
      appendTutorialRows(
        [
          ...getTutorialProtectedInterdictionLessonRows(),
          "Three dots identify a tritium plant; a square identifies a shipyard."
        ],
        "tutorial:first-protected-branch"
      );
      beginTutorialProductiveBurnPrompt(destinationNodeId);
      return;
    }

    appendTutorialRows(
      [
        ...getTutorialBarrenLessonRows(),
        "Three dots identify a tritium plant; a square identifies a shipyard."
      ],
      "tutorial:first-barren-branch"
    );

    beginTutorialProductiveBurnPrompt(destinationNodeId);
  }

  function isTutorialProtectedInterdictionNode(nodeId: string): boolean {
    const node = content.nodes.find((candidate) => candidate.id === nodeId);
    return (
      node?.type === "protected" || node?.protectedNoWar === true || isEarthOrMoonNodeId(nodeId)
    );
  }

  function isEarthOrMoonNodeId(nodeId: string): boolean {
    return nodeId === "earth_node" || nodeId === "moon_node";
  }

  function beginTutorialProductiveBurnPrompt(originNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "awaitingProductiveBurnPreview";
    tutorial.productiveBurnOriginNodeId = originNodeId;
    tutorial.productiveBurnDestinationNodeId = null;
    tutorial.productiveBurnArrivalTurn = null;
    tutorial.productiveBurnPromptStartedAt = performance.now();
    tutorial.productiveBurnReselectionStartedAt = null;
    lastPlayerNodeSelectionAt = tutorial.productiveBurnPromptStartedAt;
    hasConfirmedPlayerOrderAfterSelection = false;

    updateInteractionLocks();
    updateCommandConsole();
  }

  function unlockTutorialForManualInteraction(tutorial: TutorialRuntimeState): void {
    tutorial.inputLocked = false;
    tutorial.autoAdvanceActive = false;
  }

  function beginTutorialFirstTritiumExecuteGate(
    tritiumNodeId: string,
    continuation: TutorialTritiumLessonContinuation
  ): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    tutorial.phase = "tritiumArrivalExecute";
    tutorial.productiveBurnOriginNodeId = tritiumNodeId;
    tutorial.productiveBurnDestinationNodeId = null;
    tutorial.productiveBurnArrivalTurn = null;
    tutorial.productiveBurnPromptStartedAt = null;
    tutorial.productiveBurnReselectionStartedAt = null;
    tutorial.tritiumLessonContinuation = continuation;
    focusTutorialArrivalTarget(`node:${tritiumNodeId}`);
    beginTutorialFirstTritiumPostExecuteLesson();
  }

  async function startTutorialFirstTritiumPostArrivalWorkTurn(
    tritiumNodeId: string,
    continuation: TutorialTritiumLessonContinuation
  ): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    tutorial.phase = "awaitingFirstTritiumWorkTurn";
    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = true;
    focusTutorialArrivalTarget(`node:${tritiumNodeId}`);
    updateInteractionLocks();
    updateTutorialCommandConsoleWithTypewriter();

    try {
      await resolveTutorialAutoFramedTurn();
    } finally {
      if (tutorialState === tutorial) {
        tutorial.inputLocked = false;
        tutorial.autoAdvanceActive = false;

        if (tutorial.phase === "awaitingFirstTritiumWorkTurn") {
          beginTutorialFirstTritiumExecuteGate(tritiumNodeId, continuation);
        } else {
          updateInteractionLocks();
          updateTutorialCommandConsoleWithTypewriter();
        }
      }
    }
  }

  function beginTutorialFirstTritiumPostExecuteLesson(): void {
    const tutorial = tutorialState;
    const originNodeId = tutorial?.productiveBurnOriginNodeId;

    if (tutorial === null || tutorial.phase !== "tritiumArrivalExecute" || originNodeId == null) {
      return;
    }

    const continuation = tutorial.tritiumLessonContinuation ?? "productiveBurnPrompt";
    tutorial.tritiumLessonContinuation = null;
    frameTutorialNodeShipCloseup(originNodeId);
    appendTutorialFirstTritiumLesson(originNodeId);

    if (continuation === "evadeSetup") {
      tutorial.phase = "mandatoryLaunchQueued";
      void startTutorialEvadeLesson();
      return;
    }

    if (continuation === "evadeImpact") {
      tutorial.phase = "autoAdvancingToEvadeImpact";
      if (tutorial.evadeLessonMissileTargetNodeId !== null) {
        focusTutorialArrivalTarget(`node:${tutorial.evadeLessonMissileTargetNodeId}`);
      }
      updateInteractionLocks();
      updateCommandConsole();
      void continueTutorialToEvadeImpact();
      return;
    }

    if (continuation === "shipyardEnemyFlow") {
      updateInteractionLocks();
      updateCommandConsole();
      void resumeTutorialShipyardEnemyFlowAfterPause();
      return;
    }

    if (continuation === "shipyardContestedRecovery") {
      tutorial.phase = "shipyardContestedBurnQueued";
      updateInteractionLocks();
      updateCommandConsole();
      void continueTutorialAfterShipyardContestedBurn();
      return;
    }

    beginTutorialProductiveBurnPrompt(originNodeId);
  }

  function appendTutorialFirstTritiumLesson(tritiumNodeId: string): void {
    markTutorialTritiumIntroduced(tritiumNodeId);
    appendTutorialTimelineRows(
      [
        {
          parts: [
            {
              text: "Fusion torch drives consume tritium to sustain acceleration, so every faction depends on a continuing fuel cycle."
            }
          ],
          className: "command-console__line--tutorial"
        },
        createTutorialSpacerRow("tutorial:first-tritium-branch:rule-spacer"),
        {
          parts: [
            {
              text: "A ship that begins the turn at a tritium plant produces +2 ΔV if it remains eligible to WORK. It produces nothing if it "
            },
            { text: "BURN", className: getCommandFactionClass("player") },
            { text: "s" },
            { text: ", " },
            { text: "FIRE", className: getCommandFactionClass("player") },
            { text: "s" },
            { text: ", " },
            { text: "EVADE", className: getCommandFactionClass("player") },
            { text: "s" },
            { text: " or becomes CONTESTED." }
          ],
          className: "command-console__line--tutorial"
        },
        {
          parts: [
            {
              text: "Protecting this worker for three turns would produce 6 ΔV, so leaving the plant has an economic cost even when the BURN itself is cheap."
            }
          ],
          className: "command-console__line--tutorial"
        },
        {
          parts: [{ text: "A square identifies a shipyard orbit." }],
          className: "command-console__line--tutorial"
        }
      ],
      "tutorial:first-tritium-branch"
    );
  }

  function markTutorialTritiumIntroduced(tritiumNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    if (tutorial.tritiumAnchorNodeId === null) {
      tutorial.tritiumAnchorNodeId = tritiumNodeId;
    }
  }

  function hasTutorialIntroducedTritium(tutorial: TutorialRuntimeState): boolean {
    return (
      tutorial.tritiumAnchorNodeId !== null ||
      tutorial.loggedKeys.has("tutorial:first-tritium-branch") ||
      tutorial.loggedKeys.has("tutorial:productive-tritium-branch")
    );
  }

  function beginProductiveNodeBranch(destinationNodeId: string): void {
    const tutorial = tutorialState;
    const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);

    if (tutorial === null) {
      return;
    }

    if (destinationNode?.type === "shipyard") {
      if (tutorial.shipyardContestedRecoveryActive) {
        void startTutorialSupportShipyardArrivalWorkSequence(destinationNodeId);
        return;
      }

      void startTutorialShipyardArrivalWorkSequence(destinationNodeId, false);
      return;
    }

    if (destinationNode?.type === "tritium") {
      if (!hasTutorialIntroducedTritium(tutorial)) {
        void startTutorialFirstTritiumPostArrivalWorkTurn(
          destinationNodeId,
          "productiveBurnPrompt"
        );
        return;
      }

      beginTutorialProductiveBurnPrompt(destinationNodeId);
      return;
    }

    if (isTutorialProtectedInterdictionNode(destinationNodeId)) {
      appendTutorialRows(
        getTutorialProtectedInterdictionLessonRows(),
        `tutorial:protected-interdiction:${destinationNodeId}`
      );
    } else if (destinationNode?.type === "barren") {
      appendTutorialRows(
        getTutorialBarrenLessonRows(),
        `tutorial:barren-node:${destinationNodeId}`
      );
    }

    beginTutorialProductiveBurnPrompt(destinationNodeId);
  }

  function getTutorialBarrenLessonRows(): readonly string[] {
    const tutorial = tutorialState;

    if (tutorial !== null) {
      tutorial.hasIntroducedBarren = true;
    }

    return [
      "Barren orbits produce no tritium and contain no shipyard.",
      "They still matter when their timing, route access or firing angle justifies the transfer cost."
    ];
  }

  async function startTutorialShipyardArrivalWorkSequence(
    shipyardNodeId: string,
    requiresTrainingShip: boolean
  ): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    tutorial.phase = "shipyardArrivalWork";
    tutorial.shipyardLessonNodeId = shipyardNodeId;

    if (requiresTrainingShip || !hasFactionShipAtNode(state, shipyardNodeId, "player")) {
      state = withTutorialOccupancy(state, shipyardNodeId, "player", 1);
      appendTutorialRows(
        [
          `A friendly ship is now online at ${formatNodeName(content, shipyardNodeId)}.`,
          "It has been assigned to shipyard operations and will WORK automatically while it remains eligible."
        ],
        "tutorial:shipyard-training-ship"
      );
    }

    state = withTutorialShipyardProgress(state, shipyardNodeId, 0);
    snapshot = createSolarSystemSnapshot(content, state);
    frameTutorialShipyardProductionArrival(shipyardNodeId);
    updateInteractionLocks();
    updateCommandConsole();

    await tutorialAutoResolveTurn();

    if (tutorialState !== tutorial || tutorial.phase !== "shipyardArrivalWork") {
      return;
    }

    focusTutorialTurnSkipArrivalNode(shipyardNodeId);
    beginTutorialShipyardProductionLesson(shipyardNodeId);
  }

  function beginTutorialShipyardProductionLesson(shipyardNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "shipyardProduction";
    tutorial.shipyardLessonNodeId = shipyardNodeId;
    frameTutorialNodeShipCloseup(shipyardNodeId);
    appendTutorialTimelineRows(
      createTutorialShipyardProductionRows(getCommandFactionClass("player")),
      "tutorial:shipyard-production-manual-execute"
    );
    updateInteractionLocks();
    updateCommandConsole();
  }

  async function autoAdvanceTutorialShipyardProductionToCompletion(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "shipyardProductionCompletion") {
      return;
    }

    await autoAdvanceTutorialUntil(
      "shipyard-production",
      () => state.mandatoryLaunches.some((launch) => launch.factionId === "player"),
      7
    );

    if (
      tutorialState === tutorial &&
      tutorial.phase === "shipyardProductionCompletion" &&
      state.mandatoryLaunches.some((launch) => launch.factionId === "player")
    ) {
      completeTutorialShipyardProductionLesson();
    }
  }

  async function startTutorialSupportShipyardArrivalWorkSequence(
    shipyardNodeId: string
  ): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    tutorial.phase = "shipyardSupportProduction";
    tutorial.shipyardSupportProductionNodeId = shipyardNodeId;
    if (!state.shipyardProgress.some((entry) => entry.nodeId === shipyardNodeId)) {
      state = withTutorialShipyardProgress(state, shipyardNodeId, 0);
    }
    snapshot = createSolarSystemSnapshot(content, state);
    frameTutorialShipyardProductionArrival(shipyardNodeId);
    updateInteractionLocks();
    updateCommandConsole();

    await tutorialAutoResolveTurn();

    if (tutorialState !== tutorial || tutorial.phase !== "shipyardSupportProduction") {
      return;
    }

    unlockTutorialForManualInteraction(tutorial);
    focusTutorialTurnSkipArrivalNode(shipyardNodeId);
    frameTutorialNodeShipCloseup(shipyardNodeId);
    appendTutorialTimelineRows(
      createTutorialShipyardProductionRows(getCommandFactionClass("player")),
      `tutorial:shipyard-support-production:${shipyardNodeId}`
    );
    updateInteractionLocks();
    updateCommandConsole();
  }

  async function autoAdvanceTutorialSupportShipyardProductionToCompletion(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "shipyardSupportProductionCompletion") {
      return;
    }

    await autoAdvanceTutorialUntil(
      "shipyard-support-production",
      () => state.mandatoryLaunches.some((launch) => launch.factionId === "player"),
      7
    );

    if (
      tutorialState === tutorial &&
      tutorial.phase === "shipyardSupportProductionCompletion" &&
      state.mandatoryLaunches.some((launch) => launch.factionId === "player")
    ) {
      beginTutorialMandatoryLaunchLesson(tutorial);
    }
  }

  function completeTutorialShipyardProductionLesson(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "shipyardProductionCompletion") {
      return;
    }

    beginTutorialMandatoryLaunchLesson(tutorial);
  }

  function beginTutorialMandatoryLaunchLesson(tutorial: TutorialRuntimeState): void {
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (mandatoryLaunch === undefined) {
      return;
    }

    tutorial.mandatoryLaunchResumePhase = getTutorialMandatoryLaunchResumePhase(
      tutorial.phase,
      tutorial.mandatoryLaunchResumePhase
    );
    tutorial.activeMandatoryLaunchId = mandatoryLaunch.id;
    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "mandatoryLaunch";
    const forcedTutorialDestinationNodeId = getTutorialForcedMandatoryLaunchDestinationNodeId(
      mandatoryLaunch.nodeId
    );
    const mandatoryLaunchRows = createTutorialMandatoryLaunchRows(
      getCommandFactionClass("player"),
      forcedTutorialDestinationNodeId !== null
    );

    appendTutorialTimelineRows(mandatoryLaunchRows, "tutorial:mandatory-launch-rule");
    syncMandatoryLaunchFocus();
    updateInteractionLocks();
    updateCommandConsole();
  }

  function beginTutorialMandatoryLaunchLessonIfActive(): boolean {
    const tutorial = tutorialState;

    if (tutorial === null || getNextPlayerMandatoryLaunch() === undefined) {
      return false;
    }

    beginTutorialMandatoryLaunchLesson(tutorial);
    return true;
  }

  type TutorialEvadeFireSetup = Readonly<{
    targetNodeId: string;
    enemyNodeId: string;
    plan: FirePlan;
  }>;

  type TutorialShipyardFireSetup = Readonly<{
    enemyOriginNodeId: string;
    enemyDestinationNodeId: string;
    enemyBurnPlan: BurnPlan;
    enemyActiveTransit: ActiveBurnTransit;
    playerFirePlan: FirePlan;
    returnBurnPlan: BurnPlan;
    destinationType: SolarSystemData["nodes"][number]["type"];
    nearbyEtaTurns: number;
  }>;

  function findTutorialShipyardFireSetup(shipyardNodeId: string): TutorialShipyardFireSetup | null {
    const occupiedNodeIds = new Set(
      state.nodeOccupancies
        .filter((occupancy) => occupancy.shipCount > 0)
        .map((occupancy) => occupancy.nodeId)
    );
    const candidates: TutorialShipyardFireSetup[] = [];

    for (const destinationNode of content.nodes) {
      if (
        destinationNode.id === shipyardNodeId ||
        occupiedNodeIds.has(destinationNode.id) ||
        (destinationNode.type !== "barren" && destinationNode.type !== "tritium") ||
        !isTutorialFireRouteNode(destinationNode.id)
      ) {
        continue;
      }

      const nearbyPlan = calculateBurnPlan(content, state, shipyardNodeId, destinationNode.id);

      if (nearbyPlan === null) {
        continue;
      }

      for (const originNode of content.nodes) {
        if (
          originNode.id === shipyardNodeId ||
          originNode.id === destinationNode.id ||
          occupiedNodeIds.has(originNode.id) ||
          !isTutorialFireRouteNode(originNode.id)
        ) {
          continue;
        }

        const opponentBaseState = ensureTutorialOpponentFaction(state);
        const enemyDepartureTurn = Math.max(0, state.turn - 2);
        const enemyPlanningState = withTutorialOccupancy(
          {
            ...opponentBaseState,
            turn: enemyDepartureTurn
          },
          originNode.id,
          "opponent",
          1
        );
        const enemyBurnState = applyCommand(
          enemyPlanningState,
          {
            type: "ASSIGN_BURN_ORDER",
            factionId: "opponent",
            originNodeId: originNode.id,
            destinationNodeId: destinationNode.id
          },
          content
        );
        const enemyBurnPlan = enemyBurnState.pendingBurnOrders.find((order) => {
          return (
            order.originNodeId === originNode.id &&
            order.destinationNodeId === destinationNode.id &&
            order.factionId === "opponent"
          );
        });

        if (enemyBurnPlan === undefined) {
          continue;
        }

        if (enemyBurnPlan.arrivalTurn <= state.turn) {
          continue;
        }

        const enemyActiveTransit: ActiveBurnTransit = {
          ...enemyBurnPlan,
          departedTurn: enemyBurnPlan.issuedTurn
        };
        const enemyTransitState: GameState = {
          ...opponentBaseState,
          factionDv: {
            ...opponentBaseState.factionDv,
            opponent: Math.max(
              0,
              getFactionDv(opponentBaseState, "opponent") - enemyBurnPlan.burnCost
            )
          },
          nodeOccupancies: opponentBaseState.nodeOccupancies.filter((occupancy) => {
            return !(occupancy.nodeId === originNode.id && occupancy.factionId === "opponent");
          }),
          pendingBurnOrders: opponentBaseState.pendingBurnOrders.filter((order) => {
            return order.id !== enemyBurnPlan.id;
          }),
          activeBurnTransits: [
            ...opponentBaseState.activeBurnTransits.filter((transit) => {
              return transit.id !== enemyBurnPlan.id;
            }),
            enemyActiveTransit
          ]
        };
        const playerFireState = applyCommand(
          enemyTransitState,
          {
            type: "ASSIGN_FIRE_ORDER",
            originNodeId: shipyardNodeId,
            targetNodeId: destinationNode.id
          },
          content
        );
        const playerFirePlan = playerFireState.pendingFireOrders.find((order) => {
          return (
            order.originNodeId === shipyardNodeId &&
            order.targetNodeId === destinationNode.id &&
            order.factionId === "player" &&
            order.targetFactionId === "opponent"
          );
        });

        if (
          playerFirePlan === undefined ||
          playerFirePlan.impactTurn <= enemyActiveTransit.arrivalTurn
        ) {
          continue;
        }

        const returnPlanningState = {
          ...enemyTransitState,
          turn: playerFirePlan.impactTurn
        };
        const returnBurnPlan = calculateBurnPlan(
          content,
          returnPlanningState,
          destinationNode.id,
          shipyardNodeId
        );

        if (returnBurnPlan === null) {
          continue;
        }

        const opponentBudgetNeeded =
          enemyBurnPlan.burnCost + tutorialEvadeDvCost + returnBurnPlan.burnCost;

        if (opponentBudgetNeeded > getFactionDv(opponentBaseState, "opponent")) {
          continue;
        }

        candidates.push({
          enemyOriginNodeId: originNode.id,
          enemyDestinationNodeId: destinationNode.id,
          enemyBurnPlan,
          enemyActiveTransit,
          playerFirePlan,
          returnBurnPlan,
          destinationType: destinationNode.type,
          nearbyEtaTurns: nearbyPlan.etaTurns
        });
      }
    }

    candidates.sort((first, second) => {
      const firstScore = getTutorialShipyardFireSetupScore(first);
      const secondScore = getTutorialShipyardFireSetupScore(second);

      if (firstScore !== secondScore) {
        return firstScore - secondScore;
      }

      if (first.enemyDestinationNodeId !== second.enemyDestinationNodeId) {
        return first.enemyDestinationNodeId.localeCompare(second.enemyDestinationNodeId);
      }

      return first.enemyOriginNodeId.localeCompare(second.enemyOriginNodeId);
    });

    return candidates[0] ?? null;
  }

  function isTutorialFireRouteNode(nodeId: string): boolean {
    return !isTutorialProtectedInterdictionNode(nodeId);
  }

  function getTutorialShipyardFireSetupScore(setup: TutorialShipyardFireSetup): number {
    const nearbyPenalty = setup.nearbyEtaTurns <= 2 ? setup.nearbyEtaTurns * 2 : 24;
    const enemyEtaPenalty =
      setup.enemyBurnPlan.etaTurns >= 2 && setup.enemyBurnPlan.etaTurns <= 4
        ? Math.abs(setup.enemyBurnPlan.etaTurns - 3) * 4
        : 80 + Math.abs(setup.enemyBurnPlan.etaTurns - 3) * 10;
    const fireEtaPenalty =
      setup.playerFirePlan.missileEtaTurns >= 2 && setup.playerFirePlan.missileEtaTurns <= 4
        ? Math.abs(setup.playerFirePlan.missileEtaTurns - 3) * 3
        : 40 + Math.abs(setup.playerFirePlan.missileEtaTurns - 3) * 8;
    const destinationTypePenalty = setup.destinationType === "barren" ? 0 : 6;
    const returnEtaPenalty = Math.abs(setup.returnBurnPlan.etaTurns - 2) * 3;

    return (
      destinationTypePenalty +
      nearbyPenalty +
      enemyEtaPenalty +
      fireEtaPenalty +
      returnEtaPenalty +
      setup.enemyBurnPlan.burnCost +
      setup.returnBurnPlan.burnCost
    );
  }

  async function startTutorialShipyardFirePressure(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "shipyardProduction") {
      return;
    }

    const shipyardNodeId = tutorial.shipyardLessonNodeId;
    const setup = findTutorialShipyardFireSetup(shipyardNodeId);

    if (setup === null) {
      tutorial.phase = "shipyardProductionCompletion";
      updateInteractionLocks();
      updateCommandConsole();
      await autoAdvanceTutorialShipyardProductionToCompletion();
      return;
    }

    state = ensureTutorialOpponentFaction(state);
    state = {
      ...state,
      factionDv: {
        ...state.factionDv,
        opponent: Math.max(0, getFactionDv(state, "opponent") - setup.enemyBurnPlan.burnCost)
      },
      nodeOccupancies: state.nodeOccupancies.filter((occupancy) => {
        return !(
          occupancy.nodeId === setup.enemyOriginNodeId && occupancy.factionId === "opponent"
        );
      }),
      pendingBurnOrders: state.pendingBurnOrders.filter((order) => {
        return order.id !== setup.enemyActiveTransit.id;
      }),
      activeBurnTransits: [
        ...state.activeBurnTransits.filter((transit) => {
          return transit.id !== setup.enemyActiveTransit.id;
        }),
        setup.enemyActiveTransit
      ]
    };

    snapshot = createSolarSystemSnapshot(content, state);
    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "shipyardFirePrompt";
    tutorial.enemyNodeId = setup.enemyDestinationNodeId;
    tutorial.shipyardEnemyOriginNodeId = setup.enemyOriginNodeId;
    tutorial.shipyardEnemyDestinationNodeId = setup.enemyDestinationNodeId;
    tutorial.shipyardEnemyFireImpactTurn = null;
    tutorial.shipyardEnemyEvadeObserved = false;
    tutorial.shipyardEnemyReturnArrivalTurn = null;
    tutorial.shipyardFirePromptStartedAt = performance.now();
    frameTutorialShipyardFireSetup(shipyardNodeId);
    appendTutorialShipyardFirePromptRows();
    redraw();
  }

  function appendTutorialShipyardFirePromptRows(): void {
    appendTutorialTimelineRows(
      createTutorialShipyardFirePromptRows(),
      "tutorial:shipyard-fire-destination-target"
    );
  }

  async function continueTutorialToShipyardEnemyEvadeOrMandatoryLaunch(): Promise<void> {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "autoAdvancingToShipyardEnemyEvade" ||
      tutorial.shipyardEnemyDestinationNodeId === null
    ) {
      return;
    }

    for (let index = 0; index < 10; index += 1) {
      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardEnemyEvade") {
        return;
      }

      if (observeTutorialShipyardEnemyEvade()) {
        presentTutorialShipyardEnemyEvadeLessonOrContinue();
        return;
      }

      if (maybePauseTutorialShipyardFlowForMandatoryLaunch()) {
        return;
      }

      if (maybePauseTutorialShipyardFlowForFirstTritiumArrival()) {
        return;
      }

      if (observeTutorialShipyardEnemyEvade()) {
        presentTutorialShipyardEnemyEvadeLessonOrContinue();
        return;
      }

      frameTutorialShipyardEnemyDestination();
      await tutorialAutoResolveTurn();

      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardEnemyEvade") {
        return;
      }

      frameTutorialShipyardEnemyDestination();

      if (maybePauseTutorialShipyardFlowForMandatoryLaunch()) {
        return;
      }

      if (maybePauseTutorialShipyardFlowForFirstTritiumArrival()) {
        return;
      }

      if (observeTutorialShipyardEnemyEvade()) {
        presentTutorialShipyardEnemyEvadeLessonOrContinue();
        return;
      }
    }

    if (tutorialState === tutorial && tutorial.phase === "autoAdvancingToShipyardEnemyEvade") {
      if (observeTutorialShipyardEnemyEvade()) {
        presentTutorialShipyardEnemyEvadeLessonOrContinue();
        return;
      }

      recoverTutorialShipyardFirePromptAfterMissedEvade(tutorial);
    }
  }

  function observeTutorialShipyardEnemyEvade(): boolean {
    const tutorial = tutorialState;
    const destinationNodeId = tutorial?.shipyardEnemyDestinationNodeId;

    if (tutorial === null || destinationNodeId === null || destinationNodeId === undefined) {
      return false;
    }

    if (tutorial.shipyardEnemyEvadeObserved) {
      return true;
    }

    const hasEvadeEvent = getTutorialTurnEvents(snapshot).some((event) => {
      return (
        event.type === "EVADE" &&
        event.factionId === "opponent" &&
        event.nodeId === destinationNodeId
      );
    });

    if (hasEvadeEvent) {
      tutorial.shipyardEnemyEvadeObserved = true;
      return true;
    }

    return false;
  }

  function recoverTutorialShipyardFirePromptAfterMissedEvade(tutorial: TutorialRuntimeState): void {
    const destinationNodeId = tutorial.shipyardEnemyDestinationNodeId;

    if (
      destinationNodeId === null ||
      !hasFactionShipAtNode(state, destinationNodeId, "opponent") ||
      hasPlayerFireSolutionTargetingOpponentNode(destinationNodeId)
    ) {
      updateInteractionLocks();
      updateCommandConsole();
      return;
    }

    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "shipyardFirePrompt";
    tutorial.shipyardEnemyFireImpactTurn = null;
    tutorial.shipyardEnemyEvadeObserved = false;
    tutorial.shipyardFirePromptStartedAt = performance.now();
    frameTutorialShipyardFireRetryPrompt();
    updateInteractionLocks();
    updateCommandConsole();
  }

  function frameTutorialShipyardFireRetryPrompt(): void {
    frameTutorialShipyardFireSelectionWide();
  }

  function hasPlayerFireSolutionTargetingOpponentNode(nodeId: string): boolean {
    return (
      state.pendingFireOrders.some((order) => {
        return (
          order.factionId === "player" &&
          order.targetFactionId === "opponent" &&
          order.targetNodeId === nodeId
        );
      }) ||
      state.activeMissiles.some((missile) => {
        return (
          missile.factionId === "player" &&
          missile.targetFactionId === "opponent" &&
          missile.targetNodeId === nodeId
        );
      })
    );
  }

  function presentTutorialShipyardEnemyEvadeLessonOrContinue(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    tutorial.shipyardEnemyEvadeObserved = true;

    if (!tutorial.loggedKeys.has("tutorial:shipyard-enemy-evade")) {
      presentTutorialShipyardEnemyEvadeLesson(tutorial);
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardEnemyArrival";
    updateInteractionLocks();
    updateCommandConsole();
    void continueTutorialShipyardEnemyArrivalOrMandatoryLaunch();
  }

  function presentTutorialShipyardEnemyEvadeLesson(tutorial: TutorialRuntimeState): void {
    if (tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "shipyardEnemyEvadeLesson";
    selectTutorialTarget(`node:${tutorial.shipyardEnemyDestinationNodeId}`);
    appendTutorialTimelineRows(
      [
        {
          parts: [
            { text: "When a missile reaches a non-contested ship, it automatically attempts to " },
            { text: "EVADE", className: getCommandFactionClass("opponent") },
            {
              text: " with its hard-kill defenses. The faction pays 1 ΔV for each missile impacting that ship in the turn."
            }
          ],
          className: "command-console__line--tutorial"
        },
        {
          parts: [
            { text: "A ship cannot " },
            { text: "EVADE", className: getCommandFactionClass("opponent") },
            { text: " and " },
            { text: "WORK", className: getCommandFactionClass("opponent") },
            {
              text: " in the same turn, so FIRE can deny production even when the target survives."
            }
          ],
          className: "command-console__line--tutorial"
        }
      ],
      "tutorial:shipyard-enemy-evade"
    );

    if (beginTutorialMandatoryLaunchLessonIfActive()) {
      return;
    }

    updateInteractionLocks();
    updateCommandConsole();
    redraw();
  }

  async function continueTutorialShipyardEnemyArrivalOrMandatoryLaunch(): Promise<void> {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.shipyardEnemyDestinationNodeId === null ||
      (tutorial.phase !== "autoAdvancingToShipyardEnemyArrival" &&
        tutorial.phase !== "autoAdvancingToShipyardEnemyEvade" &&
        tutorial.phase !== "mandatoryLaunchQueued")
    ) {
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardEnemyArrival";

    for (let index = 0; index < 10; index += 1) {
      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardEnemyArrival") {
        return;
      }

      if (hasFactionShipAtNode(state, tutorial.shipyardEnemyDestinationNodeId, "opponent")) {
        focusTutorialTurnSkipArrivalNode(tutorial.shipyardEnemyDestinationNodeId);
        await startTutorialShipyardEnemyContestedApproach();
        return;
      }

      if (maybePauseTutorialShipyardFlowForMandatoryLaunch()) {
        return;
      }

      if (maybePauseTutorialShipyardFlowForFirstTritiumArrival()) {
        return;
      }

      frameTutorialShipyardEnemyDestination();
      await tutorialAutoResolveTurn();
    }

    if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardEnemyArrival") {
      return;
    }

    if (hasFactionShipAtNode(state, tutorial.shipyardEnemyDestinationNodeId, "opponent")) {
      focusTutorialTurnSkipArrivalNode(tutorial.shipyardEnemyDestinationNodeId);
      await startTutorialShipyardEnemyContestedApproach();
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardEnemyEvade";
    await continueTutorialToShipyardEnemyEvadeOrMandatoryLaunch();
  }

  async function startTutorialShipyardEnemyContestedApproach(): Promise<void> {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      tutorial.phase !== "autoAdvancingToShipyardEnemyArrival" ||
      !prepareTutorialShipyardEnemyReturnBurn()
    ) {
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardContestedBurn";
    await continueTutorialShipyardEnemyContestedApproach();
  }

  function prepareTutorialShipyardEnemyReturnBurn(): boolean {
    const tutorial = tutorialState;
    const enemyDestinationNodeId = tutorial?.shipyardEnemyDestinationNodeId;
    const shipyardNodeId = tutorial?.shipyardLessonNodeId;

    if (
      tutorial === null ||
      enemyDestinationNodeId === null ||
      enemyDestinationNodeId === undefined ||
      shipyardNodeId === undefined
    ) {
      return false;
    }

    const existingReturnOrder = state.pendingBurnOrders.find((order) => {
      return (
        order.factionId === "opponent" &&
        order.originNodeId === enemyDestinationNodeId &&
        order.destinationNodeId === shipyardNodeId
      );
    });

    if (existingReturnOrder !== undefined) {
      tutorial.shipyardEnemyReturnArrivalTurn = existingReturnOrder.arrivalTurn;
      return true;
    }

    const existingReturnTransit = state.activeBurnTransits.find((transit) => {
      return (
        transit.factionId === "opponent" &&
        transit.originNodeId === enemyDestinationNodeId &&
        transit.destinationNodeId === shipyardNodeId
      );
    });

    if (existingReturnTransit !== undefined) {
      tutorial.shipyardEnemyReturnArrivalTurn = existingReturnTransit.arrivalTurn;
      return true;
    }

    if (!hasFactionShipAtNode(state, enemyDestinationNodeId, "opponent")) {
      return false;
    }

    const returnPlan = calculateBurnPlan(content, state, enemyDestinationNodeId, shipyardNodeId);

    if (returnPlan === null) {
      return false;
    }

    const opponentDv = getFactionDv(state, "opponent");

    if (returnPlan.burnCost > opponentDv) {
      state = withTutorialFactionDv(state, "opponent", returnPlan.burnCost);
    }

    state = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        factionId: "opponent",
        originNodeId: enemyDestinationNodeId,
        destinationNodeId: shipyardNodeId
      },
      content
    );
    const returnOrder = getPendingBurnOrder(enemyDestinationNodeId, "opponent");

    if (returnOrder === undefined) {
      return false;
    }

    snapshot = createSolarSystemSnapshot(content, state);
    tutorial.shipyardEnemyReturnArrivalTurn = returnOrder.arrivalTurn;
    return true;
  }

  async function continueTutorialShipyardEnemyContestedApproach(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    if (!prepareTutorialShipyardEnemyReturnBurn()) {
      tutorial.phase = "shipyardProductionCompletion";
      await autoAdvanceTutorialShipyardProductionToCompletion();
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardContestedBurn";
    frameTutorialShipyardContestedApproach();

    const returnArrivalTurn =
      tutorial.shipyardEnemyReturnArrivalTurn ??
      state.pendingBurnOrders.find((order) => {
        return (
          order.factionId === "opponent" &&
          order.destinationNodeId === tutorial.shipyardLessonNodeId
        );
      })?.arrivalTurn ??
      state.activeBurnTransits.find((transit) => {
        return (
          transit.factionId === "opponent" &&
          transit.destinationNodeId === tutorial.shipyardLessonNodeId
        );
      })?.arrivalTurn ??
      state.turn + 8;
    const remainingReturnTurns = Math.max(1, Math.min(12, returnArrivalTurn - state.turn + 2));

    for (let index = 0; index < remainingReturnTurns; index += 1) {
      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardContestedBurn") {
        return;
      }

      if (isTutorialShipyardContestedByPlayerAndOpponent(tutorial)) {
        focusTutorialTurnSkipArrivalNode(tutorial.shipyardLessonNodeId);
        presentTutorialShipyardContestedBurnPrompt();
        return;
      }

      if (maybePauseTutorialShipyardFlowForMandatoryLaunch()) {
        return;
      }

      if (maybePauseTutorialShipyardFlowForFirstTritiumArrival()) {
        return;
      }

      await tutorialAutoResolveTurn();

      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardContestedBurn") {
        return;
      }

      if (isTutorialShipyardContestedByPlayerAndOpponent(tutorial)) {
        focusTutorialTurnSkipArrivalNode(tutorial.shipyardLessonNodeId);
        presentTutorialShipyardContestedBurnPrompt();
        return;
      }

      frameTutorialShipyardContestedApproach();
    }

    if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToShipyardContestedBurn") {
      return;
    }

    if (isTutorialShipyardContestedByPlayerAndOpponent(tutorial)) {
      focusTutorialTurnSkipArrivalNode(tutorial.shipyardLessonNodeId);
      presentTutorialShipyardContestedBurnPrompt();
      return;
    }

    if (hasFactionShipAtNode(state, tutorial.shipyardLessonNodeId, "player")) {
      state = withTutorialOccupancy(state, tutorial.shipyardLessonNodeId, "opponent", 1);
      snapshot = createSolarSystemSnapshot(content, state);
      focusTutorialTurnSkipArrivalNode(tutorial.shipyardLessonNodeId);
      presentTutorialShipyardContestedBurnPrompt();
      return;
    }

    tutorial.phase = "complete";
    completeTutorialGuidedSegment();
  }

  function isNodeContestedByPlayerAndOpponent(nodeId: string): boolean {
    return (
      hasFactionShipAtNode(state, nodeId, "player") &&
      hasFactionShipAtNode(state, nodeId, "opponent")
    );
  }

  function findTutorialPlayerOpponentContestedNodeId(
    tutorial: TutorialRuntimeState
  ): string | null {
    const preferredNodeIds = [
      tutorial.contestedNodeId,
      tutorial.tutorialBurnDestinationNodeId,
      tutorial.shipyardEnemyDestinationNodeId,
      tutorial.shipyardLessonNodeId
    ];

    for (const nodeId of preferredNodeIds) {
      if (nodeId !== null && isNodeContestedByPlayerAndOpponent(nodeId)) {
        return nodeId;
      }
    }

    const occupiedNodeIds = new Set(
      state.nodeOccupancies
        .filter((occupancy) => occupancy.shipCount > 0)
        .map((occupancy) => occupancy.nodeId)
    );

    return (
      [...occupiedNodeIds].sort().find((nodeId) => isNodeContestedByPlayerAndOpponent(nodeId)) ??
      null
    );
  }

  function getTutorialShipyardContestedTargetNodeId(tutorial: TutorialRuntimeState): string | null {
    return (
      findTutorialPlayerOpponentContestedNodeId(tutorial) ??
      tutorial.contestedNodeId ??
      tutorial.shipyardLessonNodeId
    );
  }

  function isTutorialShipyardContestedByPlayerAndOpponent(tutorial: TutorialRuntimeState): boolean {
    return findTutorialPlayerOpponentContestedNodeId(tutorial) !== null;
  }

  function isTutorialShipyardContestedCheckpointActive(phase: TutorialPhase): boolean {
    return (
      phase === "shipyardContestedFirePrompt" ||
      phase === "shipyardContestedFireQueued" ||
      phase === "autoAdvancingToShipyardContestedFireImpact" ||
      phase === "shipyardCounterContestBurnPrompt" ||
      phase === "shipyardCounterContestBurnQueued" ||
      phase === "autoAdvancingToShipyardCounterContestArrival" ||
      phase === "shipyardContestedBurnPrompt" ||
      phase === "shipyardContestedBurnQueued" ||
      phase === "complete"
    );
  }

  function maybePresentTutorialShipyardContestedCheckpoint(): boolean {
    const tutorial = tutorialState;

    if (tutorial === null || isTutorialShipyardContestedCheckpointActive(tutorial.phase)) {
      return false;
    }

    if (isTutorialForcedMandatoryLaunchToEnemyShipyardAutoAdvancing(tutorial)) {
      return false;
    }

    const contestedNodeId = findTutorialPlayerOpponentContestedNodeId(tutorial);

    if (contestedNodeId === null) {
      return false;
    }

    tutorial.contestedNodeId = contestedNodeId;

    if (state.mandatoryLaunches.some((launch) => launch.factionId === "player")) {
      tutorial.phase = "shipyardProductionCompletion";
      completeTutorialShipyardProductionLesson();
      return true;
    }

    const supportFireNodeId = findTutorialShipyardContestedSupportFireNodeId(contestedNodeId);

    if (supportFireNodeId !== null) {
      appendTutorialShipyardContestedRuleRows();
      presentTutorialShipyardContestedSupportFirePrompt(tutorial, supportFireNodeId);
      return true;
    }

    tutorial.phase = "autoAdvancingToShipyardContestedBurn";
    presentTutorialShipyardContestedBurnPrompt();
    return true;
  }

  function isTutorialForcedMandatoryLaunchToEnemyShipyardAutoAdvancing(
    tutorial: TutorialRuntimeState
  ): boolean {
    if (
      tutorial.phase !== "mandatoryLaunchQueued" ||
      tutorial.shipyardContestedRecoveryActive !== true
    ) {
      return false;
    }

    const destinationNodeId = recoverTutorialMandatoryLaunchAutoDestination(tutorial);

    if (destinationNodeId === null || tutorial.contestedNodeId !== destinationNodeId) {
      return false;
    }

    if (content.nodes.find((node) => node.id === destinationNodeId)?.type !== "shipyard") {
      return false;
    }

    const hasReachedDestinationDuringAutoAdvance =
      tutorial.autoAdvanceActive &&
      (tutorial.tutorialBurnArrivalTurn === null ||
        state.turn >= tutorial.tutorialBurnArrivalTurn) &&
      hasFactionShipAtNode(state, destinationNodeId, "player");

    return (
      isTutorialBurnStillPendingOrInFlight(tutorial, destinationNodeId) ||
      hasReachedDestinationDuringAutoAdvance
    );
  }

  function appendTutorialShipyardContestedRuleRows(): void {
    appendTutorialTimelineRows(
      createTutorialShipyardContestedRuleRows(getCommandFactionClass("player")),
      "tutorial:shipyard-contested-rule"
    );
  }

  function presentTutorialShipyardContestedBurnPrompt(): void {
    const tutorial = tutorialState;

    if (
      tutorial === null ||
      (tutorial.phase !== "autoAdvancingToShipyardContestedBurn" &&
        tutorial.phase !== "shipyardContestedBurnPrompt")
    ) {
      return;
    }

    unlockTutorialForManualInteraction(tutorial);

    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null) {
      return;
    }

    tutorial.contestedNodeId = contestedNodeId;
    frameTutorialShipyardContestedNodeCloseup(contestedNodeId);

    if (tutorial.phase === "shipyardContestedBurnPrompt") {
      updateInteractionLocks();
      updateCommandConsole();
      redraw();
      return;
    }

    tutorial.phase = "shipyardContestedBurnPrompt";
    tutorial.shipyardContestedPromptStartedAt = performance.now();
    appendTutorialShipyardContestedRuleRows();
    updateInteractionLocks();
    updateCommandConsole();
    redraw();
  }

  function findTutorialShipyardContestedSupportFireNodeId(contestedNodeId: string): string | null {
    const candidates = state.nodeOccupancies
      .filter((occupancy) => {
        return (
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0 &&
          occupancy.nodeId !== contestedNodeId &&
          canTutorialShipyardContestedSupportFireFromNode(occupancy.nodeId, contestedNodeId)
        );
      })
      .flatMap((occupancy) => {
        const plannedState = applyTutorialShipyardContestedSupportFirePlan(
          occupancy.nodeId,
          contestedNodeId
        );
        const order = plannedState?.pendingFireOrders.find((candidate) => {
          return (
            candidate.factionId === "player" &&
            candidate.originNodeId === occupancy.nodeId &&
            candidate.targetNodeId === contestedNodeId &&
            candidate.targetFactionId === "opponent"
          );
        });

        if (order === undefined) {
          return [];
        }

        return [
          {
            nodeId: occupancy.nodeId,
            etaTurns: order.missileEtaTurns
          }
        ];
      })
      .sort((first, second) => {
        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        return first.nodeId.localeCompare(second.nodeId);
      });

    return candidates[0]?.nodeId ?? null;
  }

  function canTutorialShipyardContestedSupportFireFromNode(
    supportNodeId: string,
    contestedNodeId: string
  ): boolean {
    if (
      supportNodeId === contestedNodeId ||
      isSnapshotNodeContested(supportNodeId) ||
      !hasFactionShipAtNode(state, supportNodeId, "player") ||
      calculateFirePlan(content, state, supportNodeId, contestedNodeId) === null
    ) {
      return false;
    }

    return applyTutorialShipyardContestedSupportFirePlan(supportNodeId, contestedNodeId) !== null;
  }

  function applyTutorialShipyardContestedSupportFirePlan(
    supportNodeId: string,
    contestedNodeId: string
  ): GameState | null {
    const plannedState = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        originNodeId: supportNodeId,
        targetNodeId: contestedNodeId
      },
      content
    );
    const order = plannedState.pendingFireOrders.find((candidate) => {
      return (
        candidate.factionId === "player" &&
        candidate.originNodeId === supportNodeId &&
        candidate.targetNodeId === contestedNodeId &&
        candidate.targetFactionId === "opponent"
      );
    });

    return order === undefined ? null : plannedState;
  }

  function resumeTutorialShipyardContestedSupportFireAfterMandatoryLaunch(
    tutorial: TutorialRuntimeState
  ): boolean {
    if (
      tutorial.phase !== "mandatoryLaunchQueued" ||
      tutorial.shipyardContestedRecoveryActive !== true ||
      getNextPlayerMandatoryLaunch() !== undefined
    ) {
      return false;
    }

    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null || !isNodeContestedByPlayerAndOpponent(contestedNodeId)) {
      return false;
    }

    const preferredSupportNodeId = tutorial.shipyardSupportFireNodeId;
    const supportNodeId =
      preferredSupportNodeId !== null &&
      canTutorialShipyardContestedSupportFireFromNode(preferredSupportNodeId, contestedNodeId)
        ? preferredSupportNodeId
        : findTutorialShipyardContestedSupportFireNodeId(contestedNodeId);

    if (supportNodeId === null) {
      return false;
    }

    tutorial.contestedNodeId = contestedNodeId;
    appendTutorialShipyardContestedRuleRows();
    presentTutorialShipyardContestedSupportFirePrompt(tutorial, supportNodeId);
    return true;
  }

  function findTutorialShipyardCounterContestOriginNodeId(contestedNodeId: string): string | null {
    const candidates = state.nodeOccupancies
      .filter((occupancy) => {
        return (
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0 &&
          occupancy.nodeId !== contestedNodeId &&
          !isSnapshotNodeContested(occupancy.nodeId) &&
          hasTutorialAlphaStrikeSupportAfterCounterContest(occupancy.nodeId, contestedNodeId)
        );
      })
      .flatMap((occupancy) => {
        const plan = calculateBurnPlan(content, state, occupancy.nodeId, contestedNodeId);

        if (
          plan === null ||
          plan.burnCost > getProjectedFactionDv(state, "player", occupancy.nodeId)
        ) {
          return [];
        }

        return [
          {
            nodeId: occupancy.nodeId,
            etaTurns: plan.etaTurns,
            burnCost: plan.burnCost
          }
        ];
      })
      .sort((first, second) => {
        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }

        return first.nodeId.localeCompare(second.nodeId);
      });

    return candidates[0]?.nodeId ?? null;
  }

  function hasTutorialAlphaStrikeSupportAfterCounterContest(
    counterContestOriginNodeId: string,
    contestedNodeId: string
  ): boolean {
    return state.nodeOccupancies.some((occupancy) => {
      if (
        occupancy.factionId !== "player" ||
        occupancy.shipCount <= 0 ||
        occupancy.nodeId === contestedNodeId ||
        occupancy.nodeId === counterContestOriginNodeId ||
        isSnapshotNodeContested(occupancy.nodeId)
      ) {
        return false;
      }

      return calculateFirePlan(content, state, occupancy.nodeId, contestedNodeId) !== null;
    });
  }

  function hasTutorialPlayerSupportShipInTransit(contestedNodeId: string): boolean {
    return state.activeBurnTransits.some((transit) => {
      return (
        transit.factionId === "player" &&
        transit.destinationNodeId !== contestedNodeId &&
        transit.arrivalTurn >= state.turn
      );
    });
  }

  function shouldRecoverTutorialTowardAdditionalPlayerShip(
    contestedNodeId: string,
    counterContestOriginNodeId: string | null
  ): boolean {
    return (
      counterContestOriginNodeId === null && !hasTutorialPlayerSupportShipInTransit(contestedNodeId)
    );
  }

  type TutorialSupportShipyardBurnOption = Readonly<{
    originNodeId: string;
    shipyardNodeId: string;
    etaTurns: number;
    burnCost: number;
  }>;

  function isTutorialSupportProductionShipyardDestination(
    originNodeId: string,
    destinationNodeId: string,
    contestedShipyardNodeId: string | null
  ): boolean {
    const destinationNode = content.nodes.find((node) => node.id === destinationNodeId);

    if (destinationNode === undefined) {
      return false;
    }

    return isTutorialSupportProductionDestinationAllowed({
      originNodeId,
      destinationNodeId,
      contestedShipyardNodeId,
      destinationType: destinationNode.type,
      isDestinationContested: isSnapshotNodeContested(destinationNodeId),
      hasOpponentShip: hasFactionShipAtNode(state, destinationNodeId, "opponent"),
      wouldPlayerStack: wouldPlayerStackAtDestination(destinationNodeId)
    });
  }

  function findTutorialSupportShipyardBurnOption(
    contestedNodeId: string
  ): TutorialSupportShipyardBurnOption | null {
    const candidates = state.nodeOccupancies
      .filter((occupancy) => {
        return (
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0 &&
          occupancy.nodeId !== contestedNodeId &&
          !isSnapshotNodeContested(occupancy.nodeId)
        );
      })
      .flatMap((occupancy) => {
        return content.nodes.flatMap((node) => {
          if (
            !isTutorialSupportProductionShipyardDestination(
              occupancy.nodeId,
              node.id,
              contestedNodeId
            )
          ) {
            return [];
          }

          const plan = withBurnAffordability(
            calculateBurnPlan(content, state, occupancy.nodeId, node.id),
            occupancy.nodeId,
            node.id
          );

          if (plan?.isAffordable !== true) {
            return [];
          }

          return [
            {
              originNodeId: occupancy.nodeId,
              shipyardNodeId: node.id,
              etaTurns: plan.etaTurns,
              burnCost: plan.burnCost
            }
          ];
        });
      })
      .sort((first, second) => {
        if (first.etaTurns !== second.etaTurns) {
          return first.etaTurns - second.etaTurns;
        }

        if (first.burnCost !== second.burnCost) {
          return first.burnCost - second.burnCost;
        }

        return first.shipyardNodeId.localeCompare(second.shipyardNodeId);
      });

    return candidates[0] ?? null;
  }

  function findTutorialOccupiedSupportShipyardNodeId(contestedNodeId: string): string | null {
    const candidates = state.nodeOccupancies
      .filter((occupancy) => {
        if (
          occupancy.factionId !== "player" ||
          occupancy.shipCount <= 0 ||
          occupancy.nodeId === contestedNodeId ||
          isSnapshotNodeContested(occupancy.nodeId)
        ) {
          return false;
        }

        return content.nodes.find((node) => node.id === occupancy.nodeId)?.type === "shipyard";
      })
      .sort((first, second) => {
        const firstProgress =
          state.shipyardProgress.find((entry) => entry.nodeId === first.nodeId)?.progress ?? 0;
        const secondProgress =
          state.shipyardProgress.find((entry) => entry.nodeId === second.nodeId)?.progress ?? 0;

        if (firstProgress !== secondProgress) {
          return secondProgress - firstProgress;
        }

        return first.nodeId.localeCompare(second.nodeId);
      });

    return candidates[0]?.nodeId ?? null;
  }

  function recoverTutorialTowardAdditionalPlayerShip(tutorial: TutorialRuntimeState): void {
    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (state.mandatoryLaunches.some((launch) => launch.factionId === "player")) {
      tutorial.phase = "shipyardProductionCompletion";
      completeTutorialShipyardProductionLesson();
      return;
    }

    const occupiedSupportShipyardNodeId = findTutorialOccupiedSupportShipyardNodeId(
      contestedNodeId ?? tutorial.shipyardLessonNodeId
    );

    if (occupiedSupportShipyardNodeId !== null) {
      tutorial.shipyardContestedRecoveryActive = true;
      void startTutorialSupportShipyardArrivalWorkSequence(occupiedSupportShipyardNodeId);
      return;
    }

    const supportShipyardOption = findTutorialSupportShipyardBurnOption(
      contestedNodeId ?? tutorial.shipyardLessonNodeId
    );

    if (supportShipyardOption !== null) {
      unlockTutorialForManualInteraction(tutorial);
      tutorial.phase = "awaitingProductiveBurnPreview";
      tutorial.shipyardContestedRecoveryActive = true;
      tutorial.productiveBurnOriginNodeId = supportShipyardOption.originNodeId;
      tutorial.productiveBurnDestinationNodeId = null;
      tutorial.productiveBurnArrivalTurn = null;
      tutorial.productiveBurnPromptStartedAt = performance.now();
      tutorial.productiveBurnReselectionStartedAt = null;
      lastPlayerNodeSelectionAt = tutorial.productiveBurnPromptStartedAt;
      hasConfirmedPlayerOrderAfterSelection = false;
      selectTutorialTarget(`node:${supportShipyardOption.originNodeId}`);
      appendTutorialTimelineRows(
        [
          {
            parts: [
              { text: "BURN", className: getCommandFactionClass("player") },
              {
                text: " to another shipyard and produce a support ship. The extra hull can create the second firing angle needed to break the contested lock."
              }
            ],
            className: "command-console__line--tutorial"
          }
        ],
        "tutorial:shipyard-support-production-burn"
      );
      updateInteractionLocks();
      updateCommandConsole();
      redraw();
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardContestedBurn";
    presentTutorialShipyardContestedBurnPrompt();
  }

  function presentTutorialShipyardCounterContestBurnPrompt(
    tutorial: TutorialRuntimeState,
    originNodeId: string
  ): void {
    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "shipyardCounterContestBurnPrompt";
    tutorial.shipyardContestedRecoveryActive = false;
    tutorial.shipyardCounterContestOriginNodeId = originNodeId;
    tutorial.shipyardCounterContestArrivalTurn = null;
    tutorial.shipyardContestedPromptStartedAt = performance.now();
    frameTutorialShipyardCounterContestBurnPrompt(originNodeId);
    appendTutorialTimelineRows(
      [
        {
          parts: [
            { text: "BURN", className: getCommandFactionClass("player") },
            { text: " to the enemy shipyard to " },
            { text: "CONTEST", className: "command-console__event-contested" },
            {
              text: " it. The arrival will stop WORK immediately, although your ship cannot produce there until the following turn."
            }
          ],
          className: "command-console__line--tutorial"
        }
      ],
      "tutorial:shipyard-counter-contest-burn"
    );
    updateInteractionLocks();
    updateCommandConsole();
    redraw();
  }

  function presentTutorialShipyardContestedSupportFirePrompt(
    tutorial: TutorialRuntimeState,
    supportNodeId: string
  ): void {
    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null) {
      return;
    }

    unlockTutorialForManualInteraction(tutorial);
    tutorial.phase = "shipyardContestedFirePrompt";
    tutorial.contestedNodeId = contestedNodeId;
    tutorial.shipyardSupportFireNodeId = supportNodeId;
    tutorial.shipyardSupportFirePromptStartedAt = performance.now();
    frameTutorialShipyardContestedSupportFirePrompt(supportNodeId);
    appendTutorialTimelineRows(
      [
        createTutorialSpacerRow("tutorial:shipyard-contested-evade-unavailable:before"),
        {
          parts: [
            { text: "Ships occupying a " },
            { text: "CONTESTED", className: "command-console__event-contested" },
            { text: " orbit cannot " },
            { text: "EVADE", className: getCommandFactionClass("opponent") },
            {
              text: ". They must leave before impact or face the missile without the automatic defense."
            }
          ],
          className: "command-console__line--tutorial"
        },
        createTutorialSpacerRow("tutorial:shipyard-contested-evade-unavailable:after"),
        {
          parts: [
            { text: "FIRE", className: getCommandFactionClass("player") },
            { text: " on the " },
            { text: "CONTESTED", className: "command-console__event-contested" },
            { text: " orbit from this outside support ship. The enemy must either " },
            { text: "BURN", className: getCommandFactionClass("opponent") },
            {
              text: " out before impact or be destroyed, because it cannot EVADE while the lock remains."
            }
          ],
          className: "command-console__line--tutorial"
        }
      ],
      "tutorial:shipyard-contested-support-fire"
    );
    updateInteractionLocks();
    updateCommandConsole();
    redraw();
  }

  async function continueTutorialAfterShipyardContestedBurn(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "shipyardContestedBurnQueued") {
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardContestedSupport";
    tutorial.shipyardContestedRecoveryActive = true;
    updateInteractionLocks();
    updateCommandConsole();

    for (let index = 0; index < 12; index += 1) {
      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "autoAdvancingToShipyardContestedSupport"
      ) {
        return;
      }

      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (contestedNodeId === null) {
        recoverTutorialTowardAdditionalPlayerShip(tutorial);
        return;
      }

      const counterContestOriginNodeId =
        findTutorialShipyardCounterContestOriginNodeId(contestedNodeId);

      if (counterContestOriginNodeId !== null) {
        presentTutorialShipyardCounterContestBurnPrompt(tutorial, counterContestOriginNodeId);
        return;
      }

      if (hasTutorialShipyardEnemyBeenDestroyed()) {
        if (pauseTutorialForFirstEnemyKillReplayCue()) {
          return;
        }

        tutorial.phase = "complete";
        completeTutorialGuidedSegment();
        return;
      }

      if (maybePauseTutorialShipyardFlowForMandatoryLaunch()) {
        return;
      }

      if (maybePauseTutorialShipyardFlowForFirstTritiumArrival()) {
        return;
      }

      if (
        shouldRecoverTutorialTowardAdditionalPlayerShip(contestedNodeId, counterContestOriginNodeId)
      ) {
        recoverTutorialTowardAdditionalPlayerShip(tutorial);
        return;
      }

      frameTutorialShipyardContestedSupportSearch();
      await tutorialAutoResolveTurn();

      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "autoAdvancingToShipyardContestedSupport"
      ) {
        return;
      }

      if (maybePauseTutorialShipyardFlowForMandatoryLaunch()) {
        return;
      }
    }

    if (
      tutorialState !== tutorial ||
      tutorial.phase !== "autoAdvancingToShipyardContestedSupport"
    ) {
      return;
    }

    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null) {
      recoverTutorialTowardAdditionalPlayerShip(tutorial);
      return;
    }

    const fallbackCounterContestOriginNodeId =
      findTutorialShipyardCounterContestOriginNodeId(contestedNodeId);

    if (fallbackCounterContestOriginNodeId !== null) {
      presentTutorialShipyardCounterContestBurnPrompt(tutorial, fallbackCounterContestOriginNodeId);
      return;
    }

    if (hasTutorialPlayerSupportShipInTransit(contestedNodeId)) {
      tutorial.phase = "shipyardContestedBurnQueued";
      void continueTutorialAfterShipyardContestedBurn();
      return;
    }

    recoverTutorialTowardAdditionalPlayerShip(tutorial);
  }

  async function continueTutorialShipyardCounterContestArrival(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "autoAdvancingToShipyardCounterContestArrival") {
      return;
    }

    for (let index = 0; index < 12; index += 1) {
      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "autoAdvancingToShipyardCounterContestArrival"
      ) {
        return;
      }

      const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (contestedNodeId === null) {
        tutorial.phase = "complete";
        completeTutorialGuidedSegment();
        return;
      }

      if (finishTutorialShipyardCounterContestArrival(tutorial)) {
        return;
      }

      frameTutorialShipyardCounterContestArrival();
      await tutorialAutoResolveTurn();

      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "autoAdvancingToShipyardCounterContestArrival"
      ) {
        return;
      }

      const arrivedContestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

      if (
        arrivedContestedNodeId !== null &&
        finishTutorialShipyardCounterContestArrival(tutorial)
      ) {
        return;
      }
    }

    if (
      tutorialState !== tutorial ||
      tutorial.phase !== "autoAdvancingToShipyardCounterContestArrival"
    ) {
      return;
    }

    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId !== null && finishTutorialShipyardCounterContestArrival(tutorial)) {
      return;
    }

    if (hasTutorialShipyardEnemyBeenDestroyed()) {
      if (pauseTutorialForFirstEnemyKillReplayCue()) {
        return;
      }

      tutorial.phase = "complete";
      completeTutorialGuidedSegment();
      return;
    }

    tutorial.phase = "complete";
    completeTutorialGuidedSegment();
  }

  function finishTutorialShipyardCounterContestArrival(tutorial: TutorialRuntimeState): boolean {
    const destinationNodeId = tutorial.tutorialBurnDestinationNodeId;

    if (
      destinationNodeId === null ||
      !hasTutorialBurnReachedDestination(tutorial, destinationNodeId) ||
      !hasFactionShipAtNode(state, destinationNodeId, "opponent")
    ) {
      return false;
    }

    tutorial.contestedNodeId = destinationNodeId;
    focusTutorialTurnSkipArrivalNode(destinationNodeId);
    const supportFireNodeId = findTutorialShipyardContestedSupportFireNodeId(destinationNodeId);

    if (supportFireNodeId !== null) {
      presentTutorialShipyardContestedSupportFirePrompt(tutorial, supportFireNodeId);
      return true;
    }

    tutorial.phase = "autoAdvancingToShipyardContestedBurn";
    presentTutorialShipyardContestedBurnPrompt();
    return true;
  }

  async function continueTutorialShipyardContestedFireToEnemyDestroyed(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "autoAdvancingToShipyardContestedFireImpact") {
      return;
    }

    if (
      pauseTutorialForFirstEnemyKillReplayCue() ||
      maybePauseTutorialShipyardFlowForMandatoryLaunch()
    ) {
      return;
    }

    for (let index = 0; index < 10; index += 1) {
      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "autoAdvancingToShipyardContestedFireImpact"
      ) {
        return;
      }

      if (
        pauseTutorialForFirstEnemyKillReplayCue() ||
        maybePauseTutorialShipyardFlowForMandatoryLaunch()
      ) {
        return;
      }

      if (hasTutorialShipyardEnemyBeenDestroyed()) {
        if (pauseTutorialForFirstEnemyKillReplayCue()) {
          return;
        }

        tutorial.phase = "complete";
        completeTutorialGuidedSegment();
        return;
      }

      await tutorialAutoResolveTurn();

      if (
        tutorialState !== tutorial ||
        tutorial.phase !== "autoAdvancingToShipyardContestedFireImpact"
      ) {
        return;
      }

      frameTutorialShipyardContestedFireImpact();

      if (
        pauseTutorialForFirstEnemyKillReplayCue() ||
        maybePauseTutorialShipyardFlowForMandatoryLaunch()
      ) {
        return;
      }

      if (hasTutorialShipyardEnemyBeenDestroyed()) {
        if (pauseTutorialForFirstEnemyKillReplayCue()) {
          return;
        }

        tutorial.phase = "complete";
        completeTutorialGuidedSegment();
        return;
      }
    }
  }

  function pauseTutorialForFirstEnemyKillReplayCue(): boolean {
    const tutorial = tutorialState;
    const key = "tutorial:first-enemy-kill-replay-cue";

    if (tutorial === null) {
      return false;
    }

    if (isTutorialFirstEnemyKillReplayCueActive()) {
      return true;
    }

    if (tutorial.loggedKeys.has(key)) {
      return false;
    }

    const event = findFirstTutorialEnemyKillResolutionEvent(matchResolutionEvents);

    if (event === null || getReplayPositionForResolutionEventId(event.id) === null) {
      return false;
    }

    const nodeId = event.nodeId ?? event.replayCue?.nodeIds[0] ?? null;
    tutorial.loggedKeys.add(key);
    tutorial.phase = "firstEnemyKillReplayCue";
    tutorial.inputLocked = true;
    tutorial.autoAdvanceActive = false;
    tutorial.firstEnemyKillReplayEventId = event.id;
    tutorial.firstEnemyKillReplayNodeId = nodeId;
    tutorial.firstEnemyKillReplayLineSelected = false;
    if (nodeId !== null) {
      selectTutorialTarget(`node:${nodeId}`);
    }
    showTutorialFirstEnemyKillReplayRewindHint(tutorial);
    updateInteractionLocks();
    updateCommandConsole();
    syncTutorialFirstEnemyKillReplayCueLine();
    scrollCommandTranscriptToEnd();
    return true;
  }

  async function completeTutorialFirstEnemyKillReplayCue(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "firstEnemyKillReplayCue") {
      return;
    }

    tutorial.firstEnemyKillReplayEventId = null;
    tutorial.firstEnemyKillReplayNodeId = null;
    tutorial.firstEnemyKillReplayLineSelected = false;
    tutorial.firstEnemyKillReplayVictoryLessonPending = true;
    tutorial.inputLocked = false;
    tutorial.autoAdvanceActive = false;
    tutorial.phase = "complete";
    syncTutorialFirstEnemyKillReplayCueLine();
    await commitLiveTutorialTimelineRowsToTranscript(
      "tutorial:first-enemy-kill-replay-instructions"
    );
    await appendTutorialFirstEnemyKillPostReplayVictoryLesson(tutorial);
  }

  async function appendTutorialFirstEnemyKillPostReplayVictoryLesson(
    tutorial: TutorialRuntimeState
  ): Promise<boolean> {
    if (!tutorial.firstEnemyKillReplayVictoryLessonPending) {
      return false;
    }

    tutorial.firstEnemyKillReplayVictoryLessonPending = false;
    await appendPersistentTutorialTimelineRows(
      createTutorialEnemyContactVictoryRows(),
      "tutorial:first-enemy-kill-post-replay-victory",
      { typewriter: true, typewriteAllNonSpacerRows: true }
    );
    tutorialPostVictoryActionLessonTurn = snapshot.turn;
    handOffTutorialToNormalMatch(tutorial);
    updateInteractionLocks();
    updateCommandConsole();
    updateStatus();
    return true;
  }

  function handOffTutorialToNormalMatch(tutorial: TutorialRuntimeState): void {
    if (tutorialState !== tutorial) {
      return;
    }

    clearTutorialTimers();
    tutorialState = null;
    commandInputHintsMode = "off";
  }

  function hasTutorialShipyardEnemyBeenDestroyed(): boolean {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return false;
    }

    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null) {
      return false;
    }

    return (
      getTutorialTurnEvents(snapshot).some((event) => {
        return (
          event.type === "SHIP_DESTROYED" &&
          event.factionId === "opponent" &&
          event.nodeId === contestedNodeId
        );
      }) || !hasFactionShipAtNode(state, contestedNodeId, "opponent")
    );
  }

  function maybePauseTutorialShipyardFlowForMandatoryLaunch(): boolean {
    return maybePauseTutorialForMandatoryLaunch();
  }

  function maybePauseTutorialForMandatoryLaunch(): boolean {
    const tutorial = tutorialState;
    const mandatoryLaunch = getNextPlayerMandatoryLaunch();

    if (tutorial === null || mandatoryLaunch === undefined) {
      return false;
    }

    if (
      !shouldInterruptTutorialForMandatoryLaunch({
        phase: tutorial.phase,
        activeMandatoryLaunchId: tutorial.activeMandatoryLaunchId,
        nextMandatoryLaunchId: mandatoryLaunch.id
      })
    ) {
      return false;
    }

    beginTutorialMandatoryLaunchLesson(tutorial);
    return true;
  }

  function maybePauseTutorialShipyardFlowForFirstTritiumArrival(): boolean {
    const tutorial = tutorialState;
    const tritiumNodeId = findUnintroducedPlayerTritiumNodeId();

    if (tutorial === null || tritiumNodeId === null) {
      return false;
    }

    void startTutorialFirstTritiumPostArrivalWorkTurn(
      tritiumNodeId,
      tutorial.shipyardContestedRecoveryActive ? "shipyardContestedRecovery" : "shipyardEnemyFlow"
    );
    return true;
  }

  async function resumeTutorialShipyardEnemyFlowAfterPause(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    if (
      tutorial.shipyardLessonNodeId !== null &&
      (state.pendingBurnOrders.some((order) => {
        return (
          order.factionId === "opponent" &&
          order.originNodeId === tutorial.shipyardEnemyDestinationNodeId &&
          order.destinationNodeId === tutorial.shipyardLessonNodeId
        );
      }) ||
        state.activeBurnTransits.some((transit) => {
          return (
            transit.factionId === "opponent" &&
            transit.originNodeId === tutorial.shipyardEnemyDestinationNodeId &&
            transit.destinationNodeId === tutorial.shipyardLessonNodeId
          );
        }))
    ) {
      tutorial.phase = "autoAdvancingToShipyardContestedBurn";
      await continueTutorialShipyardEnemyContestedApproach();
      return;
    }

    if (observeTutorialShipyardEnemyEvade()) {
      presentTutorialShipyardEnemyEvadeLessonOrContinue();
      return;
    }

    if (hasFactionShipAtNode(state, tutorial.shipyardEnemyDestinationNodeId, "opponent")) {
      tutorial.phase = "autoAdvancingToShipyardEnemyEvade";
      await continueTutorialToShipyardEnemyEvadeOrMandatoryLaunch();
      return;
    }

    tutorial.phase = "autoAdvancingToShipyardEnemyEvade";
    await continueTutorialToShipyardEnemyEvadeOrMandatoryLaunch();
  }

  function frameTutorialShipyardFireSetup(shipyardNodeId: string): void {
    const originTarget = `node:${shipyardNodeId}`;
    selectTutorialTarget(originTarget);
    frameTutorialShipyardFireEncounter();
  }

  function frameTutorialShipyardEnemyDestination(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    selectTutorialTarget(`node:${tutorial.shipyardEnemyDestinationNodeId}`);
  }

  function frameTutorialShipyardContestedSupportFirePrompt(supportNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const supportTarget = `node:${supportNodeId}`;
    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null) {
      return;
    }

    selectTutorialTarget(supportTarget);
  }

  function frameTutorialShipyardCounterContestBurnPrompt(originNodeId: string): void {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const originTarget = `node:${originNodeId}`;
    const contestedNodeId = getTutorialShipyardContestedTargetNodeId(tutorial);

    if (contestedNodeId === null) {
      return;
    }

    selectTutorialTarget(originTarget);
  }

  function frameTutorialShipyardFireSelectionWide(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    const originTarget = `node:${tutorial.shipyardLessonNodeId}`;
    selectTutorialTarget(originTarget);
    frameTutorialShipyardFireEncounter();
  }

  function frameTutorialShipyardFireEncounter(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    cinematicRenderer?.setSnapshot(snapshot);
  }

  function getTutorialShipyardEnemyBurnTargetKey(tutorial: TutorialRuntimeState): string | null {
    if (tutorial.shipyardEnemyDestinationNodeId === null) {
      return null;
    }

    const enemyBurnOrder = [...state.activeBurnTransits, ...state.pendingBurnOrders].find(
      (order) => {
        return (
          order.factionId === "opponent" &&
          order.destinationNodeId === tutorial.shipyardEnemyDestinationNodeId &&
          (tutorial.shipyardEnemyOriginNodeId === null ||
            order.originNodeId === tutorial.shipyardEnemyOriginNodeId)
        );
      }
    );

    return enemyBurnOrder === undefined ? null : `burn:${enemyBurnOrder.id}`;
  }

  function frameTutorialShipyardCounterContestArrival(): void {
    return;
  }

  function frameTutorialShipyardContestedFireImpact(): void {
    return;
  }

  function frameTutorialShipyardContestedSupportSearch(): void {
    return;
  }

  function frameTutorialShipyardContestedApproach(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.shipyardEnemyDestinationNodeId === null) {
      return;
    }

    selectTutorialTarget(`node:${tutorial.shipyardLessonNodeId}`);
  }

  function findTutorialEvadeFireSetup(): TutorialEvadeFireSetup | null {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return null;
    }

    const occupiedPlayerNodeIds = [
      ...new Set(
        state.nodeOccupancies
          .filter((occupancy) => occupancy.factionId === "player" && occupancy.shipCount > 0)
          .map((occupancy) => occupancy.nodeId)
      )
    ];
    const preferredTargetNodeIds = occupiedPlayerNodeIds.filter((nodeId) => {
      return nodeId !== tutorial.tritiumAnchorNodeId;
    });
    const targetNodeIds =
      preferredTargetNodeIds.length > 0 ? preferredTargetNodeIds : occupiedPlayerNodeIds;
    const reservedPlayerNodeIds = new Set<string>([
      ...occupiedPlayerNodeIds,
      ...state.pendingBurnOrders
        .filter((order) => order.factionId === "player")
        .map((order) => order.destinationNodeId),
      ...state.activeBurnTransits
        .filter((transit) => transit.factionId === "player")
        .map((transit) => transit.destinationNodeId)
    ]);
    const pendingTritiumArrivalTurn = getPendingTutorialMandatoryLaunchTritiumArrivalTurn();
    const candidates: TutorialEvadeFireSetup[] = [];

    for (const targetNodeId of targetNodeIds) {
      for (const node of content.nodes) {
        if (
          node.id === targetNodeId ||
          reservedPlayerNodeIds.has(node.id) ||
          state.nodeOccupancies.some(
            (occupancy) => occupancy.nodeId === node.id && occupancy.shipCount > 0
          )
        ) {
          continue;
        }

        const plan = calculateFirePlan(content, state, node.id, targetNodeId);

        if (plan === null) {
          continue;
        }

        candidates.push({
          targetNodeId,
          enemyNodeId: node.id,
          plan
        });
      }
    }

    candidates.sort((first, second) => {
      const firstScore = getTutorialEvadeFireSetupScore(first, pendingTritiumArrivalTurn);
      const secondScore = getTutorialEvadeFireSetupScore(second, pendingTritiumArrivalTurn);

      if (firstScore !== secondScore) {
        return firstScore - secondScore;
      }

      if (first.targetNodeId !== second.targetNodeId) {
        return first.targetNodeId.localeCompare(second.targetNodeId);
      }

      return first.enemyNodeId.localeCompare(second.enemyNodeId);
    });

    return candidates[0] ?? null;
  }

  function getTutorialEvadeFireSetupScore(
    setup: TutorialEvadeFireSetup,
    pendingTritiumArrivalTurn: number | null
  ): number {
    const eta = setup.plan.missileEtaTurns;
    const impactTurn = setup.plan.impactTurn;
    const mediumEtaPenalty = eta >= 3 && eta <= 5 ? 0 : 80 + Math.abs(eta - 4) * 12;
    const tritiumTimingPenalty =
      pendingTritiumArrivalTurn === null || impactTurn >= pendingTritiumArrivalTurn
        ? 0
        : (pendingTritiumArrivalTurn - impactTurn) * 140;
    const targetPriority = setup.targetNodeId === tutorialState?.shipyardLessonNodeId ? 0 : 8;

    return tritiumTimingPenalty + mediumEtaPenalty + Math.abs(eta - 4) * 5 + targetPriority;
  }

  function getPendingTutorialMandatoryLaunchTritiumArrivalTurn(): number | null {
    const tutorial = tutorialState;
    const destinationNodeId = tutorial?.tutorialBurnDestinationNodeId;

    if (
      tutorial === null ||
      destinationNodeId == null ||
      hasTutorialIntroducedTritium(tutorial) ||
      content.nodes.find((node) => node.id === destinationNodeId)?.type !== "tritium"
    ) {
      return null;
    }

    if (hasFactionShipAtNode(state, destinationNodeId, "player")) {
      return state.turn;
    }

    const transit = state.activeBurnTransits.find((candidate) => {
      return candidate.factionId === "player" && candidate.destinationNodeId === destinationNodeId;
    });

    return transit?.arrivalTurn ?? tutorial.tutorialBurnArrivalTurn;
  }

  function findUnintroducedPlayerTritiumNodeId(): string | null {
    const tutorial = tutorialState;

    if (tutorial === null || hasTutorialIntroducedTritium(tutorial)) {
      return null;
    }

    return (
      snapshot.nodeOccupancies.find((occupancy) => {
        return (
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0 &&
          content.nodes.find((node) => node.id === occupancy.nodeId)?.type === "tritium"
        );
      })?.nodeId ?? null
    );
  }

  function maybePauseTutorialEvadeForFirstTritiumArrival(): boolean {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "autoAdvancingToEvadeImpact") {
      return false;
    }

    const tritiumNodeId = findUnintroducedPlayerTritiumNodeId();

    if (tritiumNodeId === null) {
      return false;
    }

    void startTutorialFirstTritiumPostArrivalWorkTurn(tritiumNodeId, "evadeImpact");
    return true;
  }

  async function startTutorialEvadeLesson(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "mandatoryLaunchQueued") {
      return;
    }

    const setup = findTutorialEvadeFireSetup();

    if (setup === null) {
      return;
    }

    const stateBeforeEnemyFireSetup = state;

    state = ensureTutorialOpponentFaction(state);
    state = withTutorialOccupancy(state, setup.enemyNodeId, "opponent", 1);
    state = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        factionId: "opponent",
        originNodeId: setup.enemyNodeId,
        targetNodeId: setup.targetNodeId
      },
      content
    );
    const fireOrder = state.pendingFireOrders.find((order) => {
      return (
        order.originNodeId === setup.enemyNodeId &&
        order.targetNodeId === setup.targetNodeId &&
        order.factionId === "opponent"
      );
    });

    if (fireOrder === undefined) {
      state = stateBeforeEnemyFireSetup;
      snapshot = createSolarSystemSnapshot(content, state);
      updateInteractionLocks();
      updateCommandConsole();
      return;
    }

    snapshot = createSolarSystemSnapshot(content, state);
    tutorial.phase = "autoAdvancingToEvadeImpact";
    tutorial.enemyNodeId = setup.enemyNodeId;
    tutorial.evadeLessonMissileTargetNodeId = setup.targetNodeId;
    focusTutorialArrivalTarget(`node:${setup.enemyNodeId}`);
    appendTutorialRows(
      [
        `A hostile ship has been detected at ${formatNodeName(content, setup.enemyNodeId)}.`,
        "",
        `It FIRED from ${formatNodeName(content, setup.enemyNodeId)} toward ${formatNodeName(content, setup.targetNodeId)}; impact is due in T-${fireOrder?.missileEtaTurns ?? setup.plan.missileEtaTurns}.`
      ],
      "tutorial:enemy-fire"
    );
    redraw();
    await waitForCommandConsoleMs(650);
    await continueTutorialToEvadeImpact();
  }

  async function continueTutorialToEvadeImpact(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "autoAdvancingToEvadeImpact") {
      return;
    }

    if (tutorial.evadeLessonMissileTargetNodeId !== null) {
      focusTutorialArrivalTarget(`node:${tutorial.evadeLessonMissileTargetNodeId}`);
    }

    for (let index = 0; index < 10; index += 1) {
      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToEvadeImpact") {
        return;
      }

      if (hasTutorialEvadeResolved()) {
        completeTutorialEvadeLesson();
        return;
      }

      await tutorialAutoResolveTurn();

      if (tutorialState !== tutorial || tutorial.phase !== "autoAdvancingToEvadeImpact") {
        return;
      }

      if (maybePauseTutorialEvadeForFirstTritiumArrival()) {
        return;
      }

      if (hasTutorialEvadeResolved()) {
        completeTutorialEvadeLesson();
        return;
      }
    }
  }

  function completeTutorialEvadeLesson(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "autoAdvancingToEvadeImpact") {
      return;
    }

    tutorial.phase = "evadeLesson";
    appendTutorialTimelineRows(
      [
        {
          parts: [
            { text: "When a missile reaches a non-contested ship, it automatically attempts to " },
            { text: "EVADE", className: getCommandFactionClass("player") },
            {
              text: " with its hard-kill defenses. The faction pays 1 ΔV for each missile impacting that ship in the turn."
            }
          ],
          className: "command-console__line--tutorial"
        },
        {
          parts: [
            { text: "A ship cannot " },
            { text: "EVADE", className: getCommandFactionClass("player") },
            { text: " and " },
            { text: "WORK", className: getCommandFactionClass("player") },
            {
              text: " in the same turn, so even a successful defense denies that turn's production."
            }
          ],
          className: "command-console__line--tutorial"
        },
        {
          parts: [
            {
              text: "You may BURN into an enemy-occupied orbit to create a contested lock and deny its actions, provided you can sustain the upkeep."
            }
          ],
          className: "command-console__line--tutorial"
        }
      ],
      "tutorial:evade-resolution"
    );

    if (beginTutorialMandatoryLaunchLessonIfActive()) {
      return;
    }

    updateInteractionLocks();
    updateCommandConsole();
  }

  function continueTutorialAfterEvadeLessonExecute(): void {
    const tutorial = tutorialState;

    if (tutorial === null || tutorial.phase !== "evadeLesson") {
      return;
    }

    tutorial.phase = "enemyBurnTarget";
    updateInteractionLocks();
    updateCommandConsole();
  }

  function hasTutorialEvadeResolved(): boolean {
    return getTutorialTurnEvents(snapshot).some((event) => {
      return event.type === "EVADE" && event.factionId === "player";
    });
  }

  async function continueTutorialToEnemyContestedArrival(): Promise<void> {
    const tutorial = tutorialState;
    const contestedNodeId = tutorial?.contestedNodeId;

    if (tutorial === null || contestedNodeId === null || contestedNodeId === undefined) {
      return;
    }
    const arrivalNodeId = contestedNodeId;

    await autoAdvanceTutorialUntil(
      "enemy-node-arrival",
      () =>
        hasFactionShipAtNode(state, arrivalNodeId, "player") &&
        hasFactionShipAtNode(state, arrivalNodeId, "opponent"),
      8,
      arrivalNodeId
    );

    const activeTutorial = tutorialState;

    if (activeTutorial === null || activeTutorial.phase !== "enemyBurnQueued") {
      return;
    }

    activeTutorial.phase = "contestedFireSetup";
    appendTutorialRows(
      [
        `Your ship has reached ${formatNodeName(content, arrivalNodeId)}, where an enemy ship was already present. The orbit is now CONTESTED.`,
        "Both factions pay 2 ΔV per turn to maintain the lock, and neither ship can WORK, FIRE or EVADE while it remains.",
        "Holding denies the orbit to both sides; BURNING out ends the lock for the departing ship."
      ],
      "tutorial:enemy-node-contested"
    );
    await startTutorialDefensiveForecast();
  }

  async function startTutorialDefensiveForecast(): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const targetNodeId = findPlayerOccupiedNodeIdExcluding(
      new Set([tutorial.tritiumAnchorNodeId].filter((nodeId): nodeId is string => nodeId !== null))
    );

    if (targetNodeId === null) {
      return;
    }

    state = ensureTutorialOpponentFaction(state);
    state = withTutorialOccupancy(state, tutorialDefensiveEnemyAssaultNodeId, "opponent", 1);
    state = withTutorialOccupancy(state, tutorialDefensiveEnemyFireNodeId, "opponent", 1);
    state = applyCommand(
      state,
      {
        type: "ASSIGN_BURN_ORDER",
        factionId: "opponent",
        originNodeId: tutorialDefensiveEnemyAssaultNodeId,
        destinationNodeId: targetNodeId
      },
      content
    );
    const assaultOrder = getPendingBurnOrder(tutorialDefensiveEnemyAssaultNodeId, "opponent");
    state = applyCommand(
      state,
      {
        type: "ASSIGN_FIRE_ORDER",
        factionId: "opponent",
        originNodeId: tutorialDefensiveEnemyFireNodeId,
        targetNodeId
      },
      content
    );
    const fireImpactTurn = (assaultOrder?.arrivalTurn ?? state.turn + 4) + 1;
    state = withTutorialFireImpactTurn(
      state,
      tutorialDefensiveEnemyFireNodeId,
      "opponent",
      fireImpactTurn
    );
    const fireOrder = state.pendingFireOrders.find((order) => {
      return (
        order.originNodeId === tutorialDefensiveEnemyFireNodeId && order.factionId === "opponent"
      );
    });
    tutorial.phase = "autoAdvancingToDefensiveContested";
    tutorial.defensivePlayerNodeId = targetNodeId;
    tutorial.defensiveMissileImpactTurn = fireImpactTurn;
    snapshot = createSolarSystemSnapshot(content, state);
    appendTutorialRows(
      [
        `An enemy BURN is moving from ${formatNodeName(content, tutorialDefensiveEnemyAssaultNodeId)} to ${formatNodeName(content, targetNodeId)}; ETA T+${assaultOrder?.etaTurns ?? "?"}.`,
        "",
        `An enemy FIRE solution runs from ${formatNodeName(content, tutorialDefensiveEnemyFireNodeId)} to ${formatNodeName(content, targetNodeId)}; impact T-${fireOrder?.missileEtaTurns ?? "?"}.`,
        "",
        `${formatNodeName(content, targetNodeId)} will become contested before the missile arrives. Once contested, your ship cannot EVADE the impact.`,
        "BURN to another orbit before impact; departure breaks every firing solution aimed at that ship."
      ],
      "tutorial:defensive-forecast"
    );
    redraw();
    await continueTutorialToDefensiveContestedArrival();
  }

  async function continueTutorialToDefensiveContestedArrival(): Promise<void> {
    const tutorial = tutorialState;
    const targetNodeId = tutorial?.defensivePlayerNodeId;

    if (tutorial === null || targetNodeId === null || targetNodeId === undefined) {
      return;
    }
    const contestedNodeId = targetNodeId;

    await autoAdvanceTutorialUntil(
      "defensive-contested",
      () => hasFactionShipAtNode(state, contestedNodeId, "opponent"),
      8,
      contestedNodeId
    );

    const activeTutorial = tutorialState;

    if (activeTutorial === null || activeTutorial.phase !== "autoAdvancingToDefensiveContested") {
      return;
    }

    activeTutorial.phase = "awaitingBurnOut";
    appendTutorialRows(
      [
        `The enemy ship has reached ${formatNodeName(content, contestedNodeId)}, so the orbit is now CONTESTED.`,
        "Neither ship can WORK, FIRE or EVADE, and both factions will pay 2 ΔV at the start of each turn they remain.",
        "A missile will impact next turn. BURN to another valid orbit now, because leaving the lock will also break the incoming firing solution."
      ],
      "tutorial:defensive-contested"
    );
    selectTutorialTarget(`node:${contestedNodeId}`);
    redraw();
  }

  async function autoAdvanceTutorialUntil(
    keyPrefix: string,
    shouldStop: () => boolean,
    maxTurns: number,
    arrivalNodeId?: string | null
  ): Promise<void> {
    const tutorial = tutorialState;

    if (tutorial === null) {
      return;
    }

    const phaseBeforeAutoAdvance = tutorial.phase;

    for (let index = 0; index < maxTurns; index += 1) {
      if (tutorialState !== tutorial || tutorial.phase !== phaseBeforeAutoAdvance) {
        return;
      }

      if (shouldStop()) {
        focusTutorialTurnSkipArrivalNode(arrivalNodeId);
        return;
      }

      await tutorialAutoResolveTurn();

      if (isTutorialFirstEnemyKillReplayCueActive()) {
        return;
      }

      if (tutorialState !== tutorial || tutorial.phase !== phaseBeforeAutoAdvance) {
        return;
      }

      if (shouldStop()) {
        focusTutorialTurnSkipArrivalNode(arrivalNodeId);
        return;
      }
    }
  }

  function ensureTutorialOpponentFaction(nextState: GameState): GameState {
    const opponentFaction: FactionIdentity = {
      id: "opponent",
      displayName: "ENEMY",
      color: factionColorPalette[1].color,
      accent: factionColorPalette[1].accent,
      controlType: "human"
    };

    return ensureTutorialOpponentFactionState(nextState, opponentFaction, 50);
  }

  function withTutorialOccupancy(
    nextState: GameState,
    nodeId: string,
    factionId: FactionId,
    shipCount: number
  ): GameState {
    const occupancies = nextState.nodeOccupancies.filter((occupancy) => {
      return !(occupancy.nodeId === nodeId && occupancy.factionId === factionId);
    });

    return {
      ...nextState,
      nodeOccupancies:
        shipCount <= 0
          ? occupancies
          : [
              ...occupancies,
              {
                nodeId,
                factionId,
                shipCount
              }
            ]
    };
  }

  function withTutorialFactionDv(
    nextState: GameState,
    factionId: FactionId,
    minimumDv: number
  ): GameState {
    return {
      ...nextState,
      factionDv: {
        ...nextState.factionDv,
        [factionId]: Math.max(getFactionDv(nextState, factionId), minimumDv)
      }
    };
  }

  function withTutorialShipyardProgress(
    nextState: GameState,
    nodeId: string,
    progress: number
  ): GameState {
    return {
      ...nextState,
      shipyardProgress: [
        ...nextState.shipyardProgress.filter((entry) => entry.nodeId !== nodeId),
        {
          nodeId,
          progress,
          workerFactionId: "player"
        }
      ]
    };
  }

  function withTutorialFireImpactTurn(
    nextState: GameState,
    originNodeId: string,
    factionId: FactionId,
    impactTurn: number
  ): GameState {
    return {
      ...nextState,
      pendingFireOrders: nextState.pendingFireOrders.map((order) => {
        if (order.originNodeId !== originNodeId || order.factionId !== factionId) {
          return order;
        }

        return {
          ...order,
          impactTurn,
          missileEtaTurns: Math.max(1, impactTurn - nextState.turn)
        };
      })
    };
  }

  function findPlayerOccupiedNodeIdExcluding(excludedNodeIds: ReadonlySet<string>): string | null {
    return (
      snapshot.nodeOccupancies.find((occupancy) => {
        return (
          occupancy.factionId === "player" &&
          occupancy.shipCount > 0 &&
          !excludedNodeIds.has(occupancy.nodeId)
        );
      })?.nodeId ?? null
    );
  }

  function hasFactionShipAtNode(
    nextState: Pick<GameState, "nodeOccupancies">,
    nodeId: string,
    factionId: FactionId
  ): boolean {
    return nextState.nodeOccupancies.some((occupancy) => {
      return (
        occupancy.nodeId === nodeId && occupancy.factionId === factionId && occupancy.shipCount > 0
      );
    });
  }

  function terminateAiTurnWorker(): void {
    aiTurnWorker?.terminate();
    aiTurnWorker = null;
  }

  function getAiTurnWorker(): Worker {
    if (aiTurnWorker === null) {
      aiTurnWorker = new Worker(new URL("./aiTurnWorker.ts", import.meta.url), {
        type: "module"
      });
    }

    return aiTurnWorker;
  }

  function advanceAiTurnOffMainThread(
    automaticMandatoryLaunchFactionIds: readonly FactionId[] | undefined,
    planningOptions: AiPlanningOptions
  ): Promise<Extract<AiTurnWorkerResponse, { kind: "advance-turn" }>> {
    const worker = getAiTurnWorker();
    const id = ++aiTurnWorkerRequestId;
    const request: AiTurnWorkerRequest = {
      kind: "advance-turn",
      id,
      state,
      content,
      automaticMandatoryLaunchFactionIds,
      planningOptions
    };

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<AiTurnWorkerResponse>): void => {
        if (event.data.id !== id) {
          return;
        }

        cleanup();
        if ("error" in event.data) {
          reject(new Error(event.data.error));
          return;
        }

        if (event.data.kind !== "advance-turn") {
          reject(new Error(`Unexpected AI worker response "${event.data.kind}"`));
          return;
        }

        resolve(event.data);
      };
      const handleError = (event: ErrorEvent): void => {
        cleanup();
        reject(new Error(event.message || "AI turn worker failed"));
      };
      const cleanup = (): void => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
      };

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage(request);
    });
  }

  function issueAiAutorunProceduralSeed(): string {
    let seed = normalizeProceduralSeedForUi(createProceduralMapSeed());

    while (aiAutorunIssuedProceduralSeeds.has(seed)) {
      seed = `${seed}-batch-${aiAutorunIssuedProceduralSeeds.size.toString(36)}`;
    }

    aiAutorunIssuedProceduralSeeds.add(seed);
    return seed;
  }

  function generateAiAutorunMapOffMainThread(
    preset: MapPreset
  ): Promise<ProceduralBatchMapGeneration> {
    const worker = getAiTurnWorker();
    const id = ++aiTurnWorkerRequestId;
    const requestedSeed = issueAiAutorunProceduralSeed();
    const retrySeeds = Array.from({ length: 3 }, () => issueAiAutorunProceduralSeed());
    const request: AiTurnWorkerRequest = {
      kind: "generate-map",
      id,
      preset,
      requestedSeed,
      retrySeeds
    };

    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<AiTurnWorkerResponse>): void => {
        if (event.data.id !== id) {
          return;
        }

        cleanup();
        if ("error" in event.data) {
          reject(new Error(event.data.error));
          return;
        }

        if (event.data.kind !== "generate-map") {
          reject(new Error(`Unexpected AI worker response "${event.data.kind}"`));
          return;
        }

        resolve(event.data.automaticMap);
      };
      const handleError = (event: ErrorEvent): void => {
        cleanup();
        reject(new Error(event.message || "AI map worker failed"));
      };
      const cleanup = (): void => {
        worker.removeEventListener("message", handleMessage);
        worker.removeEventListener("error", handleError);
      };

      worker.addEventListener("message", handleMessage);
      worker.addEventListener("error", handleError);
      worker.postMessage(request);
    });
  }

  async function createNextAiAutorunProceduralMap(
    preset: MapPreset
  ): Promise<ProceduralBatchMapGeneration> {
    try {
      return await generateAiAutorunMapOffMainThread(preset);
    } catch (error) {
      terminateAiTurnWorker();
      if (!hasReportedAiTurnWorkerFallback) {
        hasReportedAiTurnWorkerFallback = true;
        appendDebugPanelMessage(
          `AI WORKER fallback: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return createAutomaticProceduralMapForSeed(preset, issueAiAutorunProceduralSeed());
    }
  }

  async function resolveSimulationTurn(
    automaticMandatoryLaunchFactionIds: readonly FactionId[] | undefined,
    planningOptions: AiPlanningOptions
  ): Promise<GameState> {
    const shouldUseAiTurnWorker = isZeroTimerAiAutorunMode() || isGameMenuDemoActive;

    if (!shouldUseAiTurnWorker || typeof Worker === "undefined") {
      aiWorkerPostMatchEvaluation = null;
      return advanceSimulationTurn(
        state,
        content,
        automaticMandatoryLaunchFactionIds,
        planningOptions
      );
    }

    try {
      const response = await advanceAiTurnOffMainThread(
        automaticMandatoryLaunchFactionIds,
        planningOptions
      );
      aiWorkerPostMatchEvaluation = response.postMatchEvaluation;
      return response.state;
    } catch (error) {
      terminateAiTurnWorker();
      aiWorkerPostMatchEvaluation = null;
      if (!hasReportedAiTurnWorkerFallback) {
        hasReportedAiTurnWorkerFallback = true;
        appendDebugPanelMessage(
          `AI WORKER fallback: ${error instanceof Error ? error.message : String(error)}`
        );
      }
      return advanceSimulationTurn(
        state,
        content,
        automaticMandatoryLaunchFactionIds,
        planningOptions
      );
    }
  }

  async function advanceTurn(
    transcriptStartIndex?: number,
    options: Readonly<{
      ignoreMandatoryLaunchLock?: boolean;
      transcriptPrefixPromise?: Promise<void>;
    }> = {}
  ): Promise<void> {
    if (isReplayMode || postMatchReportText !== null) {
      return;
    }

    if (isMandatoryLaunchLockActive() && options.ignoreMandatoryLaunchLock !== true) {
      syncMandatoryLaunchFocus();
      updateStatus();
      return;
    }

    if (isTurnTransitionActive && !defaultCinematic3dVisualTuning.turnAnimationAllowQueueNextTurn) {
      return;
    }

    const turnPresentationStartedAt = performance.now();
    prepareTutorialOpponentMandatoryLaunches();
    const previousSnapshot = snapshot;
    const automaticMandatoryLaunchFactionIds = getAutomaticMandatoryLaunchFactionIdsForResolution(
      options.ignoreMandatoryLaunchLock === true
    );
    state = await resolveSimulationTurn(
      automaticMandatoryLaunchFactionIds,
      getEffectiveAiPlanningOptions()
    );
    snapshot = createSolarSystemSnapshot(content, state);
    commandDvHistory.push({ ...snapshot.factionDv });
    if (!isGameMenuDemoActive) {
      recordReplayTransition(previousSnapshot, snapshot);
    }
    window.setTimeout(() => {
      sfxEngine.play("turn.advance");
    }, 120);
    const previousTurnPresentationDeadlineAt = turnPresentationDeadlineAt;
    const resolutionPresentationDeadlineAt =
      transcriptStartIndex === undefined
        ? null
        : performance.now() + turnResolutionPresentationMaxMs;
    if (resolutionPresentationDeadlineAt !== null) {
      turnPresentationDeadlineAt = resolutionPresentationDeadlineAt;
    }
    const transcriptPromise =
      transcriptStartIndex === undefined
        ? (options.transcriptPrefixPromise ?? Promise.resolve())
        : (options.transcriptPrefixPromise ?? Promise.resolve()).then(() => {
            return appendResolutionTranscriptRows(transcriptStartIndex);
          });
    const releaseCommandConsoleAfterResolution = async () => {
      try {
        await transcriptPromise;

        if (transcriptStartIndex === undefined) {
          return;
        }

        isCommandConsoleResolving = false;
        updateInteractionLocks();
        await renderNextLiveCommandBlockTyped();
      } finally {
        if (
          resolutionPresentationDeadlineAt !== null &&
          turnPresentationDeadlineAt === resolutionPresentationDeadlineAt
        ) {
          turnPresentationDeadlineAt = previousTurnPresentationDeadlineAt;
        }
      }
    };
    const consoleReadyPromise = releaseCommandConsoleAfterResolution();
    updateStatus();

    if (currentView !== "cinematic3d" || cinematicRenderer === null) {
      redraw();
      await consoleReadyPromise;
      handleTutorialAfterTurn(previousSnapshot, snapshot);
      await waitForZeroTimerPresentationCadence(turnPresentationStartedAt);
      maybeShowPostMatchReport();
      finishPlanningTimerResolution();
      sfxEngine.play("turn.ready");
      updateStatus();
      scheduleGameMenuDemoTurn();
      return;
    }

    isTurnTransitionActive = true;
    nextTurnButton.disabled =
      defaultCinematic3dVisualTuning.turnAnimationDisableInputDuringTransition;

    try {
      await Promise.all([
        animateTurnTransitionWithWatchdog(cinematicRenderer, previousSnapshot, snapshot),
        consoleReadyPromise
      ]);
    } finally {
      isTurnTransitionActive = false;
      await consoleReadyPromise;
      handleTutorialAfterTurn(previousSnapshot, snapshot);
      syncMandatoryLaunchFocus();
      await waitForZeroTimerPresentationCadence(turnPresentationStartedAt);
      maybeShowPostMatchReport();
      finishPlanningTimerResolution();
      sfxEngine.play("turn.ready");
      updateStatus();
      scheduleGameMenuDemoTurn();
    }
  }

  async function waitForZeroTimerPresentationCadence(startedAt: number): Promise<void> {
    if (!isZeroTimerAiAutorunMode()) {
      return;
    }

    const remainingMs = zeroTimerMinimumTurnPresentationMs - (performance.now() - startedAt);

    if (remainingMs > 0) {
      await waitForCommandConsoleMs(remainingMs);
    }
  }

  async function animateTurnTransitionWithWatchdog(
    renderer: CinematicSolarSystemRenderer,
    from: SolarSystemSnapshot,
    to: SolarSystemSnapshot
  ): Promise<void> {
    let didTimeout = false;
    const animationPromise = renderer.animateTurnTransition(from, to);
    const timeoutMs = Math.min(
      renderer.getTurnTransitionDurationMs(from, to) + turnTransitionWatchdogGraceMs,
      turnTransitionWatchdogMaxMs
    );
    await Promise.race([
      animationPromise,
      waitForCommandConsoleMs(timeoutMs).then(() => {
        didTimeout = true;
      })
    ]);

    if (didTimeout) {
      renderer.setSnapshot(to);
      await animationPromise;
    }
  }

  tacticalCanvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });

  const dismissPostMatchReport = (event: Event): void => {
    if (postMatchReportText === null) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    if (shouldAutoRestartZeroTimerMatch()) {
      return;
    }

    returnToMainMenuFromPostMatch();
  };

  postMatchDismissLayer.addEventListener("click", dismissPostMatchReport);
  postMatchReport.addEventListener("click", dismissPostMatchReport);

  tacticalCanvas.addEventListener("pointerdown", (event) => {
    if (isGameMenuOpen() || currentView !== "tactical2d" || event.button !== 2) {
      return;
    }

    dragStart = {
      x: event.clientX,
      y: event.clientY
    };
    tacticalCanvas.setPointerCapture(event.pointerId);
    event.preventDefault();
  });

  tacticalCanvas.addEventListener("pointermove", (event) => {
    if (isGameMenuOpen() || dragStart === null || currentView !== "tactical2d") {
      return;
    }

    const nextPoint = {
      x: event.clientX,
      y: event.clientY
    };
    const delta = {
      x: nextPoint.x - dragStart.x,
      y: nextPoint.y - dragStart.y
    };
    dragStart = nextPoint;
    tacticalCamera = panCameraByScreenDelta(tacticalCamera, delta);
    redraw();
  });

  tacticalCanvas.addEventListener("pointerup", (event) => {
    if (dragStart === null) {
      return;
    }

    dragStart = null;
    tacticalCanvas.releasePointerCapture(event.pointerId);
  });

  tacticalCanvas.addEventListener("pointerleave", () => {
    dragStart = null;
  });

  tacticalCanvas.addEventListener("wheel", (event) => {
    if (currentView !== "tactical2d" || isGameMenuOpen()) {
      if (isGameMenuOpen()) {
        event.preventDefault();
      }
      return;
    }

    const rect = tacticalCanvas.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const zoomFactor = event.deltaY < 0 ? 1.14 : 1 / 1.14;
    tacticalCamera = zoomTowardScreenPoint(
      tacticalCamera,
      tacticalViewport(),
      screenPoint,
      zoomFactor
    );
    redraw();
    event.preventDefault();
  });

  tacticalCanvas.addEventListener("dblclick", (event) => {
    if (isGameMenuOpen() || currentView !== "tactical2d") {
      return;
    }

    const rect = tacticalCanvas.getBoundingClientRect();
    const screenPoint = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
    const target = findNearestSnapshotTarget(
      snapshot,
      tacticalCamera,
      tacticalViewport(),
      screenPoint
    );

    if (target !== null) {
      focusTarget(target);
    }
  });

  window.addEventListener("keydown", (event) => {
    if (isTrailerCaptureActive) {
      const key = event.key.toLowerCase();
      const target = event.target;
      const isEditableTarget =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        (target instanceof HTMLElement && target.isContentEditable);

      if (!isEditableTarget) {
        if (key === "escape") {
          stopTrailerCapturePlayback();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (key === "r") {
          stopTrailerCapturePlayback();
          void playCurrentTrailerCaptureScene();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (key === "n") {
          advanceTrailerCaptureScene();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (key === "p") {
          stopTrailerCapturePlayback();
          void playAllTrailerCaptureScenes();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }

        if (key === " " || key === "enter") {
          void playCurrentTrailerCaptureScene();
          event.preventDefault();
          event.stopImmediatePropagation();
          return;
        }
      }
    }

    if (postMatchReportText !== null) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (!shouldAutoRestartZeroTimerMatch()) {
        returnToMainMenuFromPostMatch();
      }
      return;
    }

    if (isTrailerScreenActive) {
      if (event.key === "Escape") {
        deactivateTrailerScreen();
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }

    if (isInGameMenuActive) {
      if (event.key === "Escape") {
        resumeGameFromMenu();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (handleCommandLogTransportHotkey(event)) {
      return;
    }

    if (isReplayMode) {
      if (event.key === "Escape") {
        if (commandLogTimeReviewState !== null) {
          if (isCommandLogTimeReviewAnimating) {
            replayCancelRequested = true;
          } else {
            skipCommandLogTimeReviewToLive();
          }
          event.preventDefault();
          return;
        }

        replayCancelRequested = true;
        event.preventDefault();
      }
      return;
    }

    if (event.key === "Escape") {
      if (!isGameMenuDemoActive) {
        openInGameMenu();
        event.preventDefault();
        event.stopImmediatePropagation();
      }
      return;
    }

    if (isGameMenuDemoActive) {
      event.preventDefault();
      return;
    }

    if (handleGlobalExecuteHotkey(event)) {
      return;
    }

    if (isMandatoryLaunchLockActive()) {
      if (event.key === "Escape" || event.key.toLowerCase() === "f") {
        syncMandatoryLaunchFocus();
        updateStatus();
        event.preventDefault();
      }
      return;
    }

    if (event.key.toLowerCase() === "f") {
      if (currentView === "cinematic3d") {
        cinematicRenderer?.focusSelected();
      } else if (selectedTargetKey !== null) {
        focusTarget(selectedTargetKey);
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    cancelMusicAutoplayUnlock();
    cancelSfxAutoplayUnlock();
    stopDebugRecordingTimer();
    terminateAiTurnWorker();
    musicEngine.dispose();
    sfxEngine.dispose();
  });
}

function isCommandTimelineSpacerRow(row: CommandTimelineRow): boolean {
  return (
    row.className?.includes("command-console__line--spacer") === true ||
    row.className?.includes("command-console__line--tutorial-spacer") === true
  );
}

function createCommandScrollbackRows(
  entries: readonly CommandTimelineEntry[],
  replayEntries: readonly ReplayEntry[]
): readonly CommandScrollbackRow[] {
  const replayEntryIdsByResolutionEventId = new Map<string, string[]>();

  for (const replayEntry of replayEntries) {
    const resolutionEventId = replayEntry.logLink?.resolutionEventId;

    if (resolutionEventId === undefined) {
      continue;
    }

    const current = replayEntryIdsByResolutionEventId.get(resolutionEventId) ?? [];
    current.push(replayEntry.id);
    replayEntryIdsByResolutionEventId.set(resolutionEventId, current);
  }

  return entries.flatMap((entry): readonly CommandScrollbackRow[] => {
    if (entry.kind === "commandSnapshot") {
      return entry.rows.flatMap((row, rowIndex): readonly CommandScrollbackRow[] =>
        isCommandTimelineSpacerRow(row)
          ? []
          : [
              {
                entryId: entry.id,
                kind: entry.kind,
                turn: entry.turn,
                rowIndex,
                replayEntryIds: []
              }
            ]
      );
    }

    if (entry.kind === "tutorial") {
      return entry.rows.flatMap((row, rowIndex): readonly CommandScrollbackRow[] =>
        isCommandTimelineSpacerRow(row)
          ? []
          : [
              {
                entryId: entry.id,
                kind: entry.kind,
                turn: entry.turn,
                rowIndex,
                replayEntryIds: []
              }
            ]
      );
    }

    return [
      {
        entryId: entry.id,
        kind: entry.kind,
        turn: entry.turn,
        rowIndex: entry.event.index,
        eventId: entry.event.id,
        replayEntryIds: replayEntryIdsByResolutionEventId.get(entry.event.id) ?? [],
        cue: entry.event.replayCue ?? entry.event.mapCue
      }
    ];
  });
}

function hashReplayState(state: GameState): string {
  const serialized = stableStringify(state);
  let hash = 2166136261;

  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0).toString(16).padStart(8, "0");
}

function validateReplayStateIntegrity(
  expectedHash: string,
  before: GameState,
  after: GameState
): void {
  const actualHash = hashReplayState(after);

  if (actualHash !== expectedHash) {
    console.error("Replay state integrity check failed.", { expectedHash, actualHash });
  }

  const duplicateWarnings = [
    getDuplicateWarning(
      "active burn transit",
      after.activeBurnTransits.map((transit) => transit.id)
    ),
    getDuplicateWarning(
      "active missile",
      after.activeMissiles.map((missile) => missile.id)
    ),
    getDuplicateWarning(
      "mandatory launch",
      after.mandatoryLaunches.map((launch) => launch.id)
    )
  ].filter((warning): warning is string => warning !== null);

  if (duplicateWarnings.length > 0) {
    console.error("Replay duplicate reference check failed.", duplicateWarnings);
  }

  if (before.debugEvents.length !== after.debugEvents.length) {
    console.error("Replay appended real debug events.", {
      before: before.debugEvents.length,
      after: after.debugEvents.length
    });
  }
}

function getDuplicateWarning(label: string, ids: readonly string[]): string | null {
  const seen = new Set<string>();

  for (const id of ids) {
    if (seen.has(id)) {
      return `${label}:${id}`;
    }

    seen.add(id);
  }

  return null;
}
