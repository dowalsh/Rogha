// Thin Spotify Web API client for resolving album art via the Client
// Credentials flow (app-only auth, no per-user OAuth). Used to source
// licensed cover art instead of Last.fm's, per the "Later, not now" note in
// docs/specs/2026-08-01-lastfm-top-track-admin-spike.md (Last.fm album art
// is excluded from its API licence — see that spec's Compliance section).

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const SEARCH_URL = "https://api.spotify.com/v1/search";

type SpotifyImage = { url: string; width: number | null; height: number | null };

type SpotifySearchResponse = {
  tracks?: {
    items?: Array<{
      album?: { images?: SpotifyImage[] };
    }>;
  };
};

// Module-level cache: fine for a single-admin spike (one warm server
// instance), not a distributed cache. Refetched a little before actual
// expiry to avoid using a token that expires mid-request.
let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.value;
  }

  let res: Response;
  try {
    res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      },
      body: "grant_type=client_credentials",
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let body: { access_token?: string; expires_in?: number };
  try {
    body = await res.json();
  } catch {
    return null;
  }

  if (!body.access_token) return null;

  const expiresInMs = (body.expires_in ?? 3600) * 1000;
  cachedToken = {
    value: body.access_token,
    // Refresh 60s early so a token doesn't expire mid-flight.
    expiresAt: Date.now() + expiresInMs - 60_000,
  };
  return cachedToken.value;
}

function pickImageUrl(images: SpotifyImage[] | undefined): string | null {
  if (!images || images.length === 0) return null;
  // Spotify returns images largest-first; a ~300px "medium" size is plenty
  // for the admin card and cheaper to load than the full 640px cover.
  const medium = images.find((img) => img.width !== null && img.width <= 300 && img.width >= 200);
  return (medium ?? images[0]).url ?? null;
}

/**
 * Best-effort album art lookup for a track. Returns null on any failure
 * (missing credentials, network error, no match) rather than throwing —
 * callers should treat this as an optional enhancement, not a dependency.
 */
export async function resolveSpotifyAlbumImage(
  artist: string,
  track: string,
): Promise<string | null> {
  const token = await getAccessToken();
  if (!token) return null;

  const url = new URL(SEARCH_URL);
  url.searchParams.set("q", `track:${track} artist:${artist}`);
  url.searchParams.set("type", "track");
  url.searchParams.set("limit", "1");

  let res: Response;
  try {
    res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!res.ok) return null;

  let body: SpotifySearchResponse;
  try {
    body = await res.json();
  } catch {
    return null;
  }

  const item = body.tracks?.items?.[0];
  return pickImageUrl(item?.album?.images) ?? null;
}
