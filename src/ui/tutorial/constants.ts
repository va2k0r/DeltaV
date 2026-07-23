export const tutorialOpeningOriginNodeId = "moon_node";
export const tutorialFallbackShipyardNodeId = "mars_node";
export const tutorialFirstBurnPromptNodeId = "jupiter_node";
export const tutorialEnemyFireNodeId = "venus_node";
export const tutorialDefensiveEnemyAssaultNodeId = "titan_node";
export const tutorialDefensiveEnemyFireNodeId = "mercury_node";
export const tutorialEvadeDvCost = 1;

type TutorialCameraPose = Readonly<{
  focus: readonly [number, number, number];
  focusOffset?: readonly [number, number, number];
  yaw: number;
  pitch: number;
  distance: number;
  focusedTargetKey: string | null;
  trackedFocusTargetKey: string | null;
  displayScaleFocusTargetKey?: string | null;
  displayScaleDistance?: number;
}>;

export const tutorialOpeningCameraPose = {
  focus: [-626.4921636184937, 0, 117.46770595701868],
  yaw: -2.5743606466916362,
  pitch: 0.9100000000000004,
  distance: 2168.3260012386177,
  focusedTargetKey: `node:${tutorialOpeningOriginNodeId}`,
  trackedFocusTargetKey: `node:${tutorialOpeningOriginNodeId}`,
  displayScaleFocusTargetKey: `node:${tutorialOpeningOriginNodeId}`,
  displayScaleDistance: 2168.3260012386177
} as const satisfies TutorialCameraPose;

export const tutorialFirstTritiumArrivalCameraPose = {
  focus: [-330.78766944588017, 0, 994.3844198630817],
  focusOffset: [-246.74149069172364, 0, -50.21133373551964],
  yaw: -7.917804253833143,
  pitch: 0.28,
  distance: 140.53901495760698,
  focusedTargetKey: "node:venus_node",
  trackedFocusTargetKey: "node:venus_node"
} as const satisfies TutorialCameraPose;

export const tutorialShipyardArrivalCameraPose = {
  focus: [1751.3593871687688, 0, 528.7665738281923],
  focusOffset: [-47.447298353907854, 0, 195.37746071696057],
  yaw: -5.017390191333303,
  pitch: 0.28,
  distance: 233.87052237583006,
  focusedTargetKey: `node:${tutorialFallbackShipyardNodeId}`,
  trackedFocusTargetKey: `node:${tutorialFallbackShipyardNodeId}`
} as const satisfies TutorialCameraPose;

export const tutorialFirstBurnConfusionDelayMs = 3600;
export const tutorialProductiveShipyardHintDelayMs = 850;
export const tutorialProductiveShipyardHintPulseSeconds = 0.34;
export const tutorialProductiveShipyardHintIntensityFloor = 0.64;
export const tutorialOverlayGuidanceDelayMs = 4200;
export const mandatoryLaunchGuidanceDelayMs = 3200;
export const tutorialCameraPanOrbitHintDelayMs = 9000;
export const tutorialCameraZoomHintDelayMs = 16000;
export const tutorialCameraControlsHintRetryDelayMs = 1800;
export const tutorialCameraControlsHintMinimumGapMs = 5200;
export const tutorialCameraControlsIdleHintDelayMs = 6800;
export const tutorialCameraGuidancePaused = true;
export const tutorialCameraPanOrbitHintText =
  "Left click and drag to pan camera, right click and drag to orbit.";
export const tutorialCameraZoomHintText = "Mouse wheel to zoom in / out.";
export const tutorialCameraOrbitHintText = "Right click and drag to orbit.";
export const tutorialCameraPanHintText = "Left click and drag to pan.";
export const tutorialCameraFocusHintText = "Double click to focus.";
export const tutorialConfirmCameraPanOrbitHintText =
  "Left click and drag to pan. Right click and drag to orbit.";
