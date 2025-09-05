// src/components/tiptap/tiptap-mvp.tsx
"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type Content } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils"; // or replace cn with a simple join

type Props = {
  value?: Content; // html | json | text
  onChange?: (c: Content) => void;
  placeholder?: string;
  className?: string; // wrapper
  editorClassName?: string; // content area
  autofocus?: boolean;
  editable?: boolean;
};

export function TiptapMvp({
  value = "",
  onChange,
  placeholder = "Start typing…",
  className,
  editorClassName,
  autofocus = true,
  editable = true,
}: Props) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
    ],
    content: value, // accepts HTML string or TipTap JSON
    autofocus,
    editable,
    onUpdate: ({ editor }) => {
      // For MVP: emit JSON document
      const json = editor.getJSON();
      onChange?.(json);
    },
    editorProps: {
      attributes: {
        class:
          cn(
            "prose prose-sm sm:prose base-content focus:outline-none min-h-[160px]",
            editorClassName
          ) || "",
        "data-placeholder": placeholder,
      },
    },
  });

  useEffect(() => {
    // keep TipTap in sync if parent passes a changed value (optional)
    if (!editor || value == null) return;
    const current = editor.getJSON();
    if (typeof value === "string") {
      // switching formats here is uncommon; ignore for MVP
      return;
    }
    // shallow compare-ish: if different, update
    try {
      const next = value as any;
      if (JSON.stringify(next) !== JSON.stringify(current)) {
        editor.commands.setContent(next, { emitUpdate: false }); // do not emit another update
      }
    } catch {}
  }, [editor, value]);

  // 2) React to editability changes ONLY
  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!!editable);
  }, [editor, editable]);

  return (
    <div className={cn("rounded-md border", className)}>
      {/* Tiny toolbar (bold/italic, bullets, code) */}
      <div className="flex items-center gap-1 border-b p-1">
        <Button
          size="sm"
          variant={editor?.isActive("bold") ? "default" : "ghost"}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        >
          B
        </Button>
        <Button
          size="sm"
          variant={editor?.isActive("italic") ? "default" : "ghost"}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        >
          I
        </Button>
        <Button
          size="sm"
          variant={editor?.isActive("bulletList") ? "default" : "ghost"}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        >
          • List
        </Button>
      </div>

      <div className="p-3">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
