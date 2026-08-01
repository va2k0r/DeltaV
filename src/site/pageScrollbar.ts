const SCROLL_CUE_DELAY_MS = 3_000;
const MIN_THUMB_HEIGHT_PX = 48;

type ScrollbarMetricsInput = Readonly<{
  scrollTop: number;
  scrollHeight: number;
  viewportHeight: number;
  trackHeight: number;
}>;

export type ScrollbarMetrics = Readonly<{
  maxScrollTop: number;
  thumbHeight: number;
  thumbOffset: number;
}>;

export type SitePageScrollbar = Readonly<{
  setActive: (active: boolean) => void;
}>;

export function calculateScrollbarMetrics({
  scrollTop,
  scrollHeight,
  viewportHeight,
  trackHeight
}: ScrollbarMetricsInput): ScrollbarMetrics {
  const safeTrackHeight = Math.max(0, trackHeight);
  const maxScrollTop = Math.max(0, scrollHeight - viewportHeight);
  const visibleRatio = scrollHeight <= 0 ? 1 : Math.min(1, viewportHeight / scrollHeight);
  const thumbHeight = Math.min(
    safeTrackHeight,
    Math.max(MIN_THUMB_HEIGHT_PX, safeTrackHeight * visibleRatio)
  );
  const maxThumbOffset = Math.max(0, safeTrackHeight - thumbHeight);
  const scrollProgress = maxScrollTop <= 0 ? 0 : Math.min(1, Math.max(0, scrollTop / maxScrollTop));

  return {
    maxScrollTop,
    thumbHeight,
    thumbOffset: maxThumbOffset * scrollProgress
  };
}

