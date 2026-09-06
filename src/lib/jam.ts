// src/lib/jam.ts
//
// Weekly Jam: per-user, per-edition "top track of the week," auto-synced
// from Last.fm (see docs/specs/2026-08-04-weekly-jam-mvp.md). Two halves:
// capture (run from the Sunday cron, writes WeeklyTrack rows) and read
// (used by the Edition page to render the Jam card for a viewer).

import { prisma } from "@/lib/prisma";
import { getTopTrackLastWeek } from "@/lib/lastfm";
import { resolveSpotifyTrack } from "@/lib/spotify";
import { getOwnerAccessToken, upsertWeeklyPlaylist } from "@/lib/spotify-playlist";
import { getAcceptedFriendships } from "@/lib/friends";
import { formatWeekLabel } from "@/lib/utils";
import type { WeeklyJamData, WeeklyJamRow } from "@/lib/jam-preview";

export type { WeeklyJamRow, WeeklyJamData } from "@/lib/jam-preview";
export { jamPreviewFromRows } from "@/lib/jam-preview";

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
      // the admin route (src/app/api/admin/lastfm-top-track/route.ts). Also
      // resolves the track's Spotify URI in the same search, so the weekly
      // playlist build (buildWeeklyPlaylists, below) never has to re-search.
      const spotifyTrack = await resolveSpotifyTrack(t.artist, t.name);
      const imageUrl = spotifyTrack?.imageUrl ?? t.imageUrl;
      const imageSource = spotifyTrack?.imageUrl ? "spotify" : t.imageSource;

      const data = {
        name: t.name,
        artist: t.artist,
        playCount: t.playCount,
        imageUrl,
        imageSource,
        spotifySearchUrl: t.spotifySearchUrl,
        spotifyUri: spotifyTrack?.uri ?? null,
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

/**
 * The Jam rows a viewer should see for an edition: their own row (if any)
 * plus their accepted friends', minus anyone the viewer has blocked
 * (one-directional, matching docs/specs/2026-08-02-post-visibility-rules.md).
 * Friends are temporally gated the same way FRIENDS-audience posts are —
 * the friendship must predate the edition going live, so accepting a friend
 * doesn't retroactively surface their Jam history from before you knew them.
 */
export async function getWeeklyJamForEdition(
  viewerId: string,
  editionId: string,
  editionPublishedAt: Date | null,
): Promise<WeeklyJamData> {
  const [friendships, blocks, viewer] = await Promise.all([
    getAcceptedFriendships(viewerId),
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
  const friendIds = editionPublishedAt
    ? friendships
        .filter((f) => f.acceptedAt <= editionPublishedAt)
        .map((f) => f.friendId)
    : friendships.map((f) => f.friendId);
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
      spotifyUri: true,
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
      spotifyUri: t.spotifyUri,
      lastfmUrl: t.lastfmUrl,
      isViewer: t.userId === viewerId,
    }))
    .sort((a, b) => (a.isViewer === b.isViewer ? 0 : a.isViewer ? -1 : 1));

  return {
    rows,
    viewerConnected: Boolean(viewer?.jamEnabled && viewer?.lastfmUsername),
  };
}

// ── Playlists ────────────────────────────────────────────────────────────

/**
 * Builds/updates one Spotify playlist per user for this edition — their own
 * track + their visible friends' tracks, exactly the rows getWeeklyJamForEdition
 * would show them. Runs on the app owner's own Spotify account (the
 * single-account workaround; see the plan doc — per-user OAuth isn't viable
 * past Spotify Dev Mode's 25-user cap at this app's scale). Best-effort per
 * user, same as captureWeeklyJamTracks; silently no-ops if the owner's
 * Spotify auth isn't configured (SPOTIFY_OWNER_REFRESH_TOKEN/USER_ID).
 */
