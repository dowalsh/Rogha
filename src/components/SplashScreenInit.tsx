"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export default function SplashScreenInit() {
  const { isLoaded } = useAuth();

  useEffect(() => {
    console.log(`[SplashScreen] mounted at ${Date.now()}`);
  }, []);

  useEffect(() => {
    console.log(`[SplashScreen] isLoaded changed → ${isLoaded} at ${Date.now()}`);
    if (isLoaded && Capacitor.isNativePlatform()) {
      console.log(`[SplashScreen] hiding splash at ${Date.now()}`);
      SplashScreen.hide({ fadeOutDuration: 200 });
    }
  }, [isLoaded]);

  return null;
}
