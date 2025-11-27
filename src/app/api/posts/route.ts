// src/app/api/posts/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
// import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";

// GET all posts for the signed-in user (most recent first)
export async function GET(_req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const posts = await prisma.post.findMany({
      where: { authorId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        updatedAt: true,
        heroImageUrl: true,
        edition: { select: { id: true, title: true } },
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

// POST create a new draft post (edition assignment deferred to submit step)
export async function POST(req: NextRequest) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // tolerate empty body
    }

    // const weekStartUTC = getWeekStartUTC();
    // const weekLabel = formatWeekLabel(weekStartUTC);

    const { id } = await prisma.$transaction(async (tx) => {
      // Commented out: auto-edition linking (will handle at submit time)
      // const edition = await tx.edition.upsert({
      //   where: { weekStart: weekStartUTC },
      //   update: {},
      //   create: {
      //     weekStart: weekStartUTC,
      //     title: `Week of ${weekLabel}`,
      //   },
      //   select: { id: true },
      // });

      const post = await tx.post.create({
        data: {
          authorId: user.id,
          // editionId: edition.id, // assign later at submit
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
