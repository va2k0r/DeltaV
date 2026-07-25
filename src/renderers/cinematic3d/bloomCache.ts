export type CinematicBloomCacheRefreshInput = Readonly<{
  cacheValid: boolean;
  cachedCameraSignature: string;
  currentCameraSignature: string;
  cachedContentSignature: string;
  currentContentSignature: string;
  cacheAgeMs: number;
  updateIntervalMs: number;
  maximumDeferralMs: number;
  peerPassRefreshedThisFrame?: boolean;
  tacticalPresentationUpdatedThisFrame: boolean;
}>;

export function shouldRefreshCinematicBloomCache(input: CinematicBloomCacheRefreshInput): boolean {
  if (!input.cacheValid) {
    return true;
  }

  // Bloom cache textures are screen-space images. Reusing one after the camera changes visibly
  // detaches its glow from the underlying world, even when the cache is only one frame old.
  if (input.cachedCameraSignature !== input.currentCameraSignature) {
    return true;
  }

  const canReuseCache =
    input.cacheAgeMs < input.updateIntervalMs ||
    input.peerPassRefreshedThisFrame === true ||
    (input.cacheAgeMs < input.maximumDeferralMs && input.tacticalPresentationUpdatedThisFrame);

  return !canReuseCache && input.cachedContentSignature !== input.currentContentSignature;
}
