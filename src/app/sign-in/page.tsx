"use client";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

function safeRedirect(value: string | null | undefined): string {
  if (!value) return "/";
  // Only allow relative internal paths — block open redirects
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function SignInInner() {
  const params = useSearchParams();
  const fromApp = params.get("fromApp") === "1";
  // Clerk middleware uses redirect_url; our own code uses redirect — accept both
  const redirect = safeRedirect(params.get("redirect") ?? params.get("redirect_url"));
  const isNative = Capacitor.isNativePlatform();
  const browserOpenedRef = useRef(false);

  console.log("[Rogha debug] sign-in/page: isNative:", isNative, "fromApp:", fromApp, "redirect:", redirect);

  useEffect(() => {
    // In the native WebView (not inside SFSafariViewController), open the real sign-in
    // in an in-app browser so OAuth runs in the correct session context.
    if (isNative && !fromApp) {
      if (browserOpenedRef.current) {
        console.log("[Rogha debug] sign-in/page: Browser.open already called, skipping");
        return;
      }
      browserOpenedRef.current = true;
      const url = `https://rogha.dylanwalsh.ie/sign-in?fromApp=1&redirect=${encodeURIComponent(redirect)}`;
      console.log("[Rogha debug] sign-in/page: calling Browser.open →", url);
      Browser.open({ url, presentationStyle: "popover" })
        .then(() => console.log("[Rogha debug] sign-in/page: Browser.open resolved"))
        .catch((e) => console.error("[Rogha debug] sign-in/page: Browser.open failed:", e));
    } else {
      console.log("[Rogha debug] sign-in/page: rendering Clerk <SignIn>, fromApp:", fromApp, "isNative:", isNative);
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
