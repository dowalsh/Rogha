export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/getDbUser";
import { z } from "zod";

const bodySchema = z.object({
  token: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const { user, error } = await getDbUser();
  if (error) {
    return NextResponse.json({ error: error.code }, { status: error.status });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid fields", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const device = await prisma.pushDevice.upsert({
    where: { token: parsed.data.token },
    create: {
      userId: user.id,
      token: parsed.data.token,
      enabled: true,
      lastSeenAt: new Date(),
    },
    update: {
      userId: user.id,
      enabled: true,
      lastSeenAt: new Date(),
    },
  });

  return NextResponse.json({ id: device.id }, { status: 200 });
}
