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

`DATABASE_URL` / `PUBLIC_DIRECT_DATABASE_URL` are **not** scoped per environment — preview deployments read and write the same Postgres database as production. Practical implications:

- The Clerk **dev instance** (used on preview) is a completely separate user pool from the **live instance** (used on production). Signing in on preview with your normal email creates a *new, distinct* account — it is not the same user as your real production account, even though the email matches.
- That new account still gets synced into the real production database as an ordinary `User` row, via the Clerk webhook (`src/app/api/webhooks/clerk/route.ts`).
- **Use a clearly-identifiable test account** when testing on preview (e.g. a `+test` email alias) so it's easy to spot and clean up later.
- **Avoid destructive or bulk operations** while testing on preview — deletes, bulk edits, etc. hit the real production data.
- A more robust future improvement would be per-branch database branching (e.g. a Neon or Supabase branch created per preview deployment), so preview gets an isolated database. Not built today — noted here as a possible future enhancement if preview testing needs get heavier.

## Gotchas checklist

- [ ] Test in incognito to avoid cached redirects/cookies from earlier attempts.
- [ ] Sign up a fresh test account on preview — your production login won't carry over.
- [ ] Remember preview writes to the real production database — use a taggable test account and avoid destructive actions.
- [ ] If preview auth ever breaks again, check Vercel's env var scoping for Clerk keys first (Production vs Preview/Development), and only then look at `next.config.mjs`'s redirect rules as a secondary suspect (as of writing, that redirect only matches `rogha.vercel.app` and true subdomains of it — not Vercel's `*-git-*-*.vercel.app` preview hostnames — so it's unlikely to be the cause, but worth ruling out if the URL scheme changes).
