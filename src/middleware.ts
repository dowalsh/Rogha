import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { newRequestId, timingEnabled, logTiming, TIMING_RID_HEADER } from "@/lib/timing";

const isProtectedRoute = createRouteMatcher([
  "/editions(.*)",
  "/circles(.*)",
  "/posts(.*)",
  "/reader(.*)",
  "/settings(.*)",
  "/admin(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!timingEnabled()) {
    if (!isProtectedRoute(req)) return;

    const { userId } = await auth();
    if (!userId) {
      const destination = req.nextUrl.pathname + req.nextUrl.search;
      const signInUrl = new URL("/sign-in", req.url);
      signInUrl.searchParams.set("redirect", destination);
      return NextResponse.redirect(signInUrl);
    }
    return;
  }

  // Tag every request with a correlation id so downstream (layout, route
  // handlers) can log against the same rid; see src/lib/timing.ts.
  const requestId = newRequestId();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set(TIMING_RID_HEADER, requestId);

  if (!isProtectedRoute(req)) {
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const authStart = performance.now();
  const { userId } = await auth();
  logTiming("middleware.auth", requestId, performance.now() - authStart, {
    route: req.nextUrl.pathname,
  });

  if (!userId) {
    const destination = req.nextUrl.pathname + req.nextUrl.search;
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect", destination);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
