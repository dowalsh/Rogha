"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCircleById } from "@/actions/circle.action";

// The minimal circle-level arrival state from the invite-by-link spec: who's
// here, and the honest "your first edition drops Sunday" framing (a new
// member only sees posts published after they join). Hangs off /friends
// since there's no dedicated circle detail page.
export function WelcomeCircleBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const circleId = searchParams.get("welcomeCircle");
  const [circle, setCircle] = useState<{ name: string; members: { user: any }[] } | null>(null);

  useEffect(() => {
    if (!circleId) return;
    getCircleById(circleId)
      .then((c) => setCircle(c))
      .catch(() => setCircle(null));
  }, [circleId]);

  if (!circleId || !circle) return null;

  const dismiss = () => {
    const params = new URLSearchParams(searchParams);
    params.delete("welcomeCircle");
    router.replace(params.size ? `/friends?${params}` : "/friends");
  };

  return (
    <div className="relative mb-4 rounded-lg border bg-muted/30 p-4 text-center space-y-2">
      <button
        onClick={dismiss}
        className="absolute right-2 top-2 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <h2 className="font-serif text-lg">Welcome to {circle.name}!</h2>
      <p className="text-sm text-muted-foreground">
        {circle.members.length} {circle.members.length === 1 ? "person is" : "people are"} here.
        Your first edition drops Sunday.
      </p>
      <Button size="sm" variant="outline" onClick={dismiss}>
        Got it
      </Button>
    </div>
  );
}
