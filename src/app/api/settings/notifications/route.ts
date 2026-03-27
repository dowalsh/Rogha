export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { z } from "zod";

const prefsSchema = z.object({
  emailEnabled: z.boolean().optional(),
  pushEnabled: z.boolean().optional(),
  emailComments: z.boolean().optional(),
  pushComments: z.boolean().optional(),
  emailReplies: z.boolean().optional(),
  pushReplies: z.boolean().optional(),
  emailSubmissions: z.boolean().optional(),
  pushSubmissions: z.boolean().optional(),
  emailFriendRequests: z.boolean().optional(),
  pushFriendRequests: z.boolean().optional(),
});

async function getOrCreatePrefs(userId: string) {
  return prisma.notificationPreference.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

export async function GET() {
  const { user, error } = await getDbUser();
  if (error) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }

  const prefs = await getOrCreatePrefs(user.id);
  return NextResponse.json(prefs);
}

export async function PATCH(req: NextRequest) {
  const { user, error } = await getDbUser();
  if (error) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = prefsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  if (Object.keys(parsed.data).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const prefs = await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...parsed.data },
    update: parsed.data,
  });

  return NextResponse.json(prefs);
}
