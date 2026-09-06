// src/app/api/tracks/[id]/comments/route.ts
//
// Comments on an individual Weekly Jam song row (WeeklyTrack). Mirrors
// src/app/api/posts/[id]/comments/route.ts closely — same one-level nesting
// rule, same report/block filtering, same shape — just gated by
// requireTrackAccess instead of requirePostAccess and writing weeklyTrackId
// instead of postId.
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { createCommentNotification } from "@/actions/notification.action";
import { requireTrackAccess } from "@/lib/access/trackAccess";
import { isContentBlocked } from "@/lib/contentFilter";

// GET top-level comments (with replies) for a track
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id: trackId } = context.params;

    const track = await requireTrackAccess(user?.id ?? null, trackId);
    if (!track) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const [reportedCommentIds, blockedAuthorIds] = await Promise.all([
      prisma.report
        .findMany({ where: { reporterId: user.id, contentType: "COMMENT" }, select: { contentId: true } })
        .then((rows) => rows.map((r) => r.contentId)),
      prisma.block
        .findMany({ where: { blockerId: user.id }, select: { blockedId: true } })
        .then((rows) => rows.map((r) => r.blockedId)),
    ]);

    const excludeFilter = () => {
      const ids = reportedCommentIds;
      return ids.length > 0 ? { NOT: { id: { in: ids } } } : {};
    };

    const comments = await prisma.comment.findMany({
      where: {
        weeklyTrackId: trackId,
        parentCommentId: null,
        status: "ACTIVE",
        ...(blockedAuthorIds.length > 0 ? { NOT: { authorId: { in: blockedAuthorIds } } } : {}),
        ...excludeFilter(),
      },
      include: {
        author: { select: { id: true, username: true, image: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId: user.id }, select: { id: true } },
        replies: {
          where: {
            status: "ACTIVE",
            ...(blockedAuthorIds.length > 0 ? { NOT: { authorId: { in: blockedAuthorIds } } } : {}),
            ...excludeFilter(),
          },
          include: {
            author: { select: { id: true, username: true, image: true } },
            _count: { select: { likes: true } },
            likes: { where: { userId: user.id }, select: { id: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const normalize = (c: any) => ({
      ...c,
      likeCount: c._count.likes,
      likedByMe: c.likes.length > 0,
      replies: (c.replies ?? []).map((r: any) => ({
        ...r,
        likeCount: r._count.likes,
        likedByMe: r.likes.length > 0,
      })),
    });

    return NextResponse.json(comments.map(normalize), { status: 200 });
  } catch (e) {
    console.error("[TRACK_COMMENTS_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// POST create new comment (top-level or reply)
export async function POST(
  req: NextRequest,
  context: { params: { id: string } },
) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id: trackId } = context.params;

    const track = await requireTrackAccess(user.id, trackId);
    if (!track) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const body = await req.json();
    const { content, parentId } = body as {
      content: string;
      parentId?: string | null;
    };

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    if (isContentBlocked(content)) {
      return NextResponse.json(
        { error: "This comment contains language that may violate our community standards." },
        { status: 422 },
      );
    }

    // prevent replies to replies — one level of nesting only
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { parentCommentId: true },
      });

      if (!parent) {
        return NextResponse.json(
          { error: "Parent not found" },
          { status: 404 },
        );
      }
      if (parent.parentCommentId) {
        return NextResponse.json(
          { error: "Replies may only be nested two levels deep" },
          { status: 400 },
        );
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        authorId: user.id,
        weeklyTrackId: trackId,
        ...(parentId ? { parentCommentId: parentId } : {}),
      },
      include: {
        author: { select: { id: true, username: true, image: true } },
      },
    });

    // 🔔 trigger a notification
    await createCommentNotification({
      commenterId: user.id,
      trackId: parentId ? undefined : trackId, // top-level → notify track owner
      parentCommentId: parentId ?? undefined, // reply → notify parent comment author
      newCommentId: newComment.id,
    });

    const response = {
      ...newComment,
      likeCount: 0,
      likedByMe: false,
      replies: [],
    };

    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    console.error("[TRACK_COMMENTS_POST_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
