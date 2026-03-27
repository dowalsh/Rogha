import { NextResponse } from "next/server";
import { getDbUser } from "@/lib/getDbUser";

export async function GET() {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });
  return NextResponse.json({ id: user.id });
}
