export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const comments = await prisma.comment.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      content: true,
      status: true,
      createdAt: true,
      author: { select: { id: true, username: true, name: true, email: true } },
      post: { select: { id: true, title: true } },
    },
  });

  return NextResponse.json(comments);
}
