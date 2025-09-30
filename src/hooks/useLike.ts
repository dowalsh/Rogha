import { useState, useEffect } from "react";

interface UseLikeOptions {
  id: string; // postId or commentId
  type: "post" | "comment"; // which API route to hit
  initialLiked: boolean;
  initialCount: number;
}

export function useLike({
  id,
  type,
  initialLiked,
  initialCount,
}: UseLikeOptions) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);

  // 🔑 Keep local state in sync with parent props after fetch completes
  useEffect(() => {
    setLiked(initialLiked);
    setCount(initialCount);
  }, [initialLiked, initialCount]);

  async function toggle() {
    if (!id) return; // guard: don't fire before we know the id
    const res = await fetch(`/api/${type}s/${id}/like`, { method: "POST" });

    if (res.ok) {
      // If your API returns the fresh count, prefer it to avoid drift:
      // { liked: boolean, likeCount?: number }
      const payload = await res.json();
      const newLiked: boolean = !!payload.liked;

      if (typeof payload.likeCount === "number") {
        setLiked(newLiked);
        setCount(payload.likeCount);
      } else {
        // fallback optimistic update
        setLiked(newLiked);
        setCount((c) => c + (newLiked ? 1 : -1));
      }
    }
  }

  return { liked, count, toggle };
}
