"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import { Heart } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type Liker = { id: string; username: string; image: string | null };
type Me = { id: string; username: string; image: string | null };

const AVATAR_SIZE = 34;
const GAP = 8;

const faceVariants: Variants = {
  initial: { opacity: 0, y: -18, rotate: -10, scale: 0.85 },
  animate: {
    opacity: 1,
    y: 0,
    rotate: 0,
    scale: 1,
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] },
  },
  exit: {
    opacity: 0,
    scale: 0.7,
    transition: { duration: 0.18, ease: "easeIn" },
  },
};

// Faces row + single heart button that closes out a post. No counts, no
// names — just avatars, per the MVP spec (docs/specs/01-mvp-heart-like.md).
export function PostLikeFaces({
  postId,
  isSignedIn,
}: {
  postId: string;
  isSignedIn: boolean;
}) {
  const likersKey = `/api/posts/${postId}/likes`;
  const { data: likers, mutate } = useSWR<Liker[]>(likersKey);
  const { data: me } = useSWR<Me>(isSignedIn ? "/api/me" : null);
  const [pending, setPending] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const [rowCapacity, setRowCapacity] = useState(5);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const compute = () => {
      const width = el.clientWidth;
      const perRow = Math.max(
        1,
        Math.floor((width + GAP) / (AVATAR_SIZE + GAP))
      );
      setRowCapacity(perRow);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const isLoadingLikers = likers === undefined;
  const list = likers ?? [];
  const likedByMe = !!(me && list.some((l) => l.id === me.id));

  // Your own face always leads the row, regardless of API order.
  const ordered = me
    ? [
        ...list.filter((l) => l.id === me.id),
        ...list.filter((l) => l.id !== me.id),
      ]
    : list;

  async function handleToggle() {
    if (!me || pending || isLoadingLikers) return;
    setPending(true);
    const wasLiked = likedByMe;
    const withoutMe = list.filter((l) => l.id !== me.id);
    const optimisticList: Liker[] = wasLiked
      ? withoutMe
      : [{ id: me.id, username: me.username, image: me.image }, ...withoutMe];

    try {
      await mutate(
        (async () => {
          const res = await fetch(`/api/posts/${postId}/like`, {
            method: "POST",
          });
          if (!res.ok) throw new Error("Failed to toggle like");
          return wasLiked
            ? withoutMe
            : [...withoutMe, { id: me.id, username: me.username, image: me.image }];
        })(),
        {
          optimisticData: optimisticList,
          rollbackOnError: true,
          revalidate: false,
        }
      );
    } catch {
      // rollbackOnError above already restores the previous faces + button state.
    } finally {
      setPending(false);
    }
  }

  const twoRowMode = ordered.length > rowCapacity;
  const rowA = twoRowMode ? ordered.filter((_, i) => i % 2 === 0) : ordered;
  const rowB = twoRowMode ? ordered.filter((_, i) => i % 2 === 1) : [];

  return (
    <div className="flex flex-col items-center gap-3">
      <div ref={containerRef} className="w-full min-h-[34px] flex justify-center">
        {isLoadingLikers ? null : ordered.length === 0 ? (
          <p className="font-serif italic text-sm text-muted-foreground">
            No likes yet. Yours would be the first.
          </p>
        ) : (
          <div className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="w-max mx-auto">
              <div className="flex" style={{ gap: GAP }}>
                <AnimatePresence initial={false}>
                  {rowA.map((liker) => (
                    <Face key={liker.id} liker={liker} />
                  ))}
                </AnimatePresence>
              </div>
              {twoRowMode && (
                <div
                  className="flex -mt-1.5"
                  style={{ gap: GAP, marginLeft: AVATAR_SIZE / 2 + GAP / 2 }}
                >
                  <AnimatePresence initial={false}>
                    {rowB.map((liker) => (
                      <Face key={liker.id} liker={liker} />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={handleToggle}
        disabled={!isSignedIn || pending || isLoadingLikers}
        aria-pressed={likedByMe}
        aria-label={likedByMe ? "Remove your like" : "Like this post"}
        className={cn(
          "flex h-9 w-9 items-center justify-center self-center rounded-full border border-border bg-white transition-colors",
          likedByMe
            ? "border-like-active"
            : "hover:border-muted-foreground/50",
          (!isSignedIn || isLoadingLikers) && "cursor-not-allowed opacity-50"
        )}
      >
        <Heart
          className={cn(
            "h-5 w-5 transition-colors",
            likedByMe ? "fill-like-active text-like-active" : "text-muted-foreground"
          )}
        />
      </button>
    </div>
  );
}

function Face({ liker }: { liker: Liker }) {
  return (
    <motion.div
      layout
      variants={faceVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      style={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
      className="shrink-0"
      title={liker.username}
    >
      <Avatar className="h-full w-full border border-border">
        <AvatarImage src={liker.image ?? undefined} alt={liker.username} />
        <AvatarFallback className="text-xs">
          {liker.username?.[0]?.toUpperCase() ?? "?"}
        </AvatarFallback>
      </Avatar>
    </motion.div>
  );
}
