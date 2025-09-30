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
      console.log("[POST_LIKE] auth error", error);
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id: postId } = context.params;
    console.log("[POST_LIKE] user", user.id, "post", postId);

    const existing = await prisma.postLike.findUnique({
      where: { userId_postId: { userId: user.id, postId } },
    });
    console.log("[POST_LIKE] existing?", !!existing);

    if (existing) {
      await prisma.postLike.delete({ where: { id: existing.id } });
      console.log("[POST_LIKE] deleted like", existing.id);
      return NextResponse.json({ liked: false }, { status: 200 });
    } else {
      const newLike = await prisma.postLike.create({
        data: { userId: user.id, postId },
      });
      console.log("[POST_LIKE] created like", newLike);
      return NextResponse.json({ liked: true }, { status: 201 });
    }
  } catch (e) {
    console.error("[POST_LIKE_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
