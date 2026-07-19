"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import useSWR from "swr";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";
import { Send, Undo, Trash2, ChevronLeft, ImageIcon } from "lucide-react";
import { useUploadThing } from "@/lib/uploadthing";
import { normalizeImage } from "@/lib/images";
import { AudienceType } from "@/types";
import { ConfirmDelete } from "@/components/ui/confirm-delete";
import { Spinner } from "@/components/Spinner";
import { ShareLinkControls } from "@/components/ShareLinkControls";
import { EditorSkeleton } from "@/components/editor/EditorSkeleton";
import { useDelayedLoading } from "@/hooks/useDelayedLoading";
import toast from "react-hot-toast";
import { FetchError } from "@/lib/swr";

type PostData = {
  content?: Content;
  title?: string;
  status?: PostStatus;
  heroImageUrl?: string | null;
  audienceType?: AudienceType;
  circleId?: string | null;
};

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";

function HeroImageUploadButton({ onComplete }: { onComplete: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { startUpload, isUploading } = useUploadThing("imageUploader", {
    onClientUploadComplete: (res) => {
      const url = res?.[0]?.ufsUrl;
      if (url) onComplete(url);
    },
    onUploadError: (err: Error) => alert(`Upload failed: ${err.message}`),
  });

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const normalized = await Promise.all(files.map(normalizeImage));
    await startUpload(normalized);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/gif,image/webp,image/heic,image/heif"
        className="hidden"
        onChange={handleChange}
      />
      <button
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm hover:bg-accent hover:text-accent-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {isUploading ? <Spinner className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
        {isUploading ? "Uploading…" : "Choose image"}
      </button>
    </>
  );
}

export default function TiptapMvpPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [doc, setDoc] = useState<Content>("");
  const [status, setStatus] = useState<PostStatus>("DRAFT");
  const [audienceType, setAudienceType] = useState<AudienceType>("FRIENDS");
  const [circleId, setCircleId] = useState<string | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

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

  // Load post. revalidateOnFocus/revalidateIfStale disabled: this data seeds
  // an editable form, so we don't want a background refetch to clobber
  // in-progress edits — the cache just saves a refetch when navigating back
  // into a post the user already opened.
  const {
    data: postData,
    error: postError,
    isLoading: loading,
  } = useSWR<PostData>(`/api/posts/${params.id}`, {
    revalidateOnFocus: false,
    revalidateIfStale: false,
    shouldRetryOnError: false,
  });

  if (postError instanceof FetchError && postError.status === 404) {
    notFound();
  }

  const showSkeleton = useDelayedLoading(loading);

  // Seed the editable form fields once per post id, when the data first
  // arrives — not on every render, so it doesn't stomp on user edits.
  const seededForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!postData || seededForIdRef.current === params.id) return;
    seededForIdRef.current = params.id;

    if (postData.content !== undefined) setDoc(postData.content);
    if (typeof postData.title === "string") setTitle(postData.title);
    if (postData.status) setStatus(postData.status);
    if (typeof postData.heroImageUrl === "string")
      setHeroImageUrl(postData.heroImageUrl);
    else setHeroImageUrl(null);
    if (postData.audienceType) setAudienceType(postData.audienceType);
    setCircleId(postData.circleId ?? null);

    setSaved(true);
  }, [postData, params.id]);

  // Load my circles — shared SWR cache means this is instant if the user
  // already visited another page that fetched the same list.
  const { data: myCircles = [] } = useSWR<Array<{ id: string; name: string }>>(
    "/api/circles",
  );

  const isShareable = status === "PUBLISHED";

  // Change handlers
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaved(false);
  };
  const handleEditorChange = (content: Content) => {
    setDoc(content);
    setSaved(false);
  };

  // Save (blocked when editor is locked). Returns whether the save succeeded
  // so callers (e.g. submit) can flush pending changes before moving on.
  const handleSave = async (): Promise<boolean> => {
    if (editorLocked) return true;
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
      return true;
    } catch (err) {
      console.error("Failed to save:", err);
      return false;
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

      // Flush any pending changes (e.g. a hero image the user just picked)
      // through the normal save flow first, so the current status's PUT
      // isn't the first time this content/image has ever been persisted.
      const saveOk = await handleSave();
      if (!saveOk) {
        toast.error("Failed to save changes. Please try again.");
        return;
      }

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
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        toast.error(body.error ?? "Failed to submit. Please try again.");
        return;
      }
      setStatus(next);
      setSaved(true);
    } catch (err) {
      console.error("Failed to toggle submit:", err);
      toast.error("Failed to submit. Please try again.");
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

  if (showSkeleton) {
    return <EditorSkeleton />;
  }
  if (loading) {
    return null;
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
      {/* Share controls — visible for eligible posts only */}
      {isShareable && <ShareLinkControls postId={params.id} />}

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
          <div className="flex justify-center">
            <HeroImageUploadButton
              onComplete={(url) => {
                setHeroImageUrl(url);
                setSaved(false);
              }}
            />
          </div>
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
