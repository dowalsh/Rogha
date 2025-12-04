// prisma.config.ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // seed: 'tsx prisma/seed.ts', // if you have seeding
  },
  datasource: {
    url: env("DATABASE_URL"),
    // shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
});
