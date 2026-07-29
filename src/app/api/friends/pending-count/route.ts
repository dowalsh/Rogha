export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { getPendingIncomingCount } from "@/lib/friends";

export async function GET() {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const count = await getPendingIncomingCount(user.id);
  return NextResponse.json({ count });
}