export function installSitePageScrollbar(site: HTMLElement): SitePageScrollbar {
  const scrollbar = document.createElement("div");
  scrollbar.className = "delta-site__page-scrollbar";
  scrollbar.tabIndex = 0;
  scrollbar.setAttribute("role", "scrollbar");
  scrollbar.setAttribute("aria-label", "Page scroll position");
  scrollbar.setAttribute("aria-controls", "site-main");
  scrollbar.setAttribute("aria-orientation", "vertical");
  scrollbar.setAttribute("aria-valuemin", "0");
  scrollbar.innerHTML = `
    <span class="delta-site__page-scrollbar-track" aria-hidden="true">
      <span class="delta-site__page-scrollbar-thumb"></span>
    </span>
  `;
  site.prepend(scrollbar);

  const track = scrollbar.querySelector<HTMLElement>(".delta-site__page-scrollbar-track");
  const thumb = scrollbar.querySelector<HTMLElement>(".delta-site__page-scrollbar-thumb");
  if (track === null || thumb === null) {
    throw new Error("DeltaV page scrollbar could not be created.");
  }

  const scrollRoot = document.scrollingElement ?? document.documentElement;
  const main = site.querySelector<HTMLElement>("#site-main");
  const scrollKeys = new Set([
    " ",
    "ArrowDown",
    "ArrowUp",
    "End",
    "Home",
    "PageDown",
    "PageUp",
    "Spacebar"
  ]);
  let active = true;
  let scrollInteractionSeen = false;
  let cueTimer: number | undefined;
  let dragPointerId: number | undefined;
  let dragStartY = 0;
  let dragStartScrollTop = 0;

  const clearCue = (): void => {
    if (cueTimer !== undefined) {
      window.clearTimeout(cueTimer);
      cueTimer = undefined;
    }
    scrollbar.classList.remove("is-pulsing");
  };

  const acknowledgeScrollInteraction = (): void => {
    scrollInteractionSeen = true;
    clearCue();
  };

  const readMetrics = (): ScrollbarMetrics =>
    calculateScrollbarMetrics({
      scrollTop: scrollRoot.scrollTop,
      scrollHeight: scrollRoot.scrollHeight,
      viewportHeight: scrollRoot.clientHeight,
      trackHeight: track.clientHeight
    });

  const refresh = (): void => {
    if (!active) {
      scrollbar.hidden = true;
      return;
    }

    // A previously hidden track must be displayed for its fixed height to be measurable.
    scrollbar.hidden = false;
    const metrics = readMetrics();
    if (metrics.maxScrollTop <= 1 || track.clientHeight <= 0) {
      scrollbar.hidden = true;
      return;
    }

    thumb.style.height = `${metrics.thumbHeight}px`;
    thumb.style.top = `${metrics.thumbOffset}px`;
    scrollbar.setAttribute("aria-valuemax", `${Math.round(metrics.maxScrollTop)}`);
    scrollbar.setAttribute("aria-valuenow", `${Math.round(scrollRoot.scrollTop)}`);
  };

  const scheduleCue = (): void => {
    clearCue();
    if (scrollInteractionSeen || !active || prefersReducedMotion()) {
      return;
    }

    cueTimer = window.setTimeout(() => {
      cueTimer = undefined;
      refresh();
      if (!scrollInteractionSeen && active && !scrollbar.hidden) {
        scrollbar.classList.add("is-pulsing");
      }
    }, SCROLL_CUE_DELAY_MS);
  };

  const scrollTo = (top: number): void => {
    window.scrollTo({ top, behavior: "auto" });
  };

  scrollbar.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) {
      return;
    }

    event.preventDefault();
    acknowledgeScrollInteraction();
    const metrics = readMetrics();
    if (event.target === thumb) {
      dragPointerId = event.pointerId;
      dragStartY = event.clientY;
      dragStartScrollTop = scrollRoot.scrollTop;
      scrollbar.setPointerCapture(event.pointerId);
      return;
    }

    const trackBounds = track.getBoundingClientRect();
    const availableTrack = Math.max(1, track.clientHeight - metrics.thumbHeight);
    const targetOffset = event.clientY - trackBounds.top - metrics.thumbHeight / 2;
    const progress = Math.min(1, Math.max(0, targetOffset / availableTrack));
    scrollTo(progress * metrics.maxScrollTop);
  });

  scrollbar.addEventListener("pointermove", (event) => {
    if (dragPointerId !== event.pointerId) {
      return;
    }

    event.preventDefault();
    const metrics = readMetrics();
    const availableTrack = Math.max(1, track.clientHeight - metrics.thumbHeight);
    const scrollDelta = ((event.clientY - dragStartY) / availableTrack) * metrics.maxScrollTop;
    scrollTo(dragStartScrollTop + scrollDelta);
  });

  const finishDrag = (event: PointerEvent): void => {
    if (dragPointerId !== event.pointerId) {
      return;
    }

    dragPointerId = undefined;
    if (scrollbar.hasPointerCapture(event.pointerId)) {
      scrollbar.releasePointerCapture(event.pointerId);
    }
  };
  scrollbar.addEventListener("pointerup", finishDrag);
  scrollbar.addEventListener("pointercancel", finishDrag);

  scrollbar.addEventListener("keydown", (event) => {
    const pageStep = Math.max(80, scrollRoot.clientHeight * 0.82);
    const keyTargets: Readonly<Record<string, number>> = {
      ArrowDown: scrollRoot.scrollTop + 48,
      ArrowUp: scrollRoot.scrollTop - 48,
      End: readMetrics().maxScrollTop,
      Home: 0,
      PageDown: scrollRoot.scrollTop + pageStep,
      PageUp: scrollRoot.scrollTop - pageStep
    };
    const target = keyTargets[event.key];
    if (target === undefined) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    acknowledgeScrollInteraction();
    scrollTo(target);
  });

  window.addEventListener("wheel", acknowledgeScrollInteraction, { passive: true });
  window.addEventListener("touchmove", acknowledgeScrollInteraction, { passive: true });
  window.addEventListener("scroll", () => {
    acknowledgeScrollInteraction();
    refresh();
  });
  window.addEventListener("resize", refresh);
  window.addEventListener("keydown", (event) => {
    const eventTarget = event.target instanceof Element ? event.target : null;
    const interactiveTarget = eventTarget?.closest(
      'a, button, input, select, summary, textarea, [contenteditable="true"]'
    );
    if (
      scrollKeys.has(event.key) &&
      interactiveTarget === null &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      acknowledgeScrollInteraction();
    }
  });

  const resizeObserver = new ResizeObserver(refresh);
  if (main !== null) {
    resizeObserver.observe(main);
  }

  const setActive = (nextActive: boolean): void => {
    active = nextActive;
    document.documentElement.classList.toggle("is-deltav-site", active);
    if (!active) {
      clearCue();
      scrollbar.hidden = true;
      return;
    }

    scrollbar.hidden = false;
    window.requestAnimationFrame(() => {
      refresh();
      scheduleCue();
    });
  };

  setActive(true);
  return { setActive };
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
