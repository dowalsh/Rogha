import { notFound } from "next/navigation";
import { getProfileForViewer } from "@/actions/profile.action";
import { getDbUserId } from "@/actions/user.action";
import ProfilePageClient from "./ProfilePageClient";

export async function generateMetadata({
  params,
}: {
  params: { username: string };
}) {
  return { title: `@${params.username}` };
}

export default async function ProfilePage({
  params,
}: {
  params: { username: string };
}) {
  const viewerId = await getDbUserId();
  const profile = await getProfileForViewer(params.username, viewerId);

  if (profile.kind === "not_found") notFound();

  return <ProfilePageClient profile={profile} />;
}
