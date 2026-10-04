"use client";

import { useState } from "react";
import { dismissOnboardingIntro } from "@/actions/onboarding.action";
import { Button } from "@/components/ui/button";

type Props = {
  onDismissed: () => void;
};

// The full-screen value moment: a cold first-mover's first impression of
// Rogha, shown once before they ever see the checklist. Dismissed by an
// explicit choice (not a scroll/click-anywhere reveal like
// EditionRevealOverlay) since this is a decision moment, not a reveal.
// docs/specs/2026-09-19-first-run-onboarding.md.
export function WelcomeIntroOverlay({ onDismissed }: Props) {
  const [fading, setFading] = useState(false);

  const dismiss = () => {
    setFading(true);
    dismissOnboardingIntro().catch(() => {});
    window.setTimeout(onDismissed, 200);
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background px-6 transition-opacity duration-200 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <div className="w-full max-w-md space-y-6 text-center">
        <p className="font-serif text-3xl">Welcome to Rogha</p>
        <p className="text-sm text-muted-foreground">
          A weekly journal for a small, chosen audience — not a feed, not a
          performance. Once a week, everyone's posts come together into one
          edition. No ads, no strangers, no noise.
        </p>

        {/* TODO: real example posts and member testimony — see the spec's
            open question on testimonial sourcing/curation. Placeholder slot
            only, kept visually real so the layout is ready once content
            lands. */}
        <div className="rounded-xl border border-dashed p-6 text-left space-y-2">
          <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
            What people write
          </p>
          <p className="text-sm text-muted-foreground italic">
            TODO — example posts / member testimony go here.
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={dismiss}>Create your first circle</Button>
          <button
            type="button"
            onClick={dismiss}
            className="text-sm text-muted-foreground underline underline-offset-4"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
