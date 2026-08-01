import {
  gameGlossaryDetailMaxDurationMs,
  gameGlossaryDetailMinDurationMs,
  gameGlossaryDetailMsPerCharacter,
  gameGlossaryHoverDwellMs,
  gameGlossaryHoverReleaseMs,
  gameGlossaryTypewriterMaxDurationMs,
  gameGlossaryTypewriterMinDurationMs,
  gameGlossaryTypewriterMsPerCharacter,
  getGameGlossaryEntry,
  tokenizeGameGlossaryText,
  type GameGlossaryEntry
} from "./gameGlossary";

type GlossaryTypewriterTarget = Readonly<{
  element: HTMLSpanElement;
  text: string;
}>;

type GlossaryDetailHistoryEntry = Readonly<{
  glossaryId: string;
  label: string;
}>;

export type GameGlossaryLineContext = Readonly<{
  kind: "dv";
  factionLabel: string;
  currentDv: number;
  committedDv: number;
  nextTurnDv: number;
  pendingBurnCost: number;
  upkeepCost: number;
  evadeCost: number;
  income: number;
  history: readonly number[];
}>;

type GlossaryHoverRootOptions = Readonly<{
  dwellMs?: number;
}>;

type GlossaryHoverHandoffOptions = Readonly<{
  root: HTMLElement;
  clientX: number;
  clientY: number;
  activeDurationMs: number;
  minimumVisibleDurationMs: number;
}>;

type GameGlossaryControllerOptions = Readonly<{
  onTutorialLogbookIntroductionComplete?: () => void;
  onTutorialLogbookIntroductionStepChange?: () => void;
}>;

export const tutorialLogbookLabel = "Logbook";
export const gameMenuGlossaryHoverDwellMs = 240;
export const tutorialLogbookOpenInstruction =
  "Left-click any word in the logbook to open its explanation.";
export const tutorialLogbookExpandInstruction =
  "In the open Logbook panel, left-click this instruction to expand the explanation further.";
export const tutorialLogbookReturnInstruction =
  "Left-click the title to return to the previous explanation.";

export type TutorialLogbookIntroductionStep =
  | "inactive"
  | "open-prompt"
  | "expand-prompt"
  | "return-prompt";

export function advanceTutorialLogbookIntroduction(
  step: TutorialLogbookIntroductionStep
): TutorialLogbookIntroductionStep {
  switch (step) {
    case "inactive":
      return "open-prompt";
    case "open-prompt":
      return "expand-prompt";
    case "expand-prompt":
      return "return-prompt";
    case "return-prompt":
      return "inactive";
  }
}

export type GameGlossaryController = Readonly<{
  hoverPanel: HTMLElement;
  detailPanel: HTMLElement;
  bindRoot: (root: HTMLElement) => void;
  bindHoverRoot: (root: HTMLElement, options?: GlossaryHoverRootOptions) => void;
  beginHoverHandoff: (options: GlossaryHoverHandoffOptions) => void;
  beginTutorialLogbookIntroduction: () => void;
  restoreTutorialLogbookIntroduction: () => void;
  endTutorialLogbookIntroduction: () => void;
  getTutorialLogbookIntroductionStep: () => TutorialLogbookIntroductionStep;
  isTutorialLogbookIntroductionActive: () => boolean;
  closeAll: () => void;
}>;

export function createGameGlossaryTextSpans(
  document: Document,
  text: string,
  className?: string
): readonly HTMLSpanElement[] {
  return tokenizeGameGlossaryText(text).map((token) => {
    const span = document.createElement("span");
    span.textContent = token.text;

    if (className !== undefined) {
      span.className = className;
    }

    if (token.glossaryId !== undefined) {
      applyGlossaryTokenSemantics(span, token.glossaryId, token.text);
    }

    return span;
  });
}

