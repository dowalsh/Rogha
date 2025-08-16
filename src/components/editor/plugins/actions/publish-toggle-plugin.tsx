"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { useEditorMeta } from "@/components/editor/context/editor-meta-context";
import { updatePost } from "@/actions/post.action";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function PublishTogglePlugin() {
  const { postId, version, status, setStatus, saveState, setVersion } =
    useEditorMeta();
  const [busy, setBusy] = useState(false);

  const checked = status === "PUBLISHED";
  const disabled = !postId || version == null || saveState.saving || busy;

  const handleToggle = useCallback(async () => {
    if (!postId || version == null) return;
    try {
      setBusy(true);
      const next = checked ? "DRAFT" : "PUBLISHED";
      const res = await updatePost({ id: postId, version, status: next });

      if (res?.conflict) {
        toast.error("Conflict. Refresh to get the latest version.");
        return;
      }
      if (!res?.success || !res.post) {
        toast.error(res?.error || "Failed to update status");
        return;
      }

      setVersion(res.post.version);
      setStatus(next);

      if (next === "PUBLISHED") {
        toast.success("Published");
      } else {
        toast.success("Back to draft");
      }
    } catch (e: any) {
      toast.error(e?.message || "Failed to update");
    } finally {
      setBusy(false);
    }
  }, [postId, version, checked, setVersion, setStatus]);

  const label = useMemo(() => (checked ? "Published" : "Draft"), [checked]);

  return (
    <div className="flex items-center gap-2">
      <Label className={checked ? "text-green-600" : ""}>{label}</Label>
      <Switch
        checked={checked}
        onCheckedChange={handleToggle}
        disabled={disabled}
        // visual emphasis when published
        className={checked ? "data-[state=checked]:bg-green-600" : undefined}
      />
    </div>
  );
}
