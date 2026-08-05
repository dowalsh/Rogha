"use client";

import Link from "next/link";
import type { WeeklyJamRow } from "@/lib/jam";
import { WeeklyJamExplainer } from "@/components/jam/WeeklyJamExplainer";
import { Button } from "@/components/ui/button";

type WeeklyJamCardProps = {
  rows: WeeklyJamRow[];
  viewerConnected: boolean;
};

function ConnectButton() {
  return (
    <WeeklyJamExplainer
      trigger={
        <Button variant="outline" size="sm">
          Connect your Music
        </Button>
      }
    />
  );
}

function JamRow({ row }: { row: WeeklyJamRow }) {
  return (
    <div className="flex items-center gap-3 py-2">
      {row.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={row.imageUrl}
          alt={`${row.name} album art`}
          className="h-12 w-12 shrink-0 rounded object-cover"
        />
      ) : (
        <div className="h-12 w-12 shrink-0 rounded bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {row.isViewer ? "You" : row.username}
        </p>
        <p className="truncate text-sm text-muted-foreground">
          {row.name} — {row.artist}
        </p>
        <p className="text-xs text-muted-foreground">{row.playCount} plays this week</p>
      </div>
      <Link
        href={row.spotifySearchUrl}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-xs text-blue-600 hover:underline"
      >
        Open in Spotify
      </Link>
    </div>
  );
}

export function WeeklyJamCard({ rows, viewerConnected }: WeeklyJamCardProps) {
  return (
    <section className="border-t pt-6 space-y-3">
      <h2 className="text-lg font-black uppercase tracking-wide">Weekly Jam</h2>

      {rows.length > 0 ? (
        <div className="divide-y">
          {rows.map((row) => (
            <JamRow key={row.userId} row={row} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No friends have connected their Jam yet!
        </p>
      )}

      {!viewerConnected && (
        <div className="pt-1">
          <ConnectButton />
        </div>
      )}

      {rows.length > 0 && (
        <p className="pt-1 text-[10px] text-muted-foreground">
          Track data powered by{" "}
          <Link href="https://www.last.fm" target="_blank" rel="noreferrer" className="hover:underline">
            AudioScrobbler
          </Link>
        </p>
      )}
    </section>
  );
}
