// app/editor/_EditorClient.tsx
"use client";

import type { SerializedEditorState } from "lexical";
import { Editor } from "@/components/blocks/editor-00/editor";

export default function EditorClient(props: {
  initialSerializedState: SerializedEditorState;
  initialPostId: string | null;
  initialVersion: number | null;
  initialStatus: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
}) {
  const {
    initialSerializedState,
    initialPostId,
    initialVersion,
    initialStatus,
  } = props;

  return (
    <div className="flex flex-col items-center px-4 py-8">
      <div className="w-full max-w-3xl mb-6" />
      <div className="w-full max-w-3xl">
        <Editor
          // your editor still accepts an initial serialized state
          editorSerializedState={initialSerializedState}
          // pass meta so Plugins can seed EditorMetaProvider
          initialPostId={initialPostId}
          initialVersion={initialVersion}
          initialStatus={initialStatus}
        />
      </div>
    </div>
  );
}
