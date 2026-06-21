export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

// PATCH /api/admin/reports/[id]
// body: { action: "remove_content" | "dismiss" }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const { id } = await params;
  const { action } = (await req.json()) as { action: "remove_content" | "dismiss" };

  if (action !== "remove_content" && action !== "dismiss") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const report = await prisma.report.findUnique({
    where: { id },
    select: { contentType: true, contentId: true },
  });
  if (!report) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  if (action === "remove_content") {
    await prisma.$transaction(async (tx) => {
      if (report.contentType === "POST") {
        await tx.post.update({ where: { id: report.contentId }, data: { status: "REMOVED" } });
      } else {
        await tx.comment.update({ where: { id: report.contentId }, data: { status: "REMOVED" } });
      }
      await tx.report.update({ where: { id }, data: { status: "ACTIONED" } });
    });
  } else {
    await prisma.report.update({ where: { id }, data: { status: "DISMISSED" } });
  }

  return NextResponse.json({ ok: true });
}
