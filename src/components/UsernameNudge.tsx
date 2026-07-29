"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import { useUser } from "@clerk/nextjs";
import Nudge from "@/components/Nudge";

type Me = { username: string };

// One-time "profiles & usernames shipped" announcement. Purely informational
// — we don't care whether the user acts on it, just that they've seen it
// once. Dismissal is localStorage-based for now (durable across reloads on
// this device, not tracked server-side) as a stopgap until the general
// nudges framework (docs/specs/2026-07-28-nudges-framework.md) lands.
const DISMISS_KEY = "rogha:nudge:profiles-launch-2026-07";

export default function UsernameNudge() {
  const { isSignedIn } = useUser();
  const { data } = useSWR<Me>(isSignedIn ? "/api/me" : null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!data || dismissed) return null;

  return (
    <Nudge
      message="Rogha now has usernames & profile customization! Head to your profile to customize."
      ctaLabel="Go to profile"
      href={`/profile/${data.username}`}
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setDismissed(true);
      }}
    />
  );
}
