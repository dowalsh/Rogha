"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { hasAcceptedTerms } from "@/lib/terms";
import TermsGateScreen from "./TermsGateScreen";

// Routes where the gate overlay must not block — user must be able to read
// terms/privacy before agreeing.
const GATE_EXEMPT_PATHS = ["/terms", "/privacy"];

export default function TermsGate({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, user } = useUser();
  const pathname = usePathname();

  const isExempt = GATE_EXEMPT_PATHS.some((p) => pathname.startsWith(p));

  const showGate =
    isLoaded &&
    isSignedIn &&
    !!user &&
    !isExempt &&
    !hasAcceptedTerms(user.unsafeMetadata);

  return (
    <>
      {children}
      {showGate && <TermsGateScreen />}
    </>
  );
}
