// src/app/api/editions/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getFilteredEditionById } from "@/lib/editions";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("[DEBUG] GET /api/editions/[id] called with params:", params);
  try {
    const { user, error } = await getDbUser();
    console.log("[DEBUG] getDbUser result:", { user, error });
    if (error) {
      console.log("[DEBUG] getDbUser error:", error);
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const edition = await getFilteredEditionById(user, params.id);
    console.log("[DEBUG] getFilteredEditionById result:", edition);
    if (!edition) {
      console.log("[DEBUG] Edition not found for id:", params.id);
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.log("[DEBUG] Returning edition:", edition);
    return NextResponse.json(edition, { status: 200 });
  } catch (e) {
    console.error("[EDITION_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
