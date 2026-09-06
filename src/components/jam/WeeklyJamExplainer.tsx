"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { LastfmTrack } from "@/lib/lastfm";

export type ConnectedFriend = {
  userId: string;
  username: string;
  image: string | null;
};

type SneakPeekState =
  | { status: "loading" }
  | { status: "error" }
  | { status: "loaded"; track: LastfmTrack | null };

function SneakPeek() {
  const [state, setState] = useState<SneakPeekState>({ status: "loading" });

  // Fires as soon as the popup mounts (i.e. once the viewer is connected
  // and opens it) — no extra button click needed on top of opening it.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/jam/sneak-peek");
        if (!res.ok) throw new Error(`Sneak peek failed: ${res.status}`);
        const { track } = (await res.json()) as { track: LastfmTrack | null };
        if (!cancelled) setState({ status: "loaded", track });
      } catch (e) {
        console.error(e);
        if (!cancelled) setState({ status: "error" });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">
        Sneak peek - your top song this week to date
      </p>
      {state.status === "loading" && (
        <p className="text-sm text-muted-foreground">Checking your top song…</p>
      )}
      {state.status === "error" && (
        <p className="text-sm text-muted-foreground">
          Couldn&apos;t fetch your top song right now — try again in a bit.
        </p>
      )}
      {state.status === "loaded" &&
        (state.track ? (
          <div className="flex items-center gap-3">
            {state.track.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={state.track.imageUrl}
                alt={`${state.track.name} album art`}
                className="h-12 w-12 shrink-0 rounded object-cover"
              />
            ) : (
              <div className="h-12 w-12 shrink-0 rounded bg-muted" />
            )}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {state.track.name}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {state.track.artist}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No plays tracked yet this week.
          </p>
        ))}
    </div>
  );
}

// Single source of truth for the Weekly Jam explainer copy, shared by both
// entry points (the Jam card's "Connect your Music" button and the info
// button in Settings) — see docs/specs/2026-08-04-weekly-jam-mvp.md
// "Connect flow & explainer".
export function WeeklyJamExplainer({
  trigger,
  connectedFriends,
  viewerJamConnected = false,
}: {
  trigger: React.ReactNode;
  // Friends who've already connected, shown as social proof. Only the
  // Jam card's CTA (WeeklyJamRows) knows this — omitted elsewhere, so the
  // section just doesn't render.
  connectedFriends?: ConnectedFriend[];
  // Whether the viewer themself is connected — swaps the header copy and
  // unlocks the sneak-peek section (there's nothing to peek at otherwise).
  viewerJamConnected?: boolean;
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {viewerJamConnected
              ? "You are already Connected to the weekly jam"
              : "The Weekly Jam"}
          </DialogTitle>
        </DialogHeader>

        {connectedFriends && connectedFriends.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Connected</p>
            <div className="flex flex-wrap gap-2">
              {connectedFriends.map((friend) => (
                <span
                  key={friend.userId}
                  className="inline-flex items-center gap-1.5 rounded-full bg-muted py-1 pl-1 pr-2.5 text-xs"
                >
                  {friend.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={friend.image}
                      alt=""
                      className="h-5 w-5 shrink-0 rounded-full object-cover"
                    />
                  ) : (
                    <span className="h-5 w-5 shrink-0 rounded-full bg-border" />
                  )}
                  {friend.username}
                </span>
              ))}
            </div>
          </div>
        )}

        {viewerJamConnected && <SneakPeek />}

        {!viewerJamConnected && (
          <>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                Music is fun. Sharing music with friends is fun. Now you can do
                it on Rogha.
              </p>
              <p>
                Introducing{" "}
                <strong className="font-bold italic text-foreground">
                  The Weekly Jam
                </strong>
                . Every week - see the top track from each of your friends.
              </p>
              <p>to join in - you need to connect your music.</p>
              <p>
                Spotify makes this difficult, so we&apos;re using a connector
                called{" "}
                <Link
                  href="https://www.last.fm"
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline hover:no-underline"
                >
                  last.fm
                </Link>
                .
              </p>
              <p>To set up -</p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  head over to{" "}
                  <Link
                    href="https://www.last.fm/join"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline hover:no-underline"
                  >
                    last.fm
                  </Link>{" "}
                  and make an account,
                </li>
                <li>
                  connect your{" "}
                  <Link
                    href="https://www.last.fm/about/trackmymusic#spotify"
                    target="_blank"
                    rel="noreferrer"
                    className="text-foreground underline hover:no-underline"
                  >
                    spotify
                  </Link>{" "}
                  to enable Scrobbling (aka music tracking)
                </li>
                <li>then add your last.fm username to rogha in settings.</li>
              </ul>
              <p>
                Warning - you may have to do some email verification (Boo, i
                know) - but once you&apos;re done - The Weekly Jam will
                auto-sync every week!!!
              </p>
            </div>

            <DialogFooter>
              <Button asChild>
                <Link href="/settings">Connect Music</Link>
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
