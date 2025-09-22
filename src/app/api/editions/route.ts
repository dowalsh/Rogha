// src/app/api/editions/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getPublishedEditions } from "@/lib/editions";

export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const editions = await getPublishedEditions(user);
    return NextResponse.json(editions, { status: 200 });
  } catch (e) {
    console.error("[EDITIONS_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
