// src/app/api/circles/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCirclesForUser } from "@/actions/circle.action";

export async function GET(_req: NextRequest) {
  try {
    console.log("[CIRCLES_GET] start");
    const circles = await getCirclesForUser(); // auth handled inside via getDbUserId()
    console.log("[CIRCLES_GET] count:", circles?.length ?? 0);
    return NextResponse.json(circles, { status: 200 });
  } catch (error: any) {
    console.error("[CIRCLES_GET_ERROR]", error);
    // Map common auth error text to 401; everything else 500
    const msg = error?.message ?? "Internal Server Error";
    const status = /Not authenticated/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
