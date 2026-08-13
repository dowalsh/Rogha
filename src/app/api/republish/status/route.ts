// src/app/api/republish/status/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { hasRepublishRationAvailable } from "@/lib/republish";

// Global, ration-only check — used to disable/hide the Republish action
// wherever it appears without a per-post round trip.
export async function GET() {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const available = await hasRepublishRationAvailable(user.id);
    return NextResponse.json({ available }, { status: 200 });
  } catch (err) {
    console.error("[REPUBLISH_STATUS_GET_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
