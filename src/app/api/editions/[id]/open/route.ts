export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { prisma } from "@/lib/prisma";

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getDbUser();
  if (error)
    return NextResponse.json({ error: error.code }, { status: error.status });

  await prisma.editionView.upsert({
    where: { editionId_userId: { editionId: params.id, userId: user.id } },
    create: { editionId: params.id, userId: user.id },
    update: {},
  });

  return NextResponse.json({ ok: true });
}
