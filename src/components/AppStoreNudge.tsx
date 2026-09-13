"use client";

import { useEffect, useState } from "react";
import Nudge from "@/components/Nudge";
import { APP_STORE_URL } from "@/lib/appStore";
import { useSuppressNudges } from "@/hooks/useSuppressNudges";
import { useIsMobileDevice } from "@/hooks/useIsMobileDevice";

// Mobile-device-only "we're on the App Store" banner — gated on an actual
// device check (useIsMobileDevice), not viewport width, so a resized
// desktop browser window doesn't trigger it. Never shows inside the native
// app's own webview (Capacitor.isNativePlatform()) — that's covered
// separately by the native Smart App Banner in layout.tsx metadata. Also
// never shows on the /sign-in page opened by the native app in an in-app
// browser (SFSafariViewController has no Capacitor bridge, so isNative is
// false there) — matches the flag set in sign-in/[[...sign-in]]/page.tsx.
const DISMISS_KEY = "rogha:nudge:app-store-2026-08";
const SESSION_STORAGE_FROM_APP = "rogha_sign_in_from_app";

export default function AppStoreNudge() {
  const [dismissed, setDismissed] = useState(true);
  const suppressed = useSuppressNudges();
  const isMobileDevice = useIsMobileDevice();

  useEffect(() => {
    const fromApp = sessionStorage.getItem(SESSION_STORAGE_FROM_APP) === "1";
    setDismissed(fromApp || localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (suppressed || dismissed || !isMobileDevice) return null;

  return (
    <Nudge
      message="Rogha is on the App Store!"
      ctaLabel="Get the app"
      href={APP_STORE_URL}
      onDismiss={() => {
        localStorage.setItem(DISMISS_KEY, "1");
        setDismissed(true);
      }}
    />
  );
}
