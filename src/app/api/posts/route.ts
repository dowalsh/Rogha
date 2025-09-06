// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";

// GET all posts for the signed-in user (most recent first)
export async function GET(_req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
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

    const posts = await prisma.post.findMany({
      where: { authorId: dbUser.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        // pull just what the row renders from Edition
        edition: { select: { id: true, title: true } },
        // omit `content` and other heavy fields for the listing
      },
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error("[POSTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST create a new draft post and link it to this week's edition
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
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

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // tolerate empty body
    }

    const weekStartUTC = getWeekStartUTC();
    const weekLabel = formatWeekLabel(weekStartUTC);

    const { id } = await prisma.$transaction(async (tx) => {
      const edition = await tx.edition.upsert({
        where: { weekStart: weekStartUTC }, // @@unique([weekStart])
        update: {},
        create: {
          weekStart: weekStartUTC,
          title: `Week of ${weekLabel}`,
        },
        select: { id: true },
      });

      // ✅ Use scalar FKs (unchecked path): authorId + editionId
      const post = await tx.post.create({
        data: {
          authorId: dbUser.id,
          editionId: edition.id,
          title: (body.title as string | null) ?? null,
          status: "DRAFT",
        },
        select: { id: true },
      });

      return post;
    });

    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    console.error("[POSTS_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
