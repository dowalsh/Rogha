// src/actions/buzz.action.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";

// Advances the global "seen" cursor for circle-join Buzz rows (see
// getCircleJoinBuzzRows in src/lib/home.ts). Called once per home-page visit
// from the client, not on every /api/home read, so the New/Earlier split
// doesn't shift under the viewer mid-visit — it only moves on their next
// visit.
export async function markCircleJoinBuzzSeen() {
  const userId = await getDbUserId();
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { circleJoinBuzzSeenAt: new Date() },
  });
}
