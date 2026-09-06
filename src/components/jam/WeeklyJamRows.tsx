"use client";

import Link from "next/link";
import { Check, ListMusic } from "lucide-react";
import { useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import type { WeeklyJamRow } from "@/lib/jam-preview";
import {
  WeeklyJamExplainer,
  type ConnectedFriend,
} from "@/components/jam/WeeklyJamExplainer";
import { Button } from "@/components/ui/button";
import { NewBadge } from "@/components/ui/new-badge";

type WeeklyJamRowsProps = {
  rows: WeeklyJamRow[];
  viewerConnected: boolean;
  playlistUrl: string | null;
};

// Outbound https://open.spotify.com link — not a deep link back into the
// app — so on native this just needs the in-app browser sheet, same pattern
// as DesktopNavbar/MobileNavbar's external links.
function ListenOnSpotifyButton({ playlistUrl }: { playlistUrl: string }) {
  const [isNative] = useState(() => Capacitor.isNativePlatform());

  const content = (
    <>
      <ListMusic className="h-4 w-4" />
      Listen to Spotify Playlist
      <NewBadge className="pointer-events-none ml-1" />
    </>
  );

  if (isNative) {
    return (
      <Button
        variant="default"
        className="w-full"
        onClick={() =>
          Browser.open({ url: playlistUrl, presentationStyle: "popover" })
        }
      >
        {content}
      </Button>
    );
  }
  return (
    <Button variant="default" className="w-full" asChild>
      <Link href={playlistUrl} target="_blank" rel="noreferrer">
        {content}
      </Link>
    </Button>
  );
}

// Always rendered — never hidden — but reflects connection state: an active
// CTA when not connected, a passive status line once connected.
function ConnectButton({
  viewerConnected,
  connectedFriends,
}: {
  viewerConnected: boolean;
  connectedFriends: ConnectedFriend[];
}) {
  if (viewerConnected) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
        <Check className="h-4 w-4" />
        Music connected
      </span>
    );
  }
  return (
    <WeeklyJamExplainer
      connectedFriends={connectedFriends}
      trigger={
        <Button variant="outline" size="sm">
          Connect Music
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
        <p className="text-xs text-muted-foreground">
          {row.playCount} plays this week
        </p>
      </div>
    </div>
  );
}

// The body of the Weekly Jam — reused by both the detail page
// (src/app/editions/[id]/jam/page.tsx) and, previously, the inline Edition
// card (now a compact teaser rendered by Frontpage.tsx instead).
export function WeeklyJamRows({
  rows,
  viewerConnected,
  playlistUrl,
}: WeeklyJamRowsProps) {
  const connectedFriends: ConnectedFriend[] = rows
    .filter((row) => !row.isViewer)
    .map((row) => ({
      userId: row.userId,
      username: row.username,
      image: row.image,
    }));

  return (
    <div className="space-y-3">
      {playlistUrl && <ListenOnSpotifyButton playlistUrl={playlistUrl} />}

      {rows.length > 0 ? (
        <div className="divide-y">
          {rows.map((row) => (
            <JamRow key={row.userId} row={row} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No friends have connected to The Weekly Jam yet!
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2 pt-1">
        <ConnectButton
          viewerConnected={viewerConnected}
          connectedFriends={connectedFriends}
        />
      </div>

      {rows.length > 0 && (
        <p className="pt-1 text-[10px] text-muted-foreground">
          Track data powered by{" "}
          <Link
            href="https://www.last.fm"
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            AudioScrobbler
          </Link>
        </p>
      )}
    </div>
  );
}
