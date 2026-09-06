// src/app/api/posts/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import {
  createSubmitNotifications,
  createPublishNotifications,
} from "@/actions/notification.action";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";
import { canViewPost } from "@/lib/access/postAccess";
import { isContentBlocked, extractTextFromDoc } from "@/lib/contentFilter";
import { generateHeroThumbnails } from "@/lib/heroThumbnails";
import {
  getSundayLiveJoinWindow,
  getOpenLiveJoinEdition,
} from "@/lib/editions";
import { recordActivityEvent } from "@/actions/activityEvent.action";
import { ActivityEventType } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";

// GET post by ID (public if PUBLISHED)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    console.log("[GET] Fetching post with ID:", id);

    const post = await prisma.post.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        content: true,
        status: true,
        authorId: true,
        audienceType: true,
        circleId: true,
        officialKind: true,
        notifyAllUsers: true,
        editionId: true,
        heroImageUrl: true,
        createdAt: true,
        updatedAt: true,

        author: {
          select: { id: true, clerkId: true, username: true, image: true },
        },
        edition: { select: { publishedAt: true } },
        republishedFromPostId: true,
        republishedFrom: {
          select: { edition: { select: { publishedAt: true } } },
        },
        republishMessage: true,
        _count: { select: { likes: true } },
        likes: { select: { id: true, userId: true } },
      },
    });

    console.log("[GET] Raw post from DB:", JSON.stringify(post, null, 2));

    if (!post) {
      console.log("[GET] Post not found for ID:", id);
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Sunday live-join: only matters pre-submit, but cheap enough to always
    // compute — see docs/specs/2026-08-13-sunday-live-join.md.
    const openLiveJoinEdition = await getOpenLiveJoinEdition();

    // Base response with counts
    let baseResponse: any = {
      ...post,
      likeCount: post._count.likes,
      likedByMe: false,
      readByMe: false,
      newCommentCount: null as number | null,
      sundayLiveJoin: { available: !!openLiveJoinEdition },
    };
    console.log("[GET] Initial baseResponse:", baseResponse);

    // Try to resolve user (don't error if missing)
    const { user } = await getDbUser().catch(() => ({ user: null }));
    console.log("[GET] Current user:", user ? user.id : "none");

    // If we have a user, check if they liked / read
    if (user) {
      const [liked, read] = await Promise.all([
        prisma.postLike.findUnique({
          where: { userId_postId: { userId: user.id, postId: id } },
        }),
        prisma.postRead.findUnique({
          where: { postId_userId: { postId: id, userId: user.id } },
        }),
      ]);
      console.log("[GET] Liked by current user?", !!liked);

      // "N new" signal for the reader header — mirrors src/lib/home.ts
      // getBuzzPosts's unread definition (comments + replies, no baseline =
      // no signal rather than "everything is new").
      let newCommentCount: number | null = null;
      if (read) {
        newCommentCount = await prisma.comment.count({
          where: {
            postId: id,
            status: "ACTIVE",
            createdAt: { gt: read.lastReadAt },
          },
        });
      }

      baseResponse = {
        ...baseResponse,
        likedByMe: !!liked,
        readByMe: !!read,
        newCommentCount,
      };
    }

    console.log("[GET] Final baseResponse:", baseResponse);

    const allowed = await canViewPost(user?.id ?? null, {
      id: post.id,
      authorId: post.authorId,
      status: post.status,
      audienceType: post.audienceType,
      circleId: post.circleId,
      createdAt: post.createdAt,
      publishedAt: post.edition?.publishedAt ?? null,
    });

    if (!allowed) {
      console.log("[GET] Unauthorized to view this post");
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    console.log("[GET] Returning post to authorized viewer");
    return NextResponse.json(baseResponse, { status: 200 });
  } catch (error) {
    console.error("[POST_GET_BY_ID_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
// UPDATE post by ID
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  console.log("[PUT] Update post by ID called");
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const body = await req.json();
    const { id } = params;

    // ---- Official post normalization ----
    const allowedOfficialKind = new Set(["EDITORS_NOTE", "COMMUNITY_FEATURE"]);
    const incomingOfficialKind = body.officialKind as string | null | undefined;
    const incomingNotifyAllUsers = Boolean(body.notifyAllUsers);

    if (
      incomingOfficialKind != null &&
      !allowedOfficialKind.has(incomingOfficialKind)
    ) {
      return NextResponse.json(
        { error: "Invalid officialKind" },
        { status: 400 },
      );
    }
    if (
      (incomingOfficialKind != null || incomingNotifyAllUsers) &&
      user.role !== "ADMIN"
    ) {
      return NextResponse.json(
        { error: "Only admins can post official content" },
        { status: 403 },
      );
    }

    // ---- Audience normalization ----
    const allowedAudience = new Set(["CIRCLE", "FRIENDS", "ALL_USERS"]);
    // Official posts always force ALL_USERS, regardless of what the client sent.
    const incomingAudience =
      incomingOfficialKind != null
        ? "ALL_USERS"
        : (body.audienceType as string | undefined);
    const incomingCircleId =
      (body.circleId as string | null | undefined) ?? null;

    if (!incomingAudience || !allowedAudience.has(incomingAudience)) {
      return NextResponse.json(
        { error: "Invalid audienceType" },
        { status: 400 },
      );
    }
    if (incomingAudience === "ALL_USERS" && user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Only admins can post to All Rogha Users" },
        { status: 403 },
      );
    }
    if (incomingAudience === "CIRCLE" && !incomingCircleId) {
      return NextResponse.json(
        { error: "circleId required for CIRCLE" },
        { status: 400 },
      );
    }

    const isPublishNow = body.status === "PUBLISHED";

    // Content filter — only on submission / live-publish (not every autosave keystroke)
    if (body.status === "SUBMITTED" || isPublishNow) {
      if (typeof body.title !== "string" || body.title.trim().length === 0) {
        return NextResponse.json(
          { error: "Title is required" },
          { status: 400 },
        );
      }

      const bodyText = extractTextFromDoc(body.content);
      if (isContentBlocked(body.title, bodyText)) {
        return NextResponse.json(
          {
            error:
              "This post contains language that may violate our community standards.",
          },
          { status: 422 },
        );
      }
    }

    // Regenerate the inline thumbnails only when the hero image actually
    // changes — not on every autosave — since this does a network fetch +
    // image processing.
    const existingHero = await prisma.post.findUnique({
      where: { id },
      select: { heroImageUrl: true },
    });

    let thumbUpdate: {
      heroThumbUrl?: string | null;
      heroThumbBlurUrl?: string | null;
    } = {};
    if (body.heroImageUrl && body.heroImageUrl !== existingHero?.heroImageUrl) {
      const thumbs = await generateHeroThumbnails(body.heroImageUrl);
      thumbUpdate = {
        heroThumbUrl: thumbs?.thumb ?? null,
        heroThumbBlurUrl: thumbs?.thumbBlur ?? null,
      };
    } else if (!body.heroImageUrl && existingHero?.heroImageUrl) {
      thumbUpdate = { heroThumbUrl: null, heroThumbBlurUrl: null };
    }

    const baseUpdate: any = {
      title: body.title,
      content: body.content,
      status: body.status,
      heroImageUrl: body.heroImageUrl,
      ...thumbUpdate,
      audienceType: incomingAudience,
      circleId: incomingAudience === "CIRCLE" ? incomingCircleId : null,
      officialKind: incomingOfficialKind ?? null,
      notifyAllUsers:
        incomingOfficialKind != null ? incomingNotifyAllUsers : false,
    };

    const {
      previousPost,
      updatedPost,
      firstTimeSubmitFromDraft,
      livePublished,
    } = await prisma.$transaction(async (tx) => {
      const post = await tx.post.findUnique({ where: { id } });
      if (!post || post.authorId !== user.id) {
        throw new Error("NOT_FOUND_OR_NOT_OWNER");
      }

      let updateData = { ...baseUpdate };
      let livePublished = false;

      // Sunday live-join: publish straight into today's open edition.
      // Server re-validates independently of whatever the client showed —
      // see docs/specs/2026-08-13-sunday-live-join.md.
      if (isPublishNow) {
        if (post.status !== "DRAFT") {
          throw new Error("LIVE_JOIN_INVALID_STATUS");
        }
        const { windowStart, windowEnd, isOpen } = getSundayLiveJoinWindow();
        if (!isOpen) {
          throw new Error("LIVE_JOIN_WINDOW_CLOSED");
        }
        const openEdition = await tx.edition.findFirst({
          where: { publishedAt: { gte: windowStart, lt: windowEnd } },
          orderBy: { publishedAt: "desc" },
          select: { id: true },
        });
        if (!openEdition) {
          throw new Error("LIVE_JOIN_NO_OPEN_EDITION");
        }
        updateData = { ...updateData, editionId: openEdition.id };
        livePublished = true;
      }

      const updated = await tx.post.update({
        where: { id },
        data: updateData,
      });

      if (livePublished) {
        await recordActivityEvent({
          actorId: updated.authorId,
          eventType: ActivityEventType.POST_PUBLISHED,
          postId: updated.id,
        });
      }

      return {
        previousPost: post,
        updatedPost: updated,
        firstTimeSubmitFromDraft:
          updated.status === "SUBMITTED" && post.status === "DRAFT",
        livePublished,
      };
    });

    // Outside transaction: side effects
    if (firstTimeSubmitFromDraft) {
      await createSubmitNotifications({
        userId: user.id,
        postId: updatedPost.id,
      });
    }
    if (livePublished) {
      await createPublishNotifications({
        userId: user.id,
        postId: updatedPost.id,
      });

      // The edition detail page is a force-dynamic Server Component, but
      // LatestEditionPreloader does a `kind: "full"` router.prefetch of it
      // client-side and next.config.js bumps staleTimes.dynamic to 60s so
      // that prefetch survives a while — meaning a client who already
      // prefetched this edition before the live-join publish would keep
      // seeing the pre-publish Router Cache entry (missing the new post)
      // until that TTL expired. revalidatePath purges that client Router
      // Cache entry too, not just server-side caches, so the next visit
      // (soft or hard nav) re-renders with the newly published post.
      if (updatedPost.editionId) {
        revalidatePath(`/editions/${updatedPost.editionId}`);
      }
    }

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (err: any) {
    if (err instanceof Error && err.message === "NOT_FOUND_OR_NOT_OWNER") {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }
    if (
      err instanceof Error &&
      (err.message === "LIVE_JOIN_INVALID_STATUS" ||
        err.message === "LIVE_JOIN_WINDOW_CLOSED" ||
        err.message === "LIVE_JOIN_NO_OPEN_EDITION")
    ) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
    console.error("[POST_UPDATE_ERROR]", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// DELETE post by ID
export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } },
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
      { status: 500 },
    );
  }
}
