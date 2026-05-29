"use client";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useClerk } from "@clerk/nextjs";

function safeRedirect(value: string | null | undefined): string {
  if (!value) return "/";
  // Only allow relative internal paths — block open redirects
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

const SESSION_STORAGE_FROM_APP = "rogha_sign_in_from_app";
const SESSION_STORAGE_REDIRECT = "rogha_sign_in_redirect";

function SignInInner() {
  const params = useSearchParams();
  // fromApp and redirect can be lost if Clerk's signOut strips URL params on redirect.
  // sessionStorage is the fallback so they survive the signOut → reload cycle.
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
  const { session, signOut, loaded: isLoaded } = useClerk();
  // For fromApp flows, we must clear any lingering Safari-store session before
  // showing the sign-in form — otherwise Clerk auto-redirects without prompting.
  // Start as false for fromApp so we wait for Clerk to fully load first.
  const [sessionCleared, setSessionCleared] = useState(false);

  console.log("[Rogha debug] sign-in/page: isNative:", isNative, "fromApp:", fromApp, "redirect:", redirect);

  useEffect(() => {
    if (!fromApp) { setSessionCleared(true); return; }
    if (!isLoaded) return; // wait for Clerk to finish initialising before trusting session state
    if (session) {
      console.log("[Rogha debug] sign-in/page: fromApp session found, signing out first");
      // Persist fromApp + redirect in sessionStorage before signOut — Clerk's redirectUrl
      // param can be overridden by its own sign-in URL config, losing our query params.
      sessionStorage.setItem(SESSION_STORAGE_FROM_APP, "1");
      sessionStorage.setItem(SESSION_STORAGE_REDIRECT, redirect);
      signOut({ redirectUrl: window.location.href });
    } else {
      // Session cleared — params are no longer needed in sessionStorage.
      sessionStorage.removeItem(SESSION_STORAGE_FROM_APP);
      sessionStorage.removeItem(SESSION_STORAGE_REDIRECT);
      setSessionCleared(true);
    }
  }, [fromApp, isLoaded, session]);

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

  // Wait until any existing session is cleared before rendering the sign-in form
  if (!sessionCleared) return null;

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
