const initialNodeIdAliases: Readonly<Record<string, readonly string[]>> = {
  charon_node: ["pluto_charon_node", "pluto_node"],
  pluto_charon_node: ["charon_node", "pluto_node"]
};

export function resolveInitialNodeId(nodeId: string, nodeIds: ReadonlySet<string>): string {
  if (nodeIds.has(nodeId)) {
    return nodeId;
  }

  for (const alias of initialNodeIdAliases[nodeId] ?? []) {
    if (nodeIds.has(alias)) {
      return alias;
    }
  }

  console.warn(`DeltaV initial setup references missing node ${nodeId}.`);
  return nodeId;
}
