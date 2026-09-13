"use client";

import { useEffect, useState } from "react";
import Nudge from "@/components/Nudge";
import { APP_STORE_URL } from "@/lib/appStore";
import { useSuppressNudges } from "@/hooks/useSuppressNudges";

// Mobile-web-only "we're on the App Store" banner. Never shows inside the
// native app's own webview, or in the in-app browser it opens for sign-in —
// see useSuppressNudges. The native Smart App Banner is handled separately
// via layout.tsx metadata.
const DISMISS_KEY = "rogha:nudge:app-store-2026-08";

export default function AppStoreNudge() {
  const [dismissed, setDismissed] = useState(true);
  const suppressed = useSuppressNudges();

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (suppressed || dismissed) return null;

  return (
    <div className="md:hidden">
      <Nudge
        message="Rogha is on the App Store!"
        ctaLabel="Get the app"
        href={APP_STORE_URL}
        onDismiss={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
      />
    </div>
  );
}
