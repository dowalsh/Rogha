export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const { userId: blockedId } = await params;

  await prisma.block.deleteMany({
    where: { blockerId: user.id, blockedId },
  });

  return NextResponse.json({ unblocked: true });
}
