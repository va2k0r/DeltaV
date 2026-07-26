import { describe, expect, it } from "vitest";
import {
  TRAILER_CAPTURE_POST_ROLL_MS,
  TRAILER_CAPTURE_PRE_ROLL_MS,
  TRAILER_CAPTURE_SEED,
  calculateBurnPlan,
  createPlayerFacingResolutionEvents,
  createTrailerCaptureTimeline,
  getFactionDv,
  getTrailerSceneEvents,
  validateContestedState,
  validateMissileTargets,
  validateNoDeadShipsInState,
  validateNoNegativeDV,
  validateNoNonContestedSameFactionStacks,
  validateOneActionPerShip,
  validateShipReferences,
  type GameState,
  type TrailerCaptureScene,
  type TrailerCaptureTimeline,
  type TurnDebugEvent
} from "../../src/core";
import { getMapPreset, TRAILER_CAPTURE_MAP_PRESET_ID } from "../../src/data";
import { createPlayerFacingResolutionRows } from "../../src/ui/resolutionCommandRows";

const content = (() => {
  const presetContent = getMapPreset(TRAILER_CAPTURE_MAP_PRESET_ID).content;

  if (presetContent === undefined) {
    throw new Error("Trailer Capture requires the prepared map.");
  }

  return presetContent;
})();

function createTimeline(): TrailerCaptureTimeline {
  return createTrailerCaptureTimeline(content);
}

function getScene(timeline: TrailerCaptureTimeline, id: string): TrailerCaptureScene {
  const scene = timeline.scenes.find((candidate) => candidate.id === id);

  if (scene === undefined) {
    throw new Error(`Missing Trailer Capture scene "${id}".`);
  }

  return scene;
}

function eventsFor(scene: TrailerCaptureScene): readonly TurnDebugEvent[] {
  return getTrailerSceneEvents(scene);
}

function occupiersAt(state: GameState, nodeId: string): readonly string[] {
  return state.nodeOccupancies
    .filter((occupancy) => occupancy.nodeId === nodeId && occupancy.shipCount > 0)
    .map((occupancy) => occupancy.factionId)
    .sort();
}

