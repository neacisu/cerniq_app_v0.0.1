/**
 * GDPR — consimțământ cookie (audit) și drept la ștergere Art. 17 (admin).
 * Prefix înregistrat: `/api/v1/gdpr`
 */
import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  sql,
  eq,
  and,
  inArray,
  goldCompanies,
  goldContacts,
  goldOrders,
  goldContracts,
  bronzeContacts,
  silverContacts,
  dataMutations,
  gdprConsentLog,
  gdprErasureLog,
} from "@cerniq/db";
import { requireRole } from "../middleware/authz.js";
import { requireTenantId } from "./utils.js";

const consentBodySchema = z.object({
  tenantId: z.uuid().optional().nullable(),
  userId: z.uuid().optional().nullable(),
  consentCategories: z.object({
    necessary: z.literal(true),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
  timestamp: z.string().optional(),
});

const erasureBodySchema = z.object({
  subjectType: z.enum(["company", "contact"]),
  subjectId: z.uuid(),
  reason: z.string().min(1).max(4000),
});

function hashIp(ip: string): string {
  const salt = process.env.GDPR_IP_HASH_SALT ?? "cerniq-gdpr-audit-v1";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

function jwtCtx(req: FastifyRequest): { userId?: string; tenantId?: string } {
  const u = req.user as
    | { sub?: string; userId?: string; tenantId?: string; tenant_id?: string }
    | undefined;
  if (!u) return {};
  const tenantId = u.tenantId ?? u.tenant_id;
  const userId = u.userId ?? u.sub;
  return {
    userId: typeof userId === "string" ? userId : undefined,
    tenantId: typeof tenantId === "string" ? tenantId : undefined,
  };
}

function requestedByUserId(req: FastifyRequest): string | undefined {
  const u = req.user;
  if (u === null || u === undefined || typeof u !== "object") return undefined;
  const rec = u as Record<string, unknown>;
  if (typeof rec.userId === "string") return rec.userId;
  if (typeof rec.sub === "string") return rec.sub;
  return undefined;
}

function erasureTenantKey(req: FastifyRequest): string {
  const u = req.user as { tenantId?: string; tenant_id?: string } | undefined;
  const t = u?.tenantId ?? u?.tenant_id;
  return t ? `gdpr-erasure:${t}` : `gdpr-erasure:ip:${req.ip}`;
}

export async function gdprRoutes(app: FastifyInstance) {
  const consentLimiter = app.rateLimit({ max: 120, timeWindow: "1 minute" });
  /** Minim 4–5 cereri legitime / tenant / min în fluxuri admin (403/404 +ștergeri); max:1 bloca testele și retry-uri UI. */
  const erasureLimiter = app.rateLimit({
    max: 30,
    timeWindow: "1 minute",
    keyGenerator: (req) => erasureTenantKey(req),
  });

  app.post("/consent-log", { onRequest: [consentLimiter] }, async (req, reply) => {
    const parsed = consentBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ success: false, error: "Invalid body", details: parsed.error.issues });
    }
    const body = parsed.data;
    const ctx = jwtCtx(req);
    const tenantId = body.tenantId ?? ctx.tenantId ?? null;
    const userId = body.userId ?? ctx.userId ?? null;
    if (tenantId && ctx.tenantId && tenantId !== ctx.tenantId) {
      return reply.code(403).send({ success: false, error: "tenantId mismatch" });
    }
    const ip = req.ip ?? "";
    const ipHash = hashIp(ip);
    const clientTs = body.timestamp ? new Date(body.timestamp) : null;
    if (clientTs && Number.isNaN(clientTs.getTime())) {
      return reply.code(400).send({ success: false, error: "Invalid timestamp" });
    }

    await db.insert(gdprConsentLog).values({
      tenantId: tenantId ?? undefined,
      userId: userId ?? undefined,
      consentCategories: body.consentCategories,
      clientTimestamp: clientTs ?? undefined,
      ipHash,
    });

    return reply.send({
      success: true,
      data: { recorded: true },
    });
  });

  const adminAuth = {
    onRequest: [
      async (req: FastifyRequest) => req.jwtVerify(),
      requireRole("admin", "owner", "superadmin"),
      erasureLimiter,
    ],
  };

  app.post("/erasure", adminAuth, async (req, reply) => {
    const parsed = erasureBodySchema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ success: false, error: "Invalid body", details: parsed.error.issues });
    }
    const tenantId = requireTenantId(req);
    const { subjectType, subjectId, reason } = parsed.data;
    const requestedBy = requestedByUserId(req);

    if (subjectType === "contact") {
      const [contact] = await db
        .select({ id: goldContacts.id })
        .from(goldContacts)
        .where(and(eq(goldContacts.id, subjectId), eq(goldContacts.tenantId, tenantId)))
        .limit(1);
      if (!contact) {
        return reply.code(404).send({ success: false, error: "Contact not found" });
      }

      const affected: { table: string; rows: number }[] = [];
      const muRows = await db
        .update(dataMutations)
        .set({
          beforeData: sql`'{"_redacted":true}'::jsonb`,
          afterData: sql`'{"_redacted":true}'::jsonb`,
        })
        .where(and(eq(dataMutations.tenantId, tenantId), eq(dataMutations.entityId, subjectId)))
        .returning({ id: dataMutations.id });
      affected.push({ table: "bronze.data_mutations", rows: muRows.length });

      const delRows = await db
        .delete(goldContacts)
        .where(eq(goldContacts.id, subjectId))
        .returning({ id: goldContacts.id });
      affected.push({ table: "gold.gold_contacts", rows: delRows.length });

      await db.insert(gdprErasureLog).values({
        tenantId,
        subjectType: "contact",
        subjectId,
        requestedBy,
        reason,
        affectedTables: affected,
        rowsDeleted: affected.reduce((s, x) => s + x.rows, 0),
      });

      return reply.send({ success: true, data: { subjectType, subjectId, affected } });
    }

    const [company] = await db
      .select()
      .from(goldCompanies)
      .where(and(eq(goldCompanies.id, subjectId), eq(goldCompanies.tenantId, tenantId)))
      .limit(1);
    if (!company) {
      return reply.code(404).send({ success: false, error: "Company not found" });
    }

    const [orderBlock] = await db
      .select({ id: goldOrders.id })
      .from(goldOrders)
      .where(and(eq(goldOrders.leadId, subjectId), eq(goldOrders.tenantId, tenantId)))
      .limit(1);
    const [contractBlock] = await db
      .select({ id: goldContracts.id })
      .from(goldContracts)
      .where(and(eq(goldContracts.clientId, subjectId), eq(goldContracts.tenantId, tenantId)))
      .limit(1);
    if (orderBlock || contractBlock) {
      return reply.code(409).send({
        success: false,
        error: "ERASURE_BLOCKED_COMMERCIAL_RECORDS",
        message:
          "Ștergerea companiei este blocată de înregistrări comerciale (comenzi sau contracte). Arhivează sau elimină acestea conform procedurii interne înainte de ștergere GDPR.",
      });
    }

    const affected: { table: string; rows: number }[] = [];

    await db.transaction(async (tx) => {
      // Invalidează explicit embedding-ul AI (halfvec) înainte de ștergere — trasabilitate GDPR / AI Act.
      await tx
        .update(goldCompanies)
        .set({ aiEmbedding: null, embeddingUpdatedAt: new Date() })
        .where(and(eq(goldCompanies.id, subjectId), eq(goldCompanies.tenantId, tenantId)));

      const bronzeIds = company.bronzeIds ?? [];
      if (bronzeIds.length > 0) {
        const br = await tx
          .delete(bronzeContacts)
          .where(and(eq(bronzeContacts.tenantId, tenantId), inArray(bronzeContacts.id, bronzeIds)))
          .returning({ id: bronzeContacts.id });
        affected.push({ table: "bronze.bronze_contacts", rows: br.length });
      }

      const sc = await tx
        .delete(silverContacts)
        .where(
          and(
            eq(silverContacts.tenantId, tenantId),
            eq(silverContacts.companyId, company.silverId),
          ),
        )
        .returning({ id: silverContacts.id });
      affected.push({ table: "silver.silver_contacts", rows: sc.length });

      const contactRows = await tx
        .select({ id: goldContacts.id })
        .from(goldContacts)
        .where(and(eq(goldContacts.companyId, subjectId), eq(goldContacts.tenantId, tenantId)));
      const entityIdsForMut = [subjectId, ...contactRows.map((r) => r.id)];
      const muRows = await tx
        .update(dataMutations)
        .set({
          beforeData: sql`'{"_redacted":true}'::jsonb`,
          afterData: sql`'{"_redacted":true}'::jsonb`,
        })
        .where(
          and(
            eq(dataMutations.tenantId, tenantId),
            inArray(dataMutations.entityId, entityIdsForMut),
          ),
        )
        .returning({ id: dataMutations.id });
      affected.push({ table: "bronze.data_mutations", rows: muRows.length });

      const gcDel = await tx
        .delete(goldCompanies)
        .where(and(eq(goldCompanies.id, subjectId), eq(goldCompanies.tenantId, tenantId)))
        .returning({ id: goldCompanies.id });
      affected.push({ table: "gold.gold_companies", rows: gcDel.length });
    });

    await db.insert(gdprErasureLog).values({
      tenantId,
      subjectType: "company",
      subjectId,
      requestedBy,
      reason,
      affectedTables: affected,
      rowsDeleted: affected.reduce((s, x) => s + x.rows, 0),
    });

    return reply.send({ success: true, data: { subjectType, subjectId, affected } });
  });
}
