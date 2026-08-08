export type CinematicGameplayActionMode = "burn" | "fire";

export type CinematicGameplayClickTargetInput = Readonly<{
  pickedTargetKey: string | null;
  nodeOrbitTargetKey: string | null;
  selectedActionMode: CinematicGameplayActionMode;
  activeBurnDestinationTargetKey: string | null;
}>;

/**
 * Resolve transient 3D markers into the gameplay target a player is most likely aiming for.
 * Moving ships and missiles remain inspectable away from nodes, while an orbit under the pointer
 * wins when their enlarged pickers overlap it. In FIRE mode, clicking an enemy ship in transit
 * aims at the orbit where that ship will arrive.
 */
export function resolveCinematicGameplayClickTarget(
  input: CinematicGameplayClickTargetInput
): string | null {
  const isBurnTarget = input.pickedTargetKey?.startsWith("burn:") === true;
  const isMissileTarget = input.pickedTargetKey?.startsWith("missile:") === true;

  if ((isBurnTarget || isMissileTarget) && input.nodeOrbitTargetKey !== null) {
    return input.nodeOrbitTargetKey;
  }

  if (
    input.selectedActionMode === "fire" &&
    isBurnTarget &&
    input.activeBurnDestinationTargetKey !== null
  ) {
    return input.activeBurnDestinationTargetKey;
  }

  return input.pickedTargetKey ?? input.nodeOrbitTargetKey;
}
