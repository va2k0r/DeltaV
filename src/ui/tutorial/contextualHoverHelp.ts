import type { NodeType } from "../../data";

export const tutorialContextHoverDwellMs = 380;
export const tutorialContextHoverReleaseMs = 240;
export const tutorialContextTypewriterMsPerCharacter = 7.5;
export const tutorialContextTypewriterMinDurationMs = 360;
export const tutorialContextTypewriterMaxDurationMs = 2_700;
export const tutorialContextEraseMinDurationMs = 45;
export const tutorialContextEraseMaxDurationMs = 135;

export type TutorialContextualHoverCopy = Readonly<{
  label: string;
  text: string;
}>;

export type TutorialContextualAction =
  | Readonly<{
      kind: "burn";
      originName: string;
      destinationName: string;
      etaTurns: number | null;
      burnCost: number | null;
      failureReason: string | null;
    }>
  | Readonly<{
      kind: "fire";
      originName: string;
      targetName: string;
      etaTurns: number | null;
      failureReason: string | null;
    }>;

export type TutorialContextualNodeDetails = Readonly<{
  kind: "node";
  name: string;
  bodyName: string;
  nodeType: NodeType;
  occupancy: string;
  isContested: boolean;
  isWorking: boolean;
  workingFactionName: string | null;
  tritiumOutput: number;
  shipyardProgress: number;
  action: TutorialContextualAction | null;
}>;

export type TutorialContextualBodyDetails = Readonly<{
  kind: "body";
  name: string;
  bodyKind: "star" | "planet" | "moon" | "dwarfPlanet";
  parentName: string | null;
  orbitPeriodTurns: number;
  nodeCount: number;
}>;

export type TutorialContextualBurnDetails = Readonly<{
  kind: "burn-transit";
  factionName: string;
  originName: string;
  destinationName: string;
  shipCount: number;
  burnCost: number;
  turnsRemaining: number;
}>;

export type TutorialContextualMissileDetails = Readonly<{
  kind: "missile";
  factionName: string;
  originName: string;
  targetName: string;
  targetFactionName: string;
  turnsRemaining: number;
}>;

export type TutorialContextualHoverDetails =
  | TutorialContextualNodeDetails
  | TutorialContextualBodyDetails
  | TutorialContextualBurnDetails
  | TutorialContextualMissileDetails;

export function createTutorialContextualHoverCopy(
  details: TutorialContextualHoverDetails
): TutorialContextualHoverCopy {
  switch (details.kind) {
    case "node":
      return createNodeCopy(details);
    case "body":
      return createBodyCopy(details);
    case "burn-transit":
      return {
        label: "BURN // SHIP IN TRANSIT",
        text: [
          `${details.factionName} ×${details.shipCount}: ${details.originName} → ${details.destinationName}.`,
          `Arrival in T-${details.turnsRemaining}; ${details.burnCost} ΔV was committed at departure.`,
          "The ship follows the transfer path and cannot receive another order until it reaches the destination orbit."
        ].join("\n")
      };
    case "missile":
      return {
        label: "FIRE // MISSILE INBOUND",
        text: [
          `${details.factionName}: ${details.originName} → ${details.targetName}.`,
          `Impact in T-${details.turnsRemaining}; target fleet: ${details.targetFactionName}.`,
          "The missile is already committed. Moving the targeted ship before impact is the way to evade it."
        ].join("\n")
      };
  }
}

export function getTutorialContextProgressiveText(
  text: string,
  progress: number,
  direction: "type" | "erase"
): string {
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const visibleCharacters =
    direction === "type"
      ? Math.floor(text.length * clampedProgress)
      : Math.ceil(text.length * (1 - clampedProgress));
  return text.slice(0, visibleCharacters);
}

