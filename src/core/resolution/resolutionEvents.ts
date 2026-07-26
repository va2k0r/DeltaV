import type { FactionId, TurnDebugEvent, TurnDebugEventType } from "../state/types";

export type ResolutionEventType =
  | "WORK_TRITIUM"
  | "WORK_SHIPYARD"
  | "CONTESTED_UPKEEP"
  | "FIRE_LAUNCHED"
  | "BURN_DEPARTED"
  | "EVADE"
  | "EVADE_BLOCKED"
  | "MISSILE_IMPACT"
  | "SIGNAL_LOST"
  | "MANDATORY_LAUNCH"
  | "MANDATORY_LAUNCH_DESTROYED"
  | "BURN_FAILED"
  | "VICTORY";

export type ResolutionEventCriticality = "routine" | "notable" | "critical";

export type ResolutionCue = Readonly<{
  kind: string;
  nodeIds: readonly string[];
  factionIds: readonly FactionId[];
  missileIds: readonly string[];
  shipIds: readonly string[];
}>;

export type ResolutionDvDelta = Readonly<{
  factionId: FactionId;
  amount: number;
}>;

export type ResolutionEvent = Readonly<{
  id: string;
  turn: number;
  index: number;
  type: ResolutionEventType;
  sourceDebugEventTypes: readonly TurnDebugEventType[];
  sourceDebugEventIndices: readonly number[];
  actorFactionId?: FactionId | undefined;
  targetFactionId?: FactionId | undefined;
  nodeId?: string | undefined;
  originNodeId?: string | undefined;
  destinationNodeId?: string | undefined;
  targetNodeId?: string | undefined;
  missileId?: string | undefined;
  shipId?: string | undefined;
  dvDelta?: number | undefined;
  dvDeltas?: readonly ResolutionDvDelta[] | undefined;
  cost?: number | undefined;
  result?: string | undefined;
  progress?: number | undefined;
  etaTurns?: number | undefined;
  missileEtaTurns?: number | undefined;
  criticality: ResolutionEventCriticality;
  mapCue: ResolutionCue;
  cameraCue?: ResolutionCue | undefined;
  audioCue?: ResolutionCue | undefined;
  replayCue?: ResolutionCue | undefined;
}>;

export function createPlayerFacingResolutionEvents(
  events: readonly TurnDebugEvent[]
): readonly ResolutionEvent[] {
  const resolutionEvents: ResolutionEvent[] = [];
  const consumed = new Set<number>();
  let currentTurn = Number.NaN;
  let rowNumber = 1;

  for (const [eventIndex, event] of events.entries()) {
    if (consumed.has(eventIndex)) {
      continue;
    }

    if (event.turn !== currentTurn) {
      currentTurn = event.turn;
      rowNumber = 1;
    }

    const resolutionEvent = createPlayerFacingResolutionEvent(
      events,
      event,
      eventIndex,
      consumed,
      rowNumber
    );

    if (resolutionEvent === null) {
      continue;
    }

    resolutionEvents.push(resolutionEvent);
    rowNumber += 1;
  }

  return resolutionEvents;
}

export function createVictoryResolutionEvent(
  turn: number,
  winner: FactionId,
  index = 1
): ResolutionEvent {
  return createResolutionEvent({
    id: `resolution:${turn}:victory:${winner}`,
    turn,
    index,
    type: "VICTORY",
    actorFactionId: winner,
    result: "tritium-collapse",
    criticality: "critical",
    sourceDebugEventTypes: [],
    sourceDebugEventIndices: []
  });
}

function createPlayerFacingResolutionEvent(
  events: readonly TurnDebugEvent[],
  event: TurnDebugEvent,
  eventIndex: number,
  consumed: Set<number>,
  rowNumber: number
): ResolutionEvent | null {
  switch (event.type) {
    case "TRITIUM_INCOME":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "WORK_TRITIUM",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        dvDelta: event.amount ?? 2,
        criticality: "routine",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "SHIPYARD_PROGRESS":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "WORK_SHIPYARD",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        progress: event.progress,
        criticality: "routine",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "SHIP_PRODUCED":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "WORK_SHIPYARD",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        progress: (event.progressBefore ?? 4) + 1,
        criticality: "notable",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "CONTESTED_UPKEEP_PAID":
      return createContestedUpkeepResolutionEvent(events, event, eventIndex, consumed, rowNumber);
    case "FIRE_LAUNCHED":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "FIRE_LAUNCHED",
        actorFactionId: event.factionId,
        originNodeId: event.nodeId ?? event.originNodeId ?? event.firingNodeId,
        targetNodeId: event.targetNodeId,
        missileEtaTurns: event.missileEtaTurns,
        criticality: "notable",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "BURN_DEPARTED":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "BURN_DEPARTED",
        actorFactionId: event.factionId,
        originNodeId: event.nodeId ?? event.originNodeId,
        destinationNodeId: event.destinationNodeId,
        etaTurns: event.etaTurns,
        cost: event.burnCost,
        criticality: "notable",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "EVADE":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "EVADE",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        dvDelta: event.amount ?? -1,
        criticality: "critical",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "EVADE_BLOCKED":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "EVADE_BLOCKED",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        missileId: event.missileId,
        result: event.reason ?? "contested",
        criticality: "critical",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "MISSILE_IMPACT":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "MISSILE_IMPACT",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        criticality: "critical",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "MISSILE_SOLUTION_BROKEN":
    case "MISSILE_MISSED":
    case "SHIP_DESTROYED": {
      const contestedUpkeepFailureSources = getMatchingContestedUpkeepFailureSource(
        events,
        event,
        eventIndex
      );

      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "SIGNAL_LOST",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        result: event.type,
        criticality: event.type === "SHIP_DESTROYED" ? "critical" : "notable",
        sourceDebugEventTypes: [
          ...contestedUpkeepFailureSources.map((source) => source.candidate.type),
          event.type
        ],
        sourceDebugEventIndices: [
          ...contestedUpkeepFailureSources.map((source) => source.index),
          eventIndex
        ]
      });
    }
    case "MANDATORY_LAUNCH":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "MANDATORY_LAUNCH",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        criticality: "notable",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "MANDATORY_LAUNCH_DESTROYED":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "MANDATORY_LAUNCH_DESTROYED",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        result: "insufficient-dv",
        criticality: "critical",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    case "BURN_FAILED":
      return createResolutionEvent({
        id: createResolutionEventId(event, eventIndex, rowNumber),
        turn: event.turn,
        index: rowNumber,
        type: "BURN_FAILED",
        actorFactionId: event.factionId,
        nodeId: event.nodeId,
        destinationNodeId: event.destinationNodeId,
        result: "insufficient-dv",
        criticality: "critical",
        sourceDebugEventTypes: [event.type],
        sourceDebugEventIndices: [eventIndex]
      });
    default:
      return null;
  }
}

