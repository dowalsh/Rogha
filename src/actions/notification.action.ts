"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import {
  triggerCommentNotificationEmail,
  triggerPostSubmittedEmails,
} from "@/lib/emails/triggers";
import { recordActivityEvent } from "@/actions/activityEvent.action";
import { ActivityEventType } from "@/generated/prisma/enums";
import { sendPushToUser } from "@/lib/push/sender";

async function getUserEmailPrefs(userId: string) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  return {
    emailEnabled: prefs?.emailEnabled ?? true,
    emailComments: prefs?.emailComments ?? true,
    emailReplies: prefs?.emailReplies ?? true,
    emailSubmissions: prefs?.emailSubmissions ?? true,
    emailFriendRequests: prefs?.emailFriendRequests ?? true,
  };
}

async function getUserPushPrefs(userId: string) {
  const prefs = await prisma.notificationPreference.findUnique({
    where: { userId },
  });
  return {
    pushEnabled: prefs?.pushEnabled ?? true,
    pushComments: prefs?.pushComments ?? true,
    pushReplies: prefs?.pushReplies ?? true,
    pushSubmissions: prefs?.pushSubmissions ?? true,
    pushFriendRequests: prefs?.pushFriendRequests ?? true,
  };
}

export async function getNotifications() {
  try {
    const userId = await getDbUserId();
    if (!userId) return [];

    const notifications = await prisma.notification.findMany({
      where: {
        userId,
      },
      include: {
        creator: {
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
            image: true,
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            postId: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20,
    });

    return notifications;
  } catch (error) {
    console.error("Error fetching notifications:", error);
    throw new Error("Failed to fetch notifications");
  }
}

export async function markNotificationsAsRead(userId: string) {
  try {
    await prisma.notification.updateMany({
      where: {
        userId,
      },
      data: {
        read: true,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    return { success: false };
  }
}

export async function getUnreadCount() {
  const userId = await getDbUserId();
  if (!userId) return 0;

  return prisma.notification.count({
    where: {
      userId,
      read: false,
    },
  });
}

export async function createLikeNotification({
  likerId,
  postId,
  commentId,
}: {
  likerId: string;
  postId?: string;
  commentId?: string;
}) {
  if (!postId && !commentId) return null;

  if (postId) {
    const post = await prisma.post.findUnique({ where: { id: postId } });
    if (!post || post.authorId === likerId) return null;

    return prisma.notification.create({
      data: {
        userId: post.authorId, // recipient
        creatorId: likerId, // actor
        type: "LIKE",
        postId,
      },
    });
  }

  if (commentId) {
    const comment = await prisma.comment.findUnique({
      where: { id: commentId },
    });
    if (!comment || comment.authorId === likerId) return null;

    return prisma.notification.create({
      data: {
        userId: comment.authorId,
        creatorId: likerId,
        type: "LIKE",
        commentId,
      },
    });
  }
}
export async function createCommentNotification({
  commenterId,
  postId,
  parentCommentId,
  newCommentId,
}: {
  commenterId: string;
  postId?: string;
  parentCommentId?: string;
  newCommentId: string;
}) {
  // get commenter info
  const commenter = await prisma.user.findUnique({
    where: { id: commenterId },
    select: { name: true, username: true },
  });

  // get comment info
  const newComment = await prisma.comment.findUnique({
    where: { id: newCommentId },
    select: { id: true, content: true, postId: true },
  });

  if (!commenter || !newComment) return null;

  if (postId) {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: { author: true }, // we need recipient's email
    });

    if (!post || post.authorId === commenterId) return null;

    const notif = await prisma.notification.create({
      data: {
        userId: post.authorId,
        creatorId: commenterId,
        type: "COMMENT",
        postId,
        commentId: newCommentId,
      },
    });

    try {
      const emailPrefs = await getUserEmailPrefs(post.authorId);
      if (emailPrefs.emailEnabled && emailPrefs.emailComments) {
        await triggerCommentNotificationEmail({
          to: post.author.email,
          actorName: commenter.name ?? commenter.username,
          commentText: newComment.content,
          url: `${process.env.APP_URL}/open/reader/${post.id}#comment-${newComment.id}`,
          postTitle: post.title,
          isReply: false,
        });
      }
    } catch (err) {
      console.error("[COMMENT_EMAIL_ERROR]", err);
    }

    const pushPrefs = await getUserPushPrefs(post.authorId);
    if (pushPrefs.pushEnabled && pushPrefs.pushComments) {
      await sendPushToUser(post.authorId, {
        title: "New comment",
        body: `${commenter.name ?? commenter.username} commented on "${post.title ?? "your post"}"`,
        url: `/reader/${postId}#comment-${newCommentId}`,
      });
    }

    return notif;
  }

  if (parentCommentId) {
    const threadComments = await prisma.comment.findMany({
      where: {
        OR: [
          { id: parentCommentId }, // the parent comment itself
          { parentCommentId }, // all replies to that parent
        ],
      },
      include: { author: true },
      orderBy: { createdAt: "asc" },
    });

    // collect unique participant IDs (exclude the new commenter)
    console.log("Raw threadComments:", threadComments);
    console.log(
      "Mapped authorIds:",
      threadComments.map((c) => c.authorId)
    );
    console.log("CommenterId to exclude:", commenterId);

    const participantIds = Array.from(
      new Set(
        threadComments
          .map((c) => c.authorId)
          .filter((id) => {
            const shouldInclude = id !== commenterId;
            console.log(`Filtering id=${id}, include=${shouldInclude}`);
            return shouldInclude;
          })
      )
    );

    console.log("Final participantIds:", participantIds);

    if (participantIds.length === 0) return null;

    const notifications = await prisma.notification.createMany({
      data: participantIds.map((uid) => ({
        userId: uid,
        creatorId: commenterId,
        type: "COMMENT",
        commentId: newCommentId,
      })),
      skipDuplicates: true,
    });

    // send emails + push to each participant, respecting preferences
    const replyPrefRows = await prisma.notificationPreference.findMany({
      where: { userId: { in: participantIds } },
      select: {
        userId: true,
        emailEnabled: true,
        emailReplies: true,
        pushEnabled: true,
        pushReplies: true,
      },
    });
    const replyPrefsMap = new Map(replyPrefRows.map((p) => [p.userId, p]));

    for (const uid of participantIds) {
      const participant = threadComments.find(
        (c) => c.authorId === uid
      )?.author;
      if (!participant) continue;

      const p = replyPrefsMap.get(uid);
      const shouldEmail = !p || (p.emailEnabled && p.emailReplies);
      if (!shouldEmail) continue;

      try {
        console.log("Sending email to:", participant.email);

        await triggerCommentNotificationEmail({
          to: participant.email,
          actorName: commenter.name ?? commenter.username,
          commentText: newComment.content,
          url: `${process.env.APP_URL}/open/reader/${newComment.postId}#comment-${newComment.id}`,
          isReply: true,
        });
      } catch (err) {
        console.error("[COMMENT_THREAD_EMAIL_ERROR]", err);
      }

      const pp = replyPrefsMap.get(uid);
      if (!pp || (pp.pushEnabled && pp.pushReplies)) {
        await sendPushToUser(uid, {
          title: "New reply",
          body: `${commenter.name ?? commenter.username} replied in a thread`,
          url: `/reader/${newComment.postId}#comment-${newCommentId}`,
        });
      }
    }

    return notifications;
  }
}

export async function createFriendRequestNotification({
  requesterId,
  targetId,
}: {
  requesterId: string;
  targetId: string;
}) {
  const [notif, requester] = await Promise.all([
    prisma.notification.create({
      data: { userId: targetId, creatorId: requesterId, type: "FRIEND_REQUEST" },
    }),
    prisma.user.findUnique({
      where: { id: requesterId },
      select: { name: true, username: true },
    }),
  ]);

  const pushPrefs = await getUserPushPrefs(targetId);
  if (pushPrefs.pushEnabled && pushPrefs.pushFriendRequests) {
    await sendPushToUser(targetId, {
      title: "Friend request",
      body: `${requester?.name ?? requester?.username ?? "Someone"} sent you a friend request`,
      url: `/circles`,
    });
  }

  return notif;
}

export async function createSubmitNotifications({
  userId,
  postId,
}: {
  userId: string;
  postId: string;
}) {
  // 1. Load post audience info
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      audienceType: true, // "ALL_USERS" | "FRIENDS" | "CIRCLE"
      circleId: true,
    },
  });

  if (!post) return;

  // 2. ALL ROGHA USERS => no notifications, no emails
  if (post.audienceType === "ALL_USERS") {
    return;
  }

  let recipientIds: string[] = [];

  // 3. FRIENDS => all accepted friends
  if (post.audienceType === "FRIENDS") {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "ACCEPTED",
        OR: [{ aId: userId }, { bId: userId }],
      },
      select: { aId: true, bId: true },
    });

    recipientIds = friendships.map((f) => (f.aId === userId ? f.bId : f.aId));
  }

  // 4. CIRCLE => only circle members
  if (post.audienceType === "CIRCLE" && post.circleId) {
    const members = await prisma.circleMember.findMany({
      where: {
        circleId: post.circleId,
        status: "JOINED",
      },
      select: { userId: true },
    });

    recipientIds = members.map((m) => m.userId);
  }

  // Remove self + dedupe
  const uniqueRecipientIds = Array.from(
    new Set(recipientIds.filter((id) => id !== userId))
  );

  if (uniqueRecipientIds.length === 0) return;

  // 5. Check who already has a SUBMIT notification for this post+creator
  const existing = await prisma.notification.findMany({
    where: {
      type: "SUBMIT",
      creatorId: userId,
      postId,
      userId: { in: uniqueRecipientIds },
    },
    select: { userId: true },
  });

  const existingUserIds = new Set(existing.map((n) => n.userId));
  const newRecipientIds = uniqueRecipientIds.filter(
    (id) => !existingUserIds.has(id)
  );

  // If no new recipients, bail early (no new notifs, no duplicate emails)
  if (newRecipientIds.length === 0) {
    console.log(
      "[NOTIFICATIONS] All submission notifications already exist — skipping.",
      { postId, creatorId: userId }
    );
    return;
  }

  // 6. Create notifications only for new recipients
  await prisma.notification.createMany({
    data: newRecipientIds.map((rid) => ({
      userId: rid,
      creatorId: userId,
      type: "SUBMIT",
      postId,
    })),
    skipDuplicates: true, // belt-and-braces
  });

  // 7. Send emails + push to new recipients, respecting preferences
  const submitPrefRows = await prisma.notificationPreference.findMany({
    where: { userId: { in: newRecipientIds } },
    select: {
      userId: true,
      emailEnabled: true,
      emailSubmissions: true,
      pushEnabled: true,
      pushSubmissions: true,
    },
  });
  const submitPrefsMap = new Map(submitPrefRows.map((p) => [p.userId, p]));

  const emailRecipientIds = newRecipientIds.filter((id) => {
    const p = submitPrefsMap.get(id);
    return !p || (p.emailEnabled && p.emailSubmissions);
  });

  const pushRecipientIds = newRecipientIds.filter((id) => {
    const p = submitPrefsMap.get(id);
    return !p || (p.pushEnabled && p.pushSubmissions);
  });

  // Look up author name for push message
  const author = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, username: true },
  });
  const authorName = author?.name ?? author?.username ?? "Someone";

  try {
    await triggerPostSubmittedEmails(postId, emailRecipientIds);

    await recordActivityEvent({
      actorId: userId,
      eventType: ActivityEventType.POST_SUBMITTED,
      postId,
    });
  } catch (err) {
    console.error("[NOTIFICATION_SUBMIT_EMAIL_ERROR]", err);
  }

  for (const uid of pushRecipientIds) {
    await sendPushToUser(uid, {
      title: "New post",
      body: `${authorName} submitted a new post`,
      url: `/reader/${postId}`,
    });
  }
}
