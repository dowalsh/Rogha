import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import useSWR from "swr";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Trash2, Reply as ReplyIcon, AlertCircle } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import { useLike } from "@/hooks/useLike";
import { LikeButton } from "./LikeButton";
import { ContentOverflowMenu } from "./ContentOverflowMenu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  // Client-only, never sent to/from the server, and deliberately not named
  // `status` — the API's Comment.status ("ACTIVE"/"REMOVED"/…) already
  // spreads onto every real comment via `...c` in the GET normalizer, and a
  // same-named client field would collide with it (every real comment would
  // read as truthy → "failed"). Absent = confirmed/real.
  deliveryStatus?: "sending" | "failed";
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

// Lives where the timestamp normally sits, while sending.
function SendingIndicator() {
  return (
    <span className="flex items-center gap-1.5 text-xs text-muted-foreground whitespace-nowrap shrink-0">
      <Spinner className="h-3 w-3" />
      Sending…
    </span>
  );
}

// Failed state: a red exclamation icon in the same top-right slot the "…"
// overflow menu normally occupies (Instagram/iMessage style) — tapping it,
// or anywhere else on the (dimmed) row, opens Retry/Delete. Controlled from
// the parent row so both triggers can open the same popover.
function FailedCommentActions({
  open,
  onOpenChange,
  onRetry,
  onDiscard,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onDiscard: () => void;
}) {
  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="ml-auto shrink-0 text-destructive"
          aria-label="Failed to send"
        >
          <AlertCircle className="h-4 w-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-36 p-1"
        align="end"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="w-full rounded-sm px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
          onClick={() => {
            onOpenChange(false);
            onRetry();
          }}
        >
          Retry
        </button>
        <button
          className="w-full rounded-sm px-3 py-2 text-left text-sm text-destructive hover:bg-muted transition-colors"
          onClick={() => {
            onOpenChange(false);
            onDiscard();
          }}
        >
          Delete
        </button>
      </PopoverContent>
    </Popover>
  );
}