function getMatchingContestedUpkeepFailureSource(
  events: readonly TurnDebugEvent[],
  event: TurnDebugEvent,
  eventIndex: number
): readonly Readonly<{ candidate: TurnDebugEvent; index: number }>[] {
  if (event.type !== "SHIP_DESTROYED") {
    return [];
  }

  for (let index = eventIndex - 1; index >= 0; index -= 1) {
    const candidate = events[index];

    if (
      candidate !== undefined &&
      candidate.turn === event.turn &&
      candidate.type === "CONTESTED_UPKEEP_FAILED" &&
      candidate.nodeId === event.nodeId &&
      candidate.factionId === event.factionId
    ) {
      return [{ candidate, index }];
    }
  }

  return [];
}

function createContestedUpkeepResolutionEvent(
  events: readonly TurnDebugEvent[],
  event: TurnDebugEvent,
  eventIndex: number,
  consumed: Set<number>,
  rowNumber: number
): ResolutionEvent {
  const grouped = events
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate, index }) => {
      return (
        index >= eventIndex &&
        candidate.turn === event.turn &&
        candidate.type === "CONTESTED_UPKEEP_PAID" &&
        candidate.nodeId === event.nodeId
      );
    });

  for (const { index } of grouped) {
    consumed.add(index);
  }

  return createResolutionEvent({
    id: createResolutionEventId(event, eventIndex, rowNumber),
    turn: event.turn,
    index: rowNumber,
    type: "CONTESTED_UPKEEP",
    nodeId: event.nodeId,
    dvDeltas: grouped.flatMap(({ candidate }) => {
      return candidate.factionId === undefined
        ? []
        : [
            {
              factionId: candidate.factionId,
              amount: candidate.amount ?? -2
            }
          ];
    }),
    criticality: "notable",
    sourceDebugEventTypes: grouped.map(({ candidate }) => candidate.type),
    sourceDebugEventIndices: grouped.map(({ index }) => index)
  });
}

function createResolutionEvent(
  event: Omit<ResolutionEvent, "mapCue" | "cameraCue" | "audioCue" | "replayCue"> &
    Partial<Pick<ResolutionEvent, "mapCue" | "cameraCue" | "audioCue" | "replayCue">>
): ResolutionEvent {
  const cue = createResolutionCue(event.type, event);
  const cameraCue = event.criticality === "critical" ? cue : undefined;

  return {
    ...event,
    mapCue: event.mapCue ?? cue,
    ...(cameraCue === undefined ? {} : { cameraCue: event.cameraCue ?? cameraCue }),
    audioCue: event.audioCue ?? cue,
    replayCue: event.replayCue ?? cue
  };
}

function createResolutionCue(
  kind: string,
  event: Pick<
    ResolutionEvent,
    | "actorFactionId"
    | "targetFactionId"
    | "nodeId"
    | "originNodeId"
    | "destinationNodeId"
    | "targetNodeId"
    | "missileId"
    | "shipId"
  >
): ResolutionCue {
  return {
    kind,
    nodeIds: uniqueDefined([
      event.nodeId,
      event.originNodeId,
      event.destinationNodeId,
      event.targetNodeId
    ]),
    factionIds: uniqueDefined([event.actorFactionId, event.targetFactionId]),
    missileIds: uniqueDefined([event.missileId]),
    shipIds: uniqueDefined([event.shipId])
  };
}

function createResolutionEventId(
  event: TurnDebugEvent,
  _eventIndex: number,
  rowNumber: number
): string {
  const nodeKey =
    event.nodeId ?? event.originNodeId ?? event.firingNodeId ?? event.destinationNodeId ?? "none";
  return `resolution:${event.turn}:${String(rowNumber).padStart(2, "0")}:${event.type}:${nodeKey}`;
}

function uniqueDefined<T extends string>(values: readonly (T | undefined)[]): readonly T[] {
  return [...new Set(values.filter((value): value is T => value !== undefined))];
}
