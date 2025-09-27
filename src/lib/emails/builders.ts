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
    `,
  };
}
