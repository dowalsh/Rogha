import { redirect } from "next/navigation";
import { getDbUser } from "@/lib/getDbUser";

// Settings now lives as a tab on the profile page — this route is kept as
// a redirect so existing links/bookmarks to /settings don't break.
// (Auth is already enforced by middleware.ts for this route.)
export default async function SettingsPage() {
  const { user } = await getDbUser();
  if (!user) redirect("/sign-in?redirect=%2Fsettings");
  redirect(`/profile/${user.username}?tab=settings`);
}
