// src/app/api/posts/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

// GET post by ID (public if PUBLISHED)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    // 1) Fetch first to decide if it can be public
    const post = await prisma.post.findUnique({
      where: { id },
      // If you need author for the reader page, uncomment:
      include: { author: { select: { name: true } } },
    });

    if (!post) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // 2) Public access for published posts
    if (post.status === "PUBLISHED") {
      return NextResponse.json(post, { status: 200 });
    }

    // 3) Otherwise require auth + ownership (unchanged)
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();
    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
      select: { id: true },
    });

    if (!dbUser || post.authorId !== dbUser.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    return NextResponse.json(post, { status: 200 });
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
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the current user from Clerk to find their email
    const { currentUser } = await import("@clerk/nextjs/server");
    const user = await currentUser();

    if (!user || !user.emailAddresses[0]?.emailAddress) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find the user in our database by email
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { id } = await context.params;

    const post = await prisma.post.findUnique({
      where: { id },
    });

    if (!post || post.authorId !== dbUser.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        content: body.content,
        status: body.status,
        title: body.title,
      },
    });

    return NextResponse.json(updatedPost, { status: 200 });
  } catch (error) {
    console.error("[POST_UPDATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const { userId: clerkUserId } = await auth();
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await prisma.user.findUnique({
      where: { clerkId: clerkUserId },
      select: { id: true },
    });
    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    const { id } = context.params;
    const post = await prisma.post.findUnique({ where: { id } });

    if (!post || post.authorId !== dbUser.id) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // Optional guardrails (uncomment if you want to block deletes for published/archived)
    // if (post.status === "PUBLISHED" || post.status === "ARCHIVED") {
    //   return NextResponse.json({ error: "Cannot delete published/archived post" }, { status: 409 });
    // }

    await prisma.post.delete({ where: { id } });
    return NextResponse.json({ ok: true }, { status: 200 }); // or return new Response(null, { status: 204 })
  } catch (error) {
    console.error("[POST_DELETE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
