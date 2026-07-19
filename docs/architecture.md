# Architecture — Rogha

A map of how the codebase is put together. For *what the app does*, see [product-spec.md](./product-spec.md). For entity detail, see [data-model.md](./data-model.md).

## Stack

- **Next.js (App Router, TypeScript)** — web app, deployed on Vercel.
- **Prisma ORM + PostgreSQL** — data layer (`@prisma/adapter-pg`, Prisma Accelerate extension for connection pooling/caching).
- **Clerk** — auth (web sign-in, Clerk webhooks for user sync).
- **Capacitor (iOS)** — the native app is a Capacitor shell loading the web app from a remote `server.url`; see [specs/origin-aware-signin.md](./specs/origin-aware-signin.md) for how native sign-in hands off to a web browser and back via deep link.
- **Lexical** — rich text editor (post composition), plus Excalidraw for embedded drawing.
- **Tailwind CSS + Radix UI** — styling/components.
- **UploadThing** — image/file uploads (hero images).
- **Vercel Cron** — scheduled jobs (weekly edition publish).

## Layout

```
src/
  app/            Next.js routes — pages + API routes, colocated by feature
    api/          REST-ish API routes (see below)
    editions/ circles/ posts/ profile/ settings/ admin/ ...   feature pages
    auth/         native sign-in hand-off pages (return-to-app, native-callback)
  actions/        Server actions — mutation entry points called from client components
  lib/            Shared server logic: access control, editions, friends, content
                  filtering, email, push, admin checks, Prisma client
  components/     React components (shared across feature pages)
  hooks/          Client hooks (SWR-based data fetching wrappers; see below)
  types/          Shared TS types
prisma/
  schema.prisma   Source of truth for the data model
```

### `src/app/api/*` — feature areas
`posts`, `editions`, `circles`, `friends`, `comments`, `blocks`, `reports`, `admin`, `settings`, `push`, `auth`, `webhooks/clerk`, `cron/publish-weekly`, `public/posts` (unauthenticated share links), `debug/whoami`.

### `src/actions/*` vs `src/app/api/*`
Both are mutation entry points; there isn't a strict rule dividing them today. `actions/` tends to hold Next.js server actions called directly from client components (posts, circles, friends, notifications, profile, user, activity events); `api/` tends to hold routes hit by fetch calls (including from the native app and cron) or that need to be REST-addressable. When adding a new mutation, follow the pattern already used by the nearest similar feature rather than picking arbitrarily.

### `src/lib/access/` — authorization
Centralizes visibility rules (`postAccess.ts` — `canViewPostPolicy`) so that post/comment visibility (audience type, friendship temporal gate, blocking, reports) is enforced in one place rather than re-implemented per route. New surfaces that read posts or comments should call into this rather than re-deriving visibility.

### Scheduled jobs
`vercel.json` defines the cron schedule (`0 7 * * 0` — Sundays 07:00 UTC) hitting `/api/cron/publish-weekly`, which calls `publishEditionForWeek()` in `src/lib/editions.ts`. The route also accepts an admin-triggered manual run, authenticated separately from the DB `role` field via an `ADMIN_EMAILS` env allowlist — see [product-spec.md](./product-spec.md#roles) for why these two admin checks aren't the same mechanism.

### Notifications & delivery
`src/actions/notification.action.ts` is the single place notification events are created and fanned out to in-app rows, email (`src/lib/emails/`), and push (`src/lib/push/`), gated per-user by `NotificationPreference`.

### Client-side data fetching & caching
Client components fetch through **SWR**, wired up app-wide via `SWRProvider` (`src/components/providers/SWRProvider.tsx`, mounted in `src/app/layout.tsx`) so the cache persists across client-side navigation — not every page has been migrated yet. Includes a cache-seeding technique for the editions preloader and route-prefetch/TTL tuning (`next.config.mjs`'s `experimental.staleTimes`). See [specs/data-fetching-caching.md](./specs/data-fetching-caching.md) for the full rationale and what's still on the old fetch pattern.

### Loading UI
Every route that fetches its own data (editions list, reader, editor, posts, settings, notifications, admin) owns a skeleton component mirroring its loaded layout, shown via `useDelayedLoading` (`src/hooks/useDelayedLoading.ts`) rather than a raw `isLoading` check — that hook holds the skeleton back for a short grace window (so fast/prefetched loads never flash a placeholder) and then, once shown, keeps it up for a minimum duration (so it can't flicker). The root `src/app/loading.tsx` is a neutral, layout-stable fallback only — no route should rely on it as real loading UI. `editions/[id]` is the one route with a genuine server-render delay (force-dynamic Prisma query) and uses a route-level `loading.tsx` skeleton instead of the hook.

## Environments & branching

Three environments: local, Vercel preview (per-branch, isolated Clerk dev instance + separate database), and `staging` (a long-lived branch with a stable preview URL, needed because the native app's `CAP_SERVER_URL` must point at one fixed URL). Full branching model in [development-conventions.md](./development-conventions.md); preview environment wiring (Clerk key scoping, database separation, admin-role promotion, webhook/lazy-sync behavior) in [preview-testing.md](./preview-testing.md).
