"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";

type PreloadPost = { id: string; heroImageUrl?: string | null };

// Silently warms the browser's cache for the latest edition's route + hero
// images while the user is on the home feed, so opening it later feels
// instant. Deferred so it doesn't compete with the feed's own fetches.
// Renders invisible <Image> tags with the same `sizes` Frontpage uses, so
// the browser requests the exact same optimized-image URLs it'll need later.
export function LatestEditionPreloader() {
  const router = useRouter();
  const [posts, setPosts] = useState<PreloadPost[] | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/editions/latest");
        if (!res.ok) return;
        const edition = await res.json();
        router.prefetch(`/editions/${edition.id}`);
        setPosts(edition.posts ?? []);
      } catch {
        // Best-effort background warm-up — a failure here shouldn't surface anywhere.
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [router]);

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
