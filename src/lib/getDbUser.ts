import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getDbUser() {
  // Clerk auth
  const { userId } = await auth();
  if (!userId) {
    return { error: { code: "UNAUTHORIZED", status: 401 } as const };
  }

  // Clerk current user → email
  const user = await currentUser();
  const email = user?.emailAddresses?.[0]?.emailAddress;
  if (!email) {
    return { error: { code: "EMAIL_NOT_FOUND", status: 400 } as const };
  }

  // DB lookup
  const dbUser = await prisma.user.findUnique({ where: { email } });
  if (!dbUser) {
    return { error: { code: "USER_NOT_IN_DB", status: 404 } as const };
  }

  return { user: dbUser } as const;
}
