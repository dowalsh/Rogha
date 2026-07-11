# Testing feature branches on Vercel preview deployments

## Spinning up a preview

1. Push a branch (or open a PR from it):
   ```
   git push -u origin <branch-name>
   ```
   Vercel's GitHub integration auto-builds a preview deployment — no `vercel` CLI needed.
2. Find the preview URL in the Vercel dashboard (Deployments tab) or in the PR's status check/comment.
3. **Always test in an incognito/private window.** Browsers can cache old redirects and Clerk session cookies from previous testing, which will mask whether a fix actually worked.

## Clerk environment keys

Clerk **live** instances (`pk_live_` / `sk_live_`) are bound to this project's custom domain (`clerk.rogha.dylanwalsh.ie` / `accounts.rogha.dylanwalsh.ie`) and will not authenticate correctly from a `*.vercel.app` preview URL. Vercel env vars are scoped so:

| Variable | Value | Vercel scope |
|---|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_...` | Production |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_test_...` | Preview + Development |
| `CLERK_SECRET_KEY` | `sk_live_...` | Production |
| `CLERK_SECRET_KEY` | `sk_test_...` | Preview + Development |

This is what makes sign-in work on preview at all — Clerk dev-instance keys aren't locked to a specific domain.

## Important nuance: preview shares the production database

`DATABASE_URL` / `PUBLIC_DIRECT_DATABASE_URL` are **not** scoped per environment — preview deployments read and write the same Postgres database as production. Ideally preview would point at a separate, non-production database; until that exists, treat every preview session as if it's touching prod, because it is.

- The Clerk **dev instance** (used on preview) is a completely separate user pool from the **live instance** (used on production). Signing in on preview with your normal email does *not* reuse your real account — it goes through Clerk's dev-instance auth entirely.
- **How user rows are synced:** on preview there's no registered Clerk webhook (dynamic preview URLs aren't added as a webhook endpoint in the Clerk dashboard), so the webhook route (`src/app/api/webhooks/clerk/route.ts`) never fires. Instead, sync happens via a **lazy upsert** — the root layout (`src/app/layout.tsx`) calls `currentUser()` on every server-rendered request and upserts into Postgres via `upsertClerkUser()` (`src/actions/user.action.ts`). This runs on both preview and production, so sync works either way.
- **⚠️ Critical: never sign in on preview with your real production email.** `upsertClerkUser()` matches existing rows **by `email`, not by `clerkId`** (`src/actions/user.action.ts:57-58`), and overwrites `clerkId` on every upsert. If you sign in on preview (dev Clerk instance) using the same email as your real production account, it **rewrites your production `User` row's `clerkId`** to the dev-instance's user ID — effectively hijacking your real account's identity binding. `getDbUser()` (`src/lib/getDbUser.ts`) self-heals this the next time you log into production for real (it falls back to an email lookup and re-links `clerkId`), so it isn't permanently destructive, but it's a real race/flapping hazard and not something to rely on. **Always use a distinct test email** (e.g. a `+test` alias, which Postgres/Prisma will treat as a different string and therefore a different row) — never your literal real address.
- **Avoid destructive or bulk operations** while testing on preview — deletes, bulk edits, etc. hit the real production data.
- A more robust future improvement would be per-branch database branching (e.g. a Neon or Supabase branch created per preview deployment), so preview gets a fully isolated database. Not built today — noted here as a possible future enhancement if preview testing needs get heavier.

## Other preview quirks

- **Social login & transactional emails** run through Clerk's shared dev credentials, with dev-mode banners and rate limits. Fine for smoke-testing a flow, not representative of production branding or deliverability.
- **Clerk version pin:** `@clerk/nextjs` `6.38.0` has a known regression that breaks dev keys on Vercel previews. Currently pinned via `package-lock.json` to `6.31.9` (well below it) — check the changelog before upgrading past `6.38.0`.
- Env var changes in Vercel only apply to **new** deployments — redeploy the branch after editing scoped keys.

## Gotchas checklist

- [ ] Test in incognito to avoid cached redirects/cookies from earlier attempts.
- [ ] Sign up a fresh test account on preview using a **distinct email** (e.g. `+test` alias) — never your real production email, since sync matches by email and will hijack your prod account's `clerkId`.
- [ ] Remember preview writes to the real production database — avoid destructive/bulk actions.
- [ ] If preview auth ever breaks again, check Vercel's env var scoping for Clerk keys first (Production vs Preview/Development), and only then look at `next.config.mjs`'s redirect rules as a secondary suspect (as of writing, that redirect only matches `rogha.vercel.app` and true subdomains of it — not Vercel's `*-git-*-*.vercel.app` preview hostnames — so it's unlikely to be the cause, but worth ruling out if the URL scheme changes).
