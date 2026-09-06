"use client";

import { useState } from "react";
import type { WeeklyJamRow } from "@/lib/jam-preview";
import { WeeklyJamRows } from "@/components/jam/WeeklyJamRows";
import { EditionUpNext } from "@/components/reader/EditionUpNext";
import { KeyboardSpaceBuffer } from "@/components/KeyboardSpaceBuffer";

// The jam page itself is a server component (data fetching, notFound()) —
// this holds the one bit of client state the keyboard-space buffer needs:
// whether any row's comment composer is currently open.
export function JamPageBody({
  rows,
  viewerConnected,
  editionId,
  backHref,
}: {
  rows: WeeklyJamRow[];
  viewerConnected: boolean;
  editionId: string;
  backHref: string;
}) {
  const [composerOpen, setComposerOpen] = useState(false);

  return (
    <>
      <WeeklyJamRows
        rows={rows}
        viewerConnected={viewerConnected}
        onComposerOpenChange={setComposerOpen}
      />

      <EditionUpNext
        editionId={editionId}
        currentPostId={`jam:${editionId}`}
        backHref={backHref}
      />

      <KeyboardSpaceBuffer active={composerOpen} />
    </>
  );
}
