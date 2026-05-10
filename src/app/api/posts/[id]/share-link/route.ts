export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";

function generateToken(): string {
  return randomBytes(16).toString("base64url");
}

function shareUrl(token: string): string {
  return `${process.env.APP_URL ?? ""}/share/post/${token}`;
}

// GET — check whether an active share link exists (author only)
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getDbUser();
  if (error)
    return NextResponse.json({ error: error.code }, { status: error.status });

  const { id } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      authorId: true,
      publicShareToken: true,
      publicShareEnabled: true,
    },
  });

  if (!post || post.authorId !== user.id)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  if (!post.publicShareEnabled || !post.publicShareToken)
    return NextResponse.json({ active: false });

  return NextResponse.json({ active: true, url: shareUrl(post.publicShareToken) });
}

// POST — create (or return existing) active share link
export async function POST(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getDbUser();
  if (error)
    return NextResponse.json({ error: error.code }, { status: error.status });

  const { id } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      authorId: true,
      status: true,
      publicShareToken: true,
      publicShareEnabled: true,
    },
  });

  if (!post || post.authorId !== user.id)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  if (post.status === "DRAFT" || post.status === "ARCHIVED")
    return NextResponse.json({ error: "Post cannot be shared" }, { status: 409 });

  if (post.publicShareEnabled && post.publicShareToken)
    return NextResponse.json({ url: shareUrl(post.publicShareToken), created: false });

  // Generate a fresh token (covers both first-time create and re-enable after disable)
  const token = generateToken();
  await prisma.post.update({
    where: { id },
    data: {
      publicShareToken: token,
      publicShareEnabled: true,
      publicShareCreatedAt: new Date(),
    },
  });

  console.log("[Analytics] post_share_link_created", {
    postId: id,
    authorId: user.id,
    postStatus: post.status,
  });

  return NextResponse.json({ url: shareUrl(token), created: true });
}

// DELETE — disable share link
export async function DELETE(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { user, error } = await getDbUser();
  if (error)
    return NextResponse.json({ error: error.code }, { status: error.status });

  const { id } = await context.params;
  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!post || post.authorId !== user.id)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  await prisma.post.update({
    where: { id },
    data: { publicShareEnabled: false },
  });

  return NextResponse.json({ ok: true });
}
