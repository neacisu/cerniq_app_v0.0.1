/**
 * g39-association-normalize.ts — Worker G39: Normalizare OUAI/MADR (FAZA 9g)
 *
 * Queue: association:normalize | Timeout: 120s | Concurrency: 5 | Redis DB: 5
 *
 * Responsabilitate:
 *   - Normalizează county (SIRUTA) și ouaiName/name pentru goldOuaiRegistry și goldAssociations
 *   - Validează format CUI: /^\d{2,10}$/ → invalid → NULL
 *   - Dedup goldAssociations per (name_normalized + county_normalized) → isActive=false pe cele mai vechi
 *
 * Anti-halucin. FAZA 9g:
 *   (A) goldOuaiRegistry — tabel global, fără tenantId
 *   (B) goldAssociations — per tenant, necesită setSessionTenantId
 *   (C) CUI format invalid → NULL (nu eliminar înregistrarea)
 */

import type { Job, Worker } from "bullmq";
import { db, goldOuaiRegistry, goldAssociations, eq, and, setSessionTenantId } from "@cerniq/db";
import { QUEUES, createWorker, withCognitiveSpan } from "@cerniq/worker-shared";

// ---------------------------------------------------------------------------
// SIRUTA County Normalization
// ---------------------------------------------------------------------------

const COUNTY_NAME_MAP: Record<string, string> = {
  AB: "ALBA",
  AR: "ARAD",
  AG: "ARGES",
  BC: "BACAU",
  BH: "BIHOR",
  BN: "BISTRITA-NASAUD",
  BT: "BOTOSANI",
  BV: "BRASOV",
  BR: "BRAILA",
  B: "BUCURESTI",
  BUC: "BUCURESTI",
  ILFOV: "ILFOV",
  IF: "ILFOV",
  BZ: "BUZAU",
  CS: "CARAS-SEVERIN",
  CL: "CALARASI",
  CJ: "CLUJ",
  CT: "CONSTANTA",
  CV: "COVASNA",
  DB: "DAMBOVITA",
  DJ: "DOLJ",
  GL: "GALATI",
  GR: "GIURGIU",
  GJ: "GORJ",
  HR: "HARGHITA",
  HD: "HUNEDOARA",
  IL: "IALOMITA",
  IS: "IASI",
  MM: "MARAMURES",
  MH: "MEHEDINTI",
  MS: "MURES",
  NT: "NEAMT",
  OT: "OLT",
  PH: "PRAHOVA",
  SM: "SATU-MARE",
  SJ: "SALAJ",
  SB: "SIBIU",
  SV: "SUCEAVA",
  TR: "TELEORMAN",
  TM: "TIMIS",
  TL: "TULCEA",
  VS: "VASLUI",
  VL: "VALCEA",
  VN: "VRANCEA",
};

function normalizeCounty(raw: string): string {
  const upper = raw
    .trim()
    .toUpperCase()
    .replaceAll(/\s+/g, " ")
    .replaceAll("Ă", "A")
    .replaceAll(/â/gi, "A")
    .replaceAll("Î", "I")
    .replaceAll("Ș", "S")
    .replaceAll("Ț", "T");
  return COUNTY_NAME_MAP[upper] ?? upper;
}

/** Returnează CUI normalizat dacă valid (/^\d{2,10}$/), altfel null */
function sanitizeCui(cui: string | null | undefined): string | null {
  if (cui == null) return null;
  const trimmed = cui.trim();
  return /^\d{2,10}$/.test(trimmed) ? trimmed : null;
}

// ---------------------------------------------------------------------------
// Tipuri
// ---------------------------------------------------------------------------

export interface AssociationNormalizeJobData {
  tenantId?: string;
  scope: "OUAI" | "MADR" | "ALL";
  correlationId?: string;
}

export interface AssociationNormalizeResult {
  ok: boolean;
  scope: string;
  ouaiUpdated: number;
  associationsUpdated: number;
  duplicatesDeactivated: number;
}

// ---------------------------------------------------------------------------
// Helpers de normalizare separate (reduc cognitive complexity)
// ---------------------------------------------------------------------------

async function normalizeOuaiRegistry(): Promise<number> {
  const allOuai = await db
    .select({
      id: goldOuaiRegistry.id,
      ouaiName: goldOuaiRegistry.ouaiName,
      county: goldOuaiRegistry.county,
      cui: goldOuaiRegistry.cui,
    })
    .from(goldOuaiRegistry);

  let updated = 0;
  for (const entry of allOuai) {
    const normalizedCounty = normalizeCounty(entry.county);
    const trimmedName = entry.ouaiName.trim();
    const cuiValue = sanitizeCui(entry.cui);

    const changed =
      normalizedCounty !== entry.county || trimmedName !== entry.ouaiName || cuiValue !== entry.cui;

    if (changed) {
      await db
        .update(goldOuaiRegistry)
        .set({
          county: normalizedCounty,
          ouaiName: trimmedName,
          cui: cuiValue,
          updatedAt: new Date(),
        })
        .where(eq(goldOuaiRegistry.id, entry.id));
      updated++;
    }
  }
  return updated;
}

