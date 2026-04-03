import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api.js";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { X, ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";

type GuardStatus = "ok" | "warning" | "error";
type AuditResult = "PASS" | "BLOCKED" | "WARN";

interface GuardType {
  code: string;
  name: string;
  description: string;
  status: GuardStatus;
  passCount: number;
  blockedCount: number;
}

interface AuditEntry {
  id?: string;
  time: string;
  guardCode: string;
  guard: string;
  input: string;
  result: AuditResult;
  action: string;
  detail: string;
}

const GUARD_TYPES: GuardType[] = [
  {
    code: "M71",
    name: "Price Guard",
    description: "Prețul propus ≥ gold_products.unit_price. Discount max 15% fără HITL.",
    status: "ok",
    passCount: 0,
    blockedCount: 0,
  },
  {
    code: "M72",
    name: "Stock Guard",
    description: "Cantitate ≤ get_available_stock(sku). Blocare automată la stoc insuficient.",
    status: "ok",
    passCount: 0,
    blockedCount: 0,
  },
  {
    code: "M73",
    name: "Discount Guard",
    description: "Discount >15% → HITL escalare SLA 4h. Discount >30% → blocare automată.",
    status: "warning",
    passCount: 0,
    blockedCount: 0,
  },
  {
    code: "M74",
    name: "SKU Guard",
    description: "SKU validat în gold_products. Coduri inexistente blocate automat.",
    status: "ok",
    passCount: 0,
    blockedCount: 0,
  },
  {
    code: "M75",
    name: "Fiscal Guard",
    description: "CUI validat modulo-11 + TVA 19% corect + totaluri consistente.",
    status: "ok",
    passCount: 0,
    blockedCount: 0,
  },
];

type ViolationApiRow = {
  id?: string;
  violationType?: string | null;
  severity?: string | null;
  details?: Record<string, unknown> | null;
  createdAt?: string;
};

function violationTypeToCode(t: string | undefined | null): string {
  const x = (t ?? "").toLowerCase();
  if (x === "price") return "M71";
  if (x === "stock") return "M72";
  if (x === "discount") return "M73";
  if (x === "sku") return "M74";
  if (x === "fiscal") return "M75";
  return "M73";
}

function codeToGuardName(code: string): string {
  const g = GUARD_TYPES.find((x) => x.code === code);
  return g?.name ?? code;
}

