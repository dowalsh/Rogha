"use client";

import { useClerk } from "@clerk/nextjs";
import { useEffect } from "react";

// Loaded inside SFSafariViewController after the in-app signOut() call.
// Signs out from the Safari cookie store too (shared with SFSafariViewController),
// so the next Browser.open sign-in flow doesn't auto-resume the old session.
export default function SignOutNative() {
  const { signOut } = useClerk();

  useEffect(() => {
    signOut().finally(() => {
      // Deep link closes SFSafariViewController via the app's URL handler.
      window.location.href = "rogha://auth/close";
    });
  }, []);

  return null;
}
