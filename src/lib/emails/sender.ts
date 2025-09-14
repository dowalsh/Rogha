// lib/email/sender.ts
import { Resend } from "resend";

if (!process.env.RESEND_API_KEY) {
  // Fail fast on boot in server contexts
  throw new Error("RESEND_API_KEY is not set");
}

const resend = new Resend(process.env.RESEND_API_KEY);

export type SendEmailArgs = {
  to: string;
  subject: string;
  html: string;
  from?: string; // optional override
};

type AttemptResult = { ok: true; id?: string } | { ok: false; error: unknown };

async function attemptSend(args: SendEmailArgs): Promise<AttemptResult> {
  try {
    const resp = await resend.emails.send({
      from: args.from ?? "Your App <noreply@yourdomain.com>",
      to: args.to,
      subject: args.subject,
      html: args.html,
    });
    return { ok: true, id: (resp as any)?.id };
  } catch (error) {
    return { ok: false, error };
  }
}

/**
 * sendEmail with small retry (2 retries, exponential backoff).
 * Keep this thin—central place for logging, metrics, provider swap/fallback.
 */
export async function sendEmail(args: SendEmailArgs) {
  const maxRetries = 2;
  const baseDelayMs = 300;

  let last: AttemptResult = { ok: false, error: "not attempted" };
  for (let i = 0; i <= maxRetries; i++) {
    last = await attemptSend(args);
    if (last.ok) return last;

    // simple jittered backoff
    const delay =
      baseDelayMs * Math.pow(2, i) + Math.floor(Math.random() * 100);
    await new Promise((r) => setTimeout(r, delay));
  }

  // bubble up with minimal leak of internals
  const msg = (last as any)?.error?.message ?? "Email send failed";
  throw new Error(`sendEmail: ${msg}`);
}