describe("deterministic Trailer Capture", () => {
  it("builds the same legal 18-scene timeline for the fixed seed", () => {
    const timeline = createTimeline();
    const repeatedTimeline = createTimeline();

    expect(timeline.seed).toBe(TRAILER_CAPTURE_SEED);
    expect(repeatedTimeline).toEqual(timeline);
    expect(timeline.scenes.map((scene) => scene.id)).toEqual([
      "earth-moon-opening",
      "faction-reveal",
      "burn-preview",
      "three-committed",
      "simultaneous-burns",
      "tritium-arrival",
      "phobos-fire",
      "evade-point-defense",
      "mars-contested",
      "shipyard-mandatory-launch",
      "yellow-tritium-entry",
      "second-execute",
      "fire-contested-cyan",
      "evade-blocked",
      "impact-signal-lost",
      "contest-resolved",
      "final-tritium-burn",
      "clean-system-final"
    ]);

    const states = [
      timeline.initialState,
      ...timeline.scenes.flatMap((scene) => scene.steps.map((step) => step.to))
    ];

    for (const state of states) {
      expect(validateNoNegativeDV(state)).toEqual([]);
      expect(validateNoDeadShipsInState(state)).toEqual([]);
      const contestedStateErrors = validateContestedState(state);
      const unexplainedContestedStateErrors = contestedStateErrors.filter((error) => {
        const isMandatoryLaunchStack = state.mandatoryLaunches.some((launch) =>
          error.includes(launch.nodeId)
        );
        const isQueuedMandatoryDeparture = state.pendingBurnOrders.some((order) => {
          return error.includes(order.originNodeId);
        });
        return !isMandatoryLaunchStack && !isQueuedMandatoryDeparture;
      });
      const unexplainedStackingErrors = validateNoNonContestedSameFactionStacks(state).filter(
        (error) => {
          const isMandatoryLaunchStack = state.mandatoryLaunches.some((launch) =>
            error.includes(launch.nodeId)
          );
          const isQueuedMandatoryDeparture = state.pendingBurnOrders.some((order) => {
            return error.includes(order.originNodeId);
          });
          return !isMandatoryLaunchStack && !isQueuedMandatoryDeparture;
        }
      );
      expect(unexplainedContestedStateErrors, `T${state.turn} contested state`).toEqual([]);
      expect(unexplainedStackingErrors, `T${state.turn} node stacking`).toEqual([]);
      expect(validateOneActionPerShip(state)).toEqual([]);
      expect(validateShipReferences(state)).toEqual([]);
      expect(validateMissileTargets(state)).toEqual([]);
    }
  });

  it("gives every scene a three-second handle and two distinct pan/zoom/orbit framings", () => {
    const timeline = createTimeline();

    for (const scene of timeline.scenes) {
      expect(scene.preRollMs).toBeGreaterThanOrEqual(TRAILER_CAPTURE_PRE_ROLL_MS);
      expect(scene.postRollMs).toBeGreaterThanOrEqual(TRAILER_CAPTURE_POST_ROLL_MS);
      expect(scene.camera.shots).toHaveLength(2);

      const [firstShot, secondShot] = scene.camera.shots ?? [];
      expect(firstShot).toBeDefined();
      expect(secondShot).toBeDefined();
      expect(secondShot?.yawRadians).not.toBe(firstShot?.yawRadians);
      expect(secondShot?.pitchRadians).not.toBe(firstShot?.pitchRadians);
      expect(secondShot?.distanceScale).not.toBe(firstShot?.distanceScale);
    }

    const opening = getScene(timeline, "earth-moon-opening");
    expect(opening.camera.shots?.[0]?.targetKeys).toEqual(["body:earth", "body:moon"]);
    expect(opening.camera.shots?.[1]?.focusTargetKey).toBe("body:sun");
    expect(opening.camera.shots?.[1]?.targetKeys.length).toBeGreaterThanOrEqual(9);

    const heroShots = timeline.scenes
      .map((scene) => scene.camera.shots?.[1])
      .filter((shot) => shot?.targetKeys.length === 1 && shot.focusTargetKey.startsWith("body:"));
    expect(heroShots.length).toBeGreaterThanOrEqual(10);
    expect(heroShots.some((shot) => shot?.focusTargetKey === "body:saturn")).toBe(true);
    expect(heroShots.every((shot) => (shot?.distanceScale ?? 1) <= 1.2)).toBe(true);
  });

  it("uses the real BURN planner and commits the first three legal orders", () => {
    const timeline = createTimeline();
    const preview = getScene(timeline, "burn-preview");
    const committed = getScene(timeline, "three-committed");
    const plan = calculateBurnPlan(
      content,
      preview.beforeState,
      preview.previewBurn?.originNodeId ?? "",
      preview.previewBurn?.destinationNodeId ?? ""
    );

    expect(plan).not.toBeNull();
    expect(plan?.burnCost).toBeGreaterThan(0);
    expect(plan?.etaTurns).toBeGreaterThan(0);
    expect(committed.afterState.pendingBurnOrders).toHaveLength(3);
    expect(
      committed.afterState.pendingBurnOrders.map((order) => [
        order.factionId,
        order.originNodeId,
        order.destinationNodeId
      ])
    ).toEqual([
      ["player", "moon_node", "venus_node"],
      ["player", "europa_node", "callisto_node"],
      ["ai_2", "charon_node", "neptune_node"]
    ]);
  });

  it("resolves the first simultaneous burns, Tritium arrival, FIRE, and real EVADE", () => {
    const timeline = createTimeline();
    const departures = getScene(timeline, "simultaneous-burns");
    const tritiumArrival = getScene(timeline, "tritium-arrival");
    const fire = getScene(timeline, "phobos-fire");
    const evade = getScene(timeline, "evade-point-defense");

    expect(eventsFor(departures).filter((event) => event.type === "BURN_DEPARTED")).toHaveLength(3);
    expect(occupiersAt(tritiumArrival.afterState, "venus_node")).toContain("player");
    expect(getFactionDv(tritiumArrival.afterState, "player")).toBeGreaterThan(
      getFactionDv(tritiumArrival.beforeState, "player")
    );
    expect(
      eventsFor(tritiumArrival).some(
        (event) =>
          event.type === "TRITIUM_INCOME" &&
          event.factionId === "player" &&
          event.nodeId === "venus_node"
      )
    ).toBe(true);

    expect(
      eventsFor(fire).some(
        (event) =>
          event.type === "FIRE_LAUNCHED" &&
          (event.originNodeId === "phobos_node" || event.nodeId === "phobos_node") &&
          event.targetNodeId === "venus_node"
      )
    ).toBe(true);
    expect(fire.afterState.activeMissiles).toHaveLength(1);
    expect(
      eventsFor(evade).some(
        (event) =>
          event.type === "EVADE" && event.nodeId === "venus_node" && event.factionId === "player"
      )
    ).toBe(true);
    expect(occupiersAt(evade.afterState, "venus_node")).toContain("player");
    expect(
      eventsFor(evade).some(
        (event) => event.type === "MISSILE_IMPACT" || event.type === "SHIP_DESTROYED"
      )
    ).toBe(false);
  });

  it("creates the Mars contest and the real 4/5 to 5/5 mandatory Shipyard launch", () => {
    const timeline = createTimeline();
    const contested = getScene(timeline, "mars-contested");
    const production = getScene(timeline, "shipyard-mandatory-launch");
    const productionEvents = eventsFor(production);
    const resolutionEvents = createPlayerFacingResolutionEvents(productionEvents);

    expect(occupiersAt(contested.afterState, "mars_node")).toEqual(["opponent", "player"]);
    expect(contested.afterSnapshot.nodes.find((node) => node.id === "mars_node")?.isContested).toBe(
      true
    );
    expect(
      production.beforeState.shipyardProgress.find((entry) => entry.nodeId === "callisto_node")
        ?.progress
    ).toBe(4);
    expect(
      productionEvents.some(
        (event) =>
          event.type === "SHIP_PRODUCED" &&
          event.nodeId === "callisto_node" &&
          event.progressBefore === 4
      )
    ).toBe(true);
    expect(
      resolutionEvents.some(
        (event) =>
          event.type === "WORK_SHIPYARD" && event.nodeId === "callisto_node" && event.progress === 5
      )
    ).toBe(true);
    expect(
      production.afterState.mandatoryLaunches.some(
        (launch) => launch.factionId === "player" && launch.nodeId === "callisto_node"
      )
    ).toBe(true);
  });

  it("brings Yellow onto Cyan Tritium and launches four burns on the second EXECUTE", () => {
    const timeline = createTimeline();
    const yellowEntry = getScene(timeline, "yellow-tritium-entry");
    const secondExecute = getScene(timeline, "second-execute");

    expect(occupiersAt(yellowEntry.afterState, "venus_node")).toEqual(["ai_2", "player"]);
    expect(
      yellowEntry.afterSnapshot.nodes.find((node) => node.id === "venus_node")?.isContested
    ).toBe(true);
    expect(eventsFor(secondExecute).filter((event) => event.type === "BURN_DEPARTED")).toHaveLength(
      4
    );
  });

  it("blocks EVADE only because Mars is contested, then impacts and emits SIGNAL LOST", () => {
    const timeline = createTimeline();
    const fire = getScene(timeline, "fire-contested-cyan");
    const warning = getScene(timeline, "evade-blocked");
    const impact = getScene(timeline, "impact-signal-lost");
    const missile = warning.beforeState.activeMissiles[0];
    const impactEvents = eventsFor(impact);
    const blockedIndex = impactEvents.findIndex((event) => event.type === "EVADE_BLOCKED");
    const impactIndex = impactEvents.findIndex((event) => event.type === "MISSILE_IMPACT");
    const resolutionEvents = createPlayerFacingResolutionEvents(impactEvents);
    const rows = createPlayerFacingResolutionRows(
      content,
      impact.afterState.factions,
      resolutionEvents
    );
    const rowTexts = rows.map((row) => row.parts.map((part) => part.text).join(""));

    expect(fire.afterSnapshot.nodes.find((node) => node.id === "mars_node")?.isContested).toBe(
      true
    );
    expect(missile?.originNodeId).toBe("phobos_node");
    expect(missile?.targetNodeId).toBe("mars_node");
    expect(missile?.targetFactionId).toBe("player");
    expect((missile?.impactTurn ?? 0) - warning.beforeState.turn).toBe(1);

    expect(blockedIndex).toBeGreaterThanOrEqual(0);
    expect(impactIndex).toBeGreaterThan(blockedIndex);
    expect(impactEvents[blockedIndex]?.message).toBe("EVADE BLOCKED — CONTESTED");
    expect(impactEvents[blockedIndex]?.reason).toBe("contested");
    expect(impactEvents[blockedIndex]?.contested).toBe(true);
    expect(impactEvents.some((event) => event.type === "EVADE")).toBe(false);
    expect(rowTexts.some((text) => text.includes("EVADE BLOCKED — CONTESTED"))).toBe(true);
    expect(rowTexts.some((text) => text.includes("SIGNAL LOST"))).toBe(true);
    expect(occupiersAt(impact.afterState, "mars_node")).toEqual(["opponent"]);
  });

  it("changes Mars Shipyard control, starts the final enemy-Tritium burn, and ends clean", () => {
    const timeline = createTimeline();
    const resolved = getScene(timeline, "contest-resolved");
    const finalBurn = getScene(timeline, "final-tritium-burn");
    const cleanFinal = getScene(timeline, "clean-system-final");

    expect(content.nodes.find((node) => node.id === "mars_node")?.type).toBe("shipyard");
    expect(occupiersAt(resolved.afterState, "mars_node")).toEqual(["opponent"]);
    expect(
      eventsFor(finalBurn).some(
        (event) =>
          event.type === "BURN_DEPARTED" &&
          event.factionId === "player" &&
          event.destinationNodeId === "triton_node"
      )
    ).toBe(true);
    expect(finalBurn.afterState.activeBurnTransits).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          factionId: "player",
          originNodeId: "ganymede_node",
          destinationNodeId: "triton_node"
        })
      ])
    );
    expect(cleanFinal.camera.cleanSystemView).toBe(true);
    expect(cleanFinal.steps).toHaveLength(0);
  });
});
