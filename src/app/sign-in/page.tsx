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

  useEffect(() => {
    // In the native WebView (not inside SFSafariViewController), open the real sign-in
    // in an in-app browser so OAuth runs in the correct session context.
    if (isNative && !fromApp && !browserOpenedRef.current) {
      browserOpenedRef.current = true;
      Browser.open({
        url: `https://rogha.dylanwalsh.ie/sign-in?fromApp=1&redirect=${encodeURIComponent(redirect)}`,
        presentationStyle: "popover",
      });
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
