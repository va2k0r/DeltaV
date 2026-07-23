import { z } from "zod";

export const bodyKindSchema = z.enum(["star", "planet", "moon", "dwarfPlanet"]);
export const visualClassSchema = z.enum([
  "star",
  "rocky",
  "protected",
  "protectedMoon",
  "moon",
  "gasGiant",
  "iceGiant",
  "dwarfBinary"
]);
export const nodeTypeSchema = z.enum(["protected", "tritium", "shipyard", "barren"]);

export const bodyDataSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    kind: bodyKindSchema,
    parentId: z.string().min(1).nullable(),
    orbitRadius: z.number().nonnegative(),
    orbitPeriodTurns: z.number().nonnegative(),
    initialAngle: z.number(),
    visualRadius: z.number().positive(),
    visualClass: visualClassSchema
  })
  .strict();

export const nodeDataSchema = z
  .object({
    id: z.string().min(1),
    bodyId: z.string().min(1),
    type: nodeTypeSchema,
    controllable: z.boolean(),
    contestable: z.boolean(),
    protectedNoWar: z.boolean(),
    producesTritium: z.boolean(),
    allowsShipyard: z.boolean(),
    weaponsOffline: z.boolean().default(false),
    gravityWell: z.number().int().nonnegative(),
    nodeOrbitRadius: z.number().positive()
  })
  .strict();

export const transferRulesSchema = z
  .object({
    globalEtaMultiplier: z.number().positive().default(1),
    sameSystemPlanetMoonEta: z.number().int().positive().default(3),
    sameSystemMoonEta: z.number().int().positive().default(4),
    planetDistanceScale: z.record(z.string(), z.number().int().nonnegative()).default({}),
    planetDistanceEtaTable: z.record(z.string(), z.number().int().positive()).default({}),
    planetDistanceBurnCostAdjustmentTable: z.record(z.string(), z.number().int()).default({}),
    routeEtaOverrides: z.record(z.string(), z.number().int().positive()).default({})
  })
  .strict();

const baseSolarSystemDataSchema = z
  .object({
    schemaVersion: z.literal(1),
    bodies: z.array(bodyDataSchema).min(1),
    nodes: z.array(nodeDataSchema).min(1),
    transferRules: transferRulesSchema.optional()
  })
  .strict();

export const solarSystemDataSchema = baseSolarSystemDataSchema.superRefine((data, context) => {
  const bodyIds = new Set<string>();
  const nodeIds = new Set<string>();

  for (const body of data.bodies) {
    if (bodyIds.has(body.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodies"],
        message: `Duplicate body id "${body.id}".`
      });
    }
    bodyIds.add(body.id);
  }

  for (const body of data.bodies) {
    if (body.parentId !== null && !bodyIds.has(body.parentId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodies", body.id, "parentId"],
        message: `Body "${body.id}" references unknown parent body "${body.parentId}".`
      });
    }

    if (body.parentId === body.id) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodies", body.id, "parentId"],
        message: `Body "${body.id}" cannot parent itself.`
      });
    }

    if (body.parentId === null && body.orbitRadius !== 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["bodies", body.id, "orbitRadius"],
        message: `Root body "${body.id}" must have orbitRadius 0.`
      });
    }
  }

  for (const node of data.nodes) {
    if (nodeIds.has(node.id)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes"],
        message: `Duplicate node id "${node.id}".`
      });
    }
    nodeIds.add(node.id);

    if (!bodyIds.has(node.bodyId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes", node.id, "bodyId"],
        message: `Node "${node.id}" references unknown body "${node.bodyId}".`
      });
    }

    validateNodeFlags(node, context);
  }

  if (data.transferRules !== undefined) {
    validateTransferRules(data.transferRules, bodyIds, nodeIds, context);
  }
});

