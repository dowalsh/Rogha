// src/app/api/comments/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getUserByClerkId } from "@/actions/user.action";
import { getAcceptedFriendIds } from "@/lib/friends";

/**
 * GET a single comment (with replies) if it's by the user or their friends.
 */
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return new NextResponse("Unauthorized", { status: 401 });

    const dbUser = await getUserByClerkId(clerkUser.id);
    if (!dbUser) return new NextResponse("Unauthorized", { status: 401 });

    const friendIds = await getAcceptedFriendIds(dbUser.id);
    const allowedIds = [dbUser.id, ...friendIds];

    const comment = await prisma.comment.findFirst({
      where: { id: params.id, authorId: { in: allowedIds } },
      include: {
        author: { select: { id: true, name: true, image: true } },
        replies: {
          where: { authorId: { in: allowedIds } },
          include: {
            author: { select: { id: true, name: true, image: true } },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!comment) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(comment);
  } catch (err) {
    console.error("[COMMENT_GET]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * PUT update a comment (only if current user is author).
 */
export async function PUT(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return new NextResponse("Unauthorized", { status: 401 });

    const dbUser = await getUserByClerkId(clerkUser.id);
    if (!dbUser) return new NextResponse("Unauthorized", { status: 401 });

    const body = await req.json();
    const { content } = body as { content?: string };
    if (!content) {
      return new NextResponse("Missing content", { status: 400 });
    }

    const existing = await prisma.comment.findUnique({
      where: { id: params.id },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (existing.authorId !== dbUser.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    const updated = await prisma.comment.update({
      where: { id: params.id },
      data: { content },
      include: { author: { select: { id: true, name: true, image: true } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[COMMENT_PUT]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}

/**
 * DELETE a comment (only if current user is author).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const clerkUser = await currentUser();
    if (!clerkUser) return new NextResponse("Unauthorized", { status: 401 });

    const dbUser = await getUserByClerkId(clerkUser.id);
    if (!dbUser) return new NextResponse("Unauthorized", { status: 401 });

    const existing = await prisma.comment.findUnique({
      where: { id: params.id },
    });
    if (!existing) return new NextResponse("Not found", { status: 404 });
    if (existing.authorId !== dbUser.id) {
      return new NextResponse("Forbidden", { status: 403 });
    }

    await prisma.comment.delete({ where: { id: params.id } });

    return new NextResponse("Deleted", { status: 200 });
  } catch (err) {
    console.error("[COMMENT_DELETE]", err);
    return new NextResponse("Internal Error", { status: 500 });
  }
}
