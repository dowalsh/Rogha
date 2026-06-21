export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const reports = await prisma.report.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      contentType: true,
      contentId: true,
      status: true,
      createdAt: true,
      reporter: { select: { id: true, username: true, name: true, email: true } },
    },
  });

  // Attach a content preview for each report
  const withPreviews = await Promise.all(
    reports.map(async (r) => {
      let preview = "";
      if (r.contentType === "POST") {
        const post = await prisma.post.findUnique({
          where: { id: r.contentId },
          select: { title: true, status: true, author: { select: { username: true, name: true } } },
        });
        preview = post?.title ?? "(untitled)";
        return { ...r, preview, contentStatus: post?.status ?? null, contentAuthor: post?.author ?? null };
      } else {
        const comment = await prisma.comment.findUnique({
          where: { id: r.contentId },
          select: { content: true, status: true, postId: true, author: { select: { username: true, name: true } } },
        });
        preview = comment?.content ?? "";
        return { ...r, preview, contentStatus: comment?.status ?? null, contentAuthor: comment?.author ?? null, postId: comment?.postId ?? null };
      }
    }),
  );

  return NextResponse.json(withPreviews);
}
