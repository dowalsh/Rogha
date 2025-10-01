// src/app/api/posts/[id]/comments/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { getAcceptedFriendIds } from "@/lib/friends";

// GET top-level comments (with replies) for a post
export async function GET(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    console.log("[COMMENTS_GET] start", { postId: context.params.id });

    const { user, error } = await getDbUser();
    if (error) {
      console.warn("[COMMENTS_GET] auth error", error);
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    console.log("[COMMENTS_GET] user", user.id);

    const { id: postId } = context.params;

    // find all friend IDs
    const friendIds = await getAcceptedFriendIds(user.id);
    const allowedIds = [user.id, ...friendIds];
    console.log("[COMMENTS_GET] allowed authorIds", allowedIds);

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parentCommentId: null, // only top-level
        authorId: { in: allowedIds },
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        _count: { select: { likes: true } },
        likes: { where: { userId: user.id }, select: { id: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, image: true } },
            _count: { select: { likes: true } },
            likes: { where: { userId: user.id }, select: { id: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    console.log(
      "[COMMENTS_GET] raw comments",
      JSON.stringify(comments, null, 2)
    );

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

    const normalized = comments.map(normalize);
    console.log(
      "[COMMENTS_GET] normalized",
      JSON.stringify(normalized, null, 2)
    );

    return NextResponse.json(normalized, { status: 200 });
  } catch (e) {
    console.error("[COMMENTS_GET_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST create new comment (top-level or reply)
export async function POST(
  req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    console.log("[COMMENTS_POST] start", { postId: context.params.id });

    const { user, error } = await getDbUser();
    if (error) {
      console.warn("[COMMENTS_POST] auth error", error);
      return NextResponse.json({ error: error.code }, { status: error.status });
    }
    console.log("[COMMENTS_POST] user", user.id);

    const { id: postId } = context.params;
    const body = await req.json();
    console.log("[COMMENTS_POST] raw body", body);

    const { content, parentId } = body as {
      content: string;
      parentId?: string | null;
    };

    if (!content) {
      console.warn("[COMMENTS_POST] missing content");
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // prevent >2 levels deep
    if (parentId) {
      console.log("[COMMENTS_POST] checking parent", parentId);
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { parentCommentId: true },
      });
      console.log("[COMMENTS_POST] parent check result", parent);

      if (!parent) {
        return NextResponse.json(
          { error: "Parent not found" },
          { status: 404 }
        );
      }
      if (parent.parentCommentId) {
        console.warn("[COMMENTS_POST] nesting too deep", parentId);
        return NextResponse.json(
          { error: "Replies may only be nested two levels deep" },
          { status: 400 }
        );
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        authorId: user.id,
        postId,
        ...(parentId ? { parentCommentId: parentId } : {}), // ✅ use FK directly
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    console.log("[COMMENTS_POST] created", newComment);

    // normalize response shape
    const response = {
      ...newComment,
      likeCount: 0,
      likedByMe: false,
      replies: [],
    };
    console.log("[COMMENTS_POST] response", response);

    return NextResponse.json(response, { status: 201 });
  } catch (e) {
    console.error("[COMMENTS_POST_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
