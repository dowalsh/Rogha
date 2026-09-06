// src/lib/jam-preview.ts
//
// Client-safe Weekly Jam helpers — no Prisma import, so this can be pulled
// into client components (e.g. Frontpage.tsx) without bundling the pg driver.

export type WeeklyJamRow = {
  userId: string;
  username: string;
  image: string | null;
  name: string;
  artist: string;
  playCount: number;
  imageUrl: string | null;
  spotifySearchUrl: string;
  lastfmUrl: string;
  isViewer: boolean;
};

export type WeeklyJamData = {
  rows: WeeklyJamRow[];
  viewerConnected: boolean;
};

/**
 * Derives the compact "post-like" preview shown for the Jam on the Edition
 * front page and the Editions listing: the viewer's own track art (never a
 * friend's), and whether there's anything to show at all.
 */
export function jamPreviewFromRows(rows: WeeklyJamRow[]): {
  hasData: boolean;
  ownImageUrl: string | null;
} {
  return {
    hasData: rows.length > 0,
    ownImageUrl: rows.find((r) => r.isViewer)?.imageUrl ?? null,
  };
}
