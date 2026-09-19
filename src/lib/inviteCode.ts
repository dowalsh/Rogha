import { prisma } from "@/lib/prisma";

const MAX_BASE_LENGTH = 20;
const MAX_GENERATION_ATTEMPTS = 20;

// Uppercase words joined by hyphens, stripped of anything that isn't
// alphanumeric — e.g. "Sunday Swim!" -> "SUNDAY-SWIM".
export function slugifyInviteBase(input: string): string {
  const slug = input
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug.slice(0, MAX_BASE_LENGTH) || "CIRCLE";
}

export function defaultInviteBase(circleName: string): string {
  return slugifyInviteBase(circleName);
}

function randomSuffix(): string {
  return String(Math.floor(Math.random() * 1000)).padStart(3, "0");
}

// Appends a random 3-digit suffix to `base` until an unused code is found.
export async function generateUniqueInviteCode(base: string): Promise<string> {
  const normalizedBase = slugifyInviteBase(base);
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const candidate = `${normalizedBase}-${randomSuffix()}`;
    const existing = await prisma.circleInvite.findUnique({
      where: { code: candidate },
      select: { code: true },
    });
    if (!existing) return candidate;
  }
  throw new Error("Could not generate a unique invite code, please try again");
}
