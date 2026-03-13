import type { Processor } from "bullmq";
import {
  db,
  goldCompanies,
  setSessionTenantId,
  silverCompanies,
  silverEnrichmentLog,
  sql,
} from "@cerniq/db";

export type PromoteToGoldJobData = {
  tenantId: string;
  companyId: string;
  force?: boolean;
  correlationId?: string;
};

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
  const startedAt = Date.now();
  await setSessionTenantId(job.data.tenantId);
  const silver = await db.query.silverCompanies.findFirst({
    where: (t, { and, eq }) => and(eq(t.tenantId, job.data.tenantId), eq(t.id, job.data.companyId)),
  });
  if (!silver) return { ok: false, status: "not_found" };

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

  const inserted = await db
    .insert(goldCompanies)
    .values({
      tenantId: job.data.tenantId,
      silverId: silver.id,
      bronzeIds: silver.sourceBronzeId ? [silver.sourceBronzeId] : [],
      cui: silver.cui ?? undefined,
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
          ? (((silver.metadata as Record<string, unknown>).postgisZones as Record<string, unknown>)
              .judetCod as string | undefined)
          : undefined,
      latitude: silver.latitude ?? undefined,
      longitude: silver.longitude ?? undefined,
      locationGeography: silver.locationGeography ?? undefined,
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
    })
    .returning({ id: goldCompanies.id });
  const goldId = inserted[0].id;

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

  return { ok: true, status: "success", goldId };
};
