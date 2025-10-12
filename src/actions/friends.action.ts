"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";

export async function getFriends() {
  const userId = await getDbUserId();
  if (!userId) return [];

  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ aId: userId }, { bId: userId }],
    },
    include: {
      a: true,
      b: true,
    },
  });

  // Flatten to list of friend users
  const friends = friendships.map((f) => (f.aId === userId ? f.b : f.a));

  return friends;
}
