"use client";
import Link from "next/link";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { checkIsAdmin } from "@/actions/user.action";
import { Button } from "@/components/ui/button";
import { useCanGoBack } from "@/hooks/useCanGoBack";

const TOP_LEVEL_ROUTES = new Set([
  "/",
  "/editions",
  "/circles",
  "/posts",
  "/about",
  "/profile",
  "/settings",
]);

// TermsGate renders its own "← Back" link as part of a required
// accept/decline flow (paired with "Agree & Continue"), not generic back
// chrome — left alone to avoid disturbing that flow. See
// src/components/TermsGate.tsx.
const ROUTES_WITH_OWN_BACK_UI = ["/terms", "/privacy"];

function Navbar() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const hasOwnBackUi = ROUTES_WITH_OWN_BACK_UI.some((p) =>
    pathname.startsWith(p),
  );
  const showBackButton =
    canGoBack && !TOP_LEVEL_ROUTES.has(pathname) && !hasOwnBackUi;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      checkIsAdmin()
        .then(setIsAdmin)
        .catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [isLoaded, isSignedIn]);

  return (
    <nav className="sticky top-0 w-full border-b bg-background z-50 pt-safe">
      <div className="max-w-7xl mx-auto px-4">
        {/* Desktop row: logo left, nav right */}
        <div className="hidden md:flex items-center justify-between h-16">
          <Link href="/" className="relative block h-12 w-32 shrink-0">
            <Image
              src="/logo.png"
              alt="Rogha Logo"
              fill
              className="object-contain"
              priority
            />
          </Link>

          <DesktopNavbar
            isLoaded={isLoaded}
            isSignedIn={!!isSignedIn}
            user={user}
            isAdmin={isAdmin}
          />
        </div>

        {/* Mobile row: back button (left), logo (centered), hamburger (right) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-16 md:hidden">
          <div className="flex justify-start">
            {showBackButton && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.back()}
                aria-label="Back"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
            )}
          </div>

          <Link
            href="/"
            className="relative block h-9 w-24 shrink-0 justify-self-center"
          >
            <Image
              src="/logo.png"
              alt="Rogha Logo"
              fill
              className="object-contain"
              priority
            />
          </Link>

          <div className="flex justify-end">
            <MobileNavbar
              isLoaded={isLoaded}
              isSignedIn={!!isSignedIn}
              user={user}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
