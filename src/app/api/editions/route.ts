// /api/editions/route.ts// src/app/api/editions/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(_req: NextRequest) {
  try {
    // Auth (same pattern as your other routes)
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    const email = user?.emailAddresses?.[0]?.emailAddress;
    if (!email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({ where: { email } });
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Published editions only, newest first, include post counts
    const editions = await prisma.edition.findMany({
      where: { NOT: { publishedAt: null } },
      orderBy: { weekStart: "desc" },
      select: {
        id: true,
        title: true,
        weekStart: true,
        publishedAt: true,
        _count: { select: { posts: true } },
      },
    });

    return NextResponse.json(editions, { status: 200 });
  } catch (e) {
    console.error("[EDITIONS_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
