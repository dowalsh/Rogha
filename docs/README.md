# Docs

Rogha's docs are split into two kinds of thing, and the split is the whole
point:

- **[reference/](./reference/)** — the **long-term source of truth**. Evergreen
  docs that always describe the app *as it currently is*. Start here.
- **[specs/](./specs/)** — **short-term working docs** for individual in-flight
  fixes and features. Disposable: once a change ships, its durable content is
  folded up into `reference/` and the spec is archived.

Nothing canonical should live *only* in a spec. If a behaviour is true of the
app today, `reference/` describes it; a spec is where a change is worked out,
not where the app is documented.

## reference/ — long-term

- **[reference/product-spec.md](./reference/product-spec.md)** — what Rogha does
  and how it behaves: core concepts (Friendships, Circles, Editions, Posts,
  notifications, moderation), the rules, and explicit non-goals. Read this first
  if you're new or picking up a task — behaviour independent of implementation.
- **[reference/architecture.md](./reference/architecture.md)** — how the
  codebase is put together: stack, folder layout, where
  authorization/notifications/scheduled jobs live.
- **[reference/data-model.md](./reference/data-model.md)** — entity/relationship
  reference for the Prisma schema, including modeling decisions worth knowing
  before you change them (dead fields, unused-but-reserved states).
- **[reference/development-conventions.md](./reference/development-conventions.md)**
  — branching model, commit/PR conventions, environments.
- **[reference/preview-testing.md](./reference/preview-testing.md)** — preview
  environment details: Clerk key scoping, database separation, admin-role
  promotion, webhook/lazy-sync behavior.

## specs/ — short-term

One file per non-trivial change, named with the date it was started:
`specs/YYYY-MM-DD-name.md`. A spec records the goal, scope, decisions, and
rationale for a change while it's being designed and built.

**Lifecycle:**

1. Write the spec as `specs/YYYY-MM-DD-name.md` while designing/building.
2. When the change ships, **fold its durable content into `reference/`** —
   behaviour into `product-spec.md`, schema into `data-model.md`, patterns into
   `architecture.md`, and so on.
3. **Move the spec to [specs/archive/](./specs/archive/)** (keeping its dated
   filename). It stays as history; it is no longer canonical. See
   [specs/archive/README.md](./specs/archive/README.md).

## Keeping this current

When a feature lands, update the relevant `reference/` doc(s) in the same change
— that's what keeps the long-term docs true. If the change was non-trivial
enough to have its own spec, archive the spec as part of finalizing it. See the
"When a feature is being finalized" section in [CLAUDE.md](../CLAUDE.md).
