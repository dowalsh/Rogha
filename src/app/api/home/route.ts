// src/app/api/home/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getHomeData } from "@/lib/home";

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const earlierLimitParam = req.nextUrl.searchParams.get("earlierLimit");
    const earlierLimit = earlierLimitParam ? parseInt(earlierLimitParam, 10) : undefined;

    const home = await getHomeData(user.id, {
      earlierLimit: Number.isFinite(earlierLimit) ? earlierLimit : undefined,
    });

    return NextResponse.json(home, { status: 200 });
  } catch (e) {
    console.error("[HOME_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
