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

export function formatWeekLabel(date: Date): string {
  const la = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  return la.toISOString().slice(0, 10); // "YYYY-MM-DD"
}

type NotificationWithRelations = {
  id: string;
  type: "LIKE" | "COMMENT" | "SUBMIT";
  postId?: string | null;
  commentId?: string | null;
  post?: { id: string | null } | null;
  comment?: { id: string | null; postId?: string | null } | null; // ✅ add postId
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

  console.warn(
    "[getNotificationLink] no matching type/postId/commentId, returning '/'"
  );
  return "/";
}
