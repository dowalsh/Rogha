// src/app/page.tsx
//
"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Newspaper, NotebookPen } from "lucide-react";

const LS_KEY = "tiptap:mvp";

export default function Home() {
  return (
    <div className="max-w-3xl mx-auto py-8">
      <div className="flex flex-col gap-4">
        <h1 className="text-3xl font-bold text-center">Welcome to Rogha</h1>
        Rogha is Irish for "choice". <p />
        It is a simple social media for friends by friends. I believe there is a
        better way to do social media - one that prioritzes real connections
        with the people you care about. if you're seeing this, you're one of
        these people. I want to play around with new concepts and, with us as
        guinea pigs, build something fun and meaningful to us.
        <p /> Ar aghaidh linn.
        <h3 className="text-3xl font-bold text-center">Editions</h3>
        'Editions' is our first Social Media experiment. The primary problem is
        that many social medias are ALWAYS ON. Social Media is constant. Always
        being available and ON creates a time and attention vacuum through
        unsolicited notifications and doomscrolling. Constant engagement isn't
        the only problem though; the type of engagement matters too. <p />
        Editions attempts to solve this through a shared publishing schedule.
        Specifically; you can write posts any time throughout the week, but they
        are published weekly on sundays (a la newspaper) in the weeks "Edition".
        This creates an excitement and sense of community around the shared
        schedule (a la BeReal). When social media is scheduled it is never a
        drag on your weekly attention. The regular cadence gives users the time
        to really craft their posts. And of course, the small audience of Rogha
        means you can engage more deeply.
        <p />
        Check out editions below; or head straight to Posts to write your
        first...
        <p />
        <Button
          variant="default"
          className="flex items-center gap-2 max-w-xs mx-auto w-full"
          asChild
        >
          <Link href="/editions">
            <Newspaper className="w-4 h-4" />
            <span className="hidden lg:inline">Editions</span>
          </Link>
        </Button>
        <Button
          variant="default"
          className="flex items-center gap-2 max-w-xs mx-auto w-full"
          asChild
        >
          <Link href="/posts">
            <NotebookPen className="w-4 h-4" />
            <span className="hidden lg:inline">Posts</span>
          </Link>
        </Button>
      </div>{" "}
      <div className="my-8" />
      Please direct all bug reports, feature requests and general feedback to
      dylanwitsend@gmail.com
    </div>
  );
}
