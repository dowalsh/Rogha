-- Records a default that was already applied directly to the DB (via db
-- push at some point) but never captured in migration history — reconciling
-- history with the schema.prisma `@default(now())` that's already in place.
ALTER TABLE "PostRead" ALTER COLUMN "firstReadAt" SET DEFAULT now();
