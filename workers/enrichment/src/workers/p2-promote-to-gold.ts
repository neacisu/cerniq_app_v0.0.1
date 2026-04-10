import type { Processor } from "bullmq";
import { createServiceLogger, enrichError } from "@cerniq/observability";
import {
  db,
  goldCompanies,
  goldContacts,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";
import {
  validateJobData,
  goldCompaniesTotal,
  pipelineStageDurationSeconds,
  withCognitiveSpan,
  recordDataMutation,
} from "@cerniq/worker-shared";
import { createJobLogger } from "../lib/job-logger.js";
import { z } from "zod";

const svcLog = createServiceLogger("p2-promote-to-gold", { etapa: "e1" });

export type PromoteToGoldJobData = {
  tenantId: string;
  companyId: string;
  force?: boolean;
  correlationId?: string;
  traceId?: string;
  causationKey?: string;
  sourceEndpoint?: string;
  actorId?: string;
  requestId?: string;
  httpCorrelationId?: string;
};

const promoteToGoldJobDataSchema = z.object({
  tenantId: z.uuid(),
  companyId: z.uuid(),
  force: z.boolean().optional(),
  correlationId: z.string().trim().min(1).optional(),
  traceId: z.string().optional(),
  causationKey: z.string().optional(),
  sourceEndpoint: z.string().optional(),
  actorId: z.string().optional(),
  requestId: z.string().optional(),
  httpCorrelationId: z.string().optional(),
});

/** Mapare pragmatică Silver → `gold.contact_role` (Silver nu are coloană `role`). */
function mapSilverToGoldContactRole(c: {
  isDecisionMaker: boolean;
  functieNormalizata: string | null;
}): "ADMINISTRATOR" | "REPREZENTANT" | "CONTACT" | "ACTIONAR" | "ASOCIAT" {
  if (c.isDecisionMaker) return "ADMINISTRATOR";
  const f = (c.functieNormalizata ?? "").toLowerCase();
  if (f.includes("administrator") || f.includes("administrato")) return "ADMINISTRATOR";
  if (f.includes("reprezentant")) return "REPREZENTANT";
  if (f.includes("actionar") || f.includes("acționar")) return "ACTIONAR";
  if (f.includes("asociat")) return "ASOCIAT";
  return "CONTACT";
}

function initialFitScore(input: {
  numarAngajati: number | null;
  riskCategory: string | null;
  isAgri: boolean;
}): number {
  let score = 0;
  if ((input.numarAngajati ?? 0) >= 50) score += 30;
  else if ((input.numarAngajati ?? 0) >= 10) score += 20;
  else if ((input.numarAngajati ?? 0) >= 1) score += 10;
  if (input.isAgri) score += 25;
  if (input.riskCategory === "LOW") score += 25;
  else if (input.riskCategory === "MEDIUM") score += 15;
  return Math.min(100, score);
}

export const promoteToGoldProcessor: Processor<PromoteToGoldJobData> = async (job) => {
  return withCognitiveSpan(
    "e1:pipeline:promote-gold",
    async (_span) => {
      validateJobData(promoteToGoldJobDataSchema, job.data, {
        queueName: "pipeline:promote:gold",
        jobId: job.id,
      });
      const startedAt = Date.now();
      const log = createJobLogger({
        tenantId: job.data.tenantId,
        workerName: "P2:promote-to-gold",
        jobId: String(job.id ?? ""),
        startedAt,
        etapa: "e1",
        correlationId: job.data.correlationId,
        entityType: "company",
        entityId: job.data.companyId,
      });
      try {
        await setSessionTenantId(job.data.tenantId);
        svcLog.info(
          { tenantId: job.data.tenantId, companyId: job.data.companyId },
          "P2 promote gold",
        );
        const silver = await db.query.silverCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
        });
        if (!silver) return { ok: false, status: "not_found" };
        if (!silver.cui) {
          return { ok: true, status: "blocked", reason: "missing_cui_for_gold" };
        }

        if (!job.data.force && silver.promotionStatus !== "eligible") {
          return { ok: true, status: "not_eligible", reason: silver.promotionStatus };
        }

        const existingGold = await db.query.goldCompanies.findFirst({
          where: (t, { and, eq }) =>
            and(eq(t.tenantId, job.data.tenantId), eq(t.silverId, job.data.companyId)),
        });
        if (existingGold) return { ok: true, status: "already_promoted", goldId: existingGold.id };

        const fitScore = initialFitScore({
          numarAngajati: silver.numarAngajati ?? null,
          riskCategory: silver.categorieRisc ?? null,
          isAgri: /agri|ferma|apia|culturi/i.test(JSON.stringify(silver.metadata ?? {})),
        });

        const goldValues = {
          tenantId: job.data.tenantId,
          silverId: silver.id,
          bronzeIds: silver.sourceBronzeId ? [silver.sourceBronzeId] : [],
          cui: silver.cui,
          nrRegCom: silver.nrRegCom ?? undefined,
          denumire: silver.denumire ?? undefined,
          denumireComerciala: silver.denumireComerciala ?? undefined,
          denumireNormalizata: silver.denumireNormalizata ?? undefined,
          formaJuridica: silver.formaJuridica ?? undefined,
          statusFirma: silver.statusFirma ?? undefined,
          dataInregistrare: silver.dataInregistrare ?? undefined,
          dataRadiere: silver.dataRadiere ?? undefined,
          platitorTva: silver.platitorTva ?? false,
          dataInceputTva: silver.dataInceputTva ?? undefined,
          dataSfarsitTva: silver.dataSfarsitTva ?? undefined,
          tvaLaIncasare: silver.tvaLaIncasare ?? false,
          splitTva: silver.splitTva ?? false,
          inregistratEfactura: silver.inregistratEfactura ?? false,
          dataInregistrareEfactura: silver.dataInregistrareEfactura ?? undefined,
          codCaenPrincipal: silver.codCaenPrincipal ?? undefined,
          denumireCaen: silver.denumireCaen ?? undefined,
          coduriCaenSecundare: silver.coduriCaenSecundare ?? [],
          adresa: silver.adresa ?? undefined,
          strada: silver.strada ?? undefined,
          numar: silver.numar ?? undefined,
          codPostal: silver.codPostal ?? undefined,
          localitate: silver.localitate ?? undefined,
          comuna: silver.comuna ?? undefined,
          judet: silver.judet ?? undefined,
          judetCod:
            (silver.metadata as Record<string, unknown>)?.postgisZones &&
            typeof (silver.metadata as Record<string, unknown>).postgisZones === "object"
              ? ((
                  (silver.metadata as Record<string, unknown>).postgisZones as Record<
                    string,
                    unknown
                  >
                ).judetCod as string | undefined)
              : undefined,
          latitude: silver.latitude ?? undefined,
          longitude: silver.longitude ?? undefined,
          cifraAfaceri: silver.cifraAfaceri ?? undefined,
          profitNet: silver.profitNet ?? undefined,
          profitBrut: silver.profitBrut ?? undefined,
          venituriTotale: silver.venituriTotale ?? undefined,
          cheltuieliTotale: silver.cheltuieliTotale ?? undefined,
          activeTotale: silver.activeTotale ?? undefined,
          activeImobilizate: silver.activeImobilizate ?? undefined,
          activeCirculante: silver.activeCirculante ?? undefined,
          creante: silver.creante ?? undefined,
          stocuri: silver.stocuri ?? undefined,
          cheltuieliInAvans: silver.cheltuieliInAvans ?? undefined,
          casaSiConturiBanci: silver.casaSiConturiBanci ?? undefined,
          datoriiTotale: silver.datoriiTotale ?? undefined,
          capitaluriProprii: silver.capitaluriProprii ?? undefined,
          capitalSocial: silver.capitalSocial ?? undefined,
          provizioane: silver.provizioane ?? undefined,
          venituriInAvans: silver.venituriInAvans ?? undefined,
          numarAngajati: silver.numarAngajati ?? undefined,
          anBilant: silver.anBilant ?? undefined,
          anulInfiintarii: silver.anulInfiintarii ?? undefined,
          ratingExtern: silver.ratingExtern ?? undefined,
          limitaCreditEur: silver.limitaCreditEur ?? undefined,
          datoriiAnaf: silver.datoriiAnaf ?? undefined,
          dataVerificareDatorii: silver.datoriiAnafData ?? undefined,
          obligatiiBugetStat: silver.obligatiiBugetStat ?? undefined,
          obligatiiBugetSomaj: silver.obligatiiBugetSomaj ?? undefined,
          obligatiiBugetAsigSociale: silver.obligatiiBugetAsigSociale ?? undefined,
          obligatiiBugetSanatate: silver.obligatiiBugetSanatate ?? undefined,
          bpiNumarActe: silver.bpiNumarActe ?? 0,
          bpiInInsolventa: silver.bpiInInsolventa ?? false,
          cipTotalIncidente: silver.cipTotalIncidente ?? 0,
          cipIncidenteMajore: silver.cipIncidenteMajore ?? 0,
          cipSumaRefuzata: silver.cipSumaRefuzata ?? undefined,
          numarDosareActuale: silver.numarDosareActuale ?? 0,
          inInsolventa: silver.inInsolventa ?? false,
          scorRiscTermene: silver.scorRiscTermene ?? undefined,
          categorieRisc: silver.categorieRisc ?? "MEDIUM",
          fitScore: String(fitScore),
          engagementScore: "0",
          intentScore: "0",
          currentState: "COLD",
          metadata: {
            promotedFromSilverAt: new Date().toISOString(),
            qualityScoreAtPromotion: silver.totalQualityScore,
            sourceMetadata: silver.metadata,
          },
        };

        // Atomic upsert: eliminates race condition between CUI check and insert
        const upserted = await db
          .insert(goldCompanies)
          .values(goldValues)
          .onConflictDoUpdate({
            target: [goldCompanies.tenantId, goldCompanies.cui],
            set: { updatedAt: new Date() },
          })
          .returning({ id: goldCompanies.id, silverId: goldCompanies.silverId });

        const goldId = upserted[0].id;
        const wasConflict = upserted[0].silverId !== silver.id;

        if (wasConflict) {
          await db
            .update(silverCompanies)
            .set({
              promotionStatus: "promoted",
              promotedToGoldId: goldId,
              promotedAt: new Date(),
            })
            .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

          await db.insert(silverEnrichmentLog).values({
            tenantId: job.data.tenantId,
            entityType: "company",
            entityId: job.data.companyId,
            source: "promote_to_gold",
            operation: "promote_cui_existing",
            requestPayload: { force: Boolean(job.data.force) },
            responsePayload: { goldId, reason: "cui_duplicate" },
            fieldsUpdated: ["promotionStatus", "promotedToGoldId", "promotedAt"],
            correlationId: job.data.correlationId,
            jobId: String(job.id ?? ""),
            durationMs: Date.now() - startedAt,
          });

          return {
            ok: true,
            status: "already_promoted_cui",
            goldId,
            reason: `Gold already exists with CUI ${silver.cui}`,
          };
        }

        const [{ count: goldCount }] = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(goldCompanies)
          .where(sql`${goldCompanies.tenantId} = ${job.data.tenantId}`);
        goldCompaniesTotal.set({ tenant_id: job.data.tenantId }, goldCount);

        if (silver.createdAt) {
          const stageDuration = (Date.now() - new Date(silver.createdAt).getTime()) / 1000;
          pipelineStageDurationSeconds.observe(
            { stage: "silver_to_gold", tenant_id: job.data.tenantId },
            stageDuration,
          );
        }

        const silverContactRows = await db.query.silverContacts.findMany({
          where: (t, { eq: e }) => e(t.companyId, silver.id),
        });
        if (silverContactRows.length > 0) {
          await db.insert(goldContacts).values(
            silverContactRows.map((c) => ({
              tenantId: job.data.tenantId,
              companyId: goldId,
              role: mapSilverToGoldContactRole(c),
              prenume: c.prenume ?? undefined,
              nume: c.nume ?? undefined,
              email: c.email ?? undefined,
              emailVerified: c.emailVerified,
              telefon: c.telefonE164 ?? c.telefon ?? undefined,
              telefonVerified: c.telefonValid ?? false,
              whatsappNumber: c.whatsappNumber ?? undefined,
              consentGiven: Boolean(c.consentDate),
            })),
          );
        }

        await db
          .update(silverCompanies)
          .set({
            promotionStatus: "promoted",
            promotedToGoldId: goldId,
            promotedAt: new Date(),
          })
          .where(sql`${silverCompanies.id} = ${job.data.companyId}`);

        await db.insert(silverEnrichmentLog).values({
          tenantId: job.data.tenantId,
          entityType: "company",
          entityId: job.data.companyId,
          source: "promote_to_gold",
          operation: "promote",
          requestPayload: { force: Boolean(job.data.force) },
          responsePayload: { goldId, fitScore },
          fieldsUpdated: ["promotionStatus", "promotedToGoldId", "promotedAt"],
          correlationId: job.data.correlationId,
          jobId: String(job.id ?? ""),
          durationMs: Date.now() - startedAt,
        });

        void recordDataMutation(
          {
            tenantId: job.data.tenantId,
            batchId: job.data.correlationId ?? "system",
            nodeKey: "e1:pipeline:promote-gold",
            entityType: "company",
            entityId: job.data.companyId,
            mutationIntent: "PROMOTE",
            afterData: { goldId, promotionStatus: "promoted" },
          },
          {
            traceId: job.data.traceId,
            causationKey: job.data.causationKey,
            actorId: job.data.actorId,
          },
        ).catch(() => undefined);
        log.step("done", "Promovare gold", {
          latencyMs: Date.now() - startedAt,
          pipelineContext: {
            companyId: job.data.companyId,
            batchId: job.data.correlationId,
          },
        });
        return { ok: true, status: "success", goldId };
      } catch (error) {
        log.error(
          "fatal",
          `Promote to gold eșuat: ${error instanceof Error ? error.message : String(error)}`,
          {
            ...enrichError(error, {
              tenantId: job.data.tenantId,
              entityType: "company",
              entityId: job.data.companyId,
              pipelineContext: {
                companyId: job.data.companyId,
                batchId: job.data.correlationId,
              },
            }),
          },
        );
        throw error;
      }
    },
    { tenantId: job.data.tenantId },
  );
};

export { promoteToGoldJobDataSchema };
