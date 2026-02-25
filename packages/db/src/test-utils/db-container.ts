import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export async function setupTestDb(): Promise<{
  connectionString: string;
  stop: () => Promise<void>;
}> {
  const container = await new PostgreSqlContainer("postgres:16-alpine")
    .withDatabase("cerniq_test")
    .withUsername("test")
    .withPassword("test")
    .start();

  const connectionString = container.getConnectionUri();
  const sql = postgres(connectionString, { max: 1 });

  try {
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS "postgis"');
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS "vector"');
    await sql.unsafe('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
    const drizzleDir = join(__dirname, "..", "..", "drizzle");
    const files = readdirSync(drizzleDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    for (const file of files) {
      const path = join(drizzleDir, file);
      const content = readFileSync(path, "utf-8");
      const statements = content
        .split(/--> statement-breakpoint\n?/)
        .map((s) => s.trim())
        .filter(Boolean);

      for (const statement of statements) {
        try {
          await sql.unsafe(statement);
        } catch (err: unknown) {
          const code =
            err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
          if (["42P07", "42P06", "42710"].includes(code)) continue;
          throw err;
        }
      }
    }
  } finally {
    await sql.end();
  }

  return {
    connectionString,
    stop: async () => {
      await container.stop();
    },
  };
}
