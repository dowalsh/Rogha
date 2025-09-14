// src/app/api/follows/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// Clerk → email → db user (your existing pattern)
async function getMeId() {
  const { userId } = await auth();
  if (!userId) return { status: 401 as const, error: "Unauthorized" as const };

  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress ?? null;
  if (!email)
    return { status: 400 as const, error: "User email not found" as const };

  const me = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!me)
    return {
      status: 404 as const,
      error: "User not found in database" as const,
    };

  return { status: 200 as const, meId: me.id };
}

// GET /api/follows → list who I follow
export async function GET() {
  try {
    const me = await getMeId();
    if ("error" in me)
      return NextResponse.json({ error: me.error }, { status: me.status });

    const edges = await prisma.follows.findMany({
      where: { followerId: me.meId },
      orderBy: { createdAt: "desc" },
      select: {
        following: {
          select: { id: true, name: true, username: true, image: true },
        },
      },
    });

    const users = edges.map((e) => e.following).filter(Boolean);
    return NextResponse.json({ users }, { status: 200 });
  } catch (e) {
    console.error("[FOLLOWS_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST /api/follows { email } → follow by exact email (idempotent)
export async function POST(req: NextRequest) {
  try {
    const me = await getMeId();
    if ("error" in me)
      return NextResponse.json({ error: me.error }, { status: me.status });

    const body = await req.json().catch(() => ({} as { email?: string }));
    const targetEmail = (body.email ?? "").trim().toLowerCase();
    if (!targetEmail)
      return NextResponse.json({ error: "Email is required" }, { status: 400 });

    const target = await prisma.user.findUnique({
      where: { email: targetEmail },
      select: { id: true },
    });
    if (!target)
      return NextResponse.json(
        { error: "No user with that email" },
        { status: 404 }
      );
    if (target.id === me.meId)
      return NextResponse.json(
        { error: "Cannot follow yourself" },
        { status: 409 }
      );

    const key = {
      followerId_followingId: { followerId: me.meId, followingId: target.id },
    };
    const existing = await prisma.follows.findUnique({ where: key });

    if (existing) {
      return NextResponse.json(
        { ok: true, alreadyFollowing: true },
        { status: 200 }
      );
    }

    await prisma.follows.create({
      data: { followerId: me.meId, followingId: target.id },
    });
    // (Optional) create a FOLLOW notification here

    return NextResponse.json(
      { ok: true, alreadyFollowing: false },
      { status: 200 }
    );
  } catch (e) {
    console.error("[FOLLOWS_POST_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// (unchanged) GET + POST ... keep your existing code above

// DELETE /api/follows  { userId: string } → unfollow target
export async function DELETE(req: NextRequest) {
  try {
    const me = await getMeId();
    if ("error" in me)
      return NextResponse.json({ error: me.error }, { status: me.status });

    const body = await req.json().catch(() => ({} as { userId?: string }));
    const targetId = (body.userId ?? "").trim();
    if (!targetId)
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    if (targetId === me.meId)
      return NextResponse.json(
        { error: "Cannot unfollow yourself" },
        { status: 409 }
      );

    await prisma.follows.deleteMany({
      where: { followerId: me.meId, followingId: targetId },
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    console.error("[FOLLOWS_DELETE_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
