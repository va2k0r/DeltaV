export type TutorialSupportProductionDestination = Readonly<{
  originNodeId: string;
  destinationNodeId: string;
  contestedShipyardNodeId: string | null;
  destinationType: string;
  isDestinationContested: boolean;
  hasOpponentShip: boolean;
  wouldPlayerStack: boolean;
}>;

export function isTutorialSupportProductionDestinationAllowed(
  destination: TutorialSupportProductionDestination
): boolean {
  return (
    destination.destinationNodeId !== destination.originNodeId &&
    destination.destinationNodeId !== destination.contestedShipyardNodeId &&
    destination.destinationType === "shipyard" &&
    !destination.isDestinationContested &&
    !destination.hasOpponentShip &&
    !destination.wouldPlayerStack
  );
}
