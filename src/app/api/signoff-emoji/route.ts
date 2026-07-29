export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { prisma } from "@/lib/prisma";
import { isValidSignoffEmoji } from "@/lib/emoji";

export async function POST(req: NextRequest) {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const body = await req.json().catch(() => ({}));
  const emoji = (body?.emoji ?? "").toString().trim();

  if (emoji && !isValidSignoffEmoji(emoji)) {
    return NextResponse.json({ error: "Please pick a single emoji." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { signoffEmoji: emoji || null },
  });

  return NextResponse.json({ signoffEmoji: emoji || null });
}
