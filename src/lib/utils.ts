import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
// utils/notificationLinks.ts

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// src/lib/utils.ts

// Compute Monday 00:00:00 in LA, return as UTC Date
export function getWeekStartUTC(d = new Date()): Date {
  const la = new Date(
    d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );

  const day = la.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = (day + 6) % 7; // days since Monday
  la.setDate(la.getDate() - diff); // go back to Monday
  la.setHours(0, 0, 0, 0);

  return la; // JS Date is UTC internally
}

// Short relative time, Twitter/X style: "5m ago", "6h ago", "3d ago".
export function shortTimeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export function formatWeekLabel(date: Date): string {
  const la = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  return la.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

type NotificationWithRelations = {
  id: string;
  type: "LIKE" | "COMMENT" | "SUBMIT" | "FRIEND_REQUEST" | "FRIEND_REQUEST_ACCEPTED";
  postId?: string | null;
  commentId?: string | null;
  post?: { id: string | null } | null;
  comment?: { id: string | null; postId?: string | null } | null;
  creator?: { username?: string | null } | null;
};

export function getNotificationLink(
  n: NotificationWithRelations
): string | null {
  console.log("[getNotificationLink] full input:", JSON.stringify(n, null, 2));

  if (n.type === "LIKE" || n.type === "COMMENT") {
    console.log("[getNotificationLink] type is LIKE/COMMENT");

    if (n.commentId) {
      console.log("[getNotificationLink] found commentId:", n.commentId);
      const basePostId = n.postId ?? n.comment?.postId ?? n.post?.id;
      console.log("[getNotificationLink] resolved basePostId:", basePostId);

      if (basePostId) {
        const url = `/reader/${basePostId}#comment-${n.commentId}`;
        console.log("[getNotificationLink] built comment URL:", url);
        return url;
      } else {
        console.warn(
          "[getNotificationLink] commentId exists but no basePostId!"
        );
        return `#comment-${n.commentId}`;
      }
    }

    if (n.postId ?? n.post?.id) {
      const url = `/reader/${n.postId ?? n.post?.id}`;
      console.log("[getNotificationLink] built post URL:", url);
      return url;
    }

    console.warn(
      "[getNotificationLink] LIKE/COMMENT had no postId or commentId"
    );
  }

  if (n.type === "SUBMIT") {
    return null;
  }

  if (n.type === "FRIEND_REQUEST") {
    return "/friends";
  }

  if (n.type === "FRIEND_REQUEST_ACCEPTED") {
    return n.creator?.username ? `/profile/${n.creator.username}` : "/friends";
  }

  console.warn(
    "[getNotificationLink] no matching type/postId/commentId, returning '/'"
  );
  return "/";
}
