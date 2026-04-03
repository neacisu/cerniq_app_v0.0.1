/**
 * FiscalDocuments — E3 Fiscal Pipeline Timeline
 *
 * Timeline cronologic: Proforma → Factură → eFactura SPV → Arhivă
 * Include: status Oblio, status SPV ANAF, deadline D+5, hash chain SHA-256
 * Plan: §XII L9478 — "proforma/factură/eFactura timeline"
 * Workers: G39-G45 (Oblio), H46-H50 (eFactura SPV)
 */
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_DOCS: FiscalDocument[] = [
  {
    id: "d-001",
    series: "CERN",
    number: "000123",
    type: "PROFORMA",
    company: "SC AgroSud SRL",
    cui: "12345678",
    issueDate: "2026-04-01",
    dueDate: "2026-04-08",
    amount: 19664.71,
    vat: 3736.29,
    total: 23401,
    oblioStatus: "CREATED",
    spvStatus: "NOT_SENT",
    spvDeadline: "N/A",
    daysToDeadline: 0,
    hashChain: "sha256:a3f8c2d9e1b4f7a2...",
    oblioId: "OBL-2026-0123",
  },
  {
    id: "d-002",
    series: "CERN",
    number: "000124",
    type: "INVOICE",
    company: "Cooperativa Agriland",
    cui: "87654321",
    issueDate: "2026-03-28",
    dueDate: "2026-04-27",
    amount: 10084.03,
    vat: 1915.97,
    total: 12000,
    oblioStatus: "CREATED",
    spvStatus: "VALIDATED",
    spvDeadline: "2026-04-02",
    daysToDeadline: -1,
    hashChain: "sha256:b7d4e1f9c2a8b3e6...",
    oblioId: "OBL-2026-0124",
  },
  {
    id: "d-003",
    series: "CERN",
    number: "000125",
    type: "INVOICE",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    issueDate: "2026-03-30",
    dueDate: "2026-04-29",
    amount: 6890.76,
    vat: 1309.24,
    total: 8200,
    oblioStatus: "CREATED",
    spvStatus: "SENDING",
    spvDeadline: "2026-04-04",
    daysToDeadline: 1,
    hashChain: "sha256:c9e2a4f1d7b5c3a8...",
    oblioId: "OBL-2026-0125",
  },
  {
    id: "d-004",
    series: "CERN",
    number: "000120",
    type: "INVOICE",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    issueDate: "2026-03-25",
    dueDate: "2026-04-24",
    amount: 37815.13,
    vat: 7184.87,
    total: 45000,
    oblioStatus: "PAID",
    spvStatus: "OVERDUE",
    spvDeadline: "2026-03-30",
    daysToDeadline: -4,
    hashChain: "sha256:d2f7b9e4a1c6d3f0...",
    oblioId: "OBL-2026-0120",
  },
];

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
  const overdueCount = MOCK_DOCS.filter((d) => spvRisk(d) === "critical").length;
  const warningCount = MOCK_DOCS.filter((d) => spvRisk(d) === "warning").length;
  const validatedCount = MOCK_DOCS.filter((d) => d.spvStatus === "VALIDATED").length;

  return (
    <PageWrapper title="Documente Fiscale" actions={<EtapaBadge label="Etapa 3" />}>
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <KpiCard
          label="Total Documente"
          value={String(MOCK_DOCS.length)}
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
          {[...MOCK_DOCS]
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
