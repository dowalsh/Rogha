export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { setUsername } from "@/lib/username";

export async function POST(req: NextRequest) {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const body = await req.json().catch(() => ({}));
  const username = (body?.username ?? "").toString();
  if (!username) {
    return NextResponse.json({ error: "Username is required." }, { status: 400 });
  }

  const result = await setUsername(user.id, username);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 409 });
  }

  return NextResponse.json({ username: result.username });
}
