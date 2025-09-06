// src/app/api/posts/route.ts

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { orderBy } from "lodash-es";

// GET post by ID
export async function GET(req: NextRequest) {
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
      console.log("No Dbuser");
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // Order posts by most recent first
    const posts = await prisma.post.findMany({
      where: { authorId: dbUser?.id },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(posts, { status: 200 });
  } catch (error) {
    console.error("[POSTS_GET_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// POST create a new draft post
export async function POST(req: NextRequest) {
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
    const dbUser = await prisma.user.findUnique({
      where: { email: user.emailAddresses[0].emailAddress },
    });

    if (!dbUser) {
      return NextResponse.json(
        { error: "User not found in database" },
        { status: 404 }
      );
    }

    // optional: parse body if you want title etc
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const post = await prisma.post.create({
      data: {
        authorId: dbUser.id,
        title: body.title ?? null,
        status: "DRAFT",
      },
      select: { id: true },
    });

    return NextResponse.json({ id: post.id }, { status: 201 });
  } catch (error) {
    console.error("[POSTS_CREATE_ERROR]", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
