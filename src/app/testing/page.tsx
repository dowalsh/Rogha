"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export default function TestingPage() {
  const [status, setStatus] = useState<string | null>(null);

  async function handleClick() {
    setStatus("sending...");
    try {
      const resp = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "post_submitted",
          postId: "cmfvwi9hj001tmwca28kyzrwq", // replace with a real postId from your DB
        }),
      });

      const json = await resp.json();
      if (!resp.ok) {
        setStatus(`Error: ${json.error || "unknown"}`);
      } else {
        setStatus(`Success: ${JSON.stringify(json)}`);
      }
    } catch (err: any) {
      setStatus(`Network error: ${err.message}`);
    }
  }

  return (
    <div className="max-w-3xl mx-auto py-8 space-y-4">
      <Button onClick={handleClick}>Test Resend via API</Button>
      {status && <pre className="text-sm">{status}</pre>}
    </div>
  );
}
