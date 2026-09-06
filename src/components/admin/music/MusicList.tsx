"use client";

import { useState } from "react";

type LastfmTrack = {
  name: string;
  artist: string;
  playCount: number;
  imageUrl: string | null;
  imageSource: "spotify" | "lastfm" | null;
  lastfmUrl: string;
  spotifySearchUrl: string;
};

type AdminUserTrackResult = {
  userId: string;
  username: string | null;
  lastfmUsername: string;
  status: "ok" | "no_data" | "error";
  track: LastfmTrack | null;
};

export function MusicList() {
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [track, setTrack] = useState<LastfmTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [allLoading, setAllLoading] = useState(false);
  const [allFetched, setAllFetched] = useState(false);
  const [allError, setAllError] = useState<string | null>(null);
  const [allResults, setAllResults] = useState<AdminUserTrackResult[]>([]);
  const [totalUsers, setTotalUsers] = useState<number | null>(null);
  const [jamEligibleCount, setJamEligibleCount] = useState<number | null>(null);

  async function fetchTopTrack() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/lastfm-top-track");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error === "NOT_CONFIGURED"
            ? "Last.fm isn't configured (missing LASTFM_API_KEY / LASTFM_TEST_USERNAME)."
            : "Failed to fetch from Last.fm. Check the API key, or that the profile isn't private.",
        );
      }
      setTrack(data.track);
      setFetched(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch top track");
    } finally {
      setLoading(false);
    }
  }

  async function fetchAllUsersTopTracks() {
    setAllLoading(true);
    setAllError(null);
    try {
      const res = await fetch("/api/admin/lastfm-all-users");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error === "NOT_CONFIGURED"
            ? "Last.fm isn't configured (missing LASTFM_API_KEY)."
            : "Failed to fetch top tracks for all users.",
        );
      }
      setAllResults(data.results);
      setTotalUsers(data.totalUsers);
      setJamEligibleCount(data.jamEligibleCount);
      setAllFetched(true);
    } catch (e) {
      setAllError(e instanceof Error ? e.message : "Failed to fetch top tracks");
    } finally {
      setAllLoading(false);
    }
  }

  return (
    <div className="space-y-10">
      <div className="space-y-4">
        <button
          onClick={fetchTopTrack}
          disabled={loading}
          className="rounded px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {loading ? "Fetching…" : "Fetch my top track (last 7 days)"}
        </button>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {fetched && !error && !track && (
          <p className="text-sm text-muted-foreground">No listening data in the last 7 days.</p>
        )}

        {track && (
          <div className="flex items-start gap-4 rounded-lg border p-4 max-w-md">
            {track.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={track.imageUrl} alt={`${track.name} album art`} className="h-20 w-20 rounded object-cover" />
            ) : (
              <div className="h-20 w-20 rounded bg-muted" />
            )}
            <div className="space-y-1">
              <p className="font-medium">{track.name}</p>
              <p className="text-sm text-muted-foreground">{track.artist}</p>
              <p className="text-xs text-muted-foreground">{track.playCount} plays this week</p>
              {track.imageSource && (
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground/70">
                  Art: {track.imageSource === "spotify" ? "Spotify" : "Last.fm"}
                </p>
              )}
              <div className="flex gap-3 pt-1 text-xs">
                <a href={track.lastfmUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">
                  Last.fm
                </a>
                <a
                  href={track.spotifySearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open in Spotify
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-4 border-t pt-6">
        <div>
          <h2 className="text-sm font-semibold">All users — Jam preview</h2>
          <p className="text-xs text-muted-foreground mt-1">
            Read-only: fetches each Jam-enabled user&apos;s top track from Last.fm for display here only. Nothing is
            written to the database, so this never populates or leaks into anyone&apos;s actual Weekly Jam — safe to
            run as often as you like.
          </p>
        </div>

        <button
          onClick={fetchAllUsersTopTracks}
          disabled={allLoading}
          className="rounded px-3 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {allLoading ? "Fetching…" : "Fetch top tracks for all users"}
        </button>

        {allError && <p className="text-sm text-red-600">{allError}</p>}

        {allFetched && !allError && (
          <>
            <p className="text-xs text-muted-foreground">
              {jamEligibleCount} of {totalUsers} users are Jam-enabled with a Last.fm username connected.
            </p>
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-left">
                  <tr>
                    <th className="px-3 py-2 font-medium">User</th>
                    <th className="px-3 py-2 font-medium">Last.fm</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Top track</th>
                  </tr>
                </thead>
                <tbody>
                  {allResults.map((r) => (
                    <tr key={r.userId} className="border-t">
                      <td className="px-3 py-2">{r.username ?? r.userId}</td>
                      <td className="px-3 py-2 text-muted-foreground">{r.lastfmUsername}</td>
                      <td className="px-3 py-2">
                        {r.status === "ok" && <span className="text-green-600">ok</span>}
                        {r.status === "no_data" && <span className="text-muted-foreground">no data (7d)</span>}
                        {r.status === "error" && <span className="text-red-600">error</span>}
                      </td>
                      <td className="px-3 py-2">
                        {r.track ? `${r.track.name} — ${r.track.artist} (${r.track.playCount} plays)` : "—"}
                      </td>
                    </tr>
                  ))}
                  {allResults.length === 0 && (
                    <tr>
                      <td className="px-3 py-2 text-muted-foreground" colSpan={4}>
                        No Jam-enabled users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
