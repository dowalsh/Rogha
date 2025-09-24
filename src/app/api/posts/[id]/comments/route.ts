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
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id: postId } = context.params;

    // find all friend IDs
    const friendIds = await getAcceptedFriendIds(user.id);
    const allowedIds = [user.id, ...friendIds];

    const comments = await prisma.comment.findMany({
      where: {
        postId,
        parent: null, // only top-level
        authorId: { in: allowedIds },
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replies: {
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(comments, { status: 200 });
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
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id: postId } = context.params;
    const body = await req.json();
    const { content, parentId } = body as {
      content: string;
      parentId?: string | null;
    };

    if (!content) {
      return NextResponse.json({ error: "Missing content" }, { status: 400 });
    }

    // if this is a reply, ensure nesting is only 2 levels deep
    if (parentId) {
      const parent = await prisma.comment.findUnique({
        where: { id: parentId },
        select: { parent: true },
      });
      if (!parent) {
        return NextResponse.json(
          { error: "Parent not found" },
          { status: 404 }
        );
      }
      if (parent.parent) {
        return NextResponse.json(
          { error: "Replies may only be nested two levels deep" },
          { status: 400 }
        );
      }
    }

    const newComment = await prisma.comment.create({
      data: {
        content,
        author: { connect: { id: user.id } },
        post: { connect: { id: postId } },
        parent: parentId ? { connect: { id: parentId } } : undefined,
      },
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    return NextResponse.json(newComment, { status: 201 });
  } catch (e) {
    console.error("[COMMENTS_POST_ERROR]", e);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
