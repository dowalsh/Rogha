"use client";

import { useEffect } from "react";

export default function ReturnToApp() {
  useEffect(() => {
    console.log("[Rogha debug] /auth/return-to-app loaded");
    console.log("[Rogha debug] redirecting to rogha://auth");
    window.location.href = "rogha://auth";
  }, []);

  return (
    <div>
      Opening Rogha...
      <a href="rogha://auth">Tap here if the app doesn't open!</a>
    </div>
  );
}
