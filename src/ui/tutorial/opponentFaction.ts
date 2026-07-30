import type { FactionIdentity, GameState } from "../../core";

export function ensureTutorialOpponentFactionState(
  state: GameState,
  opponentFaction: FactionIdentity,
  initialDv: number
): GameState {
  if (state.factions.some((faction) => faction.id === opponentFaction.id)) {
    return {
      ...state,
      factions: state.factions.map((faction) => {
        return faction.id === opponentFaction.id
          ? {
              ...faction,
              displayName: opponentFaction.displayName,
              controlType: opponentFaction.controlType
            }
          : faction;
      })
    };
  }

  return {
    ...state,
    factions: [...state.factions, opponentFaction],
    factionDv: {
      ...state.factionDv,
      [opponentFaction.id]: initialDv
    }
  };
}
