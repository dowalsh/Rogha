import { prisma } from "@/lib/prisma";
import { getWeekStartUTC, formatWeekLabel } from "@/lib/utils";
import { extractTextFromDoc } from "@/lib/contentFilter";

export type WeeklyAdminStats = {
  weeks: string[]; // week-start labels ("YYYY-MM-DD"), ascending, contiguous
  signups: number[];
  posts: number[];
  wordCount: number[]; // posts + comments combined
};

function countWords(text: string): number {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function weekKey(date: Date): string {
  return formatWeekLabel(getWeekStartUTC(date));
}

export async function getWeeklyAdminStats(): Promise<WeeklyAdminStats> {
  const [users, posts, comments] = await Promise.all([
    prisma.user.findMany({ select: { createdAt: true } }),
    prisma.post.findMany({ select: { createdAt: true, content: true } }),
    prisma.comment.findMany({ select: { createdAt: true, content: true } }),
  ]);

  const signupBuckets = new Map<string, number>();
  const postBuckets = new Map<string, number>();
  const wordBuckets = new Map<string, number>();

  let earliest: Date | null = null;
  const track = (d: Date) => {
    if (!earliest || d < earliest) earliest = d;
  };

  for (const u of users) {
    track(u.createdAt);
    const key = weekKey(u.createdAt);
    signupBuckets.set(key, (signupBuckets.get(key) ?? 0) + 1);
  }
  for (const p of posts) {
    track(p.createdAt);
    const key = weekKey(p.createdAt);
    postBuckets.set(key, (postBuckets.get(key) ?? 0) + 1);
    const words = countWords(extractTextFromDoc(p.content));
    wordBuckets.set(key, (wordBuckets.get(key) ?? 0) + words);
  }
  for (const c of comments) {
    track(c.createdAt);
    const key = weekKey(c.createdAt);
    const words = countWords(c.content);
    wordBuckets.set(key, (wordBuckets.get(key) ?? 0) + words);
  }

  if (!earliest) {
    return { weeks: [], signups: [], posts: [], wordCount: [] };
  }

  // Contiguous week-start labels from the earliest record through the
  // current week, so gaps (a quiet week) render as a zero bar, not a skip.
  const weeks: string[] = [];
  let cursor = getWeekStartUTC(earliest);
  const end = getWeekStartUTC(new Date());
  while (cursor <= end) {
    weeks.push(formatWeekLabel(cursor));
    cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return {
    weeks,
    signups: weeks.map((w) => signupBuckets.get(w) ?? 0),
    posts: weeks.map((w) => postBuckets.get(w) ?? 0),
    wordCount: weeks.map((w) => wordBuckets.get(w) ?? 0),
  };
}
