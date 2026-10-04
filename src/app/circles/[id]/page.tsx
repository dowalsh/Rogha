import { notFound } from "next/navigation";
import { getCircleById } from "@/actions/circle.action";
import { CirclePageClient } from "@/components/circles/CirclePageClient";

// Auth is enforced by middleware.ts (/circles is a protected route).
export default async function CirclePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ joined?: string }>;
}) {
  const { id } = await params;
  const { joined } = await searchParams;

  let circle;
  try {
    circle = await getCircleById(id);
  } catch {
    notFound();
  }

  const members = circle.members
    .filter((m) => m.status === "JOINED")
    .map((m) => ({
      id: m.user.id,
      username: m.user.username,
      image: m.user.image ?? null,
    }));

  const posts = circle.posts.map((p) => ({
    id: p.id,
    title: p.title,
    createdAt: p.createdAt.toISOString(),
    author: p.author,
    heroThumbUrl: p.heroThumbUrl,
  }));

  return (
    <CirclePageClient
      circleId={circle.id}
      initialName={circle.name}
      members={members}
      posts={posts}
      justJoined={joined === "1"}
    />
  );
}
