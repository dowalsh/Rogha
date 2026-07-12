"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { Spinner } from "@/components/Spinner";
import { APP_SCHEME } from "@/lib/mobile/appScheme";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | void> {
  return Promise.race([
    promise,
    new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ]);
}

function ReturnToAppInner() {
  const params = useSearchParams();
  const { signOut, loaded: isLoaded } = useClerk();
  const fromApp = params.get("fromApp") === "1";
  const redirect = params.get("redirect") ?? "/";

  useEffect(() => {
    console.log("[Rogha debug] /auth/return-to-app loaded — fromApp:", fromApp, "redirect:", redirect);

    if (!fromApp) {
      window.location.href = `${APP_SCHEME}://auth`;
      return;
    }
    if (!isLoaded) return; // signOut isn't safe to call before Clerk finishes initialising

    fetch("/api/auth/mobile-ticket")
      .then((r) => r.json())
      .then(async ({ token, error }) => {
        console.log("[Rogha debug] return-to-app: got ticket, signing out popover session before redirect");
        // The ticket is a standalone token from here on — nuke the popover's Safari-jar
        // session now so the next sign-in always starts from a clean form (this is also
        // how "switch account" works: log out, sign in as someone else, no separate UI
        // needed). Timeout-raced and failure-tolerant: cleanup is best-effort, never
        // load-bearing for getting the user back into the app.
        await withTimeout(signOut().catch(() => {}), 2000);
        console.log(`[Rogha debug] return-to-app: redirecting to ${APP_SCHEME}://auth`);
        window.location.href = error
          ? `${APP_SCHEME}://auth?redirect=${encodeURIComponent(redirect)}`
          : `${APP_SCHEME}://auth?ticket=${token}&redirect=${encodeURIComponent(redirect)}`;
      });
  }, [fromApp, isLoaded]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-muted-foreground">Opening Rogha…</p>
      <a
        href={`${APP_SCHEME}://auth`}
        className="text-xs text-muted-foreground underline underline-offset-4"
      >
        Tap here if the app doesn't open
      </a>
    </div>
  );
}

export default function ReturnToApp() {
  return (
    <Suspense>
      <ReturnToAppInner />
    </Suspense>
  );
}
