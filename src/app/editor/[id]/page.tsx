"use client";

import { useEffect, useState } from "react";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";

export default function TiptapMvpPage({ params }: { params: { id: string } }) {
  const [doc, setDoc] = useState<Content>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(true); // start "true" since we just loaded from DB

  // Load from DB on mount
  useEffect(() => {
    fetch(`/api/posts/${params.id}`)
      .then((res) => res.json())
      .then((data) => setDoc(data.content))
      .catch((err) => console.error("Failed to load post:", err));
  }, [params.id]);

  // Editor onChange only updates local state
  const handleChange = (content: Content) => {
    setDoc(content);
    setSaved(false);
  };

  // Save button handler
  const handleSave = async () => {
    try {
      setIsSaving(true);
      await fetch(`/api/posts/${params.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: doc,
          status: "DRAFT", // hard-coded for now
        }),
      });
    } catch (err) {
      console.error("Failed to save:", err);
    } finally {
      setIsSaving(false);
      setSaved(true);
    }
  };

  console.log("Rendering editor with doc:", doc);

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <TiptapMvp
        value={doc}
        onChange={handleChange}
        editorClassName="min-h-[240px]"
        placeholder="Whats the craic bai?"
      />

      <div className="flex gap-2">
        <Button
          variant="default"
          onClick={handleSave}
          disabled={isSaving || saved}
        >
          {isSaving ? "Saving..." : saved ? "Saved" : "Save"}
        </Button>
      </div>
    </div>
  );
}
