export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getTopTrackLastWeek } from "@/lib/lastfm";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: "FORBIDDEN" }, { status: error.status });

  const apiKey = process.env.LASTFM_API_KEY;
  const username = process.env.LASTFM_TEST_USERNAME;
  if (!apiKey || !username) {
    return NextResponse.json({ error: "NOT_CONFIGURED" }, { status: 500 });
  }

  const result = await getTopTrackLastWeek(username, apiKey);
  if ("error" in result) {
    return NextResponse.json({ error: "LASTFM_ERROR" }, { status: 502 });
  }

  return NextResponse.json({ track: result.track });
}
