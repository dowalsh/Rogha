"use client";
import { SignIn } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function SignInInner() {
  const params = useSearchParams();
  const fromApp = params.get("fromApp") === "1";
  const returnUrl = fromApp ? "/auth/return-to-app?fromApp=1" : undefined;
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
