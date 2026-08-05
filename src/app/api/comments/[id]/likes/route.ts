// src/app/api/comments/[id]/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { requirePostAccess } from "@/lib/access/postAccess";

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { postId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // Anonymous is allowed through (ALL_USERS posts are publicly likeable),
  // but the like list must still respect the parent post's actual audience.
  const { user } = await getDbUser().catch(() => ({ user: null }));
  const post = await requirePostAccess(user?.id ?? null, comment.postId);
  if (!post) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  const likes = await prisma.commentLike.findMany({
    where: { commentId: id },
    include: {
      user: { select: { id: true, username: true, image: true } },
    },
  });

  return NextResponse.json(likes.map((l) => l.user));
}
