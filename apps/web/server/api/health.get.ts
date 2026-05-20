import { sql } from "drizzle-orm";
import { setResponseStatus } from "h3";
import { db } from "~/server/db/client";

const REQUIRED_TABLES = ["categories", "news", "news_view_daily"] as const;

function isSqliteUrl(databaseUrl: string) {
  return databaseUrl.startsWith("file:");
}

async function checkDatabaseConnection() {
  const startedAt = Date.now();

  await db.execute(sql`SELECT 1`);

  return {
    ok: true,
    latencyMs: Date.now() - startedAt
  };
}

async function checkMigrationState(databaseUrl: string) {
  if (isSqliteUrl(databaseUrl)) {
    const result = await db.execute<{ name: string }>(
      sql`SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('categories', 'news', 'news_view_daily')`
    );

    const existing = new Set(result.rows.map((row) => row.name));
    const missingTables = REQUIRED_TABLES.filter((tableName) => !existing.has(tableName));

    return {
      ok: missingTables.length === 0,
      missingTables
    };
  }

  const result = await db.execute<{ table_name: string }>(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('categories', 'news', 'news_view_daily')
  `);

  const existing = new Set(result.rows.map((row) => row.table_name));
  const missingTables = REQUIRED_TABLES.filter((tableName) => !existing.has(tableName));

  return {
    ok: missingTables.length === 0,
    missingTables
  };
}

export default defineEventHandler(async (event) => {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const checks: Record<string, any> = {};
  let healthy = true;

  try {
    checks.database = await checkDatabaseConnection();
  } catch (error: any) {
    healthy = false;
    checks.database = {
      ok: false,
      error: error?.message ?? "Database connection check failed"
    };
  }

  if (checks.database?.ok) {
    try {
      checks.migrations = await checkMigrationState(databaseUrl);
      if (!checks.migrations.ok) {
        healthy = false;
      }
    } catch (error: any) {
      healthy = false;
      checks.migrations = {
        ok: false,
        error: error?.message ?? "Migration state check failed"
      };
    }
  } else {
    checks.migrations = {
      ok: false,
      error: "Skipped because database check failed"
    };
  }

  if (!healthy) {
    setResponseStatus(event, 503, "Service Unhealthy");
  }

  return {
    status: healthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    checks
  };
});