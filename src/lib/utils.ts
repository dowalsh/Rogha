import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// src/lib/utils.ts

// Compute Monday 00:00:00 in LA, return as UTC Date
export function getWeekStartUTC(d = new Date()): Date {
  const la = new Date(
    d.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );

  const day = la.getDay(); // 0 = Sunday … 6 = Saturday
  const diff = (day + 6) % 7; // days since Monday
  la.setDate(la.getDate() - diff); // go back to Monday
  la.setHours(0, 0, 0, 0);

  return la; // JS Date is UTC internally
}

export function formatWeekLabel(date: Date): string {
  const la = new Date(
    date.toLocaleString("en-US", { timeZone: "America/Los_Angeles" })
  );
  return la.toISOString().slice(0, 10); // "YYYY-MM-DD"
}
