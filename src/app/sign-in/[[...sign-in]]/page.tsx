"use client";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { getAppOrigin } from "@/lib/mobile/appOrigin";

function safeRedirect(value: string | null | undefined): string {
  if (!value) return "/";
  // Only allow relative internal paths — block open redirects
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const SESSION_STORAGE_FROM_APP = "rogha_sign_in_from_app";
const SESSION_STORAGE_REDIRECT = "rogha_sign_in_redirect";

function SignInInner() {
  const params = useSearchParams();
  const fromApp =
    params.get("fromApp") === "1" ||
    sessionStorage.getItem(SESSION_STORAGE_FROM_APP) === "1";
  const redirect = safeRedirect(
    params.get("redirect") ??
    params.get("redirect_url") ??
    sessionStorage.getItem(SESSION_STORAGE_REDIRECT)
  );
  const isNative = Capacitor.isNativePlatform();
  const browserOpenedRef = useRef(false);

  // Persisted so fromApp/redirect survive Clerk's SSO-callback round trip (e.g. Google),
  // which navigates to its own URL and drops our query params.
  useEffect(() => {
    if (fromApp) {
      sessionStorage.setItem(SESSION_STORAGE_FROM_APP, "1");
      sessionStorage.setItem(SESSION_STORAGE_REDIRECT, redirect);
    }
  }, [fromApp, redirect]);

  useEffect(() => {
    // In the native WebView (not inside SFSafariViewController), open the real sign-in
    // in an in-app browser so OAuth runs in the correct session context.
    if (isNative && !fromApp) {
      if (browserOpenedRef.current) {
        console.log("[Rogha debug] sign-in/page: Browser.open already called, skipping");
        return;
      }
      browserOpenedRef.current = true;
      const url = `${getAppOrigin()}/sign-in?fromApp=1&redirect=${encodeURIComponent(redirect)}`;
      console.log("[Rogha debug] sign-in/page: calling Browser.open →", url);
      Browser.open({ url, presentationStyle: "popover" })
        .then(() => console.log("[Rogha debug] sign-in/page: Browser.open resolved"))
        .catch((e) => console.error("[Rogha debug] sign-in/page: Browser.open failed:", e));
    }
  }, []);

  // While Browser.open is opening, render nothing in the WebView
  if (isNative && !fromApp) return null;

  const returnUrl = fromApp
    ? `/auth/return-to-app?fromApp=1&redirect=${encodeURIComponent(redirect)}`
    : redirect;

  return (
    <SignIn
      forceRedirectUrl={returnUrl}
      signUpForceRedirectUrl={returnUrl}
    />
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <Suspense>
        <SignInInner />
      </Suspense>
    </div>
  );
}
