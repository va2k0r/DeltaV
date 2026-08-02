export type TutorialSegmentId = "TUTORIAL_SEGMENT_01";

export type TutorialTritiumLessonContinuation =
  | "productiveBurnPrompt"
  | "evadeSetup"
  | "evadeImpact"
  | "shipyardEnemyFlow"
  | "shipyardContestedRecovery";

export type TutorialPhase =
  | "awaitingInitialSelection"
  | "awaitingFirstBurnPreview"
  | "awaitingFirstBurnConfirm"
  | "firstBurnQueued"
  | "awaitingFirstArrival"
  | "firstArrival"
  | "awaitingFirstTritiumWorkTurn"
  | "tritiumArrivalExecute"
  | "awaitingProductiveBurnPreview"
  | "awaitingProductiveBurnConfirm"
  | "productiveBurnQueued"
  | "awaitingProductiveArrival"
  | "shipyardArrivalWork"
  | "shipyardProduction"
  | "shipyardSupportProduction"
  | "shipyardSupportProductionCompletion"
  | "shipyardFirePrompt"
  | "shipyardFireQueued"
  | "shipyardFireWorkLesson"
  | "autoAdvancingToShipyardEnemyEvade"
  | "shipyardEnemyEvadeLesson"
  | "autoAdvancingToShipyardEnemyArrival"
  | "autoAdvancingToShipyardContestedBurn"
  | "shipyardContestedFirePrompt"
  | "shipyardContestedFireQueued"
  | "autoAdvancingToShipyardContestedFireImpact"
  | "autoAdvancingToShipyardContestedSupport"
  | "shipyardCounterContestBurnPrompt"
  | "shipyardCounterContestBurnQueued"
  | "autoAdvancingToShipyardCounterContestArrival"
  | "shipyardContestedBurnPrompt"
  | "shipyardContestedBurnQueued"
  | "shipyardProductionCompletion"
  | "firstEnemyKillReplayCue"
  | "mandatoryLaunch"
  | "mandatoryLaunchQueued"
  | "evadeLesson"
  | "autoAdvancingToEvadeImpact"
  | "enemyBurnTarget"
  | "enemyBurnQueued"
  | "contestedFireSetup"
  | "defensiveForecast"
  | "autoAdvancingToDefensiveContested"
  | "awaitingBurnOut"
  | "burnOutQueued"
  | "complete";

export type TutorialRuntimeState = {
  segmentId: TutorialSegmentId;
  phase: TutorialPhase;
  startedAt: number;
  firstSelectionAt: number | null;
  firstBurnReselectionStartedAt: number | null;
  inputLocked: boolean;
  autoAdvanceActive: boolean;
  activeMandatoryLaunchId: string | null;
  mandatoryLaunchResumePhase: TutorialPhase | null;
  enemySimpleAiEnabled: boolean;
  hasZoomedOutCamera: boolean;
  firstBurnPreviewDestinationNodeId: string | null;
  firstBurnDestinationNodeId: string | null;
  firstBurnArrivalTurn: number | null;
  productiveBurnOriginNodeId: string | null;
  productiveBurnDestinationNodeId: string | null;
  productiveBurnArrivalTurn: number | null;
  productiveBurnPromptStartedAt: number | null;
  productiveBurnReselectionStartedAt: number | null;
  tutorialBurnDestinationNodeId: string | null;
  tutorialBurnArrivalTurn: number | null;
  tritiumAnchorNodeId: string | null;
  hasIntroducedBarren: boolean;
  tritiumLessonContinuation: TutorialTritiumLessonContinuation | null;
  shipyardContestedRecoveryActive: boolean;
  shipyardSupportProductionNodeId: string | null;
  shipyardLessonNodeId: string;
  shipyardEnemyOriginNodeId: string | null;
  shipyardEnemyDestinationNodeId: string | null;
  shipyardEnemyFireImpactTurn: number | null;
  shipyardEnemyEvadeObserved: boolean;
  shipyardEnemyReturnArrivalTurn: number | null;
  shipyardPlayerEscapeNodeId: string | null;
  shipyardSupportFireNodeId: string | null;
  shipyardCounterContestOriginNodeId: string | null;
  shipyardCounterContestArrivalTurn: number | null;
  shipyardCounterContestAutoAdvanceConsumed: boolean;
  shipyardFirePromptStartedAt: number | null;
  shipyardSupportFirePromptStartedAt: number | null;
  shipyardContestedPromptStartedAt: number | null;
  enemyNodeId: string | null;
  evadeLessonMissileTargetNodeId: string | null;
  contestedNodeId: string | null;
  defensivePlayerNodeId: string | null;
  defensiveEscapeNodeId: string | null;
  defensiveMissileImpactTurn: number | null;
  firstEnemyKillReplayEventId: string | null;
  firstEnemyKillReplayNodeId: string | null;
  firstEnemyKillReplayLineSelected: boolean;
  firstEnemyKillReplayVictoryLessonPending: boolean;
  cameraZoomFocusHintDisplayCount: number;
  cameraZoomFocusHintVisible: boolean;
  cameraPanOrbitHintDisplayCount: number;
  cameraPanOrbitHintVisible: boolean;
  timers: number[];
  loggedKeys: Set<string>;
};
