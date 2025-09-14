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
