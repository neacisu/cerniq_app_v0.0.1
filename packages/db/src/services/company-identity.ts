import { createHash } from "node:crypto";
import { setTimeout as delay } from "node:timers/promises";
import { and, asc, eq, or, sql } from "drizzle-orm";
import { db, setSessionTenantId } from "../client.js";
import { bronzeContacts } from "../schemas/bronze.js";
import { companyIdentityKeys, silverCompanies } from "../schemas/silver.js";

export type BronzeIdentityStatus =
  | "unresolved"
  | "resolved"
  | "duplicate_source"
  | "identity_conflict"
  | "insufficient_identifiers";

export type SilverIdentityStatus = "resolved" | "partial" | "identity_conflict";

export type IdentitySourceAuthority = "import" | "anaf" | "onrc" | "manual" | "migration";

export type IdentityKeyType = "cui" | "nr_reg_com";

type TransactionClient = typeof db;

type IdentityMatch = {
  companyId: string;
  keyType: IdentityKeyType;
  keyValueCanonical: string;
  id: string;
};

type BronzeIdentityContext = {
  bronzeId: string;
  tenantId: string;
  sourcePayloadHash: string;
  extractedName: string | null;
  extractedCuiRaw: string | null;
  extractedCui: string | null;
  extractedNrRegComRaw: string | null;
  extractedNrRegCom: string | null;
  sourceAuthority: IdentitySourceAuthority;
};

export type BronzeIdentityResolutionResult =
  | {
      status: "resolved";
      companyId: string;
      companyIdentityStatus: SilverIdentityStatus;
      duplicateOfId: string | null;
      createdCompanyId: string | null;
      conflictCompanyIds: [];
    }
  | {
      status: "duplicate_source";
      companyId: string | null;
      companyIdentityStatus: SilverIdentityStatus | null;
      duplicateOfId: string;
      createdCompanyId: null;
      conflictCompanyIds: [];
    }
  | {
      status: "insufficient_identifiers";
      companyId: null;
      companyIdentityStatus: null;
      duplicateOfId: string | null;
      createdCompanyId: null;
      conflictCompanyIds: [];
    }
  | {
      status: "identity_conflict";
      companyId: null;
      companyIdentityStatus: "identity_conflict";
      duplicateOfId: string | null;
      createdCompanyId: null;
      conflictCompanyIds: string[];
    };

export type CompanyIdentityUpsertResult =
  | {
      status: "linked";
      companyId: string;
      companyIdentityStatus: SilverIdentityStatus;
      conflictCompanyId: null;
    }
  | {
      status: "conflict";
      companyId: string;
      companyIdentityStatus: "identity_conflict";
      conflictCompanyId: string;
    };

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => stableValue(item));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, entryValue]) => [key, stableValue(entryValue)]),
    );
  }
  if (typeof value === "string") {
    return value.trim().replaceAll(/\s+/g, " ");
  }
  return value;
}

export function computeStableSourcePayloadHash(payload: Record<string, unknown>): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(payload)))
    .digest("hex");
}

function readObject(input: unknown): Record<string, unknown> {
  return input && typeof input === "object" ? (input as Record<string, unknown>) : {};
}

function isRetriableTransactionError(error: unknown): boolean {
  const code =
    error && typeof error === "object" && "code" in error
      ? String((error as { code?: unknown }).code ?? "")
      : "";
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return (
    code === "40001" ||
    code === "40P01" ||
    message.includes("could not serialize access") ||
    message.includes("deadlock detected")
  );
}

async function beginTenantTransaction<T>(
  tenantId: string,
  fn: (tx: TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 5;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      await setSessionTenantId(tenantId);
      return await db.transaction(async (tx) => {
        await tx.execute(sql`SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`);
        await tx.execute(sql`SELECT set_config('app.tenant_id', ${tenantId}, true)`);
        return fn(tx as TransactionClient);
      });
    } catch (error) {
      if (!isRetriableTransactionError(error) || attempt === maxAttempts) {
        throw error;
      }

      const backoffMs = Math.min(50 * 2 ** (attempt - 1), 500);
      await delay(backoffMs);
    }
  }

  throw new Error("Unreachable transaction retry state");
}

