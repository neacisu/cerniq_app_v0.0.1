/**
 * NegotiationConversation — E3 AI Sales Agent
 *
 * Date din API: listă negocieri, detaliu (+ companie Gold), mesaje AI, violări guardrail.
 */
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { ChatMessage } from "@/components/data/ChatMessage.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
import { api } from "@/lib/api.js";
import { toast } from "sonner";
import {
  Shield,
  Package,
  Percent,
  Tag,
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Bot,
  Building2,
  CreditCard,
  TrendingUp,
  Info,
} from "lucide-react";

const FSM_STATES = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSING",
  "PROFORMA_SENT",
  "INVOICED",
  "PAID",
  "DEAD",
] as const;
type FsmState = (typeof FSM_STATES)[number];

function fsmStateColor(state: FsmState): string {
  const map: Record<FsmState, string> = {
    DISCOVERY: "var(--color-in)",
    PROPOSAL: "var(--color-b5)",
    NEGOTIATION: "var(--color-wa)",
    CLOSING: "oklch(0.55 0.18 145)",
    PROFORMA_SENT: "oklch(0.5 0.15 200)",
    INVOICED: "var(--color-ok)",
    PAID: "var(--color-ok)",
    DEAD: "var(--color-er)",
  };
  return map[state] ?? "var(--color-t3)";
}

type GuardrailStatus = "PASS" | "WARN" | "FAIL" | "PENDING";

interface GuardrailBadgeProps {
  readonly label: string;
  readonly icon: React.ElementType;
  readonly status: GuardrailStatus;
  readonly detail?: string;
}

function GuardrailBadge({ label, icon: Icon, status, detail }: GuardrailBadgeProps) {
  const colors: Record<GuardrailStatus, string> = {
    PASS: "var(--color-ok)",
    WARN: "var(--color-wa)",
    FAIL: "var(--color-er)",
    PENDING: "var(--color-t3)",
  };
  const color = colors[status];

  return (
    <div
      title={detail}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 6px",
        background: `color-mix(in oklch, ${color} 12%, transparent)`,
        border: `1px solid color-mix(in oklch, ${color} 40%, transparent)`,
        borderRadius: 4,
        fontSize: 10,
        color,
        fontWeight: 600,
        cursor: detail ? "help" : "default",
      }}
    >
      <Icon size={9} strokeWidth={2.5} aria-hidden />
      <span>{label}</span>
      {status === "WARN" && <AlertTriangle size={9} strokeWidth={2.5} aria-hidden />}
      {status === "PASS" && <CheckCircle2 size={9} strokeWidth={2.5} aria-hidden />}
    </div>
  );
}

function parseFsmState(raw: string | undefined): FsmState {
  const s = (raw ?? "DISCOVERY").toUpperCase();
  return (FSM_STATES as readonly string[]).includes(s) ? (s as FsmState) : "DISCOVERY";
}

