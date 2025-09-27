// src/app/api/cron/publish-weekly/route.ts
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { publishEditionForWeek } from "@/lib/editions";
import { getWeekStartUTC } from "@/lib/utils";
import { getDbUser } from "@/lib/getDbUser";
import { triggerPublishedEditionEmail } from "@/lib/emails/triggers";

function isAdminEmail(email?: string | null) {
  const list =
    process.env.ADMIN_EMAILS?.split(",")
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean) ?? [];
  return email ? list.includes(email.toLowerCase()) : false;
}

// Accept GET (Vercel Cron) and POST (manual admin trigger)
export async function GET(req: NextRequest) {
  return handlePublish(req);
}
export async function POST(req: NextRequest) {
  return handlePublish(req);
}

async function handlePublish(req: NextRequest) {
  const ts = new Date().toISOString();
  const ua = req.headers.get("user-agent") ?? "unknown";
  const path = req.nextUrl?.pathname ?? "/api/cron/publish-weekly";

  try {
    console.log("[cron] publish-weekly start", {
      ts,
      method: req.method,
      path,
      ua,
    });

    // ── Auth paths ───────────────────────────────────────────────────────────────
    const authz = req.headers.get("authorization");
    const bearerOk =
      Boolean(process.env.CRON_SECRET) &&
      authz === `Bearer ${process.env.CRON_SECRET}`;

    let adminOk = false;
    let adminEmail: string | null = null;

    // Allow POST from a signed-in admin (manual button)
    if (!bearerOk && req.method === "POST") {
      const { user, error } = await getDbUser();
      if (error) {
        console.warn("[cron] 401/500 getDbUser failed (POST manual)", error);
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      adminEmail = user.email;
      adminOk = isAdminEmail(adminEmail);
      if (!adminOk) {
        console.warn("[cron] 403 not admin", { adminEmail });
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    // GET must come with Bearer; POST can be Bearer or Admin
    if (!(bearerOk || adminOk)) {
      console.warn("[cron] unauthorized request", {
        ts,
        path,
        hasSecret: Boolean(process.env.CRON_SECRET),
        hasAuthz: Boolean(authz),
        authzLength: authz?.length ?? 0,
      });
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("[cron] auth ok", {
      mode: bearerOk ? "cron-bearer" : "admin-post",
      adminEmail: adminEmail ?? undefined,
    });

    // ── Target week selection ────────────────────────────────────────────────────
    let target = new Date(Date.now() - 24 * 60 * 60 * 1000); // default: "yesterday"
    if (req.method === "POST") {
      const body = await req.json().catch(() => ({}) as { weekISO?: string });
      if (body?.weekISO) {
        const candidate = new Date(body.weekISO);
        if (isNaN(candidate.getTime())) {
          console.warn("[cron] 400 invalid weekISO", { weekISO: body.weekISO });
          return NextResponse.json(
            { error: "Invalid weekISO date" },
            { status: 400 }
          );
        }
        target = candidate;
      }
    }

    const targetWeekStart = getWeekStartUTC(target);
    console.log("[cron] computed target", {
      targetISO: target.toISOString(),
      weekStartISO: targetWeekStart.toISOString(),
    });

    // ── Publish ──────────────────────────────────────────────────────────────────
    const result = await publishEditionForWeek(targetWeekStart);

    console.log("[cron] publish result", {
      ok: result.ok,
      published: result.published,
      reason: result["reason"],
      editionId: result["editionId"],
      postsPublished: result["postsPublished"],
    });

    // 🔔 fire weekly edition email only if it actually published
    if (result.ok && result.published) {
      try {
        const emailResult = await triggerPublishedEditionEmail();
        console.log("[cron] weekly edition email blast sent", emailResult);
      } catch (err) {
        console.error("[cron] failed to send weekly edition email blast", err);
      }
    }

    return NextResponse.json(
      {
        ok: result.ok,
        published: result.published,
        reason: result["reason"],
        editionId: result["editionId"],
        postsPublished: result["postsPublished"],
        weekStart: targetWeekStart.toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("[cron] publish-weekly error", { ts, path, err });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  } finally {
    console.log("[cron] publish-weekly end", {
      tsEnd: new Date().toISOString(),
      path,
    });
  }
}
