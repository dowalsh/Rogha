"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { FriendsCarousel } from "@/components/FriendsCarousel";

export default function CirclesPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/circles" />
      </SignedOut>

      <SignedIn>
        <FriendsCarousel />
      </SignedIn>
    </>
  );
}
