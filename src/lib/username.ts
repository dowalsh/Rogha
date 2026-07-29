import { prisma } from "@/lib/prisma";

export const USERNAME_MAX_LENGTH = 20;

/**
 * Strip to the allowed charset (letters, numbers, underscore), cap length.
 * Does NOT lowercase — callers decide whether they want display casing
 * (`username`) or the lookup/uniqueness form (`usernameLower`).
 */
export function sanitizeUsername(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9_]/g, "").slice(0, USERNAME_MAX_LENGTH);
}

export function isValidUsername(raw: string): boolean {
  return /^[a-zA-Z0-9_]{1,20}$/.test(raw);
}

/**
 * Given a sanitized base, find a usernameLower that isn't taken by
 * appending a numeric suffix on collision (john, john2, john3, ...).
 * `excludeUserId` lets a user "collide" with their own current row when
 * re-saving without changing anything.
 */
export async function dedupeUsername(
  base: string,
  excludeUserId?: string
): Promise<string> {
  const baseLower = base.toLowerCase();
  let candidate = baseLower;
  let suffix = 1;

  while (true) {
    const existing = await prisma.user.findUnique({
      where: { usernameLower: candidate },
      select: { id: true },
    });
    if (!existing || existing.id === excludeUserId) {
      return candidate;
    }
    suffix += 1;
    candidate = `${baseLower}${suffix}`;
  }
}

export type SetUsernameResult =
  | { success: true; username: string }
  | { success: false; error: string };

/**
 * Validate + apply a user-chosen username. Preserves the casing the user
 * typed for display (`username`); `usernameLower` is always lowercase and
 * is the uniqueness/lookup key.
 */
export async function setUsername(
  userId: string,
  rawUsername: string
): Promise<SetUsernameResult> {
  const trimmed = rawUsername.trim();
  if (!isValidUsername(trimmed)) {
    return {
      success: false,
      error:
        "Usernames can only contain letters, numbers, and underscores (max 20 characters).",
    };
  }

  const lower = trimmed.toLowerCase();
  const existing = await prisma.user.findUnique({
    where: { usernameLower: lower },
    select: { id: true },
  });
  if (existing && existing.id !== userId) {
    return { success: false, error: "That username is already taken." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      username: trimmed,
      usernameLower: lower,
    },
  });

  return { success: true, username: trimmed };
}
