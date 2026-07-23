import {
  createTutorialSpacerRow,
  freezeTutorialLiveHintClassName,
  tutorialCompleteHintClassName,
  type TutorialCommandTimelineRow
} from "./rowCore";

type TutorialConfirmLiveRowOptions = Readonly<{
  cameraPanOrbitHintText?: string | undefined;
  zoomHintText?: string | undefined;
}>;

export function createTutorialSelectShipLiveRows(
  className: string,
  key: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [{ text: "Left click to select a ship." }],
      className,
      key
    },
    createTutorialSpacerRow(`${key}:spacer`)
  ];
}

export function createTutorialOpeningCameraControlLiveRows(
  key: string,
  zoomHintText: string,
  orbitHintText: string,
  panHintText: string,
  focusHintText: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [{ text: zoomHintText }],
      className: tutorialCompleteHintClassName,
      key: `${key}:zoom`
    },
    createTutorialSpacerRow(`${key}:zoom-spacer`),
    {
      parts: [{ text: orbitHintText }],
      className: tutorialCompleteHintClassName,
      key: `${key}:orbit`
    },
    createTutorialSpacerRow(`${key}:orbit-spacer`),
    {
      parts: [{ text: panHintText }],
      className: tutorialCompleteHintClassName,
      key: `${key}:pan`
    },
    createTutorialSpacerRow(`${key}:pan-spacer`),
    {
      parts: [{ text: focusHintText }],
      className: tutorialCompleteHintClassName,
      key: `${key}:focus`
    },
    createTutorialSpacerRow(`${key}:select-spacer`)
  ];
}

export function createTutorialConfirmTransferBurnLiveRows(
  className: string,
  key: string,
  playerClassName: string,
  options?: TutorialConfirmLiveRowOptions
): readonly TutorialCommandTimelineRow[] {
  return createTutorialConfirmLiveRowsWithHints(
    {
      parts: [
        { text: "Left click to confirm transfer " },
        { text: "BURN", className: playerClassName },
        { text: "." }
      ],
      className,
      key
    },
    className,
    key,
    options
  );
}

export function createTutorialConfirmFiringSolutionLiveRows(
  className: string,
  key: string,
  options?: TutorialConfirmLiveRowOptions
): readonly TutorialCommandTimelineRow[] {
  return createTutorialConfirmLiveRowsWithHints(
    {
      parts: [{ text: "Left click to confirm firing solution." }],
      className,
      key
    },
    className,
    key,
    options
  );
}

export function createTutorialEnterFireModeLiveRows(
  className: string,
  key: string,
  playerClassName: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [
        { text: "Right click to enter " },
        { text: "FIRE", className: playerClassName },
        { text: " mode." }
      ],
      className,
      key
    }
  ];
}

export function createTutorialZoomFocusLiveRows(
  _className: string,
  key: string,
  zoomHintText: string,
  focusHintText: string
): readonly TutorialCommandTimelineRow[] {
  return [
    {
      parts: [{ text: zoomHintText }],
      className: tutorialCompleteHintClassName,
      key: `${key}:zoom`
    },
    createTutorialSpacerRow(`${key}:spacer`),
    {
      parts: [{ text: focusHintText }],
      className: tutorialCompleteHintClassName,
      key: `${key}:focus`
    }
  ];
}

export function createTutorialConfirmBurnLiveRows(
  className: string,
  key: string,
  options?: TutorialConfirmLiveRowOptions
): readonly TutorialCommandTimelineRow[] {
  const confirmRow: TutorialCommandTimelineRow = {
    parts: [{ text: "Left click to confirm burn." }],
    className,
    key
  };

  return createTutorialConfirmLiveRowsWithHints(confirmRow, className, key, options);
}

function createTutorialConfirmLiveRowsWithHints(
  confirmRow: TutorialCommandTimelineRow,
  className: string,
  key: string,
  options?: TutorialConfirmLiveRowOptions
): readonly TutorialCommandTimelineRow[] {
  const rows: TutorialCommandTimelineRow[] = [];
  const hintClassName = getStaticTutorialHintClassName(className);

  if (options?.zoomHintText !== undefined) {
    rows.push(
      {
        parts: [{ text: options.zoomHintText }],
        className: hintClassName,
        key: `${key}:zoom-hint`
      },
      createTutorialSpacerRow(`${key}:zoom-hint-spacer`)
    );
  }

  if (options?.cameraPanOrbitHintText !== undefined) {
    if (rows.length === 0) {
      rows.push(createTutorialSpacerRow(`${key}:camera-pan-orbit-hint-lead-spacer`));
    }

    rows.push(
      {
        parts: [{ text: options.cameraPanOrbitHintText }],
        className: hintClassName,
        key: `${key}:camera-pan-orbit-hint`
      },
      createTutorialSpacerRow(`${key}:camera-pan-orbit-hint-spacer`)
    );
  }

  rows.push(confirmRow);
  return rows;
}

function getStaticTutorialHintClassName(className: string): string {
  return freezeTutorialLiveHintClassName(className) ?? className;
}

export function createTutorialOverlayLiveHintRow(text: string): TutorialCommandTimelineRow {
  return {
    parts: [{ text }],
    className: "command-console__line--tutorial command-console__line--tutorial-overlay",
    key: `tutorial-overlay:${text}`
  };
}
