// src/app/page.tsx
"use client";

import { BuzzSection } from "@/components/buzz/BuzzSection";
import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { About } from "@/components/about";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex flex-col gap-6">
        {/* <h1 className="text-3xl font-serif text-center">Welcome back!</h1> */}
        {/* 
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            variant="default"
            className="flex items-center gap-2 w-full sm:w-auto"
            asChild
          >
            <Link href="/circles">
              <Blend className="w-4 h-4" />
              <span>Circles</span>
            </Link>
          </Button>

          <Button
            variant="default"
            className="flex items-center gap-2 w-full sm:w-auto"
            asChild
          >
            <Link href="/editions">
              <Newspaper className="w-4 h-4" />
              <span>Editions</span>
            </Link>
          </Button>

          <Button
            variant="default"
            className="flex items-center gap-2 w-full sm:w-auto"
            asChild
          >
            <Link href="/posts">
              <NotebookPen className="w-4 h-4" />
              <span>Posts</span>
            </Link>
          </Button>
        </div> */}

        <SignedOut>
          <About />
        </SignedOut>

        <SignedIn>
          {/* <BuzzSection /> */}
          <div className="text-center py-8">
            <p className="text-gray-600">
              Buzz section temporarily offline for maintenance. We'll be back
              soon!
            </p>
          </div>
        </SignedIn>
      </div>
    </div>
  );
}
