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

// Routes that already render their own dedicated back affordance (e.g. the
// reader page's `from`-param "return to known parent" button, or admin
// post detail's "Back to admin" link) — the generic chevron would be
// redundant, or in the reader's case, visually collide with its own sticky
// back row.
const ROUTES_WITH_OWN_BACK_UI = ["/reader", "/admin/posts", "/terms", "/privacy"];

function Navbar() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const hasOwnBackUi = ROUTES_WITH_OWN_BACK_UI.some((p) => pathname.startsWith(p));
  const showBackButton = canGoBack && !TOP_LEVEL_ROUTES.has(pathname) && !hasOwnBackUi;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      checkIsAdmin().then(setIsAdmin).catch(() => setIsAdmin(false));
    } else {
      setIsAdmin(false);
    }
  }, [isLoaded, isSignedIn]);

  return (
    <nav className="sticky top-0 w-full border-b bg-background z-50 pt-safe">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Rogha Logo"
                width={120}
                height={60}
                className="object-contain"
                priority
              />
            </Link>
          </div>

          {/* Pass down user state only */}
          <DesktopNavbar
            isLoaded={isLoaded}
            isSignedIn={!!isSignedIn}
            user={user}
            isAdmin={isAdmin}
          />
          <MobileNavbar
            isLoaded={isLoaded}
            isSignedIn={!!isSignedIn}
            user={user}
            isAdmin={isAdmin}
          />
        </div>

        {showBackButton && (
          <div className="flex md:hidden items-center h-10 -mt-1">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back">
              <ChevronLeft className="h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}
export default Navbar;
