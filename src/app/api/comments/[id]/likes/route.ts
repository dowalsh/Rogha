// src/app/api/comments/[id]/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { requirePostAccess } from "@/lib/access/postAccess";
import { requireTrackAccess } from "@/lib/access/trackAccess";

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const comment = await prisma.comment.findUnique({
    where: { id },
    select: { postId: true, weeklyTrackId: true },
  });
  if (!comment) {
    return NextResponse.json({ error: "Not Found" }, { status: 404 });
  }

  // Anonymous is allowed through for posts (ALL_USERS posts are publicly
  // likeable) but never for tracks, which have no anonymous-visible audience.
  const { user } = await getDbUser().catch(() => ({ user: null }));
  const hasAccess = comment.postId
    ? await requirePostAccess(user?.id ?? null, comment.postId)
    : comment.weeklyTrackId
      ? await requireTrackAccess(user?.id ?? null, comment.weeklyTrackId)
      : null;
  if (!hasAccess) {
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