export function createGameGlossaryController(
  document: Document,
  view: Window,
  options: GameGlossaryControllerOptions = {}
): GameGlossaryController {
  const hoverPanel = document.createElement("aside");
  hoverPanel.className = "command-glossary-hover is-hidden";
  hoverPanel.setAttribute("aria-live", "polite");
  hoverPanel.setAttribute("aria-atomic", "true");
  hoverPanel.setAttribute("aria-hidden", "true");

  const hoverLabel = document.createElement("div");
  hoverLabel.className = "command-glossary-hover__label";

  const hoverText = document.createElement("div");
  hoverText.className = "command-glossary-hover__text";
  hoverPanel.append(hoverLabel, hoverText);

  const detailPanel = document.createElement("aside");
  detailPanel.className = "command-glossary-detail is-hidden";
  detailPanel.setAttribute("aria-live", "polite");
  detailPanel.setAttribute("aria-atomic", "false");
  detailPanel.setAttribute("aria-hidden", "true");

  const detailLabel = document.createElement("div");
  detailLabel.className = "command-glossary-detail__label";

  const detailBody = document.createElement("div");
  detailBody.className = "command-glossary-detail__body";
  detailPanel.append(detailLabel, detailBody);

  const interactiveRoots = new Set<HTMLElement>();
  const hoverRootDwellMs = new Map<HTMLElement, number>();
  let hoverDwellTimer: number | null = null;
  let hoverReleaseTimer: number | null = null;
  let hoverAnimationFrame: number | null = null;
  let hoverGeneration = 0;
  let hoveredHoverKey: string | null = null;
  let hoveredHoverToken: HTMLElement | null = null;
  let hoverMinimumVisibleUntil = 0;
  let hoverHandoffRoot: HTMLElement | null = null;
  let hoverHandoffUntil = 0;
  let hoverHandoffTimer: number | null = null;
  let detailAnimationFrame: number | null = null;
  let detailGeneration = 0;
  let detailSourceToken: HTMLElement | null = null;
  let detailSourceLineKey: string | null = null;
  let detailHistory: GlossaryDetailHistoryEntry[] = [];
  let tutorialLogbookIntroductionStep: TutorialLogbookIntroductionStep = "inactive";
  const handledActivationEvents = new WeakSet<Event>();

  const bindRoot = (root: HTMLElement): void => {
    interactiveRoots.add(root);
    root.addEventListener("pointerover", handlePointerOver, true);
    root.addEventListener("pointerout", handlePointerOut, true);
    root.addEventListener("mouseover", handlePointerOver, true);
    root.addEventListener("mouseout", handlePointerOut, true);
    root.addEventListener("focusin", handleFocusIn, true);
    root.addEventListener("focusout", handleFocusOut, true);
    root.addEventListener("pointerdown", captureGlossaryPointerDown, true);
    root.addEventListener("click", handleGlossaryClick, true);
    root.addEventListener("keydown", handleGlossaryKeydown, true);
  };

  const bindHoverRoot = (root: HTMLElement, options: GlossaryHoverRootOptions = {}): void => {
    hoverRootDwellMs.set(root, Math.max(0, options.dwellMs ?? gameGlossaryHoverDwellMs));
    root.addEventListener("pointerover", handleStaticPointerOver, true);
    root.addEventListener("pointerout", handleStaticPointerOut, true);
    root.addEventListener("mouseover", handleStaticPointerOver, true);
    root.addEventListener("mouseout", handleStaticPointerOut, true);
    root.addEventListener("focusin", handleStaticFocusIn, true);
    root.addEventListener("focusout", handleStaticFocusOut, true);
  };

  const beginHoverHandoff = (options: GlossaryHoverHandoffOptions): void => {
    cancelHoverHandoff();
    const token = findNearestGlossaryToken(options.root, options.clientX, options.clientY);

    if (token === null) {
      return;
    }

    const now = view.performance.now();
    hoverHandoffRoot = options.root;
    hoverHandoffUntil = now + Math.max(0, options.activeDurationMs);
    hoverMinimumVisibleUntil = Math.max(
      hoverMinimumVisibleUntil,
      now + Math.max(0, options.minimumVisibleDurationMs)
    );
    revealGlossaryHoverImmediately(token);
    hoverHandoffTimer = view.setTimeout(
      () => {
        hoverHandoffTimer = null;
        finishHoverHandoff();
      },
      Math.max(0, options.activeDurationMs)
    );
  };

  const beginTutorialLogbookIntroduction = (): void => {
    tutorialLogbookIntroductionStep = "inactive";
    closeAll();
    tutorialLogbookIntroductionStep = advanceTutorialLogbookIntroduction(
      tutorialLogbookIntroductionStep
    );
  };

  const restoreTutorialLogbookIntroduction = (): void => {
    if (
      tutorialLogbookIntroductionStep === "expand-prompt" ||
      tutorialLogbookIntroductionStep === "return-prompt"
    ) {
      renderTutorialLogbookDetailPrompt();
    }
  };

  const endTutorialLogbookIntroduction = (): void => {
    tutorialLogbookIntroductionStep = "inactive";
    closeAll();
  };

  const isTutorialLogbookIntroductionActive = (): boolean =>
    tutorialLogbookIntroductionStep !== "inactive";

  const getTutorialLogbookIntroductionStep = (): TutorialLogbookIntroductionStep =>
    tutorialLogbookIntroductionStep;

  function handlePointerOver(event: MouseEvent): void {
    const token = getGlossaryToken(event.target);

    if (token === null || token.contains(asNode(event.relatedTarget))) {
      return;
    }

    const glossaryId = token.dataset["glossaryId"];

    if (glossaryId !== undefined) {
      scheduleHover(glossaryId, token);
    }
  }

  function handlePointerOut(event: MouseEvent): void {
    const token = getGlossaryToken(event.target);

    if (token === null || token.contains(asNode(event.relatedTarget))) {
      return;
    }

    scheduleHoverClear();
  }

  function handleFocusIn(event: FocusEvent): void {
    const glossaryId = getGlossaryToken(event.target)?.dataset["glossaryId"];
    const token = getGlossaryToken(event.target);

    if (glossaryId !== undefined && token !== null) {
      scheduleHover(glossaryId, token);
    }
  }

  function handleFocusOut(event: FocusEvent): void {
    const token = getGlossaryToken(event.target);

    if (token !== null && !token.contains(asNode(event.relatedTarget))) {
      scheduleHoverClear();
    }
  }

  function handleStaticPointerOver(event: MouseEvent): void {
    const token = getStaticHoverToken(event.target);

    if (token === null || token.contains(asNode(event.relatedTarget))) {
      return;
    }

    scheduleStaticHover(token);
  }

  function handleStaticPointerOut(event: MouseEvent): void {
    const token = getStaticHoverToken(event.target);

    if (token === null || token.contains(asNode(event.relatedTarget))) {
      return;
    }

    scheduleHoverClear();
  }

  function handleStaticFocusIn(event: FocusEvent): void {
    const token = getStaticHoverToken(event.target);

    if (token !== null) {
      scheduleStaticHover(token);
    }
  }

  function handleStaticFocusOut(event: FocusEvent): void {
    const token = getStaticHoverToken(event.target);

    if (token !== null && !token.contains(asNode(event.relatedTarget))) {
      scheduleHoverClear();
    }
  }

  function captureGlossaryPointerDown(event: PointerEvent): void {
    if (getGlossaryToken(event.target) === null) {
      return;
    }

    event.stopImmediatePropagation();
  }

  function handleDocumentPointerDown(event: PointerEvent): void {
    if (
      event.button !== 0 ||
      !detailPanel.classList.contains("is-visible") ||
      isInsideInteractiveRoot(event.target) ||
      tutorialLogbookIntroductionStep !== "inactive"
    ) {
      return;
    }

    closeAll();
  }

  function handleDetailPanelPointerDown(event: PointerEvent): void {
    if (event.button !== 2) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    closeAll();
  }

  function handleDetailPanelContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopImmediatePropagation();
    closeAll();
  }

  function preventDetailPanelSelection(event: Event): void {
    event.preventDefault();
  }

  function isInsideInteractiveRoot(target: EventTarget | null): boolean {
    const node = asNode(target);
    return node !== null && [...interactiveRoots].some((root) => root.contains(node));
  }

  function handleGlossaryClick(event: MouseEvent): void {
    const token = getGlossaryToken(event.target);
    const glossaryId = token?.dataset["glossaryId"];

    if (glossaryId === undefined || token === null || handledActivationEvents.has(event)) {
      return;
    }

    handledActivationEvents.add(event);

    if (handleTutorialLogbookTokenActivation(event, token)) {
      return;
    }

    if (shouldPassTutorialReplayCueActivationThrough(token)) {
      closeAll();
      return;
    }

    if (isDetailOpenForToken(glossaryId, token)) {
      closeAll();
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    openDetail(glossaryId, token);
  }

  function handleGlossaryKeydown(event: KeyboardEvent): void {
    const token = getGlossaryToken(event.target);
    const glossaryId = token?.dataset["glossaryId"];

    if (glossaryId === undefined || token === null || handledActivationEvents.has(event)) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      handledActivationEvents.add(event);

      if (handleTutorialLogbookTokenActivation(event, token)) {
        return;
      }

      if (shouldPassTutorialReplayCueActivationThrough(token)) {
        closeAll();
        return;
      }

      if (isDetailOpenForToken(glossaryId, token)) {
        closeAll();
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      openDetail(glossaryId, token);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearDetail();
    }
  }

  function scheduleHover(glossaryId: string, token: HTMLElement): void {
    const entry = getGameGlossaryEntry(glossaryId);

    if (entry === undefined) {
      return;
    }

    scheduleHoverCopy(
      `glossary:${glossaryId}`,
      getGlossaryTokenLabel(token, entry.label),
      entry.short,
      token
    );
  }

  function scheduleStaticHover(token: HTMLElement): void {
    const label = token.dataset["glossaryHoverLabel"];
    const text = token.dataset["glossaryHoverText"];

    if (label === undefined || text === undefined) {
      return;
    }

    scheduleHoverCopy(
      `static:${label}\u0000${text}`,
      label,
      text,
      token,
      getHoverRootDwellMs(token)
    );
  }

  function getHoverRootDwellMs(token: HTMLElement): number {
    for (const [root, dwellMs] of hoverRootDwellMs) {
      if (root.contains(token)) {
        return dwellMs;
      }
    }

    return gameGlossaryHoverDwellMs;
  }

  function scheduleHoverCopy(
    hoverKey: string,
    label: string,
    text: string,
    token: HTMLElement,
    dwellMs = gameGlossaryHoverDwellMs
  ): void {
    clearHoverReleaseTimer();

    if (
      hoveredHoverKey === hoverKey &&
      hoveredHoverToken === token &&
      hoverPanel.classList.contains("is-visible")
    ) {
      return;
    }

    clearHoverDwellTimer();
    hoverGeneration += 1;
    const generation = hoverGeneration;
    hoveredHoverKey = hoverKey;
    hoveredHoverToken = token;
    hoverDwellTimer = view.setTimeout(() => {
      hoverDwellTimer = null;

      if (
        generation !== hoverGeneration ||
        hoveredHoverKey !== hoverKey ||
        hoveredHoverToken !== token
      ) {
        return;
      }

      revealHover(label, text, token, generation);
    }, dwellMs);
  }

  function scheduleHoverClear(): void {
    clearHoverDwellTimer();
    clearHoverReleaseTimer();
    const generation = hoverGeneration;
    const minimumHoldMs = Math.max(0, hoverMinimumVisibleUntil - view.performance.now());
    hoverReleaseTimer = view.setTimeout(
      () => {
        hoverReleaseTimer = null;

        if (generation === hoverGeneration) {
          clearHoverImmediately();
        }
      },
      Math.max(gameGlossaryHoverReleaseMs, minimumHoldMs)
    );
  }

  function revealGlossaryHoverImmediately(token: HTMLElement): void {
    const glossaryId = token.dataset["glossaryId"];
    const entry = glossaryId === undefined ? undefined : getGameGlossaryEntry(glossaryId);

    if (entry === undefined || glossaryId === undefined) {
      return;
    }

    const hoverKey = `glossary:${glossaryId}`;
    clearHoverDwellTimer();
    clearHoverReleaseTimer();

    if (
      hoveredHoverKey === hoverKey &&
      hoveredHoverToken === token &&
      hoverPanel.classList.contains("is-visible")
    ) {
      return;
    }

    hoverGeneration += 1;
    hoveredHoverKey = hoverKey;
    hoveredHoverToken = token;
    revealHover(getGlossaryTokenLabel(token, entry.label), entry.short, token, hoverGeneration);
  }

  function handleDocumentPointerMove(event: PointerEvent): void {
    const root = hoverHandoffRoot;

    if (root === null) {
      return;
    }

    if (view.performance.now() >= hoverHandoffUntil) {
      finishHoverHandoff();
      return;
    }

    if (!isPointInsideElement(root, event.clientX, event.clientY)) {
      scheduleHoverClear();
      return;
    }

    const token = findNearestGlossaryToken(root, event.clientX, event.clientY);

    if (token !== null) {
      revealGlossaryHoverImmediately(token);
    }
  }

  function finishHoverHandoff(): void {
    if (hoverHandoffTimer !== null) {
      view.clearTimeout(hoverHandoffTimer);
      hoverHandoffTimer = null;
    }

    hoverHandoffRoot = null;
    hoverHandoffUntil = 0;
    scheduleHoverClear();
  }

  function cancelHoverHandoff(): void {
    if (hoverHandoffTimer !== null) {
      view.clearTimeout(hoverHandoffTimer);
      hoverHandoffTimer = null;
    }

    hoverHandoffRoot = null;
    hoverHandoffUntil = 0;
  }

  function revealHover(label: string, text: string, token: HTMLElement, generation: number): void {
    cancelHoverAnimation();
    alignHoverPanelToToken(token);
    hoverLabel.textContent = label;
    hoverText.textContent = "";
    hoverPanel.classList.remove("is-hidden");
    hoverPanel.classList.add("is-visible", "is-typewriting");
    hoverPanel.setAttribute("aria-hidden", "false");

    const durationMs = getGlossaryTypewriterDuration(text);
    const startedAt = performance.now();

    const typeNextFrame = (): void => {
      if (generation !== hoverGeneration) {
        return;
      }

      const progress = clampGlossaryProgress((performance.now() - startedAt) / durationMs);
      const visibleCharacters = Math.min(
        text.length,
        Math.max(1, Math.floor(text.length * progress))
      );
      hoverText.textContent = text.slice(0, visibleCharacters);

      if (visibleCharacters >= text.length) {
        hoverText.textContent = text;
        hoverPanel.classList.remove("is-typewriting");
        hoverAnimationFrame = null;
        return;
      }

      hoverAnimationFrame = view.requestAnimationFrame(typeNextFrame);
    };

    hoverAnimationFrame = view.requestAnimationFrame(typeNextFrame);
  }

  function alignHoverPanelToToken(token: HTMLElement): void {
    const line =
      token.closest<HTMLElement>(".command-console__line, .command-glossary-detail__line") ?? token;
    hoverPanel.style.top = `${Math.round(line.getBoundingClientRect().top)}px`;
  }

  function isDetailOpenForToken(glossaryId: string, token: HTMLElement): boolean {
    const sourceLineKey = getGlossarySourceLineKey(token);

    return (
      (detailSourceToken === token ||
        (sourceLineKey !== null && detailPanel.dataset["sourceLineKey"] === sourceLineKey)) &&
      detailPanel.dataset["glossaryId"] === glossaryId &&
      detailPanel.classList.contains("is-visible")
    );
  }

  function shouldPassTutorialReplayCueActivationThrough(token: HTMLElement): boolean {
    const cueLine = token.closest<HTMLElement>(".command-console__line--tutorial-replay-cue");

    if (cueLine === null) {
      return false;
    }

    if (cueLine.classList.contains("is-command-scrollback-review-target")) {
      return true;
    }

    const sourceLineKey = getGlossarySourceLineKey(token);
    return (
      sourceLineKey !== null &&
      detailPanel.dataset["sourceLineKey"] === sourceLineKey &&
      detailPanel.classList.contains("is-visible")
    );
  }

  function handleTutorialLogbookTokenActivation(event: Event, token: HTMLElement): boolean {
    if (tutorialLogbookIntroductionStep === "inactive") {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();

    if (tutorialLogbookIntroductionStep === "open-prompt" && !detailPanel.contains(token)) {
      clearHoverImmediately();
      tutorialLogbookIntroductionStep = advanceTutorialLogbookIntroduction(
        tutorialLogbookIntroductionStep
      );
      renderTutorialLogbookDetailPrompt();
      options.onTutorialLogbookIntroductionStepChange?.();
    }

    return true;
  }

  function renderTutorialLogbookDetailPrompt(): void {
    const isExpandPrompt = tutorialLogbookIntroductionStep === "expand-prompt";
    const isReturnPrompt = tutorialLogbookIntroductionStep === "return-prompt";

    if (!isExpandPrompt && !isReturnPrompt) {
      return;
    }

    detailGeneration += 1;
    cancelDetailAnimation();
    detailSourceToken = null;
    detailSourceLineKey = null;
    detailHistory = [];
    detailPanel.removeAttribute("data-glossary-id");
    detailPanel.removeAttribute("data-source-line-key");
    detailPanel.dataset["density"] = "brief";
    detailPanel.dataset["tutorialLogbookStep"] = tutorialLogbookIntroductionStep;
    detailPanel.classList.remove("is-hidden", "is-typewriting");
    detailPanel.classList.add("is-visible");
    detailPanel.setAttribute("aria-hidden", "false");
    detailLabel.textContent = tutorialLogbookLabel;
    detailLabel.classList.remove("can-go-back", "is-tutorial-logbook-attention");
    detailLabel.removeAttribute("tabindex");
    detailLabel.removeAttribute("role");
    detailLabel.removeAttribute("aria-label");
    detailBody.innerHTML = "";

    const action = document.createElement("div");
    action.className = "command-glossary-detail__line command-glossary-detail__tutorial-action";
    action.textContent = isExpandPrompt
      ? tutorialLogbookExpandInstruction
      : tutorialLogbookReturnInstruction;
    detailBody.append(action);

    if (isExpandPrompt) {
      action.classList.add("is-tutorial-logbook-attention");
      action.tabIndex = 0;
      action.setAttribute("role", "button");
      action.setAttribute("aria-label", tutorialLogbookExpandInstruction);
      return;
    }

    detailLabel.classList.add("can-go-back", "is-tutorial-logbook-attention");
    detailLabel.tabIndex = 0;
    detailLabel.setAttribute("role", "button");
    detailLabel.setAttribute("aria-label", tutorialLogbookReturnInstruction);
  }

  function handleTutorialLogbookDetailClick(event: MouseEvent): void {
    if (
      tutorialLogbookIntroductionStep !== "expand-prompt" ||
      getTutorialLogbookDetailAction(event.target) === null
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    tutorialLogbookIntroductionStep = advanceTutorialLogbookIntroduction(
      tutorialLogbookIntroductionStep
    );
    renderTutorialLogbookDetailPrompt();
    options.onTutorialLogbookIntroductionStepChange?.();
  }

  function handleTutorialLogbookDetailKeydown(event: KeyboardEvent): void {
    if (
      tutorialLogbookIntroductionStep !== "expand-prompt" ||
      (event.key !== "Enter" && event.key !== " ") ||
      getTutorialLogbookDetailAction(event.target) === null
    ) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    tutorialLogbookIntroductionStep = advanceTutorialLogbookIntroduction(
      tutorialLogbookIntroductionStep
    );
    renderTutorialLogbookDetailPrompt();
    options.onTutorialLogbookIntroductionStepChange?.();
  }

  function openDetail(glossaryId: string, sourceToken: HTMLElement): void {
    const baseEntry = getGameGlossaryEntry(glossaryId);

    if (baseEntry === undefined) {
      return;
    }

    const isNestedDetail =
      detailPanel.classList.contains("is-visible") && detailPanel.contains(sourceToken);
    const entry = isNestedDetail
      ? baseEntry
      : createContextualGameGlossaryEntry(baseEntry, sourceToken, document);
    const label = getGlossaryTokenLabel(sourceToken, entry.label);

    if (isNestedDetail) {
      detailHistory.push({ glossaryId, label });
    } else {
      detailSourceToken = sourceToken;
      detailSourceLineKey = getGlossarySourceLineKey(sourceToken);
      detailHistory = [{ glossaryId, label }];
    }

    renderDetail(entry, label, true);
  }

  function renderDetail(entry: GameGlossaryEntry, label: string, shouldTypewrite: boolean): void {
    detailGeneration += 1;
    const generation = detailGeneration;
    cancelDetailAnimation();
    detailPanel.dataset["glossaryId"] = entry.id;
    detailPanel.removeAttribute("data-tutorial-logbook-step");
    if (detailSourceLineKey === null) {
      detailPanel.removeAttribute("data-source-line-key");
    } else {
      detailPanel.dataset["sourceLineKey"] = detailSourceLineKey;
    }
    detailPanel.classList.remove("is-hidden", "is-typewriting");
    detailPanel.classList.add("is-visible");
    detailPanel.classList.toggle("is-typewriting", shouldTypewrite);
    detailPanel.dataset["density"] = getGlossaryDetailDensity(entry);
    detailPanel.setAttribute("aria-hidden", "false");
    detailLabel.textContent = label;
    detailLabel.classList.remove("is-tutorial-logbook-attention");
    syncDetailLabelBackSemantics();
    detailBody.innerHTML = "";

    const lines = getGameGlossaryDetailParagraphs(entry).map((paragraph) => {
      const line = document.createElement("div");
      line.className = "command-glossary-detail__line";
      line.classList.toggle("command-glossary-detail__line--spacer", paragraph.length === 0);
      line.classList.toggle("command-glossary-detail__line--advice", paragraph.startsWith("• "));
      const spans = createGameGlossaryTextSpans(document, paragraph);
      const targets = spans.map((span) => {
        const text = span.textContent ?? "";
        applyGlossaryDetailTokenTone(span, text);
        if (shouldTypewrite) {
          span.textContent = "";
        }
        line.append(span);
        return { element: span, text };
      });
      detailBody.append(line);
      return { line, targets };
    });

    if (shouldTypewrite) {
      void typeDetailLines(lines, generation);
    }
  }

  function handleDetailLabelClick(event: MouseEvent): void {
    if (tutorialLogbookIntroductionStep === "return-prompt") {
      event.preventDefault();
      event.stopImmediatePropagation();
      completeTutorialLogbookIntroduction();
      return;
    }

    if (!restorePreviousDetail()) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function handleDetailLabelKeydown(event: KeyboardEvent): void {
    if (
      tutorialLogbookIntroductionStep === "return-prompt" &&
      (event.key === "Enter" || event.key === " ")
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      completeTutorialLogbookIntroduction();
      return;
    }

    if ((event.key !== "Enter" && event.key !== " ") || !restorePreviousDetail()) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
  }

  function restorePreviousDetail(): boolean {
    if (detailHistory.length <= 1) {
      return false;
    }

    detailHistory.pop();
    const previousHistoryEntry = detailHistory.at(-1);
    const previousEntry =
      previousHistoryEntry === undefined
        ? undefined
        : getGameGlossaryEntry(previousHistoryEntry.glossaryId);

    if (previousEntry === undefined || previousHistoryEntry === undefined) {
      closeAll();
      return true;
    }

    const restoredEntry =
      detailHistory.length === 1 && detailSourceToken !== null
        ? createContextualGameGlossaryEntry(previousEntry, detailSourceToken, document)
        : previousEntry;
    renderDetail(restoredEntry, previousHistoryEntry.label, false);
    return true;
  }

  function completeTutorialLogbookIntroduction(): void {
    tutorialLogbookIntroductionStep = advanceTutorialLogbookIntroduction(
      tutorialLogbookIntroductionStep
    );
    closeAll();
    options.onTutorialLogbookIntroductionComplete?.();
  }

  function syncDetailLabelBackSemantics(): void {
    const canGoBack = detailHistory.length > 1;
    detailLabel.classList.toggle("can-go-back", canGoBack);

    if (canGoBack) {
      detailLabel.tabIndex = 0;
      detailLabel.setAttribute("role", "button");
      detailLabel.setAttribute("aria-label", "Return to previous explanation");
      return;
    }

    detailLabel.removeAttribute("tabindex");
    detailLabel.removeAttribute("role");
    detailLabel.removeAttribute("aria-label");
  }

  async function typeDetailLines(
    lines: readonly Readonly<{
      line: HTMLElement;
      targets: readonly GlossaryTypewriterTarget[];
    }>[],
    generation: number
  ): Promise<void> {
    for (const item of lines) {
      if (generation !== detailGeneration) {
        return;
      }

      await typeDetailLine(item.line, item.targets, generation);
    }

    if (generation === detailGeneration) {
      detailPanel.classList.remove("is-typewriting");
    }
  }

  function typeDetailLine(
    line: HTMLElement,
    targets: readonly GlossaryTypewriterTarget[],
    generation: number
  ): Promise<void> {
    const fullText = targets.map((target) => target.text).join("");
    const durationMs = getGlossaryDetailTypewriterDuration(fullText);
    const startedAt = performance.now();
    const cursor = document.createElement("span");
    cursor.className = "command-console__type-cursor command-glossary-detail__cursor";
    line.append(cursor);

    const renderCharacters = (visibleCharacters: number): void => {
      let remainingCharacters = visibleCharacters;

      for (const target of targets) {
        const visibleInTarget = Math.max(0, Math.min(remainingCharacters, target.text.length));
        target.element.textContent = target.text.slice(0, visibleInTarget);
        remainingCharacters -= visibleInTarget;
      }
    };

    return new Promise((resolve) => {
      const typeNextFrame = (): void => {
        if (generation !== detailGeneration) {
          cursor.remove();
          resolve();
          return;
        }

        const progress = clampGlossaryProgress((performance.now() - startedAt) / durationMs);
        const visibleCharacters = Math.min(
          fullText.length,
          Math.max(1, Math.floor(fullText.length * progress))
        );
        renderCharacters(visibleCharacters);

        if (visibleCharacters >= fullText.length) {
          renderCharacters(fullText.length);
          cursor.remove();
          detailAnimationFrame = null;
          resolve();
          return;
        }

        detailAnimationFrame = view.requestAnimationFrame(typeNextFrame);
      };

      detailAnimationFrame = view.requestAnimationFrame(typeNextFrame);
    });
  }

  function clearDetail(): void {
    detailSourceToken = null;
    detailSourceLineKey = null;
    detailHistory = [];
    detailGeneration += 1;
    cancelDetailAnimation();
    detailPanel.removeAttribute("data-glossary-id");
    detailPanel.removeAttribute("data-source-line-key");
    detailPanel.removeAttribute("data-density");
    detailPanel.removeAttribute("data-tutorial-logbook-step");
    detailPanel.classList.remove("is-visible", "is-typewriting");
    detailPanel.classList.add("is-hidden");
    detailPanel.setAttribute("aria-hidden", "true");
    detailLabel.textContent = "";
    detailLabel.classList.remove("is-tutorial-logbook-attention");
    syncDetailLabelBackSemantics();
    detailBody.innerHTML = "";
  }

  function clearHoverImmediately(): void {
    hoverGeneration += 1;
    clearHoverDwellTimer();
    clearHoverReleaseTimer();
    cancelHoverAnimation();
    hoveredHoverKey = null;
    hoveredHoverToken = null;
    hoverMinimumVisibleUntil = 0;
    hoverPanel.classList.remove("is-visible", "is-typewriting");
    hoverPanel.classList.add("is-hidden");
    hoverPanel.setAttribute("aria-hidden", "true");
    hoverLabel.textContent = "";
    hoverText.textContent = "";
  }

  function closeAll(): void {
    cancelHoverHandoff();
    hoverMinimumVisibleUntil = 0;
    clearHoverImmediately();
    clearDetail();
  }

  function clearHoverDwellTimer(): void {
    if (hoverDwellTimer !== null) {
      view.clearTimeout(hoverDwellTimer);
      hoverDwellTimer = null;
    }
  }

  function clearHoverReleaseTimer(): void {
    if (hoverReleaseTimer !== null) {
      view.clearTimeout(hoverReleaseTimer);
      hoverReleaseTimer = null;
    }
  }

  function cancelHoverAnimation(): void {
    if (hoverAnimationFrame !== null) {
      view.cancelAnimationFrame(hoverAnimationFrame);
      hoverAnimationFrame = null;
    }
  }

  function cancelDetailAnimation(): void {
    if (detailAnimationFrame !== null) {
      view.cancelAnimationFrame(detailAnimationFrame);
      detailAnimationFrame = null;
    }
  }

  detailPanel.addEventListener("pointerdown", handleDetailPanelPointerDown, true);
  detailPanel.addEventListener("contextmenu", handleDetailPanelContextMenu, true);
  detailPanel.addEventListener("selectstart", preventDetailPanelSelection, true);
  detailPanel.addEventListener("dragstart", preventDetailPanelSelection, true);
  detailPanel.addEventListener("click", handleTutorialLogbookDetailClick, true);
  detailPanel.addEventListener("keydown", handleTutorialLogbookDetailKeydown, true);
  detailLabel.addEventListener("click", handleDetailLabelClick);
  detailLabel.addEventListener("keydown", handleDetailLabelKeydown);
  document.addEventListener("pointermove", handleDocumentPointerMove, true);
  document.addEventListener("pointerdown", handleDocumentPointerDown, true);
  bindRoot(detailPanel);

  return {
    hoverPanel,
    detailPanel,
    bindRoot,
    bindHoverRoot,
    beginHoverHandoff,
    beginTutorialLogbookIntroduction,
    restoreTutorialLogbookIntroduction,
    endTutorialLogbookIntroduction,
    getTutorialLogbookIntroductionStep,
    isTutorialLogbookIntroductionActive,
    closeAll
  };
}

function findNearestGlossaryToken(
  root: HTMLElement,
  clientX: number,
  clientY: number
): HTMLElement | null {
  let nearestToken: HTMLElement | null = null;
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;

  for (const token of root.querySelectorAll<HTMLElement>(
    ".command-glossary-token[data-glossary-id]"
  )) {
    const rect = token.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    const distanceX =
      clientX < rect.left ? rect.left - clientX : clientX > rect.right ? clientX - rect.right : 0;
    const distanceY =
      clientY < rect.top ? rect.top - clientY : clientY > rect.bottom ? clientY - rect.bottom : 0;
    const distanceSquared = distanceX * distanceX + distanceY * distanceY;

    if (distanceSquared < nearestDistanceSquared) {
      nearestToken = token;
      nearestDistanceSquared = distanceSquared;
    }
  }

  return nearestToken;
}

function isPointInsideElement(root: HTMLElement, clientX: number, clientY: number): boolean {
  const rect = root.getBoundingClientRect();
  return (
    clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom
  );
}

function applyGlossaryTokenSemantics(
  span: HTMLSpanElement,
  glossaryId: string,
  label: string
): void {
  const entry = getGameGlossaryEntry(glossaryId);
  span.classList.add("command-glossary-token");
  span.dataset["glossaryId"] = glossaryId;
  span.dataset["glossaryLabel"] = label;
  span.tabIndex = 0;
  span.setAttribute("role", "button");
  span.setAttribute(
    "aria-label",
    `Explain ${getGlossaryTokenLabel(span, entry?.label ?? "game term")}`
  );
}

function getGlossaryTokenLabel(token: HTMLElement, fallback: string): string {
  const label = token.dataset["glossaryLabel"]?.trim();
  return label === undefined || label.length === 0 ? fallback : label;
}

function applyGlossaryDetailTokenTone(span: HTMLSpanElement, text: string): void {
  const glossaryId = span.dataset["glossaryId"];

  if (
    glossaryId === undefined ||
    glossaryId.startsWith("word:") ||
    !isUppercaseGlossaryTerm(text)
  ) {
    return;
  }

  span.classList.add("command-glossary-token--detail-uppercase");
}

function isUppercaseGlossaryTerm(text: string): boolean {
  return /\p{L}/u.test(text) && text === text.toLocaleUpperCase("en-US");
}

function getGlossaryToken(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>(".command-glossary-token[data-glossary-id]")
    : null;
}

function getStaticHoverToken(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>("[data-glossary-hover-label][data-glossary-hover-text]")
    : null;
}

function getTutorialLogbookDetailAction(target: EventTarget | null): HTMLElement | null {
  return target instanceof Element
    ? target.closest<HTMLElement>(".command-glossary-detail__tutorial-action")
    : null;
}

function getGlossarySourceLineKey(token: HTMLElement): string | null {
  const line = token.closest<HTMLElement>(".command-console__line");

  if (line === null) {
    return null;
  }

  const eventId = line.dataset["eventId"];

  if (eventId !== undefined) {
    return `event:${eventId}`;
  }

  const rowKey = line.dataset["rowKey"];

  if (rowKey !== undefined) {
    return `row:${rowKey}`;
  }

  const entryId = line.dataset["entryId"];

  if (entryId !== undefined) {
    return `entry:${entryId}:row:${line.dataset["rowIndex"] ?? ""}`;
  }

  return `text:${line.textContent ?? ""}`;
}

function asNode(value: EventTarget | null): Node | null {
  return value instanceof Node ? value : null;
}

function getGlossaryTypewriterDuration(text: string): number {
  return Math.max(
    gameGlossaryTypewriterMinDurationMs,
    Math.min(
      gameGlossaryTypewriterMaxDurationMs,
      text.length * gameGlossaryTypewriterMsPerCharacter
    )
  );
}

function getGlossaryDetailTypewriterDuration(text: string): number {
  return Math.max(
    gameGlossaryDetailMinDurationMs,
    Math.min(gameGlossaryDetailMaxDurationMs, text.length * gameGlossaryDetailMsPerCharacter)
  );
}

function getGlossaryDetailDensity(entry: GameGlossaryEntry): "brief" | "standard" | "dense" {
  const paragraphs = getGameGlossaryDetailParagraphs(entry);
  const characterCount = paragraphs.reduce((sum, line) => sum + line.length, 0);

  if (paragraphs.length <= 3 && characterCount <= 320) {
    return "brief";
  }

  if (paragraphs.length >= 7 || characterCount >= 700) {
    return "dense";
  }

  return "standard";
}

function getGameGlossaryDetailParagraphs(entry: GameGlossaryEntry): readonly string[] {
  if (entry.advice === undefined || entry.advice.length === 0) {
    return entry.detail;
  }

  return [...entry.detail, "", ...entry.advice.map((line) => `• ${line}`)];
}

function createContextualGameGlossaryEntry(
  entry: GameGlossaryEntry,
  sourceToken: HTMLElement,
  document: Document
): GameGlossaryEntry {
  const line = sourceToken.closest<HTMLElement>(".command-console__line");

  if (line === null) {
    return entry;
  }

  const telemetryContext = parseGameGlossaryLineContext(line.dataset["glossaryContext"]);

  if (telemetryContext !== null && isDvGlossaryEntry(entry.id)) {
    const direction = telemetryContext.committedDv - telemetryContext.currentDv;
    const change =
      direction === 0 ? "does not change" : `${direction > 0 ? "+" : ""}${direction} ΔV`;
    const history = telemetryContext.history.join(" → ");
    const components = [
      telemetryContext.pendingBurnCost > 0
        ? `${telemetryContext.pendingBurnCost} for queued BURN orders`
        : null,
      telemetryContext.upkeepCost > 0
        ? `${telemetryContext.upkeepCost} for contested upkeep`
        : null,
      telemetryContext.evadeCost > 0
        ? `${telemetryContext.evadeCost} for known EVADE impacts`
        : null
    ].filter((value): value is string => value !== null);
    const otherCost = Math.max(
      0,
      telemetryContext.currentDv -
        telemetryContext.pendingBurnCost -
        telemetryContext.upkeepCost -
        telemetryContext.evadeCost +
        telemetryContext.income -
        telemetryContext.nextTurnDv
    );
    if (otherCost > 0) {
      components.push(`${otherCost} reserved for mandatory launch or other known commitments`);
    }
    const forecastExplanation =
      components.length === 0
        ? `No known mandatory cost is due, and expected income adds ${telemetryContext.income} ΔV.`
        : `The forecast subtracts ${components.join(", ")} and adds ${telemetryContext.income} expected income.`;

    return {
      ...entry,
      detail: [
        ...entry.detail.slice(0, 2),
        `On this line, ${telemetryContext.factionLabel} has ${telemetryContext.currentDv} ΔV now. Visible commitments project ${telemetryContext.committedDv} ΔV, so the balance ${change}.`,
        `The next-turn forecast is ${telemetryContext.nextTurnDv} ΔV. ${forecastExplanation}`
      ],
      advice: [
        `Recent and projected balances read ${history}. A falling sequence signals shrinking freedom to BURN, EVADE or maintain a lock.`,
        ...(entry.advice ?? []).slice(0, 1)
      ]
    };
  }

  const text = normalizeGlossaryLineText(line.textContent ?? "");
  const sourceTurn = parseGlossaryLineTurn(line.dataset["turn"]);
  const latestTurn = getLatestGlossaryLineTurn(document);
  const burn = parseBurnGlossaryLine(text);

  if (
    burn !== null &&
    (entry.id === "burn" ||
      entry.id === "burn-out" ||
      isDvGlossaryEntry(entry.id) ||
      entry.id === "eta")
  ) {
    const timing = formatGlossaryCommitTiming(line.dataset["kind"], sourceTurn, latestTurn);
    return {
      ...entry,
      detail: [
        ...entry.detail.slice(0, 2),
        `This BURN runs from ${burn.origin} to ${burn.destination}, takes ${burn.etaTurns} turns and costs ${burn.cost} ΔV.`
      ],
      advice: [
        `${timing} The ship reaches its destination ${burn.etaTurns} turns after departure.`,
        ...(entry.advice ?? []).slice(0, 1)
      ]
    };
  }

  const fire = parseFireGlossaryLine(text);

  if (
    fire !== null &&
    (entry.id === "fire" || entry.id === "firing-solution" || entry.id === "eta")
  ) {
    return {
      ...entry,
      detail: [
        ...entry.detail.slice(0, 2),
        `This solution runs from ${fire.origin} to ${fire.target} and reaches impact in ${fire.etaTurns} turns.`
      ],
      advice: [
        `Until impact, the target can break this solution by BURNING away. If it stays, budget 1 ΔV for EVADE and one lost WORK result.`,
        ...(entry.advice ?? []).slice(0, 1)
      ]
    };
  }

  const progress = parseShipyardProgressGlossaryLine(text);

  if (
    progress !== null &&
    (entry.id === "shipyard" || entry.id === "work" || entry.id.startsWith("value:progress:"))
  ) {
    const remaining = Math.max(0, 5 - progress);
    return {
      ...entry,
      detail: [
        ...entry.detail.slice(0, 2),
        `This yard is at ${progress}/5. It needs ${remaining} more eligible WORK ${remaining === 1 ? "turn" : "turns"} to complete the hull.`
      ],
      advice: [
        `Progress stays at the yard if control changes, so both factions can evaluate the same ${progress}/5 investment.`,
        ...(entry.advice ?? []).slice(0, 1)
      ]
    };
  }

  return entry;
}

function isDvGlossaryEntry(id: string): boolean {
  return id === "delta-v" || id === "cost" || id.startsWith("value:delta-v:");
}

function parseGameGlossaryLineContext(raw: string | undefined): GameGlossaryLineContext | null {
  if (raw === undefined) {
    return null;
  }

  try {
    const value = JSON.parse(raw) as Partial<GameGlossaryLineContext>;
    return value.kind === "dv" && typeof value.currentDv === "number"
      ? (value as GameGlossaryLineContext)
      : null;
  } catch {
    return null;
  }
}

function normalizeGlossaryLineText(text: string): string {
  return text.replace(/\s+/gu, " ").trim();
}

function parseBurnGlossaryLine(
  text: string
): Readonly<{ origin: string; destination: string; etaTurns: number; cost: number }> | null {
  const prose =
    /\bBURN(?: OUT)?\s+from\s+(.+?)\s+to\s+(.+?);\s+ETA\s+T\+(\d+);\s+cost\s+-(\d+)\s*ΔV/iu.exec(
      text
    );
  const compact = /\bBURN(?: OUT)?\s+(.+?)\s+(?:->|→)\s+(.+?)\s+T\+(\d+).*?-(\d+)\s*ΔV/iu.exec(
    text
  );
  const match = prose ?? compact;

  if (match === null) {
    return null;
  }

  return {
    origin: match[1]?.trim() ?? "the origin",
    destination: match[2]?.trim() ?? "the destination",
    etaTurns: Number(match[3] ?? 0),
    cost: Number(match[4] ?? 0)
  };
}

function parseFireGlossaryLine(
  text: string
): Readonly<{ origin: string; target: string; etaTurns: number }> | null {
  const prose = /\bFIRE\s+from\s+(.+?)\s+to\s+(.+?);\s+impact\s+T-(\d+)/iu.exec(text);
  const compact = /\bFIRE\s+(.+?)\s+(?:->|→)\s+(.+?)\s+T[-+](\d+)/iu.exec(text);
  const match = prose ?? compact;

  if (match === null) {
    return null;
  }

  return {
    origin: match[1]?.trim() ?? "the firing orbit",
    target: match[2]?.trim() ?? "the target orbit",
    etaTurns: Number(match[3] ?? 0)
  };
}

function parseShipyardProgressGlossaryLine(text: string): number | null {
  const match = /(?:shipyard[^\d]{0,40})?(\d+)\/5\b/iu.exec(text);
  return match === null ? null : Number(match[1]);
}

function parseGlossaryLineTurn(raw: string | undefined): number | null {
  if (raw === undefined) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed + 1 : null;
}

function getLatestGlossaryLineTurn(document: Document): number | null {
  const turns = [...document.querySelectorAll<HTMLElement>(".command-console__line[data-turn]")]
    .map((line) => parseGlossaryLineTurn(line.dataset["turn"]))
    .filter((turn): turn is number => turn !== null);
  return turns.length === 0 ? null : Math.max(...turns);
}

function formatGlossaryCommitTiming(
  kind: string | undefined,
  sourceTurn: number | null,
  latestTurn: number | null
): string {
  if (kind === "live") {
    return "This order is still queued, so its ΔV will be removed when the next EXECUTE resolves the departure.";
  }

  if (sourceTurn === null) {
    return "Its ΔV was removed when the departure resolved.";
  }

  const elapsed = latestTurn === null ? 0 : Math.max(0, latestTurn - sourceTurn);
  const elapsedCopy =
    elapsed === 0
      ? "on the latest visible turn"
      : `${elapsed} ${elapsed === 1 ? "turn" : "turns"} before the latest visible turn`;
  return `Its ΔV was removed when the departure resolved on TURN ${String(sourceTurn).padStart(2, "0")}, ${elapsedCopy}.`;
}

function clampGlossaryProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}
