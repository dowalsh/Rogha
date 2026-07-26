"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

// Generic long-page locomotion for the reader: jump to comments while
// reading the body, jump back to top once at/near the comments. Deliberately
// unaware of "new" activity — that signal lives in the header pill instead
// (see docs/specs/reader-jump-nav.md).
export function ReaderJumpFab({ commentsAnchorId }: { commentsAnchorId: string }) {
  const [state, setState] = useState<"above" | "atComments">("above");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const anchor = document.getElementById(commentsAnchorId);
    if (!anchor) return;

    // Short pages (content + comments fit in one viewport) don't need a
    // locomotion control at all.
    if (document.documentElement.scrollHeight <= window.innerHeight * 1.2) {
      return;
    }
    setVisible(true);

    const observer = new IntersectionObserver(
      ([entry]) => setState(entry.isIntersecting ? "atComments" : "above"),
      { rootMargin: "-40% 0px -60% 0px" },
    );
    observer.observe(anchor);
    return () => observer.disconnect();
  }, [commentsAnchorId]);

  if (!visible) return null;

  const reducedMotion =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const handleClick = () => {
    if (state === "above") {
      document.getElementById(commentsAnchorId)?.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: "start",
      });
    } else {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={state === "above" ? "Jump to comments" : "Back to top"}
      className="fixed right-4 z-40 flex items-center gap-1.5 rounded-full border bg-background px-4 py-2.5 text-sm font-medium shadow-lg hover:bg-muted"
      style={{ bottom: "max(env(safe-area-inset-bottom), 1.5rem)" }}
    >
      {state === "above" ? (
        <>
          Comments <ChevronDown className="h-4 w-4" />
        </>
      ) : (
        <>
          Top <ChevronUp className="h-4 w-4" />
        </>
      )}
    </button>
  );
}
