import type { ResolutionEvent } from "../../core";

export function findFirstTutorialEnemyKillResolutionEvent(
  events: readonly ResolutionEvent[]
): ResolutionEvent | null {
  let firstKill: ResolutionEvent | null = null;

  for (const event of events) {
    if (
      event.type !== "SIGNAL_LOST" ||
      event.result !== "SHIP_DESTROYED" ||
      event.actorFactionId !== "opponent"
    ) {
      continue;
    }

    if (firstKill === null || compareResolutionEventOrder(event, firstKill) < 0) {
      firstKill = event;
    }
  }

  return firstKill;
}

function compareResolutionEventOrder(first: ResolutionEvent, second: ResolutionEvent): number {
  if (first.turn !== second.turn) {
    return first.turn - second.turn;
  }

  if (first.index !== second.index) {
    return first.index - second.index;
  }

  const firstSourceIndex = first.sourceDebugEventIndices.at(-1) ?? Number.MAX_SAFE_INTEGER;
  const secondSourceIndex = second.sourceDebugEventIndices.at(-1) ?? Number.MAX_SAFE_INTEGER;

  if (firstSourceIndex !== secondSourceIndex) {
    return firstSourceIndex - secondSourceIndex;
  }

  return first.id.localeCompare(second.id);
}
