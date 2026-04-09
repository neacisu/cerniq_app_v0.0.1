/**
 * E4 Post-Sale — alias-uri spec plan: `/api/v1/postsale/*`
 * Datele provin din aceleași tabele ca `/api/v1/orders/payments*` și `/api/v1/credit/*`.
 */
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  db,
  eq,
  and,
  desc,
  goldPayments,
  goldOrders,
  goldCompanies,
  goldPaymentReconciliations,
  goldCreditProfiles,
  goldCreditScores,
} from "@cerniq/db";
import { requireTenantId } from "./utils.js";

const idParamSchema = z.object({ id: z.uuid() });
const companyIdParamSchema = z.object({ companyId: z.uuid() });

export async function postsaleRoutes(app: FastifyInstance) {
  const authOpts = { onRequest: [async (req: FastifyRequest) => req.jwtVerify()] };

  // ── GET /postsale/payments/:id — detaliu plată (tenant-scoped) ───────────────

  app.get("/payments/:id", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { id } = idParamSchema.parse(req.params);

    const [row] = await db
      .select({
        payment: goldPayments,
        orderNumber: goldOrders.orderNumber,
        orderId: goldOrders.id,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
      })
      .from(goldPayments)
      .leftJoin(goldOrders, eq(goldPayments.orderId, goldOrders.id))
      .leftJoin(goldCompanies, eq(goldOrders.leadId, goldCompanies.id))
      .where(and(eq(goldPayments.id, id), eq(goldPayments.tenantId, tenantId)))
      .limit(1);

    if (!row) {
      return reply.status(404).send({ success: false, error: "Payment not found" });
    }

    const reconciliations = await db
      .select()
      .from(goldPaymentReconciliations)
      .where(eq(goldPaymentReconciliations.paymentId, id))
      .orderBy(desc(goldPaymentReconciliations.matchedAt));

    return reply.send({
      success: true,
      data: {
        ...row.payment,
        orderNumber: row.orderNumber,
        orderId: row.orderId,
        companyName: row.companyName,
        cui: row.cui,
        reconciliations,
      },
      meta: { aliasOf: "GET /api/v1/orders/payments (detail by payment id)" },
    });
  });

  // ── GET /postsale/credit-scores/:companyId — istoric scoruri pentru client ──
  /** `companyId` = `gold_companies.id` / `gold_credit_profiles.client_id` (lead). */

  app.get("/credit-scores/:companyId", { ...authOpts }, async (req, reply) => {
    const tenantId = requireTenantId(req);
    const { companyId } = companyIdParamSchema.parse(req.params);

    const [row] = await db
      .select({
        profile: goldCreditProfiles,
        companyName: goldCompanies.denumire,
        cui: goldCompanies.cui,
      })
      .from(goldCreditProfiles)
      .leftJoin(goldCompanies, eq(goldCreditProfiles.clientId, goldCompanies.id))
      .where(
        and(eq(goldCreditProfiles.tenantId, tenantId), eq(goldCreditProfiles.clientId, companyId)),
      )
      .limit(1);

    if (!row) {
      return reply.status(404).send({ success: false, error: "Credit profile not found" });
    }

    const history = await db
      .select()
      .from(goldCreditScores)
      .where(eq(goldCreditScores.profileId, row.profile.id))
      .orderBy(desc(goldCreditScores.calculatedAt));

    return reply.send({
      success: true,
      data: {
        companyId,
        profile: row.profile,
        companyName: row.companyName,
        cui: row.cui,
        history,
      },
      meta: { aliasOf: "GET /api/v1/credit/profiles/:clientId + score history" },
    });
  });
}
