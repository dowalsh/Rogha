import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useEffect, useState } from "react";

interface Author {
  id: string;
  name: string | null;
  image: string | null;
}

interface CommentType {
  id: string;
  content: string;
  createdAt: string;
  author: Author;
  replies: CommentType[];
}

interface CommentProps {
  name: string;
  timeAgo: string;
  text: string;
  avatarSrc?: string;
  avatarFallback: string;
}

function Comment({
  name,
  timeAgo,
  text,
  avatarSrc,
  avatarFallback,
}: CommentProps) {
  return (
    <div className="flex items-start gap-4">
      <Avatar className="h-10 w-10 border">
        <AvatarImage src={avatarSrc ?? "/placeholder-user.jpg"} alt={name} />
        <AvatarFallback>{avatarFallback}</AvatarFallback>
      </Avatar>
      <div className="grid gap-1.5">
        <div className="flex items-center gap-2">
          <div className="font-medium">{name}</div>
          <div className="text-xs text-muted-foreground">{timeAgo}</div>
        </div>
        <div className="text-sm text-muted-foreground">{text}</div>
      </div>
    </div>
  );
}

export default function CommentsSection({ postId }: { postId: string }) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    fetch(`/api/posts/${postId}/comments`)
      .then((res) => res.json())
      .then(setComments);
  }, [postId]);

  async function handleSubmit() {
    if (!newComment.trim()) return;

    const res = await fetch(`/api/posts/${postId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: newComment }),
    });

    if (res.ok) {
      const created = await res.json();
      setComments((prev) => [created, ...prev]);
      setNewComment("");
    } else {
      console.error("Failed to post comment");
    }
  }
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-8">
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Comments</h2>
        <div className="grid gap-2">
          <Textarea
            placeholder="Write your comment..."
            className="resize-none rounded-md border border-input bg-background p-3 text-sm shadow-sm"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
          />
          <Button className="justify-center" onClick={handleSubmit}>
            Submit
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        {comments.map((c) => (
          <Comment
            key={c.id}
            name={c.author.name ?? "Unknown"}
            timeAgo={new Date(c.createdAt).toLocaleString()} // or a "time ago" util
            text={c.content}
            avatarSrc={c.author.image ?? undefined}
            avatarFallback={c.author.name?.[0] ?? "?"}
          />
        ))}
      </div>
    </div>
  );
}
