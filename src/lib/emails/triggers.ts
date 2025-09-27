// lib/email/triggers.ts
import { sendEmail } from "./sender";
import { buildPostSubmittedEmail } from "./builders";
import { PrismaClient } from "@/generated/prisma";
import { getAcceptedFriendRecipients } from "../friends";

const db = new PrismaClient();

export async function triggerPostSubmittedEmails(postId: string) {
  if (!postId) throw new Error("postId required");

  const appUrl = process.env.APP_URL || "";
  if (!appUrl) throw new Error("APP_URL is not set");

  // Fetch only what we need
  const post = await db.post.findUnique({
    where: { id: postId },
    select: {
      id: true,
      title: true,
      author: { select: { id: true, name: true } },
    },
  });

  if (!post) throw new Error(`Post not found: ${postId}`);
  if (!post.author) throw new Error(`Post ${postId} has no author`);

  // New: pull accepted friends with valid emails via helper
  const recipients = await getAcceptedFriendRecipients(post.author.id);
  if (recipients.length === 0) return { sent: 0 };

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
      batch.map((r) =>
        sendEmail({
          to: r.email,
          subject: email.subject,
          html: email.html,
        })
      )
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        console.error("email fan-out failure", {
          postId,
          error: (r as any)?.reason?.message ?? r,
        });
      }
    }
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

  // Build email (simple text version for now)
  const subject = "This Week’s Rogha Edition is Live!";
  const html = `
    <h1>The weekly edition has dropped 📰🔥</h1>
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
