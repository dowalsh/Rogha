export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { joinCircleByCode } from "@/actions/circle.action";

// POST — auth-guarded. Joins the current user to the invite's circle.
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  try {
    const { code } = await context.params;
    const result = await joinCircleByCode(code);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[INVITE_JOIN_ERROR]", error);
    const msg = error?.message ?? "Internal Server Error";
    const status = /Not authenticated/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
