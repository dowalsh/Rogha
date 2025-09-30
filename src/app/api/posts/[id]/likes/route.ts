// src/app/api/posts/[id]/likes/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  const { id } = context.params;

  const likes = await prisma.postLike.findMany({
    where: { postId: id },
    include: {
      user: { select: { id: true, name: true, image: true } },
    },
  });

  return NextResponse.json(likes.map((l) => l.user));
}
