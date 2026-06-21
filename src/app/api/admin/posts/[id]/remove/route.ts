export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { error } = await requireAdmin();
  if (error) return NextResponse.json({ error: error.code }, { status: error.status });

  const { id } = await params;

  const post = await prisma.post.findUnique({ where: { id }, select: { id: true } });
  if (!post) return NextResponse.json({ error: "Not Found" }, { status: 404 });

  await prisma.post.update({ where: { id }, data: { status: "REMOVED" } });

  return NextResponse.json({ ok: true });
}
