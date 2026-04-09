/**
 * SELECT FOR UPDATE SKIP LOCKED pentru alocare telefon WA (Etapa 2, ADR-0055).
 * Extras pentru reutilizare în orchestration + teste de concurență reale (PostgreSQL).
 */
import { db, sql, eq, and, asc, waPhoneNumbers, waQuotaUsage } from "@cerniq/db";

type DbOrTx = Pick<typeof db, "select" | "execute">;

export async function pickNextWaPhoneForTenantSkipLocked(params: {
  readonly tx: DbOrTx;
  readonly tenantId: string;
  readonly today: string;
}): Promise<{ id: string; phoneNumber: string } | null> {
  const { tx, tenantId, today } = params;

  const picked = await tx
    .select({
      id: waPhoneNumbers.id,
      phoneNumber: waPhoneNumbers.phoneNumber,
    })
    .from(waPhoneNumbers)
    .leftJoin(
      waQuotaUsage,
      and(eq(waQuotaUsage.phoneId, waPhoneNumbers.id), eq(waQuotaUsage.usageDate, today)),
    )
    .where(
      and(
        eq(waPhoneNumbers.tenantId, tenantId),
        eq(waPhoneNumbers.isEnabled, true),
        eq(waPhoneNumbers.status, "ACTIVE"),
      ),
    )
    .orderBy(
      asc(sql`coalesce(${waQuotaUsage.newContacts}, 0)`),
      asc(waPhoneNumbers.priority),
      asc(waPhoneNumbers.id),
    )
    .limit(1)
    .for("update", { skipLocked: true });

  const row = picked[0];
  return row ? { id: row.id, phoneNumber: row.phoneNumber } : null;
}
