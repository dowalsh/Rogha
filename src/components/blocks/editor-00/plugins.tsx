import { useState } from "react";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";

import { ContentEditable } from "@/components/editor/editor-ui/content-editable";

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
import { ShareContentPlugin } from "@/components/editor/plugins/actions/share-content-plugin";

export function Plugins() {
  const [floatingAnchorElem, setFloatingAnchorElem] =
    useState<HTMLDivElement | null>(null);

  const onRef = (node: HTMLDivElement | null) => {
    if (node !== null) {
      setFloatingAnchorElem(node);
    }
  };

  return (
    <div className="relative">
      {/* Toolbar */}
      <ToolbarPlugin>
        {({ blockType }) => (
          <div className="sticky top-0 z-10 flex gap-2 overflow-auto border-b p-2">
            <BlockFormatDropDown>
              <FormatParagraph />
              <FormatHeading levels={["h1", "h2"]} />
              <FormatNumberedList />
              <FormatBulletedList />
              {/* <FormatCheckList /> */}
              <FormatQuote />
            </BlockFormatDropDown>
            <FontFormatToolbarPlugin format="bold" />
            <FontFormatToolbarPlugin format="italic" />
            <FontFormatToolbarPlugin format="underline" />
            <FontFormatToolbarPlugin format="strikethrough" />
          </div>
        )}
      </ToolbarPlugin>

      {/* Editor */}
      <RichTextPlugin
        contentEditable={
          <div>
            <div ref={onRef}>
              <ContentEditable
                placeholder="Start typing..."
                className="ContentEditable__root px-4 py-2 focus:outline-none"
              />
            </div>
          </div>
        }
        ErrorBoundary={LexicalErrorBoundary}
      />

      {/* Actions */}
      <div className="flex items-center justify-between border-t p-2">
        <EditModeTogglePlugin />
        <ClearEditorActionPlugin />
        <ShareContentPlugin />
      </div>
    </div>
  );
}
