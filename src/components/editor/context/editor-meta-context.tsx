// ...existing imports...
import type { SaveState } from "@/components/editor/plugins/persist/save-state";
import { createContext, useContext, useMemo, useState } from "react";

type PostStatus = "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";

type EditorMetaContextType = {
  postId: string | null;
  setPostId: (id: string | null) => void;

  version: number | null;
  setVersion: (v: number | null) => void;

  status: PostStatus;
  setStatus: (s: PostStatus) => void;

  saveState: SaveState;
  setSaveState: (s: SaveState) => void;
};

const EditorMetaContext = createContext<EditorMetaContextType | null>(null);

export function EditorMetaProvider({
  children,
  initialPostId = null,
  initialVersion = null,
  initialStatus = "DRAFT",
}: {
  children: React.ReactNode;
  initialPostId?: string | null;
  initialVersion?: number | null;
  initialStatus?: PostStatus;
}) {
  const [postId, setPostId] = useState<string | null>(initialPostId ?? null);
  const [version, setVersion] = useState<number | null>(initialVersion ?? null);
  const [status, setStatus] = useState<PostStatus>(initialStatus);

  const [saveState, _setSaveState] = useState<SaveState>({
    saving: false,
    dirty: false,
    conflict: false,
    error: null,
  });

  const setSaveState = (s: SaveState) => _setSaveState(s);

  const value = useMemo(
    () => ({
      postId,
      setPostId,
      version,
      setVersion,
      status,
      setStatus,
      saveState,
      setSaveState,
    }),
    [postId, version, status, saveState]
  );

  return (
    <EditorMetaContext.Provider value={value}>
      {children}
    </EditorMetaContext.Provider>
  );
}

export function useEditorMeta(): EditorMetaContextType {
  const ctx = useContext(EditorMetaContext);
  if (!ctx)
    throw new Error("useEditorMeta must be used within EditorMetaProvider");
  return ctx;
}
