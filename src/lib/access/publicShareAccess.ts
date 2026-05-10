// src/lib/access/publicShareAccess.ts
// Separate from postAccess.ts — does NOT call canViewPost.
// Anonymous users are allowed when the author explicitly created a public link.

import { prisma } from "@/lib/prisma";

export type PublicPostData = {
  id: string;
  title: string | null;
  content: unknown;
  heroImageUrl: string | null;
  updatedAt: Date;
  author: {
    name: string | null;
    image: string | null;
  } | null;
};

export async function getPostByShareToken(
  token: string,
): Promise<PublicPostData | null> {
  const post = await prisma.post.findFirst({
    where: {
      publicShareToken: token,
      publicShareEnabled: true,
      status: { notIn: ["DRAFT", "ARCHIVED"] },
    },
    select: {
      id: true,
      title: true,
      content: true,
      heroImageUrl: true,
      updatedAt: true,
      author: { select: { name: true, image: true } },
    },
  });

  return post;
}