async function normalizeAssociations(tenantId: string): Promise<number> {
  const allAssoc = await db
    .select({
      id: goldAssociations.id,
      name: goldAssociations.name,
      county: goldAssociations.county,
      cui: goldAssociations.cui,
      isActive: goldAssociations.isActive,
      createdAt: goldAssociations.createdAt,
    })
    .from(goldAssociations)
    .where(eq(goldAssociations.tenantId, tenantId));

  let updated = 0;

  for (const entry of allAssoc) {
    const normalizedCounty = entry.county ? normalizeCounty(entry.county) : null;
    const trimmedName = entry.name.trim();
    const cuiValue = sanitizeCui(entry.cui);

    const changed =
      normalizedCounty !== entry.county || trimmedName !== entry.name || cuiValue !== entry.cui;

    if (changed) {
      const setClause: Record<string, unknown> = {
        name: trimmedName,
        cui: cuiValue,
        updatedAt: new Date(),
      };
      if (normalizedCounty !== null) setClause.county = normalizedCounty;

      await db
        .update(goldAssociations)
        .set(setClause)
        .where(and(eq(goldAssociations.id, entry.id), eq(goldAssociations.tenantId, tenantId)));
      updated++;
    }
  }

  return updated;
}

async function deduplicateAssociations(tenantId: string): Promise<number> {
  const allAssoc = await db
    .select({
      id: goldAssociations.id,
      name: goldAssociations.name,
      county: goldAssociations.county,
      isActive: goldAssociations.isActive,
      createdAt: goldAssociations.createdAt,
    })
    .from(goldAssociations)
    .where(and(eq(goldAssociations.tenantId, tenantId), eq(goldAssociations.isActive, true)));

  const seenMap = new Map<string, { id: string; createdAt: Date }>();
  let deactivated = 0;

  for (const entry of allAssoc) {
    const nameNorm = entry.name.trim().toUpperCase();
    const countyNorm = entry.county ? normalizeCounty(entry.county) : "";
    const key = `${nameNorm}|${countyNorm}`;
    const existing = seenMap.get(key);

    if (!existing) {
      seenMap.set(key, { id: entry.id, createdAt: entry.createdAt });
      continue;
    }

    const isNewer = entry.createdAt > existing.createdAt;
    const toDeactivateId = isNewer ? entry.id : existing.id;
    const toKeepEntry = isNewer ? existing : { id: entry.id, createdAt: entry.createdAt };

    await db
      .update(goldAssociations)
      .set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(goldAssociations.id, toDeactivateId), eq(goldAssociations.tenantId, tenantId)));

    deactivated++;
    seenMap.set(key, toKeepEntry);
  }

  return deactivated;
}

// ---------------------------------------------------------------------------
// Worker Factory
// ---------------------------------------------------------------------------

export function createAssociationNormalizeWorker(): Worker {
  const { worker } = createWorker<AssociationNormalizeJobData>(
    QUEUES.E5_ASSOCIATION_NORMALIZE,
    async (job: Job<AssociationNormalizeJobData>): Promise<AssociationNormalizeResult> => {
      return withCognitiveSpan("e5:association:normalize", async () => {
        const { tenantId, scope, correlationId } = job.data;

        job.log(
          `[G39] Starting normalizare scope=${scope}, tenantId=${tenantId ?? "global"}, correlationId=${correlationId ?? "n/a"}`,
        );

        if (tenantId) {
          await setSessionTenantId(tenantId);
        }

        let ouaiUpdated = 0;
        let associationsUpdated = 0;
        let duplicatesDeactivated = 0;

        if (scope === "OUAI" || scope === "ALL") {
          ouaiUpdated = await normalizeOuaiRegistry();
          job.log(`[G39] OUAI: ${ouaiUpdated} înregistrări normalizate`);
        }

        if (scope === "MADR" || scope === "ALL") {
          if (tenantId) {
            associationsUpdated = await normalizeAssociations(tenantId);
            duplicatesDeactivated = await deduplicateAssociations(tenantId);
            job.log(
              `[G39] MADR: ${associationsUpdated} actualizate, ${duplicatesDeactivated} duplicate dezactivate`,
            );
          } else {
            job.log("[G39] scope=MADR/ALL fără tenantId — skip normalizare MADR");
          }
        }

        return { ok: true, scope, ouaiUpdated, associationsUpdated, duplicatesDeactivated };
      });
    },
    {
      connection: { db: 5 },
      concurrency: 5,
    },
  );

  return worker;
}
