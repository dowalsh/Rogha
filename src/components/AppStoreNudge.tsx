"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import Nudge from "@/components/Nudge";
import { APP_STORE_URL } from "@/lib/appStore";

// Mobile-web-only "we're on the App Store" banner. Never shows inside the
// native app's own webview (Capacitor.isNativePlatform()) — that's covered
// separately by the native Smart App Banner in layout.tsx metadata.
const DISMISS_KEY = "rogha:nudge:app-store-2026-08";

export default function AppStoreNudge() {
  const [dismissed, setDismissed] = useState(true);
  const [isNative] = useState(() => Capacitor.isNativePlatform());

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (isNative || dismissed) return null;

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
