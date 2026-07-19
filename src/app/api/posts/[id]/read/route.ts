export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { requirePostAccess } from "@/lib/access/postAccess";
import { markPostRead } from "@/lib/postReads";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getDbUser();
  if (error)
    return NextResponse.json({ error: error.code }, { status: error.status });

  const post = await requirePostAccess(user.id, params.id);
  if (!post) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  await markPostRead(user.id, params.id);

  return NextResponse.json({ ok: true });
}
