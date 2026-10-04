// src/actions/onboarding.action.ts
"use server";

import { prisma } from "@/lib/prisma";
import { getDbUserId } from "./user.action";
import { revalidatePath } from "next/cache";

export async function dismissOnboardingIntro() {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Not authenticated");

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingIntroSeenAt: new Date() },
  });
  revalidatePath("/");
}

export async function setChecklistCollapsed(collapsed: boolean) {
  const userId = await getDbUserId();
  if (!userId) throw new Error("Not authenticated");

  await prisma.user.update({
    where: { id: userId },
    data: { onboardingChecklistCollapsed: collapsed },
  });
  revalidatePath("/");
}
