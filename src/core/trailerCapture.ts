import { applyCommand, advanceTurn, calculateBurnPlan } from "./simulation/gameState";
import type {
  FactionId,
  FactionIdentity,
  GameState,
  SimulationContent,
  SolarSystemSnapshot,
  TurnDebugEvent
} from "./state/types";
import type { GameCommand } from "./commands/commands";
import { createSolarSystemSnapshot } from "./simulation/positions";

export const TRAILER_CAPTURE_SEED = "deltav-trailer-capture-v1";
export const TRAILER_CAPTURE_PRE_ROLL_MS = 3_000;
export const TRAILER_CAPTURE_POST_ROLL_MS = 3_000;

export type TrailerCaptureStep =
  | Readonly<{
      kind: "command";
      command: Exclude<GameCommand, { type: "ADVANCE_TURN" }>;
      from: GameState;
      to: GameState;
    }>
  | Readonly<{
      kind: "advance";
      from: GameState;
      to: GameState;
    }>;

export type TrailerCaptureCameraCue = Readonly<{
  targetNodeIds: readonly string[];
  focusTargetKey?: string;
  openingTargetKeys?: readonly string[];
  heroShot?: TrailerCaptureHeroShot;
  cleanSystemView?: boolean;
  shots?: readonly TrailerCaptureCameraShot[];
}>;

export type TrailerCaptureHeroShot = Readonly<{
  focusTargetKey: string;
  targetKeys?: readonly string[];
  yawRadians?: number;
  pitchRadians?: number;
  distanceScale?: number;
  durationMs?: number;
}>;

export type TrailerCaptureCameraShot = Readonly<{
  focusTargetKey: string;
  targetKeys: readonly string[];
  yawRadians: number;
  pitchRadians: number;
  distanceScale: number;
  durationMs: number;
}>;

export type TrailerCaptureScene = Readonly<{
  index: number;
  id: string;
  title: string;
  preRollMs: number;
  postRollMs: number;
  camera: TrailerCaptureCameraCue;
  beforeState: GameState;
  afterState: GameState;
  beforeSnapshot: SolarSystemSnapshot;
  afterSnapshot: SolarSystemSnapshot;
  steps: readonly TrailerCaptureStep[];
  previewBurn?: Readonly<{
    originNodeId: string;
    destinationNodeId: string;
  }>;
}>;

export type TrailerCaptureTimeline = Readonly<{
  seed: string;
  initialState: GameState;
  scenes: readonly TrailerCaptureScene[];
}>;

const trailerFactions: readonly FactionIdentity[] = [
  {
    id: "player",
    displayName: "CYAN",
    color: "#7fe8ff",
    accent: "#d9f8ff",
    controlType: "human"
  },
  {
    id: "opponent",
    displayName: "VIOLET",
    color: "#c982ff",
    accent: "#f3dcff",
    controlType: "human"
  },
  {
    id: "ai_2",
    displayName: "YELLOW",
    color: "#ffd166",
    accent: "#fff0b8",
    controlType: "human"
  }
];

