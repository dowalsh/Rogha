// components/editor/plugins/persist/autosave-plugin.tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import type { SerializedEditorState } from "lexical";

import { createPost, updatePost } from "@/actions/post.action";
import { useEditorMeta } from "@/components/editor/context/editor-meta-context";

/**
 * AutosavePlugin
 * - Listens to Lexical updates
 * - Debounces saves
 * - Creates on first change, then updates with optimistic concurrency (version)
 * - Updates EditorMetaContext: postId, version, saveState
 * - Locks editor when status === "PUBLISHED"
 */
type Props = {
  /** localStorage key used as a crash-safety backup */
  storageKey?: string;
  /** debounce delay (ms) */
  delay?: number;
  /** status used when creating a brand-new post */
  defaultStatus?: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
};

export function AutosavePlugin({
  storageKey = "post:draft",
  delay = 900,
  defaultStatus = "DRAFT",
}: Props) {
  const [editor] = useLexicalComposerContext();

  // Shared editor meta/context
  const {
    postId,
    setPostId,
    version,
    setVersion,
    status, // used to toggle read-only and skip persistence when PUBLISHED
    saveState,
    setSaveState,
  } = useEditorMeta();

  // Keep refs for postId/version to avoid stale closures in debounced tasks
  const postIdRef = useRef<string | null>(postId);
  const versionRef = useRef<number | null>(version);
  const savingRef = useRef(false);

  useEffect(() => {
    postIdRef.current = postId;
  }, [postId]);

  useEffect(() => {
    versionRef.current = version;
  }, [version]);

  // Make the editor read-only when PUBLISHED
  useEffect(() => {
    const editable = status !== "PUBLISHED";
    editor.setEditable(editable);
  }, [editor, status]);

  // Local error (also mirrored into saveState.error via report())
  const [lastError, setLastError] = useState<string | null>(null);

  // Helper to publish a full SaveState (error always string|null)
  const report = useCallback(
    (patch: Partial<typeof saveState>) => {
      setSaveState({
        saving: "saving" in patch ? !!patch.saving : saveState.saving ?? false,
        dirty: "dirty" in patch ? !!patch.dirty : saveState.dirty ?? false,
        conflict:
          "conflict" in patch ? !!patch.conflict : saveState.conflict ?? false,
        error: "error" in patch ? patch.error ?? null : saveState.error ?? null,
      });
    },
    [saveState, setSaveState]
  );

  // Debouncer
  const debounced = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedule = useCallback(
    (fn: () => void) => {
      if (debounced.current) clearTimeout(debounced.current);
      debounced.current = setTimeout(fn, delay);
    },
    [delay]
  );

  // Persist (create once, then update with optimistic concurrency)
  const persist = useCallback(
    async (state: SerializedEditorState) => {
      // Do not save when published (editor is read-only anyway)
      if (status === "PUBLISHED") return;

      try {
        savingRef.current = true;
        setLastError(null);
        report({ saving: true, conflict: false });

        const currentId = postIdRef.current;
        const currentVersion = versionRef.current ?? 1;

        if (!currentId) {
          // First save → create post
          const res = await createPost({
            content: state,
            status: defaultStatus,
          });
          if (!res?.success || !res.post) {
            throw new Error(res?.error || "Create failed");
          }
          setPostId(res.post.id);
          setVersion(res.post.version ?? 1);
        } else {
          // Subsequent saves → optimistic update
          const res = await updatePost({
            id: currentId,
            content: state,
            version: currentVersion,
          });

          if (res?.conflict) {
            report({ conflict: true, saving: false });
            return;
          }

          if (!res?.success || !res.post) {
            throw new Error(res?.error || "Update failed");
          }

          setVersion(res.post.version ?? currentVersion + 1);
        }

        report({ dirty: false });
      } catch (e: any) {
        const msg = e?.message || "Save error";
        setLastError(msg);
        report({ error: msg });
      } finally {
        savingRef.current = false;
        report({ saving: false });
      }
    },
    [defaultStatus, status, report, setPostId, setVersion]
  );

  // Subscribe to editor updates
  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      // Mark dirty on any change
      report({ dirty: true });

      // Serialize Lexical state
      const json = editorState.toJSON() as SerializedEditorState;

      // Local backup
      try {
        localStorage.setItem(storageKey, JSON.stringify(json));
      } catch {
        // ignore quota errors
      }

      // Debounced persist
      schedule(() => {
        void persist(json);
      });
    });
  }, [editor, persist, schedule, report, storageKey]);

  return null;
}
