export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getTopline } from "@/lib/insights/topline";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const data = await getTopline();
  return NextResponse.json(data);
}
