// src/app/api/buzz/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getBuzz } from "@/lib/buzz";

export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const buzz = await getBuzz({ userId: user.id });

    if (process.env.NODE_ENV === "development") {
      console.log("[BUZZ API] Feed requested by user:", user.id);
      console.log("[BUZZ API] Returning items:", buzz.length);
    }

    return NextResponse.json(buzz, { status: 200 });
  } catch (e) {
    console.error("[BUZZ_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
