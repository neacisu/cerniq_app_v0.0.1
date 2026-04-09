/**
 * Verificare PostgreSQL: 20 tranzacții paralele cu FOR UPDATE SKIP LOCKED.
 *
 * - Suite A: `DATABASE_URL` setat (Postgres existent)
 * - Suite B: `RUN_TESTCONTAINERS=1` + Docker — Postgres 16 + migrații via `@cerniq/db/test-utils`
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db, tenants, waPhoneNumbers, sql, eq } from "@cerniq/db";
import { pickNextWaPhoneForTenantSkipLocked } from "./wa-phone-skip-locked-pick.js";

const N = 20;

const hasDatabaseUrl = Boolean(process.env.DATABASE_URL?.trim());
const runTestcontainers = process.env.RUN_TESTCONTAINERS === "1";

async function seedPhones(tenantId: string, base: number): Promise<void> {
  for (let i = 0; i < N; i++) {
    const digits = `${base}${i}`.replaceAll(/\D/g, "").slice(0, 17);
    await db.insert(waPhoneNumbers).values({
      tenantId,
      phoneNumber: `+${digits}`.slice(0, 20),
      timelinesaiAccountId: `tls-sk-${base}-${i}`.slice(0, 100),
      status: "ACTIVE",
      isEnabled: true,
      priority: i,
    });
  }
}

describe.skipIf(!hasDatabaseUrl)(
  "pickNextWaPhoneForTenantSkipLocked — SKIP LOCKED (DATABASE_URL)",
  () => {
    let tenantId: string;
    const base = Date.now();

    beforeAll(async () => {
      const tenantSlug = `wa-skip-lock-${base}`.slice(0, 100);
      const [t] = await db
        .insert(tenants)
        .values({ name: tenantSlug, slug: tenantSlug, status: "active" })
        .returning();
      tenantId = t.id;
      await seedPhones(tenantId, base);
    });

    afterAll(async () => {
      await db.delete(waPhoneNumbers).where(eq(waPhoneNumbers.tenantId, tenantId));
      await db.delete(tenants).where(eq(tenants.id, tenantId));
    });

    it(`${N} tranzacții paralele → ${N} phoneId-uri distincte`, async () => {
      const today = new Date().toISOString().split("T")[0];
      const results = await Promise.all(
        Array.from({ length: N }, () =>
          db.transaction(async (tx) => {
            await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
            const picked = await pickNextWaPhoneForTenantSkipLocked({ tx, tenantId, today });
            return picked?.id ?? null;
          }),
        ),
      );
      expect(results.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
      expect(new Set(results).size).toBe(N);
    });
  },
);

describe.skipIf(!runTestcontainers)(
  "pickNextWaPhoneForTenantSkipLocked — SKIP LOCKED (testcontainers)",
  () => {
    let tenantId: string;
    const base = Date.now() + 1;
    let stopContainer: () => Promise<void>;

    beforeAll(async () => {
      const { setupTestDb } = await import("@cerniq/db/test-utils");
      const { refreshDbConnection, closeDbConnection } = await import("@cerniq/db");
      const { connectionString, stop } = await setupTestDb();
      stopContainer = async () => {
        await closeDbConnection();
        await stop();
      };
      process.env.DATABASE_URL = connectionString;
      await refreshDbConnection();

      const tenantSlug = `wa-skip-lock-tc-${base}`.slice(0, 100);
      const [t] = await db
        .insert(tenants)
        .values({ name: tenantSlug, slug: tenantSlug, status: "active" })
        .returning();
      tenantId = t.id;
      await seedPhones(tenantId, base);
    }, 360_000);

    afterAll(async () => {
      await db.delete(waPhoneNumbers).where(eq(waPhoneNumbers.tenantId, tenantId));
      await db.delete(tenants).where(eq(tenants.id, tenantId));
      await stopContainer();
    });

    it(`${N} tranzacții paralele → ${N} phoneId-uri distincte (testcontainers)`, async () => {
      const today = new Date().toISOString().split("T")[0];
      const results = await Promise.all(
        Array.from({ length: N }, () =>
          db.transaction(async (tx) => {
            await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
            const picked = await pickNextWaPhoneForTenantSkipLocked({ tx, tenantId, today });
            return picked?.id ?? null;
          }),
        ),
      );
      expect(results.every((id) => typeof id === "string" && id.length > 0)).toBe(true);
      expect(new Set(results).size).toBe(N);
    });
  },
);
