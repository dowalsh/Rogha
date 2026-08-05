// src/lib/jam.ts
//
// Weekly Jam: per-user, per-edition "top track of the week," auto-synced
// from Last.fm (see docs/specs/2026-08-04-weekly-jam-mvp.md). Two halves:
// capture (run from the Sunday cron, writes WeeklyTrack rows) and read
// (used by the Edition page to render the Jam card for a viewer).

import { prisma } from "@/lib/prisma";
import { getTopTrackLastWeek } from "@/lib/lastfm";
import { resolveSpotifyAlbumImage } from "@/lib/spotify";
import { getAcceptedFriendIds } from "@/lib/friends";

// ── Capture ──────────────────────────────────────────────────────────────

/**
 * Fetches each opted-in user's top track of the last 7 days and upserts a
 * WeeklyTrack row for this edition. Best-effort per user — a Last.fm error
 * or no-data result for one user is skipped silently; this must never throw
 * in a way that blocks the edition publish it's called after.
 */
export async function captureWeeklyJamTracks(editionId: string): Promise<void> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return; // not configured — silent no-op

  const participants = await prisma.user.findMany({
    where: { jamEnabled: true, lastfmUsername: { not: null } },
    select: { id: true, lastfmUsername: true },
  });

  for (const user of participants) {
    try {
      const result = await getTopTrackLastWeek(user.lastfmUsername!, apiKey);
      if ("error" in result || !result.track) continue;

      const t = result.track;
      // Prefer Spotify's licensed art over Last.fm's — same precedence as
      // the admin route (src/app/api/admin/lastfm-top-track/route.ts).
      const spotifyImageUrl = await resolveSpotifyAlbumImage(t.artist, t.name);
      const imageUrl = spotifyImageUrl ?? t.imageUrl;
      const imageSource = spotifyImageUrl ? "spotify" : t.imageSource;

      const data = {
        name: t.name,
        artist: t.artist,
        playCount: t.playCount,
        imageUrl,
        imageSource,
        spotifySearchUrl: t.spotifySearchUrl,
        lastfmUrl: t.lastfmUrl,
      };

      await prisma.weeklyTrack.upsert({
        where: { editionId_userId: { editionId, userId: user.id } },
        create: { editionId, userId: user.id, ...data },
        update: { ...data, capturedAt: new Date() },
      });
    } catch (err) {
      console.error("[captureWeeklyJamTracks] user failed, skipping", user.id, err);
    }
  }
}

// ── Read ─────────────────────────────────────────────────────────────────

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
 * The Jam rows a viewer should see for an edition: their own row (if any)
 * plus their accepted friends', minus anyone the viewer has blocked
 * (one-directional, matching docs/specs/2026-08-02-post-visibility-rules.md).
 */
export async function getWeeklyJamForEdition(
  viewerId: string,
  editionId: string,
): Promise<WeeklyJamData> {
  const [friendIds, blocks, viewer] = await Promise.all([
    getAcceptedFriendIds(viewerId),
    prisma.block.findMany({
      where: { blockerId: viewerId },
      select: { blockedId: true },
    }),
    prisma.user.findUnique({
      where: { id: viewerId },
      select: { jamEnabled: true, lastfmUsername: true },
    }),
  ]);

  const blockedIds = new Set(blocks.map((b) => b.blockedId));
  const candidateIds = [viewerId, ...friendIds].filter((id) => !blockedIds.has(id));

  const tracks = await prisma.weeklyTrack.findMany({
    where: { editionId, userId: { in: candidateIds } },
    select: {
      userId: true,
      name: true,
      artist: true,
      playCount: true,
      imageUrl: true,
      spotifySearchUrl: true,
      lastfmUrl: true,
      user: { select: { username: true, image: true } },
    },
  });

  const rows: WeeklyJamRow[] = tracks
    .map((t) => ({
      userId: t.userId,
      username: t.user.username,
      image: t.user.image,
      name: t.name,
      artist: t.artist,
      playCount: t.playCount,
      imageUrl: t.imageUrl,
      spotifySearchUrl: t.spotifySearchUrl,
      lastfmUrl: t.lastfmUrl,
      isViewer: t.userId === viewerId,
    }))
    .sort((a, b) => (a.isViewer === b.isViewer ? 0 : a.isViewer ? -1 : 1));

  return {
    rows,
    viewerConnected: Boolean(viewer?.jamEnabled && viewer?.lastfmUsername),
  };
}