// Flat, one level deep — replies never recurse further (no reply-to-a-reply).
function ReplyItem({
  reply,
  onDelete,
  onBlocked,
  currentUserId,
  onRetry,
  onDiscard,
}: {
  reply: CommentType;
  onDelete: (id: string) => void;
  onBlocked: (authorId: string) => void;
  currentUserId: string | null;
  onRetry: (id: string) => void;
  onDiscard: (id: string) => void;
}) {
  const [reported, setReported] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const failed = reply.deliveryStatus === "failed";

  const { liked, count, toggle } = useLike({
    id: reply.id,
    type: "comment",
    initialLiked: reply.likedByMe,
    initialCount: reply.likeCount,
  });

  if (reported) return null;

  return (
    <div
      id={`comment-${reply.id}`}
      onClick={failed ? () => setActionsOpen(true) : undefined}
      className={cn("space-y-1.5 scroll-mt-60", failed && "opacity-50")}
    >
      <div className="flex items-center gap-2">
        <Avatar className="h-6 w-6 border shrink-0">
          <AvatarImage src={reply.author.image ?? "/avatar.png"} />
          <AvatarFallback>{reply.author.name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-medium truncate min-w-0">
          {reply.author.name ?? "Unknown"}
        </span>
        {reply.deliveryStatus === "sending" ? (
          <SendingIndicator />
        ) : !reply.deliveryStatus ? (
          <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
            {timeAgo(new Date(reply.createdAt))}
          </span>
        ) : null}
        {!reply.deliveryStatus && (
          <CommentActions
            comment={reply}
            currentUserId={currentUserId}
            onDelete={() => onDelete(reply.id)}
            onBlocked={onBlocked}
            onReported={() => setReported(true)}
          />
        )}
        {failed && (
          <FailedCommentActions
            open={actionsOpen}
            onOpenChange={setActionsOpen}
            onRetry={() => onRetry(reply.id)}
            onDiscard={() => onDiscard(reply.id)}
          />
        )}
      </div>
      <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
        {reply.content}
      </p>
      {!reply.deliveryStatus && (
        <div className="flex items-center gap-2">
          <LikeButton
            liked={liked}
            count={count}
            onToggle={toggle}
            fetchLikersUrl={`/api/comments/${reply.id}/likes`}
          />
        </div>
      )}
    </div>
  );
}

function InlineReplyComposer({
  name,
  value,
  onChange,
  onCancel,
  onSubmit,
}: {
  name: string;
  value: string;
  onChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on mount (no preventScroll) — iOS lifts this above the keyboard,
  // and since it's the DOM node right after the target comment, the target
  // ends up sitting directly on top of it. No scroll math needed.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="pl-9 mt-2 space-y-2">
      {/* Actions above the textarea: iOS only guarantees the focused input
          itself sits above the keyboard — anything rendered below it can
          end up hidden behind it. */}
      <div className="flex items-center gap-2 text-xs justify-end">
        <button
          onClick={onCancel}
          className="text-muted-foreground hover:text-foreground"
        >
          Cancel
        </button>
        {/* <span className="flex-1 truncate text-muted-foreground">
          Replying to{" "}
          <span className="font-medium text-foreground">{name}</span>
        </span> */}
        <Button size="sm" onClick={onSubmit} disabled={!value.trim()}>
          Submit
        </Button>
      </div>
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onInput={(e) => {
          const el = e.currentTarget;
          el.style.height = "auto";
          el.style.height = `${el.scrollHeight}px`;
        }}
        placeholder={`Reply to ${name}...`}
        className="overflow-hidden resize-none"
      />
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
  isReplying,
  replyingToName,
  replyText,
  onReplyTextChange,
  onSubmitReply,
  onCancelReply,
  onRetry,
  onDiscard,
}: {
  comment: CommentType;
  onReplyClick: (
    commentId: string,
    authorName: string,
    parentId: string,
  ) => void;
  onDelete: (id: string, parentId?: string) => void;
  onBlocked: (authorId: string) => void;
  currentUserId: string | null;
  pulsing: boolean;
  isReplying: boolean;
  replyingToName: string;
  replyText: string;
  onReplyTextChange: (value: string) => void;
  onSubmitReply: () => void;
  onCancelReply: () => void;
  onRetry: (id: string, parentId?: string) => void;
  onDiscard: (id: string, parentId?: string) => void;
}) {
  const [reported, setReported] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const failed = comment.deliveryStatus === "failed";

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
      onClick={failed ? () => setActionsOpen(true) : undefined}
      className={cn(
        "space-y-2 scroll-mt-60 rounded-md transition-colors duration-700",
        pulsing ? "bg-muted/70" : "bg-transparent",
        failed && "opacity-50",
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
          {comment.deliveryStatus === "sending" ? (
            <SendingIndicator />
          ) : !comment.deliveryStatus ? (
            <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
              {timeAgo(new Date(comment.createdAt))}
            </span>
          ) : null}
          {!comment.deliveryStatus && (
            <CommentActions
              comment={comment}
              currentUserId={currentUserId}
              onDelete={() => onDelete(comment.id, undefined)}
              onBlocked={onBlocked}
              onReported={() => setReported(true)}
            />
          )}
          {failed && (
            <FailedCommentActions
              open={actionsOpen}
              onOpenChange={setActionsOpen}
              onRetry={() => onRetry(comment.id)}
              onDiscard={() => onDiscard(comment.id)}
            />
          )}
        </div>
        <p className="text-sm text-muted-foreground whitespace-pre-wrap break-words">
          {comment.content}
        </p>
        {!comment.deliveryStatus && (
          <div className="flex items-center gap-2">
            <LikeButton
              liked={liked}
              count={count}
              onToggle={toggle}
              fetchLikersUrl={`/api/comments/${comment.id}/likes`}
            />
          </div>
        )}
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
              onRetry={(id) => onRetry(id, comment.id)}
              onDiscard={(id) => onDiscard(id, comment.id)}
            />
          ))}
        </div>
      )}

      {/* inline, in-place reply composer — renders right after this
          thread's replies so the target is directly above it by DOM
          order, replacing the Reply button while active */}
      {!comment.deliveryStatus &&
        (isReplying ? (
          <InlineReplyComposer
            name={replyingToName}
            value={replyText}
            onChange={onReplyTextChange}
            onCancel={onCancelReply}
            onSubmit={onSubmitReply}
          />
        ) : (
          <div className="ml-12 mt-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-6 gap-1 px-2 text-xs text-muted-foreground"
              onClick={() =>
                onReplyClick(
                  comment.id,
                  comment.author.name ?? "Unknown",
                  comment.id,
                )
              }
            >
              <ReplyIcon className="h-3 w-3" />
              Reply
            </Button>
          </div>
        ))}
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
  const [blockedAuthorIds, setBlockedAuthorIds] = useState<Set<string>>(
    new Set(),
  );
  const [composerOpen, setComposerOpen] = useState(false);
  // parentId is always the top-level comment a reply attaches to (threading
  // is flat/one-level) — id is whichever comment/reply was actually tapped,
  // used for the highlight pulse.
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
    parentId: string;
  } | null>(null);
  const [pulsingId, setPulsingId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // No preventScroll here — letting the browser's native "scroll focused
  // input into view" run is the point: on iOS it lifts the focused textarea
  // above the keyboard on its own, no scroll math needed. Only the bottom
  // (new top-level comment) composer uses this ref/effect — the inline
  // reply composer focuses itself on mount.
  useEffect(() => {
    if (composerOpen) {
      textareaRef.current?.focus();
    }
  }, [composerOpen]);

  // Dragging the thread while the keyboard is up should dismiss it (like
  // Mail/Messages) rather than fight it — blur lets the keyboard hide and
  // the composer (or inline reply box) settle back in place, draft intact.
  useEffect(() => {
    function handleTouchMove() {
      const active = document.activeElement;
      if (active instanceof HTMLTextAreaElement) {
        active.blur();
      }
    }
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => window.removeEventListener("touchmove", handleTouchMove);
  }, []);

  function handleReplyClick(
    commentId: string,
    authorName: string,
    parentId: string,
  ) {
    setReplyingTo({ id: commentId, name: authorName, parentId });
    setPulsingId(commentId);
    setTimeout(
      () => setPulsingId((cur) => (cur === commentId ? null : cur)),
      900,
    );
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
    { revalidateIfStale: false },
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
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      ),
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

  // Updates one local comment/reply in place — a top-level comment
  // (parentId undefined) or a reply nested under parentId. Shared by the
  // success swap-in and the sending/failed status flips below.
  function updateLocalComment(
    id: string,
    parentId: string | undefined,
    updater: (c: CommentType) => CommentType,
  ) {
    setComments((prev) =>
      prev.map((c) => {
        if (parentId) {
          if (c.id !== parentId) return c;
          return {
            ...c,
            replies: c.replies.map((r) => (r.id === id ? updater(r) : r)),
          };
        }
        return c.id === id ? updater(c) : c;
      }),
    );
  }

  // Fires the actual POST for an already-inserted optimistic item (id) and
  // reconciles it in place — real server data on success, deliveryStatus:
  // "failed" (never removed) on failure so Retry/Delete have something to
  // act on. `created` carries the API's own `status` field (moderation
  // status) — left as-is on the object; it's a different field from ours.
  async function postComment(id: string, content: string, parentId?: string) {
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parentId ? { content, parentId } : { content }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const created = await res.json();

      updateLocalComment(id, parentId, () => ({
        ...created,
        likeCount: 0,
        likedByMe: false,
      }));
    } catch (err) {
      console.error("Failed to post comment:", err);
      updateLocalComment(id, parentId, (c) => ({
        ...c,
        deliveryStatus: "failed",
      }));
    }
  }

  // Inserts the optimistic item with deliveryStatus: "sending" and kicks off
  // the POST in the background — the composer closes immediately regardless
  // of outcome, so this never blocks on the network.
  function submitDraft(content: string, parentId?: string) {
    const tempId = `temp-${Date.now()}`;
    const optimistic: CommentType = {
      id: tempId,
      content,
      createdAt: new Date().toISOString(),
      author: { id: "me", name: "You", image: "/avatar.png" },
      replies: [],
      likeCount: 0,
      likedByMe: false,
      deliveryStatus: "sending",
    };

    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: [...c.replies, optimistic] }
            : c,
        ),
      );
    } else {
      setComments((prev) => [...prev, optimistic]);
    }

    postComment(tempId, content, parentId);
  }

  // Re-sends a failed item in place — same id/slot, not a new duplicate.
  function retryComment(id: string, parentId?: string) {
    const source = parentId
      ? comments.find((c) => c.id === parentId)?.replies.find((r) => r.id === id)
      : comments.find((c) => c.id === id);
    if (!source) return;

    updateLocalComment(id, parentId, (c) => ({
      ...c,
      deliveryStatus: "sending",
    }));
    postComment(id, source.content, parentId);
  }

  // Removes a local-only failed item outright — nothing was ever persisted,
  // so no server call and no confirm dialog (unlike deleting a real comment).
  function discardComment(id: string, parentId?: string) {
    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== id) }
            : c,
        ),
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  }

  function submitComposer() {
    const text = newComment.trim();
    if (!text) return;
    submitDraft(text, replyingTo?.parentId);
    closeComposer();
  }

  async function deleteComment(id: string, parentId?: string) {
    if (!confirm("Delete this comment?")) return;

    const res = await fetch(`/api/comments/${id}/replies`, {
      method: "DELETE",
    });
    if (!res.ok) return;

    if (parentId) {
      setComments((prev) =>
        prev.map((c) =>
          c.id === parentId
            ? { ...c, replies: c.replies.filter((r) => r.id !== id) }
            : c,
        ),
      );
    } else {
      setComments((prev) => prev.filter((c) => c.id !== id));
    }
  }

  const totalComments = comments.reduce(
    (acc, c) => acc + 1 + c.replies.length,
    0,
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

      <div className="space-y-6 pb-[50vh]">
        {loadingComments ? (
          <div className="flex justify-center p-4">
            <Spinner />
          </div>
        ) : (
          comments
            .filter((c) => !blockedAuthorIds.has(c.author.id))
            .map((c) => (
              <CommentItem
                key={c.id}
                comment={c}
                onReplyClick={handleReplyClick}
                onDelete={deleteComment}
                onBlocked={handleBlocked}
                currentUserId={currentUserId}
                pulsing={pulsingId === c.id}
                isReplying={replyingTo?.parentId === c.id}
                replyingToName={replyingTo?.name ?? ""}
                replyText={newComment}
                onReplyTextChange={setNewComment}
                onSubmitReply={submitComposer}
                onCancelReply={closeComposer}
                onRetry={retryComment}
                onDiscard={discardComment}
              />
            ))
        )}
      </div>

      {/* Bottom sticky composer — new top-level comments only. Hidden while
          replying so it doesn't float over the inline reply composer. */}
      {!replyingTo && (
        <div className="sticky bottom-0 z-10 -mx-4 border-t bg-background sm:mx-0">
          <div
            className="mx-auto max-w-2xl px-4 pt-3"
            style={{
              paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
            }}
          >
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
                  ref={textareaRef}
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
                <div className="flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={closeComposer}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={submitComposer}
                    disabled={!newComment.trim()}
                  >
                    Submit
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
