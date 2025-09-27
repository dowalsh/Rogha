// src/app/api/posts/[id]/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { triggerPostSubmittedEmails } from "@/lib/emails/triggers";

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
      include: {
        author: { select: { id: true, name: true, image: true } },
      },
    });

    if (!post) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    // 2) Public access for published posts
    if (post.status === "PUBLISHED") {
      return NextResponse.json(post, { status: 200 });
    }

    // 3) Otherwise require auth + ownership
    const { user, error } = await getDbUser();
    if (error)
      return NextResponse.json({ error: error.code }, { status: error.status });

    if (post.authorId !== user.id) {
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

    const { id } = await context.params;
    console.log("[PUT] Post ID from params:", id);

    const post = await prisma.post.findUnique({ where: { id } });
    console.log("[PUT] Fetched post:", post);

    if (!post || post.authorId !== user.id) {
      console.log("[PUT] Post not found or user not owner");
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const updateData = {
      content: body.content,
      status: body.status,
      title: body.title,
      heroImageUrl: body.heroImageUrl,
    };
    console.log("[PUT] Update data:", updateData);

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
    });
    console.log("[PUT] Updated post:", updatedPost);

    // 👇 only trigger email if status is SUBMITTED and was unsubmitted before. Could add some level of spam protection here as well...
    if (updatedPost.status === "SUBMITTED" && post.status === "DRAFT") {
      try {
        await triggerPostSubmittedEmails(updatedPost.id);
        console.log("[PUT] Email trigger sent");
      } catch (err) {
        console.error("[PUT] Failed to trigger email:", err);
      }
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
