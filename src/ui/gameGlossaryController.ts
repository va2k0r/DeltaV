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

export type GameGlossaryController = Readonly<{
  hoverPanel: HTMLElement;
  detailPanel: HTMLElement;
  bindRoot: (root: HTMLElement) => void;
  bindHoverRoot: (root: HTMLElement) => void;
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
      applyGlossaryTokenSemantics(span, token.glossaryId);
    }

    return span;
  });
}

export function createGameGlossaryController(
  document: Document,
  view: Window
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

  let hoverDwellTimer: number | null = null;
  let hoverReleaseTimer: number | null = null;
  let hoverAnimationFrame: number | null = null;
  let hoverGeneration = 0;
  let hoveredHoverKey: string | null = null;
  let hoveredHoverToken: HTMLElement | null = null;
  let detailAnimationFrame: number | null = null;
  let detailGeneration = 0;
  let detailSourceToken: HTMLElement | null = null;
  let detailSourceLineKey: string | null = null;
  const handledActivationEvents = new WeakSet<Event>();

  const bindRoot = (root: HTMLElement): void => {
    root.addEventListener("pointerover", handlePointerOver, true);
    root.addEventListener("pointerout", handlePointerOut, true);
    root.addEventListener("mouseover", handlePointerOver, true);
    root.addEventListener("mouseout", handlePointerOut, true);
    root.addEventListener("focusin", handleFocusIn, true);
    root.addEventListener("focusout", handleFocusOut, true);
    root.addEventListener("pointerdown", interceptGlossaryPointerDown, true);
    root.addEventListener("click", handleGlossaryClick, true);
    root.addEventListener("keydown", handleGlossaryKeydown, true);
  };

  const bindHoverRoot = (root: HTMLElement): void => {
    root.addEventListener("pointerover", handleStaticPointerOver, true);
    root.addEventListener("pointerout", handleStaticPointerOut, true);
    root.addEventListener("mouseover", handleStaticPointerOver, true);
    root.addEventListener("mouseout", handleStaticPointerOut, true);
    root.addEventListener("focusin", handleStaticFocusIn, true);
    root.addEventListener("focusout", handleStaticFocusOut, true);
  };

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

  function interceptGlossaryPointerDown(event: PointerEvent): void {
    if (getGlossaryToken(event.target) === null) {
      return;
    }

    event.stopImmediatePropagation();
  }

  function handleGlossaryClick(event: MouseEvent): void {
    const token = getGlossaryToken(event.target);
    const glossaryId = token?.dataset["glossaryId"];

    if (glossaryId === undefined || token === null || handledActivationEvents.has(event)) {
      return;
    }

    handledActivationEvents.add(event);

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

    scheduleHoverCopy(`glossary:${glossaryId}`, entry.label, entry.short, token);
  }

  function scheduleStaticHover(token: HTMLElement): void {
    const label = token.dataset["glossaryHoverLabel"];
    const text = token.dataset["glossaryHoverText"];

    if (label === undefined || text === undefined) {
      return;
    }

    scheduleHoverCopy(`static:${label}\u0000${text}`, label, text, token);
  }

  function scheduleHoverCopy(
    hoverKey: string,
    label: string,
    text: string,
    token: HTMLElement
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
    }, gameGlossaryHoverDwellMs);
  }

  function scheduleHoverClear(): void {
    clearHoverDwellTimer();
    clearHoverReleaseTimer();
    const generation = hoverGeneration + 1;
    hoverGeneration = generation;
    hoveredHoverKey = null;
    hoveredHoverToken = null;
    hoverReleaseTimer = view.setTimeout(() => {
      hoverReleaseTimer = null;

      if (generation === hoverGeneration) {
        clearHoverImmediately();
      }
    }, gameGlossaryHoverReleaseMs);
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

  function openDetail(glossaryId: string, sourceToken: HTMLElement): void {
    const entry = getGameGlossaryEntry(glossaryId);

    if (entry === undefined) {
      return;
    }

    detailSourceToken = sourceToken;
    detailSourceLineKey = getGlossarySourceLineKey(sourceToken);
    detailGeneration += 1;
    const generation = detailGeneration;
    cancelDetailAnimation();
    detailPanel.dataset["glossaryId"] = entry.id;
    if (detailSourceLineKey === null) {
      detailPanel.removeAttribute("data-source-line-key");
    } else {
      detailPanel.dataset["sourceLineKey"] = detailSourceLineKey;
    }
    detailPanel.classList.remove("is-hidden");
    detailPanel.classList.add("is-visible", "is-typewriting");
    detailPanel.dataset["density"] = getGlossaryDetailDensity(entry);
    detailPanel.setAttribute("aria-hidden", "false");
    detailLabel.textContent = entry.label;
    detailBody.innerHTML = "";

    const lines = entry.detail.map((paragraph) => {
      const line = document.createElement("div");
      line.className = "command-glossary-detail__line";
      const spans = createGameGlossaryTextSpans(document, paragraph);
      const targets = spans.map((span) => {
        const text = span.textContent ?? "";
        span.textContent = "";
        line.append(span);
        return { element: span, text };
      });
      detailBody.append(line);
      return { line, targets };
    });

    void typeDetailLines(lines, generation);
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
    detailGeneration += 1;
    cancelDetailAnimation();
    detailPanel.removeAttribute("data-glossary-id");
    detailPanel.removeAttribute("data-source-line-key");
    detailPanel.removeAttribute("data-density");
    detailPanel.classList.remove("is-visible", "is-typewriting");
    detailPanel.classList.add("is-hidden");
    detailPanel.setAttribute("aria-hidden", "true");
    detailLabel.textContent = "";
    detailBody.innerHTML = "";
  }

  function clearHoverImmediately(): void {
    hoverGeneration += 1;
    clearHoverDwellTimer();
    clearHoverReleaseTimer();
    cancelHoverAnimation();
    hoveredHoverKey = null;
    hoveredHoverToken = null;
    hoverPanel.classList.remove("is-visible", "is-typewriting");
    hoverPanel.classList.add("is-hidden");
    hoverPanel.setAttribute("aria-hidden", "true");
    hoverLabel.textContent = "";
    hoverText.textContent = "";
  }

  function closeAll(): void {
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

  bindRoot(detailPanel);

  return {
    hoverPanel,
    detailPanel,
    bindRoot,
    bindHoverRoot,
    closeAll
  };
}

function applyGlossaryTokenSemantics(span: HTMLSpanElement, glossaryId: string): void {
  const entry = getGameGlossaryEntry(glossaryId);
  span.classList.add("command-glossary-token");
  span.dataset["glossaryId"] = glossaryId;
  span.tabIndex = 0;
  span.setAttribute("role", "button");
  span.setAttribute(
    "aria-label",
    entry === undefined ? "Explain game term" : `Explain ${entry.label}`
  );
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
  const characterCount = entry.detail.reduce((sum, line) => sum + line.length, 0);

  if (entry.detail.length <= 3 && characterCount <= 320) {
    return "brief";
  }

  if (entry.detail.length >= 7 || characterCount >= 700) {
    return "dense";
  }

  return "standard";
}

function clampGlossaryProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}
