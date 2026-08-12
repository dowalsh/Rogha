export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getTopTrackLastWeek, type LastfmTrack } from "@/lib/lastfm";
import { resolveSpotifyAlbumImage } from "@/lib/spotify";

export type AdminUserTrackResult = {
  userId: string;
  username: string | null;
  lastfmUsername: string;
  status: "ok" | "no_data" | "error";
  track: LastfmTrack | null;
};

// Read-only admin preview of the Weekly Jam for every opted-in user. Unlike
// captureWeeklyJamTracks (src/lib/jam.ts), this never writes to WeeklyTrack —
// it only reads from Last.fm and returns results for display, so running it
// can't leak an early/partial Jam into any real user's or friend's feed.
export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "FORBIDDEN" }, { status: error.status });

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const users = await prisma.user.findMany({
    where: { jamEnabled: true, lastfmUsername: { not: null } },
    select: { id: true, username: true, lastfmUsername: true },
    orderBy: { username: "asc" },
  });

  const results: AdminUserTrackResult[] = [];

  for (const user of users) {
    const lastfmUsername = user.lastfmUsername!;
    try {
      const result = await getTopTrackLastWeek(lastfmUsername, apiKey);
      if ("error" in result) {
        results.push({ userId: user.id, username: user.username, lastfmUsername, status: "error", track: null });
        continue;
      }
      if (!result.track) {
        results.push({ userId: user.id, username: user.username, lastfmUsername, status: "no_data", track: null });
        continue;
      }

      const track = result.track;
      const spotifyImageUrl = await resolveSpotifyAlbumImage(track.artist, track.name);
      if (spotifyImageUrl) {
        track.imageUrl = spotifyImageUrl;
        track.imageSource = "spotify";
      }

      results.push({ userId: user.id, username: user.username, lastfmUsername, status: "ok", track });
    } catch (err) {
      console.error("[admin/lastfm-all-users] user failed", user.id, err);
      results.push({ userId: user.id, username: user.username, lastfmUsername, status: "error", track: null });
    }
  }

  const totalUsers = await prisma.user.count();

  return NextResponse.json({ results, totalUsers, jamEligibleCount: users.length });
}