function mapViolationToAudit(row: ViolationApiRow): AuditEntry {
  const code = violationTypeToCode(row.violationType);
  const det = row.details;
  let inputStr = "—";
  let detailStr = "—";
  if (det && typeof det === "object") {
    if (typeof det.violation === "string") detailStr = det.violation;
    else detailStr = JSON.stringify(det).slice(0, 500);
    inputStr =
      typeof det.response === "string"
        ? det.response.slice(0, 200)
        : JSON.stringify(det).slice(0, 200);
  }
  const sev = (row.severity ?? "").toUpperCase();
  const result: AuditResult = sev === "LOW" || sev === "MEDIUM" ? "WARN" : "BLOCKED";
  return {
    id: row.id,
    time: row.createdAt
      ? new Date(row.createdAt).toLocaleString("ro-RO", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      : "—",
    guardCode: code,
    guard: codeToGuardName(code),
    input: inputStr,
    result,
    action: result === "WARN" ? "Atenție / HITL" : "Respins",
    detail: detailStr,
  };
}

const resultIcon = { PASS: ShieldCheck, BLOCKED: ShieldX, WARN: ShieldAlert };
const resultColor = {
  PASS: "var(--color-ok)",
  BLOCKED: "var(--color-er)",
  WARN: "var(--color-wa)",
};

function AuditDetailDrawer({
  entry,
  onClose,
}: {
  readonly entry: AuditEntry;
  readonly onClose: () => void;
}) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <div style={{ flex: 1, background: "rgba(0,0,0,0.5)" }} onClick={onClose} aria-hidden />
      <div
        style={{
          width: 380,
          background: "var(--color-s900)",
          borderLeft: "1px solid var(--color-s700)",
          padding: 20,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--color-t1)" }}>
              {entry.guardCode} — {entry.guard}
            </div>
            <div style={{ fontSize: 10, color: "var(--color-t3)", fontFamily: "var(--font-mono)" }}>
              {entry.time}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-t3)",
              cursor: "pointer",
            }}
            aria-label="Închide"
          >
            <X size={18} />
          </button>
        </div>

        {(() => {
          const Icon = resultIcon[entry.result];
          return (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                background: `color-mix(in oklch, ${resultColor[entry.result]} 10%, transparent)`,
                border: `1px solid color-mix(in oklch, ${resultColor[entry.result]} 30%, transparent)`,
                borderRadius: 6,
              }}
            >
              <Icon size={16} color={resultColor[entry.result]} />
              <span style={{ color: resultColor[entry.result], fontWeight: 700, fontSize: 13 }}>
                {entry.result}
              </span>
              <span style={{ color: "var(--color-t3)", fontSize: 11 }}>— {entry.action}</span>
            </div>
          );
        })()}

        <div>
          <div style={{ fontSize: 9, color: "var(--color-t4)", marginBottom: 4 }}>INPUT AGENT</div>
          <div
            style={{
              padding: "8px 10px",
              background: "var(--color-s800)",
              border: "1px solid var(--color-s700)",
              borderRadius: 4,
              fontSize: 12,
              color: "var(--color-t1)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {entry.input}
          </div>
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 6 }}>
            <Info size={12} color="var(--color-b5)" />
            <span style={{ fontSize: 10, fontWeight: 600, color: "var(--color-t3)" }}>
              DETALIU EVALUARE
            </span>
          </div>
          <div style={{ fontSize: 12, color: "var(--color-t2)", lineHeight: 1.6 }}>
            {entry.detail}
          </div>
        </div>

        <Button
          size="sm"
          variant="outline"
          style={{ marginTop: "auto", fontSize: 11 }}
          onClick={() => {
            toast.info("Export log audit în curs...");
            onClose();
          }}
        >
          Exportă Log
        </Button>
      </div>
    </div>
  );
}

