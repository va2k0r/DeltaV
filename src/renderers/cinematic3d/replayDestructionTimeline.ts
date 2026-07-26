import type { ActiveMissile, FactionId, SolarSystemSnapshot } from "../../core";
import {
  contestedUpkeepImpactVisualProgress,
  missileImpactVisualProgress
} from "./orbitInterpolation";

export { contestedUpkeepImpactVisualProgress } from "./orbitInterpolation";

type ReplayDestructionSnapshot = Pick<
  SolarSystemSnapshot,
  "turn" | "activeMissiles" | "debugEvents"
>;

export type ReplayDestructionTransition = Readonly<{
  from: ReplayDestructionSnapshot;
  to: ReplayDestructionSnapshot;
}>;

export type ReplayShipDestruction = Readonly<{
  id: string;
  nodeId: string;
  factionId: FactionId;
  source: "missile-impact" | "contested-upkeep";
  transitionIndex: number;
  impactTimelinePosition: number;
  anchorTurn: number;
}>;

export type ReplayShipDestructionFrame = Readonly<{
  destruction: ReplayShipDestruction;
  ageSeconds: number;
}>;

export const replayDestructionSecondsPerTurn = 0.86;

export function createReplayShipDestructionTimeline(
  transitions: readonly ReplayDestructionTransition[]
): readonly ReplayShipDestruction[] {
  const destructions: ReplayShipDestruction[] = [];

  for (const [transitionIndex, transition] of transitions.entries()) {
    const unusedMissileImpactEvents = transition.to.debugEvents
      .map((event, eventIndex) => ({ event, eventIndex }))
      .filter(({ event }) => event.type === "MISSILE_IMPACT");

    for (const [eventIndex, event] of transition.to.debugEvents.entries()) {
      if (
        event.type !== "SHIP_DESTROYED" ||
        event.nodeId === undefined ||
        event.factionId === undefined
      ) {
        continue;
      }

      const impactEventIndex = unusedMissileImpactEvents.findIndex(({ event: impactEvent }) => {
        return impactEvent.nodeId === event.nodeId && impactEvent.factionId === event.factionId;
      });

      if (impactEventIndex >= 0) {
        const impactEntry = unusedMissileImpactEvents.splice(impactEventIndex, 1)[0];
        const missile = findImpactMissile(
          transition.from.activeMissiles,
          impactEntry?.event.missileId,
          event.nodeId,
          event.factionId
        );
        const missileId = impactEntry?.event.missileId ?? missile?.id;
        const id =
          missileId === undefined
            ? `timeline-missile-impact:${event.nodeId}:${event.factionId}:${transition.to.turn}:${eventIndex}`
            : `${missileId}:impact:${transition.to.turn}`;

        destructions.push({
          id,
          nodeId: event.nodeId,
          factionId: event.factionId,
          source: "missile-impact",
          transitionIndex,
          impactTimelinePosition: transitionIndex + missileImpactVisualProgress,
          anchorTurn: transition.from.turn
        });
        continue;
      }

      const isContestedUpkeepFailure = transition.to.debugEvents.some((candidate) => {
        return (
          candidate.type === "CONTESTED_UPKEEP_FAILED" &&
          candidate.nodeId === event.nodeId &&
          candidate.factionId === event.factionId
        );
      });
      const isMandatoryLaunchFailure =
        event.mandatoryLaunchId !== undefined ||
        transition.to.debugEvents.some((candidate) => {
          return (
            candidate.type === "MANDATORY_LAUNCH_DESTROYED" &&
            candidate.nodeId === event.nodeId &&
            candidate.factionId === event.factionId
          );
        });

      if (!isContestedUpkeepFailure || isMandatoryLaunchFailure) {
        continue;
      }

      destructions.push({
        id: `contested-upkeep:${event.nodeId}:${event.factionId}:${transition.to.turn}:${eventIndex}`,
        nodeId: event.nodeId,
        factionId: event.factionId,
        source: "contested-upkeep",
        transitionIndex,
        impactTimelinePosition: transitionIndex + contestedUpkeepImpactVisualProgress,
        anchorTurn: transition.from.turn
      });
    }
  }

  return destructions;
}

export function getReplayShipDestructionFrames(
  destructions: readonly ReplayShipDestruction[],
  timelinePosition: number
): readonly ReplayShipDestructionFrame[] {
  return destructions.flatMap((destruction) => {
    const ageSeconds = getReplayShipDestructionAgeSeconds(destruction, timelinePosition);
    return ageSeconds === null ? [] : [{ destruction, ageSeconds }];
  });
}

export function getReplayShipDestructionAgeSeconds(
  destruction: ReplayShipDestruction,
  timelinePosition: number
): number | null {
  if (timelinePosition < destruction.impactTimelinePosition) {
    return null;
  }

  return (timelinePosition - destruction.impactTimelinePosition) * replayDestructionSecondsPerTurn;
}

function findImpactMissile(
  missiles: readonly ActiveMissile[],
  missileId: string | undefined,
  nodeId: string,
  factionId: FactionId
): ActiveMissile | undefined {
  return (
    missiles.find((missile) => missile.id === missileId) ??
    missiles.find((missile) => {
      return missile.targetNodeId === nodeId && missile.targetFactionId === factionId;
    })
  );
}
