# Testing feature branches on Vercel preview deployments

> **For agents (Claude Code etc.):** this file is the source of truth for how the Vercel
> Preview environment is configured, because that config lives in the Vercel dashboard and
> is *not* visible from the repo. If you're reasoning about how preview behaves — which
> Clerk instance, which database, which env vars — trust this document.

## Spinning up a preview

1. Push a branch (or open a PR from it):
   ```
   git push -u origin <branch-name>
   ```
   Vercel's GitHub integration auto-builds a preview deployment — no `vercel` CLI needed.
2. Find the preview URL in the Vercel dashboard (Deployments tab) or in the PR's status check/comment.
3. **Always test in an incognito/private window.** Browsers cache old redirects and Clerk session cookies from previous testing, which will mask whether a fix actually worked.

## Environments at a glance

There are two fully isolated environments. **Preview does not touch production data or the production Clerk user pool.**

| | Production | Preview |
|---|---|---|
| Trigger | `main` branch | any non-`main` branch / PR |
| URL | `rogha.dylanwalsh.ie` | `*-git-<branch>-*.vercel.app` (or a staging domain, if assigned) |
| Clerk instance | **live** (`pk_live_`/`sk_live_`) | **development** (`pk_test_`/`sk_test_`) |
| Clerk user pool | real users | separate dev-instance users |
| Database | production Prisma Postgres | **separate** staging Prisma Postgres |

## Vercel environment variable configuration (authoritative)

Every variable below is set in **Vercel → Project → Settings → Environment Variables**, scoped per
environment. Vercel lets the same variable name exist multiple times as long as the environment
scopes don't overlap. **Env var changes only apply to new deployments — redeploy the branch after editing.**

### Deliberately isolated for preview (confirmed)

These are the two things that make preview safe and functional. They are intentionally different per environment:

| Variable | Production value | Preview value |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` | `pk_test_…` |
| `CLERK_SECRET_KEY` | `sk_live_…` | `sk_test_…` |
| `DATABASE_URL` | prod Prisma Postgres Accelerate URL — `prisma+postgres://accelerate.prisma-data.net/?api_key=<PROD_KEY>` | **separate** staging Prisma Postgres Accelerate URL — `prisma+postgres://accelerate.prisma-data.net/?api_key=<STAGING_KEY>` |

Notes:
- **Clerk:** live instances are bound to the custom domain (`clerk.rogha.dylanwalsh.ie` / `accounts.rogha.dylanwalsh.ie`) and will *not* authenticate from a `*.vercel.app` host. Dev-instance keys aren't domain-locked, which is the only reason sign-in works on preview at all.
- **Database:** production and preview point at **different Prisma Postgres databases** with **different `api_key`s**. The `api_key` is what selects the database, so the two URLs are otherwise identical strings — the key is the only difference and must never be swapped. Both use the Accelerate (`prisma+postgres://`) format so preview exercises the *same* code path as prod (see `src/lib/prisma.ts`, which routes `prisma+postgres://` URLs through Accelerate and anything else through the plain pg adapter).
- The runtime + migrations both read **only `DATABASE_URL`** — the `datasource` block in `prisma/schema.prisma` has no `url`/`directUrl`, so there is no second database URL to keep in sync. (`PUBLIC_DIRECT_DATABASE_URL`, if still present, is legacy and unused by `src/lib/prisma.ts`.)

### Not isolated for preview — shared with prod unless changed (verify before relying)

These were **not** given preview-specific values in the DB/Clerk separation work. Assume preview uses the
**production** value unless you confirm otherwise in the Vercel dashboard. Where a shared value is risky,
the recommendation is noted:

| Variable | Risk if shared | Recommendation |
|---|---|---|
| `RESEND_API_KEY` | Preview could send **real emails** from the prod sender | Use a Resend test/sandbox key scoped to Preview |
| `UPLOADTHING_TOKEN` | Preview uploads burn the prod quota / land in prod storage | Separate UploadThing app/key for Preview |
| `APNS_KEY` / `APNS_KEY_ID` / `APNS_TEAM_ID` | Preview could fire real push notifications | Not exercised by web preview; low priority, but scope if testing push |
| `APP_URL` | Email/share/deep-link URLs point at the wrong origin | Set to the preview/staging origin for Preview scope |
| `ADMIN_EMAILS` / `NEXT_PUBLIC_ADMIN_EMAILS` | None — see note | Only used by the cron route's email check, **not** the admin panel |
| `CRON_SECRET` | None | Vercel crons (`vercel.json`) run on **production** only; preview crons aren't triggered |

