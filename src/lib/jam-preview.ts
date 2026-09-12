// src/lib/jam-preview.ts
//
// Client-safe Weekly Jam helpers — no Prisma import, so this can be pulled
// into client components (e.g. Frontpage.tsx) without bundling the pg driver.

export type WeeklyJamRow = {
  trackId: string;
  userId: string;
  username: string;
  image: string | null;
  name: string;
  artist: string;
  playCount: number;
  imageUrl: string | null;
  spotifySearchUrl: string;
  // Exact open.spotify.com/track/<id> match, when Spotify search found one —
  // "Open in Spotify" should prefer this over spotifySearchUrl.
  spotifyTrackUrl: string | null;
  lastfmUrl: string;
  isViewer: boolean;
  commentCount: number;
  // Top artist of the week — separately captured from Last.fm, so it can be
  // absent even when the top track isn't (e.g. Last.fm returned one but not
  // the other for that user that week).
  topArtist: WeeklyJamArtist | null;
  // Set when this row's top track was previously the top track of one of
  // THIS row owner's friends, in an earlier edition — the "sparkle" callout.
  // Visibility is gated by the row itself (i.e. the viewer doesn't need to
  // be friends with the inspiring person, only the row owner does).
  inspiredBy: { username: string } | null;
};

export type WeeklyJamArtist = {
  name: string;
  playCount: number;
  imageUrl: string | null;
  spotifyArtistUrl: string | null;
  lastfmUrl: string;
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
