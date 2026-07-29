"use client";

import { useState } from "react";
import { MoreHorizontal } from "lucide-react";
import toast from "react-hot-toast";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

type Props = {
  userId: string;
  username: string;
  showBlock?: boolean; // hide for strangers who already have a relationship button covering it? default true
};

type Dialog = "report" | "block" | null;

// Report-user / block-user menu for any profile that isn't your own — the
// safety valve the spec requires on every profile, since avatars bypass the
// text-only content filter.
export function ProfileOverflowMenu({ userId, username, showBlock = true }: Props) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [loading, setLoading] = useState(false);

  function openDialog(d: Dialog) {
    setMenuOpen(false);
    setDialog(d);
  }

  async function handleReport(alsoBlock: boolean) {
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType: "USER", contentId: userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      if (alsoBlock) {
        const blockRes = await fetch("/api/blocks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ blockedId: userId }),
        });
        if (!blockRes.ok) throw new Error(`HTTP ${blockRes.status}`);
        toast.success(`Reported. ${username} has been blocked.`);
        router.push("/circles");
      } else {
        setDialog(null);
        toast.success("Thanks — we've received your report.");
      }
    } catch {
      toast.error("Failed to submit. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmBlock() {
    setLoading(true);
    try {
      const res = await fetch("/api/blocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blockedId: userId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success(`${username} has been blocked.`);
      router.push("/circles");
    } catch {
      toast.error("Failed to block this user. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-foreground"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-40 p-1" align="end">
          <button
            className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            onClick={() => openDialog("report")}
          >
            Report
          </button>
          {showBlock && (
            <button
              className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
              onClick={() => openDialog("block")}
            >
              Block {username}
            </button>
          )}
        </PopoverContent>
      </Popover>

      <AlertDialog open={dialog === "report"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Report {username}?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll review it and take action if it violates our guidelines.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col sm:flex-col gap-2">
            <AlertDialogAction
              onClick={() => handleReport(true)}
              disabled={loading}
              className="w-full"
            >
              {loading ? "Submitting…" : `Report and block ${username}`}
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() => handleReport(false)}
              disabled={loading}
              className="w-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            >
              {loading ? "Submitting…" : "Report only"}
            </AlertDialogAction>
            <AlertDialogCancel disabled={loading} className="w-full mt-0">
              Cancel
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={dialog === "block"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {username}?</AlertDialogTitle>
            <AlertDialogDescription>
              They won't be able to see your profile or send you a friend
              request, and you won't see theirs. They won't be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBlock} disabled={loading}>
              {loading ? "Blocking…" : "Block"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
