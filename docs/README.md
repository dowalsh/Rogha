# Docs index

Start here, then follow links.

- **[product-spec.md](./product-spec.md)** — what Rogha does and how it's supposed to behave: core concepts (Circles, Editions, Posts, Friendships, notifications, moderation), expected rules, and explicit non-goals. Read this first if you're new to the app or an agent picking up a task — it's the reference point for expected behavior independent of implementation.
- **[architecture.md](./architecture.md)** — how the codebase is put together: stack, folder layout, where authorization/notifications/scheduled jobs live.
- **[data-model.md](./data-model.md)** — entity/relationship reference for the Prisma schema, including modeling decisions worth knowing before you change them (e.g. dead fields, unused-but-reserved states).
- **[development-conventions.md](./development-conventions.md)** — branching model, commit/PR conventions, environments.
- **[preview-testing.md](./preview-testing.md)** — preview environment details: Clerk key scoping, database separation, admin-role promotion, webhook/lazy-sync behavior.
- **[specs/](./specs/)** — specs for individual non-trivial features, one file per feature, kept even after the feature ships (they record intent, scope, and rationale that the code alone doesn't).

## Keeping this current

When a feature lands, check whether it changed behavior worth reflecting in `product-spec.md`, introduced a new architectural pattern worth noting in `architecture.md`, changed the schema in a way worth noting in `data-model.md`, or is significant enough to deserve its own file in `specs/`. See the "When a feature is being finalized" section in [CLAUDE.md](../CLAUDE.md).
