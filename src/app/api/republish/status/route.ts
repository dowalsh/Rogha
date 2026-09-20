// src/app/api/republish/status/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { hasRepublishRationAvailable, hasPublishedPost } from "@/lib/republish";

// Global republish eligibility check — used to disable/hide the Republish
// action wherever it appears without a per-post round trip. `available` is
// the weekly ration; `hasPublishedPost` is whether the user has anything a
// Republish could even target (independent of the ration).
export async function GET() {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const [available, hasPost] = await Promise.all([
      hasRepublishRationAvailable(user.id),
      hasPublishedPost(user.id),
    ]);
    return NextResponse.json(
      { available, hasPublishedPost: hasPost },
      { status: 200 },
    );
  } catch (err) {
    console.error("[REPUBLISH_STATUS_GET_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
