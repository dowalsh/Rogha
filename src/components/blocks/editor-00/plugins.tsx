"use client";

import { useState } from "react";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { ActionsPlugin } from "@/components/editor/plugins/actions/actions-plugin";
import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin";
import { BlockFormatDropDown } from "@/components/editor/plugins/toolbar/block-format-toolbar-plugin";
import { FormatBulletedList } from "@/components/editor/plugins/toolbar/block-format/format-bulleted-list";
import { FormatHeading } from "@/components/editor/plugins/toolbar/block-format/format-heading";
import { FormatNumberedList } from "@/components/editor/plugins/toolbar/block-format/format-numbered-list";
import { FormatParagraph } from "@/components/editor/plugins/toolbar/block-format/format-paragraph";
import { FormatQuote } from "@/components/editor/plugins/toolbar/block-format/format-quote";
import { FontFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/font-format-toolbar-plugin";
import { ClearEditorActionPlugin } from "@/components/editor/plugins/actions/clear-editor-plugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";

/* Context + Plugins */
import { EditorMetaProvider } from "@/components/editor/context/editor-meta-context";
import { AutosavePlugin } from "@/components/editor/plugins/persist/autosave-plugin";
import { StatusBar } from "@/components/editor/plugins/persist/statusbar-plugin";
import { PublishTogglePlugin } from "@/components/editor/plugins/actions/publish-toggle-plugin";

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";

export function Plugins({
  initialPostId,
  initialVersion,
  initialStatus, // ✅ add
}: {
  initialPostId?: string | null;
  initialVersion?: number | null;
  initialStatus?: PostStatus; // ✅ add
}) {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  return (
    <EditorMetaProvider
      initialPostId={initialPostId ?? null}
      initialVersion={initialVersion ?? null}
      initialStatus={initialStatus ?? "DRAFT"} // ✅ forward
    >
      <div className="flex h-full flex-col overflow-hidden">
        {/* Toolbar */}
        <ToolbarPlugin>
          {() => (
            <div className="sticky top-0 z-10 flex gap-2 border-b bg-background p-2">
              <BlockFormatDropDown>
                <FormatParagraph />
                <FormatHeading levels={["h1", "h2"]} />
                <FormatNumberedList />
                <FormatBulletedList />
                <FormatQuote />
              </BlockFormatDropDown>
              <FontFormatToolbarPlugin format="bold" />
              <FontFormatToolbarPlugin format="italic" />
              <FontFormatToolbarPlugin format="underline" />
              <FontFormatToolbarPlugin format="strikethrough" />
            </div>
          )}
        </ToolbarPlugin>

        {/* Scrollable content area */}
        <div
          ref={setFloatingAnchorElem}
          className="min-h-0 flex-1 overflow-y-auto"
        >
          <AutosavePlugin storageKey="post:draft" defaultStatus="DRAFT" />
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                placeholder="Start typing..."
                className="ContentEditable__root block px-8 py-4 pb-24 focus:outline-none"
              />
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>

        {/* Actions (bottom) */}
        <ActionsPlugin>
          <div className="sticky bottom-0 z-10 border-t bg-background p-1">
            <div className="flex items-center justify-between gap-2">
              <StatusBar />
              <div className="flex items-center gap-3">
                <PublishTogglePlugin />
                <ClearEditorActionPlugin />
                <ClearEditorPlugin />
              </div>
            </div>
          </div>
        </ActionsPlugin>
      </div>
    </EditorMetaProvider>
  );
}
