// src/lib/friends.ts
import { prisma } from "@/lib/prisma";

export type FriendshipStatus = "PENDING" | "ACCEPTED";

export type FriendshipRow = {
  aId: string;
  bId: string;
  requesterId: string;
  status: FriendshipStatus;
  acceptedAt?: Date | null;
  createdAt?: Date;
};

/**
 * Compute the canonical unordered pair (aId < bId).
 * Throws if both ids are equal (self-friendship is invalid).
 */
export function canonicalPair(
  meId: string,
  otherId: string
): { aId: string; bId: string } {
  if (meId === otherId) {
    throw new Error("SELF_NOT_ALLOWED");
  }
  return meId < otherId
    ? { aId: meId, bId: otherId }
    : { aId: otherId, bId: meId };
}

/**
 * Given a friendship DB row (or null) and the caller's id,
 * return the caller's perspective state.
 */
export function derivePerspectiveState(
  row: FriendshipRow | null,
  meId: string
): "NONE" | "PENDING_OUTGOING" | "PENDING_INCOMING" | "ACCEPTED" {
  if (!row) return "NONE";
  if (row.status === "ACCEPTED") return "ACCEPTED";
  return row.requesterId === meId ? "PENDING_OUTGOING" : "PENDING_INCOMING";
}

/**
 * Convenience: return the OTHER user's id from a friendship row.
 * Assumes `meId` matches either aId or bId. If not, throws.
 */
export function getOtherUserId(
  row: Pick<FriendshipRow, "aId" | "bId">,
  meId: string
): string {
  if (row.aId === meId) return row.bId;
  if (row.bId === meId) return row.aId;
  throw new Error("ME_NOT_IN_EDGE");
}

export type FriendRecipient = {
  userId: string;
  email: string;
  name: string | null;
};

/**
 * Return all accepted friends of a user with valid emails.
 */
export async function getAcceptedFriendRecipients(
  userId: string
): Promise<FriendRecipient[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ aId: userId }, { bId: userId }],
    },
    select: {
      aId: true,
      bId: true,
      a: { select: { id: true, email: true, name: true } },
      b: { select: { id: true, email: true, name: true } },
    },
  });

  return friendships
    .map((f) =>
      f.aId === userId
        ? { userId: f.b.id, email: f.b.email, name: f.b.name }
        : { userId: f.a.id, email: f.a.email, name: f.a.name }
    )
    .filter(
      (r): r is FriendRecipient =>
        typeof r.email === "string" && r.email.includes("@")
    );
}

/**
 * Return only the IDs of all accepted friends for a given user.
 * Useful for filtering editions, comments, posts, etc.
 */
export async function getAcceptedFriendIds(userId: string): Promise<string[]> {
  const friendships = await prisma.friendship.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ aId: userId }, { bId: userId }],
    },
    select: { aId: true, bId: true },
  });

  return friendships.map((f) => (f.aId === userId ? f.bId : f.aId));
}
