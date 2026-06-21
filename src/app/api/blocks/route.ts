export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";

export async function POST(req: NextRequest) {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const { blockedId } = (await req.json()) as { blockedId: string };
  if (!blockedId) return NextResponse.json({ error: "Missing blockedId" }, { status: 400 });
  if (blockedId === user.id) return NextResponse.json({ error: "Cannot block yourself" }, { status: 400 });

  await prisma.block.upsert({
    where: { blockerId_blockedId: { blockerId: user.id, blockedId } },
    create: { blockerId: user.id, blockedId },
    update: {},
  });

  return NextResponse.json({ blocked: true }, { status: 201 });
}
