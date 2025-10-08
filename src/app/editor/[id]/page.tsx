"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";
import { Send, Undo, Trash2, ChevronLeft } from "lucide-react";
import { UploadButton } from "@/lib/uploadthing";
import Compressor from "compressorjs";
import heic2any from "heic2any";
import { no } from "zod/v4/locales";

/**
 * Normalize an image before upload:
 * - Converts HEIC/HEIF → JPEG
 * - Compresses large images (downsample + quality)
 */
export async function normalizeImage(file: File): Promise<File> {
  let workingFile = file;

  // Step 1: Convert HEIC/HEIF to JPEG (for iPhone uploads)
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.name.toLowerCase().endsWith(".heic") ||
    file.name.toLowerCase().endsWith(".heif")
  ) {
    try {
      const convertedBlob = (await heic2any({
        blob: file,
        toType: "image/jpeg",
        quality: 0.9,
      })) as Blob;

      workingFile = new File(
        [convertedBlob],
        file.name.replace(/\.(heic|heif)$/i, ".jpg"),
        { type: "image/jpeg" }
      );
    } catch (err) {
      console.error("HEIC → JPEG conversion failed:", err);
      // fallback to original file if conversion fails
    }
  }

  // Step 2: Compress the image
  return new Promise<File>((resolve, reject) => {
    new Compressor(workingFile, {
      quality: 0.7, // balance quality/size
      maxWidth: 2000, // downsample large images
      maxHeight: 2000,
      convertSize: 1000000, // convert >1MB PNGs to JPEG
      success: (result) => resolve(result as File),
      error: (err) => {
        console.error("Compression failed:", err);
        resolve(workingFile); // fallback to uncompressed file
      },
    });
  });
}

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";

export default function TiptapMvpPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
  const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);
  const [doc, setDoc] = useState<Content>("");
  const [status, setStatus] = useState<PostStatus>("DRAFT");

  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true);

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

        setSaved(true);
      })
      .catch((err) => console.error("Failed to load post:", err));
  }, [params.id]);

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
        body: JSON.stringify({ title, content: doc, status, heroImageUrl }),
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
    // Block only when truly locked-out states (PUBLISHED/ARCHIVED)
    if (status === "PUBLISHED" || status === "ARCHIVED") return;

    const next: PostStatus = status === "SUBMITTED" ? "DRAFT" : "SUBMITTED";
    try {
      setIsSaving(true);

      const res = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content: doc, status: next }),
      });
      if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
      setSaved(true);
      setStatus(next);
      await res.json();
      setSaved(true);
    } catch (err) {
      console.error("Failed to toggle submit:", err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete
  async function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    const res = await fetch(`/api/posts/${params.id}`, { method: "DELETE" });
    if (!res.ok) {
      console.error("Delete failed:", res.status);
      alert("Failed to delete");
      return;
    }
    // Optional: prefetch for snappy nav
    router.prefetch("/posts?deleted=1");
    router.replace("/posts?deleted=1");
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
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="text-muted-foreground hover:text-destructive"
            title="Delete post"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
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
