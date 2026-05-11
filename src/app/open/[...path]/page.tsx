import { redirect } from "next/navigation";

export default async function OpenRedirect({
  params,
}: {
  params: Promise<{ path: string[] }>;
}) {
  const { path } = await params;
  redirect("/" + path.join("/"));
}
