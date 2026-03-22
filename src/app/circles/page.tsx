"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { FriendsCarousel } from "@/components/FriendsCarousel";
import { CirclesCarousel } from "@/components/CirclesCarousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CirclesPage() {
  return (
    <>
      <SignedOut>
        <RedirectToSignIn signInFallbackRedirectUrl="/circles" />
      </SignedOut>

      <SignedIn>
        {/* Mobile: tabs */}
        <div className="md:hidden">
          <Tabs defaultValue="friends">
            <TabsList className="w-full">
              <TabsTrigger value="friends" className="flex-1">Friends</TabsTrigger>
              <TabsTrigger value="circles" className="flex-1">Circles</TabsTrigger>
            </TabsList>
            <TabsContent value="friends" className="mt-4">
              <FriendsCarousel />
            </TabsContent>
            <TabsContent value="circles" className="mt-4">
              <CirclesCarousel />
            </TabsContent>
          </Tabs>
        </div>

        {/* Desktop: two-column */}
        <div className="hidden md:grid md:grid-cols-2 md:gap-6">
          <FriendsCarousel />
          <CirclesCarousel />
        </div>
      </SignedIn>
    </>
  );
}
