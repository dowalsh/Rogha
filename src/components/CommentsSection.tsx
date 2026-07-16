import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trash2 } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useLike } from "@/hooks/useLike";
import { LikeButton } from "./LikeButton";
import { ContentOverflowMenu } from "./ContentOverflowMenu";
import toast from "react-hot-toast";
import type { AudienceType } from "@/types/index";

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
  onDelete,
  onBlocked,
  currentUserId,
  depth = 0,
}: {
  comment: CommentType;
  onReply: (parentId: string, content: string) => Promise<{ ok: boolean; error?: string }>;
  onDelete: (id: string, parentId?: string) => void;
  onBlocked: (authorId: string) => void;
  currentUserId: string | null;
  depth?: number;
}) {
  const [reported, setReported] = useState(false);
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
    const { ok, error } = await onReply(comment.id, reply);
    if (ok) {
      setReply("");
      setShowReply(false);
    } else {
      toast.error(error ?? "Failed to post reply. Please try again.");
    }
  }

  if (reported) return null;

  return (
    <div id={`comment-${comment.id}`} className="space-y-2 scroll-mt-60">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 border shrink-0">
            <AvatarImage src={comment.author.image ?? "/placeholder-user.jpg"} />
            <AvatarFallback>{comment.author.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="font-medium truncate min-w-0">
            {comment.author.name ?? "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {timeAgo(new Date(comment.createdAt))}
          </span>
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        <div className="flex items-center gap-2">
          <LikeButton
            liked={liked}
            count={count}
            onToggle={toggle}
            fetchLikersUrl={`/api/comments/${comment.id}/likes`}
          />
          {currentUserId === comment.author.id ? (
            <button
              onClick={() => onDelete(comment.id, undefined)}
              className="text-muted-foreground hover:text-destructive transition-colors"
              aria-label="Delete comment"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : currentUserId ? (
            <ContentOverflowMenu
              contentType="COMMENT"
              contentId={comment.id}
              authorId={comment.author.id}
              authorName={comment.author.name ?? comment.author.id}
              onReported={() => setReported(true)}
              onBlocked={() => onBlocked(comment.author.id)}
            />
          ) : null}
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
              onDelete={(id) => onDelete(id, comment.id)}
              onBlocked={onBlocked}
              currentUserId={currentUserId}
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
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                placeholder="Write a reply..."
                className="overflow-hidden resize-none"
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
  postAuthorId,
  postAuthorName,
  postAudienceType,
}: {
  postId: string;
  postAuthorId: string;
  postAuthorName: string;
  postAudienceType: AudienceType;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<Set<string>>(new Set());

  function handleBlocked(authorId: string) {
    if (authorId === postAuthorId) {
      router.replace("/");
      return;
    }
    setBlockedAuthorIds((prev) => new Set(Array.from(prev).concat(authorId)));
  }

  // Shared, app-wide cache — primed at the root by MePreloader, so this is
  // instant rather than a fresh cold fetch on every article mount.
  const { data: me } = useSWR<{ id: string }>("/api/me");
  const currentUserId = me?.id ?? null;

  // revalidateIfStale: false — comment add/reply/delete are managed via the
  // local `comments` state below (with optimistic updates), so a background
  // revalidation racing an in-flight optimistic update could clobber it.
  // The upside of SWR here is instant comments on back-navigation; freshness
  // beyond that isn't critical for a comment thread.
  const { data: commentsData } = useSWR<CommentType[]>(
    `/api/posts/${postId}/comments`,
    { revalidateIfStale: false }
  );

  // Seed local state once per postId when the cached/fetched data arrives —
  // not on every render, so it doesn't stomp on optimistic add/reply/delete.
  const seededForIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!commentsData || seededForIdRef.current === postId) return;
    seededForIdRef.current = postId;
    setComments(
      [...commentsData].sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      )
    );
  }, [commentsData, postId]);

  const loadingComments = seededForIdRef.current !== postId;

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
    if (!newComment.trim() || submitting) return;
    setSubmitting(true);

    const text = newComment;
    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentType = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      author: { id: "me", name: "You", image: "/placeholder-user.jpg" },
      replies: [],
      likeCount: 0,
      likedByMe: false,
    };

    setComments((prev) => [...prev, optimisticComment]);

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();

      setComments((prev) =>
        prev.map((c) =>
          c.id === tempId ? { ...created, likeCount: 0, likedByMe: false } : c
        )
      );
      setNewComment("");
    } catch (err: any) {
      console.error("Failed to post comment:", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      toast.error(err.message ?? "Failed to post comment. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }
  async function addReply(parentId: string, content: string): Promise<{ ok: boolean; error?: string }> {
    if (!content.trim()) return { ok: false };

    const tempId = `temp-${Date.now()}`;
    const optimisticReply: CommentType = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      author: { id: "me", name: "You", image: "/placeholder-user.jpg" },
      replies: [],
      likeCount: 0,
      likedByMe: false,
    };

    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId
          ? { ...c, replies: [...c.replies, optimisticReply] }
          : c
      )
    );

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, parentId }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();

      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? {
                ...c,
                replies: c.replies.map((r) =>
                  r.id === tempId
                    ? { ...created, likeCount: 0, likedByMe: false }
                    : r
                ),
              }
            : c
        )
      );
      return { ok: true };
    } catch (err: any) {
      console.error("Failed to post reply:", err);
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== tempId) }
            : c
        )
      );
      return { ok: false, error: err.message };
    }
  }

  async function deleteComment(id: string, parentId?: string) {
    if (!confirm("Delete this comment?")) return;

    const res = await fetch(`/api/comments/${id}/replies`, { method: "DELETE" });
    if (!res.ok) return;

    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== id) }
            : c
        )
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== id));
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
        {postAudienceType === "FRIENDS" && (
          <p className="text-sm italic text-orange-500 mb-4">
            Comments are visible to all {postAuthorName}'s friends
          </p>
        )}
        {postAudienceType === "ALL_USERS" && (
          <p className="text-sm italic text-orange-500 mb-4">
            Comments are visible to all Rogha users
          </p>
        )}
        {postAudienceType === "CIRCLE" && (
          <p className="text-sm italic text-orange-500 mb-4">
            Comments are visible to all members of this circle
          </p>
        )}
      </div>

      <div className="space-y-6">
        {loadingComments ? (
          <div className="flex justify-center p-4">
            <Spinner />
          </div>
        ) : (
          comments
            .filter((c) => !blockedAuthorIds.has(c.author.id))
            .map((c) => (
              <CommentItem key={c.id} comment={c} onReply={addReply} onDelete={deleteComment} onBlocked={handleBlocked} currentUserId={currentUserId} />
            ))
        )}
      </div>

      <h2 className="text-2xl font-bold">Join the conversation</h2>
      <div className="grid gap-2">
        <Textarea
          placeholder="Write your comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${el.scrollHeight}px`;
          }}
          className="overflow-hidden resize-none"
        />
        <Button
          onClick={addComment}
          disabled={submitting || !newComment.trim()}
        >
          {submitting ? "Posting..." : "Submit"}
        </Button>{" "}
      </div>
    </div>
  );
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d`;
  return date.toLocaleDateString();
}
