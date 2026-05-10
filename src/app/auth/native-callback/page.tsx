"use client";

import { useEffect, Suspense } from "react";
import { useSignIn } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

function NativeCallbackInner() {
  const { signIn, setActive, isLoaded } = useSignIn();
  const params = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!isLoaded) return;

    const ticket = params.get("ticket");
    if (!ticket) {
      router.replace("/");
      return;
    }

    console.log("[Rogha debug] /auth/native-callback: consuming ticket");
    signIn
      .create({ strategy: "ticket", ticket })
      .then((result) => {
        if (result.status === "complete") {
          return setActive({ session: result.createdSessionId });
        }
      })
      .then(() => {
        console.log("[Rogha debug] native-callback: sign-in complete, redirecting to /");
        router.replace("/");
      })
      .catch((err) => {
        console.error("[Rogha debug] ticket sign-in failed:", err);
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
