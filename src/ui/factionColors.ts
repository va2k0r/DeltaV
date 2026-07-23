import type { GameModeId } from "../core";

export type FactionColorSwatch = Readonly<{
  color: string;
  accent: string;
}>;

export const factionColorPalette = [
  { color: "#7fe8ff", accent: "#d9f8ff" },
  { color: "#c982ff", accent: "#f3dcff" },
  { color: "#9be65d", accent: "#ddffc0" },
  { color: "#7aa6ff", accent: "#d4e1ff" },
  { color: "#ffe066", accent: "#fff3ad" },
  { color: "#36d6b7", accent: "#bdfbf0" },
  { color: "#d18bff", accent: "#edd2ff" },
  { color: "#73f2c1", accent: "#c5ffe8" }
] as const satisfies readonly FactionColorSwatch[];

export const factionColorPairings = [
  [factionColorPalette[0], factionColorPalette[4]],
  [factionColorPalette[3], factionColorPalette[4]],
  [factionColorPalette[5], factionColorPalette[1]],
  [factionColorPalette[7], factionColorPalette[1]],
  [factionColorPalette[2], factionColorPalette[1]],
  [factionColorPalette[5], factionColorPalette[4]],
  [factionColorPalette[3], factionColorPalette[6]],
  [factionColorPalette[0], factionColorPalette[6]],
  [factionColorPalette[7], factionColorPalette[4]],
  [factionColorPalette[2], factionColorPalette[6]]
] as const satisfies readonly (readonly [FactionColorSwatch, FactionColorSwatch])[];

export const threeFactionColorSets = [
  [factionColorPalette[0], factionColorPalette[4], factionColorPalette[1]],
  [factionColorPalette[3], factionColorPalette[4], factionColorPalette[2]],
  [factionColorPalette[5], factionColorPalette[1], factionColorPalette[4]],
  [factionColorPalette[7], factionColorPalette[6], factionColorPalette[4]],
  [factionColorPalette[2], factionColorPalette[1], factionColorPalette[3]],
  [factionColorPalette[0], factionColorPalette[6], factionColorPalette[4]]
] as const satisfies readonly (readonly [
  FactionColorSwatch,
  FactionColorSwatch,
  FactionColorSwatch
])[];

export function createPairedFactionColorSequence(
  mode: GameModeId,
  random: () => number = Math.random
): readonly FactionColorSwatch[] {
  if (mode === "1p") {
    return [chooseReadonly(factionColorPalette, random)];
  }

  if (mode === "3p") {
    const [first, second, third] = chooseReadonly(threeFactionColorSets, random);
    const [player, opponent] = orientColorPair(first, second, random);
    return [player, opponent, third];
  }

  const [first, second] = chooseReadonly(factionColorPairings, random);
  const [player, opponent] = orientColorPair(first, second, random);
  return [player, opponent];
}

function orientColorPair(
  first: FactionColorSwatch,
  second: FactionColorSwatch,
  random: () => number
): readonly [FactionColorSwatch, FactionColorSwatch] {
  return random() < 0.5 ? [first, second] : [second, first];
}

function chooseReadonly<T>(items: readonly T[], random: () => number): T {
  const fallback = items[0];

  if (fallback === undefined) {
    throw new Error("Cannot choose from an empty list.");
  }

  const index = Math.min(items.length - 1, Math.max(0, Math.floor(random() * items.length)));
  return items[index] ?? fallback;
}
