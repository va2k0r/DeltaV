export type CinematicGameplayInteractionState = Readonly<{
  isCommandConsoleResolving: boolean;
  isTurnTransitionActive: boolean;
  tutorialInputLocked: boolean;
  tutorialAutoAdvanceActive: boolean;
}>;

export function isCinematicGameplayInteractionLocked(
  state: CinematicGameplayInteractionState
): boolean {
  return (
    state.isCommandConsoleResolving ||
    state.isTurnTransitionActive ||
    state.tutorialInputLocked ||
    state.tutorialAutoAdvanceActive
  );
}
