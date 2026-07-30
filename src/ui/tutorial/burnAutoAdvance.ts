export type TutorialBurnAutoAdvanceObservation = Readonly<{
  turn: number;
  isActive: boolean;
  hasReachedDestination: boolean;
}>;

export type TutorialBurnAutoAdvanceResult = "arrived" | "interrupted" | "stalled" | "turn-limit";

export type TutorialTrackedBurn = Readonly<{
  factionId: string;
  originNodeId: string;
  destinationNodeId: string;
  arrivalTurn: number;
  mandatoryLaunchId?: string;
}>;

export function findTrackedTutorialMandatoryLaunchBurn(options: {
  burns: readonly TutorialTrackedBurn[];
  activeMandatoryLaunchId: string | null;
  cachedDestinationNodeId: string | null;
  shipyardLessonNodeId: string;
  currentTurn: number;
}): TutorialTrackedBurn | undefined {
  const livePlayerBurns = options.burns.filter((burn) => {
    return burn.factionId === "player" && burn.arrivalTurn >= options.currentTurn;
  });

  return (
    (options.activeMandatoryLaunchId === null
      ? undefined
      : livePlayerBurns.find((burn) => {
          return burn.mandatoryLaunchId === options.activeMandatoryLaunchId;
        })) ??
    (options.cachedDestinationNodeId === null
      ? undefined
      : livePlayerBurns.find((burn) => {
          return burn.destinationNodeId === options.cachedDestinationNodeId;
        })) ??
    livePlayerBurns.find((burn) => {
      return burn.originNodeId === options.shipyardLessonNodeId;
    })
  );
}

/**
 * Drive a tutorial transfer from observable game state instead of trusting a cached ETA.
 *
 * A cached arrival turn is useful presentation data, but it must not decide how many times the
 * simulation advances: another tutorial transfer may have written it earlier. Count actual core
 * turn changes and stop only when the destination occupancy is observable.
 */
export async function driveTutorialBurnToDestination(options: {
  maxTurns: number;
  observe: () => TutorialBurnAutoAdvanceObservation;
  advanceTurn: () => Promise<void>;
}): Promise<TutorialBurnAutoAdvanceResult> {
  let turnsAdvanced = 0;

  while (turnsAdvanced < options.maxTurns) {
    const before = options.observe();

    if (before.hasReachedDestination) {
      return "arrived";
    }

    if (!before.isActive) {
      return "interrupted";
    }

    await options.advanceTurn();

    const after = options.observe();

    if (after.hasReachedDestination) {
      return "arrived";
    }

    if (!after.isActive) {
      return "interrupted";
    }

    if (after.turn <= before.turn) {
      return "stalled";
    }

    turnsAdvanced += after.turn - before.turn;
  }

  return options.observe().hasReachedDestination ? "arrived" : "turn-limit";
}
