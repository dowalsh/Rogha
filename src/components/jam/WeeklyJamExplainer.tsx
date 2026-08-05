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
            Every friend who connects shows up in the weekly Edition with
            their top track from the last 7 days — no writing, no picking,
            nothing to do after you connect once.
          </p>
          <p>
            It autosyncs from Last.fm: connect your Spotify (or any player)
            to Last.fm, then link your Last.fm username here. Rogha reads
            your top track each week — it never posts or touches your
            Spotify or Last.fm account.
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
