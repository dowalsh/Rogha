export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getUserInsights } from "@/lib/insights/userDrilldown";

export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const { userId } = await params;
  const insights = await getUserInsights(userId);
  if (!insights) return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  return NextResponse.json(insights);
}
