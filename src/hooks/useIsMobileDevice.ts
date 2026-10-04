"use client";

import { useEffect, useState } from "react";

// Best-effort "is this an actual phone/tablet" check, as opposed to a
// desktop browser window that's merely narrow (e.g. a resized laptop
// window, which would satisfy any viewport-width media query like
// `md:hidden`). Prefers the Client Hints API where available (Chromium);
// falls back to UA sniffing elsewhere. Not spoof-proof, but far more
// accurate than checking window width.
function isMobileDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const uaData = (navigator as Navigator & { userAgentData?: { mobile?: boolean } })
    .userAgentData;
  if (uaData?.mobile !== undefined) return uaData.mobile;
  return /Android|iPhone|iPod|Mobile/i.test(navigator.userAgent);
}

export function useIsMobileDevice(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileDevice());
  }, []);

  return mobile;
}
