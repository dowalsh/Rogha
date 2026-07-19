// Dormant-by-default request timing instrumentation.
// Enable with TIMING_LOGS=1 in the environment (dev or deployed) — see
// docs/development-conventions.md for how to read the output.
import { headers } from "next/headers";

const ENABLED = process.env.TIMING_LOGS === "1";
export const TIMING_RID_HEADER = "x-rogha-rid";

export function timingEnabled(): boolean {
  return ENABLED;
}

export function newRequestId(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID().slice(0, 8);
  }
  return Math.random().toString(16).slice(2, 10);
}

/**
 * Request id middleware attached to this request, for server components/route
 * handlers downstream of it. Falls back to a fresh id if middleware didn't run
 * (e.g. a route hit directly outside the matcher).
 */
export function requestIdFromHeaders(): string {
  if (!ENABLED) return "off";
  try {
    return headers().get(TIMING_RID_HEADER) ?? newRequestId();
  } catch {
    return newRequestId();
  }
}

type Context = Record<string, string | number | boolean | undefined>;

function formatContext(context?: Context): string {
  if (!context) return "";
  const parts = Object.entries(context)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length ? " " + parts.join(" ") : "";
}

export function logTiming(
  label: string,
  requestId: string,
  ms: number,
  context?: Context,
): void {
  if (!ENABLED) return;
  console.log(`[timing] rid=${requestId} ${label} ${ms.toFixed(1)}ms${formatContext(context)}`);
}

/** Times an async segment and logs it under `label`. No-op wrapper when disabled. */
export async function time<T>(
  label: string,
  requestId: string,
  fn: () => Promise<T>,
  context?: Context,
): Promise<T> {
  if (!ENABLED) return fn();
  const start = performance.now();
  const result = await fn();
  logTiming(label, requestId, performance.now() - start, context);
  return result;
}
