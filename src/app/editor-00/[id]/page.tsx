// app/editor/[id]/page.tsx
import { notFound, redirect } from "next/navigation";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDbUserId } from "@/actions/user.action";
import EditorClient from "../_EditorClient";

export default async function EditExistingPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await currentUser(); // ✅ pattern-matching your Home page
  if (!user) {
    // If you prefer not to redirect, you could render a sign-in CTA instead
    redirect("/sign-in");
  }

  // Get your app's internal user id (maps Clerk -> DB)
  const dbUserId = await getDbUserId();
  if (!dbUserId) redirect("/sign-in");

  const post = await prisma.post.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      authorId: true,
      content: true,
      version: true,
      status: true,
    },
  });

  if (!post) return notFound();

  // Author-only editing
  if (post.authorId !== dbUserId) {
    // You can redirect to a read-only page if you have one
    redirect("/");
  }

  return (
    <EditorClient
      initialSerializedState={post.content as any}
      initialPostId={post.id}
      initialVersion={post.version}
      initialStatus={post.status as any}
    />
  );
}
