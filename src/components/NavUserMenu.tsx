"use client";

import { useState } from "react";
import Link from "next/link";
import useSWR from "swr";
import { useClerk } from "@clerk/nextjs";
import { LogOutIcon, UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function initialsFor(username: string | null | undefined) {
  return (username || "?").slice(0, 2).toUpperCase();
}

// Replaces Clerk's <UserButton /> — Clerk is auth-only in this app, so its
// own avatar-upload UI never shows up alongside our real one (see the
// signoff-emoji/profile-tabs plan for why). Just a link to your own profile
// and sign out.
export function NavUserMenu() {
  const { signOut } = useClerk();
  const [open, setOpen] = useState(false);
  const { data: me } = useSWR<{ username: string; image: string | null }>("/api/me");

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="flex items-center justify-center rounded-full outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar className="h-8 w-8">
            <AvatarImage src={me?.image ?? undefined} alt={me?.username ?? ""} />
            <AvatarFallback>
              {me?.username ? initialsFor(me.username) : <UserIcon className="h-4 w-4" />}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-1" align="end">
        <Link
          href={me?.username ? `/profile/${me.username}` : "/profile"}
          onClick={() => setOpen(false)}
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
        >
          <UserIcon className="h-4 w-4" />
          My Profile
        </Link>
        <button
          className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
          onClick={() => {
            setOpen(false);
            signOut();
          }}
        >
          <LogOutIcon className="h-4 w-4" />
          Sign out
        </button>
      </PopoverContent>
    </Popover>
  );
}
