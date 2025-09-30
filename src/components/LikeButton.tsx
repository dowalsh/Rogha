import { useState } from "react";
import { Heart } from "lucide-react";
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

  async function fetchLikers() {
    if (open) return;
    const res = await fetch(fetchLikersUrl);
    if (res.ok) {
      setLikers(await res.json());
    }
  }

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
          if (o) fetchLikers();
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
            {likers.length === 0 ? (
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
