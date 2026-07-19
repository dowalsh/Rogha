"use client";

import useSWR from "swr";
import { useUser } from "@clerk/nextjs";

// Primes the shared "/api/me" SWR cache app-wide as soon as the user is
// signed in, so any component that needs "who am I" (e.g. CommentsSection)
// reads from cache instead of cold-fetching on every mount. Identity is
// invariant for the session, hence the long dedupingInterval.
export default function MePreloader() {
  const { isSignedIn } = useUser();
  useSWR(isSignedIn ? "/api/me" : null, { dedupingInterval: 60_000 });
  return null;
}
