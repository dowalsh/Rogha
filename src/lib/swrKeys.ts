// HomeContent's SWR key carries a query string (`/api/home?earlierLimit=N`),
// so `mutate("/api/home")` matches nothing. Pass this matcher instead to
// revalidate whichever home key is currently cached.
export function isHomeKey(key: unknown): boolean {
  return typeof key === "string" && key.startsWith("/api/home");
}
