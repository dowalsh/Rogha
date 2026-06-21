"use client";

import { useState } from "react";
import { useUser, useClerk } from "@clerk/nextjs";
import Link from "next/link";
import { TERMS_VERSION } from "@/lib/terms";
import { Button } from "@/components/ui/button";

export default function TermsGateScreen() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAgree() {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          termsAccepted: {
            version: TERMS_VERSION,
            acceptedAt: new Date().toISOString(),
          },
        },
      });
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-background z-[100] flex flex-col items-center justify-center px-6 text-center pt-safe pb-safe">
      <h1 className="text-2xl font-serif mb-3">Before you continue</h1>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm leading-relaxed">
        To use Rogha you must agree to our Terms of Use and Privacy Policy,
        including our zero-tolerance policy for objectionable content and
        abusive behaviour.
      </p>

      <div className="flex gap-6 mb-8 text-sm">
        <Link href="/terms" className="underline underline-offset-2">
          Terms of Use
        </Link>
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy Policy
        </Link>
      </div>

      {error && (
        <p className="text-sm text-red-500 mb-4">{error}</p>
      )}

      <Button
        onClick={handleAgree}
        disabled={loading}
        className="w-full max-w-xs"
      >
        {loading ? "Saving…" : "Agree & Continue"}
      </Button>

      <button
        onClick={() => signOut()}
        className="mt-4 text-sm text-muted-foreground underline underline-offset-2"
      >
        Sign out
      </button>
    </div>
  );
}