export function Guardrails() {
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);

  const violationsQuery = useQuery({
    queryKey: ["negotiation", "guardrails", "tenant"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: ViolationApiRow[] }>(
        "/api/v1/negotiation/guardrails?limit=100",
      ),
  });

  const auditRows = useMemo(() => {
    const raw = violationsQuery.data?.data ?? [];
    return raw.map(mapViolationToAudit);
  }, [violationsQuery.data]);

  const guardCards = useMemo(() => {
    const byCode: Record<string, { pass: number; blocked: number; status: GuardStatus }> = {};
    for (const g of GUARD_TYPES) {
      byCode[g.code] = { pass: 0, blocked: 0, status: "ok" };
    }
    for (const r of auditRows) {
      const code = r.guardCode;
      if (!byCode[code]) continue;
      if (r.result === "PASS") byCode[code].pass += 1;
      else {
        byCode[code].blocked += 1;
        if (r.result === "WARN") byCode[code].status = "warning";
        else byCode[code].status = "error";
      }
    }
    return GUARD_TYPES.map((g) => ({
      ...g,
      passCount: byCode[g.code]?.pass ?? 0,
      blockedCount: byCode[g.code]?.blocked ?? 0,
      status: (byCode[g.code]?.status ?? g.status) as GuardStatus,
    }));
  }, [auditRows]);

  const totalPass = guardCards.reduce((s, g) => s + g.passCount, 0);
  const totalBlocked = guardCards.reduce((s, g) => s + g.blockedCount, 0);
  const blockRateDenom = totalPass + totalBlocked;
  const blockRate = blockRateDenom > 0 ? ((totalBlocked / blockRateDenom) * 100).toFixed(1) : "0.0";

  const err = violationsQuery.error instanceof Error ? violationsQuery.error.message : null;

  return (
    <PageWrapper title="Anti-Hallucination Guardrails" actions={<EtapaBadge label="Etapa 3" />}>
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}
      {violationsQuery.isLoading ? (
        <p className="text-sm text-t3 mb-4">Se încarcă violările din API…</p>
      ) : null}
      <div className="grid grid-cols-4 gap-4 mb-6 max-[900px]:grid-cols-2">
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            GUARDRAILS ACTIVE
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-b5)",
              fontFamily: "var(--font-mono)",
            }}
          >
            M71-M75
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t4)", marginTop: 2 }}>
            5 reguli active
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            TOTAL PASS
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-ok)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {totalPass.toLocaleString()}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t4)", marginTop: 2 }}>
            evaluări aprobate
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            TOTAL BLOCKED
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-er)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {totalBlocked}
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t4)", marginTop: 2 }}>
            hallucinations blocate
          </div>
        </div>
        <div
          style={{
            padding: "12px 14px",
            background: "var(--color-s900)",
            border: "1px solid var(--color-s700)",
            borderRadius: 8,
          }}
        >
          <div
            style={{
              fontSize: 9,
              color: "var(--color-t4)",
              letterSpacing: "0.06em",
              marginBottom: 4,
            }}
          >
            BLOCK RATE
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: "var(--color-wa)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {blockRate}%
          </div>
          <div style={{ fontSize: 10, color: "var(--color-t4)", marginTop: 2 }}>
            din total evaluări
          </div>
        </div>
      </div>

      {/* Guard status cards */}
      <div className="grid grid-cols-5 gap-3 mb-6 max-[900px]:grid-cols-3">
        {guardCards.map((g) => (
          <Card key={g.code} className="p-3">
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <StatusDot status={g.status} />
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "var(--color-b5)",
                }}
              >
                {g.code}
              </span>
            </div>
            <div
              style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t1)", marginBottom: 3 }}
            >
              {g.name}
            </div>
            <div
              style={{ fontSize: 9, color: "var(--color-t4)", lineHeight: 1.4, marginBottom: 6 }}
            >
              {g.description}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9 }}>
              <span style={{ color: "var(--color-ok)" }}>✓ {g.passCount}</span>
              <span style={{ color: "var(--color-er)" }}>✗ {g.blockedCount}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Audit Log */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log — Evaluări Recent</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">Ora</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Cod</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Guard</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Input</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Rezultat</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {!violationsQuery.isLoading && auditRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-t3 text-sm">
                    Nu există violări înregistrate în `guardrail_violations` pentru acest tenant.
                  </td>
                </tr>
              ) : null}
              {auditRows.map((r) => {
                const Icon = resultIcon[r.result];
                return (
                  <tr
                    key={r.id ?? `${r.time}-${r.guardCode}-${r.input.slice(0, 20)}`}
                    onClick={() => setSelectedAudit(r)}
                    className="border-b border-s800 hover:bg-s800/50 cursor-pointer"
                  >
                    <td className="px-4 py-3 text-t3 font-mono text-xs">{r.time}</td>
                    <td className="px-4 py-3">
                      <span
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "var(--color-b5)",
                          padding: "2px 6px",
                          background: "color-mix(in oklch, var(--color-b5) 15%, transparent)",
                          borderRadius: 3,
                        }}
                      >
                        {r.guardCode}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-t2">{r.guard}</td>
                    <td className="px-4 py-3 text-t1 max-w-40 truncate">{r.input}</td>
                    <td className="py-3 px-4">
                      <span
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          color: resultColor[r.result],
                          fontWeight: 700,
                          fontSize: 11,
                        }}
                      >
                        <Icon size={12} />
                        {r.result}
                      </span>
                    </td>
                    <td className={cn("px-4 py-3 text-t3")}>{r.action}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardBody>
      </Card>

      {selectedAudit && (
        <AuditDetailDrawer entry={selectedAudit} onClose={() => setSelectedAudit(null)} />
      )}
    </PageWrapper>
  );
}
