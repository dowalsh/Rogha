"use client";

import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

// THROWAWAY: verifies there's no blank/white frame between the native launch
// screen hiding and web content being visible, before any real splash
// animation is built. Loud, contrasting color + a hard (0ms) native
// fade-out so any gap is maximally obvious in a frame-by-frame screen
// recording — remove once the seam is confirmed clean.
//
// This div is part of this component's initial render, which Next.js
// server-renders into the HTML the browser parses immediately (no JS/
// hydration required for it to paint) — so it's already on screen the
// entire time the native splash is up, before the effect below ever runs.
const SEAM_TEST_COLOR = "#ff00ff";
const LINGER_MS = 5000;

export default function SplashSeamTest() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      setVisible(false);
      return;
    }

    let cancelled = false;

    // Double rAF: the second callback only runs after the browser has
    // actually painted the first frame, not just after React has mounted.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (cancelled) return;
        console.log(`[SplashSeamTest] confirmed painted, hiding native splash at ${Date.now()}`);
        SplashScreen.hide({ fadeOutDuration: 0 });

        setTimeout(() => {
          if (!cancelled) setVisible(false);
        }, LINGER_MS);
      });
    });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: SEAM_TEST_COLOR,
        zIndex: 999999,
      }}
    />
  );
}
