import type {
  FactionId,
  GameState,
  ResolutionCue,
  ResolutionEvent,
  SolarSystemSnapshot,
  TurnDebugEvent,
  TurnDebugEventType
} from "../core";

export type ReplayEventType =
  | TurnDebugEventType
  | "BURN_IN_TRANSIT"
  | "BURN_ARRIVED"
  | "MISSILE_IN_FLIGHT"
  | "CONTESTED_STARTED"
  | "CONTESTED_ENDED";

export type ReplayVisualState = Readonly<{
  turn: number;
  factionDv: GameState["factionDv"];
  nodeOccupancies: SolarSystemSnapshot["nodeOccupancies"];
  pendingBurnOrders: SolarSystemSnapshot["pendingBurnOrders"];
  activeBurnTransits: SolarSystemSnapshot["activeBurnTransits"];
  pendingFireOrders: SolarSystemSnapshot["pendingFireOrders"];
  activeMissiles: SolarSystemSnapshot["activeMissiles"];
  mandatoryLaunches: SolarSystemSnapshot["mandatoryLaunches"];
}>;

export type ReplayLogLink = Readonly<{
  resolutionEventId: string;
  commandTimelineEntryId: string;
  commandRowIndex: number;
  cue: ResolutionCue;
}>;

export type ReplayEntry = Readonly<{
  id: string;
  turn: number;
  type: ReplayEventType;
  factionId?: FactionId;
  involved: Readonly<{
    nodeIds: readonly string[];
    bodyIds: readonly string[];
    shipIds: readonly string[];
    missileIds: readonly string[];
  }>;
  startVisualState: ReplayVisualState;
  endVisualState: ReplayVisualState;
  playbackStartMs: number;
  playbackDurationMs: number;
  orderingIndex: number;
  logLink?: ReplayLogLink | undefined;
}>;

export type ReplayTransition = Readonly<{
  id: string;
  from: SolarSystemSnapshot;
  to: SolarSystemSnapshot;
  entries: readonly ReplayEntry[];
}>;

export type ReplayTape = {
  transitions: ReplayTransition[];
  entries: ReplayEntry[];
};

export function createReplayEntries(
  from: SolarSystemSnapshot,
  to: SolarSystemSnapshot,
  transitionIndex: number,
  firstOrderingIndex: number,
  turnDurationMs: number,
  recordedDebugEvents: readonly TurnDebugEvent[],
  resolutionEvents: readonly ResolutionEvent[]
): readonly ReplayEntry[] {
  const entries: ReplayEntry[] = [];
  const startVisualState = createReplayVisualState(from);
  const endVisualState = createReplayVisualState(to);
  const transitionStartMs = transitionIndex * turnDurationMs;
  const replayLogLinksByDebugEventIndex = createReplayLogLinksByDebugEventIndex(resolutionEvents);
  const pushEntry = (
    type: ReplayEventType,
    source: Partial<TurnDebugEvent> & { idSeed?: string },
    localIndex: number,
    logLink?: ReplayLogLink
  ): void => {
    const orderingIndex = firstOrderingIndex + entries.length;
    const involved = getReplayInvolvedIds(type, source);

    entries.push({
      id: `replay-event:${to.turn}:${type}:${source.idSeed ?? source.message ?? localIndex}:${orderingIndex}`,
      turn: to.turn,
      type,
      ...(source.factionId === undefined ? {} : { factionId: source.factionId }),
      involved,
      startVisualState,
      endVisualState,
      playbackStartMs: transitionStartMs + localIndex * 90,
      playbackDurationMs: turnDurationMs,
      orderingIndex,
      ...(logLink === undefined ? {} : { logLink })
    });
  };

  for (const [eventIndex, event] of recordedDebugEvents.entries()) {
    pushEntry(event.type, event, eventIndex, replayLogLinksByDebugEventIndex.get(eventIndex));
  }

  const fromTransitIds = new Set(from.activeBurnTransits.map((transit) => transit.id));
  const toTransitIds = new Set(to.activeBurnTransits.map((transit) => transit.id));

  for (const transit of to.activeBurnTransits) {
    pushEntry(
      "BURN_IN_TRANSIT",
      {
        idSeed: `${transit.id}:${fromTransitIds.has(transit.id) ? "continue" : "launch"}`,
        factionId: transit.factionId,
        originNodeId: transit.originNodeId,
        destinationNodeId: transit.destinationNodeId
      },
      entries.length
    );
  }

  for (const transit of from.activeBurnTransits) {
    if (!toTransitIds.has(transit.id) && transit.arrivalTurn <= to.turn) {
      pushEntry(
        "BURN_ARRIVED",
        {
          idSeed: `${transit.id}:arrive`,
          factionId: transit.factionId,
          originNodeId: transit.originNodeId,
          destinationNodeId: transit.destinationNodeId
        },
        entries.length
      );
    }
  }

  const fromMissileIds = new Set(from.activeMissiles.map((missile) => missile.id));
  const toMissileIds = new Set(to.activeMissiles.map((missile) => missile.id));

  for (const missile of to.activeMissiles) {
    pushEntry(
      "MISSILE_IN_FLIGHT",
      {
        idSeed: `${missile.id}:${fromMissileIds.has(missile.id) ? "continue" : "launch"}`,
        factionId: missile.factionId,
        firingNodeId: missile.originNodeId,
        targetNodeId: missile.targetNodeId
      },
      entries.length
    );
  }

  for (const missile of from.activeMissiles) {
    if (!toMissileIds.has(missile.id) && missile.impactTurn <= to.turn) {
      pushEntry(
        "MISSILE_IMPACT",
        {
          idSeed: `${missile.id}:impact`,
          factionId: missile.factionId,
          firingNodeId: missile.originNodeId,
          targetNodeId: missile.targetNodeId
        },
        entries.length
      );
    }
  }

  for (const node of to.nodes) {
    const previous = from.nodes.find((candidate) => candidate.id === node.id);

    if (previous === undefined) {
      continue;
    }

    if (!previous.isContested && node.isContested) {
      pushEntry("CONTESTED_STARTED", { idSeed: node.id, nodeId: node.id }, entries.length);
    }

    if (previous.isContested && !node.isContested) {
      pushEntry("CONTESTED_ENDED", { idSeed: node.id, nodeId: node.id }, entries.length);
    }
  }

  return entries;
}

