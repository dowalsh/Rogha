import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { Capacitor } from "@capacitor/core";
import { Keyboard } from "@capacitor/keyboard";
import useSWR from "swr";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Reply as ReplyIcon } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useLike } from "@/hooks/useLike";
import { LikeButton } from "./LikeButton";
import { ContentOverflowMenu } from "./ContentOverflowMenu";
import toast from "react-hot-toast";
import type { AudienceType } from "@/types/index";
import { cn } from "@/lib/utils";

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

function CommentActions({
  comment,
  currentUserId,
  onDelete,
  onBlocked,
  onReported,
}: {
  comment: CommentType;
  currentUserId: string | null;
  onDelete: () => void;
  onBlocked: (authorId: string) => void;
  onReported: () => void;
}) {
  if (currentUserId === comment.author.id) {
    return (
      <button
        onClick={onDelete}
        className="ml-auto shrink-0 text-muted-foreground hover:text-destructive transition-colors"
        aria-label="Delete comment"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    );
  }
  if (currentUserId) {
    return (
      <div className="ml-auto shrink-0">
        <ContentOverflowMenu
          contentType="COMMENT"
          contentId={comment.id}
          authorId={comment.author.id}
          authorName={comment.author.name ?? comment.author.id}
          onReported={onReported}
          onBlocked={() => onBlocked(comment.author.id)}
        />
      </div>
    );
  }
  return null;
}

