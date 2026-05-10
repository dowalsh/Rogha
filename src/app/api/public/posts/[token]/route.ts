export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getPostByShareToken } from "@/lib/access/publicShareAccess";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const post = await getPostByShareToken(token);

  if (!post)
    return NextResponse.json({ error: "Not Found" }, { status: 404 });

  console.log("[Analytics] public_post_viewed", { postId: post.id });

  return NextResponse.json(post);
}
