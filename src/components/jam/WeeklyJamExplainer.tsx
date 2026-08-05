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

// Single source of truth for the Weekly Jam explainer copy, shared by both
// entry points (the Jam card's "Connect your Music" button and the info
// button in Settings) — see docs/specs/2026-08-04-weekly-jam-mvp.md
// "Connect flow & explainer".
export function WeeklyJamExplainer({ trigger }: { trigger: React.ReactNode }) {
  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Weekly Jam</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm text-muted-foreground">
          <p>
            We wanted to make an easy way for rogha users to share what's important to them with their friends.
            For a lot of people - thats music.
          </p>
          <p>
            introducing the Weekly Jam. Every week - see a top track from each of your friends.
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
            then - Weekly Jam will auto-sync every week to show your top track!
          </p>
        </div>

        <DialogFooter>
          <Button asChild>
            <Link href="/settings">Connect your Music</Link>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
