"use client";

import { useEffect, useRef, useState } from "react";

// Shared timing thresholds for loading-skeleton display, per
// docs/loading-ui.md — defined once and reused by every route so behavior
// is consistent rather than tuned per page.
export const LOADING_GRACE_MS = 200;
export const LOADING_MIN_VISIBLE_MS = 350;

/**
 * Gates a skeleton behind a grace window (so fast/prefetched loads never
 * flash a placeholder) and a minimum-visible duration (so a placeholder
 * that does appear can't flicker in and immediately back out).
 */
export function useDelayedLoading(
  isLoading: boolean,
  graceMs: number = LOADING_GRACE_MS,
  minVisibleMs: number = LOADING_MIN_VISIBLE_MS,
): boolean {
  const [show, setShow] = useState(false);
  const shownAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isLoading) {
      if (shownAtRef.current == null) {
        setShow(false);
        return;
      }
      const remaining = minVisibleMs - (Date.now() - shownAtRef.current);
      if (remaining <= 0) {
        shownAtRef.current = null;
        setShow(false);
        return;
      }
      const timer = setTimeout(() => {
        shownAtRef.current = null;
        setShow(false);
      }, remaining);
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      shownAtRef.current = Date.now();
      setShow(true);
    }, graceMs);
    return () => clearTimeout(timer);
  }, [isLoading, graceMs, minVisibleMs]);

  return show;
}
