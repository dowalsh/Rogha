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

    // canonical pair (throws only if self, which won't be the case here)
    const { aId, bId } = canonicalPair(user.id, otherId);

    const row = await prisma.friendship.findUnique({
      where: { aId_bId: { aId, bId } },
      select: { status: true, requesterId: true },
    });

    if (!row || row.status !== "PENDING") {
      return NextResponse.json(
        {
          code: "friends.NO_PENDING",
          message: "No incoming request to accept.",
        },
        { status: 404 }
      );
    }

    if (row.requesterId === user.id) {
      return NextResponse.json(
        {
          code: "friends.ONLY_ADDRESSEE_CAN_ACCEPT",
          message: "Only the recipient can accept.",
        },
        { status: 403 }
      );
    }

    await prisma.friendship.update({
      where: { aId_bId: { aId, bId } },
      data: { status: "ACCEPTED", acceptedAt: new Date() },
    });

    console.log("friends.accept", {
      meId: user.id,
      otherId,
      outcome: "ACCEPTED",
    });
    return NextResponse.json({ state: "ACCEPTED" as const }, { status: 200 });
  } catch (err) {
    console.error("[FRIENDS_ACCEPT_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
