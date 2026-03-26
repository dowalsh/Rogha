"use client";

import { useAuth } from "@clerk/nextjs";
import { usePushNotifications } from "@/hooks/usePushNotifications";

export default function PushNotificationInit() {
  const { isSignedIn } = useAuth();
  usePushNotifications(!!isSignedIn);
  return null;
}
