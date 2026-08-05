const LASTFM_BASE_URL = "https://ws.audioscrobbler.com/2.0/";

export type LastfmTrack = {
  name: string;
  artist: string;
  playCount: number;
  imageUrl: string | null;
  imageSource: "spotify" | "lastfm" | null;
  lastfmUrl: string;
  spotifySearchUrl: string;
};

type LastfmErrorResponse = { error: number; message: string };

type LastfmImage = { size: string; "#text": string };

type LastfmRawTrack = {
  name: string;
  playcount: string;
  url: string;
  artist: { name: string };
  image?: LastfmImage[];
};

type LastfmTopTracksResponse = {
  toptracks?: { track?: LastfmRawTrack | LastfmRawTrack[] };
};

function pickImageUrl(images: LastfmImage[] | undefined): string | null {
  if (!images) return null;
  const bySize = new Map(images.map((img) => [img.size, img["#text"]]));
  const url = bySize.get("extralarge") || bySize.get("large");
  return url && url.length > 0 ? url : null;
}

function normalizeTrack(raw: LastfmRawTrack): LastfmTrack {
  const artist = raw.artist.name;
  const lastfmImageUrl = pickImageUrl(raw.image);
  return {
    name: raw.name,
    artist,
    playCount: Number(raw.playcount),
    imageUrl: lastfmImageUrl,
    imageSource: lastfmImageUrl ? "lastfm" : null,
    lastfmUrl: raw.url,
    spotifySearchUrl: `https://open.spotify.com/search/${encodeURIComponent(`${artist} ${raw.name}`)}`,
  };
}

export async function getTopTrackLastWeek(
  username: string,
  apiKey: string,
): Promise<{ track: LastfmTrack | null } | { error: "LASTFM_ERROR" }> {
  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "user.gettoptracks");
  url.searchParams.set("user", username);
  url.searchParams.set("period", "7day");
  url.searchParams.set("limit", "1");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  let body: LastfmTopTracksResponse | LastfmErrorResponse;
  try {
    body = await res.json();
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  if ("error" in body) return { error: "LASTFM_ERROR" };

  const rawTrack = body.toptracks?.track;
  if (!rawTrack) return { track: null };

  const track = Array.isArray(rawTrack) ? rawTrack[0] : rawTrack;
  if (!track) return { track: null };

  return { track: normalizeTrack(track) };
}
