// src/app/api/circles/share-picker/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCirclesForSharePicker } from "@/actions/circle.action";

export async function GET(_req: NextRequest) {
  try {
    const circles = await getCirclesForSharePicker(); // auth handled inside via getDbUserId()
    return NextResponse.json(circles, { status: 200 });
  } catch (error: any) {
    console.error("[CIRCLES_SHARE_PICKER_GET_ERROR]", error);
    const msg = error?.message ?? "Internal Server Error";
    const status = /Not authenticated/i.test(msg) ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
