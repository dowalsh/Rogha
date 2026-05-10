"use client";

import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function ReturnToAppInner() {
  const params = useSearchParams();
  const fromApp = params.get("fromApp") === "1";

  useEffect(() => {
    console.log("[Rogha debug] /auth/return-to-app loaded, fromApp:", fromApp);

    if (fromApp) {
      fetch("/api/auth/mobile-ticket")
        .then((r) => r.json())
        .then(({ token }) => {
          console.log("[Rogha debug] redirecting to rogha://auth with ticket");
          window.location.href = `rogha://auth?ticket=${token}`;
        })
        .catch((err) => {
          console.error("[Rogha debug] mobile-ticket fetch failed:", err);
          window.location.href = "rogha://auth";
        });
    } else {
      console.log("[Rogha debug] redirecting to rogha://auth");
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