// Flat, one level deep — replies never recurse further (no reply-to-a-reply).
function ReplyItem({
  reply,
  onDelete,
  onBlocked,
  currentUserId,
}: {
  reply: CommentType;
  onDelete: (id: string) => void;
  onBlocked: (authorId: string) => void;
  currentUserId: string | null;
}) {
  const [reported, setReported] = useState(false);

  const { liked, count, toggle } = useLike({
    id: reply.id,
    type: "comment",
    initialLiked: reply.likedByMe,
    initialCount: reply.likeCount,
  });

  if (reported) return null;

  return (
    <div id={`comment-${reply.id}`} className="space-y-1.5 scroll-mt-60">
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6 border shrink-0">
          <AvatarImage src={reply.author.image ?? "/avatar.png"} />
          <AvatarFallback>{reply.author.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate min-w-0">
          {reply.author.name ?? "Unknown"}
        </span>
        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
          {timeAgo(new Date(reply.createdAt))}
        </span>
        <CommentActions
          comment={reply}
          currentUserId={currentUserId}
          onDelete={() => onDelete(reply.id)}
          onBlocked={onBlocked}
          onReported={() => setReported(true)}
        />
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
        {reply.content}
      </p>
      <div className="flex items-center gap-2">
        <LikeButton
          liked={liked}
          count={count}
          onToggle={toggle}
          fetchLikersUrl={`/api/comments/${reply.id}/likes`}
        />
      </div>
    </div>
  );
}

function CommentItem({
  comment,
  onReplyClick,
  onDelete,
  onBlocked,
  currentUserId,
  pulsing,
}: {
  comment: CommentType;
  onReplyClick: (commentId: string, authorName: string) => void;
  onDelete: (id: string, parentId?: string) => void;
  onBlocked: (authorId: string) => void;
  currentUserId: string | null;
  pulsing: boolean;
}) {
  const [reported, setReported] = useState(false);

  const { liked, count, toggle } = useLike({
    id: comment.id,
    type: "comment",
    initialLiked: comment.likedByMe,
    initialCount: comment.likeCount,
  });

  if (reported) return null;

  return (
    <div
      id={`comment-${comment.id}`}
      className={cn(
        "space-y-2 scroll-mt-60 rounded-md transition-colors duration-700",
        pulsing ? "bg-muted/70" : "bg-transparent"
      )}
    >
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <Avatar className="h-9 w-9 border shrink-0">
            <AvatarImage src={comment.author.image ?? "/avatar.png"} />
            <AvatarFallback>{comment.author.name?.[0] ?? "?"}</AvatarFallback>
          </Avatar>
          <span className="font-medium truncate min-w-0">
            {comment.author.name ?? "Unknown"}
          </span>
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {timeAgo(new Date(comment.createdAt))}
          </span>
          <CommentActions
            comment={comment}
            currentUserId={currentUserId}
            onDelete={() => onDelete(comment.id, undefined)}
            onBlocked={onBlocked}
            onReported={() => setReported(true)}
          />
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
        </div>
      </div>

      {/* replies — flat, one level; thin line groups them under the parent */}
      {comment.replies?.length > 0 && (
        <div className="relative space-y-3 pl-9">
          <div className="absolute left-4 top-0 bottom-2 w-px bg-border" />
          {comment.replies.map((r) => (
            <ReplyItem
              key={r.id}
              reply={r}
              onDelete={(id) => onDelete(id, comment.id)}
              onBlocked={onBlocked}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      )}

      {/* reply — hands off to the single bottom composer */}
      <div className="ml-12 mt-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 gap-1 px-2 text-xs text-muted-foreground"
          onClick={() =>
            onReplyClick(comment.id, comment.author.name ?? "Unknown")
          }
        >
          <ReplyIcon className="h-3 w-3" />
          Reply
        </Button>
      </div>
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
  const { user } = useUser();
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<Set<string>>(new Set());
  const [composerOpen, setComposerOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<{ id: string; name: string } | null>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const keyboardOpenRef = useRef(false);
  const pendingScrollIdRef = useRef<string | null>(null);

  // Imperative focus with preventScroll — the browser's own "scroll focused
  // input into view" (which autoFocus would trigger) stacks on top of our
  // own performScroll math and overshoots the target off-screen.
  useEffect(() => {
    if (composerOpen) {
      textareaRef.current?.focus({ preventScroll: true });
    }
  }, [composerOpen, replyingTo?.id]);

  // Dragging the thread while the keyboard is up should dismiss it (like
  // Mail/Messages) rather than fight it — blur lets keyboardDidHide fire and
  // the composer settle back at the true bottom, in-progress draft intact.
  useEffect(() => {
    function handleTouchMove() {
      const active = document.activeElement;
      if (active instanceof HTMLElement && composerRef.current?.contains(active)) {
        active.blur();
      }
    }
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => window.removeEventListener("touchmove", handleTouchMove);
  }, []);

  // Native keyboard open/close lags behind focus by an animation — scrolling
  // before it settles (and the WKWebView's resize:"native" frame shrink lands)
  // computes against the wrong viewport height. Wait for keyboardDidShow.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const didShow = Keyboard.addListener("keyboardDidShow", () => {
      keyboardOpenRef.current = true;
      if (pendingScrollIdRef.current) {
        const id = pendingScrollIdRef.current;
        pendingScrollIdRef.current = null;
        performScroll(id);
      }
    });
    const didHide = Keyboard.addListener("keyboardDidHide", () => {
      keyboardOpenRef.current = false;
    });

    return () => {
      didShow.then((l) => l.remove());
      didHide.then((l) => l.remove());
    };
  }, []);

  // Scrolls so the target comment's bottom edge sits flush against the
  // composer's top — anchored to the bottom, showing as much thread above
  // as fits rather than centering or overscrolling past it.
  function performScroll(id: string) {
    const el = document.getElementById(`comment-${id}`);
    if (!el) return;
    const composerHeight = composerRef.current?.getBoundingClientRect().height ?? 0;
    const desiredBottom = window.innerHeight - composerHeight;
    const delta = el.getBoundingClientRect().bottom - desiredBottom;
    window.scrollBy({ top: delta, behavior: "smooth" });
    setPulsingId(id);
    setTimeout(() => setPulsingId((cur) => (cur === id ? null : cur)), 900);
  }

  function scrollToComment(id: string) {
    // On native, if the keyboard isn't up yet, the composer is about to
    // expand and the keyboard is about to open — defer until it settles.
    if (Capacitor.isNativePlatform() && !keyboardOpenRef.current) {
      pendingScrollIdRef.current = id;
      return;
    }
    performScroll(id);
  }

  function handleReplyClick(commentId: string, authorName: string) {
    setReplyingTo({ id: commentId, name: authorName });
    setComposerOpen(true);
    scrollToComment(commentId);
  }

  function closeComposer() {
    setComposerOpen(false);
    setReplyingTo(null);
    setNewComment("");
  }

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

  async function addComment(text: string): Promise<{ ok: boolean; error?: string }> {
    if (!text.trim()) return { ok: false };

    const tempId = `temp-${Date.now()}`;
    const optimisticComment: CommentType = {
      id: tempId,
      content: text,
      createdAt: new Date().toISOString(),
      author: { id: "me", name: "You", image: "/avatar.png" },
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
      return { ok: true };
    } catch (err: any) {
      console.error("Failed to post comment:", err);
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      return { ok: false, error: err.message };
    }
  }
  async function addReply(parentId: string, content: string): Promise<{ ok: boolean; error?: string }> {
    if (!content.trim()) return { ok: false };

    const tempId = `temp-${Date.now()}`;
    const optimisticReply: CommentType = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      author: { id: "me", name: "You", image: "/avatar.png" },
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

  async function submitComposer() {
    const text = newComment.trim();
    if (!text || submitting) return;
    setSubmitting(true);

    const { ok, error } = replyingTo
      ? await addReply(replyingTo.id, text)
      : await addComment(text);

    if (ok) {
      closeComposer();
    } else {
      toast.error(error ?? "Failed to post. Please try again.");
    }
    setSubmitting(false);
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
    <div
      className="mx-auto max-w-2xl space-y-8 pt-8"
      style={{ paddingBottom: "calc(6rem + env(safe-area-inset-bottom))" }}
    >
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
              <CommentItem key={c.id} comment={c} onReplyClick={handleReplyClick} onDelete={deleteComment} onBlocked={handleBlocked} currentUserId={currentUserId} pulsing={pulsingId === c.id} />
            ))
        )}
      </div>

      <div ref={composerRef} className="fixed inset-x-0 bottom-0 z-10 border-t bg-background">
        <div
          className="mx-auto max-w-2xl px-4 pt-3"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        >
          {replyingTo && (
            <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
              <button
                onClick={() => scrollToComment(replyingTo.id)}
                className="hover:text-foreground"
              >
                Replying to{" "}
                <span className="font-medium text-foreground">
                  {replyingTo.name}
                </span>
              </button>
            </div>
          )}
          {!composerOpen ? (
            <button
              onClick={() => setComposerOpen(true)}
              className="flex w-full items-center gap-3 rounded-full border px-4 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-muted"
            >
              <Avatar className="h-7 w-7 border shrink-0">
                <AvatarImage src={user?.imageUrl ?? "/avatar.png"} />
                <AvatarFallback>?</AvatarFallback>
              </Avatar>
              Add a comment…
            </button>
          ) : (
            <div className="space-y-2">
              <Textarea
                key={replyingTo?.id ?? "top-level"}
                ref={textareaRef}
                placeholder={
                  replyingTo ? `Reply to ${replyingTo.name}...` : "Write your comment..."
                }
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onInput={(e) => {
                  const el = e.currentTarget;
                  el.style.height = "auto";
                  el.style.height = `${el.scrollHeight}px`;
                }}
                className="overflow-hidden resize-none"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={closeComposer}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={submitComposer}
                  disabled={submitting || !newComment.trim()}
                >
                  {submitting ? "Posting..." : "Submit"}
                </Button>
              </div>
            </div>
          )}
        </div>
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
