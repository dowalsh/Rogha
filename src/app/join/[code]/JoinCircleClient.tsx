"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUser, SignUpButton } from "@clerk/nextjs";
import { toast } from "sonner";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { secretCodeFont } from "@/lib/fonts/secretCode";
import { cn } from "@/lib/utils";

type InviteInfo =
  | { status: "not_found" }
  | {
      status: "active" | "expired" | "revoked";
      circleId: string;
      circleName: string;
      inviterUsername: string;
      memberCount: number;
    };

export default function JoinCircleClient({
  code,
  info,
}: {
  code: string;
  info: InviteInfo;
}) {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [joining, setJoining] = useState(false);
  const autoJoinAttempted = useRef(false);

  const returnUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${code}?intent=join`
      : undefined;

  async function join() {
    setJoining(true);
    try {
      const res = await fetch(`/api/invites/${code}/join`, { method: "POST" });
      const data = await res.json();
      if (!res.ok || data.error) {
        toast.error(
          data.error === "removed"
            ? "You've been removed from this circle — ask a member for a new invite."
            : "This invite no longer works — ask your friend for a new one.",
        );
        setJoining(false);
        return;
      }
      if (data.alreadyMember) {
        toast("You're already in this circle.");
      } else {
        toast.success(`Welcome to ${info.status !== "not_found" ? info.circleName : "the circle"}!`);
      }
      router.push(`/friends?welcomeCircle=${data.circleId}`);
    } catch {
      toast.error("Something went wrong — try again.");
      setJoining(false);
    }
  }

  // Completes a join whose deliberate "Join" tap happened before sign-up —
  // the returning, now-authenticated user shouldn't have to tap twice.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    if (searchParams.get("intent") !== "join") return;
    if (autoJoinAttempted.current) return;
    autoJoinAttempted.current = true;
    join();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  if (info.status === "not_found") return null;

  if (info.status !== "active") {
    return (
      <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-4">
        <h1 className="text-xl font-semibold">
          {info.inviterUsername} invited you to {info.circleName}
        </h1>
        <p className="text-muted-foreground">
          Snooze you lose? Looks like this link is old — ask your friend for a new one!
        </p>
      </div>
    );
  }

  const busy = joining || (isLoaded && isSignedIn && searchParams.get("intent") === "join");

  return (
    <div className="mx-auto max-w-sm px-4 py-16 text-center space-y-6">
      <div className="space-y-2">
        <h1 className="text-xl font-semibold">
          {info.inviterUsername} invited you to {info.circleName}
        </h1>
        <p className="text-muted-foreground">
          {info.memberCount} {info.memberCount === 1 ? "person" : "people"} already here.
        </p>
      </div>

      <div className="space-y-1.5">
        <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
          Your invite code
        </p>
        <div className="relative mx-auto max-w-[220px]">
          <Input
            value={code}
            disabled
            readOnly
            className={cn(
              secretCodeFont.className,
              "h-12 rounded-lg border-2 bg-muted text-center text-lg uppercase tracking-[0.3em] text-foreground disabled:cursor-default disabled:opacity-100",
            )}
          />
          <Lock className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        </div>
      </div>

      {busy ? (
        <div className="flex justify-center">
          <Spinner className="h-5 w-5" />
        </div>
      ) : !isLoaded ? null : isSignedIn ? (
        <Button size="lg" onClick={join} className="w-full">
          Join {info.circleName}
        </Button>
      ) : (
        <SignUpButton mode="modal" forceRedirectUrl={returnUrl}>
          <Button size="lg" className="w-full">
            Join {info.circleName}
          </Button>
        </SignUpButton>
      )}
    </div>
  );
}
