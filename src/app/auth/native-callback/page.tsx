"use client";

import { useEffect, Suspense } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

function safeRedirect(value: string | null | undefined): string {
  if (!value) return "/";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/";
}

function NativeCallbackInner() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const ticket = params.get("ticket");
    const redirect = safeRedirect(params.get("redirect"));

    console.log("[Rogha debug] native-callback: ticket present:", !!ticket, "redirect:", redirect);

    if (!ticket) {
      console.warn("[Rogha debug] native-callback: no ticket, redirecting to", redirect);
      router.replace(redirect);
      return;
    }

    console.log("[Rogha debug] native-callback: consuming ticket");
    signIn
      .create({ strategy: "ticket", ticket })
      .then((result) => {
        console.log("[Rogha debug] native-callback: signIn.create status:", result.status);
        if (result.status === "complete") {
          return setActive({ session: result.createdSessionId });
        }
      })
      .then(() => {
        console.log("[Rogha debug] native-callback: sign-in complete, redirecting to", redirect);
        router.replace(redirect);
      })
      .catch((err) => {
        if (err?.errors?.[0]?.code === "session_exists") {
          console.log("[Rogha debug] native-callback: session already exists, navigating to", redirect);
          router.replace(redirect);
          return;
        }
        console.error("[Rogha debug] native-callback: ticket sign-in failed:", JSON.stringify(err));
        router.replace("/sign-in");
      });
  }, [isLoaded]);

  return <div>Signing you in...</div>;
}

export default function NativeCallback() {
  return (
    <Suspense>
      <NativeCallbackInner />
    </Suspense>
  );
}
