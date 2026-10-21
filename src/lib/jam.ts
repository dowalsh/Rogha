// src/lib/jam.ts
//
// Weekly Jam: per-user, per-edition "top track of the week" (and top artist
// of the week), auto-synced from Last.fm (see
// docs/specs/2026-08-04-weekly-jam-mvp.md). Two halves: capture (run from
// the Sunday cron, writes WeeklyTrack/WeeklyArtist rows) and read (used by
// the Edition page to render the Jam card for a viewer).

import { prisma } from "@/lib/prisma";
import { getTopArtistLastWeek, getTopTrackLastWeek } from "@/lib/lastfm";
import { resolveSpotifyArtistMatch, resolveSpotifyTrackMatch } from "@/lib/spotify";
import { getAcceptedFriendships } from "@/lib/friends";
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
      // grabs the matched track's own Spotify URL so "Open in Spotify" can
      // deep-link straight to the track instead of a search results page —
      // spotifySearchUrl stays as the fallback when no exact match is found.
      const spotifyMatch = await resolveSpotifyTrackMatch(t.artist, t.name);
      const imageUrl = spotifyMatch.imageUrl ?? t.imageUrl;
      const imageSource = spotifyMatch.imageUrl ? "spotify" : t.imageSource;

      const data = {
        name: t.name,
        artist: t.artist,
        playCount: t.playCount,
        imageUrl,
        imageSource,
        spotifySearchUrl: t.spotifySearchUrl,
        spotifyTrackUrl: spotifyMatch.trackUrl,
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

/**
 * Fetches each opted-in user's top artist of the last 7 days and upserts a
 * WeeklyArtist row for this edition. Same best-effort semantics as
 * captureWeeklyJamTracks — a failure for one user never blocks the rest, and
 * this must never throw in a way that blocks the edition publish it runs
 * after. A separate Last.fm call from the top track (user.gettopartists vs.
 * user.gettoptracks), so it's kept as its own capture pass.
 */
export async function captureWeeklyJamArtists(editionId: string): Promise<void> {
  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) return; // not configured — silent no-op

  const participants = await prisma.user.findMany({
    where: { jamEnabled: true, lastfmUsername: { not: null } },
    select: { id: true, lastfmUsername: true },
  });

  for (const user of participants) {
    try {
      const result = await getTopArtistLastWeek(user.lastfmUsername!, apiKey);
      if ("error" in result || !result.artist) continue;

      const a = result.artist;
      // Last.fm's artist images have been blank/placeholder for years —
      // Spotify is the only real source here, same precedence as tracks.
      const spotifyMatch = await resolveSpotifyArtistMatch(a.name);

      const data = {
        name: a.name,
        playCount: a.playCount,
        imageUrl: spotifyMatch.imageUrl,
        imageSource: spotifyMatch.imageUrl ? "spotify" : null,
        spotifyArtistUrl: spotifyMatch.artistUrl,
        lastfmUrl: a.lastfmUrl,
      };

      await prisma.weeklyArtist.upsert({
        where: { editionId_userId: { editionId, userId: user.id } },
        create: { editionId, userId: user.id, ...data },
        update: { ...data, capturedAt: new Date() },
      });
    } catch (err) {
      console.error("[captureWeeklyJamArtists] user failed, skipping", user.id, err);
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

  const [tracks, artists] = await Promise.all([
    prisma.weeklyTrack.findMany({
      where: { editionId, userId: { in: candidateIds } },
      select: {
        id: true,
        userId: true,
        name: true,
        artist: true,
        playCount: true,
        imageUrl: true,
        spotifySearchUrl: true,
        spotifyTrackUrl: true,
        lastfmUrl: true,
        user: { select: { username: true, image: true } },
        _count: { select: { comments: { where: { status: "ACTIVE" } } } },
      },
    }),
    prisma.weeklyArtist.findMany({
      where: { editionId, userId: { in: candidateIds } },
      select: {
        userId: true,
        name: true,
        playCount: true,
        imageUrl: true,
        spotifyArtistUrl: true,
        lastfmUrl: true,
        user: { select: { username: true } },
      },
    }),
  ]);

  const artistByUserId = new Map(artists.map((a) => [a.userId, a]));
  const friendGraph = await buildFriendGraph(candidateIds);
  const inspiredByUserId = await getInspirationByUserId(tracks, editionId, friendGraph);
  const onRepeatByUserId = await getOnRepeatByUserId(tracks, artists, editionId);
  const inSyncByUserId = getInSyncByUserId(tracks, artists, friendGraph);

  const rows: WeeklyJamRow[] = tracks
    .map((t) => {
      const a = artistByUserId.get(t.userId);
      return {
        trackId: t.id,
        userId: t.userId,
        username: t.user.username,
        image: t.user.image,
        name: t.name,
        artist: t.artist,
        playCount: t.playCount,
        imageUrl: t.imageUrl,
        spotifySearchUrl: t.spotifySearchUrl,
        spotifyTrackUrl: t.spotifyTrackUrl,
        lastfmUrl: t.lastfmUrl,
        isViewer: t.userId === viewerId,
        commentCount: t._count.comments,
        topArtist: a
          ? {
              name: a.name,
              playCount: a.playCount,
              imageUrl: a.imageUrl,
              spotifyArtistUrl: a.spotifyArtistUrl,
              lastfmUrl: a.lastfmUrl,
            }
          : null,
        inspiredBy: inspiredByUserId.get(t.userId) ?? null,
        onRepeat: onRepeatByUserId.get(t.userId) ?? { song: false, artist: false },
        inSync: inSyncByUserId.get(t.userId) ?? { song: null, artist: null },
      };
    })
    .sort((a, b) => (a.isViewer === b.isViewer ? 0 : a.isViewer ? -1 : 1));

  return {
    rows,
    viewerConnected: Boolean(viewer?.jamEnabled && viewer?.lastfmUsername),
  };
}

/**
 * Builds a userId -> set-of-accepted-friend-ids graph, scoped to the given
 * row owners (not the full social graph). Shared by getInspirationByUserId
 * and getInSyncByUserId, both of which need "is X friends with Y" checks
 * rather than the viewer's own friend list.
 */
async function buildFriendGraph(rowUserIds: string[]): Promise<Map<string, Set<string>>> {
  if (rowUserIds.length === 0) return new Map();

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ aId: { in: rowUserIds } }, { bId: { in: rowUserIds } }],
    },
    select: { aId: true, bId: true },
  });

  const graph = new Map<string, Set<string>>();
  for (const f of friendships) {
    if (rowUserIds.includes(f.aId)) {
      const set = graph.get(f.aId) ?? new Set<string>();
      set.add(f.bId);
      graph.set(f.aId, set);
    }
    if (rowUserIds.includes(f.bId)) {
      const set = graph.get(f.bId) ?? new Set<string>();
      set.add(f.aId);
      graph.set(f.bId, set);
    }
  }
  return graph;
}

