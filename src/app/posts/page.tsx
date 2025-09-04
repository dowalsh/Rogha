// src/app/posts/page.tsx
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PostView } from "@/components/PostView";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic"; // avoid caching if desired

// Minimal TipTap JSON to seed new posts
const DEFAULT_TIPTAP_DOC = {
  type: "doc",
  content: [{ type: "paragraph" }],
} as const;

// Server Action: create a draft post and go to the editor
async function createPost() {
  "use server";
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!dbUser) redirect("/onboarding");

  const post = await prisma.post.create({
    data: {
      authorId: dbUser.id,
      status: "DRAFT",
      content: DEFAULT_TIPTAP_DOC as any, // Prisma Json
    },
    select: { id: true },
  });

  redirect(`/editor/${post.id}`);
}

export default async function PostsPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await prisma.user.findUnique({
    where: { clerkId: userId },
    select: { id: true },
  });
  if (!dbUser) redirect("/onboarding");

  const posts = await prisma.post.findMany({
    where: { authorId: dbUser.id },
    orderBy: { updatedAt: "desc" },
    select: {
      title: true,
      id: true,
      status: true,
      updatedAt: true,
      edition: { select: { title: true } },
    },
  });

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Posts</h1>

        {/* Wire the button to the server action */}
        <form action={createPost}>
          <Button type="submit">New Post</Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="p-3 font-medium">Post</th>
              <th className="p-3 font-medium">Status</th>
              <th className="p-3 font-medium">Edition</th>
              <th className="p-3 font-medium">Updated</th>
              <th className="p-3 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <PostView
                title={p.title || "Untitled Post"}
                key={p.id}
                id={p.id}
                status={p.status}
                edition={p.edition?.title ?? undefined}
                updatedAt={p.updatedAt}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
