export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const { id } = await params;

  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      content: true,
      status: true,
      heroImageUrl: true,
      createdAt: true,
      audienceType: true,
      author: { select: { id: true, username: true, name: true, image: true, email: true } },
      comments: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          content: true,
          status: true,
          createdAt: true,
          parentCommentId: true,
          author: { select: { username: true, name: true } },
        },
      },
    },
  });

  if (!post) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  return NextResponse.json(post);
}
