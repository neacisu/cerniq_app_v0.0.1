import { db, setSessionTenantId, silverCompanyLocations, silverContacts, sql } from "@cerniq/db";

export function splitName(fullName: string): { prenume: string | null; nume: string | null } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { prenume: null, nume: null };
  if (parts.length === 1) return { prenume: parts[0], nume: null };
  return { prenume: parts[0], nume: parts.slice(1).join(" ") };
}

export async function upsertSilverContact(args: {
  tenantId: string;
  companyId: string;
  fullName: string;
  functie: string;
  email?: string | null;
  telefon?: string | null;
  isDecisionMaker?: boolean;
  metadata: Record<string, unknown>;
}): Promise<void> {
  await setSessionTenantId(args.tenantId);
  const split = splitName(args.fullName);

  const existing = await db.query.silverContacts.findFirst({
    where: (t) =>
      sql`${t.tenantId} = ${args.tenantId}
          AND ${t.companyId} = ${args.companyId}
          AND COALESCE(${t.prenume}, '') = ${split.prenume ?? ""}
          AND COALESCE(${t.nume}, '') = ${split.nume ?? ""}
          AND COALESCE(${t.functie}, '') = ${args.functie}`,
  });

  if (existing) {
    await db
      .update(silverContacts)
      .set({
        email: args.email ?? existing.email ?? undefined,
        telefon: args.telefon ?? existing.telefon ?? undefined,
        isDecisionMaker: args.isDecisionMaker ?? existing.isDecisionMaker,
        metadata: sql`COALESCE(${silverContacts.metadata}, '{}'::jsonb) || ${JSON.stringify(args.metadata)}::jsonb`,
        updatedAt: new Date(),
      })
      .where(sql`${silverContacts.id} = ${existing.id}`);
    return;
  }

  await db.insert(silverContacts).values({
    tenantId: args.tenantId,
    companyId: args.companyId,
    prenume: split.prenume ?? undefined,
    nume: split.nume ?? undefined,
    functie: args.functie,
    email: args.email ?? undefined,
    telefon: args.telefon ?? undefined,
    isDecisionMaker: args.isDecisionMaker ?? false,
    metadata: args.metadata,
  });
}

export async function upsertCompanyLocation(args: {
  tenantId: string;
  companyId: string;
  tipLocatie: "SEDIU_SOCIAL" | "PUNCT_LUCRU" | "SUCURSALA" | "DEPOZIT" | "FERMA";
  adresa: string;
  localitate?: string | null;
  judet?: string | null;
  source: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  await setSessionTenantId(args.tenantId);

  const existing = await db.query.silverCompanyLocations.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.tenantId, args.tenantId),
        eq(t.companyId, args.companyId),
        eq(t.adresa, args.adresa),
      ),
  });

  if (existing) {
    await db
      .update(silverCompanyLocations)
      .set({
        tipLocatie: args.tipLocatie,
        localitate: args.localitate ?? existing.localitate ?? undefined,
        judet: args.judet ?? existing.judet ?? undefined,
        source: args.source,
      })
      .where(sql`${silverCompanyLocations.id} = ${existing.id}`);
    return;
  }

  await db.insert(silverCompanyLocations).values({
    tenantId: args.tenantId,
    companyId: args.companyId,
    tipLocatie: args.tipLocatie,
    adresa: args.adresa,
    localitate: args.localitate ?? undefined,
    judet: args.judet ?? undefined,
    source: args.source,
  });
}
