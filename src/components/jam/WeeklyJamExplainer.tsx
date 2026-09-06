"use client";

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

export type ConnectedFriend = {
  userId: string;
  username: string;
  image: string | null;
};

// Single source of truth for the Weekly Jam explainer copy, shared by both
// entry points (the Jam card's "Connect your Music" button and the info
// button in Settings) — see docs/specs/2026-08-04-weekly-jam-mvp.md
// "Connect flow & explainer".
export function WeeklyJamExplainer({
  trigger,
  connectedFriends,
}: {
  trigger: React.ReactNode;
  // Friends who've already connected, shown as social proof. Only the
  // Jam card's CTA (WeeklyJamRows) knows this — omitted elsewhere (e.g.
  // WeeklyJamInfoDot in Settings), so the section just doesn't render.
  connectedFriends?: ConnectedFriend[];
}) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>The Weekly Jam</DialogTitle>
        </DialogHeader>

        {connectedFriends && connectedFriends.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Already connected
            </p>
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

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            Music is fun. Sharing music with friends is fun. Now you can do it
            on Rogha.
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
            Spotify makes this difficult, so we&apos;re using a connector called{" "}
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
            Warning - you may have to do some email verification (Boo, i know) -
            but once you&apos;re done - The Weekly Jam will auto-sync every
            week!!!
          </p>
        </div>

        <DialogFooter>
          <Button asChild>
            <Link href="/settings">Connect Music</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
