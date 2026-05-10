import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getDbUser() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { user: null, error: { code: "UNAUTHORIZED", status: 401 } };
    }

    // Fast path: clerkId is already current
    let dbUser = await prisma.user.findUnique({ where: { clerkId: userId } });

    // Fallback: first login after Clerk instance switch — clerkId changed
    if (!dbUser) {
      const clerkUser = await currentUser();
      const email = clerkUser?.primaryEmailAddress?.emailAddress;
      if (!email) {
        return { user: null, error: { code: "NOT_FOUND", status: 404 } };
      }
      dbUser = await prisma.user.findUnique({ where: { email } });
      if (dbUser) {
        await prisma.user.update({ where: { id: dbUser.id }, data: { clerkId: userId } });
        dbUser = { ...dbUser, clerkId: userId };
      }
    }

    if (!dbUser) {
      return { user: null, error: { code: "NOT_FOUND", status: 404 } };
    }
    return { user: dbUser, error: null };
  } catch (e) {
    console.error("[getDbUser] error:", e);
    return { user: null, error: { code: "INTERNAL", status: 500 } };
  }
}
