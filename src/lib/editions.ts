import { prisma } from "@/lib/prisma";

/**
 * Publishes the edition for the given weekStart (LA Monday 00:00 stored in UTC).
 * Idempotent: if already published, it returns without changing publishedAt.
 */
export async function publishEditionForWeek(weekStart: Date) {
  return prisma.$transaction(async (tx) => {
    const edition = await tx.edition.findUnique({
      where: { weekStart },
      select: { id: true, publishedAt: true },
    });

    // Nothing to publish (no edition was created for that week)
    if (!edition) {
      return { ok: true, published: false, reason: "NO_EDITION" as const };
    }

    // Already published — do nothing
    if (edition.publishedAt) {
      return {
        ok: true,
        published: false,
        reason: "ALREADY_PUBLISHED" as const,
        editionId: edition.id,
      };
    }

    // Publish the edition and promote posts
    await tx.edition.update({
      where: { id: edition.id },
      data: { publishedAt: new Date() },
    });

    // Publish submitted posts
    const { count: publishedCount } = await tx.post.updateMany({
      where: { editionId: edition.id, status: "SUBMITTED" },
      data: { status: "PUBLISHED" },
    });

    // Archive draft posts
    await tx.post.updateMany({
      where: { editionId: edition.id, status: "DRAFT" },
      data: { status: "ARCHIVED" },
    });

    const count = publishedCount;

    return {
      ok: true,
      published: true,
      editionId: edition.id,
      postsPublished: count,
    };
  });
}
