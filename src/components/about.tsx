import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Newspaper, NotebookPen, Blend } from "lucide-react";

export function About() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="max-w-3xl mx-auto py-8">
        <div className="flex flex-col gap-4">
          {/* Migration notice — remove after all users have migrated */}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Account notice</p>
            <p className="mt-1">
              We recently upgraded our authentication system. You may need to sign up
              for a new account — but if you use the <strong>same email address</strong>,
              all your posts, circles, and data will be waiting for you.
            </p>
          </div>
          <h1 className="text-3xl font-serif text-center">Welcome to Rogha</h1>

          <p>
            Rogha, pronounced r-ow-ah (rhymes with powah), is the Irish word for
            "choice".
          </p>
          <p>
            It is a simple social media for friends by friends. No ads. No
            bullshit. Actually social — in the way that matters. Just the people
            you choose to care about.
          </p>
          <p>Ar aghaidh linn.</p>

          <h3 className="text-3xl font-serif text-center">Editions</h3>
          <p>
            &lsquo;Editions&rsquo; is a bit of a Social Media experiment. You
            post for your friends — but on an old school weekly publishing
            schedule. Think{" "}
            <i>
              Twitter-meets-Substack-meets-BeReal-meets-microblogging-meets-newspaper.
            </i>{" "}
            The philosophy here is;
          </p>

          <ol className="list-decimal pl-6 space-y-2">
            <li>
              <strong>It’s not always on.</strong> Editions will never interrupt
              you or draw away your precious attention. It’s waiting for you at
              the end of the week.
            </li>
            <li>
              <strong>Constraints breed creativity.</strong> The weekly cadence
              gives users time to craft their posts; it incentivizes quality
              over quantity.
            </li>
            <li>
              <strong>Shared experience.</strong> A regular publishing time
              creates a buzz and community around the shared schedule.
            </li>
            <li>
              <strong>Small audiences.</strong> Other social medias strive for
              scale. But scale kills honesty and freedom of expression. Editions
              is designed for small groups, so you can share freely and deeply
              by creating your own intimate &lsquo;circles&rsquo; of friends.
            </li>
          </ol>
          <p>
            Heres a video by one of Rogha's earliest users/fans Stephen rambling
            with me about social media in general, and why I made rogha.
          </p>
          <div className="w-full flex justify-center my-6">
            <div className="aspect-video w-full max-w-2xl">
              <iframe
                className="w-full h-full rounded-xl"
                src="https://www.youtube.com/embed/sKm_2OBSLGQ"
                title="Stephen's Rogha Video"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture;"
                allowFullScreen
              />
            </div>
          </div>
          <p>
            To get started, go add friends using their email address, then check
            out editions or go write your first post...
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mt-4">
            <Button
              variant="default"
              className="flex items-center gap-2 w-full sm:w-auto"
              asChild
            >
              <Link href="/circles">
                <Blend className="w-4 h-4" />
                <span>Circles</span>
              </Link>
            </Button>

            <Button
              variant="default"
              className="flex items-center gap-2 w-full sm:w-auto"
              asChild
            >
              <Link href="/editions">
                <Newspaper className="w-4 h-4" />
                <span>Editions</span>
              </Link>
            </Button>

            <Button
              variant="default"
              className="flex items-center gap-2 w-full sm:w-auto"
              asChild
            >
              <Link href="/posts">
                <NotebookPen className="w-4 h-4" />
                <span>Posts</span>
              </Link>
            </Button>
          </div>
        </div>

        <div className="my-8" />

        <p>
          Please direct all bug reports, feature requests and general feedback
          to{" "}
          <a href="mailto:dylanwitsend@gmail.com" className="underline">
            dylanwitsend@gmail.com
          </a>
        </p>
      </div>
    </div>
  );
}
