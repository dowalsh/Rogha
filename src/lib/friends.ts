// src/lib/friends.ts

export type FriendshipStatus = "PENDING" | "ACCEPTED";

export type FriendshipRow = {
  aId: string;
  bId: string;
  requesterId: string;
  status: FriendshipStatus;
  // optional fields you might select alongside:
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
  // Lexicographic ordering; if you want locale-aware, use localeCompare.
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
  // PENDING
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
