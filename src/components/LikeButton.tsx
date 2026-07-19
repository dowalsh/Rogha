import { useState, useEffect } from "react";
import useSWR from "swr";
import { Heart } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

// Heart icon alone — used standalone when the count needs to sit elsewhere
// in the layout (e.g. comment rows), and as one half of the combined
// LikeButton below.
export function LikeHeart({
  liked,
  onToggle,
}: {
  liked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center text-muted-foreground hover:text-red-500"
    >
      <Heart
        className={`h-4 w-4 ${
          liked ? "fill-red-500 text-red-500" : "text-muted-foreground"
        }`}
      />
    </button>
  );
}

// Likers count alone, opening the "Liked by" dialog on click — the other
// half of the combined LikeButton, split out for layouts that separate the
// count from the heart toggle.
export function LikeCount({
  count,
  fetchLikersUrl,
}: {
  count: number;
  fetchLikersUrl: string; // e.g. `/api/posts/[id]/likes` or `/api/comments/[id]/likes`
}) {
  const [open, setOpen] = useState(false);
  const [primed, setPrimed] = useState(false);

  // Prefetch the likers list in the background shortly after mount so it's
  // already available (via the shared SWR cache) by the time the user opens
  // the dialog. Deferred so it doesn't compete with the post content's own
  // fetches. Passing `null` as the key keeps SWR from fetching early.
  useEffect(() => {
    setPrimed(false);
    const timer = setTimeout(() => setPrimed(true), 400);
    return () => clearTimeout(timer);
  }, [fetchLikersUrl]);

  const {
    data: likers = [],
    isLoading: loadingLikers,
    mutate: refetchLikers,
  } = useSWR<{ id: string; name: string | null; image: string | null }[]>(
    primed || open ? fetchLikersUrl : null,
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        // If the background prefetch already populated the SWR cache,
        // this just silently revalidates in case it's changed since.
        // Otherwise (opened before the prefetch resolved), `primed || open`
        // above already triggers the initial foreground fetch.
        if (o) refetchLikers();
      }}
    >
      <DialogTrigger asChild>
        <button className="text-xs text-muted-foreground hover:underline">
          {count} {count === 1 ? "like" : "likes"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Liked by</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {loadingLikers ? (
            <div className="flex justify-center p-4">
              <Spinner />
            </div>
          ) : likers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No likes yet</p>
          ) : (
            likers.map((u) => (
              <div key={u.id} className="flex items-center gap-2">
                <img
                  src={u.image ?? "/avatar.png"}
                  alt={u.name ?? "?"}
                  className="h-6 w-6 rounded-full border"
                />
                <span className="text-sm">{u.name ?? "Unknown"}</span>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LikeButton({
  liked,
  count,
  onToggle,
  fetchLikersUrl,
}: {
  liked: boolean;
  count: number;
  onToggle: () => void;
  fetchLikersUrl: string; // e.g. `/api/posts/[id]/likes` or `/api/comments/[id]/likes`
}) {
  return (
    <div className="flex items-center gap-1">
      <LikeHeart liked={liked} onToggle={onToggle} />
      <LikeCount count={count} fetchLikersUrl={fetchLikersUrl} />
    </div>
  );
}