function validateTransferRules(
  rules: z.infer<typeof transferRulesSchema>,
  bodyIds: ReadonlySet<string>,
  nodeIds: ReadonlySet<string>,
  context: z.RefinementCtx
): void {
  for (const bodyId of Object.keys(rules.planetDistanceScale)) {
    if (!bodyIds.has(bodyId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferRules", "planetDistanceScale", bodyId],
        message: `Transfer rules reference unknown body "${bodyId}".`
      });
    }
  }

  for (const distance of Object.keys(rules.planetDistanceEtaTable)) {
    if (!/^\d+$/.test(distance)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferRules", "planetDistanceEtaTable", distance],
        message: `Transfer ETA table key "${distance}" must be a non-negative integer distance.`
      });
    }
  }

  for (const distance of Object.keys(rules.planetDistanceBurnCostAdjustmentTable)) {
    if (!/^\d+$/.test(distance)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferRules", "planetDistanceBurnCostAdjustmentTable", distance],
        message: `Transfer burn-cost adjustment key "${distance}" must be a non-negative integer distance.`
      });
    }
  }

  for (const routeKey of Object.keys(rules.routeEtaOverrides)) {
    const [originNodeId, destinationNodeId, extra] = routeKey.split("->");

    if (originNodeId === undefined || destinationNodeId === undefined || extra !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferRules", "routeEtaOverrides", routeKey],
        message: `Route override "${routeKey}" must use "origin_node->destination_node".`
      });
      continue;
    }

    if (!nodeIds.has(originNodeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferRules", "routeEtaOverrides", routeKey],
        message: `Route override "${routeKey}" references unknown origin node "${originNodeId}".`
      });
    }

    if (!nodeIds.has(destinationNodeId)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["transferRules", "routeEtaOverrides", routeKey],
        message: `Route override "${routeKey}" references unknown destination node "${destinationNodeId}".`
      });
    }
  }
}

function validateNodeFlags(node: z.infer<typeof nodeDataSchema>, context: z.RefinementCtx): void {
  if (node.type === "protected") {
    assertFlag(context, node, "controllable", false);
    assertFlag(context, node, "contestable", false);
    assertFlag(context, node, "protectedNoWar", true);
    assertFlag(context, node, "producesTritium", false);
    assertFlag(context, node, "allowsShipyard", false);
    return;
  }

  assertFlag(context, node, "protectedNoWar", false);

  if (node.type === "tritium") {
    assertFlag(context, node, "controllable", true);
    assertFlag(context, node, "contestable", true);
    assertFlag(context, node, "producesTritium", true);
    assertFlag(context, node, "allowsShipyard", false);
    return;
  }

  if (node.type === "shipyard") {
    assertFlag(context, node, "controllable", true);
    assertFlag(context, node, "contestable", true);
    assertFlag(context, node, "producesTritium", false);
    assertFlag(context, node, "allowsShipyard", true);
    return;
  }

  assertFlag(context, node, "controllable", true);
  assertFlag(context, node, "contestable", true);
  assertFlag(context, node, "producesTritium", false);
  assertFlag(context, node, "allowsShipyard", false);
}

type NodeBooleanKey =
  | "controllable"
  | "contestable"
  | "protectedNoWar"
  | "producesTritium"
  | "allowsShipyard";

function assertFlag(
  context: z.RefinementCtx,
  node: z.infer<typeof nodeDataSchema>,
  key: NodeBooleanKey,
  expected: boolean
): void {
  if (node[key] !== expected) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["nodes", node.id, key],
      message: `Node "${node.id}" with type "${node.type}" must set ${key} to ${String(expected)}.`
    });
  }
}

export type BodyKind = z.infer<typeof bodyKindSchema>;
export type VisualClass = z.infer<typeof visualClassSchema>;
export type NodeType = z.infer<typeof nodeTypeSchema>;
export type BodyData = z.infer<typeof bodyDataSchema>;
export type NodeData = z.infer<typeof nodeDataSchema>;
export type SolarSystemData = z.infer<typeof baseSolarSystemDataSchema>;
export type TransferRules = z.infer<typeof transferRulesSchema>;
