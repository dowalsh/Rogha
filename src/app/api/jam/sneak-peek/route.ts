export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getTopArtistLastWeek, getTopTrackLastWeek } from "@/lib/lastfm";
import { resolveSpotifyAlbumImage, resolveSpotifyArtistMatch } from "@/lib/spotify";

// On-demand, un-persisted look at the viewer's own top track/artist so far
// this week (Last.fm's 7day period is already a trailing window, so this is
// naturally "this week to date" rather than a completed week) — unlike
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

  const [trackResult, artistResult] = await Promise.all([
    getTopTrackLastWeek(user.lastfmUsername, apiKey),
    getTopArtistLastWeek(user.lastfmUsername, apiKey),
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
