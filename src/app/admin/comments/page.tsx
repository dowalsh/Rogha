import { CommentsList } from "@/components/admin/comments/CommentsList";

export default function AdminCommentsPage() {
  return (
    <>
      <h1 className="text-2xl font-semibold">Comments</h1>
      <CommentsList />
    </>
  );
}
