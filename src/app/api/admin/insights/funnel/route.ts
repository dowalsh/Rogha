export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getFunnel, getFunnelableEditions } from "@/lib/insights/funnel";

export async function GET(req: NextRequest) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const editionId = req.nextUrl.searchParams.get("editionId") ?? undefined;
  const [funnel, editions] = await Promise.all([getFunnel(editionId), getFunnelableEditions()]);
  return NextResponse.json({ funnel, editions });
}
