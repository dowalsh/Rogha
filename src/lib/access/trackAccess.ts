// src/lib/access/trackAccess.ts
//
// "Can viewer V see WeeklyTrack T" — mirrors requirePostAccess in
// postAccess.ts, but for Weekly Jam rows. A track is visible to its owner
// and to accepted friends whose friendship predates the edition going live
// (same temporal gate FRIENDS-audience posts use), minus anyone blocked —
// the same candidate rule getWeeklyJamForEdition (src/lib/jam.ts) applies
// when building the rows a viewer sees on the Jam page.

import { prisma } from "@/lib/prisma";
import { getAcceptedFriendships } from "@/lib/friends";

export async function canViewTrack(
  viewerId: string | null,
  track: { userId: string; editionPublishedAt: Date | null },
): Promise<boolean> {
  if (!viewerId) return false;
  if (viewerId === track.userId) return true;

  const [friendships, blocked] = await Promise.all([
    getAcceptedFriendships(viewerId),
    // One-directional, same as postAccess: blocking someone hides their
    // content from you, not the reverse.
    prisma.block.findFirst({
      where: { blockerId: viewerId, blockedId: track.userId },
      select: { blockedId: true },
    }),
  ]);

  if (blocked) return false;

  const friendship = friendships.find((f) => f.friendId === track.userId);
  if (!friendship) return false;

  return friendship.acceptedAt <= (track.editionPublishedAt ?? new Date(0));
}

export async function requireTrackAccess(viewerId: string | null, trackId: string) {
  const track = await prisma.weeklyTrack.findUnique({
    where: { id: trackId },
    select: {
      id: true,
      editionId: true,
      userId: true,
      edition: { select: { publishedAt: true } },
    },
  });

  if (!track) return null;

  const allowed = await canViewTrack(viewerId, {
    userId: track.userId,
    editionPublishedAt: track.edition?.publishedAt ?? null,
  });

  if (!allowed) return null;

  return track;
}
