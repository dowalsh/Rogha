"use client";

import { Button } from "@/components/ui/button";
import { Gift } from "lucide-react";
import type { RepublishAcceptPrompt } from "@/hooks/useRepublishAcceptNudge";

// Single source of truth for the friend-accept nudge's copy/markup — used by
// both PendingRequestsCard and FriendsCarousel via useRepublishAcceptNudge.
export function RepublishAcceptNudge({
  prompt,
  onShare,
  onDismiss,
}: {
  prompt: RepublishAcceptPrompt | null;
  onShare: () => void;
  onDismiss: () => void;
}) {
  if (!prompt) return null;

  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-blue-500/40 bg-blue-50 dark:bg-blue-950/20 px-3 py-2 text-sm">
      <span className="flex items-center gap-2 text-blue-900 dark:text-blue-200">
        <Gift className="h-4 w-4 shrink-0" />
        Share one of your old posts with {prompt.username} to kickstart your
        rogha friendship?
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <Button
          size="sm"
          className="h-7 px-3 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={onShare}
        >
          Share
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 px-2 text-blue-700 dark:text-blue-400"
          onClick={onDismiss}
        >
          Not now
        </Button>
      </div>
    </div>
  );
}
