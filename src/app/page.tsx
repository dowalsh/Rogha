// src/app/page.tsx
"use client";

import { BuzzSection } from "@/components/buzz/BuzzSection";
import { useAuth } from "@clerk/nextjs";
import { About } from "@/components/about";

export default function Home() {
  const { isLoaded, isSignedIn } = useAuth();

  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex flex-col gap-6">
        {!isLoaded ? null : isSignedIn ? <BuzzSection /> : <About />}
      </div>
    </div>
  );
}
