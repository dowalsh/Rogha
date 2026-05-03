"use client";

import { useEffect, useRef } from "react";

type Props = {
  editionId: string;
  viewerCount: number;
  viewerNames: string[];
  fading: boolean;
  onReveal: () => void;
  mode?: "fullscreen" | "inline";
};

function buildSocialProof(
  viewerCount: number,
  viewerNames: string[]
): string | null {
  if (viewerCount === 0) return null;
  const firstNames = viewerNames
    .slice(0, 2)
    .map((n) => n.split(" ")[0] ?? "Someone");
  const remaining = viewerCount - firstNames.length;
  if (remaining > 0) {
    return `${firstNames.join(", ")} + ${remaining} other${remaining === 1 ? "" : "s"} already opened this week`;
  }
  return `${firstNames.join(", ")} already opened this week`;
}

export function EditionRevealOverlay({
  editionId,
  viewerCount,
  viewerNames,
  fading,
  onReveal,
  mode = "fullscreen",
}: Props) {
  const firedRef = useRef(false);

  const reveal = () => {
    if (firedRef.current) return;
    firedRef.current = true;
    fetch(`/api/editions/${editionId}/open`, { method: "POST" }).catch(
      () => {}
    );
    onReveal();
  };

  useEffect(() => {
    if (mode !== "fullscreen") return;
    const handler = () => reveal();
    window.addEventListener("scroll", handler, { once: true, passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [mode]);

  const socialProof =
    viewerCount === 0
      ? "You'll be the first of your friends to open this week's edition"
      : buildSocialProof(viewerCount, viewerNames);

  const positionClass = mode === "inline" ? "absolute inset-0 z-10 rounded-[inherit]" : "fixed inset-0 z-50";

  return (
    <div
      className={`${positionClass} flex flex-col items-center justify-center cursor-pointer transition-opacity duration-200 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        backgroundColor: "rgba(255,255,255,0.35)",
      }}
      onClick={reveal}
    >
      <div className="text-center space-y-4 px-6 font-serif">
        <button className="px-8 py-3 border border-foreground bg-background text-foreground font-bold text-base tracking-widest uppercase hover:bg-foreground hover:text-background transition-colors duration-150">
          Open
        </button>
        <p className="text-sm text-foreground/70 italic">{socialProof}</p>
      </div>
    </div>
  );
}
