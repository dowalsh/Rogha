"use client";

import Link from "next/link";
import { X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

type NudgeProps = {
  message: string;
  ctaLabel: string;
  href: string;
  onDismiss?: () => void;
};

// Generic, reusable informational banner: a centered, rounded card with a
// thin blue border and a single call-to-action link. Callers own the
// data/visibility logic (see UsernameNudge for an example) — this component
// is purely presentational.
export default function Nudge({ message, ctaLabel, href, onDismiss }: NudgeProps) {
  return (
    <div className="w-full flex justify-center px-4 py-3">
      <div className="w-full max-w-md flex items-center gap-3 rounded-xl border border-blue-500/50 bg-blue-50 dark:bg-blue-950/20 px-4 py-3 shadow-sm">
        <Sparkles className="h-4 w-4 shrink-0 text-blue-600 dark:text-blue-500" />
        <span className="text-sm text-blue-900 dark:text-blue-200 flex-1 min-w-0">
          {message}
        </span>
        <Button
          size="sm"
          asChild
          className="shrink-0 bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Link href={href} onClick={onDismiss}>{ctaLabel}</Link>
        </Button>
        {onDismiss && (
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 shrink-0 text-blue-700 hover:text-blue-900 dark:text-blue-400"
            onClick={onDismiss}
            title="Dismiss"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
