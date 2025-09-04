"use client";

import { useEffect, useState } from "react";
import { notFound } from "next/navigation";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";
// If you have shadcn Input, uncomment the next line and use <Input /> instead of <input />
// import { Input } from "@/components/ui/input";

export default function TiptapMvpPage({ params }: { params: { id: string } }) {
  const [title, setTitle] = useState<string>("");
  const [doc, setDoc] = useState<Content>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  // Load from DB on mount
  useEffect(() => {
    fetch(`/api/posts/${params.id}`)
      .then((res) => {
        if (res.status === 404) notFound();
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (data?.content !== undefined) setDoc(data.content);
        if (typeof data?.title === "string") setTitle(data.title);
        setSaved(true);
      })
      .catch((err) => console.error("Failed to load post:", err));
  }, [params.id]);

  // Mark unsaved on editor change
  const handleChange = (content: Content) => {
    setDoc(content);
    setSaved(false);
  };

  // Mark unsaved on title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
    setSaved(false);
  };

  // Save (manual)
  const handleSave = async () => {
    try {
      setIsSaving(true);
      const res = await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, // <-- persist title
          content: doc, // <-- persist TipTap JSON
          status: "DRAFT", // keep or replace with real status later
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

  // Cmd/Ctrl+S to save
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isCmdOrCtrlS =
        (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s";
      if (isCmdOrCtrlS) {
        e.preventDefault();
        if (!isSaving && !saved) void handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSaving, saved, title, doc]);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      {/* Title input */}
      <div className="flex items-center gap-3">
        <label htmlFor="post-title" className="text-sm text-muted-foreground">
          Title
        </label>
        {/* Replace with <Input .../> if you have shadcn Input */}
        <input
          id="post-title"
          value={title}
          onChange={handleTitleChange}
          placeholder="Untitled post"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {/* Editor */}
      <TiptapMvp
        value={doc}
        onChange={handleChange}
        editorClassName="min-h-[240px]"
        placeholder="Write your post…"
      />

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button onClick={handleSave} disabled={isSaving || saved}>
          {isSaving ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
        <span className="text-xs text-muted-foreground">⌘/Ctrl+S to save</span>
      </div>
    </div>
  );
}
