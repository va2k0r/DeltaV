import { describe, expect, it } from "vitest";

import { shiftPlanningTimerDeadlinesAfterPause } from "../../src/ui/planningTimerPause";

describe("planning timer game-menu pause", () => {
  it("shifts the planning deadline by the exact menu pause duration", () => {
    expect(
      shiftPlanningTimerDeadlinesAfterPause(
        "planning",
        { deadlineAtMs: 22_000, executeCountdownEndsAtMs: 0 },
        5_000
      )
    ).toEqual({
      deadlineAtMs: 27_000,
      executeCountdownEndsAtMs: 0
    });
  });

  it("also shifts an active execute countdown", () => {
    expect(
      shiftPlanningTimerDeadlinesAfterPause(
        "executeCountdown",
        { deadlineAtMs: 22_000, executeCountdownEndsAtMs: 25_000 },
        5_000
      )
    ).toEqual({
      deadlineAtMs: 27_000,
      executeCountdownEndsAtMs: 30_000
    });
  });

  it("does not alter disabled or resolving timers", () => {
    const deadlines = { deadlineAtMs: 22_000, executeCountdownEndsAtMs: 25_000 };

    expect(shiftPlanningTimerDeadlinesAfterPause("disabled", deadlines, 5_000)).toBe(deadlines);
    expect(shiftPlanningTimerDeadlinesAfterPause("resolving", deadlines, 5_000)).toBe(deadlines);
  });
});
