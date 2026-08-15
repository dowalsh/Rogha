// src/app/api/republish/candidates/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { getRepublishEligibleFriends } from "@/lib/access/postAccess";

// The shortlist for the "browse and pick a post" entry point on the Posts
// page: the author's PUBLISHED posts that actually have someone eligible to
// receive them (i.e. at least one friend the temporal gate is hiding it
// from). Posts everyone can already see (or with no eligible friends left)
// are left off the list rather than shown as a dead end.
export async function GET() {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const posts = await prisma.post.findMany({
      where: { authorId: user.id, status: "PUBLISHED" },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        heroThumbUrl: true,
        authorId: true,
        status: true,
        audienceType: true,
        circleId: true,
        createdAt: true,
        edition: { select: { publishedAt: true } },
      },
    });

    const candidates = await Promise.all(
      posts.map(async (p) => {
        const eligible = await getRepublishEligibleFriends(user.id, {
          id: p.id,
          authorId: p.authorId,
          status: p.status,
          audienceType: p.audienceType,
          circleId: p.circleId,
          createdAt: p.createdAt,
          publishedAt: p.edition?.publishedAt ?? null,
        });
        return {
          id: p.id,
          title: p.title,
          heroThumbUrl: p.heroThumbUrl,
          eligibleCount: eligible.length,
        };
      }),
    );

    return NextResponse.json(
      { posts: candidates.filter((c) => c.eligibleCount > 0) },
      { status: 200 },
    );
  } catch (err) {
    console.error("[REPUBLISH_CANDIDATES_GET_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
