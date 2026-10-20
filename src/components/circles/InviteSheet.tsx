"use client";

import { useEffect, useState } from "react";
import { Lock, Copy } from "lucide-react";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/Spinner";
import { secretCodeFont } from "@/lib/fonts/secretCode";
import { cn } from "@/lib/utils";

type CircleInvite = { code: string; url: string; expiresAt: string };

const PITCH = "Weekly letters between friends — get in here.";

function defaultInviteCodePlaceholder(circleName: string) {
  return circleName
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "CIRCLE";
}

function messageFor(circleName: string, invite: CircleInvite) {
  return `${circleName} on Rogha\n${PITCH}\n${invite.url}\nCODE  ${invite.code}`;
}

async function copy(text: string, successMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(successMessage);
  } catch {
    toast.error("Couldn't copy — try again");
  }
}

export function InviteSheet({
  circleId,
  circleName,
  open,
  onClose,
}: {
  circleId: string;
  circleName: string;
  open: boolean;
  onClose: () => void;
}) {
  const [invite, setInvite] = useState<CircleInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [customCode, setCustomCode] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/circles/${circleId}/invite`)
      .then((r) => r.json())
      .then((data) => setInvite(data.invite ?? null))
      .finally(() => setLoading(false));
  }, [open, circleId]);

  const createInvite = async (replaceExisting: boolean) => {
    if (replaceExisting && !confirm("This retires the current link and code. Continue?")) return;
    setCreating(true);
    try {
      const res = await fetch(`/api/circles/${circleId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customCode: customCode.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create invite");
      setInvite(data.invite);
      setCustomCode("");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create invite");
    } finally {
      setCreating(false);
    }
  };

  const share = async (i: CircleInvite) => {
    const text = messageFor(circleName, i);
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // user cancelled or share unsupported for this payload — fall through
      }
    }
    await copy(text, "Invite copied to clipboard");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl max-h-[85vh] overflow-y-auto"
      >
        {loading ? (
          <div className="flex justify-center py-10">
            <Spinner className="h-5 w-5" />
          </div>
        ) : invite ? (
          <div className="space-y-6 pt-2">
            <SheetHeader>
              <SheetTitle className="font-serif text-xl">Invite link is live</SheetTitle>
            </SheetHeader>

            <div className="flex items-center justify-between rounded-xl border bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground shrink-0">
                  Code
                </span>
                <span className={cn(secretCodeFont.className, "truncate tracking-wider")}>
                  {invite.code}
                </span>
              </div>
              <Lock className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Code is locked" />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3">
              <span className="truncate text-sm text-muted-foreground">{invite.url}</span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Copy link"
                onClick={() => copy(invite.url, "Link copied")}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                Ready to send
              </p>
              <div className="rounded-xl border bg-muted/30 p-4 space-y-1">
                <p className="font-serif text-base">{circleName} on Rogha</p>
                <p className="text-sm text-muted-foreground">{PITCH}</p>
                <p className="text-sm text-muted-foreground break-all">{invite.url}</p>
                <p className={cn(secretCodeFont.className, "text-sm tracking-wider pt-1")}>
                  CODE&nbsp;&nbsp;{invite.code}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button className="flex-1" onClick={() => share(invite)}>
                Share invite
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => copy(messageFor(circleName, invite), "Invite copied")}
              >
                Copy
              </Button>
            </div>

            <div className="flex justify-center pb-safe">
              <Button
                variant="ghost"
                className="text-muted-foreground"
                disabled={creating}
                onClick={() => createInvite(true)}
              >
                {creating ? "Creating…" : "Create new"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 pt-2">
            <SheetHeader>
              <SheetTitle className="font-serif text-xl">Invite to {circleName}</SheetTitle>
            </SheetHeader>
            <p className="text-sm text-muted-foreground">
              Friends can join the circle with a link & a secret code of your choosing.
            </p>
            <Input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder={defaultInviteCodePlaceholder(circleName)}
              className={cn(secretCodeFont.className, "uppercase tracking-wider placeholder:normal-case")}
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
            />
            <Button className="w-full" disabled={creating} onClick={() => createInvite(false)}>
              {creating ? "Creating…" : "Create invite"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
