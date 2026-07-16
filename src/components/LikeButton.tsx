import { useState, useEffect, useRef } from "react";
import { Heart } from "lucide-react";
import { Spinner } from "@/components/Spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
  const [likers, setLikers] = useState<
    { id: string; name: string | null; image: string | null }[]
  >([]);
  const [open, setOpen] = useState(false);
  const [loadingLikers, setLoadingLikers] = useState(false);
  const hasLoadedRef = useRef(false);

  async function fetchLikers({ silent }: { silent?: boolean } = {}) {
    if (!silent) setLoadingLikers(true);
    const res = await fetch(fetchLikersUrl);
    if (res.ok) {
      setLikers(await res.json());
      hasLoadedRef.current = true;
    }
    if (!silent) setLoadingLikers(false);
  }

  // Prefetch the likers list in the background shortly after mount so it's
  // already available by the time the user opens the dialog. Deferred so it
  // doesn't compete with the post content's own fetches.
  useEffect(() => {
    hasLoadedRef.current = false;
    const timer = setTimeout(() => {
      fetchLikers({ silent: true });
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchLikersUrl]);

  return (
    <div className="flex items-center gap-1">
      {/* Heart toggle */}
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

      {/* Number opens dialog */}
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (o) {
            // Background prefetch already has data: show it instantly and
            // silently reconcile in case it's changed since the prefetch.
            // Otherwise (user clicked before the prefetch resolved), fall
            // back to a normal foreground fetch with a loading state.
            fetchLikers({ silent: hasLoadedRef.current });
          }
        }}
      >
        <DialogTrigger asChild>
          <button className="text-xs text-muted-foreground hover:underline">
            {count}
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
                    src={u.image ?? "/placeholder-user.jpg"}
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
    </div>
  );
}
