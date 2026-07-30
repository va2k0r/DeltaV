export function shouldPanTutorialTarget(options: {
  isFirstTurn: boolean;
  isArrival: boolean;
}): boolean {
  return options.isFirstTurn || options.isArrival;
}
