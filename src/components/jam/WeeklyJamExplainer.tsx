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
            We wanted to make an easy way for rogha users to share what's important to them with their friends.
            For a lot of people - thats music.
          </p>
          <p>
            introducing The Weekly Jam. Every week - see a top track from each of your friends.
          </p>
          <p>
            to join in - you need to connect your music.
          </p>
          <p>
            Spotify makes grabbing data difficult, so we're using a great third party site called{" "}
            <Link
              href="https://www.last.fm"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline hover:no-underline"
            >
              last.fm
            </Link>
            . To set up - head over to{" "}
            <Link
              href="https://www.last.fm"
              target="_blank"
              rel="noreferrer"
              className="text-foreground underline hover:no-underline"
            >
              last.fm
            </Link>
            , make an account, connect your spotify, enable Scrobbling (aka music tracking)
            and then just add your last.fm username to rogha in settings.
          </p>
          <p>
            then - The Weekly Jam will auto-sync every week to show your top track!
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