export async function buildWeeklyPlaylists(editionId: string): Promise<void> {
  const ownerUserId = process.env.SPOTIFY_OWNER_USER_ID;
  if (!ownerUserId) return;

  const ownerAccessToken = await getOwnerAccessToken();
  if (!ownerAccessToken) return;

  const [edition, users, existingPlaylists] = await Promise.all([
    prisma.edition.findUnique({
      where: { id: editionId },
      select: { weekStart: true, publishedAt: true },
    }),
    prisma.user.findMany({ select: { id: true, username: true } }),
    prisma.weeklyPlaylist.findMany({
      where: { editionId },
      select: { userId: true, spotifyPlaylistId: true },
    }),
  ]);
  if (!edition) return;

  const existingByUser = new Map(existingPlaylists.map((p) => [p.userId, p.spotifyPlaylistId]));
  const weekLabel = formatWeekLabel(edition.weekStart);

  for (const user of users) {
    try {
      const { rows } = await getWeeklyJamForEdition(user.id, editionId, edition.publishedAt);
      const trackUris = Array.from(
        new Set(rows.map((r) => r.spotifyUri).filter((uri): uri is string => Boolean(uri))),
      );
      if (trackUris.length === 0) continue;

      const result = await upsertWeeklyPlaylist(ownerAccessToken, ownerUserId, {
        existingPlaylistId: existingByUser.get(user.id) ?? null,
        name: `Rogha — ${user.username}'s weekly jam ${weekLabel}`,
        trackUris,
      });
      if (!result) continue;

      await prisma.weeklyPlaylist.upsert({
        where: { editionId_userId: { editionId, userId: user.id } },
        create: {
          editionId,
          userId: user.id,
          spotifyPlaylistId: result.id,
          spotifyPlaylistUrl: result.url,
          trackCount: trackUris.length,
        },
        update: {
          spotifyPlaylistId: result.id,
          spotifyPlaylistUrl: result.url,
          trackCount: trackUris.length,
        },
      });
    } catch (err) {
      console.error("[buildWeeklyPlaylists] user failed, skipping", user.id, err);
    }
  }
}

/**
 * The viewer's Spotify playlist link for this edition, if one's been built —
 * powers the "Listen on Spotify" button on the Jam page.
 */
export async function getWeeklyPlaylistUrl(
  editionId: string,
  userId: string,
): Promise<string | null> {
  const playlist = await prisma.weeklyPlaylist.findUnique({
    where: { editionId_userId: { editionId, userId } },
    select: { spotifyPlaylistUrl: true },
  });
  return playlist?.spotifyPlaylistUrl ?? null;
}

/**
 * Whether the viewer has opened the Jam page for this edition — mirrors
 * EditionView's "hasOpened" tracking (src/app/api/editions/[id]/open/route.ts)
 * but scoped to the Jam specifically, so it can participate in the edition's
 * "Keep reading" / "Already read" up-next list.
 */
export async function hasViewedWeeklyJam(userId: string, editionId: string): Promise<boolean> {
  const view = await prisma.weeklyJamView.findUnique({
    where: { editionId_userId: { editionId, userId } },
    select: { editionId: true },
  });
  return Boolean(view);
}

/**
 * Marks the Jam as opened for this viewer/edition. Called from the Jam page
 * itself on render (server-side), same "visiting counts as reading" model
 * PostRead/EditionView use elsewhere.
 */
export async function markWeeklyJamViewed(userId: string, editionId: string): Promise<void> {
  await prisma.weeklyJamView.upsert({
    where: { editionId_userId: { editionId, userId } },
    create: { editionId, userId },
    update: {},
  });
}

/**
 * Cheap count of how many of the given (accepted-friend) ids have opted
 * into Jam — powers the static "N friends have connected their Jam" teaser
 * in Coming Sunday. No Last.fm/Spotify calls; that data doesn't exist yet
 * pre-publish. Takes friend ids directly so callers that already fetched
 * them (e.g. getComingNext) don't re-query.
 */
export async function getJamConnectedFriendCount(friendIds: string[]): Promise<number> {
  if (friendIds.length === 0) return 0;
  return prisma.user.count({
    where: {
      id: { in: friendIds },
      jamEnabled: true,
      lastfmUsername: { not: null },
    },
  });
}

/**
 * Identities (not just a count) of the given (accepted-friend) ids who've
 * opted into Jam — powers the "who's already connected" list in the Coming
 * Sunday teaser's explainer popup, mirrors getJamConnectedFriendCount above.
 */
export async function getJamConnectedFriends(
  friendIds: string[],
): Promise<{ userId: string; username: string; image: string | null }[]> {
  if (friendIds.length === 0) return [];
  const users = await prisma.user.findMany({
    where: {
      id: { in: friendIds },
      jamEnabled: true,
      lastfmUsername: { not: null },
    },
    select: { id: true, username: true, image: true },
  });
  return users.map((u) => ({ userId: u.id, username: u.username, image: u.image }));
}
