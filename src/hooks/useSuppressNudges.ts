"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";

const SESSION_STORAGE_FROM_APP = "rogha_sign_in_from_app";

// Nudges/banners about the app itself aren't useful when we're already
// inside it — either the native webview, or the in-app browser
// (SFSafariViewController) it opens for sign-in, which has no Capacitor
// bridge and so is otherwise indistinguishable from mobile Safari. The
// ?fromApp=1 flag (set by sign-in/[[...sign-in]]/page.tsx, persisted to
// sessionStorage to survive Clerk's OAuth redirect) is the only signal for
// that second case.
export function useSuppressNudges(): boolean {
  const [suppressed, setSuppressed] = useState(() =>
    Capacitor.isNativePlatform()
  );

  useEffect(() => {
    if (suppressed) return;
    const fromApp =
      new URLSearchParams(window.location.search).get("fromApp") === "1" ||
      sessionStorage.getItem(SESSION_STORAGE_FROM_APP) === "1";
    if (fromApp) setSuppressed(true);
  }, [suppressed]);

  return suppressed;
}
