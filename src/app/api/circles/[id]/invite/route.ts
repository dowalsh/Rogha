export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createCircleInvite, getActiveCircleInvite } from "@/actions/circle.action";
import { requestOrigin } from "@/lib/serverOrigin";

function shareUrl(req: NextRequest, code: string): string {
  return `${requestOrigin(req)}/join/${code}`;
}

function errorResponse(error: any) {
  const msg = error?.message ?? "Internal Server Error";
  const status = /Not authenticated/i.test(msg)
    ? 401
    : /not a member/i.test(msg)
      ? 403
      : /not found/i.test(msg)
        ? 404
        : 500;
  return NextResponse.json({ error: msg }, { status });
}

// GET — the circle's current active invite, if any (for "copy existing" UI)
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const invite = await getActiveCircleInvite(id);
    if (!invite) return NextResponse.json({ invite: null });
    return NextResponse.json({
      invite: { code: invite.code, url: shareUrl(req, invite.code), expiresAt: invite.expiresAt },
    });
  } catch (error) {
    console.error("[CIRCLE_INVITE_GET_ERROR]", error);
    return errorResponse(error);
  }
}

// POST — create a new invite, retiring any currently-active one
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const customCode = typeof body?.customCode === "string" ? body.customCode : undefined;

    const invite = await createCircleInvite({ circleId: id, customCode });
    return NextResponse.json({
      invite: { code: invite.code, url: shareUrl(req, invite.code), expiresAt: invite.expiresAt },
    });
  } catch (error) {
    console.error("[CIRCLE_INVITE_POST_ERROR]", error);
    return errorResponse(error);
  }
}