export function createTrailerCaptureInitialState(content: SimulationContent): GameState {
  assertTrailerNodes(content);

  return {
    turn: 0,
    gameMode: "3p",
    factions: trailerFactions,
    factionDv: {
      player: 80,
      opponent: 80,
      ai_2: 80
    },
    nodeOccupancies: [
      { nodeId: "moon_node", factionId: "player", shipCount: 1 },
      { nodeId: "europa_node", factionId: "player", shipCount: 1 },
      { nodeId: "mercury_node", factionId: "player", shipCount: 1 },
      { nodeId: "ganymede_node", factionId: "player", shipCount: 1 },
      { nodeId: "phobos_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "iapetus_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "titan_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "triton_node", factionId: "opponent", shipCount: 1 },
      { nodeId: "charon_node", factionId: "ai_2", shipCount: 1 },
      { nodeId: "titania_node", factionId: "ai_2", shipCount: 1 }
    ],
    shipyardProgress: [],
    mandatoryLaunches: [],
    pendingBurnOrders: [],
    pendingFireOrders: [],
    activeBurnTransits: [],
    activeMissiles: [],
    debugEvents: [
      {
        turn: 0,
        type: "START_STATE_AUDIT",
        message: `TRAILER CAPTURE ${TRAILER_CAPTURE_SEED}`,
        reason: "deterministic-trailer-capture"
      }
    ]
  };
}

export function createTrailerCaptureTimeline(content: SimulationContent): TrailerCaptureTimeline {
  const initialState = createTrailerCaptureInitialState(content);
  let state = initialState;
  const scenes: TrailerCaptureScene[] = [];

  const addScene = (
    id: string,
    title: string,
    camera: TrailerCaptureCameraCue,
    operations: readonly TrailerCaptureOperation[] = [],
    previewBurn?: TrailerCaptureScene["previewBurn"]
  ): void => {
    const beforeState = state;
    const steps: TrailerCaptureStep[] = [];

    for (const operation of operations) {
      const from = state;

      if (operation.kind === "advance") {
        state = advanceTurn(state, content, [], {});
        assertStateAdvanced(from, state, id);
        steps.push({ kind: "advance", from, to: state });
        continue;
      }

      state = applyCommand(state, operation.command, content);
      assertCommandApplied(from, state, operation.command, id);
      steps.push({ kind: "command", command: operation.command, from, to: state });
    }

    scenes.push({
      index: scenes.length + 1,
      id,
      title,
      preRollMs: TRAILER_CAPTURE_PRE_ROLL_MS,
      postRollMs: TRAILER_CAPTURE_POST_ROLL_MS,
      camera: {
        ...camera,
        shots: camera.shots ?? createTrailerCameraShots(camera)
      },
      beforeState,
      afterState: state,
      beforeSnapshot: createSolarSystemSnapshot(content, beforeState),
      afterSnapshot: createSolarSystemSnapshot(content, state),
      steps,
      ...(previewBurn === undefined ? {} : { previewBurn })
    });
  };

  addScene("earth-moon-opening", "Earth–Moon / Solar System opening", {
    targetNodeIds: ["earth_node", "moon_node"],
    focusTargetKey: "body:earth",
    openingTargetKeys: ["body:earth", "body:moon"],
    shots: [
      {
        focusTargetKey: "body:earth",
        targetKeys: ["body:earth", "body:moon"],
        yawRadians: -0.64,
        pitchRadians: 0.46,
        distanceScale: 0.54,
        durationMs: 1_550
      },
      {
        focusTargetKey: "body:sun",
        targetKeys: [
          "body:sun",
          "body:mercury",
          "body:venus",
          "body:earth",
          "body:mars",
          "body:jupiter",
          "body:saturn",
          "body:uranus",
          "body:neptune"
        ],
        yawRadians: 0.66,
        pitchRadians: 0.68,
        distanceScale: 1,
        durationMs: 1_650
      }
    ]
  });
  addScene("faction-reveal", "Three factions / Tritium / Shipyards", {
    targetNodeIds: [
      "europa_node",
      "titan_node",
      "titania_node",
      "callisto_node",
      "iapetus_node",
      "oberon_node"
    ],
    heroShot: {
      focusTargetKey: "body:saturn",
      yawRadians: -1.08,
      pitchRadians: 0.36,
      distanceScale: 1.2,
      durationMs: 1_850
    }
  });
  addScene(
    "burn-preview",
    "BURN preview Moon to Venus",
    {
      targetNodeIds: ["moon_node", "venus_node"],
      focusTargetKey: "node:moon_node",
      heroShot: {
        focusTargetKey: "body:venus",
        yawRadians: 0.86,
        pitchRadians: 0.42,
        distanceScale: 0.72
      }
    },
    [],
    {
      originNodeId: "moon_node",
      destinationNodeId: "venus_node"
    }
  );
  addScene(
    "three-committed",
    "Three committed orders / EXECUTE",
    {
      targetNodeIds: [
        "moon_node",
        "venus_node",
        "europa_node",
        "callisto_node",
        "charon_node",
        "neptune_node"
      ],
      heroShot: {
        focusTargetKey: "body:earth",
        targetKeys: ["body:earth", "body:moon"],
        yawRadians: 0.74,
        pitchRadians: 0.4,
        distanceScale: 0.42
      }
    },
    [
      burn("moon_node", "venus_node", "player"),
      burn("europa_node", "callisto_node", "player"),
      burn("charon_node", "neptune_node", "ai_2")
    ]
  );
  addScene(
    "simultaneous-burns",
    "Simultaneous BURN departures",
    {
      targetNodeIds: ["moon_node", "europa_node", "charon_node"],
      heroShot: {
        focusTargetKey: "body:jupiter",
        yawRadians: -0.82,
        pitchRadians: 0.34,
        distanceScale: 1.1
      }
    },
    [advance()]
  );
  addScene(
    "tritium-arrival",
    "Tritium arrival / ΔV increase",
    {
      targetNodeIds: ["venus_node"],
      focusTargetKey: "node:venus_node",
      heroShot: {
        focusTargetKey: "body:venus",
        yawRadians: -0.76,
        pitchRadians: 0.4,
        distanceScale: 0.72
      }
    },
    [advance(), advance(), advance()]
  );
  addScene(
    "phobos-fire",
    "FIRE from Phobos",
    {
      targetNodeIds: ["phobos_node", "venus_node"],
      focusTargetKey: "node:phobos_node",
      heroShot: {
        focusTargetKey: "body:mars",
        targetKeys: ["body:mars", "body:phobos"],
        yawRadians: 0.92,
        pitchRadians: 0.38,
        distanceScale: 0.68
      }
    },
    [
      fire("phobos_node", "venus_node", "opponent"),
      burn("mercury_node", "mars_node", "player"),
      burn("iapetus_node", "mars_node", "opponent"),
      advance()
    ]
  );
  addScene(
    "evade-point-defense",
    "Successful EVADE / Point Defense kill",
    {
      targetNodeIds: ["venus_node"],
      focusTargetKey: "node:venus_node",
      heroShot: {
        focusTargetKey: "body:venus",
        yawRadians: 1.14,
        pitchRadians: 0.36,
        distanceScale: 0.7
      }
    },
    [advance(), advance(), advance()]
  );
  addScene("mars-contested", "Simultaneous Mars arrival / CONTESTED", {
    targetNodeIds: ["mars_node"],
    focusTargetKey: "node:mars_node",
    heroShot: {
      focusTargetKey: "body:mars",
      targetKeys: ["body:mars", "body:phobos"],
      yawRadians: -0.9,
      pitchRadians: 0.34,
      distanceScale: 0.68
    }
  });
  addScene(
    "shipyard-mandatory-launch",
    "Shipyard 4/5 to 5/5 / MANDATORY LAUNCH",
    {
      targetNodeIds: ["callisto_node"],
      focusTargetKey: "node:callisto_node",
      heroShot: {
        focusTargetKey: "body:jupiter",
        yawRadians: 0.88,
        pitchRadians: 0.38,
        distanceScale: 1.1
      }
    },
    [burn("titania_node", "venus_node", "ai_2"), advance()]
  );
  addScene(
    "yellow-tritium-entry",
    "Yellow enters Cyan Tritium",
    {
      targetNodeIds: ["venus_node"],
      focusTargetKey: "node:venus_node",
      heroShot: {
        focusTargetKey: "body:venus",
        yawRadians: -1.16,
        pitchRadians: 0.32,
        distanceScale: 0.7
      }
    },
    [burn("callisto_node", "io_node", "player"), advance(), advance(), advance(), advance()]
  );
  addScene(
    "second-execute",
    "Second EXECUTE / four BURN orders",
    {
      targetNodeIds: [
        "callisto_node",
        "deimos_node",
        "io_node",
        "saturn_node",
        "titan_node",
        "jupiter_node",
        "neptune_node",
        "europa_node"
      ],
      heroShot: {
        focusTargetKey: "body:saturn",
        yawRadians: 1.02,
        pitchRadians: 0.34,
        distanceScale: 1.2,
        durationMs: 1_850
      }
    },
    [
      burn("callisto_node", "deimos_node", "player"),
      burn("io_node", "saturn_node", "player"),
      burn("titan_node", "jupiter_node", "opponent"),
      burn("neptune_node", "europa_node", "ai_2"),
      advance()
    ]
  );
  addScene(
    "fire-contested-cyan",
    "FIRE on Cyan ship at CONTESTED Mars",
    {
      targetNodeIds: ["phobos_node", "mars_node"],
      focusTargetKey: "node:mars_node",
      heroShot: {
        focusTargetKey: "body:mars",
        targetKeys: ["body:mars", "body:phobos"],
        yawRadians: 0.78,
        pitchRadians: 0.4,
        distanceScale: 0.68
      }
    },
    [fire("phobos_node", "mars_node", "opponent"), advance()]
  );
  addScene("evade-blocked", "EVADE BLOCKED — CONTESTED", {
    targetNodeIds: ["mars_node"],
    focusTargetKey: "node:mars_node",
    heroShot: {
      focusTargetKey: "body:mars",
      yawRadians: -1.22,
      pitchRadians: 0.3,
      distanceScale: 0.66
    }
  });
  addScene(
    "impact-signal-lost",
    "Impact / ship destruction / SIGNAL LOST",
    {
      targetNodeIds: ["mars_node"],
      focusTargetKey: "node:mars_node",
      heroShot: {
        focusTargetKey: "body:mars",
        yawRadians: 1.26,
        pitchRadians: 0.32,
        distanceScale: 0.64
      }
    },
    [advance()]
  );
  addScene("contest-resolved", "Contest resolved / Shipyard control changed", {
    targetNodeIds: ["mars_node"],
    focusTargetKey: "node:mars_node",
    heroShot: {
      focusTargetKey: "body:mars",
      targetKeys: ["body:mars", "body:phobos"],
      yawRadians: -0.7,
      pitchRadians: 0.38,
      distanceScale: 0.7
    }
  });
  addScene(
    "final-tritium-burn",
    "Final BURN toward the last enemy Tritium",
    {
      targetNodeIds: ["ganymede_node", "triton_node"],
      focusTargetKey: "node:triton_node",
      heroShot: {
        focusTargetKey: "body:neptune",
        targetKeys: ["body:neptune", "body:triton"],
        yawRadians: 0.94,
        pitchRadians: 0.36,
        distanceScale: 0.68
      }
    },
    [burn("ganymede_node", "triton_node", "player"), advance()]
  );
  addScene("clean-system-final", "Clean Solar System final", {
    targetNodeIds: [],
    cleanSystemView: true
  });

  return {
    seed: TRAILER_CAPTURE_SEED,
    initialState,
    scenes
  };
}

function createTrailerCameraShots(
  cue: Omit<TrailerCaptureCameraCue, "shots">
): readonly [TrailerCaptureCameraShot, TrailerCaptureCameraShot] {
  const nodeTargetKeys = cue.targetNodeIds.map((nodeId) => `node:${nodeId}`);
  const targetKeys =
    cue.openingTargetKeys !== undefined && cue.openingTargetKeys.length > 0
      ? cue.openingTargetKeys
      : nodeTargetKeys;
  const focusTargetKey =
    cue.focusTargetKey ??
    targetKeys[0] ??
    (cue.cleanSystemView === true ? "body:sun" : "body:earth");
  const heroShot = cue.heroShot;

  return [
    {
      focusTargetKey,
      targetKeys,
      yawRadians: -0.22,
      pitchRadians: 1.12,
      distanceScale: cue.cleanSystemView === true ? 1 : 1.08,
      durationMs: 1_350
    },
    {
      focusTargetKey: heroShot?.focusTargetKey ?? focusTargetKey,
      targetKeys:
        heroShot !== undefined
          ? (heroShot.targetKeys ?? [heroShot.focusTargetKey])
          : targetKeys.length <= 2
            ? targetKeys
            : [focusTargetKey, ...targetKeys.filter((key) => key !== focusTargetKey).slice(0, 2)],
      yawRadians: heroShot?.yawRadians ?? 0.58,
      pitchRadians: heroShot?.pitchRadians ?? 0.72,
      distanceScale: heroShot?.distanceScale ?? (cue.cleanSystemView === true ? 0.92 : 0.72),
      durationMs: heroShot?.durationMs ?? 1_550
    }
  ];
}

type TrailerCaptureOperation =
  | Readonly<{ kind: "command"; command: Exclude<GameCommand, { type: "ADVANCE_TURN" }> }>
  | Readonly<{ kind: "advance" }>;

function burn(
  originNodeId: string,
  destinationNodeId: string,
  factionId: FactionId
): TrailerCaptureOperation {
  return {
    kind: "command",
    command: {
      type: "ASSIGN_BURN_ORDER",
      originNodeId,
      destinationNodeId,
      factionId
    }
  };
}

function fire(
  originNodeId: string,
  targetNodeId: string,
  factionId: FactionId
): TrailerCaptureOperation {
  return {
    kind: "command",
    command: {
      type: "ASSIGN_FIRE_ORDER",
      originNodeId,
      targetNodeId,
      factionId
    }
  };
}

function advance(): TrailerCaptureOperation {
  return { kind: "advance" };
}

function assertCommandApplied(
  before: GameState,
  after: GameState,
  command: Exclude<GameCommand, { type: "ADVANCE_TURN" }>,
  sceneId: string
): void {
  if (after === before) {
    throw new Error(
      `Trailer scene "${sceneId}" contains an illegal ${command.type} command (${JSON.stringify(command)}).`
    );
  }
}

function assertStateAdvanced(before: GameState, after: GameState, sceneId: string): void {
  if (after.turn !== before.turn + 1) {
    throw new Error(
      `Trailer scene "${sceneId}" could not advance from T${before.turn} to T${before.turn + 1}.`
    );
  }
}

function assertTrailerNodes(content: SimulationContent): void {
  const requiredNodeIds = [
    "earth_node",
    "moon_node",
    "venus_node",
    "mercury_node",
    "mars_node",
    "phobos_node",
    "deimos_node",
    "io_node",
    "europa_node",
    "ganymede_node",
    "callisto_node",
    "jupiter_node",
    "saturn_node",
    "titan_node",
    "iapetus_node",
    "titania_node",
    "oberon_node",
    "neptune_node",
    "triton_node",
    "charon_node"
  ];
  const availableNodeIds = new Set(content.nodes.map((node) => node.id));
  const missingNodeIds = requiredNodeIds.filter((nodeId) => !availableNodeIds.has(nodeId));

  if (missingNodeIds.length > 0) {
    throw new Error(
      `Trailer Capture requires the curated Solar System nodes: ${missingNodeIds.join(", ")}.`
    );
  }

  const moonToVenus = calculateBurnPlan(content, 0, "moon_node", "venus_node");

  if (moonToVenus === null) {
    throw new Error("Trailer Capture requires a legal Moon to Venus BURN preview.");
  }

  if (content.nodes.find((node) => node.id === "mars_node")?.type !== "shipyard") {
    throw new Error("Trailer Capture requires the prepared Mars Shipyard node.");
  }
}

export function getTrailerSceneEvents(scene: TrailerCaptureScene): readonly TurnDebugEvent[] {
  return scene.steps.flatMap((step) => {
    return step.kind === "advance" ? step.to.debugEvents : [];
  });
}
