"use client";
import Link from "next/link";
import DesktopNavbar from "./DesktopNavbar";
import MobileNavbar from "./MobileNavbar";
import { useUser } from "@clerk/nextjs";
import Image from "next/image";
import { useEffect, useState } from "react";
import { checkIsAdmin } from "@/actions/user.action";

function Navbar() {
  const { isSignedIn, user, isLoaded } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);

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
      </div>
    </nav>
  );
}
export default Navbar;
