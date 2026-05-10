"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ReturnToAppInner() {
  const params = useSearchParams();
  const fromApp = params.get("fromApp") === "1";
  const redirect = params.get("redirect") ?? "/";

  useEffect(() => {
    console.log("[Rogha debug] /auth/return-to-app loaded — fromApp:", fromApp, "redirect:", redirect);

    if (fromApp) {
      console.log("[Rogha debug] return-to-app: fetching mobile ticket");
      fetch("/api/auth/mobile-ticket")
        .then((r) => {
          console.log("[Rogha debug] return-to-app: mobile-ticket response status:", r.status);
          return r.json();
        })
        .then(({ token, error }) => {
          if (error) {
            console.error("[Rogha debug] return-to-app: mobile-ticket error:", error);
            window.location.href = `rogha://auth?redirect=${encodeURIComponent(redirect)}`;
            return;
          }
          console.log("[Rogha debug] return-to-app: got ticket, redirecting to rogha://auth");
          window.location.href = `rogha://auth?ticket=${token}&redirect=${encodeURIComponent(redirect)}`;
        })
        .catch((err) => {
          console.error("[Rogha debug] return-to-app: mobile-ticket fetch failed:", err);
          window.location.href = `rogha://auth?redirect=${encodeURIComponent(redirect)}`;
        });
    } else {
      console.log("[Rogha debug] return-to-app: non-app flow, redirecting to rogha://auth");
      window.location.href = "rogha://auth";
    }
  }, [fromApp]);

  return (
    <div>
      Opening Rogha...
      <a href="rogha://auth">Tap here if the app doesn't open!</a>
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
