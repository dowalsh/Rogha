import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
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
  depth = 0,
}: {
  comment: CommentType;
  onReply: (parentId: string, content: string) => void;
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [reply, setReply] = useState("");

  const { liked, count, toggle } = useLike({
    id: comment.id,
    type: "comment",
    initialLiked: comment.likedByMe,
    initialCount: comment.likeCount,
  });

  async function handleSubmitReply() {
    if (!reply.trim()) return;
    await onReply(comment.id, reply);
    setReply("");
    setShowReply(false);
  }

  return (
    <div id={`comment-${comment.id}`} className="space-y-2 scroll-mt-60">
      <div className="flex gap-4">
        <Avatar className="h-10 w-10 border">
          <AvatarImage src={comment.author.image ?? "/placeholder-user.jpg"} />
          <AvatarFallback>{comment.author.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <div className="grid gap-1.5">
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {comment.author.name ?? "Unknown"}
            </span>
            <span className="text-xs text-muted-foreground">
              {timeAgo(new Date(comment.createdAt))}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{comment.content}</p>
          <LikeButton
            liked={liked}
            count={count}
            onToggle={toggle}
            fetchLikersUrl={`/api/comments/${comment.id}/likes`}
          />
        </div>
      </div>

      {/* replies */}
      {comment.replies?.length > 0 && (
        <div className="ml-6 pl-4 border-l border-muted space-y-4">
          {comment.replies.map((r) => (
            <CommentItem
              key={r.id}
              comment={r}
              onReply={onReply}
              depth={depth + 1}
            />
          ))}
        </div>
      )}

      {/* reply button + box (top-level only) */}
      {depth === 0 && (
        <div className="ml-12 mt-2 space-y-2">
          <Button
            variant="outline"
            size="sm"
            className="h-6 px-2 text-xs"
            onClick={() => setShowReply((s) => !s)}
          >
            {showReply ? "Cancel" : "Reply"}
          </Button>
          {showReply && (
            <div className="mt-2 space-y-2">
              <Textarea
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                placeholder="Write a reply..."
                className="resize-none text-sm"
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmitReply}>
                  Submit
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowReply(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
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

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash) {
      const el = document.querySelector(window.location.hash);
      if (el) {
        // Delay to ensure DOM is ready
        setTimeout(() => {
          el.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 50);
      }
    }
  }, [comments]); // runs when comments state updates

  async function addComment() {
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

  async function addReply(parentId: string, content: string) {
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

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0
  );

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold">Comments</h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {totalComments}
          </span>
        </div>
        <p className="text-sm italic text-orange-500 mb-4">
          Comments are visible to all {postAuthorName}'s friends
        </p>
      </div>

      <div className="space-y-6">
        {comments.map((c) => (
          <CommentItem key={c.id} comment={c} onReply={addReply} />
        ))}
      </div>

      <h2 className="text-2xl font-bold">Join the conversation</h2>
      <div className="grid gap-2">
        <Textarea
          placeholder="Write your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
        />
        <Button onClick={addComment}>Submit</Button>
      </div>
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}
