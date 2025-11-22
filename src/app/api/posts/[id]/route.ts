// src/app/api/posts/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { createSubmitNotifications } from "@/actions/notification.action";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";

// GET post by ID (public if PUBLISHED)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    console.log("[GET] Fetching post with ID:", id);

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true } },
        likes: { select: { id: true, userId: true } }, // full likes array for debugging
      },
    });

    console.log("[GET] Raw post from DB:", JSON.stringify(post, null, 2));

    if (!post) {
      console.log("[GET] Post not found for ID:", id);
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Base response with counts
    let baseResponse = {
      ...post,
      likeCount: post._count.likes,
      likedByMe: false,
    };
    console.log("[GET] Initial baseResponse:", baseResponse);

    // Try to resolve user (don't error if missing)
    const { user } = await getDbUser().catch(() => ({ user: null }));
    console.log("[GET] Current user:", user ? user.id : "none");

    // If we have a user, check if they liked
    if (user) {
      const liked = await prisma.postLike.findUnique({
        where: { userId_postId: { userId: user.id, postId: id } },
      });
      console.log("[GET] Liked by current user?", !!liked);
      baseResponse = { ...baseResponse, likedByMe: !!liked };
    }

    console.log("[GET] Final baseResponse:", baseResponse);

    // If published, return to anyone
    if (post.status === "PUBLISHED") {
      console.log("[GET] Post is PUBLISHED, returning to caller");
      return NextResponse.json(baseResponse, { status: 200 });
    }

    // If not published, require ownership
    if (!user || post.authorId !== user.id) {
      console.log("[GET] Unauthorized to view this post");
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.log("[GET] Returning unpublished post to owner");
    return NextResponse.json(baseResponse, { status: 200 });
  } catch (error) {
    console.error("[POST_GET_BY_ID_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
// UPDATE post by ID
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  console.log("[PUT] Update post by ID called");
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const body = await req.json();
    const { id } = params;

    // ---- Audience normalization ----
    const allowedAudience = new Set(["CIRCLE", "FRIENDS", "ALL_USERS"]);
    const incomingAudience = body.audienceType as string | undefined;
    const incomingCircleId =
      (body.circleId as string | null | undefined) ?? null;

    if (!incomingAudience || !allowedAudience.has(incomingAudience)) {
      return NextResponse.json(
        { error: "Invalid audienceType" },
        { status: 400 }
      );
    }
    if (incomingAudience === "CIRCLE" && !incomingCircleId) {
      return NextResponse.json(
        { error: "circleId required for CIRCLE" },
        { status: 400 }
      );
    }

    const baseUpdate: any = {
      title: body.title,
      content: body.content,
      status: body.status,
      heroImageUrl: body.heroImageUrl,
      audienceType: incomingAudience,
      circleId: incomingAudience === "CIRCLE" ? incomingCircleId : null,
    };

    const { previousPost, updatedPost, firstTimeSubmitFromDraft } =
      await prisma.$transaction(async (tx) => {
        const post = await tx.post.findUnique({ where: { id } });
        if (!post || post.authorId !== user.id) {
          throw new Error("NOT_FOUND_OR_NOT_OWNER");
        }

        // status transition detection
        const isSubmittingNow =
          body.status === "SUBMITTED" && post.status !== "SUBMITTED";

        let updateData = { ...baseUpdate };

        // ---- Edition linking on SUBMITTED (fixed logic) ----
        if (isSubmittingNow) {
          const weekStartUTC = getWeekStartUTC();
          const weekLabel = formatWeekLabel(weekStartUTC);

          const edition = await tx.edition.upsert({
            where: { weekStart: weekStartUTC },
            update: {},
            create: {
              weekStart: weekStartUTC,
              title: `Week of ${weekLabel}`,
            },
            select: { id: true },
          });

          // Always point to the current week on (re)submit
          updateData.editionId = edition.id;
        }

        const updated = await tx.post.update({
          where: { id },
          data: updateData,
        });

        return {
          previousPost: post,
          updatedPost: updated,
          firstTimeSubmitFromDraft:
            updated.status === "SUBMITTED" && post.status === "DRAFT",
        };
      });

    // Outside transaction: side effects
    if (firstTimeSubmitFromDraft) {
      await createSubmitNotifications({
        userId: user.id,
        postId: updatedPost.id,
      });
    }

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (err: any) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_NOT_OWNER") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    console.error("[POST_UPDATE_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// DELETE post by ID
export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { user, error } = await getDbUser();
    if (error)
      return NextResponse.json({ error: error.code }, { status: error.status });

    const { id } = context.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post || post.authorId !== user.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Optional guardrails:
    // if (post.status === "PUBLISHED" || post.status === "ARCHIVED") {
    //   return NextResponse.json({ error: "Cannot delete published/archived post" }, { status: 409 });
    // }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    console.error("[POST_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
