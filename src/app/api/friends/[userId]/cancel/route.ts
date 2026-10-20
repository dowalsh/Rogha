export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { canonicalPair } from "@/lib/friends";

// Requester withdraws their own not-yet-accepted request — the mirror of
// decline, which only the recipient may use.
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
          message: "No outgoing request to cancel.",
        },
        { status: 404 }
      );
    }

    if (row.requesterId !== user.id) {
      return NextResponse.json(
        {
          code: "friends.ONLY_REQUESTER_CAN_CANCEL",
          message: "Only the sender can cancel.",
        },
        { status: 403 }
      );
    }

    // Drop the recipient's FRIEND_REQUEST notification too, so they aren't
    // left with a request that no longer exists.
    await prisma.$transaction([
      prisma.friendship.delete({ where: { aId_bId: { aId, bId } } }),
      prisma.notification.deleteMany({
        where: { userId: otherId, creatorId: user.id, type: "FRIEND_REQUEST" },
      }),
    ]);

    console.log("friends.cancel", { meId: user.id, otherId, outcome: "NONE" });
    return NextResponse.json({ state: "NONE" as const }, { status: 200 });
  } catch (err) {
    console.error("[FRIENDS_CANCEL_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
