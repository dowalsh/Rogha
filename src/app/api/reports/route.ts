export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { triggerReportEmail } from "@/lib/emails/triggers";
import { ContentType } from "@/generated/prisma/enums";

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) return NextResponse.json({ error: error.code }, { status: error.status });

    const body = await req.json();
    const { contentType, contentId } = body as {
      contentType: "POST" | "COMMENT";
      contentId: string;
    };

    if (!contentType || !contentId) {
      return NextResponse.json({ error: "Missing contentType or contentId" }, { status: 400 });
    }
    if (contentType !== "POST" && contentType !== "COMMENT") {
      return NextResponse.json({ error: "Invalid contentType" }, { status: 400 });
    }

    // Verify content exists and reporter is not the author
    let contentText = "";
    if (contentType === "POST") {
      const post = await prisma.post.findUnique({
        where: { id: contentId },
        select: { authorId: true, title: true },
      });
      if (!post) return NextResponse.json({ error: "Not Found" }, { status: 404 });
      if (post.authorId === user.id) {
        return NextResponse.json({ error: "Cannot report your own content" }, { status: 403 });
      }
      contentText = post.title ?? "(untitled)";
    } else {
      const comment = await prisma.comment.findUnique({
        where: { id: contentId },
        select: { authorId: true, content: true },
      });
      if (!comment) return NextResponse.json({ error: "Not Found" }, { status: 404 });
      if (comment.authorId === user.id) {
        return NextResponse.json({ error: "Cannot report your own content" }, { status: 403 });
      }
      contentText = comment.content.slice(0, 500);
    }

    // Upsert — idempotent, unique constraint prevents duplicates
    const report = await prisma.report.upsert({
      where: {
        contentType_contentId_reporterId: {
          contentType: contentType as ContentType,
          contentId,
          reporterId: user.id,
        },
      },
      create: {
        contentType: contentType as ContentType,
        contentId,
        reporterId: user.id,
      },
      update: {},
      select: { id: true, createdAt: true },
    });

    // Fire email non-blocking (failure must not block the response)
    triggerReportEmail({
      reportId: report.id,
      contentType,
      contentId,
      contentText,
      reporterName: user.name ?? user.username,
      reporterEmail: user.email,
      timestamp: report.createdAt,
    });

    return NextResponse.json({ reported: true }, { status: 201 });
  } catch (err) {
    console.error("[REPORTS_POST_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
