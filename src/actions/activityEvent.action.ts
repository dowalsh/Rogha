"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { ActivityEventType } from "@/generated/prisma/enums";

type RecordActivityEventInput = {
  actorId: string;
  eventType: ActivityEventType;
  postId: string; // required (for now)
  commentId?: string; // optional
};

export async function recordActivityEvent({
  actorId,
  eventType,
  postId,
  commentId,
}: RecordActivityEventInput) {
  console.log(
    "[ActivityEvent] Creating event",
    JSON.stringify(
      {
        actorId,
        eventType,
        postId,
        commentId: commentId ?? null,
        timestamp: new Date().toISOString(),
      },
      null,
      2
    )
  );
  return prisma.activityEvent.create({
    data: {
      actorId,
      eventType,
      postId,
      commentId,
    },
  });
}
