// src/app/api/posts/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { triggerPostSubmittedEmails } from "@/lib/emails/triggers";
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
  { params }: { params: { id: string } } // ✅ params is NOT a Promise
) {
  console.log("[PUT] Update post by ID called");
  try {
    const { user, error } = await getDbUser();
    console.log("[PUT] getDbUser result:", { user, error });
    if (error) {
      console.log("[PUT] Auth error:", error);
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const body = await req.json();
    console.log("[PUT] Request body:", body);

    const { id } = params;
    console.log("[PUT] Post ID from params:", id);

    const post = await prisma.post.findUnique({ where: { id } });
    console.log("[PUT] Fetched post:", post);

    if (!post || post.authorId !== user.id) {
      console.log("[PUT] Post not found or user not owner");
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

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

    // If you want to enforce membership on CIRCLE, you can add this later:
    // if (incomingAudience === "CIRCLE") { ... validate user is a member ... }

    const updateData: any = {
      title: body.title,
      content: body.content,
      status: body.status,
      heroImageUrl: body.heroImageUrl,
      audienceType: incomingAudience,
      circleId: incomingAudience === "CIRCLE" ? incomingCircleId : null,
    };

    // ---- Edition linking on SUBMITTED (unchanged) ----
    if (body.status === "SUBMITTED" && !post.editionId) {
      console.log("[PUT] Post submitted — linking to edition");
      const weekStartUTC = getWeekStartUTC();
      const weekLabel = formatWeekLabel(weekStartUTC);

      const edition = await prisma.edition.upsert({
        where: { weekStart: weekStartUTC },
        update: {},
        create: {
          weekStart: weekStartUTC,
          title: `Week of ${weekLabel}`,
        },
        select: { id: true },
      });

      updateData.editionId = edition.id;
    }

    console.log("[PUT] Update data:", updateData);

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
    });
    console.log("[PUT] Updated post:", updatedPost);

    // Notify on first submit from DRAFT (unchanged)
    if (updatedPost.status === "SUBMITTED" && post.status === "DRAFT") {
      await createSubmitNotifications({
        userId: user.id,
        postId: updatedPost.id,
      });
    }

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error) {
    console.error("[POST_UPDATE_ERROR]", error);
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