function formatMoney(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return String(v);
  return `RON ${n.toLocaleString("ro-RO", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function mapMessageRole(role: string | undefined): "outgoing" | "incoming" | "ai" | "system" {
  const r = (role ?? "").toLowerCase();
  if (r === "assistant" || r === "ai" || r === "model") return "ai";
  if (r === "user" || r === "human") return "outgoing";
  if (r === "system" || r === "tool") return "system";
  return "incoming";
}

type GuardKey = "price" | "stock" | "discount" | "sku" | "fiscal";

function defaultGuardrails(): Record<GuardKey, GuardrailStatus> {
  return {
    price: "PENDING",
    stock: "PENDING",
    discount: "PENDING",
    sku: "PENDING",
    fiscal: "PENDING",
  };
}

function severityToStatus(sev: string | undefined): GuardrailStatus {
  const u = (sev ?? "").toUpperCase();
  if (u === "CRITICAL" || u === "HIGH") return "FAIL";
  if (u === "MEDIUM") return "WARN";
  if (u === "LOW") return "WARN";
  return "FAIL";
}

type ViolationRow = {
  violationType?: string | null;
  severity?: string | null;
};

function buildGuardrailsFromViolations(rows: ViolationRow[]): Record<GuardKey, GuardrailStatus> {
  const g = defaultGuardrails();
  for (const row of rows) {
    const t = (row.violationType ?? "").toLowerCase();
    const st = severityToStatus(row.severity ?? undefined);
    if (t === "price") g.price = st;
    else if (t === "stock") g.stock = st;
    else if (t === "discount") g.discount = st;
    else if (t === "sku") g.sku = st;
    else if (t === "fiscal") g.fiscal = st;
  }
  return g;
}

function getGuardrailColor(s: GuardrailStatus): string {
  if (s === "PASS") return "var(--color-ok)";
  if (s === "WARN") return "var(--color-wa)";
  if (s === "FAIL") return "var(--color-er)";
  return "var(--color-t4)";
}

function getNegotiationCardBorderColor(isActive: boolean, hasWarn: boolean): string | undefined {
  if (isActive) return "var(--color-b5)";
  if (hasWarn) return "color-mix(in oklch, var(--color-wa) 50%, transparent)";
  return undefined;
}

function getFsmStepColor(state: FsmState, isActive: boolean, isPast: boolean): string {
  if (isActive) return fsmStateColor(state);
  if (isPast) return "var(--color-ok)";
  return "var(--color-t4)";
}

function FsmStepper({ currentState }: { readonly currentState: FsmState }) {
  const currentIdx = FSM_STATES.indexOf(currentState);

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap", margin: "8px 0" }}
    >
      {FSM_STATES.map((state, idx) => {
        const isActive = idx === currentIdx;
        const isPast = idx < currentIdx;
        const color = getFsmStepColor(state, isActive, isPast);

        return (
          <div key={state} style={{ display: "flex", alignItems: "center", gap: 2 }}>
            <div
              style={{
                padding: "2px 6px",
                borderRadius: 3,
                fontSize: 8,
                fontWeight: isActive ? 700 : 500,
                background: isActive
                  ? `color-mix(in oklch, ${color} 20%, transparent)`
                  : "transparent",
                border: `1px solid ${isActive ? color : "transparent"}`,
                color,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
              }}
            >
              {state.replaceAll("_", " ")}
            </div>
            {idx < FSM_STATES.length - 1 && <ChevronRight size={8} color="var(--color-t4)" />}
          </div>
        );
      })}
    </div>
  );
}

type CompanyGold = {
  denumire?: string | null;
  denumireComerciala?: string | null;
  cui?: string | null;
  limitaCreditEur?: string | null;
  limitaCreditCalculata?: string | null;
  limitaCreditAprobata?: string | null;
  leadScore?: string | number | null;
  categorieRisc?: string | null;
};

type NegotiationDetail = {
  currentState?: string;
  totalValue?: string | number | null;
  company?: CompanyGold | null;
  companyName?: string | null;
};

type ListRow = {
  id: string;
  currentState?: string;
  companyName?: string | null;
  totalValue?: string | number | null;
};

type SidebarModel = {
  company: string;
  cui: string;
  value: string;
  state: FsmState;
  guardrails: Record<GuardKey, GuardrailStatus>;
  creditLimitLabel: string;
  scoreLabel: string;
  riskTier: string | null;
};

function GoldSidebar({ model }: { readonly model: SidebarModel }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Card>
        <CardBody className="py-3 px-4">
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: 6,
                background: "var(--color-s700)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={16} color="var(--color-b5)" />
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--color-t1)" }}>
                {model.company}
              </div>
              <div
                style={{ fontSize: 10, color: "var(--color-t3)", fontFamily: "var(--font-mono)" }}
              >
                CUI: {model.cui}
              </div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 6,
              fontSize: 11,
            }}
          >
            <div>
              <div style={{ color: "var(--color-t3)", fontSize: 9, marginBottom: 1 }}>VALOARE</div>
              <div style={{ color: "var(--color-b5)", fontWeight: 600 }}>{model.value}</div>
            </div>
            <div>
              <div style={{ color: "var(--color-t3)", fontSize: 9, marginBottom: 1 }}>AGENT</div>
              <div
                style={{ color: "var(--color-t2)", display: "flex", alignItems: "center", gap: 3 }}
              >
                <Bot size={10} />
                AI Agent
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4">
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t2)" }}>
            Guardrails Live
          </div>
        </CardHeader>
        <CardBody className="py-2 px-4">
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M71 Preț</span>
              <GuardrailBadge
                label="PRICE"
                icon={Tag}
                status={model.guardrails.price}
                detail="Violări din guardrail_violations (API)"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M72 Stoc</span>
              <GuardrailBadge
                label="STOCK"
                icon={Package}
                status={model.guardrails.stock}
                detail="Violări din guardrail_violations (API)"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M73 Discount</span>
              <GuardrailBadge
                label="DISC"
                icon={Percent}
                status={model.guardrails.discount}
                detail="Violări din guardrail_violations (API)"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M74 SKU</span>
              <GuardrailBadge
                label="SKU"
                icon={FileCheck}
                status={model.guardrails.sku}
                detail="Violări din guardrail_violations (API)"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M75 Fiscal</span>
              <GuardrailBadge
                label="FISC"
                icon={Shield}
                status={model.guardrails.fiscal}
                detail="Violări din guardrail_violations (API)"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader className="py-2 px-4">
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t2)" }}>
            Profil Gold — credit
          </div>
        </CardHeader>
        <CardBody className="py-2 px-4">
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{ color: "var(--color-t3)", display: "flex", alignItems: "center", gap: 3 }}
              >
                <CreditCard size={10} /> Limită (EUR)
              </span>
              <span style={{ color: "var(--color-t1)", fontWeight: 600 }}>
                {model.creditLimitLabel}
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{ color: "var(--color-t3)", display: "flex", alignItems: "center", gap: 3 }}
              >
                <TrendingUp size={10} /> Scor lead
              </span>
              <span style={{ color: "var(--color-ok)", fontWeight: 600 }}>{model.scoreLabel}</span>
            </div>
            {model.riskTier ? (
              <div
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}
              >
                <span style={{ color: "var(--color-t3)" }}>Risc</span>
                <span style={{ color: "var(--color-t2)", fontWeight: 600 }}>{model.riskTier}</span>
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          background: "color-mix(in oklch, var(--color-neuron-tool) 10%, transparent)",
          border: "1px solid color-mix(in oklch, var(--color-neuron-tool) 30%, transparent)",
          borderRadius: 6,
          fontSize: 10,
          color: "var(--color-t3)",
        }}
        title="Conform Art.13 EU AI Act - transparență AI"
      >
        <Bot size={12} color="var(--color-neuron-tool)" />
        <span>Mesajele marcate cu ✦ sunt generate de AI. Conform EU AI Act Art.13.</span>
        <Info size={10} color="var(--color-neuron-tool)" />
      </div>
    </div>
  );
}

function formatEurLimit(v: string | number | null | undefined): string {
  if (v == null || v === "") return "—";
  const n = typeof v === "number" ? v : Number.parseFloat(String(v));
  if (!Number.isFinite(n)) return String(v);
  return `EUR ${n.toLocaleString("ro-RO", { maximumFractionDigits: 0 })}`;
}

export function NegotiationConversation() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState("");

  const listQuery = useQuery({
    queryKey: ["negotiation", "conversation", "list"],
    queryFn: () =>
      api.get<{ success?: boolean; data?: ListRow[] }>("/api/v1/negotiation?page=1&limit=100"),
  });

  const negotiations = useMemo(() => listQuery.data?.data ?? [], [listQuery.data?.data]);

  const effectiveId = useMemo(() => {
    if (negotiations.length === 0) return null;
    if (selectedId && negotiations.some((n) => n.id === selectedId)) return selectedId;
    return negotiations[0]?.id ?? null;
  }, [negotiations, selectedId]);

  const detailQuery = useQuery({
    queryKey: ["negotiation", "conversation", "detail", effectiveId],
    queryFn: () =>
      api.get<{ success?: boolean; data?: NegotiationDetail }>(
        `/api/v1/negotiation/${effectiveId}`,
      ),
    enabled: Boolean(effectiveId),
  });

  const messagesQuery = useQuery({
    queryKey: ["negotiation", "conversation", "messages", effectiveId],
    queryFn: () =>
      api.get<{
        success?: boolean;
        data?: { role?: string; content?: string | null; createdAt?: string }[];
      }>(`/api/v1/negotiation/${effectiveId}/messages?limit=80`),
    enabled: Boolean(effectiveId),
  });

  const guardrailsQuery = useQuery({
    queryKey: ["negotiation", "conversation", "guardrails", effectiveId],
    queryFn: () =>
      api.get<{ success?: boolean; data?: ViolationRow[] }>(
        `/api/v1/negotiation/${effectiveId}/guardrails?limit=50`,
      ),
    enabled: Boolean(effectiveId),
  });

  const sidebarModel = useMemo((): SidebarModel | null => {
    if (!effectiveId) return null;
    const d = detailQuery.data?.data;
    const row = negotiations.find((n) => n.id === effectiveId);
    const comp = d?.company;
    const company =
      comp?.denumire ?? comp?.denumireComerciala ?? d?.companyName ?? row?.companyName ?? "—";
    const cui = comp?.cui ?? "—";
    const state = parseFsmState(d?.currentState ?? row?.currentState);
    const value = formatMoney(d?.totalValue ?? row?.totalValue);
    const violations = guardrailsQuery.data?.data ?? [];
    const guardrails =
      violations.length > 0 ? buildGuardrailsFromViolations(violations) : defaultGuardrails();
    const credit =
      comp?.limitaCreditAprobata ?? comp?.limitaCreditCalculata ?? comp?.limitaCreditEur;
    const scoreRaw = comp?.leadScore;
    let scoreLabel = "—";
    if (scoreRaw != null && scoreRaw !== "") {
      const n = typeof scoreRaw === "number" ? scoreRaw : Number.parseFloat(String(scoreRaw));
      scoreLabel = Number.isFinite(n) ? `${n.toFixed(0)}/100` : String(scoreRaw);
    }
    return {
      company,
      cui,
      value,
      state,
      guardrails,
      creditLimitLabel: formatEurLimit(credit ?? undefined),
      scoreLabel,
      riskTier: comp?.categorieRisc ?? null,
    };
  }, [effectiveId, detailQuery.data, guardrailsQuery.data, negotiations]);

  const messages = useMemo(() => {
    const raw = messagesQuery.data?.data ?? [];
    return raw.map((m) => ({
      type: mapMessageRole(m.role),
      content: m.content ?? "",
      timestamp: m.createdAt
        ? new Date(m.createdAt).toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })
        : undefined,
    }));
  }, [messagesQuery.data]);

  function handleSend() {
    const text = inputValue.trim();
    if (!text || !effectiveId) return;
    toast.info(
      "Trimiterea mesajelor din UI nu are încă endpoint POST pe API — mesajele reale provin din conversațiile înregistrate de workeri.",
    );
    setInputValue("");
  }

  const listErr = listQuery.error instanceof Error ? listQuery.error.message : null;
  const selectedState = sidebarModel?.state ?? "DISCOVERY";
  const selectedCompany = sidebarModel?.company ?? "";

  return (
    <PageWrapper title="AI Sales — Conversation" actions={<EtapaBadge label="Etapa 3" />}>
      {listErr ? (
        <p className="text-sm text-er mb-4" role="alert">
          {listErr}
        </p>
      ) : null}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 300px",
          gap: 12,
          height: "calc(100vh - 140px)",
          minHeight: 500,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 8, overflowY: "auto" }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--color-t3)",
              padding: "0 4px",
              letterSpacing: "0.05em",
            }}
          >
            NEGOCIERI ACTIVE
          </div>
          {listQuery.isLoading ? (
            <div style={{ fontSize: 12, color: "var(--color-t3)" }}>Se încarcă…</div>
          ) : null}
          {!listQuery.isLoading && negotiations.length === 0 ? (
            <div style={{ fontSize: 12, color: "var(--color-t3)" }}>
              Nu există negocieri pentru acest tenant.
            </div>
          ) : null}
          {negotiations.map((n) => {
            const isActive = n.id === effectiveId;
            const st = parseFsmState(n.currentState);
            const gr = isActive && sidebarModel ? sidebarModel.guardrails : null;
            const hasWarn = gr
              ? Object.values(gr).some((s) => s === "WARN" || s === "FAIL")
              : false;

            return (
              <Card
                key={n.id}
                className={cn("cursor-pointer transition-all", isActive && "border-b5")}
                onClick={() => setSelectedId(n.id)}
                style={{
                  borderColor: getNegotiationCardBorderColor(isActive, hasWarn),
                  boxShadow: isActive ? "0 0 0 1px var(--color-b5)" : undefined,
                }}
              >
                <CardBody className="py-3 px-4">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: 4,
                    }}
                  >
                    <div style={{ fontSize: 12, fontWeight: 600, color: "var(--color-t1)" }}>
                      {n.companyName ?? "—"}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: fsmStateColor(st),
                        padding: "1px 5px",
                        border: `1px solid ${fsmStateColor(st)}`,
                        borderRadius: 3,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {st}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-t3)", marginBottom: 6 }}>
                    {formatMoney(n.totalValue)}
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {(["price", "stock", "discount", "sku", "fiscal"] as const).map((g) => {
                      const iconMap = {
                        price: Tag,
                        stock: Package,
                        discount: Percent,
                        sku: FileCheck,
                        fiscal: Shield,
                      };
                      const Icon = iconMap[g];
                      const color = gr ? getGuardrailColor(gr[g]) : "var(--color-t4)";
                      return <Icon key={g} size={10} color={color} aria-label={g} />;
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
          {effectiveId && sidebarModel ? (
            <Card style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-s700)" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-t1)",
                    marginBottom: 4,
                  }}
                >
                  {selectedCompany}
                </div>
                <FsmStepper currentState={selectedState} />
              </div>

              <div
                style={{
                  flex: 1,
                  overflowY: "auto",
                  padding: "12px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {messagesQuery.isLoading ? (
                  <div style={{ fontSize: 12, color: "var(--color-t3)" }}>Se încarcă mesaje…</div>
                ) : null}
                {!messagesQuery.isLoading && messages.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--color-t3)" }}>
                    Nu există mesaje în conversațiile AI pentru această negociere.
                  </div>
                ) : null}
                {messages.map((m, idx) => (
                  <ChatMessage key={`${m.type}-${idx}`} type={m.type} timestamp={m.timestamp}>
                    <span>
                      {m.type === "ai" && "✦ "}
                      {m.content}
                    </span>
                  </ChatMessage>
                ))}
              </div>

              <div
                style={{
                  padding: "10px 16px",
                  borderTop: "1px solid var(--color-s700)",
                  display: "flex",
                  gap: 8,
                }}
              >
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Scrie mesaj sau comandă AI..."
                  style={{ flex: 1 }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && inputValue.trim()) handleSend();
                  }}
                />
                <Button size="sm" disabled={!inputValue.trim()} onClick={handleSend}>
                  Trimite
                </Button>
              </div>
            </Card>
          ) : (
            <div
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-t3)",
                fontSize: 13,
              }}
            >
              Selectează o negociere
            </div>
          )}
        </div>

        <div style={{ overflowY: "auto" }}>
          {sidebarModel ? (
            <GoldSidebar model={sidebarModel} />
          ) : (
            <div
              style={{
                textAlign: "center",
                color: "var(--color-t4)",
                fontSize: 12,
                paddingTop: 40,
              }}
            >
              Selectează o negociere pentru detalii Gold
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
