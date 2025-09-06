// src/app/api/cron/publish-weekly/route.ts
export const runtime = "nodejs"; // Prisma needs Node runtime. :contentReference[oaicite:2]{index=2}

import { NextRequest, NextResponse } from "next/server";
import { publishEditionForWeek } from "@/lib/editions";
import { getWeekStartUTC } from "@/lib/utils";

// Accept GET (Vercel Cron) and POST (manual trigger)
export async function GET(req: NextRequest) {
  return handlePublish(req);
}
export async function POST(req: NextRequest) {
  return handlePublish(req);
}

async function handlePublish(req: NextRequest) {
  console.log("handling publish!");
  // Vercel Cron sends: Authorization: Bearer <CRON_SECRET>
  const authz = req.headers.get("authorization");
  if (!authz || authz !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Publish LAST week's edition (see note below about timezone)
  const target = new Date(Date.now() - 24 * 60 * 60 * 1000); // "yesterday"
  const targetWeekStart = getWeekStartUTC(target);

  const result = await publishEditionForWeek(targetWeekStart);
  return NextResponse.json(
    {
      ok: result.ok,
      published: result.published,
      reason: result["reason"],
      editionId: result["editionId"],
      postsPublished: result["postsPublished"],
      weekStart: targetWeekStart.toISOString(),
    },
    { status: 200 }
  );
}
