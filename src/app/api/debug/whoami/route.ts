// src/app/api/debug/whoami/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";

export async function GET() {
  const { userId } = await auth();
  const user = await currentUser();
  return NextResponse.json({
    userId,
    email: user?.emailAddresses?.[0]?.emailAddress ?? null,
    hasSessionCookie: true, // this endpoint only runs if your browser included cookies
  });
}
