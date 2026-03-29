import type { FastifyInstance, FastifyRequest } from "fastify";
import { db, goldCompanies, eq, and } from "@cerniq/db";
import { z } from "zod";
import { requireTenantId } from "./utils.js";
import { NotFoundError } from "../errors/app-error.js";

const SCORING_FACTORS = [
  {
    name: "financial_health",
    weight: 0.3,
    source: "termene.ro",
    description: "Revenue, profit, assets, liabilities analysis",
  },
  {
    name: "anaf_fiscal_compliance",
    weight: 0.25,
    source: "anaf_api",
    description: "TVA status, fiscal debts, e-Factura registration",
  },
  {
    name: "payment_history",
    weight: 0.2,
    source: "cip_internal",
    description: "Payment incidents count, refusal amounts",
  },
  {
    name: "legal_standing",
    weight: 0.15,
    source: "bpi_termene",
    description: "Insolvency status, court cases, company dissolution",
  },
  {
    name: "company_maturity",
    weight: 0.1,
    source: "anaf_termene",
    description: "Company age, employee count, CAEN sector maturity",
  },
] as const;

const RISK_THRESHOLDS = {
  LOW: { min: 0, max: 33, creditMultiplier: 1.0, paymentTerms: "60 ZILE" },
  MEDIUM: { min: 34, max: 66, creditMultiplier: 0.6, paymentTerms: "30 ZILE" },
  HIGH: { min: 67, max: 100, creditMultiplier: 0.3, paymentTerms: "RAMBURS" },
} as const;

interface CompanyRow {
  id: string;
  cui: string;
  denumire: string | null;
  scorRiscIntern: number | null;
  categorieRisc: string;
  limitaCreditCalculata: string | null;
  limitaCreditAprobata: string | null;
  conditiiPlata: string;
  cifraAfaceri: string | null;
  profitNet: string | null;
  datoriiAnaf: string;
  bpiInInsolventa: boolean;
  cipTotalIncidente: number;
  cipIncidenteMajore: number;
  dataInregistrare: string | null;
  numarAngajati: number | null;
  platitorTva: boolean;
  inregistratEfactura: boolean;
  updatedAt: Date;
}

