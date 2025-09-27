// app/api/email/route.ts
import { NextResponse } from "next/server";
import {
  triggerPostSubmittedEmails,
  triggerPublishedEditionEmail,
} from "@/lib/emails/triggers";

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

    if (!body?.type) {
      return NextResponse.json(
        { error: "Missing type in request body" },
        { status: 400 }
      );
    }

    let result;

    if (body.type === "post_submitted") {
      if (!body.postId) {
        return NextResponse.json(
          { error: "postId required for post_submitted" },
          { status: 400 }
        );
      }
      console.log(
        `⚡ Triggering post_submitted flow for postId=${body.postId}`
      );
      result = await triggerPostSubmittedEmails(body.postId);
    } else if (body.type === "published_edition") {
      console.log("⚡ Triggering published_edition flow");
      result = await triggerPublishedEditionEmail();
    } else {
      return NextResponse.json(
        { error: `Unknown type: ${body.type}` },
        { status: 400 }
      );
    }

    console.log("✅ Email trigger finished:", result);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    console.error("🔥 Route crashed:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
