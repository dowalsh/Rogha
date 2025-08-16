"use client";

import { useCallback, useState } from "react";
import { SendIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { updatePost } from "@/actions/post.action";
import { useEditorMeta } from "@/components/editor/context/editor-meta-context";

export function ShareContentPlugin() {
  const { postId, version, saveState, setVersion } = useEditorMeta();
  const [publishing, setPublishing] = useState(false);

  const handlePublish = useCallback(async () => {
    if (!postId || version == null || publishing) return;
    try {
      setPublishing(true);
      const res = await updatePost({
        id: postId,
        version,
        status: "PUBLISHED",
      });

      if (res?.conflict) {
        toast.error("Publish conflict. Please refresh to get the latest.");
        return;
      }
      if (!res?.success || !res.post) {
        toast.error(res?.error || "Failed to publish");
        return;
      }
      setVersion(res.post.version);
      toast.success("Post published");
    } catch (e: any) {
      toast.error(e?.message || "Failed to publish");
    } finally {
      setPublishing(false);
    }
  }, [postId, version, publishing, setVersion]);

  const disabled = !postId || version == null || saveState.saving || publishing;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-2"
          onClick={handlePublish}
          disabled={disabled}
          title="Publish"
          aria-label="Publish this post"
        >
          <SendIcon className="size-4" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Share Content</TooltipContent>
    </Tooltip>
  );
}
