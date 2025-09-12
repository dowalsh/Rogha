export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { canonicalPair } from "@/lib/friends";

export async function POST(
  _req: NextRequest,
  ctx: { params: { userId: string } }
) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const otherId = ctx.params.userId;
    const { aId, bId } = canonicalPair(user.id, otherId);

    const row = await prisma.friendship.findUnique({
      where: { aId_bId: { aId, bId } },
      select: { status: true, requesterId: true },
    });

    if (!row || row.status !== "PENDING") {
      return NextResponse.json(
        {
          code: "friends.NO_PENDING",
          message: "No incoming request to decline.",
        },
        { status: 404 }
      );
    }

    if (row.requesterId === user.id) {
      return NextResponse.json(
        {
          code: "friends.ONLY_ADDRESSEE_CAN_DECLINE",
          message: "Only the recipient can decline.",
        },
        { status: 403 }
      );
    }

    await prisma.friendship.delete({ where: { aId_bId: { aId, bId } } });

    console.log("friends.decline", { meId: user.id, otherId, outcome: "NONE" });
    return NextResponse.json({ state: "NONE" as const }, { status: 200 });
  } catch (err) {
    console.error("[FRIENDS_DECLINE_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