/**
 * For each row owner in `tracks`, checks whether their top track this week
 * matches the top track ONE OF THEIR OWN FRIENDS had in an earlier edition
 * — the "sparkle" callout ("someone is quite the trendsetter"). Visibility
 * is gated by the row owner's friend graph, not the viewer's — the viewer
 * doesn't need to know the inspiring friend, only the row owner does.
 * Matches on name+artist, case-insensitively, ignoring the current edition.
 */
async function getInspirationByUserId(
  tracks: { userId: string; name: string; artist: string }[],
  editionId: string,
  friendGraph: Map<string, Set<string>>,
): Promise<Map<string, { username: string }>> {
  if (tracks.length === 0) return new Map();

  const allFriendIds = Array.from(
    new Set(Array.from(friendGraph.values()).flatMap((s) => Array.from(s))),
  );
  if (allFriendIds.length === 0) return new Map();

  const priorTracks = await prisma.weeklyTrack.findMany({
    where: { userId: { in: allFriendIds }, editionId: { not: editionId } },
    select: { userId: true, name: true, artist: true, user: { select: { username: true } } },
  });

  const result = new Map<string, { username: string }>();
  for (const t of tracks) {
    if (result.has(t.userId)) continue;
    const friendIds = friendGraph.get(t.userId);
    if (!friendIds) continue;
    const match = priorTracks.find(
      (p) =>
        friendIds.has(p.userId) &&
        p.name.toLowerCase() === t.name.toLowerCase() &&
        p.artist.toLowerCase() === t.artist.toLowerCase(),
    );
    if (match) result.set(t.userId, { username: match.user.username });
  }
  return result;
}

