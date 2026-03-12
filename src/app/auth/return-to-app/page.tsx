"use client";

import { useEffect } from "react";

export default function ReturnToApp() {
  useEffect(() => {
    window.location.href = "rogha://auth";
  }, []);

  return (
    <div>
      Opening Rogha...
      <a href="rogha://auth">Tap here if the app doesn't open!</a>
    </div>
  );
}
