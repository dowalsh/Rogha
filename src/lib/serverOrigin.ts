import type { NextRequest } from "next/server";

// Server-side counterpart to getAppOrigin() (src/lib/mobile/appOrigin.ts):
// derives the current deployment's public URL from the incoming request's
// own Host header rather than a static APP_URL env var, so a link generated
// on a preview/staging build points back at that same environment instead
// of always resolving to whatever APP_URL happens to be set to.
export function requestOrigin(req: NextRequest): string {
  return req.nextUrl.origin;
}
