"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import {
  triggerCommentNotificationEmail,
  triggerPostSubmittedEmails,
} from "@/lib/emails/triggers";

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

export async function markNotificationsAsRead(notificationIds: string[]) {
  try {
    await prisma.notification.updateMany({
      where: {
        id: {
          in: notificationIds,
        },
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
      await triggerCommentNotificationEmail({
        to: post.author.email,
        actorName: commenter.name ?? commenter.username,
        commentText: newComment.content,
        url: `${process.env.APP_URL}/posts/${post.id}#comment-${newComment.id}`,
        postTitle: post.title,
        isReply: false,
      });
    } catch (err) {
      console.error("[COMMENT_EMAIL_ERROR]", err);
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

    // send emails to each participant (unique IDs only)
    for (const uid of participantIds) {
      const participant = threadComments.find(
        (c) => c.authorId === uid
      )?.author;
      if (!participant) continue;

      try {
        console.log("Sending email to:", participant.email);

        await triggerCommentNotificationEmail({
          to: participant.email,
          actorName: commenter.name ?? commenter.username,
          commentText: newComment.content,
          url: `${process.env.APP_URL}/posts/${newComment.postId}#comment-${newComment.id}`,
          isReply: true,
        });
      } catch (err) {
        console.error("[COMMENT_THREAD_EMAIL_ERROR]", err);
      }
    }

    return notifications;
  }
}
export async function createSubmitNotifications({
  userId,
  postId,
}: {
  userId: string;
  postId: string;
}) {
  const friendships = await prisma.friendship.findMany({
    where: { status: "ACCEPTED", OR: [{ aId: userId }, { bId: userId }] },
  });

  const friendIds = friendships.map((f) => (f.aId === userId ? f.bId : f.aId));
  if (friendIds.length === 0) return;

  await prisma.notification.createMany({
    data: friendIds.map((fid) => ({
      userId: fid,
      creatorId: userId,
      type: "SUBMIT",
      postId,
    })),
    skipDuplicates: true,
  });

  // 🔔 Centralized email handling
  try {
    await triggerPostSubmittedEmails(postId);
  } catch (err) {
    console.error("[NOTIFICATION_SUBMIT_EMAIL_ERROR]", err);
  }
}
