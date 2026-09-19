"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import type { NudgeConfig } from "@/components/NudgeStack";

type Me = { username: string };

// One-time "republish is live" announcement — pure awareness, not a call to
// action (see docs/specs/2026-08-13-republish.md). Mirrors UsernameNudge's
// localStorage-only dismissal exactly (same known stopgap, ahead of the
// not-yet-built nudges framework in docs/specs/2026-07-28-nudges-framework.md).
const DISMISS_KEY = "rogha:nudge:republish-launch-2026-08";

// Eligibility + content for this nudge; rendering, priority among nudges,
// and cross-session "already shown one" coordination live in NudgeStack.
export function useRepublishAnnouncementNudge(): NudgeConfig | null {
  const { isSignedIn } = useUser();
  const { data } = useSWR<Me>(isSignedIn ? "/api/me" : null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!data || dismissed) return null;

  return {
    message: "You can now share old posts with new friends! Just hit Republish on any of your posts.",
    ctaLabel: "View your posts",
    href: "/posts",
    onDismiss: () => {
      localStorage.setItem(DISMISS_KEY, "1");
      setDismissed(true);
    },
  };
}
