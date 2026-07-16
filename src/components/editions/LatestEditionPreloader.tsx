"use client";

import { useEffect, useState } from "react";
import useSWR, { mutate } from "swr";
import Image from "next/image";
import { useRouter } from "next/navigation";

type PreloadPost = {
  id: string;
  title?: string | null;
  content?: unknown;
  status?: string;
  heroImageUrl?: string | null;
  audienceType?: string;
  circleId?: string | null;
  author?: {
    id: string;
    clerkId?: string | null;
    name?: string | null;
    image?: string | null;
  } | null;
  likeCount?: number;
  likedByMe?: boolean;
};

type PreloadEdition = {
  id: string;
  publishedAt?: string | null;
  posts?: PreloadPost[];
};

// Shape /api/posts/[id] actually returns — kept local since this is only
// used to seed that endpoint's SWR cache, not to read the response.
function buildPostDTO(post: PreloadPost, edition: PreloadEdition) {
  return {
    id: post.id,
    title: post.title ?? null,
    content: post.content,
    status: post.status,
    editionId: edition.id,
    heroImageUrl: post.heroImageUrl ?? null,
    audienceType: post.audienceType,
    circleId: post.circleId ?? null,
    author: post.author
      ? {
          id: post.author.id,
          clerkId: post.author.clerkId ?? null,
          name: post.author.name ?? null,
          image: post.author.image ?? null,
        }
      : null,
    likeCount: post.likeCount ?? 0,
    likedByMe: post.likedByMe ?? false,
    edition: { publishedAt: edition.publishedAt ?? null },
  };
}

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

    // getPublishedEditionById already selects each post's full content,
    // like count, and likedByMe — the same data the reader's own
    // `/api/posts/${id}` fetch would return. Seed that cache key directly so
    // the first click into any post from this edition is instant too,
    // instead of only benefiting revisits (which is all SWR alone gives you).
    for (const post of edition.posts ?? []) {
      mutate(`/api/posts/${post.id}`, buildPostDTO(post, edition), {
        revalidate: false,
      });
      router.prefetch(`/reader/${post.id}`);
    }
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
