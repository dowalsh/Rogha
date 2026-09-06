// One-time bootstrap: redirects an admin through Spotify's Authorization
// Code flow to grant the app owner's account playlist-write access. Only
// needed once (or if the refresh token ever needs regenerating) — the
// resulting SPOTIFY_OWNER_REFRESH_TOKEN/SPOTIFY_OWNER_USER_ID get pasted
// into .env by hand from the callback route's output, not stored by this
// route itself.
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_OWNER_REDIRECT_URI;
  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const url = new URL("https://accounts.spotify.com/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "playlist-modify-private");

  return NextResponse.redirect(url.toString());
}
