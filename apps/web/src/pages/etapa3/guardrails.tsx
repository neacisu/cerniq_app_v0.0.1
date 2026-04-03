import { useState } from "react";
import { toast } from "sonner";
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
    passCount: 1243,
    blockedCount: 3,
  },
  {
    code: "M72",
    name: "Stock Guard",
    description: "Cantitate ≤ get_available_stock(sku). Blocare automată la stoc insuficient.",
    status: "ok",
    passCount: 987,
    blockedCount: 12,
  },
  {
    code: "M73",
    name: "Discount Guard",
    description: "Discount >15% → HITL escalare SLA 4h. Discount >30% → blocare automată.",
    status: "warning",
    passCount: 445,
    blockedCount: 28,
  },
  {
    code: "M74",
    name: "SKU Guard",
    description: "SKU validat în gold_products. Coduri inexistente blocate automat.",
    status: "ok",
    passCount: 2341,
    blockedCount: 7,
  },
  {
    code: "M75",
    name: "Fiscal Guard",
    description: "CUI validat modulo-11 + TVA 19% corect + totaluri consistente.",
    status: "ok",
    passCount: 876,
    blockedCount: 2,
  },
];

const MOCK_AUDIT: AuditEntry[] = [
  {
    time: "14:32:01",
    guardCode: "M71",
    guard: "Price Guard",
    input: "Semințe Grâu × 40 — RON 5.800",
    result: "PASS",
    action: "Permis",
    detail: "Preț unit: 145 RON ≥ floor 140 RON. Discount 0%.",
  },
  {
    time: "14:31:58",
    guardCode: "M72",
    guard: "Stock Guard",
    input: "SKU-NPK-50 × 200 saci",
    result: "BLOCKED",
    action: "Respins",
    detail: "Stoc disponibil: 150 saci. Depășire cu 50 unități.",
  },
  {
    time: "14:30:12",
    guardCode: "M73",
    guard: "Discount Guard",
    input: "Discount 22% propus de agent",
    result: "WARN",
    action: "HITL Escalare",
    detail: "Discount 22% > 15%. Escalare la manager cont. SLA: 4h.",
  },
  {
    time: "14:28:45",
    guardCode: "M75",
    guard: "Fiscal Guard",
    input: "CUI: 12345678, TVA 19%",
    result: "PASS",
    action: "Permis",
    detail: "CUI valid modulo-11. TVA 19% corect. Totaluri OK.",
  },
  {
    time: "14:25:00",
    guardCode: "M71",
    guard: "Price Guard",
    input: "Preț propus: RON -10",
    result: "BLOCKED",
    action: "Respins",
    detail: "Preț negativ detectat. Tentativă hallucination blocată.",
  },
  {
    time: "14:20:33",
    guardCode: "M74",
    guard: "SKU Guard",
    input: "SKU-INVALID-999",
    result: "BLOCKED",
    action: "Respins",
    detail: "SKU inexistent în gold_products. Hallucination blocată.",
  },
];

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

  const totalPass = GUARD_TYPES.reduce((s, g) => s + g.passCount, 0);
  const totalBlocked = GUARD_TYPES.reduce((s, g) => s + g.blockedCount, 0);
  const blockRate = ((totalBlocked / (totalPass + totalBlocked)) * 100).toFixed(1);

  return (
    <PageWrapper title="Anti-Hallucination Guardrails" actions={<EtapaBadge label="Etapa 3" />}>
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
        {GUARD_TYPES.map((g) => (
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
              {MOCK_AUDIT.map((r) => {
                const Icon = resultIcon[r.result];
                return (
                  <tr
                    key={`${r.time}-${r.guardCode}`}
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
