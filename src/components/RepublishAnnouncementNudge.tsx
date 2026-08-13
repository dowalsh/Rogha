"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import Nudge from "@/components/Nudge";

type Me = { username: string };

// One-time "republish is live" announcement — pure awareness, not a call to
// action (see docs/specs/2026-08-13-republish.md). Mirrors UsernameNudge's
// localStorage-only dismissal exactly (same known stopgap, ahead of the
// not-yet-built nudges framework in docs/specs/2026-07-28-nudges-framework.md).
const DISMISS_KEY = "rogha:nudge:republish-launch-2026-08";

export default function RepublishAnnouncementNudge() {
  const { isSignedIn } = useUser();
  const { data } = useSWR<Me>(isSignedIn ? "/api/me" : null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!data || dismissed) return null;

  return (
    <Nudge
      message="You can now give an old post to a new friend — see Republish on any of your posts."
      ctaLabel="View your posts"
      href="/posts"
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setDismissed(true);
      }}
    />
  );
}
