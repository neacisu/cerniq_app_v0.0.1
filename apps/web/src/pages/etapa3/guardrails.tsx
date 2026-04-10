import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { cn } from "@/lib/utils.js";
import { X, ShieldCheck, ShieldAlert, ShieldX, Info } from "lucide-react";
import {
  useAuditLog,
  useGuardrailMetrics,
  useGuardrailStatus,
  type LlmAuditRow,
} from "@/hooks/use-guardrails.js";
import { GuardrailViolationsChart } from "@/components/etapa3/GuardrailViolationsChart.js";
import { GuardrailLatencyMetrics } from "@/components/etapa3/GuardrailLatencyMetrics.js";
import { RegenerationAttemptsPanel } from "@/components/etapa3/RegenerationAttemptsPanel.js";
import { ModelRoutingTable } from "@/components/etapa3/ModelRoutingTable.js";

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
    status: "ok",
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

function hasJsonViolations(row: LlmAuditRow): boolean {
  return Array.isArray(row.guardrailViolations) && row.guardrailViolations.length > 0;
}

function resolveAuditResult(row: LlmAuditRow, hasViolations: boolean): AuditResult {
  if (row.guardrailPassed && hasViolations === false) return "PASS";
  if (row.guardrailPassed === false) return "BLOCKED";
  return "WARN";
}

function resolveGuardCode(row: LlmAuditRow, hasViolations: boolean): string {
  if (hasViolations === false) return "M73";
  const arr = row.guardrailViolations;
  if (arr === undefined || arr === null || arr.length === 0) return "M73";
  const first = arr[0] as { violationType?: string };
  return violationTypeToCode(first?.violationType ?? null);
}

function buildAuditDetailStr(row: LlmAuditRow, hasViolations: boolean): string {
  const detailPayload = hasViolations
    ? row.guardrailViolations
    : (row.llmguardScores ?? row.allResponses);
  if (detailPayload === null || detailPayload === undefined) return "—";
  return JSON.stringify(detailPayload).slice(0, 600);
}

function resolveAuditAction(row: LlmAuditRow, result: AuditResult): string {
  if (row.regenerationAttempt > 0) return `Regenerare ×${row.regenerationAttempt}`;
  if (result === "PASS") return "OK";
  if (result === "WARN") return "Atenție";
  return "Blocat";
}

