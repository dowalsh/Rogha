import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function getDbUser() {
  const { userId: clerkUserId } = await auth();
  if (!clerkUserId) {
    throw new Error("UNAUTHORIZED");
  }

  // Prefer stable Clerk ID over email
  const dbUser = await prisma.user.findUnique({
    where: { clerkId: clerkUserId },
  });

  if (!dbUser) {
    // As a fallback, attempt email lookup if needed
    const user = await currentUser();
    const email = user?.emailAddresses[0]?.emailAddress;
    if (email) {
      return prisma.user.findUnique({ where: { email } });
    }
    throw new Error("USER_NOT_FOUND");
  }

  return dbUser;
}
