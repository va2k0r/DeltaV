export type MandatoryLaunchExecuteReference = Readonly<{
  id: string;
}>;

export type MandatoryLaunchBurnReference = Readonly<{
  factionId: string;
  mandatoryLaunchId?: string;
}>;

export function hasQueuedPlayerMandatoryLaunchBurn(
  mandatoryLaunch: MandatoryLaunchExecuteReference | undefined,
  pendingBurnOrders: readonly MandatoryLaunchBurnReference[]
): boolean {
  if (mandatoryLaunch === undefined) {
    return false;
  }

  return pendingBurnOrders.some((order) => {
    return order.factionId === "player" && order.mandatoryLaunchId === mandatoryLaunch.id;
  });
}
