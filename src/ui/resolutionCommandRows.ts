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
          { text: `  ${nodeName}  +${event.dvDelta ?? 2} ΔV` }
        ]
      };
    case "WORK_SHIPYARD":
      if (event.result === "captured-progress") {
        return {
          parts: [
            { text: numberPrefix },
            { text: "CAPTURE", className: factionClass },
            { text: `  ${nodeName}  Shipyard ${event.progress ?? "?"}/5` }
          ]
        };
      }

      return {
        parts: [
          { text: numberPrefix },
          { text: "WORK", className: factionClass },
          { text: `  ${nodeName}  Shipyard ${event.progress ?? "?"}/5` }
        ]
      };
    case "CONTESTED_UPKEEP":
      return {
        parts: [
          { text: numberPrefix },
          { text: "CONTESTED", className: "command-console__event-contested" },
          { text: `  ${nodeName}` },
          ...(event.dvDeltas ?? []).map((delta) => ({
            text: `  ${delta.amount} ΔV`,
            className: getCommandFactionClass(delta.factionId)
          }))
        ]
      };
    case "FIRE_LAUNCHED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "FIRE", className: factionClass },
          {
            text: `  ${formatResolutionNodeName(content, event.originNodeId)} -> ${formatResolutionNodeName(content, event.targetNodeId)}  T-${event.missileEtaTurns ?? "?"}`
          }
        ]
      };
    case "BURN_DEPARTED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "BURN", className: factionClass },
          {
            text: `  ${formatResolutionNodeName(content, event.originNodeId)} -> ${formatResolutionNodeName(content, event.destinationNodeId)}  T+${event.etaTurns ?? "?"}  -${event.cost ?? "?"}\u00a0ΔV`
          }
        ]
      };
    case "EVADE":
      return {
        parts: [
          { text: numberPrefix },
          { text: "EVADE", className: factionClass },
          { text: `  ${nodeName}  ${event.dvDelta ?? -1} ΔV` }
        ]
      };
    case "EVADE_BLOCKED":
      return {
        parts: [
          { text: numberPrefix },
          {
            text: "EVADE BLOCKED — CONTESTED",
            className: mergeResolutionCommandClasses(
              factionClass,
              "command-console__event-contested"
            )
          },
          { text: `  ${nodeName}` }
        ]
      };
    case "MISSILE_IMPACT":
      return {
        parts: [
          { text: numberPrefix },
          { text: "IMPACT", className: factionClass },
          { text: `  ${nodeName}` }
        ]
      };
    case "SIGNAL_LOST":
      if (event.result === "MISSILE_SOLUTION_BROKEN") {
        return {
          parts: [
            { text: numberPrefix },
            { text: "MISSILE SOLUTION BROKEN", className: factionClass },
            { text: ` — TARGET ESCAPED at ${nodeName}` }
          ]
        };
      }

      if (event.result === "MISSILE_MISSED") {
        return {
          parts: [
            { text: numberPrefix },
            { text: "MISSILE MISSED", className: factionClass },
            { text: ` — TARGET SAFE at ${nodeName}` }
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
          { text: " — ", className: crewLostCueClassName },
          { text: "CREW LOST", className: crewLostCueClassName },
          { text: ` at ${nodeName}`, className: crewLostCueClassName }
        ]
      };
    case "MANDATORY_LAUNCH":
      return {
        parts: [
          { text: numberPrefix },
          { text: "MANDATORY LAUNCH REQUIRED", className: factionClass },
          { text: `  ${nodeName}` }
        ]
      };
    case "MANDATORY_LAUNCH_DESTROYED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "MANDATORY LAUNCH FAILED", className: factionClass },
          { text: `  ${nodeName}  insufficient ΔV` }
        ]
      };
    case "BURN_FAILED":
      return {
        parts: [
          { text: numberPrefix },
          { text: "BURN FAILED", className: factionClass },
          { text: `  ${nodeName}  insufficient ΔV` }
        ]
      };
    case "VICTORY":
      return {
        parts: [
          { text: "VICTORY", className: factionClass },
          {
            text: `  ${event.actorFactionId === undefined ? "Unknown" : formatResolutionFactionName(factions, event.actorFactionId)}  Tritium Collapse`
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
