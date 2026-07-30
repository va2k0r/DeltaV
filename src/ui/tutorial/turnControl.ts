import type { FactionId, FactionIdentity } from "../../core";

export function getTutorialAiPlanningFactionIds(
  factions: readonly Pick<FactionIdentity, "id" | "controlType">[]
): readonly FactionId[] {
  return factions.filter((faction) => faction.controlType === "ai").map((faction) => faction.id);
}
