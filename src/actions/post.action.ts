"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getDbUserId } from "./user.action";
import { z } from "zod";

/** Minimal validator for Lexical SerializedEditorState (MVP).
 *  You can tighten this later with a full schema if you add custom nodes.
 */
const SerializedEditorStateSchema = z.any();

const EMPTY_LEXICAL_STATE = {
  root: {
    type: "root",
    version: 1,
    indent: 0,
    format: "",
    direction: "ltr",
    children: [
      {
        type: "paragraph",
        version: 1,
        indent: 0,
        format: "",
        direction: "ltr",
        children: [],
      },
    ],
  },
} as const;

/** CREATE */
export async function createPost(input: {
  content?: unknown; // SerializedEditorState JSON
  image?: string | null;
  editionId?: string | null;
  status?: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
}) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    const parsed =
      input.content !== undefined
        ? SerializedEditorStateSchema.parse(input.content)
        : EMPTY_LEXICAL_STATE;

    const post = await prisma.post.create({
      data: {
        authorId: userId,
        editionId: input.editionId ?? null,
        image: input.image ?? null,
        status: (input.status as any) ?? "DRAFT",
        content: parsed, // JSON
        // version defaults to 1 in the DB
      },
    });

    revalidatePath("/");
    return { success: true, post };
  } catch (error) {
    console.error("Failed to create post:", error);
    return { success: false, error: "Failed to create post" };
  }
}

/** READ LIST */
export async function getPosts() {
  try {
    const posts = await prisma.post.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        author: {
          select: { id: true, name: true, image: true, username: true },
        },
        comments: {
          include: {
            author: {
              select: { id: true, username: true, image: true, name: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
        likes: { select: { userId: true } },
        _count: { select: { likes: true, comments: true } },
      },
    });
    return posts;
  } catch (error) {
    console.log("Error in getPosts", error);
    throw new Error("Failed to get posts");
  }
}

/** AUTOSAVE / UPDATE with optimistic concurrency
 *  - Pass the Post.id, new content JSON, and the current version you loaded.
 *  - If someone else saved first, you’ll get { conflict: true } and should refetch.
 */
export async function updatePost(input: {
  id: string;
  content?: unknown; // SerializedEditorState JSON
  image?: string | null;
  editionId?: string | null;
  status?: "DRAFT" | "SUBMITTED" | "PUBLISHED" | "ARCHIVED";
  version: number; // client-side version you last loaded
}) {
  try {
    const userId = await getDbUserId();
    if (!userId) return { success: false, error: "Unauthorized" };

    // Ownership check
    const existing = await prisma.post.findUnique({
      where: { id: input.id },
      select: { authorId: true },
    });
    if (!existing) return { success: false, error: "Post not found" };
    if (existing.authorId !== userId)
      return { success: false, error: "Unauthorized - no edit permission" };

    const parsedContent =
      input.content !== undefined
        ? SerializedEditorStateSchema.parse(input.content)
        : undefined;

    // Optimistic concurrency: update where id AND version match
    const res = await prisma.post.updateMany({
      where: { id: input.id, version: input.version },
      data: {
        ...(parsedContent !== undefined ? { content: parsedContent } : {}),
        ...(input.image !== undefined ? { image: input.image } : {}),
        ...(input.editionId !== undefined
          ? { editionId: input.editionId }
          : {}),
        ...(input.status ? { status: input.status as any } : {}),
        version: { increment: 1 },
      },
    });

    if (res.count === 0) {
      // Either not found, or version mismatch (someone else updated first)
      return { success: false, conflict: true };
    }

    const updated = await prisma.post.findUnique({
      where: { id: input.id },
      select: { id: true, version: true, updatedAt: true },
    });

    revalidatePath("/");
    return { success: true, post: updated };
  } catch (error) {
    console.error("Failed to update post:", error);
    return { success: false, error: "Failed to update post" };
  }
}

/** COMMENT (unchanged except types) */
export async function createComment(postId: string, content: string) {
  try {
    const userId = await getDbUserId();
    if (!userId) return;
    if (!content) throw new Error("Content is required");

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });
    if (!post) throw new Error("Post not found");

    const [comment] = await prisma.$transaction(async (tx) => {
      const newComment = await tx.comment.create({
        data: { content, authorId: userId, postId },
      });

      if (post.authorId !== userId) {
        await tx.notification.create({
          data: {
            type: "COMMENT",
            userId: post.authorId,
            creatorId: userId,
            postId,
            commentId: newComment.id,
          },
        });
      }

      return [newComment];
    });

    revalidatePath("/");
    return { success: true, comment };
  } catch (error) {
    console.error("Failed to create comment:", error);
    return { success: false, error: "Failed to create comment" };
  }
}

/** DELETE (unchanged) */
export async function deletePost(postId: string) {
  try {
    const userId = await getDbUserId();

    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: { authorId: true },
    });

    if (!post) throw new Error("Post not found");
    if (post.authorId !== userId)
      throw new Error("Unauthorized - no delete permission");

    await prisma.post.delete({ where: { id: postId } });
    revalidatePath("/");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete post:", error);
    return { success: false, error: "Failed to delete post" };
  }
}
