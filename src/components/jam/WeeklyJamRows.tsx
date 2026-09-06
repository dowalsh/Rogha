"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, MessageCircle } from "lucide-react";
import type { WeeklyJamRow } from "@/lib/jam-preview";
import { WeeklyJamExplainer, type ConnectedFriend } from "@/components/jam/WeeklyJamExplainer";
import { Button } from "@/components/ui/button";
import CommentsSection from "@/components/CommentsSection";

type WeeklyJamRowsProps = {
  rows: WeeklyJamRow[];
  viewerConnected: boolean;
};

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

function JamRow({
  row,
  expanded,
  onToggleComments,
}: {
  row: WeeklyJamRow;
  expanded: boolean;
  onToggleComments: () => void;
}) {
  return (
    <div className="py-2">
      {/* The whole row toggles the thread — Open in Spotify stops
          propagation so it opens the link instead of also toggling. */}
      <div
        onClick={onToggleComments}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onToggleComments();
          }
        }}
        className="cursor-pointer"
      >
        <div className="flex items-center gap-3">
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
            href={row.spotifyTrackUrl ?? row.spotifySearchUrl}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 text-xs text-blue-600 hover:underline"
          >
            Open in Spotify
          </Link>
        </div>

        <div className="mt-1.5 flex items-center gap-1 text-xs text-muted-foreground">
          <MessageCircle className="h-3.5 w-3.5" />
          {row.commentCount}
        </div>
      </div>

      {/* Lazy-mounted — only fetches/renders once this row's thread has
          been opened, so collapsed rows don't fire comment requests. Each
          row's expanded state is independent (no accordion). */}
      {expanded && (
        <div className="mt-2">
          <CommentsSection target={{ kind: "track", id: row.trackId }} />
        </div>
      )}
    </div>
  );
}

// The body of the Weekly Jam — reused by both the detail page
// (src/app/editions/[id]/jam/page.tsx) and, previously, the inline Edition
// card (now a compact teaser rendered by Frontpage.tsx instead).
export function WeeklyJamRows({ rows, viewerConnected }: WeeklyJamRowsProps) {
  const connectedFriends: ConnectedFriend[] = rows
    .filter((row) => !row.isViewer)
    .map((row) => ({ userId: row.userId, username: row.username, image: row.image }));

  // Independent expand/collapse per row — multiple threads can be open at
  // once, no accordion collapsing.
  const [expandedTrackIds, setExpandedTrackIds] = useState<Set<string>>(new Set());

  function toggleComments(trackId: string) {
    setExpandedTrackIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) {
        next.delete(trackId);
      } else {
        next.add(trackId);
      }
      return next;
    });
  }

  return (
    <div className="space-y-3">
      {rows.length > 0 ? (
        <div className="divide-y">
          {rows.map((row) => (
            <JamRow
              key={row.userId}
              row={row}
              expanded={expandedTrackIds.has(row.trackId)}
              onToggleComments={() => toggleComments(row.trackId)}
            />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          No friends have connected to The Weekly Jam yet!
        </p>
      )}

      <div className="pt-1">
        <ConnectButton viewerConnected={viewerConnected} connectedFriends={connectedFriends} />
      </div>

      {rows.length > 0 && (
        <p className="pt-1 text-[10px] text-muted-foreground">
          Track data powered by{" "}
          <Link href="https://www.last.fm" target="_blank" rel="noreferrer" className="hover:underline">
            AudioScrobbler
          </Link>
        </p>
      )}
    </div>
  );
}
