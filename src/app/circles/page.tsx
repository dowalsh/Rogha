"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { FriendsCarousel } from "@/components/FriendsCarousel";
import { CirclesCarousel } from "@/components/CirclesCarousel";
import { useState } from "react";

export default function CirclesPage() {
  const [version, setVersion] = useState(0);

  // gets called after a member is added/removed/created inside CirclesCarousel
  const handleCirclesChanged = () => setVersion((v) => v + 1);

  return (
    <>
      <SignedOut>
        <RedirectToSignIn redirectUrl="/circles" />
      </SignedOut>

      <SignedIn>
        <FriendsCarousel />
        <CirclesCarousel />
      </SignedIn>
    </>
  );
}
