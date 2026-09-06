export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { backfillEditionSummaries } from "@/lib/insights/edition";

export async function POST() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const result = await backfillEditionSummaries();
  return NextResponse.json(result);
}
