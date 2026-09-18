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

export type LastfmArtist = {
  name: string;
  playCount: number;
  lastfmUrl: string;
};

type LastfmRawArtist = {
  name: string;
  playcount: string;
  url: string;
};

type LastfmTopArtistsResponse = {
  topartists?: { artist?: LastfmRawArtist | LastfmRawArtist[] };
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

export async function getTopArtistLastWeek(
  username: string,
  apiKey: string,
): Promise<{ artist: LastfmArtist | null } | { error: "LASTFM_ERROR" }> {
  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "user.gettopartists");
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

  let body: LastfmTopArtistsResponse | LastfmErrorResponse;
  try {
    body = await res.json();
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  if ("error" in body) return { error: "LASTFM_ERROR" };

  const rawArtist = body.topartists?.artist;
  if (!rawArtist) return { artist: null };

  const artist = Array.isArray(rawArtist) ? rawArtist[0] : rawArtist;
  if (!artist) return { artist: null };

  return {
    artist: {
      name: artist.name,
      playCount: Number(artist.playcount),
      lastfmUrl: artist.url,
    },
  };
}

// ── Week-to-date (Monday-anchored) ──────────────────────────────────────
//
// user.gettoptracks/gettopartists only accept fixed enum periods (7day,
// 1month, ...) which are trailing windows from "now" — not calendar-aligned.
// For an as-of-Monday "week to date" preview we need an arbitrary [from, to)
// range, which only user.getWeeklyTrackChart/getWeeklyArtistChart support
// (unix-timestamp from/to params).

type LastfmWeeklyRawTrack = {
  name: string;
  playcount: string;
  url: string;
  artist: { "#text": string };
  image?: LastfmImage[];
};

type LastfmWeeklyTrackChartResponse = {
  weeklytrackchart?: { track?: LastfmWeeklyRawTrack | LastfmWeeklyRawTrack[] };
};

type LastfmWeeklyRawArtist = {
  name: string;
  playcount: string;
  url: string;
};

type LastfmWeeklyArtistChartResponse = {
  weeklyartistchart?: { artist?: LastfmWeeklyRawArtist | LastfmWeeklyRawArtist[] };
};

function normalizeWeeklyTrack(raw: LastfmWeeklyRawTrack): LastfmTrack {
  const artist = raw.artist["#text"];
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

function topByPlayCount<T extends { playcount: string }>(raw: T | T[] | undefined): T | null {
  if (!raw) return null;
  const list = Array.isArray(raw) ? raw : [raw];
  if (list.length === 0) return null;
  return list.reduce((best, cur) => (Number(cur.playcount) > Number(best.playcount) ? cur : best));
}

/**
 * Top track for the given [fromUnix, toUnix) window (seconds), used for the
 * "as of Monday" week-to-date sneak peek rather than a trailing 7-day window.
 */
export async function getTopTrackSince(
  username: string,
  apiKey: string,
  fromUnix: number,
  toUnix: number,
): Promise<{ track: LastfmTrack | null } | { error: "LASTFM_ERROR" }> {
  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "user.getweeklytrackchart");
  url.searchParams.set("user", username);
  url.searchParams.set("from", String(fromUnix));
  url.searchParams.set("to", String(toUnix));
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  let body: LastfmWeeklyTrackChartResponse | LastfmErrorResponse;
  try {
    body = await res.json();
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  if ("error" in body) return { error: "LASTFM_ERROR" };

  const track = topByPlayCount(body.weeklytrackchart?.track);
  return { track: track ? normalizeWeeklyTrack(track) : null };
}

/**
 * Top artist for the given [fromUnix, toUnix) window (seconds) — see
 * getTopTrackSince.
 */
export async function getTopArtistSince(
  username: string,
  apiKey: string,
  fromUnix: number,
  toUnix: number,
): Promise<{ artist: LastfmArtist | null } | { error: "LASTFM_ERROR" }> {
  const url = new URL(LASTFM_BASE_URL);
  url.searchParams.set("method", "user.getweeklyartistchart");
  url.searchParams.set("user", username);
  url.searchParams.set("from", String(fromUnix));
  url.searchParams.set("to", String(toUnix));
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("format", "json");

  let res: Response;
  try {
    res = await fetch(url, { cache: "no-store" });
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  let body: LastfmWeeklyArtistChartResponse | LastfmErrorResponse;
  try {
    body = await res.json();
  } catch {
    return { error: "LASTFM_ERROR" };
  }

  if ("error" in body) return { error: "LASTFM_ERROR" };

  const artist = topByPlayCount(body.weeklyartistchart?.artist);
  return {
    artist: artist
      ? { name: artist.name, playCount: Number(artist.playcount), lastfmUrl: artist.url }
      : null,
  };
}
