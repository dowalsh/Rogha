"use client";

import {
  Newspaper,
  HomeIcon,
  NotebookPen,
  BellIcon,
  Blend,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { SignInButton, UserButton } from "@clerk/nextjs";
import type { UserResource } from "@clerk/types";
import { useEffect, useState } from "react";
import { getUnreadCount } from "@/actions/notification.action";

type DesktopNavbarProps = {
  isLoaded: boolean;
  isSignedIn: boolean | undefined;
  user: UserResource | null | undefined;
};

function DesktopNavbar({ isLoaded, isSignedIn, user }: DesktopNavbarProps) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (isSignedIn) {
      getUnreadCount().then(setUnread).catch(console.error);
    }
  }, [isSignedIn]);

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
            <Link href="/circles">
              <Blend className="w-4 h-4" />
              <span className="hidden lg:inline">Circles</span>
            </Link>
          </Button>
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/posts">
              <NotebookPen className="w-4 h-4" />
              <span className="hidden lg:inline">Posts</span>
            </Link>
          </Button>
          {/* Uncomment if you want notifications */}
          <Button variant="ghost" className="flex items-center gap-2" asChild>
            <Link href="/notifications" className="flex items-center gap-2">
              <BellIcon className="w-4 h-4" />
              {unread > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-pink-500 text-white text-xs font-medium">
                  {unread}
                </span>
              )}
              <span className="hidden lg:inline">Notifications</span>
            </Link>
          </Button>
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
