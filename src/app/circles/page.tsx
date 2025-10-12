"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { FriendsCarousel } from "@/components/FriendsCarousel";
import { CirclesCarousel } from "@/components/CirclesCarousel";

export default function CirclesPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/circles" />
      </SignedOut>

      <SignedIn>
        <FriendsCarousel />
        {/* <CirclesCarousel /> */}
      </SignedIn>
    </>
  );
}
