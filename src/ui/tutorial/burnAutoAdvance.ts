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

export type TutorialBurnDeparture = Readonly<{
  turn: number;
  type: string;
  factionId?: string;
  nodeId?: string;
  destinationNodeId?: string;
  etaTurns?: number;
  burnArrivalTurn?: number;
}>;

export type TutorialFirstBurnTracking = Readonly<{
  destinationNodeId: string;
  arrivalTurn: number | null;
}>;

/**
 * Recover the opening transfer from authoritative simulation state.
 *
 * The UI keeps both lesson-specific and generic BURN caches. A destination preview can make the
 * lesson-specific cache stale, so a live order/transit or the departure event must win. The
 * generic cache remains a useful fallback after the transit has already arrived and disappeared.
 */
export function findTrackedTutorialFirstBurn(options: {
  burns: readonly TutorialTrackedBurn[];
  departures: readonly TutorialBurnDeparture[];
  openingOriginNodeId: string;
  cachedTutorialDestinationNodeId: string | null;
  cachedTutorialArrivalTurn: number | null;
  cachedFirstDestinationNodeId: string | null;
  cachedFirstArrivalTurn: number | null;
}): TutorialFirstBurnTracking | null {
  const liveBurn = options.burns.find((burn) => {
    return burn.factionId === "player" && burn.originNodeId === options.openingOriginNodeId;
  });

  if (liveBurn !== undefined) {
    return {
      destinationNodeId: liveBurn.destinationNodeId,
      arrivalTurn: liveBurn.arrivalTurn
    };
  }

  for (let index = options.departures.length - 1; index >= 0; index -= 1) {
    const departure = options.departures[index];

    if (
      departure === undefined ||
      departure.type !== "BURN_DEPARTED" ||
      departure.factionId !== "player" ||
      departure.nodeId !== options.openingOriginNodeId ||
      departure.destinationNodeId === undefined
    ) {
      continue;
    }

    return {
      destinationNodeId: departure.destinationNodeId,
      arrivalTurn:
        departure.burnArrivalTurn ??
        (departure.etaTurns === undefined
          ? options.cachedTutorialArrivalTurn
          : departure.turn - 1 + departure.etaTurns)
    };
  }

  const cachedDestinationNodeId =
    options.cachedTutorialDestinationNodeId ?? options.cachedFirstDestinationNodeId;

  if (cachedDestinationNodeId === null) {
    return null;
  }

  return {
    destinationNodeId: cachedDestinationNodeId,
    arrivalTurn:
      options.cachedTutorialDestinationNodeId === null
        ? options.cachedFirstArrivalTurn
        : options.cachedTutorialArrivalTurn
  };
}

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
