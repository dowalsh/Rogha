import { PostsList } from "@/components/admin/posts/PostsList";

export default function AdminPostsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Posts</h1>
      <PostsList />
    </>
  );
}
