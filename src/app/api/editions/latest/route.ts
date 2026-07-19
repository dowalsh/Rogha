// src/app/api/editions/latest/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import {
  getMostRecentPublishedEditionForUser,
  getPublishedEditionById,
} from "@/lib/editions";

export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const latest = await getMostRecentPublishedEditionForUser();
    if (!latest) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const edition = await getPublishedEditionById(user, latest.id);
    if (!edition) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(edition, { status: 200 });
  } catch (e) {
    console.error("[EDITIONS_LATEST_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
