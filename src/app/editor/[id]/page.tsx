"use client";

import { useEffect, useMemo, useState } from "react";
import { notFound, useRouter } from "next/navigation";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";
import { Send, Undo, Trash2 } from "lucide-react";

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";

export default function TiptapMvpPage({ params }: { params: { id: string } }) {
  const router = useRouter();

  const [title, setTitle] = useState<string>("");
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
        body: JSON.stringify({ title, content: doc, status }),
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
      const res = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(`Toggle failed: ${res.status}`);
      setStatus(next);
      await res.json();
      setSaved(true);
    } catch (err) {
      console.error("Failed to toggle submit:", err);
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
