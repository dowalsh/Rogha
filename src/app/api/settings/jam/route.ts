export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { z } from "zod";

const jamSchema = z.object({
  lastfmUsername: z.string().trim().min(1).max(64).nullable().optional(),
  jamEnabled: z.boolean().optional(),
});

export async function GET() {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  return NextResponse.json({
    lastfmUsername: user.lastfmUsername,
    jamEnabled: user.jamEnabled,
  });
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await getDbUser();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });

  const parsed = jamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: parsed.data,
    select: { lastfmUsername: true, jamEnabled: true },
  });

  return NextResponse.json(updated);
}
