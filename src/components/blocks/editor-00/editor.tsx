// components/blocks/editor-00/editor.tsx
"use client";

import {
  InitialConfigType,
  LexicalComposer,
} from "@lexical/react/LexicalComposer";
import type { EditorState, SerializedEditorState } from "lexical";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SharedAutocompleteContext } from "@/components/editor/context/shared-autocomplete-context";
import { FloatingLinkContext } from "@/components/editor/context/floating-link-context";
import { editorTheme } from "@/components/editor/themes/editor-theme";
import { nodes } from "./nodes";
import { Plugins } from "./plugins";

const baseConfig: InitialConfigType = {
  namespace: "Editor",
  theme: editorTheme,
  nodes,
  onError: (e: Error) => console.error(e),
};

export function Editor({
  editorState,
  editorSerializedState,
  onChange,
  onSerializedChange,
  initialPostId,
  initialVersion,
  initialStatus,
}: {
  editorState?: EditorState;
  editorSerializedState?: SerializedEditorState;
  onChange?: (s: EditorState) => void;
  onSerializedChange?: (s: SerializedEditorState) => void;
  initialPostId?: string | null;
  initialVersion?: number | null;
  initialStatus?: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
}) {
  return (
    <div className="bg-background overflow-hidden rounded-lg border shadow">
      <LexicalComposer
        initialConfig={{
          ...baseConfig,
          ...(editorState ? { editorState } : {}),
          ...(editorSerializedState
            ? { editorState: JSON.stringify(editorSerializedState) }
            : {}),
        }}
      >
        <TooltipProvider>
          <SharedAutocompleteContext>
            <FloatingLinkContext>
              <Plugins
                initialPostId={initialPostId ?? null}
                initialVersion={initialVersion ?? null}
                initialStatus={initialStatus ?? "DRAFT"}
              />
            </FloatingLinkContext>
          </SharedAutocompleteContext>
        </TooltipProvider>
      </LexicalComposer>
    </div>
  );
}
