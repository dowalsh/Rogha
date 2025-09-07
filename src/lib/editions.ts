import { prisma } from "@/lib/prisma";

/**
 * Publishes the edition for the given weekStart (LA Monday 00:00 stored in UTC).
 * Idempotent for the "publishedAt" stamp. Subsequent runs will still promote any
 * newly SUBMITTED posts to PUBLISHED.
 */
export async function publishEditionForWeek(weekStart: Date) {
  return prisma.$transaction(async (tx) => {
    const edition = await tx.edition.findUnique({
      where: { weekStart },
      select: { id: true, publishedAt: true },
    });

    // No edition for that week → nothing to do
    if (!edition) {
      return {
        ok: true,
        published: false,
        reason: "NO_EDITION" as const,
        postsPublished: 0,
      };
    }

    // If already published: still promote any SUBMITTED posts now
    if (edition.publishedAt) {
      const { count: promotedNow } = await tx.post.updateMany({
        where: { editionId: edition.id, status: "SUBMITTED" },
        data: { status: "PUBLISHED" },
      });

      return {
        ok: true,
        published: false,
        reason: "ALREADY_PUBLISHED" as const,
        editionId: edition.id,
        postsPublished: promotedNow,
      };
    }

    // First-time publish: stamp publishedAt, publish SUBMITTED, archive remaining DRAFT
    await tx.edition.update({
      where: { id: edition.id },
      data: { publishedAt: new Date() },
    });

    const { count: publishedCount } = await tx.post.updateMany({
      where: { editionId: edition.id, status: "SUBMITTED" },
      data: { status: "PUBLISHED" },
    });

    await tx.post.updateMany({
      where: { editionId: edition.id, status: "DRAFT" },
      data: { status: "ARCHIVED" },
    });

    return {
      ok: true,
      published: true,
      editionId: edition.id,
      postsPublished: publishedCount,
    };
  });
}
