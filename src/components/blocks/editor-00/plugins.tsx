import { useState } from "react";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";
import { ActionsPlugin } from "@/components/editor/plugins/actions/actions-plugin";

import { ToolbarPlugin } from "@/components/editor/plugins/toolbar/toolbar-plugin";
import { BlockFormatDropDown } from "@/components/editor/plugins/toolbar/block-format-toolbar-plugin";
import { FormatBulletedList } from "@/components/editor/plugins/toolbar/block-format/format-bulleted-list";
// import { FormatCheckList } from "@/components/editor/plugins/toolbar/block-format/format-check-list";
// import { FormatCodeBlock } from "@/components/editor/plugins/toolbar/block-format/format-code-block";
import { FormatHeading } from "@/components/editor/plugins/toolbar/block-format/format-heading";
import { FormatNumberedList } from "@/components/editor/plugins/toolbar/block-format/format-numbered-list";
import { FormatParagraph } from "@/components/editor/plugins/toolbar/block-format/format-paragraph";
import { FormatQuote } from "@/components/editor/plugins/toolbar/block-format/format-quote";
import { FontFormatToolbarPlugin } from "@/components/editor/plugins/toolbar/font-format-toolbar-plugin";

import { EditModeTogglePlugin } from "@/components/editor/plugins/actions/edit-mode-toggle-plugin";
import { ClearEditorActionPlugin } from "@/components/editor/plugins/actions/clear-editor-plugin";
import { ClearEditorPlugin } from "@lexical/react/LexicalClearEditorPlugin";
import { ShareContentPlugin } from "@/components/editor/plugins/actions/share-content-plugin";

export function Plugins() {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  const onRef = (node: HTMLDivElement | null) => {
    if (node !== null) setFloatingAnchorElem(node);
  };

  return (
    // Fills the height of the parent container
    <div className="flex h-full flex-col overflow-hidden">
      {/* Toolbar (sticks at top inside the editor area) */}
      <ToolbarPlugin>
        {({ blockType }) => (
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
      <div ref={onRef} className="min-h-0 flex-1 overflow-y-auto">
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

      {/* Actions (sticks at bottom inside the editor area) */}
      <ActionsPlugin>
        <div className="sticky bottom-0 z-10 border-t bg-background p-1">
          <div className="flex items-center justify-end gap-2">
            <ShareContentPlugin />
            <EditModeTogglePlugin />
            <ClearEditorActionPlugin />
            <ClearEditorPlugin />
          </div>
        </div>
      </ActionsPlugin>
    </div>
  );
}
