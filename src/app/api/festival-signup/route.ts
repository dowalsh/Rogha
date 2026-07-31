export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/emails/sender";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim() : "";

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  console.log("[Analytics] festival_signup", { email });

  try {
    await sendEmail({
      to: "dylanwitsend@gmail.com",
      subject: "All Together Now signup",
      html: `<p>New signup from the All Together Now landing page: <strong>${email}</strong></p>`,
    });
  } catch (err) {
    console.error("[festival-signup] failed to send notification email", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
