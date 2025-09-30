import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useLike } from "@/hooks/useLike";
import { LikeButton } from "./LikeButton";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommentType {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  replies: CommentType[];
  likeCount: number;
  likedByMe: boolean;
}

function CommentItem({
  comment,
  onReply,
}: {
  comment: CommentType;
  onReply: (parentId: string, content: string) => void;
}) {
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [replyText, setReplyText] = useState("");

  // 🔹 use shared hook for like state + API
  const { liked, count, toggle } = useLike({
    id: comment.id,
    type: "comment",
    initialLiked: comment.likedByMe,
    initialCount: comment.likeCount,
  });

  const handleDoubleTap = useDoubleTap(() => toggle());

  async function handleReplySubmit() {
    if (!replyText.trim()) return;
    await onReply(comment.id, replyText);
    setReplyText("");
    setShowReplyBox(false);
  }

  return (
    <div className="space-y-2">
      {/* main comment */}
      <div
        className="flex items-start gap-4"
        onClick={handleDoubleTap}
        onTouchEnd={handleDoubleTap}
      >
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={comment.author.image ?? "/placeholder-user.jpg"} />
          <AvatarFallback>{comment.author.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <div className="font-medium">
              {comment.author.name ?? "Unknown"}
            </div>
            <div className="text-xs text-muted-foreground">
              {timeAgo(new Date(comment.createdAt))}
            </div>
          </div>
          <div className="text-sm text-muted-foreground">{comment.content}</div>
          <div className="flex items-center gap-4 mt-1">
            <LikeButton
              liked={liked}
              count={count}
              onToggle={toggle}
              fetchLikersUrl={`/api/comments/${comment.id}/likes`}
            />
            <Button
              variant="outline"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setShowReplyBox((prev) => !prev)}
            >
              {showReplyBox ? "Cancel" : "Reply"}
            </Button>
          </div>
        </div>
      </div>

      {/* reply box */}
      {showReplyBox && (
        <div className="ml-12 mt-2 space-y-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Write a reply..."
            className="resize-none"
          />
          <Button size="sm" onClick={handleReplySubmit}>
            Submit Reply
          </Button>
        </div>
      )}
    </div>
  );
}
export default function CommentsSection({
  postId,
  postAuthorName,
}: {
  postId: string;
  postAuthorName: string;
}) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then((data) =>
        setComments(
          data.sort(
            (a: CommentType, b: CommentType) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          )
        )
      );
  }, [postId]);

  async function handleNewComment() {
    if (!newComment.trim()) return;
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });

    if (res.ok) {
      const created = await res.json();
      setComments((prev) => [
        ...prev,
        { ...created, likeCount: 0, likedByMe: false },
      ]);
      setNewComment("");
    }
  }

  async function handleReply(parentId: string, content: string) {
    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content, parentId }),
    });

    if (res.ok) {
      const created = await res.json();
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: [
                  ...c.replies,
                  { ...created, likeCount: 0, likedByMe: false },
                ],
              }
            : c
        )
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Comments</h2>
          <span className="inline-flex items-center justify-center rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {comments.reduce((acc, c) => acc + 1 + c.replies.length, 0)}
          </span>
        </div>
        <p className="text-sm italic text-orange-500 mb-4">
          Comments are visible to all {postAuthorName}'s friends
        </p>
      </div>
      <div className="space-y-6">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} onReply={handleReply} />
        ))}
      </div>
      <h2 className="text-2xl font-bold">Join the conversation</h2>
      <div className="space-y-4">
        <div className="grid gap-2">
          <Textarea
            placeholder="Write your comment..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button onClick={handleNewComment}>Submit</Button>
        </div>
      </div>
    </div>
  );
}

function timeAgo(date: Date): string {
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}

function useDoubleTap(callback: () => void, timeout = 300) {
  const lastTapRef = useRef<number>(0);

  return () => {
    const now = Date.now();
    if (now - lastTapRef.current < timeout) {
      callback(); // fire on double tap
    }
    lastTapRef.current = now;
  };
}