function mapLlmAuditToAuditEntry(row: LlmAuditRow): AuditEntry {
  const hasViolations = hasJsonViolations(row);
  const result = resolveAuditResult(row, hasViolations);
  const guardCode = resolveGuardCode(row, hasViolations);
  const detailStr = buildAuditDetailStr(row, hasViolations);
  const action = resolveAuditAction(row, result);

  return {
    id: row.id,
    time: new Date(row.createdAt).toLocaleString("ro-RO", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
    guardCode,
    guard: codeToGuardName(guardCode),
    input: row.promptHash.length > 28 ? `${row.promptHash.slice(0, 28)}…` : row.promptHash,
    result,
    action,
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
          <div style={{ fontSize: 9, color: "var(--color-t4)", marginBottom: 4 }}>PROMPT HASH</div>
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
              DETALIU (violări / scoruri)
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

function countForViolationType(
  rows: Array<{ violationType: string; count: number }>,
  code: string,
): number {
  const want = {
    M71: "price",
    M72: "stock",
    M73: "discount",
    M74: "sku",
    M75: "fiscal",
  }[code];
  if (!want) return 0;
  const hit = rows.find((r) => (r.violationType ?? "").toLowerCase() === want);
  return hit?.count ?? 0;
}

export function Guardrails() {
  const [selectedAudit, setSelectedAudit] = useState<AuditEntry | null>(null);

  const statusQuery = useGuardrailStatus();
  const metricsQuery = useGuardrailMetrics(30);
  const auditQuery = useAuditLog({ limit: 50, type: "guardrail" });

  const auditRows = useMemo(() => {
    const raw = auditQuery.data?.data ?? [];
    return raw.map(mapLlmAuditToAuditEntry);
  }, [auditQuery.data]);

  const guardCards = useMemo(() => {
    const byTypeRows = statusQuery.data?.data?.by_violation_type ?? [];
    return GUARD_TYPES.map((g) => {
      const blocked = countForViolationType(byTypeRows, g.code);
      let status: GuardStatus = "ok";
      if (blocked > 10) status = "error";
      else if (blocked > 0) status = "warning";
      return {
        ...g,
        passCount: 0,
        blockedCount: blocked,
        status,
      };
    });
  }, [statusQuery.data]);

  const llm7 = metricsQuery.data?.data?.llm_audit_7d;
  const totalPass = llm7?.passed ?? 0;
  const totalBlocked = llm7?.failed ?? 0;
  const blockRateDenom = totalPass + totalBlocked;
  const blockRate = blockRateDenom > 0 ? ((totalBlocked / blockRateDenom) * 100).toFixed(1) : "0.0";

  function firstErrorMessage(): string | null {
    if (statusQuery.error instanceof Error) return statusQuery.error.message;
    if (auditQuery.error instanceof Error) return auditQuery.error.message;
    if (metricsQuery.error instanceof Error) return metricsQuery.error.message;
    return null;
  }
  const err = firstErrorMessage();

  const metrics = metricsQuery.data?.data;
  const violationPoints = metrics?.violations_daily_last_7_days ?? [];
  const latencyRows = metrics?.latency_ms_by_queue ?? [];
  const modelRows = metrics?.model_routing ?? [];

  return (
    <PageWrapper title="Anti-Hallucination Guardrails" actions={<EtapaBadge label="Etapa 3" />}>
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}
      {(statusQuery.isLoading || metricsQuery.isLoading) && !statusQuery.data ? (
        <p className="text-sm text-t3 mb-4">Se încarcă status guardrail din API…</p>
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
            5 reguli + audit LLM (7z)
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
            TOTAL PASS (audit LLM 7z)
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
            apeluri trecute guard
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
            TOTAL FAIL (audit LLM 7z)
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
            eșuat guardrailPassed
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
            din apeluri audit 7z
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 mb-6">
        <GuardrailViolationsChart points={violationPoints} isLoading={metricsQuery.isLoading} />
        <div className="grid grid-cols-1 gap-4">
          <RegenerationAttemptsPanel
            totalAttempts={metrics?.regeneration.totalAttempts ?? "0"}
            callsWithRegeneration={metrics?.regeneration.callsWithRegeneration ?? 0}
            windowDays={metrics?.regeneration.windowDays ?? 30}
          />
        </div>
      </div>

      <div className="mb-6">
        <GuardrailLatencyMetrics
          rows={latencyRows}
          windowDays={metrics?.regeneration.windowDays ?? 30}
          isLoading={metricsQuery.isLoading}
        />
      </div>

      <div className="mb-6">
        <ModelRoutingTable
          rows={modelRows}
          windowDays={metrics?.regeneration.windowDays ?? 30}
          isLoading={metricsQuery.isLoading}
        />
      </div>

      {/* Guard status cards — violări din gold.guardrail_violations (agregat) */}
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
              <span style={{ color: "var(--color-t3)" }}>violări înregistrate</span>
              <span style={{ color: "var(--color-er)" }}>{g.blockedCount}</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Audit Log — GET /api/v1/ai/audit-log?type=guardrail */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Log — Apeluri LLM (filtru guardrail)</CardTitle>
        </CardHeader>
        <CardBody className="p-0 overflow-x-auto">
          {auditQuery.isLoading ? (
            <p className="px-4 py-6 text-sm text-t3">Se încarcă audit LLM…</p>
          ) : null}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-s700">
                <th className="px-4 py-3 text-left font-medium text-t3">Ora</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Cod</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Guard</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Hash prompt</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Rezultat</th>
                <th className="px-4 py-3 text-left font-medium text-t3">Acțiune</th>
              </tr>
            </thead>
            <tbody>
              {!auditQuery.isLoading && auditRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-t3 text-sm">
                    Nu există înregistrări în audit LLM pentru filtrul guardrail (trecut / violări
                    JSON / regenerări) în această fereastră.
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
                    <td className="px-4 py-3 text-t1 max-w-40 truncate font-mono text-xs">
                      {r.input}
                    </td>
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
