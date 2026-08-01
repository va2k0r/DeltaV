function readConfiguredExternalUrl(value: unknown): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

/**
 * Public release links live here so the site and the in-game menu cannot drift apart.
 * Keep an entry null until a real public URL exists; never substitute a guessed destination.
 */
export const deltaVExternalLinks = {
  steamWishlist: readConfiguredExternalUrl(import.meta.env.VITE_STEAM_WISHLIST_URL),
  trailerVideo: readConfiguredExternalUrl(import.meta.env.VITE_TRAILER_VIDEO_URL)
} as const;