export function shouldRecordReplayDebugEvent(event: TurnDebugEvent): boolean {
  return (
    event.type !== "AI_CONSIDERED_ACTION" &&
    event.type !== "AI_REJECTED_ACTION" &&
    event.type !== "AI_COMBO_CONSIDERED" &&
    event.type !== "AI_COMBO_REJECTED" &&
    event.type !== "SIMULTANEOUS_TURN_AUDIT"
  );
}

function createReplayVisualState(snapshot: SolarSystemSnapshot): ReplayVisualState {
  return {
    turn: snapshot.turn,
    factionDv: snapshot.factionDv,
    nodeOccupancies: snapshot.nodeOccupancies,
    pendingBurnOrders: snapshot.pendingBurnOrders,
    activeBurnTransits: snapshot.activeBurnTransits,
    pendingFireOrders: snapshot.pendingFireOrders,
    activeMissiles: snapshot.activeMissiles,
    mandatoryLaunches: snapshot.mandatoryLaunches
  };
}

function createReplayLogLinksByDebugEventIndex(
  resolutionEvents: readonly ResolutionEvent[]
): ReadonlyMap<number, ReplayLogLink> {
  const linksByDebugEventIndex = new Map<number, ReplayLogLink>();

  for (const resolutionEvent of resolutionEvents) {
    const logLink = createReplayLogLink(resolutionEvent);

    for (const sourceDebugEventIndex of resolutionEvent.sourceDebugEventIndices) {
      linksByDebugEventIndex.set(sourceDebugEventIndex, logLink);
    }
  }

  return linksByDebugEventIndex;
}

function createReplayLogLink(resolutionEvent: ResolutionEvent): ReplayLogLink {
  return {
    resolutionEventId: resolutionEvent.id,
    commandTimelineEntryId: `command-resolution:${resolutionEvent.id}`,
    commandRowIndex: resolutionEvent.index,
    cue: resolutionEvent.replayCue ?? resolutionEvent.mapCue
  };
}

function getReplayInvolvedIds(
  type: ReplayEventType,
  event: Partial<TurnDebugEvent> & { idSeed?: string }
): ReplayEntry["involved"] {
  const nodeIds = uniqueStrings([
    event.nodeId,
    event.originNodeId,
    event.firingNodeId,
    event.destinationNodeId,
    event.targetNodeId
  ]);
  return {
    nodeIds,
    bodyIds: [],
    shipIds:
      type === "BURN_DEPARTED" || type === "BURN_FAILED" || type.startsWith("BURN_")
        ? uniqueStrings([event.idSeed])
        : [],
    missileIds:
      type === "FIRE_LAUNCHED" ||
      type === "MISSILE_IN_FLIGHT" ||
      type === "MISSILE_IMPACT" ||
      type === "MISSILE_MISSED" ||
      type === "MISSILE_SOLUTION_BROKEN"
        ? uniqueStrings([event.idSeed])
        : []
  };
}

function uniqueStrings(values: readonly (string | undefined)[]): readonly string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))];
}
