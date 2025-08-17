"use client";

import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Card, CardContent } from "./ui/card";
import { Avatar, AvatarImage } from "./ui/avatar";
import { Textarea } from "./ui/textarea";
import { Button } from "./ui/button";
import { ImageIcon, Loader2Icon, SendIcon } from "lucide-react";
import { createPost } from "@/actions/post.action";
import { toast } from "react-hot-toast";

// Convert plain text into a minimal Lexical SerializedEditorState
function textToLexicalState(text: string) {
  return {
    root: {
      type: "root",
      version: 1,
      indent: 0,
      format: "",
      direction: "ltr",
      children: [
        {
          type: "paragraph",
          version: 1,
          indent: 0,
          format: "",
          direction: "ltr",
          children: text
            ? [
                {
                  type: "text",
                  version: 1,
                  detail: 0,
                  format: 0,
                  mode: "normal",
                  style: "",
                  text,
                },
              ]
            : [],
        },
      ],
    },
  };
}

function CreatePost() {
  const { user } = useUser();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [showImageUpload, setShowImageUpload] = useState(false);

  const handleSubmit = async () => {
    const hasContent = content.trim().length > 0;
    const hasImage = imageUrl.trim().length > 0;
    if (!hasContent && !hasImage) return;

    setIsPosting(true);
    try {
      const serialized = textToLexicalState(content);

      const result = await createPost({
        content: serialized, // ✅ JSON (Lexical)
        image: hasImage ? imageUrl : null,
        status: "DRAFT", // optional (your server can default to DRAFT)
      });

      if (result?.success) {
        setContent("");
        setImageUrl("");
        setShowImageUpload(false);
        toast.success("Post created!");
      } else {
        toast.error(result?.error || "Failed to create post");
      }
    } catch (error) {
      toast.error("Failed to create post");
    } finally {
      setIsPosting(false);
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="space-y-4">
          <div className="flex space-x-4">
            <Avatar className="flex space-x-4">
              <AvatarImage src={user?.imageUrl || "/avatar.png"} />
            </Avatar>
            <Textarea
              placeholder="Whats the craic bai?"
              className="min-h-[100px] resize-none border-none focus-visible:ring-0 p-0 text-base"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              disabled={isPosting}
            />
          </div>

          {/* TODO handle image uploads
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-primary"
              onClick={() => setShowImageUpload(!showImageUpload)}
              disabled={isPosting}
            >
              <ImageIcon className="size-4 mr-2" />
              Photo
            </Button>
          </div>
          */}

          <div className="flex items-center justify-between border-t pt-4">
            <div className="flex space-x-2">
              {/* reserved for future actions */}
            </div>
            <Button
              className="flex items-center"
              onClick={handleSubmit}
              disabled={(!content.trim() && !imageUrl.trim()) || isPosting}
            >
              {isPosting ? (
                <>
                  <Loader2Icon className="size-4 mr-2 animate-spin" />
                  Posting...
                </>
              ) : (
                <>
                  <SendIcon className="size-4 mr-2" />
                  Post
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default CreatePost;
