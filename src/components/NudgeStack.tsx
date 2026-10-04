"use client";

import { useEffect, useState } from "react";
import Nudge from "@/components/Nudge";
import { useSuppressNudges } from "@/hooks/useSuppressNudges";
import { useUsernameNudge } from "@/components/UsernameNudge";
import { useRepublishAnnouncementNudge } from "@/components/RepublishAnnouncementNudge";
import { useAppStoreNudge } from "@/components/AppStoreNudge";

export type NudgeConfig = {
  message: string;
  ctaLabel: string;
  href: string;
  onDismiss: () => void;
};

// Set once a nudge has been shown+dismissed this session, so no other
// eligible nudge takes its place until the next session (new tab/reload
// after the tab was closed). Per-nudge "seen it, ever" dismissal is still
// tracked separately in localStorage by each hook below.
const SESSION_DISMISSED_KEY = "rogha:nudge-stack:dismissed-this-session";

// Only one ad hoc nudge shows at a time. Priority order (highest first) is
// just this array's order — add future nudges here, not as separate mounts
// in layout.tsx. Each hook returns its content when eligible+not yet
// dismissed, or null otherwise; NudgeStack renders the first non-null one.
export default function NudgeStack() {
  const suppressed = useSuppressNudges();
  const [sessionDismissed, setSessionDismissed] = useState(true);

  useEffect(() => {
    setSessionDismissed(sessionStorage.getItem(SESSION_DISMISSED_KEY) === "1");
  }, []);

  const candidates = [
    useUsernameNudge(),
    useRepublishAnnouncementNudge(),
    useAppStoreNudge(),
  ];

  if (suppressed || sessionDismissed) return null;

  const next = candidates.find((candidate) => candidate !== null);
  if (!next) return null;

  return (
    <Nudge
      message={next.message}
      ctaLabel={next.ctaLabel}
      href={next.href}
      onDismiss={() => {
        next.onDismiss();
        sessionStorage.setItem(SESSION_DISMISSED_KEY, "1");
        setSessionDismissed(true);
      }}
    />
  );
}
