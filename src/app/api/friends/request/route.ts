export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { canonicalPair } from "@/lib/friends";

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
        a: { select: { id: true, name: true, image: true } },
        b: { select: { id: true, name: true, image: true } },
      },
    });

    const items = rows
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
          },
        };
      })
      .filter((item) => {
        if (box === "incoming") return item.state === "PENDING_INCOMING";
        if (box === "outgoing") return item.state === "PENDING_OUTGOING";
        return item.state === "ACCEPTED";
      });

    return NextResponse.json({ items }, { status: 200 });
  } catch (err) {
    console.error("[FRIENDS_LIST_GET_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const body = await req.json().catch(() => ({}));
    const email = (body?.email ?? "").toString().trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        { code: "common.INVALID_INPUT", message: "Email is required." },
        { status: 400 }
      );
    }

    const target = await prisma.user.findUnique({ where: { email } });
    if (!target) {
      return NextResponse.json(
        { code: "common.USER_NOT_FOUND", message: "No user with that email." },
        { status: 404 }
      );
    }

    if (target.id === user.id) {
      return NextResponse.json(
        {
          code: "friends.SELF_NOT_ALLOWED",
          message: "You cannot friend yourself.",
        },
        { status: 409 }
      );
    }

    const { aId, bId } = canonicalPair(user.id, target.id);

    const existing = await prisma.friendship.findUnique({
      where: { aId_bId: { aId, bId } },
      select: { status: true, requesterId: true },
    });

    if (!existing) {
      await prisma.friendship.create({
        data: {
          aId,
          bId,
          requesterId: user.id,
          status: "PENDING",
        },
      });
      console.log("friends.request", {
        meId: user.id,
        targetId: target.id,
        outcome: "PENDING_OUTGOING",
      });
      return NextResponse.json(
        { state: "PENDING_OUTGOING" as const },
        { status: 201 }
      );
    }

    if (existing.status === "ACCEPTED") {
      return NextResponse.json(
        {
          code: "friends.ALREADY_FRIENDS",
          message: "You are already friends.",
        },
        { status: 409 }
      );
    }

    // PENDING
    if (existing.requesterId === user.id) {
      return NextResponse.json(
        {
          code: "friends.REQUEST_ALREADY_PENDING",
          message: "Request already pending.",
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        code: "friends.OPPOSITE_PENDING_EXISTS",
        message: "Incoming request already exists.",
      },
      { status: 409 }
    );
  } catch (err) {
    console.error("[FRIENDS_REQUEST_POST_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
