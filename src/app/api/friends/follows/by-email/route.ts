// src/app/api/follows/by-email/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    // Auth → email → db user
    const { userId } = await auth();
    if (!userId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await currentUser();
    const myEmail = user?.emailAddresses?.[0]?.emailAddress ?? null;
    if (!myEmail)
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );

    const me = await prisma.user.findUnique({
      where: { email: myEmail },
      select: { id: true },
    });
    if (!me)
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );

    // Parse body
    const body = await req.json().catch(() => ({} as { email?: string }));
    const targetEmail = (body.email ?? "").trim().toLowerCase();
    if (!targetEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    // Find target user by email (exact match)
    const target = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true },
    });
    if (!target) {
      return NextResponse.json(
        { error: "No user with that email" },
        { status: 404 }
      );
    }
    if (target.id === me.id) {
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 409 }
      );
    }

    // Upsert follow edge (idempotent)
    const key = {
      followerId_followingId: { followerId: me.id, followingId: target.id },
    };
    const existing = await prisma.follows.findUnique({ where: key });

    if (existing) {
      // Already following — treat as success (MVP behavior)
      return NextResponse.json(
        { ok: true, alreadyFollowing: true },
        { status: 200 }
      );
    }

    await prisma.follows.create({
      data: { followerId: me.id, followingId: target.id },
    });

    // (Optional) create a FOLLOW notification here later

    return NextResponse.json(
      { ok: true, alreadyFollowing: false },
      { status: 200 }
    );
  } catch (e) {
    console.error("[FOLLOW_BY_EMAIL_POST_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
