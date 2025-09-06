// src/app/api/editions/publish/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";

function isAdminEmail(email?: string | null) {
  console.log("admin verificaiotn...");
  const list =
    process.env.ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return email ? list.includes(email.toLowerCase()) : false;
}

/**
 * POST /api/editions/publish
 * Body (optional): { weekISO: "YYYY-MM-DD" }  // Monday in your canonical TZ
 * Default behavior: publish LAST week's edition (based on "yesterday").
 */
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
    if (!isAdminEmail(email))
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body = await req.json().catch(() => ({} as { weekISO?: string }));
    const { weekISO } = body as { weekISO?: string };

    // If a week is provided (e.g. "2025-09-01"), use it; else default to last week
    let target = weekISO
      ? new Date(weekISO)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (isNaN(target.getTime())) {
      return NextResponse.json(
        { error: "Invalid weekISO date" },
        { status: 400 }
      );
    }

    const weekStart = getWeekStartUTC(target); // Monday 00:00 LA (stored UTC)
    const weekLabel = formatWeekLabel(weekStart);

    const result = await prisma.$transaction(async (tx) => {
      // Ensure the edition exists
      const edition = await tx.edition.upsert({
        where: { weekStart },
        update: {},
        create: { weekStart, title: `Week of ${weekLabel}` },
        select: { id: true, publishedAt: true },
      });

      // Only stamp publishedAt once
      if (!edition.publishedAt) {
        await tx.edition.update({
          where: { id: edition.id },
          data: { publishedAt: new Date() },
        });
      }

      // Promote all attached posts to PUBLISHED
      const { count } = await tx.post.updateMany({
        where: {
          editionId: edition.id,
          status: { in: ["DRAFT", "SUBMITTED"] },
        },
        data: { status: "PUBLISHED" },
      });

      return {
        editionId: edition.id,
        alreadyPublished: Boolean(edition.publishedAt),
        postsPublished: count,
      };
    });

    return NextResponse.json(
      {
        ok: true,
        editionId: result.editionId,
        alreadyPublished: result.alreadyPublished,
        postsPublished: result.postsPublished,
        weekStart: weekStart.toISOString(),
      },
      { status: 200 }
    );
  } catch (e) {
    console.error("[EDITION_PUBLISH_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
