export const STARTING_SETUP = {
  player: {
    tritium: "titan_node",
    shipyard: "deimos_node",
    staging: "ganymede_node"
  },
  opponent: {
    tritium: "europa_node",
    shipyard: "oberon_node",
    staging: "phobos_node"
  }
} as const;

export const THREE_PLAYER_STARTING_SETUP = {
  player: {
    tritium: "jupiter_node",
    shipyard: "mars_node",
    staging: "callisto_node"
  },
  opponent: {
    tritium: "saturn_node",
    shipyard: "titan_node",
    staging: "iapetus_node"
  },
  ai_2: {
    tritium: "neptune_node",
    shipyard: "charon_node",
    staging: "triton_node"
  }
} as const;

export const DEFAULT_INITIAL_OCCUPANCIES = [
  { nodeId: STARTING_SETUP.player.tritium, factionId: "player", shipCount: 1 },
  { nodeId: STARTING_SETUP.player.shipyard, factionId: "player", shipCount: 1 },
  { nodeId: STARTING_SETUP.player.staging, factionId: "player", shipCount: 1 },
  { nodeId: STARTING_SETUP.opponent.tritium, factionId: "opponent", shipCount: 1 },
  { nodeId: STARTING_SETUP.opponent.shipyard, factionId: "opponent", shipCount: 1 },
  { nodeId: STARTING_SETUP.opponent.staging, factionId: "opponent", shipCount: 1 }
] as const;

export const ONE_PLAYER_INITIAL_OCCUPANCIES = [
  { nodeId: "moon_node", factionId: "player", shipCount: 1 }
] as const;

export const THREE_PLAYER_INITIAL_OCCUPANCIES = [
  { nodeId: THREE_PLAYER_STARTING_SETUP.player.tritium, factionId: "player", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.player.shipyard, factionId: "player", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.player.staging, factionId: "player", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.opponent.tritium, factionId: "opponent", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.opponent.shipyard, factionId: "opponent", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.opponent.staging, factionId: "opponent", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.ai_2.tritium, factionId: "ai_2", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.ai_2.shipyard, factionId: "ai_2", shipCount: 1 },
  { nodeId: THREE_PLAYER_STARTING_SETUP.ai_2.staging, factionId: "ai_2", shipCount: 1 }
] as const;
