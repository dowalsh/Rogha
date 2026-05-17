import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const client = await clerkClient();
  const { token } = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: 30,
  });

  return NextResponse.json({ token });
}
