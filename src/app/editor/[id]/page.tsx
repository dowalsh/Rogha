"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";
import { Send, Undo, Trash2, ChevronLeft } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import { normalizeImage } from "@/lib/images";
import { AudienceType } from "@/types";
import { ConfirmDelete } from "@/components/ui/confirm-delete";

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

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // LOCK: editor locked in SUBMITTED / PUBLISHED / ARCHIVED (your current rule)
  const editorLocked = useMemo(
    () =>
      status === "SUBMITTED" || status === "PUBLISHED" || status === "ARCHIVED",
    [status]
  );

  // SHOW: submit toggle visible only for DRAFT or SUBMITTED
  const submitButtonShow = useMemo(
    () => status === "DRAFT" || status === "SUBMITTED",
    [status]
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
      .catch((err) => console.error("Failed to load post:", err));
  }, [params.id]);

  // Load my circles
  useEffect(() => {
    fetch("/api/circles")
      .then((r) => (r.ok ? r.json() : []))
      .then(setMyCircles)
      .catch(() => setMyCircles([]));
  }, []);

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
                files.map((file) => normalizeImage(file))
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
          className="w-full rounded-md border px-3 py-2 text-sm"
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
              className="w-full rounded-md border px-3 py-2 text-sm"
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