function buildExplanation(company: CompanyRow) {
  const score = company.scorRiscIntern ?? 0;
  const category = company.categorieRisc;

  const factorBreakdown = SCORING_FACTORS.map((factor) => {
    let contribution: string;
    let detail: string;

    switch (factor.name) {
      case "financial_health":
        contribution = company.cifraAfaceri ? "data_available" : "data_missing";
        detail = company.cifraAfaceri
          ? `Revenue: ${company.cifraAfaceri}, Profit: ${company.profitNet ?? "N/A"}`
          : "Financial data not yet available from Termene.ro";
        break;
      case "anaf_fiscal_compliance":
        contribution = company.platitorTva ? "compliant" : "partial";
        detail = `TVA: ${company.platitorTva ? "registered" : "not registered"}, e-Factura: ${company.inregistratEfactura ? "yes" : "no"}, Datorii ANAF: ${company.datoriiAnaf}`;
        break;
      case "payment_history":
        contribution = company.cipTotalIncidente === 0 ? "clean" : "incidents_found";
        detail = `Total incidents: ${company.cipTotalIncidente}, Major: ${company.cipIncidenteMajore}`;
        break;
      case "legal_standing":
        contribution = company.bpiInInsolventa ? "insolvency_flag" : "clean";
        detail = `Insolvency: ${company.bpiInInsolventa ? "YES" : "no"}`;
        break;
      case "company_maturity":
        contribution = company.dataInregistrare ? "data_available" : "data_missing";
        detail = `Founded: ${company.dataInregistrare ?? "unknown"}, Employees: ${company.numarAngajati ?? "unknown"}`;
        break;
      default:
        contribution = "unknown";
        detail = "";
    }

    return {
      factor: factor.name,
      weight: factor.weight,
      weight_pct: `${Math.round(factor.weight * 100)}%`,
      data_source: factor.source,
      description: factor.description,
      contribution,
      detail,
    };
  });

  return {
    decision_id: company.id,
    system: "CerniqAPP Credit Scoring Module v1.0",
    classification: "HIGH-RISK AI System (EU AI Act Annex III, Category 5b)",
    regulation: "Regulation (EU) 2024/1689",
    company: {
      cui: company.cui,
      name: company.denumire,
    },
    scoring_result: {
      risk_score: score,
      risk_category: category,
      credit_limit_calculated: company.limitaCreditCalculata,
      credit_limit_approved: company.limitaCreditAprobata,
      payment_terms: company.conditiiPlata,
      scoring_timestamp: company.updatedAt.toISOString(),
    },
    methodology: {
      type: "hybrid_rule_based_ml",
      description:
        "Weighted multi-factor scoring combining rule-based deterministic assessment with ML-assisted edge case analysis",
      factors: factorBreakdown,
      thresholds: RISK_THRESHOLDS,
    },
    human_oversight: {
      hitl_required:
        score > 50 ||
        (company.limitaCreditCalculata && parseFloat(company.limitaCreditCalculata) > 100000),
      approval_type: "credit_approval",
      approval_sla: "48h",
      escalation_path: ["Credit Analyst (L1)", "Credit Manager (L2)", "VP Finance (L3)"],
      override_available: true,
    },
    data_subject_rights: {
      right_to_explanation: "This endpoint (Art. 13 EU AI Act, Art. 22 GDPR)",
      right_to_contest: "Submit appeal via support@cerniq.ro or through the application",
      right_to_human_review: "Request manual review by contacting your account manager",
      right_to_rectification: "Request data correction via GDPR data subject request",
      dpo_contact: "dpo@cerniq.ro",
    },
    audit_trail: {
      logged: true,
      retention: "5 years (financial regulation)",
      integrity: "SHA-256 hash chain (immutable)",
    },
  };
}

export async function complianceRoutes(app: FastifyInstance) {
  app.get(
    "/decisions/:id/explanation",
    async (request: FastifyRequest<{ Params: { id: string } }>, reply) => {
      const tenantId = requireTenantId(request);
      const { id } = request.params;

      const parsed = z.string().uuid().safeParse(id);
      if (!parsed.success) {
        return reply.code(400).send({
          success: false,
          error: "INVALID_ID",
          message: "Decision ID must be a valid UUID",
        });
      }

      const [company] = await db
        .select({
          id: goldCompanies.id,
          cui: goldCompanies.cui,
          denumire: goldCompanies.denumire,
          scorRiscIntern: goldCompanies.scorRiscIntern,
          categorieRisc: goldCompanies.categorieRisc,
          limitaCreditCalculata: goldCompanies.limitaCreditCalculata,
          limitaCreditAprobata: goldCompanies.limitaCreditAprobata,
          conditiiPlata: goldCompanies.conditiiPlata,
          cifraAfaceri: goldCompanies.cifraAfaceri,
          profitNet: goldCompanies.profitNet,
          datoriiAnaf: goldCompanies.datoriiAnaf,
          bpiInInsolventa: goldCompanies.bpiInInsolventa,
          cipTotalIncidente: goldCompanies.cipTotalIncidente,
          cipIncidenteMajore: goldCompanies.cipIncidenteMajore,
          dataInregistrare: goldCompanies.dataInregistrare,
          numarAngajati: goldCompanies.numarAngajati,
          platitorTva: goldCompanies.platitorTva,
          inregistratEfactura: goldCompanies.inregistratEfactura,
          updatedAt: goldCompanies.updatedAt,
        })
        .from(goldCompanies)
        .where(and(eq(goldCompanies.id, parsed.data), eq(goldCompanies.tenantId, tenantId)))
        .limit(1);

      if (!company) {
        throw new NotFoundError(
          `AI decision not found for company ID ${id} in tenant ${tenantId}`,
          "DECISION_NOT_FOUND",
        );
      }

      return {
        success: true,
        data: buildExplanation(company as unknown as CompanyRow),
      };
    },
  );
}
