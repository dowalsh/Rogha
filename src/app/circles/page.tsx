import { redirect } from "next/navigation";

// Old route, kept as a redirect for existing bookmarks/links. The page now
// lives at /friends — see src/app/friends/page.tsx.
export default function CirclesRedirect() {
  redirect("/friends");
}
