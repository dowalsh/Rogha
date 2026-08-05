export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getTopTrackLastWeek } from "@/lib/lastfm";
import { resolveSpotifyAlbumImage } from "@/lib/spotify";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "FORBIDDEN" }, { status: error.status });

  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_TEST_USERNAME;
  if (!apiKey || !username) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const result = await getTopTrackLastWeek(username, apiKey);
  if ("error" in result) {
    return NextResponse.json({ error: "LASTFM_ERROR" }, { status: 502 });
  }

  const track = result.track;
  if (track) {
    // Prefer Spotify's cover art — Last.fm's is excluded from its API
    // licence (see the spec's Compliance section). Best-effort: falls back
    // to the Last.fm image already on the track if Spotify has no match or
    // isn't configured.
    const spotifyImageUrl = await resolveSpotifyAlbumImage(track.artist, track.name);
    if (spotifyImageUrl) {
      track.imageUrl = spotifyImageUrl;
      track.imageSource = "spotify";
    }
  }

  return NextResponse.json({ track });
}
