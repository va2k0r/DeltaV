export type TutorialCommandTimelinePart = Readonly<{
  text: string;
  className?: string | undefined;
}>;

export type TutorialCommandTimelineRow = Readonly<{
  parts: readonly TutorialCommandTimelinePart[];
  className?: string;
  key?: string;
}>;

export const tutorialLiveHintClassName =
  "command-console__line--tutorial command-console__line--tutorial-live-hint";
export const tutorialDelayedLiveHintClassName =
  "command-console__line--tutorial command-console__line--tutorial-live-hint command-console__line--tutorial-live-hint-delayed";
export const tutorialCompleteHintClassName =
  "command-console__line--tutorial command-console__line--tutorial-complete-hint";
export const tutorialLineClassName = "command-console__line--tutorial";
export const tutorialSpacerClassName =
  "command-console__line--tutorial command-console__line--tutorial-spacer";

export function createTutorialSpacerRow(key?: string): TutorialCommandTimelineRow {
  return {
    parts: [{ text: "" }],
    className: tutorialSpacerClassName,
    ...(key === undefined ? {} : { key })
  };
}

export function expandTutorialSentenceRows(
  rows: readonly TutorialCommandTimelineRow[],
  keyPrefix: string
): readonly TutorialCommandTimelineRow[] {
  const expanded: TutorialCommandTimelineRow[] = [];

  for (const [rowIndex, row] of rows.entries()) {
    const rowKeyPrefix = row.key ?? `${keyPrefix}:sentence-row:${rowIndex}`;
    const sentenceRows = splitTutorialSentenceRow(row, rowKeyPrefix);
    expanded.push(...sentenceRows);
  }

  return collapseAdjacentTutorialSpacers(expanded);
}

function splitTutorialSentenceRow(
  row: TutorialCommandTimelineRow,
  keyPrefix: string
): readonly TutorialCommandTimelineRow[] {
  if (!shouldSplitTutorialSentenceRow(row)) {
    return [row];
  }

  const rows: TutorialCommandTimelineRow[] = [];
  let currentParts: TutorialCommandTimelinePart[] = [];
  let sentenceIndex = 0;

  for (const part of row.parts) {
    const textSegments = part.text.split(/(\.)/u);

    for (let index = 0; index < textSegments.length; index += 1) {
      const segment = textSegments[index] ?? "";

      if (segment.length > 0) {
        const text = currentParts.length === 0 ? segment.trimStart() : segment;

        if (text.length > 0) {
          currentParts.push({ ...part, text });
        }
      }

      if (segment === ".") {
        rows.push(createSplitTutorialSentenceRow(row, currentParts, keyPrefix, sentenceIndex));
        rows.push(createTutorialSpacerRow(`${keyPrefix}:spacer:${sentenceIndex}`));
        currentParts = [];
        sentenceIndex += 1;
      }
    }
  }

  if (currentParts.length === 0) {
    return rows.length === 0 ? [row] : rows;
  }

  rows.push(createSplitTutorialSentenceRow(row, currentParts, keyPrefix, sentenceIndex));
  return rows;
}

function shouldSplitTutorialSentenceRow(row: TutorialCommandTimelineRow): boolean {
  if (
    row.className === undefined ||
    !row.className.split(/\s+/u).includes("command-console__line--tutorial")
  ) {
    return false;
  }

  return ![
    "command-console__line--tutorial-spacer",
    "command-console__line--tutorial-live-hint",
    "command-console__line--tutorial-live-hint-delayed",
    "command-console__line--tutorial-complete-hint",
    "command-console__line--tutorial-overlay"
  ].some((className) => row.className?.split(/\s+/u).includes(className) === true);
}

function createSplitTutorialSentenceRow(
  row: TutorialCommandTimelineRow,
  parts: readonly TutorialCommandTimelinePart[],
  keyPrefix: string,
  sentenceIndex: number
): TutorialCommandTimelineRow {
  return {
    parts,
    ...(row.className === undefined ? {} : { className: row.className }),
    key: `${keyPrefix}:sentence:${sentenceIndex}`
  };
}

function collapseAdjacentTutorialSpacers(
  rows: readonly TutorialCommandTimelineRow[]
): readonly TutorialCommandTimelineRow[] {
  const collapsed: TutorialCommandTimelineRow[] = [];

  for (const row of rows) {
    const previous = collapsed[collapsed.length - 1];

    if (previous !== undefined && isTutorialSpacerRow(previous) && isTutorialSpacerRow(row)) {
      continue;
    }

    collapsed.push(row);
  }

  return collapsed;
}

function isTutorialSpacerRow(row: TutorialCommandTimelineRow): boolean {
  return row.className?.split(/\s+/u).includes("command-console__line--tutorial-spacer") === true;
}

export function getTutorialDelayedLiveHintClassName(startedAt: number | null): string {
  return startedAt === null ? tutorialCompleteHintClassName : tutorialDelayedLiveHintClassName;
}

export function freezeTutorialLiveHintClassName(className: string | undefined): string | undefined {
  if (className === undefined || !className.includes("command-console__line--tutorial")) {
    return className;
  }

  const classes = className.split(/\s+/).filter((value) => {
    return (
      value.length > 0 &&
      value !== "command-console__line--tutorial-live-hint" &&
      value !== "command-console__line--tutorial-live-hint-delayed"
    );
  });

  if (!classes.includes("command-console__line--tutorial-complete-hint")) {
    classes.push("command-console__line--tutorial-complete-hint");
  }

  return classes.join(" ");
}

export function isTutorialInputHint(text: string): boolean {
  const normalized = text.toLowerCase();
  return (
    normalized.includes("left click") ||
    normalized.includes("right click") ||
    normalized.includes("hover") ||
    normalized.includes("one ship must burn")
  );
}
