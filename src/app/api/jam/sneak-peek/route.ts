export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getTopArtistSince, getTopTrackSince } from "@/lib/lastfm";
import { resolveSpotifyAlbumImage, resolveSpotifyArtistMatch } from "@/lib/spotify";
import { getWeekStartUTC } from "@/lib/utils";

// On-demand, un-persisted look at the viewer's own top track/artist so far
// this week — "week to date" since Monday 00:00 (LA time, see
// getWeekStartUTC), not a trailing 7-day window — unlike
// captureWeeklyJamTracks/captureWeeklyJamArtists (src/lib/jam.ts), this never
// writes a WeeklyTrack/WeeklyArtist row, it's just for the "sneak peek"
// button in WeeklyJamExplainer.
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

  const fromUnix = Math.floor(getWeekStartUTC().getTime() / 1000);
  const toUnix = Math.floor(Date.now() / 1000);

  const [trackResult, artistResult] = await Promise.all([
    getTopTrackSince(user.lastfmUsername, apiKey, fromUnix, toUnix),
    getTopArtistSince(user.lastfmUsername, apiKey, fromUnix, toUnix),
  ]);

  if ("error" in trackResult) {
    return NextResponse.json({ error: "LASTFM_ERROR" }, { status: 502 });
  }

  const track = trackResult.track;
  if (track) {
    const spotifyImageUrl = await resolveSpotifyAlbumImage(track.artist, track.name);
    if (spotifyImageUrl) {
      track.imageUrl = spotifyImageUrl;
      track.imageSource = "spotify";
    }
  }

  const artist = "error" in artistResult ? null : artistResult.artist;
  let artistImageUrl: string | null = null;
  let artistSpotifyUrl: string | null = null;
  if (artist) {
    const spotifyMatch = await resolveSpotifyArtistMatch(artist.name);
    artistImageUrl = spotifyMatch.imageUrl;
    artistSpotifyUrl = spotifyMatch.artistUrl;
  }

  return NextResponse.json({
    track,
    artist: artist ? { ...artist, imageUrl: artistImageUrl, spotifyArtistUrl: artistSpotifyUrl } : null,
  });
}
