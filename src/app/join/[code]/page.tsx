import { notFound } from "next/navigation";
import { Suspense } from "react";
import type { Metadata } from "next";
import { getCircleInviteInfo } from "@/actions/circle.action";
import JoinCircleClient from "./JoinCircleClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}): Promise<Metadata> {
  const { code } = await params;
  const info = await getCircleInviteInfo(code);
  if (info.status === "not_found") return {};

  const title = `Join ${info.circleName} on Rogha`;
  return {
    title,
    openGraph: { title, type: "website" },
    twitter: { card: "summary", title },
  };
}

export default async function JoinCirclePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const info = await getCircleInviteInfo(code);
  if (info.status === "not_found") notFound();

  return (
    <Suspense fallback={null}>
      <JoinCircleClient code={code} info={info} />
    </Suspense>
  );
}
