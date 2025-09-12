export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { canonicalPair } from "@/lib/friends";

export async function DELETE(
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
      select: { status: true },
    });

    if (!row) {
      return NextResponse.json({ state: "NONE" as const }, { status: 200 });
    }

    if (row.status === "PENDING") {
      return NextResponse.json(
        {
          code: "friends.CANNOT_UNFRIEND_PENDING",
          message: "Cannot unfriend while request is pending.",
        },
        { status: 403 }
      );
    }

    await prisma.friendship.delete({ where: { aId_bId: { aId, bId } } });

    console.log("friends.unfriend", {
      meId: user.id,
      otherId,
      outcome: "NONE",
    });
    return NextResponse.json({ state: "NONE" as const }, { status: 200 });
  } catch (err) {
    console.error("[FRIENDS_DELETE_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
