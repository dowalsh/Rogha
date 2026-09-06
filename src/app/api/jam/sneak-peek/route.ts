export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getTopTrackLastWeek } from "@/lib/lastfm";
import { resolveSpotifyAlbumImage } from "@/lib/spotify";

// On-demand, un-persisted look at the viewer's own top track so far this
// week (Last.fm's 7day period is already a trailing window, so this is
// naturally "this week to date" rather than a completed week) — unlike
// captureWeeklyJamTracks (src/lib/jam.ts), this never writes a WeeklyTrack
// row, it's just for the "sneak peek" button in WeeklyJamExplainer.
export async function GET() {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  if (!user.jamEnabled || !user.lastfmUsername) {
    return NextResponse.json({ error: "NOT_CONNECTED" }, { status: 400 });
  }

  const apiKey = process.env.LASTFM_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const result = await getTopTrackLastWeek(user.lastfmUsername, apiKey);
  if ("error" in result) {
    return NextResponse.json({ error: "LASTFM_ERROR" }, { status: 502 });
  }

  const track = result.track;
  if (track) {
    const spotifyImageUrl = await resolveSpotifyAlbumImage(track.artist, track.name);
    if (spotifyImageUrl) {
      track.imageUrl = spotifyImageUrl;
      track.imageSource = "spotify";
    }
  }

  return NextResponse.json({ track });
}
