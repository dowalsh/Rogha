export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getWeeklyAdminStats } from "@/lib/adminStats";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const stats = await getWeeklyAdminStats();
  return NextResponse.json(stats);
}
