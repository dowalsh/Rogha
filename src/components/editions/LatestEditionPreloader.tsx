"use client";

import { useEffect, useState } from "react";
import useSWR from "swr";
import Image from "next/image";
import { useRouter } from "next/navigation";

type PreloadEdition = {
  id: string;
  posts?: { id: string; heroImageUrl?: string | null }[];
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
    if (edition?.id) router.prefetch(`/editions/${edition.id}`);
  }, [edition?.id, router]);

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