async function acquireIdentityLocks(
  tx: TransactionClient,
  tenantId: string,
  keys: Array<{ keyType: IdentityKeyType; keyValueCanonical: string }>,
) {
  const uniqueKeys = Array.from(
    new Set(
      keys
        .filter((key) => key.keyValueCanonical)
        .map((key) => `${tenantId}:${key.keyType}:${key.keyValueCanonical}`),
    ),
  ).sort((left, right) => left.localeCompare(right));

  for (const lockKey of uniqueKeys) {
    await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`);
  }
}

async function findSourceDuplicate(
  tx: TransactionClient,
  args: { tenantId: string; bronzeId: string; sourcePayloadHash: string },
) {
  return tx.query.bronzeContacts.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.tenantId, args.tenantId),
        eq(t.sourcePayloadHash, args.sourcePayloadHash),
        sql`${t.id} <> ${args.bronzeId}`,
      ),
    orderBy: (t) => [asc(t.createdAt)],
  });
}

async function findIdentityMatches(
  tx: TransactionClient,
  tenantId: string,
  args: { cui: string | null; nrRegCom: string | null },
): Promise<IdentityMatch[]> {
  if (!args.cui && !args.nrRegCom) return [];
  const matches = await tx.query.companyIdentityKeys.findMany({
    where: (t) =>
      and(
        eq(t.tenantId, tenantId),
        sql`${t.revokedAt} IS NULL`,
        or(
          args.cui ? and(eq(t.keyType, "cui"), eq(t.keyValueCanonical, args.cui)) : sql`FALSE`,
          args.nrRegCom
            ? and(eq(t.keyType, "nr_reg_com"), eq(t.keyValueCanonical, args.nrRegCom))
            : sql`FALSE`,
        ),
      ),
  });

  return matches.map((match) => ({
    companyId: match.companyId,
    keyType: match.keyType,
    keyValueCanonical: match.keyValueCanonical,
    id: match.id,
  }));
}

async function findLegacySilverCompanyMatches(
  tx: TransactionClient,
  tenantId: string,
  args: { cui: string | null; nrRegCom: string | null },
): Promise<string[]> {
  if (!args.cui && !args.nrRegCom) return [];

  const matches = await tx.query.silverCompanies.findMany({
    where: (t) =>
      and(
        eq(t.tenantId, tenantId),
        or(
          args.cui ? eq(t.cui, args.cui) : sql`FALSE`,
          args.nrRegCom ? eq(t.nrRegCom, args.nrRegCom) : sql`FALSE`,
        ),
      ),
    columns: { id: true },
  });

  return Array.from(new Set(matches.map((match) => match.id)));
}

function deriveSilverIdentityStatus(args: {
  cui: string | null;
  nrRegCom: string | null;
  forcedStatus?: SilverIdentityStatus;
}): SilverIdentityStatus {
  if (args.forcedStatus) return args.forcedStatus;
  return args.cui && args.nrRegCom ? "resolved" : "partial";
}

async function updateCompanyIdentitySnapshot(
  tx: TransactionClient,
  args: {
    companyId: string;
    tenantId: string;
    cui?: string | null;
    nrRegCom?: string | null;
    nrRegComOriginal?: string | null;
    sourceBronzeId?: string | null;
    identityStatus: SilverIdentityStatus;
    identityPatch: Record<string, unknown>;
  },
) {
  const company = await tx.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, args.tenantId), eq(t.id, args.companyId)),
  });
  if (!company) return;

  const mergedIdentityMetadata = {
    ...readObject(company.identityMetadata),
    ...args.identityPatch,
  };

  const nextCui = args.cui ?? company.cui ?? null;
  const nextNrRegCom = args.nrRegCom ?? company.nrRegCom ?? null;
  const nextStatus = deriveSilverIdentityStatus({
    cui: nextCui,
    nrRegCom: nextNrRegCom,
    forcedStatus: args.identityStatus,
  });

  await tx
    .update(silverCompanies)
    .set({
      cui: nextCui ?? undefined,
      nrRegCom: nextNrRegCom ?? undefined,
      nrRegComOriginal: args.nrRegComOriginal ?? company.nrRegComOriginal ?? undefined,
      identityStatus: nextStatus,
      identityMetadata: mergedIdentityMetadata,
      sourceBronzeId: args.sourceBronzeId ?? company.sourceBronzeId ?? undefined,
    })
    .where(sql`${silverCompanies.id} = ${args.companyId}`);
}

async function createPlaceholderCompany(
  tx: TransactionClient,
  args: {
    tenantId: string;
    bronzeId: string;
    name: string | null;
    cui: string | null;
    nrRegCom: string | null;
    nrRegComOriginal: string | null;
  },
) {
  const identityStatus = deriveSilverIdentityStatus({
    cui: args.cui,
    nrRegCom: args.nrRegCom,
  });
  const inserted = await tx
    .insert(silverCompanies)
    .values({
      tenantId: args.tenantId,
      sourceBronzeId: args.bronzeId,
      denumire: args.name ?? undefined,
      cui: args.cui ?? undefined,
      nrRegCom: args.nrRegCom ?? undefined,
      nrRegComOriginal: args.nrRegComOriginal ?? undefined,
      identityStatus,
      identityMetadata: {
        createdFrom: "bronze_ingest",
        createdFromBronzeId: args.bronzeId,
      },
      enrichmentStatus: "pending",
      promotionStatus: "blocked",
    })
    .returning({ id: silverCompanies.id, identityStatus: silverCompanies.identityStatus });

  return inserted[0] ?? null;
}

async function insertIdentityKey(
  tx: TransactionClient,
  args: {
    tenantId: string;
    companyId: string;
    keyType: IdentityKeyType;
    keyValueCanonical: string;
    keyValueOriginal: string | null;
    sourceAuthority: IdentitySourceAuthority;
    isAuthoritative: boolean;
    sourceBronzeId?: string | null;
  },
) {
  if (!args.keyValueCanonical) return;
  const existing = await tx.query.companyIdentityKeys.findFirst({
    where: (t, { and, eq }) =>
      and(
        eq(t.tenantId, args.tenantId),
        eq(t.keyType, args.keyType),
        eq(t.keyValueCanonical, args.keyValueCanonical),
        sql`${t.revokedAt} IS NULL`,
      ),
  });

  if (existing) {
    if (existing.companyId !== args.companyId) {
      throw new Error(
        `identity_conflict:${existing.companyId}:${args.keyType}:${args.keyValueCanonical}`,
      );
    }
    await tx
      .update(companyIdentityKeys)
      .set({
        keyValueOriginal: args.keyValueOriginal ?? existing.keyValueOriginal ?? undefined,
        isAuthoritative: args.isAuthoritative || existing.isAuthoritative,
        sourceAuthority: args.isAuthoritative ? args.sourceAuthority : existing.sourceAuthority,
        sourceBronzeId: args.sourceBronzeId ?? existing.sourceBronzeId ?? undefined,
      })
      .where(sql`${companyIdentityKeys.id} = ${existing.id}`);
    return existing.id;
  }

  const inserted = await tx
    .insert(companyIdentityKeys)
    .values({
      tenantId: args.tenantId,
      companyId: args.companyId,
      keyType: args.keyType,
      keyValueCanonical: args.keyValueCanonical,
      keyValueOriginal: args.keyValueOriginal ?? undefined,
      sourceAuthority: args.sourceAuthority,
      isAuthoritative: args.isAuthoritative,
      sourceBronzeId: args.sourceBronzeId ?? undefined,
    })
    .returning({ id: companyIdentityKeys.id });

  return inserted[0]?.id ?? null;
}

async function updateBronzeResolution(
  tx: TransactionClient,
  args: {
    bronzeId: string;
    identityStatus: BronzeIdentityStatus;
    resolvedCompanyId?: string | null;
    duplicateOfId?: string | null;
    isDuplicate?: boolean;
    doNotProcess?: boolean;
    processingStatus?: "pending" | "processing" | "promoted" | "rejected" | "error";
    patch: Record<string, unknown>;
  },
) {
  await tx
    .update(bronzeContacts)
    .set({
      identityStatus: args.identityStatus,
      resolvedCompanyId: args.resolvedCompanyId ?? null,
      duplicateOfId: args.duplicateOfId ?? null,
      isDuplicate: args.isDuplicate ?? false,
      doNotProcess: args.doNotProcess ?? false,
      processingStatus: args.processingStatus ?? "pending",
      identityResolutionMetadata: args.patch,
    })
    .where(sql`${bronzeContacts.id} = ${args.bronzeId}`);
}

function getContextIdentityLocks(context: BronzeIdentityContext) {
  const keys: Array<{ keyType: IdentityKeyType; keyValueCanonical: string }> = [];
  if (context.extractedCui) {
    keys.push({ keyType: "cui", keyValueCanonical: context.extractedCui });
  }
  if (context.extractedNrRegCom) {
    keys.push({ keyType: "nr_reg_com", keyValueCanonical: context.extractedNrRegCom });
  }
  return keys;
}

async function markDuplicateSourceBronze(
  tx: TransactionClient,
  context: BronzeIdentityContext,
  duplicate: typeof bronzeContacts.$inferSelect,
): Promise<BronzeIdentityResolutionResult> {
  const duplicateCompanyId = duplicate.resolvedCompanyId ?? null;
  await updateBronzeResolution(tx, {
    bronzeId: context.bronzeId,
    identityStatus: "duplicate_source",
    resolvedCompanyId: duplicateCompanyId,
    duplicateOfId: duplicate.id,
    isDuplicate: true,
    doNotProcess: true,
    processingStatus: "rejected",
    patch: {
      resolution: "duplicate_source",
      duplicateOfId: duplicate.id,
      sourcePayloadHash: context.sourcePayloadHash,
    },
  });
  return {
    status: "duplicate_source",
    companyId: duplicateCompanyId,
    companyIdentityStatus: null,
    duplicateOfId: duplicate.id,
    createdCompanyId: null,
    conflictCompanyIds: [],
  };
}

async function markInsufficientIdentityBronze(
  tx: TransactionClient,
  context: BronzeIdentityContext,
): Promise<BronzeIdentityResolutionResult> {
  await updateBronzeResolution(tx, {
    bronzeId: context.bronzeId,
    identityStatus: "insufficient_identifiers",
    doNotProcess: true,
    processingStatus: "rejected",
    patch: {
      resolution: "insufficient_identifiers",
      extractedCui: null,
      extractedNrRegCom: null,
    },
  });
  return {
    status: "insufficient_identifiers",
    companyId: null,
    companyIdentityStatus: null,
    duplicateOfId: null,
    createdCompanyId: null,
    conflictCompanyIds: [],
  };
}

async function markIdentityConflictBronze(
  tx: TransactionClient,
  context: BronzeIdentityContext,
  patch: Record<string, unknown>,
  conflictCompanyIds: string[],
): Promise<BronzeIdentityResolutionResult> {
  await updateBronzeResolution(tx, {
    bronzeId: context.bronzeId,
    identityStatus: "identity_conflict",
    doNotProcess: true,
    processingStatus: "rejected",
    patch: {
      resolution: "identity_conflict",
      ...patch,
    },
  });
  return {
    status: "identity_conflict",
    companyId: null,
    companyIdentityStatus: "identity_conflict",
    duplicateOfId: null,
    createdCompanyId: null,
    conflictCompanyIds,
  };
}

async function ensureResolvedCompany(
  tx: TransactionClient,
  args: {
    tenantId: string;
    context: BronzeIdentityContext;
    existingCompanyId: string | null;
  },
) {
  if (args.existingCompanyId) {
    return { companyId: args.existingCompanyId, createdCompanyId: null as string | null };
  }

  const placeholder = await createPlaceholderCompany(tx, {
    tenantId: args.tenantId,
    bronzeId: args.context.bronzeId,
    name: args.context.extractedName,
    cui: args.context.extractedCui,
    nrRegCom: args.context.extractedNrRegCom,
    nrRegComOriginal: args.context.extractedNrRegComRaw,
  });
  if (!placeholder) {
    throw new Error("Failed to create placeholder company");
  }

  return { companyId: placeholder.id, createdCompanyId: placeholder.id };
}

function parseConflictCompanyIds(companyId: string, errorMessage: string): string[] {
  const conflictCompanyId = errorMessage.split(":")[1] ?? null;
  return Array.from(new Set([companyId, conflictCompanyId].filter(Boolean)));
}

/**
 * Auto-merges a secondary Silver company into a primary one.
 * Used when two incomplete Silver records (one with CUI, one with NrRegCom) are found
 * for the same real-world company due to a past data quality issue.
 * The CUI-based company is kept as primary; the secondary is archived.
 */
async function autoMergeSplitCompanies(
  tx: TransactionClient,
  tenantId: string,
  primaryCompanyId: string,
  secondaryCompanyId: string,
): Promise<void> {
  const [primary, secondary] = await Promise.all([
    tx.query.silverCompanies.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, primaryCompanyId)),
    }),
    tx.query.silverCompanies.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, tenantId), eq(t.id, secondaryCompanyId)),
    }),
  ]);
  if (!primary || !secondary) return;

  // Transfer all active identity keys from secondary → primary
  const secondaryKeys = await tx.query.companyIdentityKeys.findMany({
    where: (t, { and, eq }) =>
      and(
        eq(t.tenantId, tenantId),
        eq(t.companyId, secondaryCompanyId),
        sql`${t.revokedAt} IS NULL`,
      ),
  });
  for (const key of secondaryKeys) {
    await tx
      .update(companyIdentityKeys)
      .set({ revokedAt: sql`NOW()` })
      .where(sql`${companyIdentityKeys.id} = ${key.id}`);
    await insertIdentityKey(tx, {
      tenantId,
      companyId: primaryCompanyId,
      keyType: key.keyType as IdentityKeyType,
      keyValueCanonical: key.keyValueCanonical,
      keyValueOriginal: key.keyValueOriginal ?? null,
      sourceAuthority: key.sourceAuthority as IdentitySourceAuthority,
      isAuthoritative: key.isAuthoritative,
      sourceBronzeId: key.sourceBronzeId ?? null,
    });
  }

  // Merge non-null fields from secondary into primary.
  // IMPORTANT: Archive secondary FIRST to free the unique columns (cui, nr_reg_com)
  // before copying them onto primary — otherwise the unique constraint fires.
  const mergedAt = new Date().toISOString();
  await tx
    .update(silverCompanies)
    .set({
      promotionStatus: "blocked",
      cui: null,
      nrRegCom: null,
      identityMetadata: sql`COALESCE(${silverCompanies.identityMetadata}, '{}'::jsonb) || ${JSON.stringify({ mergedInto: primaryCompanyId, mergedAt, autoMerged: true })}::jsonb`,
    })
    .where(sql`${silverCompanies.id} = ${secondaryCompanyId}`);

  await tx
    .update(silverCompanies)
    .set({
      nrRegCom: primary.nrRegCom ?? secondary.nrRegCom ?? undefined,
      nrRegComOriginal: primary.nrRegComOriginal ?? secondary.nrRegComOriginal ?? undefined,
      denumire: primary.denumire ?? secondary.denumire ?? undefined,
      identityMetadata: sql`COALESCE(${silverCompanies.identityMetadata}, '{}'::jsonb) || ${JSON.stringify({ mergedFrom: secondaryCompanyId, mergedAt, autoMerged: true })}::jsonb`,
    })
    .where(sql`${silverCompanies.id} = ${primaryCompanyId}`);

  // Re-point all bronze contacts that referenced secondary → primary
  await tx
    .update(bronzeContacts)
    .set({ resolvedCompanyId: primaryCompanyId })
    .where(
      and(
        eq(bronzeContacts.tenantId, tenantId),
        eq(bronzeContacts.resolvedCompanyId, secondaryCompanyId),
      ),
    );
  await tx
    .update(bronzeContacts)
    .set({ promotedToSilverId: primaryCompanyId })
    .where(
      and(
        eq(bronzeContacts.tenantId, tenantId),
        eq(bronzeContacts.promotedToSilverId, secondaryCompanyId),
      ),
    );
}

/**
 * Detects a "split company" scenario from identity-registry matches and auto-merges.
 * Returns the primary company ID if a split was detected and merged, null otherwise.
 */
async function tryAutoMergeFromRegistryMatches(
  tx: TransactionClient,
  tenantId: string,
  matches: IdentityMatch[],
  extractedCui: string | null,
  extractedNrRegCom: string | null,
): Promise<string | null> {
  if (!extractedCui || !extractedNrRegCom || matches.length !== 2) return null;
  const cuiMatch = matches.find((m) => m.keyType === "cui" && m.keyValueCanonical === extractedCui);
  const nrMatch = matches.find(
    (m) => m.keyType === "nr_reg_com" && m.keyValueCanonical === extractedNrRegCom,
  );
  if (!cuiMatch || !nrMatch || cuiMatch.companyId === nrMatch.companyId) return null;
  await autoMergeSplitCompanies(tx, tenantId, cuiMatch.companyId, nrMatch.companyId);
  return cuiMatch.companyId;
}

/**
 * Same as tryAutoMergeFromRegistryMatches but for legacy (direct-field) matches.
 */
async function tryAutoMergeFromLegacyMatches(
  tx: TransactionClient,
  tenantId: string,
  legacyCompanyIds: string[],
  extractedCui: string | null,
  extractedNrRegCom: string | null,
): Promise<string | null> {
  if (!extractedCui || !extractedNrRegCom || legacyCompanyIds.length !== 2) return null;
  const companies = await tx.query.silverCompanies.findMany({
    where: (t, { and, eq, or }) =>
      and(
        eq(t.tenantId, tenantId),
        or(eq(t.id, legacyCompanyIds[0]), eq(t.id, legacyCompanyIds[1])), // length already checked above
      ),
    columns: { id: true, cui: true, nrRegCom: true },
  });
  const cuiCompany = companies.find((c) => c.cui === extractedCui);
  const nrCompany = companies.find((c) => c.nrRegCom === extractedNrRegCom);
  if (!cuiCompany || !nrCompany || cuiCompany.id === nrCompany.id) return null;
  await autoMergeSplitCompanies(tx, tenantId, cuiCompany.id, nrCompany.id);
  return cuiCompany.id;
}

/**
 * When the registry returned exactly one match (e.g. via CUI) but the NrRegCom from the
 * Bronze contact already lives on a *different* Silver company (its registry key may have
 * been revoked), we must merge those two split-companies before writing the identity
 * snapshot, otherwise the unique constraint on silver_companies.nr_reg_com would fire.
 *
 * Returns the primary (CUI) company id on success, null if no conflict was found, or a
 * conflict result if the merge could not be resolved.
 */
async function tryAutoMergeNrRegComConflict(
  tx: TransactionClient,
  tenantId: string,
  registryCompanyId: string,
  context: BronzeIdentityContext,
  matches: Awaited<ReturnType<typeof findIdentityMatches>>,
): Promise<DetectCompanyResult | null> {
  const { extractedCui, extractedNrRegCom } = context;
  if (!extractedCui || !extractedNrRegCom) return null;

  const nrRegComLegacy = await findLegacySilverCompanyMatches(tx, tenantId, {
    cui: null,
    nrRegCom: extractedNrRegCom,
  });
  const conflictingId = nrRegComLegacy.find((id) => id !== registryCompanyId);
  if (!conflictingId) return null;

  const mergedId = await tryAutoMergeFromLegacyMatches(
    tx,
    tenantId,
    [registryCompanyId, conflictingId],
    extractedCui,
    extractedNrRegCom,
  );
  if (mergedId) return { ok: true, companyId: mergedId };

  const conflictCompanyIds = [registryCompanyId, conflictingId];
  const result = await markIdentityConflictBronze(
    tx,
    context,
    {
      companyIds: conflictCompanyIds,
      matchedKeys: matches,
      resolution: "legacy_silver_match_conflict",
    },
    conflictCompanyIds,
  );
  return { ok: false, result };
}

async function upsertContextIdentityKeys(
  tx: TransactionClient,
  context: BronzeIdentityContext,
  companyId: string,
) {
  if (context.extractedCui) {
    await insertIdentityKey(tx, {
      tenantId: context.tenantId,
      companyId,
      keyType: "cui",
      keyValueCanonical: context.extractedCui,
      keyValueOriginal: context.extractedCuiRaw,
      sourceAuthority: context.sourceAuthority,
      isAuthoritative: context.sourceAuthority === "anaf",
      sourceBronzeId: context.bronzeId,
    });
  }

  if (context.extractedNrRegCom) {
    await insertIdentityKey(tx, {
      tenantId: context.tenantId,
      companyId,
      keyType: "nr_reg_com",
      keyValueCanonical: context.extractedNrRegCom,
      keyValueOriginal: context.extractedNrRegComRaw,
      sourceAuthority: context.sourceAuthority,
      isAuthoritative: context.sourceAuthority === "onrc",
      sourceBronzeId: context.bronzeId,
    });
  }
}

type DetectCompanyResult =
  | { ok: false; result: BronzeIdentityResolutionResult }
  | { ok: true; companyId: string | null };

async function detectSingleCompanyId(
  tx: TransactionClient,
  tenantId: string,
  context: BronzeIdentityContext,
  bronze: typeof bronzeContacts.$inferSelect,
): Promise<DetectCompanyResult> {
  const matches = await findIdentityMatches(tx, tenantId, {
    cui: context.extractedCui,
    nrRegCom: context.extractedNrRegCom,
  });
  const distinctRegistryIds = Array.from(new Set(matches.map((m) => m.companyId)));

  if (distinctRegistryIds.length > 1) {
    const mergedId = await tryAutoMergeFromRegistryMatches(
      tx,
      tenantId,
      matches,
      context.extractedCui,
      context.extractedNrRegCom,
    );
    if (!mergedId) {
      const result = await markIdentityConflictBronze(
        tx,
        context,
        { companyIds: distinctRegistryIds, matchedKeys: matches },
        distinctRegistryIds,
      );
      return { ok: false, result };
    }
    return { ok: true, companyId: mergedId };
  }

  const legacyIds =
    distinctRegistryIds.length === 0
      ? await findLegacySilverCompanyMatches(tx, tenantId, {
          cui: context.extractedCui,
          nrRegCom: context.extractedNrRegCom,
        })
      : [];

  if (legacyIds.length > 1) {
    const mergedId = await tryAutoMergeFromLegacyMatches(
      tx,
      tenantId,
      legacyIds,
      context.extractedCui,
      context.extractedNrRegCom,
    );
    if (!mergedId) {
      const result = await markIdentityConflictBronze(
        tx,
        context,
        { companyIds: legacyIds, matchedKeys: matches, resolution: "legacy_silver_match_conflict" },
        legacyIds,
      );
      return { ok: false, result };
    }
    return { ok: true, companyId: mergedId };
  }

  // When exactly 1 registry match is found (e.g. via CUI) but we also have an NrRegCom,
  // check if a *different* Silver company already directly holds that NrRegCom.
  if (distinctRegistryIds.length === 1) {
    const mergeResult = await tryAutoMergeNrRegComConflict(
      tx,
      tenantId,
      distinctRegistryIds[0],
      context,
      matches,
    );
    if (mergeResult) return mergeResult;
  }

  return {
    ok: true,
    companyId:
      distinctRegistryIds[0] ??
      legacyIds[0] ??
      bronze.resolvedCompanyId ??
      bronze.promotedToSilverId ??
      null,
  };
}

async function finalizeNormalResolution(
  tx: TransactionClient,
  tenantId: string,
  context: BronzeIdentityContext,
  existingCompanyId: string | null,
): Promise<BronzeIdentityResolutionResult> {
  const { companyId, createdCompanyId } = await ensureResolvedCompany(tx, {
    tenantId,
    context,
    existingCompanyId,
  });

  try {
    await upsertContextIdentityKeys(tx, context, companyId);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith("identity_conflict:")) {
      throw error;
    }
    const conflictIds = parseConflictCompanyIds(companyId, error.message);
    const conflictResult = await markIdentityConflictBronze(
      tx,
      context,
      { companyIds: conflictIds, conflictMessage: error.message },
      conflictIds,
    );
    if (companyId) {
      await updateCompanyIdentitySnapshot(tx, {
        companyId,
        tenantId,
        identityStatus: "identity_conflict",
        identityPatch: {
          lastIdentityConflictAt: new Date().toISOString(),
          latestConflictMessage: error.message,
        },
      });
    }
    return conflictResult;
  }

  const companyIdentityStatus = deriveSilverIdentityStatus({
    cui: context.extractedCui,
    nrRegCom: context.extractedNrRegCom,
  });
  await updateCompanyIdentitySnapshot(tx, {
    companyId,
    tenantId,
    cui: context.extractedCui,
    nrRegCom: context.extractedNrRegCom,
    nrRegComOriginal: context.extractedNrRegComRaw,
    sourceBronzeId: context.bronzeId,
    identityStatus: companyIdentityStatus,
    identityPatch: {
      lastResolvedBronzeId: context.bronzeId,
      lastResolvedAt: new Date().toISOString(),
      sourceAuthority: context.sourceAuthority,
    },
  });
  await updateBronzeResolution(tx, {
    bronzeId: context.bronzeId,
    identityStatus: "resolved",
    resolvedCompanyId: companyId,
    processingStatus: "pending",
    patch: { resolution: "resolved", companyId, sourceAuthority: context.sourceAuthority },
  });
  return {
    status: "resolved",
    companyId,
    companyIdentityStatus,
    duplicateOfId: null,
    createdCompanyId,
    conflictCompanyIds: [],
  };
}

export async function resolveBronzeContactIdentity(args: {
  tenantId: string;
  bronzeContactId: string;
  sourceAuthority?: IdentitySourceAuthority;
}): Promise<BronzeIdentityResolutionResult> {
  return beginTenantTransaction(args.tenantId, async (tx) => {
    const bronze = await tx.query.bronzeContacts.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, args.tenantId), eq(t.id, args.bronzeContactId)),
    });
    if (!bronze) {
      throw new Error(`Bronze contact not found: ${args.bronzeContactId}`);
    }

    const context: BronzeIdentityContext = {
      bronzeId: bronze.id,
      tenantId: bronze.tenantId,
      sourcePayloadHash: bronze.sourcePayloadHash,
      extractedName: bronze.extractedName ?? null,
      extractedCuiRaw: bronze.extractedCuiRaw ?? null,
      extractedCui: bronze.extractedCui ?? null,
      extractedNrRegComRaw: bronze.extractedNrRegComRaw ?? null,
      extractedNrRegCom: bronze.extractedNrRegCom ?? null,
      sourceAuthority: args.sourceAuthority ?? "import",
    };

    await acquireIdentityLocks(tx, args.tenantId, getContextIdentityLocks(context));

    const duplicate = await findSourceDuplicate(tx, {
      tenantId: args.tenantId,
      bronzeId: context.bronzeId,
      sourcePayloadHash: context.sourcePayloadHash,
    });
    if (duplicate) return markDuplicateSourceBronze(tx, context, duplicate);

    if (!context.extractedCui && !context.extractedNrRegCom) {
      return markInsufficientIdentityBronze(tx, context);
    }

    const detected = await detectSingleCompanyId(tx, args.tenantId, context, bronze);
    if (!detected.ok) return detected.result;

    return finalizeNormalResolution(tx, args.tenantId, context, detected.companyId);
  });
}

export async function upsertCompanyIdentityKey(args: {
  tenantId: string;
  companyId: string;
  keyType: IdentityKeyType;
  keyValueCanonical: string;
  keyValueOriginal?: string | null;
  sourceAuthority: IdentitySourceAuthority;
  isAuthoritative?: boolean;
  sourceBronzeId?: string | null;
}): Promise<CompanyIdentityUpsertResult> {
  return beginTenantTransaction(args.tenantId, async (tx) => {
    await acquireIdentityLocks(tx, args.tenantId, [
      { keyType: args.keyType, keyValueCanonical: args.keyValueCanonical },
    ]);

    const existing = await tx.query.companyIdentityKeys.findFirst({
      where: (t, { and, eq }) =>
        and(
          eq(t.tenantId, args.tenantId),
          eq(t.keyType, args.keyType),
          eq(t.keyValueCanonical, args.keyValueCanonical),
          sql`${t.revokedAt} IS NULL`,
        ),
    });

    if (existing && existing.companyId !== args.companyId) {
      await updateCompanyIdentitySnapshot(tx, {
        companyId: args.companyId,
        tenantId: args.tenantId,
        identityStatus: "identity_conflict",
        identityPatch: {
          lastIdentityConflictAt: new Date().toISOString(),
          conflictingKeyType: args.keyType,
          conflictingKeyValue: args.keyValueCanonical,
          conflictingCompanyId: existing.companyId,
          sourceAuthority: args.sourceAuthority,
        },
      });
      if (args.sourceBronzeId) {
        await updateBronzeResolution(tx, {
          bronzeId: args.sourceBronzeId,
          identityStatus: "identity_conflict",
          doNotProcess: true,
          processingStatus: "rejected",
          patch: {
            resolution: "identity_conflict",
            companyIds: [args.companyId, existing.companyId],
            keyType: args.keyType,
            keyValueCanonical: args.keyValueCanonical,
            sourceAuthority: args.sourceAuthority,
          },
        });
      }
      return {
        status: "conflict",
        companyId: args.companyId,
        companyIdentityStatus: "identity_conflict",
        conflictCompanyId: existing.companyId,
      };
    }

    await insertIdentityKey(tx, {
      tenantId: args.tenantId,
      companyId: args.companyId,
      keyType: args.keyType,
      keyValueCanonical: args.keyValueCanonical,
      keyValueOriginal: args.keyValueOriginal ?? null,
      sourceAuthority: args.sourceAuthority,
      isAuthoritative: Boolean(args.isAuthoritative),
      sourceBronzeId: args.sourceBronzeId,
    });

    const company = await tx.query.silverCompanies.findFirst({
      where: (t, { and, eq }) => and(eq(t.tenantId, args.tenantId), eq(t.id, args.companyId)),
    });
    const nextCui = args.keyType === "cui" ? args.keyValueCanonical : (company?.cui ?? null);
    const nextNrRegCom =
      args.keyType === "nr_reg_com" ? args.keyValueCanonical : (company?.nrRegCom ?? null);
    const nextStatus = deriveSilverIdentityStatus({
      cui: nextCui,
      nrRegCom: nextNrRegCom,
    });

    await updateCompanyIdentitySnapshot(tx, {
      companyId: args.companyId,
      tenantId: args.tenantId,
      cui: args.keyType === "cui" ? args.keyValueCanonical : undefined,
      nrRegCom: args.keyType === "nr_reg_com" ? args.keyValueCanonical : undefined,
      nrRegComOriginal: args.keyType === "nr_reg_com" ? (args.keyValueOriginal ?? null) : undefined,
      sourceBronzeId: args.sourceBronzeId,
      identityStatus: nextStatus,
      identityPatch: {
        lastIdentityUpsertAt: new Date().toISOString(),
        lastIdentityKeyType: args.keyType,
        sourceAuthority: args.sourceAuthority,
      },
    });

    return {
      status: "linked",
      companyId: args.companyId,
      companyIdentityStatus: nextStatus,
      conflictCompanyId: null,
    };
  });
}
