"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { usePathname, useRouter } from "next/navigation";
import { hasAcceptedTerms, TERMS_VERSION } from "@/lib/terms";
import { Button } from "@/components/ui/button";
import TermsGateScreen from "./TermsGateScreen";

// Routes where the gate overlay must not block — user must be able to read
// terms/privacy before agreeing.
const GATE_EXEMPT_PATHS = ["/terms", "/privacy"];

function TermsAcceptBar() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleAgree() {
    if (!user) return;
    setLoading(true);
    try {
      await user.update({
        unsafeMetadata: {
          ...user.unsafeMetadata,
          termsAccepted: { version: TERMS_VERSION, acceptedAt: new Date().toISOString() },
        },
      });
      router.back();
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 z-[100] bg-background border-t border-border px-6 py-4 pb-safe flex items-center gap-3">
      <button
        onClick={() => router.back()}
        className="text-sm text-muted-foreground underline underline-offset-2 shrink-0"
      >
        ← Back
      </button>
      <Button onClick={handleAgree} disabled={loading} className="flex-1">
        {loading ? "Saving…" : "Agree & Continue"}
      </Button>
    </div>
  );
}

export default function TermsGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const pathname = usePathname();

  const isExempt = GATE_EXEMPT_PATHS.some((p) => pathname.startsWith(p));
  const needsAcceptance = isLoaded && isSignedIn && !!user && !hasAcceptedTerms(user.unsafeMetadata);

  return (
    <>
      {children}
      {needsAcceptance && (isExempt ? <TermsAcceptBar /> : <TermsGateScreen />)}
    </>
  );
}
