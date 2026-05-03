// src/lib/buzz.ts

import { prisma } from "@/lib/prisma";
import { ActivityEventType } from "@/generated/prisma/enums";
import { getAcceptedFriendships } from "@/lib/friends";
import type { BuzzItemProps, BuzzKind } from "@/components/buzz/BuzzItem";
import { resolveVisiblePosts } from "@/lib/access/postAccess";

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
  // 1) Whose activity we care about (with friendship dates for temporal gating)
  const friendships = await getAcceptedFriendships(userId);
  if (!friendships.length) return [];
  const friendMap = new Map(friendships.map((f) => [f.friendId, f.acceptedAt]));
  const friendIds = Array.from(friendMap.keys());

  // 2a) Fetch FRIENDS/CIRCLE posts authored by direct friends.
  //
  // These are used to surface "mutual friend" activity in Buzz:
  // if Bob (not my friend) comments on Alice's (my friend) FRIENDS post,
  // I can already see that comment when I open the post — so it should
  // also appear in Buzz.
  //
  // Why only FRIENDS and CIRCLE audience posts (not ALL_USERS)?
  //   - FRIENDS post: only the author's friends can see/comment → every
  //     commenter is a mutual friend by definition.
  //   - CIRCLE post: only joined circle members can comment → controlled group.
  //   - ALL_USERS post: any stranger on the platform can comment → surfacing
  //     their activity would introduce unknown users into the Buzz feed.
  const publishedPostsByFriends = await prisma.post.findMany({
    where: {
      authorId: { in: friendIds },
      status: "PUBLISHED",
      audienceType: { in: ["FRIENDS", "CIRCLE"] },
    },
    select: { id: true, authorId: true },
  });
  // Map: postId → post's authorId (used for temporal gating when the actor
  // is a mutual friend rather than a direct friend)
  const postIdToAuthorId = new Map(
    publishedPostsByFriends.map((p) => [p.id, p.authorId]),
  );
  const publishedFriendAudiencePostIds = Array.from(postIdToAuthorId.keys());

  // 2b) Fetch recent activity events.
  //
  // Two sources of events shown in Buzz:
  //   a) Direct friend as actor — their activity anywhere on the platform
  //   b) Any user acting on a friend's FRIENDS/CIRCLE post (mutual friends)
  //
  // Likes (POST_LIKED, COMMENT_LIKED) are excluded from both sources — they
  // are too noisy and don't add conversational signal.
  const events = await prisma.activityEvent.findMany({
    where: {
      OR: [
        // (a) Direct friends' own activity
        { actorId: { in: friendIds } },
        // (b) Any user's activity on a friend's restricted post —
        //     excludes the viewer's own activity (you don't need to see
        //     yourself commenting in your own Buzz feed)
        {
          postId: { in: publishedFriendAudiencePostIds },
          actorId: { not: userId },
        },
      ],
      eventType: {
        notIn: [ActivityEventType.POST_LIKED, ActivityEventType.COMMENT_LIKED],
      },
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
          authorId: true, // ADD
          status: true, // ADD
          audienceType: true, // ADD
          circleId: true, // ADD
          createdAt: true, // ADD
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

  // 3) Temporal gate: only include events that occurred after the relevant
  //    friendship was accepted.
  //
  //    For direct friends (actor is in friendMap):
  //      gate on when the viewer became friends with the actor.
  //
  //    For mutual friends (actor is NOT a direct friend, acting on a friend's post):
  //      gate on when the viewer became friends with the POST AUTHOR.
  //      Rationale: I started seeing Alice's world when I friended Alice, so
  //      any activity on Alice's posts after that date is fair game.
  const temporallyGatedEvents = events.filter((e) => {
    const viewerFriendshipWithActor = friendMap.get(e.actorId);
    if (viewerFriendshipWithActor) return e.createdAt >= viewerFriendshipWithActor;

    // Mutual friend path: use the post author's friendship date as the gate
    if (e.post) {
      const viewerFriendshipWithPostAuthor = friendMap.get(e.post.authorId);
      if (viewerFriendshipWithPostAuthor)
        return e.createdAt >= viewerFriendshipWithPostAuthor;
    }
    return false;
  });

  // POST_SUBMITTED events reference posts that are still SUBMITTED (not PUBLISHED),
  // so the access check would block them for everyone except the author. Since the
  // submission signal is "my friend submitted something" and the actor already passed
  // temporal gating as a direct friend, skip the access check for these events.
  const isSubmitFromDirectFriend = (e: (typeof temporallyGatedEvents)[number]) =>
    e.eventType === ActivityEventType.POST_SUBMITTED && friendMap.has(e.actorId);

  const submitEvents = temporallyGatedEvents.filter(isSubmitFromDirectFriend);
  const nonSubmitEvents = temporallyGatedEvents.filter((e) => !isSubmitFromDirectFriend(e));

  // Extract posts for access resolution (non-submit events only)
  const postsForAccess = nonSubmitEvents
    .filter((e) => !!e.post)
    .map((e) => ({
      id: e.post!.id,
      authorId: e.post!.authorId,
      status: e.post!.status,
      audienceType: e.post!.audienceType,
      circleId: e.post!.circleId,
      createdAt: e.post!.createdAt,
    }));

  // Ask access layer which posts are visible
  const visiblePosts = await resolveVisiblePosts({
    viewerId: userId,
    posts: postsForAccess,
  });

  const visiblePostIds = new Set(visiblePosts.map((p) => p.id));

  const visibleNonSubmitEvents = nonSubmitEvents.filter(
    (e) => e.post && visiblePostIds.has(e.post.id),
  );

  // Merge and re-sort by recency (each group was already ordered, but we're combining two)
  const visibleEvents = [...submitEvents, ...visibleNonSubmitEvents].sort(
    (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
  );

  const items: BuzzItemProps[] = visibleEvents.map((e) => {
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

    // Submitted posts aren't published yet — no readable page to link to
    const href =
      e.eventType === ActivityEventType.POST_SUBMITTED
        ? undefined
        : buildHref({ post: e.post!, comment: e.comment, eventType: e.eventType });

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
