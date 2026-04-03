/**
 * FiscalDocuments — E3 Fiscal Pipeline Timeline
 *
 * Timeline cronologic: Proforma → Factură → eFactura SPV → Arhivă
 * Include: status Oblio, status SPV ANAF, deadline D+5, hash chain SHA-256
 * Plan: §XII L9478 — "proforma/factură/eFactura timeline"
 * Workers: G39-G45 (Oblio), H46-H50 (eFactura SPV)
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { api } from "@/lib/api.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { KpiCard } from "@/components/data/KpiCard.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertOctagon,
  Hash,
  Building2,
  Calendar,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type DocumentType = "PROFORMA" | "INVOICE" | "CREDIT_NOTE";
type OblioStatus = "PENDING" | "CREATED" | "PAID" | "CANCELLED";
type SPVStatus = "NOT_SENT" | "SENDING" | "VALIDATED" | "REJECTED" | "ERROR" | "OVERDUE";

interface FiscalDocument {
  id: string;
  series: string;
  number: string;
  type: DocumentType;
  company: string;
  cui: string;
  issueDate: string;
  dueDate: string;
  amount: number;
  vat: number;
  total: number;
  oblioStatus: OblioStatus;
  spvStatus: SPVStatus;
  spvDeadline: string;
  daysToDeadline: number;
  hashChain: string;
  oblioId: string;
}

type OblioDocRow = {
  id: string;
  documentType?: string | null;
  series?: string | null;
  number?: number | null;
  oblioId?: string | null;
  status?: string | null;
  subtotal?: string | null;
  vat?: string | null;
  total?: string | null;
  issuedAt?: string | null;
  createdAt?: string | null;
};

type EinvoiceRow = {
  oblioDocumentId?: string | null;
  status?: string | null;
  indexSpv?: string | null;
  deadlineAt?: string | null;
  submittedAt?: string | null;
  validatedAt?: string | null;
};

function parseNum(v: string | null | undefined): number {
  if (v == null || v === "") return 0;
  const n = Number.parseFloat(String(v));
  return Number.isFinite(n) ? n : 0;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("ro-RO");
}

function mapEinvoiceToSpv(sub: EinvoiceRow | undefined): SPVStatus {
  if (!sub?.status) return "NOT_SENT";
  const s = sub.status.toUpperCase();
  if (s === "VALIDATED") return "VALIDATED";
  if (s === "REJECTED") return "REJECTED";
  if (s === "ERROR") return "ERROR";
  if (s === "PENDING" || s === "SENDING" || s === "SENT" || s === "PROCESSING") return "SENDING";
  return "NOT_SENT";
}

function daysUntil(iso: string | null | undefined): number {
  if (!iso) return 999;
  const end = new Date(iso).getTime();
  if (Number.isNaN(end)) return 999;
  const start = Date.now();
  return Math.ceil((end - start) / 86400000);
}

function buildFiscalDocuments(
  oblioRows: OblioDocRow[],
  einvoiceByDocId: Map<string, EinvoiceRow>,
): FiscalDocument[] {
  return oblioRows.map((doc) => {
    const sub = einvoiceByDocId.get(doc.id);
    const spvStatus = mapEinvoiceToSpv(sub);
    const deadlineRaw = sub?.deadlineAt ?? null;
    const spvDeadline = deadlineRaw ? fmtDate(deadlineRaw) : "N/A";
    let daysToDeadline = deadlineRaw ? daysUntil(deadlineRaw) : 999;
    if (spvStatus === "VALIDATED") daysToDeadline = 999;
    if (spvStatus === "NOT_SENT" && doc.documentType === "PROFORMA") daysToDeadline = 999;

    const oblioSt = (doc.status ?? "PENDING").toUpperCase();
    const oblioStatus: OblioStatus =
      oblioSt === "PAID" ||
      oblioSt === "CREATED" ||
      oblioSt === "PENDING" ||
      oblioSt === "CANCELLED"
        ? (oblioSt as OblioStatus)
        : "PENDING";

    const docType = (doc.documentType ?? "PROFORMA").toUpperCase();
    const type: DocumentType =
      docType === "INVOICE" || docType === "PROFORMA" || docType === "CREDIT_NOTE"
        ? (docType as DocumentType)
        : "PROFORMA";

    let displaySpv = spvStatus;
    if (
      type === "INVOICE" &&
      sub?.deadlineAt &&
      spvStatus !== "VALIDATED" &&
      daysUntil(sub.deadlineAt) < 0
    ) {
      displaySpv = "OVERDUE";
    }

    return {
      id: doc.id,
      series: doc.series?.trim() || "—",
      number: doc.number != null ? String(doc.number) : "—",
      type,
      company: "—",
      cui: "—",
      issueDate: fmtDate(doc.issuedAt ?? doc.createdAt),
      dueDate: fmtDate(sub?.deadlineAt ?? doc.issuedAt ?? doc.createdAt),
      amount: parseNum(doc.subtotal),
      vat: parseNum(doc.vat),
      total: parseNum(doc.total),
      oblioStatus,
      spvStatus: displaySpv,
      spvDeadline,
      daysToDeadline: displaySpv === "OVERDUE" ? Math.min(daysToDeadline, 0) : daysToDeadline,
      hashChain: sub?.indexSpv ? `SPV index: ${sub.indexSpv}` : "—",
      oblioId: doc.oblioId?.trim() || doc.id.slice(0, 8),
    };
  });
}

// ─── Timeline Step Types ──────────────────────────────────────────────────────

interface TimelineStep {
  label: string;
  status: "completed" | "active" | "pending" | "error" | "warning";
  detail?: string;
  timestamp?: string;
}

// ─── Pure helpers ─────────────────────────────────────────────────────────────

function getOblioStepStatus(doc: FiscalDocument): TimelineStep["status"] {
  if (doc.oblioStatus === "CREATED" || doc.oblioStatus === "PAID") {
    return "completed";
  }
  return "active";
}

function getInvoiceStepStatus(doc: FiscalDocument): TimelineStep["status"] {
  if (doc.type !== "INVOICE") return "pending";
  return doc.oblioStatus === "PAID" ? "completed" : "active";
}

function getSPVStepStatus(doc: FiscalDocument): TimelineStep["status"] {
  if (doc.spvStatus === "VALIDATED") return "completed";
  if (doc.spvStatus === "SENDING") return "active";
  if (doc.spvStatus === "OVERDUE" || doc.spvStatus === "ERROR" || doc.spvStatus === "REJECTED") {
    return "error";
  }
  return "pending";
}

function getRiskBackground(risk: "none" | "warning" | "critical"): string {
  if (risk === "critical") {
    return "color-mix(in oklch, var(--color-er) 5%, transparent)";
  }
  if (risk === "warning") {
    return "color-mix(in oklch, var(--color-wa) 5%, transparent)";
  }
  return "transparent";
}

// ─── Timeline Step Component ──────────────────────────────────────────────────

function TimelineSteps({ steps }: { readonly steps: TimelineStep[] }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0, fontSize: 10 }}>
      {steps.map((step, idx) => {
        const colors = {
          completed: "var(--color-ok)",
          active: "var(--color-wa)",
          pending: "var(--color-t4)",
          error: "var(--color-er)",
          warning: "var(--color-wa)",
        };
        const color = colors[step.status];

        return (
          <div key={step.label} style={{ display: "flex", alignItems: "center" }}>
            <div title={step.detail} style={{ textAlign: "center", minWidth: 60 }}>
              <div
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "50%",
                  background:
                    step.status === "pending"
                      ? "transparent"
                      : `color-mix(in oklch, ${color} 20%, transparent)`,
                  border: `1.5px solid ${step.status === "pending" ? "var(--color-s600)" : color}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 3px",
                }}
              >
                {step.status === "completed" && <CheckCircle2 size={10} color={color} />}
                {step.status === "active" && <Clock size={10} color={color} />}
                {step.status === "error" && <AlertOctagon size={10} color={color} />}
                {step.status === "warning" && <AlertTriangle size={10} color={color} />}
              </div>
              <div
                style={{
                  color,
                  fontWeight: step.status === "active" ? 700 : 400,
                }}
              >
                {step.label}
              </div>
              {step.timestamp && (
                <div style={{ color: "var(--color-t4)", fontSize: 9 }}>{step.timestamp}</div>
              )}
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  height: 1,
                  width: 20,
                  background: step.status === "completed" ? "var(--color-ok)" : "var(--color-s600)",
                  marginBottom: 14,
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Business Logic ───────────────────────────────────────────────────────────

function docTimelineSteps(doc: FiscalDocument): TimelineStep[] {
  return [
    {
      label: "Oblio",
      status: getOblioStepStatus(doc),
      detail: `Oblio ID: ${doc.oblioId}`,
      timestamp: doc.issueDate,
    },
    {
      label: "Factură",
      status: getInvoiceStepStatus(doc),
      detail: `${doc.series}/${doc.number}`,
    },
    {
      label: "SPV",
      status: getSPVStepStatus(doc),
      detail: `Deadline: ${doc.spvDeadline}`,
      timestamp: doc.spvStatus === "VALIDATED" ? doc.spvDeadline : undefined,
    },
    {
      label: "Arhivă",
      status: doc.spvStatus === "VALIDATED" && doc.oblioStatus === "PAID" ? "completed" : "pending",
      detail: `Hash: ${doc.hashChain}`,
    },
  ];
}

function spvRisk(doc: FiscalDocument): "none" | "warning" | "critical" {
  if (doc.type === "PROFORMA") return "none";
  if (doc.spvStatus === "VALIDATED") return "none";
  if (doc.spvStatus === "OVERDUE") return "critical";
  if (doc.daysToDeadline <= 0) return "critical";
  if (doc.daysToDeadline <= 1) return "warning";
  return "none";
}

// ─── Document Row ─────────────────────────────────────────────────────────────

function DocumentRow({ doc }: { readonly doc: FiscalDocument }) {
  const [expanded, setExpanded] = useState(false);
  const risk = spvRisk(doc);

  function handleToggle() {
    setExpanded((prev) => !prev);
  }

  return (
    <div
      style={{
        borderBottom: "1px solid var(--color-s800)",
        padding: "12px 16px",
        background: getRiskBackground(risk),
      }}
    >
      <button
        type="button"
        aria-expanded={expanded}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          cursor: "pointer",
          width: "100%",
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          fontFamily: "inherit",
          fontSize: "inherit",
        }}
        onClick={handleToggle}
      >
        {/* Doc type icon */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 6,
            background: "var(--color-s700)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <FileText
            size={16}
            color={doc.type === "INVOICE" ? "var(--color-neuron-fiscal)" : "var(--color-b5)"}
          />
        </div>

        {/* Main info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <span style={{ fontWeight: 600, fontSize: 13, color: "var(--color-t1)" }}>
              {doc.series}/{doc.number}
            </span>
            <SBadge status={doc.type} />
            {risk === "critical" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10,
                  color: "var(--color-er)",
                  fontWeight: 700,
                }}
              >
                <AlertOctagon size={11} />
                DEPĂȘIT DEADLINE SPV
              </div>
            )}
            {risk === "warning" && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 3,
                  fontSize: 10,
                  color: "var(--color-wa)",
                  fontWeight: 600,
                }}
              >
                <AlertTriangle size={11} />
                Deadline SPV mâine
              </div>
            )}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              fontSize: 11,
              color: "var(--color-t3)",
            }}
          >
            <Building2 size={10} />
            <span>{doc.company}</span>
            <span>•</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>CUI {doc.cui}</span>
            <span>•</span>
            <Calendar size={10} />
            <span>{doc.issueDate}</span>
          </div>
        </div>

        {/* Amount */}
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              color: "var(--color-t1)",
              fontFamily: "var(--font-mono)",
            }}
          >
            RON {doc.total.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t3)" }}>
            TVA: RON {doc.vat.toLocaleString("ro-RO", { minimumFractionDigits: 2 })}
          </div>
        </div>

        {/* SPV status */}
        <div style={{ flexShrink: 0, minWidth: 80, textAlign: "center" }}>
          <SBadge status={doc.spvStatus} />
          {doc.spvDeadline !== "N/A" && (
            <div style={{ fontSize: 9, color: "var(--color-t4)", marginTop: 2 }}>
              D+5: {doc.spvDeadline}
            </div>
          )}
        </div>

        <div style={{ color: "var(--color-t3)" }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </button>

      {/* Expanded timeline */}
      {expanded && (
        <div
          style={{
            marginTop: 12,
            paddingTop: 12,
            borderTop: "1px solid var(--color-s800)",
          }}
        >
          <div style={{ marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
            <TimelineSteps steps={docTimelineSteps(doc)} />
          </div>
          <div
            style={{
              display: "flex",
              gap: 16,
              fontSize: 10,
              color: "var(--color-t4)",
              fontFamily: "var(--font-mono)",
              flexWrap: "wrap",
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
              <Hash size={9} />
              {doc.hashChain}
            </span>
            <span>Oblio: {doc.oblioId}</span>
            <span>Scadență: {doc.dueDate}</span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function FiscalDocuments() {
  const oblioQuery = useQuery({
    queryKey: ["fiscal", "oblio-documents"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: OblioDocRow[] }>(
        "/api/v1/fiscal/oblio/documents?page=1&limit=100",
      ),
  });

  const einvoiceQuery = useQuery({
    queryKey: ["fiscal", "einvoice-submissions"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: EinvoiceRow[] }>(
        "/api/v1/fiscal/einvoice/submissions?page=1&limit=200",
      ),
  });

  const docs = useMemo(() => {
    const rows = oblioQuery.data?.data ?? [];
    const subs = einvoiceQuery.data?.data ?? [];
    const byDoc = new Map<string, EinvoiceRow>();
    for (const s of subs) {
      const oid = s.oblioDocumentId;
      if (oid) byDoc.set(oid, s);
    }
    return buildFiscalDocuments(rows, byDoc);
  }, [oblioQuery.data, einvoiceQuery.data]);

  const overdueCount = docs.filter((d) => spvRisk(d) === "critical").length;
  const warningCount = docs.filter((d) => spvRisk(d) === "warning").length;
  const validatedCount = docs.filter((d) => d.spvStatus === "VALIDATED").length;

  const err =
    oblioQuery.error instanceof Error
      ? oblioQuery.error.message
      : einvoiceQuery.error instanceof Error
        ? einvoiceQuery.error.message
        : null;

  return (
    <PageWrapper title="Documente Fiscale" actions={<EtapaBadge label="Etapa 3" />}>
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}
      {oblioQuery.isLoading || einvoiceQuery.isLoading ? (
        <p className="text-sm text-t3 mb-4">Se încarcă documentele fiscale…</p>
      ) : null}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total Documente"
          value={String(docs.length)}
          icon="FileText"
          color="var(--color-b5)"
        />
        <KpiCard
          label="SPV Validate"
          value={String(validatedCount)}
          icon="CheckCircle2"
          color="var(--color-ok)"
        />
        <KpiCard
          label="Deadline Mâine"
          value={String(warningCount)}
          icon="AlertTriangle"
          color="var(--color-wa)"
        />
        <KpiCard
          label="SPV Depășit!"
          value={String(overdueCount)}
          icon="AlertOctagon"
          color="var(--color-er)"
        />
      </div>

      {overdueCount > 0 && (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 14px",
            background: "color-mix(in oklch, var(--color-er) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--color-er) 40%, transparent)",
            borderRadius: 6,
            fontSize: 12,
            color: "var(--color-er)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontWeight: 600,
          }}
        >
          <AlertOctagon size={16} />
          {overdueCount} factură(i) cu deadline SPV DEPĂȘIT! Risc amendă legală 15-20% din valoarea
          facturii (H48 Safety Net activ).
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Timeline Documente Fiscale</CardTitle>
        </CardHeader>
        <CardBody className="p-0">
          {!oblioQuery.isLoading && !einvoiceQuery.isLoading && docs.length === 0 ? (
            <div className="p-4 text-sm text-t3">
              Nu există documente Oblio pentru acest tenant.
            </div>
          ) : null}
          {[...docs]
            .sort((a, b) => {
              const riskOrder = { critical: 0, warning: 1, none: 2 };
              return riskOrder[spvRisk(a)] - riskOrder[spvRisk(b)];
            })
            .map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
