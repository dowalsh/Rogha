"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";
import { Send, Undo, Trash2, ChevronLeft, Link2, Link2Off } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { normalizeImage } from "@/lib/images";
import { AudienceType } from "@/types";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
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
import { Spinner } from "@/components/Spinner";
import toast from "react-hot-toast";

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";

export default function TiptapMvpPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [doc, setDoc] = useState<Content>("");
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [audienceType, setAudienceType] = useState<AudienceType>("FRIENDS");
  const [circleId, setCircleId] = useState<string | null>(null);
  const [myCircles, setMyCircles] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  const [shareActive, setShareActive] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [shareLoading, setShareLoading] = useState(false);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showDisableConfirm, setShowDisableConfirm] = useState(false);

  // LOCK: editor locked in SUBMITTED / PUBLISHED / ARCHIVED (your current rule)
  const editorLocked = useMemo(
    () =>
      status === "SUBMITTED" || status === "PUBLISHED" || status === "ARCHIVED",
    [status],
  );

  // SHOW: submit toggle visible only for DRAFT or SUBMITTED
  const submitButtonShow = useMemo(
    () => status === "DRAFT" || status === "SUBMITTED",
    [status],
  );

  // Load post
  useEffect(() => {
    fetch(`/api/posts/${params.id}`)
      .then((res) => {
        if (res.status === 404) notFound();
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.content !== undefined) setDoc(data.content);
        if (typeof data?.title === "string") setTitle(data.title);
        if (data?.status) setStatus(data.status as PostStatus);
        if (typeof data?.heroImageUrl === "string")
          setHeroImageUrl(data.heroImageUrl);
        else setHeroImageUrl(null);
        if (data?.audienceType)
          setAudienceType(data.audienceType as AudienceType);
        setCircleId(data?.circleId ?? null);

        setSaved(true);
      })
      .catch((err) => console.error("Failed to load post:", err))
      .finally(() => setLoading(false));
  }, [params.id]);

  // Load my circles
  useEffect(() => {
    fetch("/api/circles")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyCircles)
      .catch(() => setMyCircles([]));
  }, []);

  // Load share link state
  useEffect(() => {
    fetch(`/api/posts/${params.id}/share-link`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.active) {
          setShareActive(true);
          setShareUrl(data.url);
        }
      })
      .catch(() => {});
  }, [params.id]);

  const isShareable = status === "SUBMITTED" || status === "PUBLISHED";

  async function handleConfirmCreate() {
    try {
      setShareLoading(true);
      const res = await fetch(`/api/posts/${params.id}/share-link`, {
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
      const res = await fetch(`/api/posts/${params.id}/share-link`, {
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

  // Change handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaved(false);
  };
  const handleEditorChange = (content: Content) => {
    setDoc(content);
    setSaved(false);
  };

  // Save (blocked when editor is locked)
  const handleSave = async () => {
    if (editorLocked) return;
    try {
      setIsSaving(true);
      const res = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: doc,
          status,
          heroImageUrl,
          audienceType,
          circleId: audienceType === "CIRCLE" ? circleId : null,
        }),
      });
      if (!res.ok) throw new Error(`Save failed: ${res.status}`);
      setSaved(true);
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Toggle DRAFT ⇄ SUBMITTED
  // Note: allow Unsubmit even when editorLocked (because SUBMITTED locks the editor)
  const handleToggleSubmit = async () => {
    if (status === "PUBLISHED" || status === "ARCHIVED") return;

    const next: PostStatus = status === "SUBMITTED" ? "DRAFT" : "SUBMITTED";

    // guard: if circle is selected audience, require a circleId
    if (audienceType === "CIRCLE" && !circleId) {
      alert("Please select a circle before submitting.");
      console.log("Submit blocked: no circle selected for CIRCLE audience");
      return;
    }

    try {
      setIsSaving(true);
      const res = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          content: doc,
          status: next,
          heroImageUrl,
          audienceType,
          circleId: audienceType === "CIRCLE" ? circleId : null,
        }),
      });
      if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
      setStatus(next);
      setSaved(true);
      await res.json();
    } catch (err) {
      console.error("Failed to toggle submit:", err);
    } finally {
      setIsSaving(false);
    }
  };

  async function handleDelete() {
    try {
      setIsDeleting(true);

      const res = await fetch(`/api/posts/${params.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        console.error("Delete failed:", res.status);
        alert("Failed to delete");
        return;
      }

      router.prefetch("/posts?deleted=1");
      router.replace("/posts?deleted=1");
    } finally {
      setIsDeleting(false);
    }
  }

  // Autosave: refs keep interval callback from going stale
  const handleSaveRef = useRef(handleSave);
  const canAutosaveRef = useRef(false);
  useEffect(() => {
    handleSaveRef.current = handleSave;
  });
  useEffect(() => {
    canAutosaveRef.current = !saved && !editorLocked && !isSaving;
  }, [saved, editorLocked, isSaving]);
  useEffect(() => {
    const interval = setInterval(() => {
      if (canAutosaveRef.current) void handleSaveRef.current();
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  // Cmd/Ctrl+S to save (only when editable and dirty)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const combo = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (combo) {
        e.preventDefault();
        if (!editorLocked && !isSaving && !saved) void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [editorLocked, isSaving, saved, title, doc]);

  if (loading) {
    return (
      <div className="flex justify-center p-12">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      {/* Top bar with delete on the right */}
      <div className="flex items-center">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => router.push("/posts")}
          className="mr-2"
          title="Back to posts"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="text-sm text-muted-foreground">
          {editorLocked ? `Status: ${status} (read-only)` : `Status: ${status}`}
        </div>
        <div className="ml-auto">
          <ConfirmDelete
            trigger={
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                disabled={isDeleting}
                title="Delete post"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            }
            onConfirm={handleDelete}
            isLoading={isDeleting}
            title="Delete post?"
            description="This action cannot be undone."
          />
        </div>
      </div>
      {/* Share dialogs */}
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
            <AlertDialogAction onClick={handleConfirmCreate} disabled={shareLoading}>
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
            <AlertDialogAction onClick={handleDisableLink} disabled={shareLoading}>
              {shareLoading ? "Disabling…" : "Disable link"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share controls — visible for eligible posts only */}
      {isShareable && (
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
      )}

      {/* HERO IMAGE */}
      <div className="space-y-2">
        <div className="relative w-full h-56 overflow-hidden rounded-lg border bg-muted/30 flex items-center justify-center">
          {heroImageUrl ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={heroImageUrl}
                alt="Hero"
                className="max-h-full max-w-full object-contain"
              />
              {!editorLocked && (
                <button
                  type="button"
                  onClick={() => {
                    setHeroImageUrl(null);
                    setSaved(false);
                  }}
                  className="absolute right-2 top-2 rounded-full bg-white/80 p-1 shadow hover:bg-white"
                  title="Remove image"
                >
                  ✕
                </button>
              )}
            </>
          ) : (
            <span className="text-sm text-muted-foreground">No image</span>
          )}
        </div>

        {!editorLocked && (
          <UploadButton
            endpoint="imageUploader"
            onBeforeUploadBegin={async (files) => {
              // compress each file before upload
              const compressedFiles = await Promise.all(
                files.map((file) => normalizeImage(file)),
              );
              return compressedFiles;
            }}
            onClientUploadComplete={(res) => {
              const first = res?.[0];
              if (first?.url) {
                setHeroImageUrl(first.url);
                setSaved(false);
              }
            }}
            onUploadError={(err) => alert(`Upload failed: ${err.message}`)}
          />
        )}
      </div>

      {/* Title */}
      <div className="flex items-center gap-3">
        <label htmlFor="post-title" className="text-sm text-muted-foreground">
          Title
        </label>
        <input
          id="post-title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled post"
          className="w-full rounded-md border px-3 py-2 text-base md:text-sm"
          disabled={editorLocked}
        />
      </div>

      {/* Editor */}
      <TiptapMvp
        value={doc}
        onChange={handleEditorChange}
        editorClassName="min-h-[240px]"
        placeholder="Write your post…"
        editable={!editorLocked}
      />
      {/* Audience selection */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Audience</label>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audience"
              value="FRIENDS"
              checked={audienceType === "FRIENDS"}
              onChange={() => {
                setAudienceType("FRIENDS");
                setCircleId(null);
                setSaved(false);
              }}
              disabled={editorLocked}
            />
            All Friends
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audience"
              value="ALL_USERS"
              checked={audienceType === "ALL_USERS"}
              onChange={() => {
                setAudienceType("ALL_USERS");
                setCircleId(null);
                setSaved(false);
              }}
              disabled={editorLocked}
            />
            All Rogha Users
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="audience"
              value="CIRCLE"
              checked={audienceType === "CIRCLE"}
              onChange={() => {
                setAudienceType("CIRCLE");
                setSaved(false);
              }}
              disabled={editorLocked}
            />
            Circle
          </label>
        </div>

        {audienceType === "CIRCLE" && (
          <div className="flex items-center gap-2">
            <select
              className="w-full rounded-md border px-3 py-2 text-base md:text-sm"
              value={circleId ?? ""}
              onChange={(e) => {
                setCircleId(e.target.value || null);
                setSaved(false);
              }}
              disabled={editorLocked}
            >
              <option value="">Select a circle…</option>
              {myCircles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1" />

        <Button
          onClick={handleSave}
          disabled={editorLocked || isSaving || saved}
        >
          {editorLocked
            ? "Locked"
            : isSaving
              ? "Saving..."
              : saved
                ? "Saved"
                : "Save"}
        </Button>

        <> {/*placeholder div to ensure spreading of buttons*/}</>
        {/* Submit/Unsubmit visibility controlled by submitButtonShow */}
        {submitButtonShow && (
          <Button
            type="button"
            variant="secondary"
            onClick={handleToggleSubmit}
            title={status === "SUBMITTED" ? "Unsubmit" : "Submit"}
            className="flex items-center gap-2"
            // keep enabled for SUBMITTED so Unsubmit works even when editorLocked
          >
            {status === "SUBMITTED" ? (
              <>
                <Undo className="h-4 w-4" />
                Unsubmit
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Submit
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
