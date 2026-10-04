export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCircleInviteInfo } from "@/actions/circle.action";

// GET — public invite lookup, no auth. Backs the /join/[code] page (and its
// client-side re-check after sign-in redirects back).
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;
  const info = await getCircleInviteInfo(code);
  return NextResponse.json(info);
}
