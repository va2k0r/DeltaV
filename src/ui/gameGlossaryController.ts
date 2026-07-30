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
  let hoveredGlossaryId: string | null = null;
  let hoveredGlossaryToken: HTMLElement | null = null;
  let detailAnimationFrame: number | null = null;
  let detailGeneration = 0;

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

  function interceptGlossaryPointerDown(event: PointerEvent): void {
    if (getGlossaryToken(event.target) === null) {
      return;
    }

    event.stopImmediatePropagation();
  }

  function handleGlossaryClick(event: MouseEvent): void {
    const glossaryId = getGlossaryToken(event.target)?.dataset["glossaryId"];

    if (glossaryId === undefined) {
      return;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    openDetail(glossaryId);
  }

  function handleGlossaryKeydown(event: KeyboardEvent): void {
    const glossaryId = getGlossaryToken(event.target)?.dataset["glossaryId"];

    if (glossaryId === undefined) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopImmediatePropagation();
      openDetail(glossaryId);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      clearDetail();
    }
  }

  function scheduleHover(glossaryId: string, token: HTMLElement): void {
    clearHoverReleaseTimer();

    if (
      hoveredGlossaryId === glossaryId &&
      hoveredGlossaryToken === token &&
      hoverPanel.classList.contains("is-visible")
    ) {
      return;
    }

    clearHoverDwellTimer();
    hoverGeneration += 1;
    const generation = hoverGeneration;
    hoveredGlossaryId = glossaryId;
    hoveredGlossaryToken = token;
    hoverDwellTimer = view.setTimeout(() => {
      hoverDwellTimer = null;

      if (
        generation !== hoverGeneration ||
        hoveredGlossaryId !== glossaryId ||
        hoveredGlossaryToken !== token
      ) {
        return;
      }

      const entry = getGameGlossaryEntry(glossaryId);

      if (entry !== undefined) {
        revealHover(entry, token, generation);
      }
    }, gameGlossaryHoverDwellMs);
  }

  function scheduleHoverClear(): void {
    clearHoverDwellTimer();
    clearHoverReleaseTimer();
    const generation = hoverGeneration + 1;
    hoverGeneration = generation;
    hoveredGlossaryId = null;
    hoveredGlossaryToken = null;
    hoverReleaseTimer = view.setTimeout(() => {
      hoverReleaseTimer = null;

      if (generation === hoverGeneration) {
        clearHoverImmediately();
      }
    }, gameGlossaryHoverReleaseMs);
  }

  function revealHover(entry: GameGlossaryEntry, token: HTMLElement, generation: number): void {
    cancelHoverAnimation();
    alignHoverPanelToToken(token);
    hoverLabel.textContent = entry.label;
    hoverText.textContent = "";
    hoverPanel.classList.remove("is-hidden");
    hoverPanel.classList.add("is-visible", "is-typewriting");
    hoverPanel.setAttribute("aria-hidden", "false");

    const durationMs = getGlossaryTypewriterDuration(entry.short);
    const startedAt = performance.now();

    const typeNextFrame = (): void => {
      if (generation !== hoverGeneration) {
        return;
      }

      const progress = clampGlossaryProgress((performance.now() - startedAt) / durationMs);
      const visibleCharacters = Math.min(
        entry.short.length,
        Math.max(1, Math.floor(entry.short.length * progress))
      );
      hoverText.textContent = entry.short.slice(0, visibleCharacters);

      if (visibleCharacters >= entry.short.length) {
        hoverText.textContent = entry.short;
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

  function openDetail(glossaryId: string): void {
    const entry = getGameGlossaryEntry(glossaryId);

    if (entry === undefined) {
      return;
    }

    detailGeneration += 1;
    const generation = detailGeneration;
    cancelDetailAnimation();
    detailPanel.dataset["glossaryId"] = entry.id;
    detailPanel.classList.remove("is-hidden");
    detailPanel.classList.add("is-visible", "is-typewriting");
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
    detailGeneration += 1;
    cancelDetailAnimation();
    detailPanel.removeAttribute("data-glossary-id");
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
    hoveredGlossaryId = null;
    hoveredGlossaryToken = null;
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

function clampGlossaryProgress(value: number): number {
  return Math.min(1, Math.max(0, value));
}
