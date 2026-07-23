import { describe, expect, it } from "vitest";

import { isCinematicGameplayInteractionLocked } from "../../src/ui/input/interactionLock";

describe("Cinematic gameplay interaction lock", () => {
  it("keeps camera-only gestures from becoming gameplay input during a turn transition", () => {
    expect(
      isCinematicGameplayInteractionLocked({
        isCommandConsoleResolving: false,
        isTurnTransitionActive: true,
        tutorialInputLocked: false,
        tutorialAutoAdvanceActive: false
      })
    ).toBe(true);
  });

  it("locks gameplay input throughout tutorial auto-advance gaps", () => {
    expect(
      isCinematicGameplayInteractionLocked({
        isCommandConsoleResolving: false,
        isTurnTransitionActive: false,
        tutorialInputLocked: false,
        tutorialAutoAdvanceActive: true
      })
    ).toBe(true);
  });

  it("allows gameplay input again after resolution and tutorial auto-advance finish", () => {
    expect(
      isCinematicGameplayInteractionLocked({
        isCommandConsoleResolving: false,
        isTurnTransitionActive: false,
        tutorialInputLocked: false,
        tutorialAutoAdvanceActive: false
      })
    ).toBe(false);
  });
});
