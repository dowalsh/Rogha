"use client";

import { useEffect, useState } from "react";
import { Link2, Link2Off } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import toast from "react-hot-toast";

interface ShareLinkControlsProps {
  postId: string;
}

export function ShareLinkControls({ postId }: ShareLinkControlsProps) {
  const [shareActive, setShareActive] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  useEffect(() => {
    fetch(`/api/posts/${postId}/share-link`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.active) {
          setShareActive(true);
          setShareUrl(data.url);
        }
      })
      .catch(() => {});
  }, [postId]);

  async function handleConfirmCreate() {
    try {
      setShareLoading(true);
      const res = await fetch(`/api/posts/${postId}/share-link`, {
        method: "POST",
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setShareActive(true);
      setShareUrl(data.url);
      await navigator.clipboard.writeText(data.url);
      toast.success("Public link copied.");
    } catch {
      toast.error("Failed to create link.");
    } finally {
      setShareLoading(false);
      setShowCreateConfirm(false);
    }
  }

  async function handleCopyLink() {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied.");
    } catch {
      toast.error("Failed to copy.");
    }
  }

  async function handleDisableLink() {
    try {
      setShareLoading(true);
      const res = await fetch(`/api/posts/${postId}/share-link`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error();
      setShareActive(false);
      setShareUrl(null);
      toast.success("Public link disabled.");
    } catch {
      toast.error("Failed to disable link.");
    } finally {
      setShareLoading(false);
      setShowDisableConfirm(false);
    }
  }

  return (
    <>
      <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create public link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone with this link will be able to view this post. Comments and
              app interactions will remain locked unless they sign in.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={shareLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCreate}
              disabled={shareLoading}
            >
              {shareLoading ? "Creating…" : "Create and copy link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showDisableConfirm} onOpenChange={setShowDisableConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable public link?</AlertDialogTitle>
            <AlertDialogDescription>
              Anyone with the current link will no longer be able to view this
              post. You can create a new link at any time.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={shareLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDisableLink}
              disabled={shareLoading}
            >
              {shareLoading ? "Disabling…" : "Disable link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="flex items-center gap-2">
        {shareActive ? (
          <>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyLink}
              className="flex items-center gap-2"
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy share link
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowDisableConfirm(true)}
              disabled={shareLoading}
              className="flex items-center gap-2 text-muted-foreground hover:text-destructive"
            >
              <Link2Off className="h-3.5 w-3.5" />
              Disable link
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowCreateConfirm(true)}
            className="flex items-center gap-2"
          >
            <Link2 className="h-3.5 w-3.5" />
            Create public link
          </Button>
        )}
      </div>
    </>
  );
}
