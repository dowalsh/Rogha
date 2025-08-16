"use client";
import { useEditorMeta } from "@/components/editor/context/editor-meta-context";

export function StatusBar() {
  const { saveState } = useEditorMeta();
  return (
    <div className="mt-2 text-xs text-muted-foreground">
      {saveState.saving
        ? "Saving…"
        : saveState.conflict
        ? "Update conflict. Refresh to load the latest."
        : saveState.error
        ? `Error: ${saveState.error}`
        : saveState.dirty
        ? "Unsaved changes"
        : "All changes saved"}
    </div>
  );
}
