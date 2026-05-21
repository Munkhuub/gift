import "dotenv/config";
import { defineConfig, env } from "prisma/config";

function resolveMigrationUrl() {
  if (process.env.DIRECT_URL) {
    return process.env.DIRECT_URL;
  }

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return env("DATABASE_URL");
  }

  try {
    const parsed = new URL(databaseUrl);

    if (parsed.hostname === "pooled.db.prisma.io") {
      parsed.hostname = "db.prisma.io";
      return parsed.toString();
    }
  } catch {
    return databaseUrl;
  }

  return databaseUrl;
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: resolveMigrationUrl(),
  },
});
