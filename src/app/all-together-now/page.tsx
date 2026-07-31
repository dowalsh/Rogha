"use client";

import { useState } from "react";

export default function AllTogetherNowPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");
    try {
      const res = await fetch("/api/festival-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error("failed");
      setStatus("done");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="max-w-md w-full space-y-6">
        <h1 className="text-3xl font-serif">
          Hi! hope you&apos;re enjoying All Together Now!
        </h1>

        <p className="text-base leading-relaxed">
          Rogha is social media that&apos;s actually social. No ads. No feed.
          Just you and the people you care about.
        </p>

        <p className="text-base leading-relaxed">
          I&apos;d love you to be one of our first users — sign up below, or{" "}
          <a href="/about" className="underline">
            learn more here!
          </a>{" "}
          Or just drop your email below and I&apos;ll send you a signup link
          later. Have a great festival! — Dylan
        </p>

        <a
          href="/sign-in"
          className="inline-block w-full rounded-md bg-primary text-primary-foreground py-3 font-medium"
        >
          Sign up here
        </a>

        {status === "done" ? (
          <p className="text-base">Nice, we&apos;ll be in touch! 🎉</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border px-4 py-3 text-base"
            />
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full rounded-md border py-3 font-medium disabled:opacity-50"
            >
              {status === "loading" ? "Sending..." : "Email me later"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">
                Something went wrong, try again?
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
