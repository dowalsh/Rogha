"use client";

import { useEffect, useState } from "react";

// Reserves trailing scroll room only while a comment composer is actually
// focused, instead of a permanent empty gap at the bottom of every page.
// Without this, a composer opened near the end of a short thread has
// nowhere left to scroll: the native keyboard-avoidance scroll
// (KeyboardResize.Native in capacitor.config.ts) can only move the page up
// to the end of its actual content, so on a short page the keyboard still
// covers the field no matter what. Same focusin/focusout detection
// ReaderJumpFab already uses to hide itself while typing.
export function KeyboardSpaceBuffer() {
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    function isTextInput(el: Element | null) {
      return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;
    }
    function handleFocusIn(e: FocusEvent) {
      if (isTextInput(e.target as Element)) setTyping(true);
    }
    function handleFocusOut(e: FocusEvent) {
      if (isTextInput(e.target as Element)) setTyping(false);
    }
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  if (!typing) return null;
  return <div aria-hidden className="h-80" />;
}
