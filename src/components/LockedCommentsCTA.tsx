"use client";

import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";

export function LockedCommentsCTA({ postId }: { postId: string }) {
  const returnUrl = typeof window !== "undefined"
    ? `${window.location.origin}/reader/${postId}`
    : undefined;

  return (
    <div className="rounded-lg border bg-muted/30 p-6 text-center space-y-3">
      <div className="flex justify-center">
        <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <p className="font-medium">Comments are available to Rogha members.</p>
      <p className="text-sm text-muted-foreground">
        Sign up or log in to join the conversation.
      </p>
      <div className="flex justify-center gap-3 pt-1">
        <SignUpButton mode="modal" forceRedirectUrl={returnUrl}>
          <Button>Sign up</Button>
        </SignUpButton>
        <SignInButton mode="modal" forceRedirectUrl={returnUrl}>
          <Button variant="outline">Log in</Button>
        </SignInButton>
      </div>
    </div>
  );
}
