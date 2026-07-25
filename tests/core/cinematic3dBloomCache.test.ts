import { describe, expect, it } from "vitest";

import { shouldRefreshCinematicBloomCache } from "../../src/renderers/cinematic3d/bloomCache";

const stableCache = {
  cacheValid: true,
  cachedCameraSignature: "camera:a",
  currentCameraSignature: "camera:a",
  cachedContentSignature: "content:a",
  currentContentSignature: "content:a",
  cacheAgeMs: 12,
  updateIntervalMs: 1000 / 30,
  maximumDeferralMs: 2000 / 30,
  tacticalPresentationUpdatedThisFrame: false
} as const;

describe("cinematic bloom cache", () => {
  it("refreshes immediately when the camera changes, even for a fresh cache", () => {
    expect(
      shouldRefreshCinematicBloomCache({
        ...stableCache,
        currentCameraSignature: "camera:zoomed",
        peerPassRefreshedThisFrame: true
      })
    ).toBe(true);
  });

  it("keeps the frame-rate cap for animated bloom while the camera is stationary", () => {
    expect(
      shouldRefreshCinematicBloomCache({
        ...stableCache,
        currentContentSignature: "content:animated"
      })
    ).toBe(false);

    expect(
      shouldRefreshCinematicBloomCache({
        ...stableCache,
        currentContentSignature: "content:animated",
        cacheAgeMs: 40
      })
    ).toBe(true);
  });

  it("reuses an unchanged stationary cache after the refresh interval", () => {
    expect(
      shouldRefreshCinematicBloomCache({
        ...stableCache,
        cacheAgeMs: 100
      })
    ).toBe(false);
  });

  it("refreshes an invalid cache regardless of signatures", () => {
    expect(
      shouldRefreshCinematicBloomCache({
        ...stableCache,
        cacheValid: false
      })
    ).toBe(true);
  });
});
