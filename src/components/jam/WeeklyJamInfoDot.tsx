"use client";

import { WeeklyJamExplainer } from "@/components/jam/WeeklyJamExplainer";
import { NewBadge } from "@/components/ui/new-badge";

// Always-visible "what is this?" affordance for The Weekly Jam — unlike the
// connect CTA (which reflects connection state), this is shown everywhere
// The Weekly Jam appears, regardless of whether the viewer has connected
// yet. Deliberately styled as the bright-green "New" signal (not a muted
// info icon) — the whole point is to make people want to click it.
export function WeeklyJamInfoDot({ className }: { className?: string }) {
  return (
    <WeeklyJamExplainer
      trigger={<NewBadge aria-label="What is The Weekly Jam?" className={className} />}
    />
  );
}
