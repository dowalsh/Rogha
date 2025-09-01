// src/app/tiptap-mvp/page.tsx
"use client";

import { useEffect, useState } from "react";
import type { Content } from "@tiptap/react";
import { TiptapMvp } from "@/components/tiptap-mvp";
import { Button } from "@/components/ui/button";

const LS_KEY = "tiptap:mvp";

export default function TiptapMvpPage() {
  const [doc, setDoc] = useState<Content>("");

  // load from localStorage for MVP
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setDoc(JSON.parse(raw));
    } catch {}
  }, []);

  const handleChange = (content: Content) => {
    setDoc(content);
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(content));
    } catch {}
  };

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">TipTap MVP</h1>

      <TiptapMvp
        value={doc}
        onChange={handleChange}
        editorClassName="min-h-[240px]"
        placeholder="Write something nice…"
      />

      <div className="flex gap-2">
        <Button
          variant="secondary"
          onClick={() => {
            try {
              const html = typeof doc === "string" ? doc : "";
              console.log("JSON:", doc);
              console.log(
                "HTML (derive with editor.getHTML() in component when needed)"
              );
              alert("Open console to inspect content.");
            } catch {}
          }}
        >
          Log Content
        </Button>

        <Button
          onClick={() => {
            localStorage.removeItem(LS_KEY);
            setDoc("");
          }}
        >
          Clear
        </Button>
      </div>
    </div>
  );
}
