// app/api/email/route.ts
import { NextResponse } from "next/server";
import { triggerPostSubmittedEmails } from "@/lib/emails/triggers";

export async function POST(req: Request) {
  console.log("📩 Incoming request to /api/email");

  try {
    if (!process.env.RESEND_API_KEY) {
      console.error("❌ RESEND_API_KEY missing");
      return NextResponse.json(
        { error: "RESEND_API_KEY is not set" },
        { status: 500 }
      );
    }

    console.log(
      "✅ Found RESEND_API_KEY (length:",
      process.env.RESEND_API_KEY.length,
      ")"
    );

    const body = await req.json().catch(() => null);
    console.log("📥 Parsed request body:", body);

    if (!body?.type || !body?.postId) {
      console.error("❌ Missing type or postId in request body");
      return NextResponse.json(
        { error: "Missing type or postId" },
        { status: 400 }
      );
    }

    console.log(
      `⚡ Triggering email flow: type=${body.type}, postId=${body.postId}`
    );
    const result = await triggerPostSubmittedEmails(body.postId);

    console.log("✅ Email trigger finished:", result);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("🔥 Route crashed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
