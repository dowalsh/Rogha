"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import Nudge from "@/components/Nudge";
import { APP_STORE_URL } from "@/lib/appStore";

// Mobile-web-only "we're on the App Store" banner. Never shows inside the
// native app's own webview (Capacitor.isNativePlatform()) — that's covered
// separately by the native Smart App Banner in layout.tsx metadata. Also
// never shows on the /sign-in page opened by the native app in an in-app
// browser (SFSafariViewController has no Capacitor bridge, so isNative is
// false there) — matches the ?fromApp=1 flag set in
// sign-in/[[...sign-in]]/page.tsx, checked directly here (not just via
// sessionStorage) since that's set on first load before this effect races it.
const DISMISS_KEY = "rogha:nudge:app-store-2026-08";
const SESSION_STORAGE_FROM_APP = "rogha_sign_in_from_app";

export default function AppStoreNudge() {
  const [dismissed, setDismissed] = useState(true);
  const [isNative] = useState(() => Capacitor.isNativePlatform());

  useEffect(() => {
    const fromApp =
      new URLSearchParams(window.location.search).get("fromApp") === "1" ||
      sessionStorage.getItem(SESSION_STORAGE_FROM_APP) === "1";
    setDismissed(fromApp || localStorage.getItem(DISMISS_KEY) === "1");
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
