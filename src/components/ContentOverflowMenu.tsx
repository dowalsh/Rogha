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

type Props = {
  contentType: "POST" | "COMMENT";
  contentId: string;
  authorId: string;
  authorName: string;
  onReported: () => void;
  onBlocked: () => void;
};

type Dialog = "report" | "block" | null;

export function ContentOverflowMenu({
  contentType,
  contentId,
  authorId,
  authorName,
  onReported,
  onBlocked,
}: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [loading, setLoading] = useState(false);

  function openDialog(d: Dialog) {
    setMenuOpen(false);
    setDialog(d);
  }

  async function handleConfirmReport() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDialog(null);
      onReported();
      toast.success("Thanks — we've received your report.");
    } catch {
      toast.error("Failed to submit report. Please try again.");
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
        body: JSON.stringify({ blockedId: authorId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setDialog(null);
      onBlocked();
      toast.success(`${authorName} has been blocked.`);
    } catch {
      toast.error("Failed to block user. Please try again.");
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
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
            aria-label="More options"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-40 p-1"
          align="end"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); openDialog("report"); }}
          >
            Report
          </button>
          <button
            className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
            onClick={(e) => { e.stopPropagation(); openDialog("block"); }}
          >
            Block {authorName}
          </button>
        </PopoverContent>
      </Popover>

      {/* Report confirm */}
      <AlertDialog open={dialog === "report"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Report this content?</AlertDialogTitle>
            <AlertDialogDescription>
              We'll review it and take action if it violates our guidelines. This
              {contentType === "POST" ? " post" : " comment"} will be hidden from your view immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmReport} disabled={loading}>
              {loading ? "Reporting…" : "Report"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Block confirm */}
      <AlertDialog open={dialog === "block"} onOpenChange={(o) => !o && setDialog(null)}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Block {authorName}?</AlertDialogTitle>
            <AlertDialogDescription>
              Their posts and comments will no longer appear for you. They won't be notified.
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