## Database: preview is fully separate

Preview has its **own** Prisma Postgres database, isolated from production. This means:

- **No risk to prod data.** Testing on preview — including deletes, bulk edits, and half-finished
  destructive code — only ever touches the staging database. This is the whole reason it exists:
  unreleased code and migrations run against throwaway data, never real users.
- **You can sign in on preview with your real email.** Because preview uses the Clerk **dev instance**
  (a separate user pool) *and* a separate database, signing in with your normal email just creates a
  dev-instance account and a row in the staging DB. It does not reuse or affect your production account.
  (Historically, when preview shared the prod DB, this was dangerous because `upsertClerkUser()` matches
  rows by `email` and would rewrite the prod row's `clerkId`. With separate databases that hazard is gone.)
- **Migrations run automatically on preview.** The build script runs `prisma migrate deploy`
  (`package.json`), so the first deploy of a branch applies all migrations to the staging database.
  A schema change on a branch is applied to staging only.
- **The staging DB starts empty.** Fresh signups, no seed data. If a screen needs reference data to
  render, seed it (there is no committed seed script today).

### User sync on preview

There is **no Clerk webhook** registered for preview URLs (they're dynamic), so
`src/app/api/webhooks/clerk/route.ts` never fires on preview. Sync instead happens via a **lazy upsert**:
the root layout (`src/app/layout.tsx`) calls `currentUser()` on every server render and upserts into
Postgres via `upsertClerkUser()` (`src/actions/user.action.ts`). This runs on both environments, so basic
user creation works on preview; only webhook-only events (e.g. deletes, richer profile updates) won't sync.

### Becoming admin on preview

Admin access is gated by the **database `role` field**, not by email:
`checkIsAdmin()` returns `user.role === "ADMIN"` (`src/actions/user.action.ts`) and `src/lib/admin.ts`
enforces the same on API routes. (`ADMIN_EMAILS` is only used by the weekly-publish cron route.)

Because the staging DB is empty and `role` defaults to `USER` (`prisma/schema.prisma`), a freshly
signed-up preview account is **not** an admin — the admin panel won't appear. Promote your staging user
manually (run locally with the staging connection string inline so your `.env` is untouched; use the
direct `postgres://…` string for CLI tools):

```bash
# Option A — visual editor
DATABASE_URL="postgres://…staging-direct…" npx prisma studio
#   → User table → your row → set role = ADMIN → save

# Option B — one-line SQL
echo "UPDATE \"User\" SET role='ADMIN' WHERE email='<the-email-you-used-on-preview>';" \
  | npx prisma db execute --url "postgres://…staging-direct…" --stdin
```

You'll need to re-do this whenever the staging DB is reset/recreated (it starts empty each time).

## Other preview quirks

- **Social login & transactional emails** run through Clerk's shared dev credentials, with dev-mode
  banners and rate limits. Fine for smoke-testing a flow, not representative of production branding or
  deliverability. (If `RESEND_API_KEY` is still the prod key on preview, real emails can go out — see the
  variable table above.)
- **Clerk version pin:** `@clerk/nextjs` `6.38.0` has a known regression that breaks dev keys on Vercel
  previews. Check the changelog before upgrading past `6.38.0`.
- **`next.config.mjs` redirect** only matches `rogha.vercel.app` and true subdomains of it — *not*
  Vercel's `*-git-*-*.vercel.app` preview hostnames — so it does not interfere with previews. Rule it out
  only if the preview URL scheme changes.

## Gotchas checklist

- [ ] Test in incognito to avoid cached redirects/cookies from earlier attempts.
- [ ] Sign up a fresh test account on preview (dev Clerk instance — separate user pool). Real email is fine now that the DB is separate.
- [ ] New here / new staging DB? Promote your user to `ADMIN` (see "Becoming admin on preview") — it defaults to `USER`.
- [ ] If preview auth breaks, check Vercel's Clerk key scoping first (Production vs Preview), then the `next.config.mjs` redirect as a secondary suspect.
- [ ] Confirm `DATABASE_URL` on Preview uses the **staging** `api_key`, not prod's — the URLs look identical apart from the key.
- [ ] Testing anything that emails/uploads/pushes? Check whether `RESEND_API_KEY` / `UPLOADTHING_TOKEN` / APNs are still the prod values on preview before triggering them.
