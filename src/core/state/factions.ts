import type { FactionDvReserve, FactionId, FactionIdentity, GameModeId, GameState } from "./types";

export const knownFactionIds = [
  "player",
  "opponent",
  "ai_2"
] as const satisfies readonly FactionId[];

export const defaultGameMode: GameModeId = "2p";

const defaultPlayerIdentity: FactionIdentity = {
  id: "player",
  displayName: "Aperture",
  color: "#7fe8ff",
  accent: "#d9f8ff",
  controlType: "human"
};

const defaultOpponentIdentity: FactionIdentity = {
  id: "opponent",
  displayName: "Wayline",
  color: "#c982ff",
  accent: "#f3dcff",
  controlType: "ai"
};

export const defaultFactionIdentities: readonly FactionIdentity[] = [
  defaultPlayerIdentity,
  defaultOpponentIdentity
];

export function createDefaultFactionIdentities(mode: GameModeId): readonly FactionIdentity[] {
  if (mode === "1p") {
    return [defaultPlayerIdentity];
  }

  if (mode === "3p") {
    return [
      defaultPlayerIdentity,
      defaultOpponentIdentity,
      {
        id: "ai_2",
        displayName: "Prism",
        color: "#9be65d",
        accent: "#ddffc0",
        controlType: "ai"
      }
    ];
  }

  return defaultFactionIdentities;
}

export function createFactionDvReserve(
  factions: readonly FactionIdentity[],
  initialDv = 10
): FactionDvReserve {
  return Object.fromEntries(factions.map((faction) => [faction.id, initialDv]));
}

export function getActiveFactions(
  state: Pick<GameState, "factions"> | undefined
): readonly FactionIdentity[] {
  const factions = state?.factions ?? defaultFactionIdentities;
  return factions.length === 0 ? defaultFactionIdentities : factions;
}

export function getActiveFactionIds(state: Pick<GameState, "factions">): readonly FactionId[] {
  return getActiveFactions(state).map((faction) => faction.id);
}

export function getAiFactionIds(state: Pick<GameState, "factions">): readonly FactionId[] {
  return getActiveFactions(state)
    .filter((faction) => faction.controlType === "ai")
    .map((faction) => faction.id);
}

export function getEnemyFactionIds(
  state: Pick<GameState, "factions">,
  factionId: FactionId
): readonly FactionId[] {
  return getActiveFactionIds(state).filter((candidate) => candidate !== factionId);
}

export function getFactionIdentity(
  state: Pick<GameState, "factions">,
  factionId: FactionId
): FactionIdentity {
  return (
    getActiveFactions(state).find((faction) => faction.id === factionId) ?? {
      id: factionId,
      displayName: factionId,
      color: "#d8dee9",
      accent: "#ffffff",
      controlType: factionId === "player" ? "human" : "ai"
    }
  );
}

export function getFactionDv(state: Pick<GameState, "factionDv">, factionId: FactionId): number {
  return state.factionDv[factionId] ?? 0;
}
