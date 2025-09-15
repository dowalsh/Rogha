// src/components/Frontpage.tsx
"use client";

import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type Post = {
  id: string;
  title?: string | null;
  author?: { id: string; name?: string | null; image?: string | null } | null;
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

  const lead = edition.posts[0];
  const sidebar = edition.posts.slice(1, 3);
  const rest = edition.posts.slice(3);

  return (
    <div className="mx-auto max-w-5xl space-y-8 font-serif">
      {/* Newspaper header */}
      <header className="border-b pb-4 text-center">
        <h1 className="text-5xl font-black uppercase tracking-wide">
          The Sunday Edition
        </h1>
        <p className="text-muted-foreground text-sm mt-1 italic">
          {editionLabel}
        </p>
      </header>

      {/* No stories fallback */}
      {edition.posts.length === 0 && (
        <div className="py-20 text-center text-3xl font-bold uppercase tracking-widest text-muted-foreground">
          NO STORIES THIS WEEK
        </div>
      )}

      {/* Lead story */}
      {lead && (
        <article className="border-b pb-6">
          <Link href={`/reader/${lead.id}`}>
            <h2 className="text-3xl font-extrabold hover:underline">
              {lead.title ?? "Untitled Post"}
            </h2>
          </Link>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Avatar className="h-7 w-7">
              {lead.author?.image ? (
                <AvatarImage
                  src={lead.author.image}
                  alt={lead.author.name ?? "Author"}
                />
              ) : (
                <AvatarFallback>
                  {(lead.author?.name ?? "U").charAt(0).toUpperCase()}
                </AvatarFallback>
              )}
            </Avatar>
            <span>{lead.author?.name ?? "Unknown Author"}</span>
          </div>
        </article>
      )}

      {/* Sidebar stories */}
      {sidebar.length > 0 && (
        <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {sidebar.map((p) => (
            <article key={p.id} className="space-y-2">
              <Link href={`/reader/${p.id}`}>
                <h3 className="text-xl font-semibold hover:underline">
                  {p.title ?? "Untitled Post"}
                </h3>
              </Link>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  {p.author?.image ? (
                    <AvatarImage
                      src={p.author.image}
                      alt={p.author.name ?? "Author"}
                    />
                  ) : (
                    <AvatarFallback>
                      {(p.author?.name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span>{p.author?.name ?? "Unknown Author"}</span>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* Rest of the posts */}
      {rest.length > 0 && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p) => (
            <article key={p.id} className="border-t pt-3 space-y-1">
              <Link href={`/reader/${p.id}`}>
                <h4 className="text-lg font-medium hover:underline">
                  {p.title ?? "Untitled Post"}
                </h4>
              </Link>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Avatar className="h-5 w-5">
                  {p.author?.image ? (
                    <AvatarImage
                      src={p.author.image}
                      alt={p.author.name ?? "Author"}
                    />
                  ) : (
                    <AvatarFallback>
                      {(p.author?.name ?? "U").charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <span>{p.author?.name ?? "Unknown Author"}</span>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}