function createNodeCopy(details: TutorialContextualNodeDetails): TutorialContextualHoverCopy {
  const lines = [
    `${details.name} // ${details.nodeType.toUpperCase()} orbiting ${details.bodyName}.`,
    createNodeRoleExplanation(details),
    `Ships: ${details.occupancy}. ${createNodeControlExplanation(details)}`
  ];

  if (details.action !== null) {
    lines.push(createActionExplanation(details.action));
  } else {
    lines.push(
      "Click once to select. Double-click to focus the camera. Select one of your ships, then hover another node to inspect a complete order."
    );
  }

  return {
    label: "CONTEXT // ORBITAL NODE",
    text: lines.join("\n")
  };
}

function createNodeRoleExplanation(details: TutorialContextualNodeDetails): string {
  switch (details.nodeType) {
    case "tritium":
      return details.isWorking
        ? `TRITIUM: worked by ${details.workingFactionName ?? "a fleet"}; produces ${details.tritiumOutput} ΔV at turn resolution.`
        : `TRITIUM: produces ${details.tritiumOutput} ΔV at turn resolution when a single uncontested faction works it.`;
    case "shipyard":
      return details.isWorking
        ? `SHIPYARD: worked by ${details.workingFactionName ?? "a fleet"}; construction progress is ${details.shipyardProgress}/5.`
        : `SHIPYARD: an uncontested fleet advances construction each turn; current progress is ${details.shipyardProgress}/5.`;
    case "protected":
      return "PROTECTED: this orbit cannot be contested and weapons are offline here.";
    case "barren":
      return "BARREN: no production; its value is position, interception timing and access to other transfer windows.";
  }
}

function createNodeControlExplanation(details: TutorialContextualNodeDetails): string {
  if (details.isContested) {
    return "CONTESTED: fleets cannot work or fire here, and each ship needs 2 ΔV upkeep per turn.";
  }

  return "A lone faction controls and can work the node.";
}

function createActionExplanation(action: TutorialContextualAction): string {
  if (action.kind === "burn") {
    if (action.failureReason !== null || action.etaTurns === null || action.burnCost === null) {
      return `BURN unavailable: ${action.failureReason ?? "no transfer solution"}.`;
    }

    return [
      `BURN: ${action.originName} → ${action.destinationName}, T+${action.etaTurns}, -${action.burnCost} ΔV.`,
      "The curved preview is the transfer; its closed destination loop is the arrival orbit. The dotted connector shows how that orbit moves while time passes. Click to queue."
    ].join(" ");
  }

  if (action.failureReason !== null || action.etaTurns === null) {
    return `FIRE unavailable: ${action.failureReason ?? "no firing solution"}.`;
  }

  return [
    `FIRE: ${action.originName} → ${action.targetName}, impact T-${action.etaTurns}.`,
    "The preview leads the moving orbit, aims at its geometric centre and stops just before the X; the X is the impact point. Click to queue."
  ].join(" ");
}

function createBodyCopy(details: TutorialContextualBodyDetails): TutorialContextualHoverCopy {
  const orbitDescription =
    details.parentName === null
      ? "It is the system reference body."
      : `It orbits ${details.parentName} in ${details.orbitPeriodTurns} turns.`;
  const nodeDescription =
    details.nodeCount === 1
      ? "One playable orbital node moves with it."
      : `${details.nodeCount} playable orbital nodes move with it.`;

  return {
    label: `SYSTEM // ${formatBodyKind(details.bodyKind)}`,
    text: [
      `${details.name}. ${orbitDescription}`,
      nodeDescription,
      "Bodies are visual and orbital references; commands are issued to the smaller orbital nodes. Double-click to focus the camera here."
    ].join("\n")
  };
}

function formatBodyKind(bodyKind: TutorialContextualBodyDetails["bodyKind"]): string {
  switch (bodyKind) {
    case "dwarfPlanet":
      return "DWARF PLANET";
    case "star":
      return "STAR";
    case "planet":
      return "PLANET";
    case "moon":
      return "MOON";
  }
}
