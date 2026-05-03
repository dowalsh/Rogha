export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";
import { prisma } from "@/lib/prisma";
import { getAcceptedFriendships } from "@/lib/friends";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { user, error } = await getDbUser();
  if (error)
    return NextResponse.json({ error: error.code }, { status: error.status });

  const friendships = await getAcceptedFriendships(user.id);
  const friendIds = friendships.map((f) => f.friendId);

  const [viewRecord, viewerPreview, viewerCount] = await Promise.all([
    prisma.editionView.findUnique({
      where: { editionId_userId: { editionId: params.id, userId: user.id } },
      select: { openedAt: true },
    }),
    prisma.editionView.findMany({
      where: { editionId: params.id, userId: { in: friendIds } },
      orderBy: { openedAt: "asc" },
      take: 2,
      select: { user: { select: { name: true } } },
    }),
    prisma.editionView.count({
      where: { editionId: params.id, userId: { in: friendIds } },
    }),
  ]);

  return NextResponse.json({
    hasOpened: Boolean(viewRecord),
    viewerCount,
    viewerNames: viewerPreview.map((v) => v.user.name ?? "Someone"),
  });
}
