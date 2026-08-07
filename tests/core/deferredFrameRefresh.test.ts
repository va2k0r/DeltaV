import { describe, expect, it } from "vitest";
import { createDeferredFrameRefresh } from "../../src/ui/deferredFrameRefresh";

type ScheduledFrame = Readonly<{
  id: number;
  callback: FrameRequestCallback;
}>;

function createFrameScheduler(): Readonly<{
  scheduler: Readonly<{
    requestFrame: (callback: FrameRequestCallback) => number;
    cancelFrame: (requestId: number) => void;
  }>;
  flushNextFrame: () => void;
  pendingFrameCount: () => number;
}> {
  let nextId = 1;
  const pendingFrames: ScheduledFrame[] = [];

  return {
    scheduler: {
      requestFrame(callback) {
        const id = nextId;
        nextId += 1;
        pendingFrames.push({ id, callback });
        return id;
      },
      cancelFrame(requestId) {
        const frameIndex = pendingFrames.findIndex((frame) => frame.id === requestId);

        if (frameIndex >= 0) {
          pendingFrames.splice(frameIndex, 1);
        }
      }
    },
    flushNextFrame() {
      const frame = pendingFrames.shift();
      frame?.callback(0);
    },
    pendingFrameCount() {
      return pendingFrames.length;
    }
  };
}

describe("deferred frame refresh", () => {
  it("coalesces selection updates and presents one frame before rebuilding the log", () => {
    const frames = createFrameScheduler();
    let refreshCount = 0;
    const refresh = createDeferredFrameRefresh(() => {
      refreshCount += 1;
    }, frames.scheduler);

    refresh.request();
    refresh.request();
    refresh.request();

    expect(frames.pendingFrameCount()).toBe(1);
    expect(refreshCount).toBe(0);

    frames.flushNextFrame();

    expect(frames.pendingFrameCount()).toBe(1);
    expect(refreshCount).toBe(0);

    frames.flushNextFrame();

    expect(frames.pendingFrameCount()).toBe(0);
    expect(refreshCount).toBe(1);
  });

  it("cancels a queued refresh when the tutorial state is reset", () => {
    const frames = createFrameScheduler();
    let refreshCount = 0;
    const refresh = createDeferredFrameRefresh(() => {
      refreshCount += 1;
    }, frames.scheduler);

    refresh.request();
    refresh.cancel();
    frames.flushNextFrame();

    expect(frames.pendingFrameCount()).toBe(0);
    expect(refreshCount).toBe(0);
  });
});
