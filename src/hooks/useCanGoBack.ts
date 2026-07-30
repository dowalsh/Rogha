"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

let hasNavigatedInSession = false;

export function useCanGoBack(): boolean {
  const pathname = usePathname();
  const firstPathnameRef = useRef(pathname);
  const [canGoBack, setCanGoBack] = useState(hasNavigatedInSession);

  useEffect(() => {
    if (pathname !== firstPathnameRef.current) {
      hasNavigatedInSession = true;
      setCanGoBack(true);
    }
  }, [pathname]);

  return canGoBack;
}
