export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";

export async function POST(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id: commentId } = context.params;

    // check if already liked
    const existing = await prisma.commentLike.findUnique({
      where: {
        userId_commentId: { userId: user.id, commentId },
      },
    });

    if (existing) {
      await prisma.commentLike.delete({ where: { id: existing.id } });
      return NextResponse.json({ liked: false }, { status: 200 });
    } else {
      await prisma.commentLike.create({
        data: { userId: user.id, commentId },
      });
      return NextResponse.json({ liked: true }, { status: 201 });
    }
  } catch (e) {
    console.error("[COMMENT_LIKE_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
