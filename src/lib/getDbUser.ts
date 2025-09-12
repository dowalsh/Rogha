// lib/getDbUser.ts
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getDbUser() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { user: null, error: { code: "UNAUTHORIZED", status: 401 } };
    }

    const dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });
    if (!dbUser) {
      return { user: null, error: { code: "NOT_FOUND", status: 404 } };
    }

    return { user: dbUser, error: null };
  } catch (e) {
    console.error("[getDbUser] error:", e);
    return { user: null, error: { code: "INTERNAL", status: 500 } };
  }
}
