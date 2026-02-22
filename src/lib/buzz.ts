// src/lib/buzz.ts

import { prisma } from "@/lib/prisma";
import { ActivityEventType } from "@/generated/prisma/enums";
import { getAcceptedFriendIds } from "@/lib/friends";
import type { BuzzItemProps, BuzzKind } from "@/components/buzz/BuzzItem";

type GetBuzzArgs = {
  userId: string;
  limit?: number;
};

function truncate(value: any, max = 80): string | undefined {
  if (!value) return undefined;

  // --- STRING HANDLING ---
  if (typeof value === "string") {
    if (value.length <= max) return value;
    return value.slice(0, max) + "…"; // <— clean truncation + ellipsis
  }

  return undefined;
}

// --- mapping helpers --------------------------------------------------------

function mapKind(eventType: ActivityEventType): BuzzKind {
  switch (eventType) {
    case ActivityEventType.POST_LIKED:
    case ActivityEventType.COMMENT_LIKED:
      return "like";
    case ActivityEventType.POST_COMMENTED:
    case ActivityEventType.COMMENT_REPLIED:
      return "comment";
    case ActivityEventType.POST_SUBMITTED:
      return "submit";
    case ActivityEventType.POST_PUBLISHED:
      return "publish";
    default:
      return "comment"; // harmless fallback
  }
}

function mapVerbLabel(eventType: ActivityEventType): string {
  switch (eventType) {
    // All comment activity → "commented"
    case ActivityEventType.POST_COMMENTED:
    case ActivityEventType.COMMENT_REPLIED:
      return "commented";

    // Likes: "liked" (post vs comment handled via subcard content)
    case ActivityEventType.POST_LIKED:
    case ActivityEventType.COMMENT_LIKED:
      return "liked";

    case ActivityEventType.POST_SUBMITTED:
      return "submitted";

    case ActivityEventType.POST_PUBLISHED:
      return "published";

    default:
      return "did something";
  }
}

const COMMENT_TARGET_EVENTS: ActivityEventType[] = [
  ActivityEventType.COMMENT_LIKED,
  ActivityEventType.POST_COMMENTED,
  ActivityEventType.COMMENT_REPLIED,
];

function isCommentTargetEvent(eventType: ActivityEventType): boolean {
  return COMMENT_TARGET_EVENTS.includes(eventType);
}

function buildHref(e: {
  post: { id: string };
  comment: { id: string } | null;
  eventType: ActivityEventType;
}): string {
  const base = `/reader/${e.post.id}`;

  if (isCommentTargetEvent(e.eventType) && e.comment) {
    return `${base}#comment-${e.comment.id}`;
  }

  return base;
}

// --- main --------------------------------------------------------

export async function getBuzz({
  userId,
  limit = 50,
}: GetBuzzArgs): Promise<BuzzItemProps[]> {
  // 1) Whose activity we care about
  const friendIds = await getAcceptedFriendIds(userId);
  if (!friendIds || friendIds.length === 0) {
    return [];
  }

  // 2) Fetch recent activity for those friends
  const events = await prisma.activityEvent.findMany({
    where: {
      actorId: { in: friendIds },
    },
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          username: true,
          image: true,
        },
      },
      post: {
        select: {
          id: true,
          title: true,
          content: true,
          author: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      },
      comment: {
        select: {
          id: true,
          content: true,
          parentCommentId: true,
          postId: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  // 3) Normalize → BuzzItemProps
  const items: BuzzItemProps[] = events
    .filter((e) => !!e.post) // skip events with missing/deleted post
    .map((e) => {
      const kind = mapKind(e.eventType);
      const verbLabel = mapVerbLabel(e.eventType);

      const actorName = e.actor.name ?? e.actor.username ?? "Someone";

      const postTitle =
        e.post!.title ?? truncate(e.post!.content) ?? "Untitled post";

      const postAuthorName =
        e.post!.author.name ?? e.post!.author.username ?? "Someone";

      // Only show commentText when the event is on a comment
      const commentText = isCommentTargetEvent(e.eventType)
        ? (truncate(e.comment?.content, 160) ?? null)
        : null;

      const href = buildHref({
        post: e.post!,
        comment: e.comment,
        eventType: e.eventType,
      });

      return {
        id: e.id,
        kind,
        actorName,
        actorAvatarUrl: e.actor.image,
        verbLabel,
        postTitle,
        postAuthorName,
        commentText,
        createdAt: e.createdAt.toISOString(),
        href,
      };
    });

  return items;
}
