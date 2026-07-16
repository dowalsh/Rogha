"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import Image from "next/image";
import { useRouter } from "next/navigation";

type PreloadEdition = {
  id: string;
  posts?: { id: string; heroImageUrl?: string | null }[];
};

type FullPrefetchRouter = {
  prefetch: (href: string, options?: { kind: "auto" | "full" | "temporary" }) => void;
};

// Silently warms the browser's cache for the latest edition's route + hero
// images while the user is on the home feed, so opening it later feels
// instant. Deferred so it doesn't compete with the feed's own fetches.
// Renders invisible <Image> tags with the same `sizes` Frontpage uses, so
// the browser requests the exact same optimized-image URLs it'll need later.
export function LatestEditionPreloader() {
  const router = useRouter();
  const [primed, setPrimed] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setPrimed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const { data: edition } = useSWR<PreloadEdition>(
    primed ? "/api/editions/latest" : null,
  );

  useEffect(() => {
    if (!edition?.id) return;
    const fullRouter = router as unknown as FullPrefetchRouter;
    // `kind: "full"` forces Next to run the target page's server render
    // (including its Prisma query) ahead of time and cache the result, not
    // just the static shell — the default `"auto"` kind skips dynamic data
    // for force-dynamic routes. Not in the public `next/navigation` types,
    // so it's cast rather than imported from Next's internal module path.
    fullRouter.prefetch(`/editions/${edition.id}`, { kind: "full" });
    // Also warm the /editions list route's JS/shell — its own data (the
    // archive list) isn't safe to prefetch speculatively since it's an
    // unbounded per-edition query, but the route shell itself is cheap.
    fullRouter.prefetch("/editions", { kind: "full" });

    // /api/editions/latest and /api/editions/[id] both return the exact
    // same shape (same server function) for the latest edition, so seed the
    // SWR cache under the [id] key too — no extra request, but the
    // /editions page's "Latest Edition" preview (fetched via that key) is
    // instant if the user lands there instead of /editions/[id] directly.
    mutate(`/api/editions/${edition.id}`, edition, { revalidate: false });
  }, [edition, router]);

  const posts = edition?.posts;
  if (!posts || posts.length === 0) return null;

  const [lead, ...secondary] = posts;

  return (
    <div aria-hidden className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0">
      {lead?.heroImageUrl && (
        <Image
          src={lead.heroImageUrl}
          alt=""
          width={640}
          height={360}
          sizes="(min-width: 1024px) 640px, 100vw"
        />
      )}
      {secondary.map(
        (post) =>
          post.heroImageUrl && (
            <Image
              key={post.id}
              src={post.heroImageUrl}
              alt=""
              width={320}
              height={240}
              sizes="(min-width: 1024px) 320px, (min-width: 768px) 480px, 100vw"
            />
          )
      )}
    </div>
  );
}
