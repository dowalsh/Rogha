"use client";

import { Newspaper, HomeIcon, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import type { UserResource } from "@clerk/types";

type DesktopNavbarProps = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: UserResource | null | undefined;
};

function DesktopNavbar({ isLoaded, isSignedIn, user }: DesktopNavbarProps) {
  return (
    <div className="hidden md:flex items-center space-x-4">
      <Button variant="ghost" className="flex items-center gap-2" asChild>
        <Link href="/">
          <HomeIcon className="w-4 h-4" />
          <span className="hidden lg:inline">Home</span>
        </Link>
      </Button>

      {isLoaded && isSignedIn && user ? (
        <>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/editions">
              <Newspaper className="w-4 h-4" />
              <span className="hidden lg:inline">Editions</span>
            </Link>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/posts">
              <NotebookPen className="w-4 h-4" />
              <span className="hidden lg:inline">Posts</span>
            </Link>
          </Button>
          {/* Uncomment if you want notifications */}
          {/* <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/notifications">
              <BellIcon className="w-4 h-4" />
              <span className="hidden lg:inline">Notifications</span>
            </Link>
          </Button> */}
          <UserButton />
        </>
      ) : (
        <SignInButton mode="modal">
          <Button variant="default">Sign In</Button>
        </SignInButton>
      )}
    </div>
  );
}

export default DesktopNavbar;
