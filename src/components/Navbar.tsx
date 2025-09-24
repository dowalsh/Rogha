"use client";
import Link from "next/link";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";
import { useUser } from "@clerk/nextjs";

function Navbar() {
  const { isSignedIn, user, isLoaded } = useUser();

  return (
    <nav className="sticky top-0 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link
              href="/"
              className="text-xl font-bold text-primary font-mono tracking-wider"
            >
              Rogha
            </Link>
          </div>

          {/* Pass down user state only */}
          <DesktopNavbar
            isLoaded={isLoaded}
            isSignedIn={!!isSignedIn}
            user={user}
          />
          <MobileNavbar
            isLoaded={isLoaded}
            isSignedIn={!!isSignedIn}
            user={user}
          />
        </div>
      </div>
    </nav>
  );
}
export default Navbar;
