import { describe, expect, it } from "vitest";
import {
  createPlayerFacingResolutionEvents,
  createVictoryResolutionEvent,
  type TurnDebugEvent
} from "../../src/core";

describe("player-facing resolution timeline", () => {
  it("converts raw debug events into structured player-facing beats", () => {
    const debugEvents: TurnDebugEvent[] = [
      {
        turn: 4,
        type: "AI_CONSIDERED_ACTION",
        message: "AI considered FIRE at Mercury",
        nodeId: "mercury_node",
        factionId: "opponent"
      },
      {
        turn: 4,
        type: "TRITIUM_INCOME",
        message: "this string must not drive the log",
        nodeId: "charon_node",
        factionId: "player",
        amount: 2
      },
      {
        turn: 4,
        type: "FIRE_LAUNCHED",
        message: "untrusted presentation text",
        nodeId: "neptune_node",
        targetNodeId: "iapetus_node",
        factionId: "opponent",
        missileEtaTurns: 3
      },
      {
        turn: 4,
        type: "MISSILE_IMPACT",
        message: "boom",
        nodeId: "iapetus_node",
        factionId: "opponent"
      }
    ];

    const events = createPlayerFacingResolutionEvents(debugEvents);

    expect(events).toHaveLength(3);
    expect(events.map((event) => event.type)).toEqual([
      "WORK_TRITIUM",
      "FIRE_LAUNCHED",
      "MISSILE_IMPACT"
    ]);
    expect(events[0]).toMatchObject({
      turn: 4,
      index: 1,
      actorFactionId: "player",
      nodeId: "charon_node",
      dvDelta: 2,
      sourceDebugEventTypes: ["TRITIUM_INCOME"]
    });
    expect(events[1]).toMatchObject({
      index: 2,
      originNodeId: "neptune_node",
      targetNodeId: "iapetus_node",
      missileEtaTurns: 3,
      criticality: "notable"
    });
    expect(events[2]?.cameraCue?.nodeIds).toEqual(["iapetus_node"]);
    expect(events[2]?.audioCue?.kind).toBe("MISSILE_IMPACT");
    expect(events[2]?.replayCue?.nodeIds).toEqual(["iapetus_node"]);
  });

  it("groups same-node contested upkeep into one causal beat", () => {
    const debugEvents: TurnDebugEvent[] = [
      {
        turn: 7,
        type: "CONTESTED_UPKEEP_PAID",
        message: "player upkeep",
        nodeId: "deimos_node",
        factionId: "player",
        amount: -2
      },
      {
        turn: 7,
        type: "CONTESTED_UPKEEP_PAID",
        message: "opponent upkeep",
        nodeId: "deimos_node",
        factionId: "opponent",
        amount: -2
      }
    ];

    const events = createPlayerFacingResolutionEvents(debugEvents);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "CONTESTED_UPKEEP",
      nodeId: "deimos_node",
      sourceDebugEventTypes: ["CONTESTED_UPKEEP_PAID", "CONTESTED_UPKEEP_PAID"],
      sourceDebugEventIndices: [0, 1]
    });
    expect(events[0]?.dvDeltas).toEqual([
      { factionId: "player", amount: -2 },
      { factionId: "opponent", amount: -2 }
    ]);
  });

  it("keeps the EVADE replay delta at 1 ΔV without changing contested upkeep", () => {
    const events = createPlayerFacingResolutionEvents([
      {
        turn: 8,
        type: "EVADE",
        message: "presentation text is not authoritative",
        nodeId: "jupiter_node",
        factionId: "player"
      }
    ]);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "EVADE",
      actorFactionId: "player",
      nodeId: "jupiter_node",
      dvDelta: -1
    });
  });

  it("keeps contested-upkeep failure attached to the ship-destroyed crew lost beat", () => {
    const debugEvents: TurnDebugEvent[] = [
      {
        turn: 9,
        type: "CONTESTED_UPKEEP_FAILED",
        message: "iapetus upkeep failed",
        nodeId: "iapetus_node",
        factionId: "opponent"
      },
      {
        turn: 9,
        type: "SHIP_DESTROYED",
        message: "ship destroyed after failed contested upkeep",
        nodeId: "iapetus_node",
        factionId: "opponent"
      }
    ];

    const events = createPlayerFacingResolutionEvents(debugEvents);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      type: "SIGNAL_LOST",
      nodeId: "iapetus_node",
      actorFactionId: "opponent",
      result: "SHIP_DESTROYED",
      sourceDebugEventTypes: ["CONTESTED_UPKEEP_FAILED", "SHIP_DESTROYED"],
      sourceDebugEventIndices: [0, 1]
    });
  });

  it("keeps resolution IDs stable when a transition is read with prior turn history", () => {
    const destruction: TurnDebugEvent = {
      turn: 12,
      type: "SHIP_DESTROYED",
      message: "enemy ship destroyed at Callisto",
      nodeId: "callisto_node",
      factionId: "opponent"
    };
    const transitionEvents = [destruction];
    const historicalEvents: TurnDebugEvent[] = [
      {
        turn: 11,
        type: "TRITIUM_INCOME",
        message: "prior-turn income",
        nodeId: "neptune_node",
        factionId: "player",
        amount: 2
      },
      ...transitionEvents
    ];

    const fromTransition = createPlayerFacingResolutionEvents(transitionEvents);
    const fromHistory = createPlayerFacingResolutionEvents(historicalEvents).filter(
      (event) => event.turn === destruction.turn
    );

    expect(fromTransition[0]?.id).toBe(fromHistory[0]?.id);
    expect(fromTransition[0]?.id).toBe("resolution:12:01:SHIP_DESTROYED:callisto_node");
  });

  it("creates a structured victory beat without log-text parsing", () => {
    const event = createVictoryResolutionEvent(12, "player");

    expect(event).toMatchObject({
      id: "resolution:12:victory:player",
      turn: 12,
      index: 1,
      type: "VICTORY",
      actorFactionId: "player",
      result: "tritium-collapse",
      criticality: "critical"
    });
    expect(event.mapCue.factionIds).toEqual(["player"]);
    expect(event.cameraCue?.kind).toBe("VICTORY");
  });
});
