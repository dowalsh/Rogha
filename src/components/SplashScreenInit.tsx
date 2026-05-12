"use client";
import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { SplashScreen } from "@capacitor/splash-screen";

export default function SplashScreenInit() {
  const { isLoaded } = useAuth();

  useEffect(() => {
    if (isLoaded && Capacitor.isNativePlatform()) {
      SplashScreen.hide({ fadeOutDuration: 200 });
    }
  }, [isLoaded]);

  return null;
}
