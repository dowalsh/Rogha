"use client";

import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";

export function usePushNotifications(isSignedIn: boolean) {
  useEffect(() => {
    if (!isSignedIn || !Capacitor.isNativePlatform()) return;

    async function register() {
      const permission = await PushNotifications.requestPermissions();
      if (permission.receive !== "granted") return;
      await PushNotifications.register();
    }

    const tokenListener = PushNotifications.addListener(
      "registration",
      async ({ value: token }) => {
        try {
          await fetch("/api/push/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token }),
          });
        } catch (err) {
          console.error("[PUSH_REGISTER_ERROR]", err);
        }
      }
    );

    const errorListener = PushNotifications.addListener(
      "registrationError",
      (err) => console.error("[PUSH_REG_ERROR]", err)
    );

    register().catch(console.error);

    return () => {
      tokenListener.then((l) => l.remove());
      errorListener.then((l) => l.remove());
    };
  }, [isSignedIn]);
}
