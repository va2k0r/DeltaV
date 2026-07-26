import {
  tutorialCameraFocusHintText,
  tutorialCameraOrbitHintText,
  tutorialCameraPanOrbitHintText,
  tutorialCameraPanHintText,
  tutorialCameraZoomHintText,
  tutorialConfirmCameraPanOrbitHintText
} from "./constants";
import type { TutorialRuntimeState } from "./runtimeTypes";

type TutorialCameraHintDisplayPart =
  | Readonly<{
      text: string;
    }>
  | Readonly<Record<string, unknown>>;

export type TutorialCameraHintDisplayRow = Readonly<{
  parts: readonly TutorialCameraHintDisplayPart[];
  className?: string;
  key?: string;
}>;

const tutorialCameraHintDisplayLimit = 2;

export function removeTutorialCameraHintRows<TRow extends TutorialCameraHintDisplayRow>(
  rows: readonly TRow[]
): readonly TRow[] {
  return rows.filter((row) => {
    const key = row.key ?? "";
    return !isTutorialCameraHintRow(row) && !isTutorialCameraHintSpacerKey(key);
  });
}

export function applyTutorialCameraHintDisplayLimits<TRow extends TutorialCameraHintDisplayRow>(
  rows: readonly TRow[],
  tutorial: TutorialRuntimeState | null
): readonly TRow[] {
  if (tutorial === null) {
    return rows;
  }

  const hasZoomFocusHint = rows.some(isTutorialZoomFocusHintRow);
  const hasPanOrbitHint = rows.some(isTutorialPanOrbitHintRow);
  const showZoomFocusHint = resolveTutorialZoomFocusHintDisplay(tutorial, hasZoomFocusHint);
  const showPanOrbitHint = resolveTutorialPanOrbitHintDisplay(tutorial, hasPanOrbitHint);

  if (showZoomFocusHint && showPanOrbitHint) {
    return rows;
  }

  return rows.filter((row) =>
    shouldKeepTutorialCameraHintRow(row, showZoomFocusHint, showPanOrbitHint)
  );
}

function resolveTutorialZoomFocusHintDisplay(
  tutorial: TutorialRuntimeState,
  isVisible: boolean
): boolean {
  if (!isVisible) {
    tutorial.cameraZoomFocusHintVisible = false;
    return false;
  }

  if (tutorial.cameraZoomFocusHintVisible) {
    return tutorial.cameraZoomFocusHintDisplayCount <= tutorialCameraHintDisplayLimit;
  }

  if (tutorial.cameraZoomFocusHintDisplayCount >= tutorialCameraHintDisplayLimit) {
    return false;
  }

  tutorial.cameraZoomFocusHintDisplayCount += 1;
  tutorial.cameraZoomFocusHintVisible = true;
  return true;
}

function resolveTutorialPanOrbitHintDisplay(
  tutorial: TutorialRuntimeState,
  isVisible: boolean
): boolean {
  if (!isVisible) {
    tutorial.cameraPanOrbitHintVisible = false;
    return false;
  }

  if (tutorial.cameraPanOrbitHintVisible) {
    return tutorial.cameraPanOrbitHintDisplayCount <= tutorialCameraHintDisplayLimit;
  }

  if (tutorial.cameraPanOrbitHintDisplayCount >= tutorialCameraHintDisplayLimit) {
    return false;
  }

  tutorial.cameraPanOrbitHintDisplayCount += 1;
  tutorial.cameraPanOrbitHintVisible = true;
  return true;
}

function shouldKeepTutorialCameraHintRow(
  row: TutorialCameraHintDisplayRow,
  showZoomFocusHint: boolean,
  showPanOrbitHint: boolean
): boolean {
  if (isTutorialZoomFocusHintRow(row)) {
    return showZoomFocusHint;
  }

  if (isTutorialPanOrbitHintRow(row)) {
    return showPanOrbitHint;
  }

  const key = row.key ?? "";

  if (isTutorialZoomFocusHintSpacerKey(key)) {
    return showZoomFocusHint;
  }

  if (isTutorialPanOrbitHintSpacerKey(key)) {
    return showPanOrbitHint;
  }

  return true;
}

function isTutorialZoomFocusHintRow(row: TutorialCameraHintDisplayRow): boolean {
  const text = getTutorialCameraHintRowText(row);
  return text === tutorialCameraZoomHintText || text === tutorialCameraFocusHintText;
}

function isTutorialPanOrbitHintRow(row: TutorialCameraHintDisplayRow): boolean {
  const text = getTutorialCameraHintRowText(row);
  return text === tutorialCameraPanOrbitHintText || text === tutorialConfirmCameraPanOrbitHintText;
}

function isTutorialCameraHintRow(row: TutorialCameraHintDisplayRow): boolean {
  const text = getTutorialCameraHintRowText(row);
  return (
    isTutorialZoomFocusHintRow(row) ||
    isTutorialPanOrbitHintRow(row) ||
    text === tutorialCameraOrbitHintText ||
    text === tutorialCameraPanHintText
  );
}

function isTutorialCameraHintSpacerKey(key: string): boolean {
  return (
    isTutorialZoomFocusHintSpacerKey(key) ||
    isTutorialPanOrbitHintSpacerKey(key) ||
    key.endsWith(":zoom-spacer") ||
    key.endsWith(":orbit-spacer") ||
    key.endsWith(":pan-spacer")
  );
}

function isTutorialZoomFocusHintSpacerKey(key: string): boolean {
  return key === "tutorial:live-zoom-focus-hint:spacer" || key.endsWith(":zoom-hint-spacer");
}

function isTutorialPanOrbitHintSpacerKey(key: string): boolean {
  return (
    key.endsWith(":camera-pan-orbit-hint-lead-spacer") ||
    key.endsWith(":camera-pan-orbit-hint-spacer")
  );
}

function getTutorialCameraHintRowText(row: TutorialCameraHintDisplayRow): string {
  return row.parts.map((part) => ("text" in part ? part.text : "")).join("");
}
