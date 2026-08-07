export type AnimationFrameRefreshScheduler = Readonly<{
  requestFrame: (callback: FrameRequestCallback) => number;
  cancelFrame: (requestId: number) => void;
}>;

export type DeferredFrameRefresh = Readonly<{
  request: () => void;
  cancel: () => void;
}>;

/**
 * Coalesce synchronous UI state changes and wait for one paint before touching expensive DOM.
 *
 * Selection changes update the 3D scene immediately. Rebuilding the command log in that same
 * input task can create hundreds of interactive glossary tokens and force layout before the
 * selected orbit is visible. The second animation frame deliberately gives the renderer a frame
 * to present the selection first.
 */
export function createDeferredFrameRefresh(
  refresh: () => void,
  scheduler: AnimationFrameRefreshScheduler
): DeferredFrameRefresh {
  let presentationFrame: number | null = null;
  let refreshFrame: number | null = null;

  const cancel = (): void => {
    if (presentationFrame !== null) {
      scheduler.cancelFrame(presentationFrame);
      presentationFrame = null;
    }

    if (refreshFrame !== null) {
      scheduler.cancelFrame(refreshFrame);
      refreshFrame = null;
    }
  };

  const request = (): void => {
    if (presentationFrame !== null || refreshFrame !== null) {
      return;
    }

    presentationFrame = scheduler.requestFrame(() => {
      presentationFrame = null;
      refreshFrame = scheduler.requestFrame(() => {
        refreshFrame = null;
        refresh();
      });
    });
  };

  return { request, cancel };
}
