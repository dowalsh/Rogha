// src/app/editions/page.tsx
"use client";

import { SignedIn, SignedOut, RedirectToSignIn } from "@clerk/nextjs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function EditionsPage() {
  return (
    <>
      {/* If signed out, bounce to sign-in (and back to /editions after) */}
      <SignedOut>
        <RedirectToSignIn redirectUrl="/editions" />
      </SignedOut>

      {/* If signed in, render the page */}
      <SignedIn>
        <div className="space-y-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <CardTitle>Editions</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {/* your content goes here */}
            </CardContent>
          </Card>
        </div>
      </SignedIn>
    </>
  );
}
