import type { FactionId, FactionIdentity, ResolutionEvent } from "../core";
import type { SolarSystemData } from "../data";
import { getCommandFactionClass, type CommandConsoleTextPart } from "./commandConsoleFormatting";

export type ResolutionCommandRow = Readonly<{
  parts: readonly CommandConsoleTextPart[];
  className?: string;
  key?: string;
}>;

const crewLostCueClassName = "command-console__crew-lost-cue";

const fallbackResolutionFactions: readonly FactionIdentity[] = [
  {
    id: "player",
    displayName: "Aperture",
    color: "#7fe8ff",
    accent: "#d9f8ff",
    controlType: "human"
  },
  {
    id: "opponent",
    displayName: "Wayline",
    color: "#c982ff",
    accent: "#f3dcff",
    controlType: "ai"
  }
];

export function createPlayerFacingResolutionRows(
  content: SolarSystemData,
  factions: readonly FactionIdentity[] | undefined,
  events: readonly ResolutionEvent[]
): readonly ResolutionCommandRow[] {
  return events.map((event) => createPlayerFacingResolutionRow(content, factions, event));
}

function createPlayerFacingResolutionRow(
  content: SolarSystemData,
  factions: readonly FactionIdentity[] | undefined,
  event: ResolutionEvent
): ResolutionCommandRow {
  const numberPrefix = event.type === "VICTORY" ? "" : `${String(event.index).padStart(2, "0")}  `;
  const nodeName = formatResolutionNodeName(content, event.nodeId);
  const factionClass =
    event.actorFactionId === undefined ? undefined : getCommandFactionClass(event.actorFactionId);

  switch (event.type) {
    case "WORK_TRITIUM":
      return {
        parts: [
          { text: numberPrefix },
          { text: "WORK", className: factionClass },
          { text: ` at ${nodeName} produced +${event.dvDelta ?? 2} ΔV.` }
        ]
      };
    case "WORK_SHIPYARD":
      if (event.result === "captured-progress") {
        return {
          parts: [
            { text: numberPrefix },
            { text: "CAPTURE", className: factionClass },
            { text: ` at ${nodeName}; shipyard progress is now ${event.progress ?? "?"}/5.` }
          ]
        };
      }

      return {
        parts: [
          { text: numberPrefix },
          { text: "WORK", className: factionClass },
          { text: ` at ${nodeName} advanced the shipyard to ${event.progress ?? "?"}/5.` }
        ]
      };
    case "CONTESTED_UPKEEP":
      return {
        parts: [
          { text: numberPrefix },
          { text: "CONTESTED upkeep", className: "command-console__event-contested" },
          { text: ` at ${nodeName} cost ` },
          ...(event.dvDeltas ?? []).flatMap((delta, index, deltas) => [
            ...(index === 0 ? [] : [{ text: " and " }]),
            {
              text: `${formatResolutionFactionName(factions, delta.factionId)} ${Math.abs(delta.amount)} ΔV${index === deltas.length - 1 ? "." : ""}`,
              className: getCommandFactionClass(delta.factionId)
            }
          ])
        ]
      };
    case "FIRE_LAUNCHED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "FIRE", className: factionClass },
          {
            text: ` from ${formatResolutionNodeName(content, event.originNodeId)} to ${formatResolutionNodeName(content, event.targetNodeId)}; impact T-${event.missileEtaTurns ?? "?"}.`
          }
        ]
      };
    case "BURN_DEPARTED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "BURN", className: factionClass },
          {
            text: ` from ${formatResolutionNodeName(content, event.originNodeId)} to ${formatResolutionNodeName(content, event.destinationNodeId)}; ETA T+${event.etaTurns ?? "?"}; cost -${event.cost ?? "?"}\u00a0ΔV.`
          }
        ]
      };
    case "EVADE":
      return {
        parts: [
          { text: numberPrefix },
          { text: "EVADE", className: factionClass },
          {
            text: ` at ${nodeName} absorbed the impact and cost ${Math.abs(event.dvDelta ?? -1)} ΔV.`
          }
        ]
      };
    case "EVADE_BLOCKED":
      return {
        parts: [
          { text: numberPrefix },
          {
            text: "EVADE BLOCKED",
            className: mergeResolutionCommandClasses(
              factionClass,
              "command-console__event-contested"
            )
          },
          { text: ` at ${nodeName} because the orbit was CONTESTED.` }
        ]
      };
    case "MISSILE_IMPACT":
      return {
        parts: [
          { text: numberPrefix },
          { text: "impact", className: factionClass },
          { text: ` at ${nodeName}.` }
        ]
      };
    case "SIGNAL_LOST":
      if (event.result === "MISSILE_SOLUTION_BROKEN") {
        return {
          parts: [
            { text: numberPrefix },
            { text: "MISSILE SOLUTION BROKEN", className: factionClass },
            { text: ` at ${nodeName}; the target escaped.` }
          ]
        };
      }

      if (event.result === "MISSILE_MISSED") {
        return {
          parts: [
            { text: numberPrefix },
            { text: "MISSILE MISSED", className: factionClass },
            { text: ` at ${nodeName}; the target is safe.` }
          ]
        };
      }

      return {
        parts: [
          { text: numberPrefix },
          {
            text: "SIGNAL LOST",
            className: mergeResolutionCommandClasses(factionClass, crewLostCueClassName)
          },
          { text: ` at ${nodeName}; `, className: crewLostCueClassName },
          { text: "CREW LOST", className: crewLostCueClassName },
          { text: ".", className: crewLostCueClassName }
        ]
      };
    case "MANDATORY_LAUNCH":
      return {
        parts: [
          { text: numberPrefix },
          { text: "MANDATORY LAUNCH", className: factionClass },
          { text: ` is required at ${nodeName}; select a BURN destination.` }
        ]
      };
    case "MANDATORY_LAUNCH_DESTROYED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "MANDATORY LAUNCH FAILED", className: factionClass },
          { text: ` at ${nodeName} because the faction had insufficient ΔV.` }
        ]
      };
    case "BURN_FAILED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "BURN FAILED", className: factionClass },
          { text: ` at ${nodeName} because the faction had insufficient ΔV.` }
        ]
      };
    case "VICTORY":
      return {
        parts: [
          { text: "VICTORY", className: factionClass },
          {
            text: ` for ${event.actorFactionId === undefined ? "Unknown" : formatResolutionFactionName(factions, event.actorFactionId)}; every rival has lost tritium access.`
          }
        ]
      };
    default:
      return {
        parts: [{ text: numberPrefix }, { text: event.type }]
      };
  }
}

function mergeResolutionCommandClasses(first: string | undefined, second: string): string {
  return first === undefined || first.length <= 0 ? second : `${first} ${second}`;
}

function formatResolutionNodeName(content: SolarSystemData, nodeId: string | undefined): string {
  if (nodeId === undefined) {
    return "unknown";
  }

  const node = content.nodes.find((candidate) => candidate.id === nodeId);
  const body =
    node === undefined
      ? undefined
      : content.bodies.find((candidate) => candidate.id === node.bodyId);
  return body?.name ?? nodeId;
}

function formatResolutionFactionName(
  factions: readonly FactionIdentity[] | undefined,
  factionId: FactionId
): string {
  const identities =
    factions === undefined || factions.length === 0 ? fallbackResolutionFactions : factions;
  return identities.find((faction) => faction.id === factionId)?.displayName ?? factionId;
}
