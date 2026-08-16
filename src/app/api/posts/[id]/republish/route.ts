// src/app/api/posts/[id]/republish/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { getRepublishEligibleFriends } from "@/lib/access/postAccess";
import { hasRepublishRationAvailable } from "@/lib/republish";
import { getAcceptedFriendIds } from "@/lib/friends";

const MAX_REPUBLISH_MESSAGE_LENGTH = 500;

async function loadOwnedPublishedPost(id: string, authorId: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: {
      id: true,
      authorId: true,
      status: true,
      audienceType: true,
      circleId: true,
      createdAt: true,
      title: true,
      content: true,
      heroImageUrl: true,
      heroThumbUrl: true,
      heroThumbBlurUrl: true,
      republishedFromPostId: true,
      edition: { select: { publishedAt: true } },
    },
  });

  if (!post || post.authorId !== authorId || post.status !== "PUBLISHED") {
    return null;
  }

  return post;
}

// GET — eligibility for the recipient checklist: ration status + the
// reverse-temporal friend list (friends who currently can't see this post).
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id } = await context.params;
    const post = await loadOwnedPublishedPost(id, user.id);
    if (!post) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    const [rationAvailable, friendIds, eligibleFriends] = await Promise.all([
      hasRepublishRationAvailable(user.id),
      getAcceptedFriendIds(user.id),
      getRepublishEligibleFriends(user.id, {
        id: post.id,
        authorId: post.authorId,
        status: post.status,
        audienceType: post.audienceType,
        circleId: post.circleId,
        createdAt: post.createdAt,
        publishedAt: post.edition?.publishedAt ?? null,
      }),
    ]);

    return NextResponse.json(
      {
        rationAvailable,
        hasFriends: friendIds.length > 0,
        friends: eligibleFriends,
      },
      { status: 200 },
    );
  } catch (err) {
    console.error("[POST_REPUBLISH_ELIGIBILITY_GET_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

// POST — send: creates a fresh Post instance scoped to the named recipients.
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { user, error } = await getDbUser();
    if (error) {
      return NextResponse.json({ error: error.code }, { status: error.status });
    }

    const { id } = await context.params;
    const post = await loadOwnedPublishedPost(id, user.id);
    if (!post) {
      return NextResponse.json({ error: "Not Found" }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // tolerate empty body
    }
    const recipientIds: string[] = Array.isArray(body.recipientIds)
      ? body.recipientIds.filter((x: unknown) => typeof x === "string")
      : [];

    if (recipientIds.length === 0) {
      return NextResponse.json(
        { code: "republish.NO_RECIPIENTS", message: "Pick at least one friend." },
        { status: 400 },
      );
    }

    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (rawMessage.length > MAX_REPUBLISH_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          code: "republish.MESSAGE_TOO_LONG",
          message: `Keep your note under ${MAX_REPUBLISH_MESSAGE_LENGTH} characters.`,
        },
        { status: 400 },
      );
    }
    const republishMessage = rawMessage.length > 0 ? rawMessage : null;

    const rationAvailable = await hasRepublishRationAvailable(user.id);
    if (!rationAvailable) {
      return NextResponse.json(
        {
          code: "republish.RATION_SPENT",
          message: "You've already republished this week (you only get one Republish per week!).",
        },
        { status: 409 },
      );
    }

    // Never trust the client's checklist — recompute eligibility server-side.
    const eligibleFriends = await getRepublishEligibleFriends(user.id, {
      id: post.id,
      authorId: post.authorId,
      status: post.status,
      audienceType: post.audienceType,
      circleId: post.circleId,
      createdAt: post.createdAt,
      publishedAt: post.edition?.publishedAt ?? null,
    });
    const selected = eligibleFriends.filter((f) => recipientIds.includes(f.id));

    if (selected.length !== recipientIds.length || selected.length === 0) {
      return NextResponse.json(
        {
          code: "republish.INELIGIBLE_RECIPIENT",
          message: "One of the people you picked can already see this post.",
        },
        { status: 400 },
      );
    }

    const rootOriginalId = post.republishedFromPostId ?? post.id;

    const created = await prisma.$transaction(async (tx) => {
      const newPost = await tx.post.create({
        data: {
          authorId: user.id,
          title: post.title,
          content: post.content ?? undefined,
          heroImageUrl: post.heroImageUrl,
          heroThumbUrl: post.heroThumbUrl,
          heroThumbBlurUrl: post.heroThumbBlurUrl,
          status: "SUBMITTED",
          audienceType: "RECIPIENTS",
          republishedFromPostId: rootOriginalId,
          republishMessage,
        },
        select: { id: true },
      });

      await tx.postRecipient.createMany({
        data: selected.map((f) => ({ postId: newPost.id, userId: f.id })),
      });

      return newPost;
    });

    return NextResponse.json(
      {
        id: created.id,
        recipientNames: selected.map((f) => f.username),
      },
      { status: 201 },
    );
  } catch (err) {
    console.error("[POST_REPUBLISH_SEND_ERROR]", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
