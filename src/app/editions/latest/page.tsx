import { redirect } from "next/navigation";
import { getDbUser } from "@/lib/getDbUser";
import { getMostRecentPublishedEditionForUser } from "@/lib/editions";

export default async function LatestEditionPage() {
  const { user, error } = await getDbUser();
  if (error) redirect("/editions"); // or sign-in page

  const edition = await getMostRecentPublishedEditionForUser();

  if (!edition) {
    // No editions exist → redirect to editions index
    redirect("/editions");
  }

  redirect(`/editions/${edition.id}`);
}
