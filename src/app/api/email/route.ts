// app/api/email/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { triggerPostSubmittedEmails } from "@/lib/emails/triggers";

// Keep API route skinny: validate -> delegate -> respond

const BodySchema = z.object({
  // currently supports only this trigger; extend as needed
  type: z.literal("post_submitted"),
  postId: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    // Ensure server-only runtime; avoids accidental edge/client usage
    if (typeof process === "undefined" || !process.env) {
      return NextResponse.json(
        { error: "Server environment required" },
        { status: 500 }
      );
    }

    const json = await req.json().catch(() => ({}));
    const parsed = BodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { type, postId } = parsed.data;

    if (type === "post_submitted") {
      const result = await triggerPostSubmittedEmails(postId);
      return NextResponse.json({ ok: true, ...result }, { status: 200 });
    }

    return NextResponse.json({ error: "Unsupported type" }, { status: 400 });
  } catch (err: any) {
    // Do not leak secrets or provider internals
    console.error("POST /api/email error", { message: err?.message });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
