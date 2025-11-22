// lib/email/triggers.ts
import { sendEmail } from "./sender";
import {
  buildCommentNotificationEmail,
  buildPostSubmittedEmail,
} from "./builders";
import { PrismaClient } from "@/generated/prisma";
import { getAcceptedFriendRecipients } from "../friends";

const db = new PrismaClient();

export async function triggerPostSubmittedEmails(
  postId: string,
  recipientIds: string[]
) {
  if (!postId) throw new Error("postId required");
  if (!recipientIds?.length) return { sent: 0 };

  const appUrl = process.env.APP_URL;
  if (!appUrl) throw new Error("APP_URL is not set");

  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!post || !post.author) return { sent: 0 };

  // Only send to the explicit recipients we were given
  const users = await db.user.findMany({
    where: {
      id: { in: recipientIds },
    },
    select: { email: true },
  });

  const recipients = users
    .map((u) => u.email)
    .filter((email): email is string => !!email);

  if (!recipients.length) return { sent: 0 };

  const email = buildPostSubmittedEmail(
    post.author.name ?? "",
    post.title ?? "",
    appUrl
  );

  const batchSize = 25;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((to) =>
        sendEmail({
          to,
          subject: email.subject,
          html: email.html,
        })
      )
    );

    sent += results.filter((r) => r.status === "fulfilled").length;

    results
      .filter((r): r is PromiseRejectedResult => r.status === "rejected")
      .forEach((r) => {
        console.error("[EMAIL_FAN_OUT_ERROR]", {
          postId,
          error: r.reason,
        });
      });
  }

  return { sent };
}

export async function triggerPublishedEditionEmail() {
  const appUrl = process.env.APP_URL || "";
  if (!appUrl) throw new Error("APP_URL is not set");

  // Future: fetch edition/posts if needed
  // const edition = await db.edition.findUnique({ ... });

  // Get all users with a valid email
  const recipients = await db.user.findMany({
    where: { email: { not: undefined } },
    select: { email: true },
  });

  if (recipients.length === 0) return { sent: 0 };

  // <h1>The weekly edition has dropped 📰🔥</h1>

  // Build email (simple text version for now)
  const subject = "This Week’s Rogha Edition is Live!";
  const html = `
    <h1>Another week, another weekly edition full of beautiful content from your friends 📰🔥</h1>
    
    <p>All the posts from this week are now live.</p>
    <p>Come check them out and join the convo!</p>
    <p>
      <a href="${appUrl}/editions"
         style="display:inline-block;padding:10px 16px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
        Read the edition
      </a>
    </p>
  `;

  const batchSize = 25;
  let sent = 0;

  for (let i = 0; i < recipients.length; i += batchSize) {
    const batch = recipients.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map((r) =>
        sendEmail({
          to: r.email!,
          subject,
          html,
        })
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        console.error("weekly edition email failure", {
          error: (r as any)?.reason?.message ?? r,
        });
      }
    }
  }

  return { sent };
}

type CommentEmailInput = {
  to: string; // recipient email
  actorName: string; // who commented
  commentText: string; // comment content
  url: string; // link to the post/comment
  postTitle?: string | null;
  isReply?: boolean; // true = reply, false = comment on post
};

export async function triggerCommentNotificationEmail(
  input: CommentEmailInput
) {
  const { to, actorName, commentText, url, postTitle, isReply } = input;

  // use your builder
  const email = buildCommentNotificationEmail(
    actorName,
    commentText,
    url,
    postTitle ?? undefined,
    isReply ?? false
  );

  // send email
  await sendEmail({
    to,
    subject: email.subject,
    html: email.html,
  });
}
