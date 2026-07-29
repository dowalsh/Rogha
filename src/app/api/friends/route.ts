export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { getMutualFriendCount } from "@/lib/friends";

type Box = "accepted" | "incoming" | "outgoing";

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const sp = req.nextUrl.searchParams;
    const box = (sp.get("box") as Box) ?? "accepted";
    const limitParam = Number(sp.get("limit") ?? "50");
    const limit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 100)
      : 50;

    const rows = await prisma.friendship.findMany({
      where: { OR: [{ aId: user.id }, { bId: user.id }] },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        aId: true,
        bId: true,
        requesterId: true,
        status: true, // "PENDING" | "ACCEPTED"
        createdAt: true,
        acceptedAt: true,
        a: { select: { id: true, name: true, image: true, username: true } },
        b: { select: { id: true, name: true, image: true, username: true } },
      },
    });

    const filtered = rows
      .map((r) => {
        const amA = r.aId === user.id;
        const other = amA ? r.b : r.a;
        const state =
          r.status === "ACCEPTED"
            ? "ACCEPTED"
            : r.requesterId === user.id
            ? "PENDING_OUTGOING"
            : "PENDING_INCOMING";

        return {
          state, // "ACCEPTED" | "PENDING_OUTGOING" | "PENDING_INCOMING"
          createdAt: r.createdAt,
          acceptedAt: r.acceptedAt,
          user: {
            id: other?.id ?? "",
            name: other?.name ?? null,
            image: other?.image ?? null,
            username: other?.username ?? null,
          },
        };
      })
      .filter((item) => {
        if (box === "incoming") return item.state === "PENDING_INCOMING";
        if (box === "outgoing") return item.state === "PENDING_OUTGOING";
        return item.state === "ACCEPTED";
      });

    // Mutual-friend count only matters for incoming requests (home card /
    // stranger-relationship context) — skip the extra queries otherwise.
    const items =
      box === "incoming"
        ? await Promise.all(
            filtered.map(async (item) => ({
              ...item,
              mutualCount: item.user.id
                ? await getMutualFriendCount(user.id, item.user.id)
                : 0,
            }))
          )
        : filtered;

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[FRIENDS_LIST_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
