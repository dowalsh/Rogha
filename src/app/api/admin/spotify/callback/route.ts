// Second half of the one-time owner-auth bootstrap (see ../connect/route.ts).
// Exchanges the authorization code for tokens, looks up the owner's Spotify
// user id, and renders them for manual copy-paste into .env. Never persists
// anything — this is a throwaway tool, not a feature left running.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json({ error: "MISSING_CODE" }, { status: 400 });
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_OWNER_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  let tokenRes: Response;
  try {
    tokenRes = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
      }).toString(),
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "TOKEN_REQUEST_FAILED" }, { status: 502 });
  }
  if (!tokenRes.ok) {
    return NextResponse.json({ error: "TOKEN_EXCHANGE_FAILED", detail: await tokenRes.text() }, { status: 502 });
  }

  const tokenBody: { access_token?: string; refresh_token?: string } = await tokenRes.json();
  if (!tokenBody.access_token || !tokenBody.refresh_token) {
    return NextResponse.json({ error: "MISSING_TOKENS" }, { status: 502 });
  }

  let meRes: Response;
  try {
    meRes = await fetch("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${tokenBody.access_token}` },
      cache: "no-store",
    });
  } catch {
    return NextResponse.json({ error: "ME_REQUEST_FAILED" }, { status: 502 });
  }
  if (!meRes.ok) {
    return NextResponse.json({ error: "ME_LOOKUP_FAILED" }, { status: 502 });
  }

  const me: { id?: string } = await meRes.json();
  if (!me.id) {
    return NextResponse.json({ error: "MISSING_OWNER_ID" }, { status: 502 });
  }

  return new NextResponse(
    `<pre>Spotify owner auth successful. Paste these into .env (and .env.production):\n\n` +
      `SPOTIFY_OWNER_REFRESH_TOKEN=${tokenBody.refresh_token}\n` +
      `SPOTIFY_OWNER_USER_ID=${me.id}\n</pre>`,
    { headers: { "Content-Type": "text/html" } },
  );
}
