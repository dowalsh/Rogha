-- Usernames are now the only display identity in the app (see the profiles
-- & friends work) — there's no remaining reader of User.name, and
-- upsertClerkUser() stops deriving it from Clerk firstName/lastName.
ALTER TABLE "User" DROP COLUMN "name";
