// lib/email/builders.ts
export type BuiltEmail = {
  subject: string;
  html: string;
};

export function buildPostSubmittedEmail(
  authorName: string,
  postTitle: string,
  appUrl: string
): BuiltEmail {
  const safeAuthor = authorName?.trim() || "A writer you follow";
  const safeTitle = postTitle?.trim() || "a new post";
  const safeUrl = appUrl?.replace(/\/$/, "") || "";

  return {
    subject: `${safeAuthor} just submitted a new post!`,
    html: `
      <h1>${safeAuthor} has cooked ✍️🔥</h1>
      <p>They just submitted: <strong>${safeTitle}</strong></p>
      <p>All posts will be published together this Sunday. Hope you’ve got one in the works too!</p>
      <p>
        <a href="${safeUrl}/posts"
           style="display:inline-block;padding:10px 16px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
          Go to your posts
        </a>
      </p>
      <p style="margin-top:24px;font-size:12px;color:#888;">
        Don’t want these emails? <a href="${safeUrl}/settings" style="color:#888;">Manage notification settings</a>
      </p>
    `,
  };
}

// lib/email/builders.ts
export function buildCommentNotificationEmail(
  actorName: string,
  commentText: string,
  postUrl: string,
  postTitle?: string,
  isReply?: boolean,
  baseUrl?: string
): BuiltEmail {
  const safeActor = actorName?.trim() || "Someone";
  const safeComment = commentText?.trim() || "";
  const safeUrl = postUrl?.replace(/\/$/, "") || "";
  const safeBase = (baseUrl ?? postUrl)?.replace(/\/$/, "") || "";
  const safeTitle = postTitle?.trim();

  const subject = isReply
    ? `${safeActor} replied to your comment`
    : safeTitle
      ? `${safeActor} commented on your post "${safeTitle}"`
      : `${safeActor} commented on your post`;

  const html = `
    <h1>${safeActor} ${isReply ? "replied to your comment" : "left a comment"}</h1>
    ${safeTitle ? `<p>On: <strong>${safeTitle}</strong></p>` : ""}
    <blockquote style="margin:12px 0; padding:12px; background:#f9f9f9; border-left:4px solid #ccc;">
      ${safeComment}
    </blockquote>
    <p>
      <a href="${safeUrl}"
         style="display:inline-block;padding:10px 16px;background:#000;color:#fff;text-decoration:none;border-radius:6px;">
        View the conversation
      </a>
    </p>
    <p style="margin-top:24px;font-size:12px;color:#888;">
      Don't want these emails? <a href="${safeBase}/settings" style="color:#888;">Manage notification settings</a>
    </p>
  `;

  return { subject, html };
}
