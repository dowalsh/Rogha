// src/components/buzz/BuzzSection.tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BuzzFeed } from "./BuzzFeed";
import type { BuzzItemProps } from "./BuzzItem";
import { Button } from "@/components/ui/button";
import { Radio } from "lucide-react";

export function BuzzSection() {
  const [items, setItems] = useState<BuzzItemProps[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadBuzz() {
      try {
        setIsLoading(true);
        setError(null);

        const res = await fetch("/api/buzz");
        if (!res.ok) {
          throw new Error(`Failed to load buzz (${res.status})`);
        }

        // For now we assume the API already returns BuzzItemProps[]
        const data: BuzzItemProps[] = await res.json();

        if (!isMounted) return;
        setItems(data);
      } catch (err: any) {
        console.error("[BuzzSection] error loading buzz", err);
        if (!isMounted) return;
        setError(err.message ?? "Failed to load buzz");
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    loadBuzz();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <BuzzFeed
      items={items}
      isLoading={isLoading}
      headerSlot={
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-destructive">{error}</span>}
        </div>
      }
    />
  );
}
