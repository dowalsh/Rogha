import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPostByShareToken } from "@/lib/access/publicShareAccess";
import SharePostClient from "./SharePostClient";

export async function generateMetadata({
  params,
}: {
  params: { token: string };
}): Promise<Metadata> {
  const post = await getPostByShareToken(params.token);
  if (!post) return {};

  const title = post.title ?? "Rogha Post";
  const authorName = post.author?.name ?? null;
  const description = authorName ? `By ${authorName}` : undefined;

  return {
    title,
    openGraph: {
      title,
      ...(description && { description }),
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
      ...(description && { description }),
    },
  };
}

export default async function SharePostPage({
  params,
}: {
  params: { token: string };
}) {
  const post = await getPostByShareToken(params.token);
  if (!post) notFound();

  return <SharePostClient post={post} />;
}
