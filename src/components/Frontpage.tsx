// src/components/Frontpage.tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import type { AudienceType } from "@/types/index";

type Post = {
  id: string;
  title?: string | null;
  author?: { id: string; name?: string | null; image?: string | null } | null;

  audienceType: "ALL_USERS" | "FRIENDS" | "CIRCLE";
  circleId?: string | null;
  circle?: { id: string; name: string } | null; // <= name can be optional/null
};

type FrontpageProps = {
  edition: {
    id: string;
    title?: string | null;
    weekStart: string;
    posts: Post[];
  };
};

export function Frontpage({ edition }: FrontpageProps) {
  const editionLabel =
    edition.title ??
    `Week of ${new Date(edition.weekStart).toISOString().slice(0, 10)}`;

  // --- group by audience ---
  const allUsers = edition.posts.filter((p) => p.audienceType === "ALL_USERS");
  const friends = edition.posts.filter((p) => p.audienceType === "FRIENDS");

  // circles: Map<circleId, { name, posts[] }>
  const circles = new Map<string, { name: string; posts: Post[] }>();
  for (const p of edition.posts) {
    if (p.audienceType !== "CIRCLE" || !p.circle) continue;
    const id = p.circle.id;
    if (!circles.has(id)) circles.set(id, { name: p.circle.name, posts: [] });
    circles.get(id)!.posts.push(p);
  }

  const PostRow = ({ p }: { p: Post }) => (
    <li key={p.id} className="flex items-center justify-between py-2">
      <Link href={`/reader/${p.id}`} className="font-medium hover:underline">
        {p.title ?? "Untitled Post"}
      </Link>
      <span className="ml-3 inline-flex items-center gap-2 text-sm text-muted-foreground">
        <Avatar className="h-6 w-6">
          {p.author?.image ? (
            <AvatarImage
              src={p.author.image}
              alt={p.author?.name ?? "Author"}
            />
          ) : (
            <AvatarFallback>
              {(p.author?.name ?? "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        {p.author?.name ?? "Unknown"}
      </span>
    </li>
  );

  const Section = ({ title, posts }: { title: string; posts: Post[] }) =>
    posts.length ? (
      <section className="space-y-2">
        <h2 className="text-xl font-semibold">{title}</h2>
        <ul className="divide-y rounded-md border bg-card p-2">
          {posts.map((p) => (
            <PostRow key={p.id} p={p} />
          ))}
        </ul>
      </section>
    ) : null;

  return (
    <div className="mx-auto max-w-5xl space-y-8 font-serif">
      {/* Newspaper header */}
      <header className="border-b pb-4 text-center">
        <h1 className="text-5xl font-black uppercase tracking-wide">
          The Sunday Edition
        </h1>
        <p className="mt-1 text-sm italic text-muted-foreground">
          {editionLabel}
        </p>
      </header>

      {/* No stories fallback */}
      {edition.posts.length === 0 && (
        <div className="py-20 text-center text-3xl font-bold uppercase tracking-widest text-muted-foreground">
          NO STORIES THIS WEEK
        </div>
      )}

      {/* Sections */}
      <div className="space-y-8">
        <Section title="All Rogha Users" posts={allUsers} />
        <Section title="Friends" posts={friends} />
        {Array.from(circles.entries())
          .sort((a, b) => a[1].name.localeCompare(b[1].name))
          .map(([circleId, { name, posts }]) => (
            <Section key={circleId} title={`Circle · ${name}`} posts={posts} />
          ))}
      </div>
    </div>
  );
}
