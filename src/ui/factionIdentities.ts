import type { FactionId, FactionIdentity, GameModeId } from "../core";
import { createPairedFactionColorSequence, factionColorPalette } from "./factionColors";

const factionNamePool = [
  "Aperture",
  "Wayline",
  "Prism",
  "Vertex",
  "Mosaic",
  "Scalar",
  "Cobalt",
  "Foundry",
  "Northstar",
  "Signal",
  "Nexum",
  "Cortex",
  "Radian",
  "Sable",
  "Kite",
  "Motive",
  "Lattice",
  "Axiom",
  "Vanta",
  "Tensor",
  "Arbor",
  "Beacon",
  "Nimbo",
  "OpenVector",
  "Metaform",
  "Aion",
  "Cloudbreak",
  "DeepIndex"
] as const;

export function createRandomFactionIdentities(mode: GameModeId): readonly FactionIdentity[] {
  const factionIds: readonly FactionId[] =
    mode === "1p"
      ? ["player"]
      : mode === "3p"
        ? ["player", "opponent", "ai_2"]
        : ["player", "opponent"];
  const names = shuffleReadonly(factionNamePool);
  const colors = createPairedFactionColorSequence(mode);

  return factionIds.map((id, index) => {
    const color = colors[index % colors.length] ?? factionColorPalette[0];
    return {
      id,
      displayName: names[index % names.length] ?? id,
      color: color.color,
      accent: color.accent,
      controlType: id === "player" ? "human" : "ai"
    };
  });
}

export function createFactionDvForIdentities(
  factions: readonly FactionIdentity[]
): Record<string, number> {
  return Object.fromEntries(factions.map((faction) => [faction.id, 10]));
}

function shuffleReadonly<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    const current = shuffled[index];
    const swap = shuffled[swapIndex];

    if (current === undefined || swap === undefined) {
      continue;
    }

    shuffled[index] = swap;
    shuffled[swapIndex] = current;
  }

  return shuffled;
}