/**
 * "On Repeat": whether this week's top song/artist for a row owner also
 * featured as THEIR OWN top song/artist in some earlier edition — a repeat
 * performance, not a friend connection. Song and artist are tracked
 * independently since they're captured separately and can repeat on their
 * own schedules. Matches case-insensitively, ignoring the current edition.
 */
async function getOnRepeatByUserId(
  tracks: { userId: string; name: string; artist: string }[],
  artists: { userId: string; name: string }[],
  editionId: string,
): Promise<Map<string, { song: boolean; artist: boolean }>> {
  const result = new Map<string, { song: boolean; artist: boolean }>();
  if (tracks.length === 0 && artists.length === 0) return result;

  const trackUserIds = tracks.map((t) => t.userId);
  const artistUserIds = artists.map((a) => a.userId);

  const [priorTracks, priorArtists] = await Promise.all([
    trackUserIds.length
      ? prisma.weeklyTrack.findMany({
          where: { userId: { in: trackUserIds }, editionId: { not: editionId } },
          select: { userId: true, name: true, artist: true },
        })
      : [],
    artistUserIds.length
      ? prisma.weeklyArtist.findMany({
          where: { userId: { in: artistUserIds }, editionId: { not: editionId } },
          select: { userId: true, name: true },
        })
      : [],
  ]);

  for (const t of tracks) {
    const matched = priorTracks.some(
      (p) =>
        p.userId === t.userId &&
        p.name.toLowerCase() === t.name.toLowerCase() &&
        p.artist.toLowerCase() === t.artist.toLowerCase(),
    );
    if (matched) {
      const prev = result.get(t.userId) ?? { song: false, artist: false };
      result.set(t.userId, { ...prev, song: true });
    }
  }
  for (const a of artists) {
    const matched = priorArtists.some(
      (p) => p.userId === a.userId && p.name.toLowerCase() === a.name.toLowerCase(),
    );
    if (matched) {
      const prev = result.get(a.userId) ?? { song: false, artist: false };
      result.set(a.userId, { ...prev, artist: true });
    }
  }
  return result;
}

/**
 * "In Sync": whether a row owner's top song/artist THIS edition matches one
 * of their friends' top song/artist in this SAME edition — purely a
 * same-week comparison against already-fetched rows, so no extra query is
 * needed beyond the shared friend graph. Matches case-insensitively.
 */
function getInSyncByUserId(
  tracks: { userId: string; name: string; artist: string; user: { username: string } }[],
  artists: { userId: string; name: string; user: { username: string } }[],
  friendGraph: Map<string, Set<string>>,
): Map<string, { song: { username: string } | null; artist: { username: string } | null }> {
  const result = new Map<
    string,
    { song: { username: string } | null; artist: { username: string } | null }
  >();

  for (const t of tracks) {
    const friendIds = friendGraph.get(t.userId);
    if (!friendIds) continue;
    const match = tracks.find(
      (o) =>
        o.userId !== t.userId &&
        friendIds.has(o.userId) &&
        o.name.toLowerCase() === t.name.toLowerCase() &&
        o.artist.toLowerCase() === t.artist.toLowerCase(),
    );
    if (match) {
      const prev = result.get(t.userId) ?? { song: null, artist: null };
      result.set(t.userId, { ...prev, song: { username: match.user.username } });
    }
  }

  for (const a of artists) {
    const friendIds = friendGraph.get(a.userId);
    if (!friendIds) continue;
    const match = artists.find(
      (o) =>
        o.userId !== a.userId &&
        friendIds.has(o.userId) &&
        o.name.toLowerCase() === a.name.toLowerCase(),
    );
    if (match) {
      const prev = result.get(a.userId) ?? { song: null, artist: null };
      result.set(a.userId, { ...prev, artist: { username: match.user.username } });
    }
  }

  return result;
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
