/**
 * NegotiationConversation — E3 AI Sales Agent
 *
 * Layout: 3 coloane
 * - Stânga (320px): Lista negocieri + FSM state badges
 * - Centru: Chat AI cu mesaje, input, guardrail badges inline
 * - Dreapta (300px): Sidebar Gold (detalii companie + scor credit)
 *
 * Plan: §XII L9476 — "chat AI + FSM state + guardrail indicators"
 * Guardrails: M71 price ✓, M72 stock ✓, M73 discount ⚠, M74 SKU ✓, M75 fiscal ✓
 * FSM: DISCOVERY → PROPOSAL → NEGOTIATION → CLOSING → PROFORMA_SENT → INVOICED → PAID
 */
import { useState, useRef } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Input } from "@/components/ui/input.js";
import { SBadge } from "@/components/ui/badge.js";
import { ChatMessage } from "@/components/data/ChatMessage.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
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

// ─── FSM States ───────────────────────────────────────────────────────────────

const FSM_STATES = [
  "DISCOVERY",
  "PROPOSAL",
  "NEGOTIATION",
  "CLOSING",
  "PROFORMA_SENT",
  "INVOICED",
  "PAID",
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
  };
  return map[state] ?? "var(--color-t3)";
}

// ─── Guardrail Badge ──────────────────────────────────────────────────────────

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

interface NegotiationItem {
  id: string;
  company: string;
  cui: string;
  state: FsmState;
  value: string;
  assignedTo: string;
  lastMessage: string;
  guardrails: {
    price: GuardrailStatus;
    stock: GuardrailStatus;
    discount: GuardrailStatus;
    sku: GuardrailStatus;
    fiscal: GuardrailStatus;
  };
}

const MOCK_NEGOTIATIONS: NegotiationItem[] = [
  {
    id: "neg-001",
    company: "SC AgroSud SRL",
    cui: "12345678",
    state: "NEGOTIATION",
    value: "EUR 23.400",
    assignedTo: "AI Agent",
    lastMessage: "Reducerea solicitată de 25% este sub limita aprobată automat.",
    guardrails: { price: "PASS", stock: "PASS", discount: "WARN", sku: "PASS", fiscal: "PASS" },
  },
  {
    id: "neg-002",
    company: "Cooperativa Agriland",
    cui: "87654321",
    state: "PROPOSAL",
    value: "EUR 12.000",
    assignedTo: "AI Agent",
    lastMessage: "Ofertă trimisă cu prețuri standard.",
    guardrails: { price: "PASS", stock: "PASS", discount: "PASS", sku: "PASS", fiscal: "PASS" },
  },
  {
    id: "neg-003",
    company: "OUAI Ialomița Nord",
    cui: "11223344",
    state: "CLOSING",
    value: "EUR 8.200",
    assignedTo: "AI Agent",
    lastMessage: "Client confirmă comanda. Se generează proforma.",
    guardrails: { price: "PASS", stock: "PASS", discount: "PASS", sku: "PASS", fiscal: "PENDING" },
  },
  {
    id: "neg-004",
    company: "SC Ferma Dunărea SA",
    cui: "99887766",
    state: "DISCOVERY",
    value: "EUR 45.000+",
    assignedTo: "AI Agent",
    lastMessage: "Client interesat de produse premium. Solicită catalog.",
    guardrails: {
      price: "PENDING",
      stock: "PENDING",
      discount: "PENDING",
      sku: "PENDING",
      fiscal: "PENDING",
    },
  },
];

interface ConversationMessage {
  type: "outgoing" | "incoming" | "ai" | "system";
  content: string;
  timestamp?: string;
  guardrailsPassed?: boolean;
}

const MOCK_CONVERSATIONS: Record<string, ConversationMessage[]> = {
  "neg-001": [
    {
      type: "incoming",
      content: "Bună ziua! Suntem interesați de produsele dvs. de semințe pentru sezonul următor.",
      timestamp: "09:12",
    },
    {
      type: "ai",
      content:
        "Am analizat profilul companiei. Recomand ofertă personalizată cu -15% discount sezonier (sub pragul auto-approve 15%).",
      timestamp: "09:12",
    },
    {
      type: "outgoing",
      content:
        "Bună ziua! Vă mulțumim pentru interes. Am pregătit o ofertă adaptată pentru sezonul 2026.",
      timestamp: "09:13",
    },
    {
      type: "incoming",
      content: "Mulțumim pentru ofertă. Puteți oferi discount 25%? Avem un buget limitat.",
      timestamp: "09:45",
    },
    {
      type: "ai",
      content:
        "⚠️ Guardrail M73: Discount 25% > prag auto-approve 15%. Necesită HITL manager (SLA 4h). Margin check: 18% > 8% minim ✓",
      timestamp: "09:45",
      guardrailsPassed: false,
    },
    { type: "system", content: "HITL escalat — manager notificat. SLA: 4h." },
  ],
  "neg-002": [
    {
      type: "ai",
      content:
        "Lead calificat: scor credit 8.2/10, fără litigii ANAF. Ofertă standard recomandată.",
      timestamp: "10:00",
    },
    {
      type: "outgoing",
      content: "Bună ziua! Vă trimitem oferta pentru sezonul 2026. Prețuri valabile 30 zile.",
      timestamp: "10:02",
    },
    { type: "incoming", content: "Mulțumesc, analizăm oferta.", timestamp: "10:30" },
  ],
  "neg-003": [
    { type: "incoming", content: "Confirmăm comanda conform ultimei oferte.", timestamp: "14:00" },
    {
      type: "ai",
      content:
        "✓ Toate guardrailele PASS. Se inițiază tranziție FSM: CLOSING → PROFORMA_SENT. Oblio API call pregătit.",
      timestamp: "14:00",
    },
    {
      type: "outgoing",
      content: "Excelent! Vă transmitem proforma în câteva minute.",
      timestamp: "14:01",
    },
    { type: "system", content: "Proforma generată via Oblio. eFactura SPV — deadline D+5." },
  ],
  "neg-004": [
    {
      type: "ai",
      content:
        "Lead nou identificat. Profil Gold complet. Se inițiază context window pentru agent.",
      timestamp: "15:00",
    },
    {
      type: "outgoing",
      content: "Bună ziua! Mulțumim pentru interes în produsele noastre premium.",
      timestamp: "15:01",
    },
    {
      type: "incoming",
      content: "Bună! Da, suntem interesați. Puteți trimite catalogul complet?",
      timestamp: "15:20",
    },
  ],
};

function getFsmStepColor(state: FsmState, isActive: boolean, isPast: boolean): string {
  if (isActive) return fsmStateColor(state);
  if (isPast) return "var(--color-ok)";
  return "var(--color-t4)";
}

// ─── Guardrail Status Color ────────────────────────────────────────────────────

function getGuardrailColor(s: GuardrailStatus): string {
  if (s === "PASS") return "var(--color-ok)";
  if (s === "WARN") return "var(--color-wa)";
  if (s === "FAIL") return "var(--color-er)";
  return "var(--color-t4)";
}

// ─── Negotiation Card Border Color ────────────────────────────────────────────

function getNegotiationCardBorderColor(isActive: boolean, hasWarn: boolean): string | undefined {
  if (isActive) return "var(--color-b5)";
  if (hasWarn) return "color-mix(in oklch, var(--color-wa) 50%, transparent)";
  return undefined;
}

// ─── FSM Stepper ──────────────────────────────────────────────────────────────

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

// ─── Gold Sidebar ─────────────────────────────────────────────────────────────

function GoldSidebar({ negotiation }: { readonly negotiation: NegotiationItem }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Company header */}
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
                {negotiation.company}
              </div>
              <div
                style={{ fontSize: 10, color: "var(--color-t3)", fontFamily: "var(--font-mono)" }}
              >
                CUI: {negotiation.cui}
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
              <div style={{ color: "var(--color-b5)", fontWeight: 600 }}>{negotiation.value}</div>
            </div>
            <div>
              <div style={{ color: "var(--color-t3)", fontSize: 9, marginBottom: 1 }}>AGENT</div>
              <div
                style={{ color: "var(--color-t2)", display: "flex", alignItems: "center", gap: 3 }}
              >
                <Bot size={10} />
                {negotiation.assignedTo}
              </div>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Guardrails panel */}
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
                status={negotiation.guardrails.price}
                detail="Preț AI validat contra gold_products.unit_price"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M72 Stoc</span>
              <GuardrailBadge
                label="STOCK"
                icon={Package}
                status={negotiation.guardrails.stock}
                detail="Stoc disponibil verificat contra get_available_stock(sku)"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M73 Discount</span>
              <GuardrailBadge
                label="DISC"
                icon={Percent}
                status={negotiation.guardrails.discount}
                detail={
                  negotiation.guardrails.discount === "WARN"
                    ? "Discount > 15%: necesită HITL manager"
                    : "Discount în limite automate"
                }
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M74 SKU</span>
              <GuardrailBadge
                label="SKU"
                icon={FileCheck}
                status={negotiation.guardrails.sku}
                detail="SKU validat în gold_products"
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 10, color: "var(--color-t3)" }}>M75 Fiscal</span>
              <GuardrailBadge
                label="FISC"
                icon={Shield}
                status={negotiation.guardrails.fiscal}
                detail="CUI valid modulo-11 + TVA rate + totale"
              />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Credit info */}
      <Card>
        <CardHeader className="py-2 px-4">
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--color-t2)" }}>
            Profil Credit
          </div>
        </CardHeader>
        <CardBody className="py-2 px-4">
          <div style={{ display: "flex", flexDirection: "column", gap: 5, fontSize: 11 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{ color: "var(--color-t3)", display: "flex", alignItems: "center", gap: 3 }}
              >
                <CreditCard size={10} /> Limită
              </span>
              <span style={{ color: "var(--color-t1)", fontWeight: 600 }}>EUR 50.000</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span
                style={{ color: "var(--color-t3)", display: "flex", alignItems: "center", gap: 3 }}
              >
                <TrendingUp size={10} /> Scor
              </span>
              <span style={{ color: "var(--color-ok)", fontWeight: 600 }}>82/100 HIGH</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "var(--color-t3)" }}>Tier</span>
              <SBadge status="PREMIUM" />
            </div>
          </div>
        </CardBody>
      </Card>

      {/* AI info badge */}
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
        <span>Mesajele marcate cu ✦ sunt generate de AI (QwQ-32B). Conform EU AI Act Art.13.</span>
        <Info size={10} color="var(--color-neuron-tool)" />
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const AI_AUTO_REPLIES: string[] = [
  "✦ Am recepționat mesajul. Analizez contextul negocierii și istoricul clientului...",
  "✦ Pe baza profilului Gold al clientului, recomand o abordare consultativă. Limita de discount aprobată automat: 15%.",
  "✦ Guardrail M71 verificat: prețul propus este în parametri (±0% față de gold_products.unit_price).",
  "✦ Context window actualizat. Următorul pas recomandat în FSM: tranziție la PROPOSAL cu ofertă personalizată.",
  "✦ Am identificat pattern de cumpărare sezonier. Recomand bundle promotie Sezon 2026 pentru fidelizare.",
];

export function NegotiationConversation() {
  const [selectedId, setSelectedId] = useState<string | null>("neg-001");
  const [inputValue, setInputValue] = useState("");
  const [extraMessages, setExtraMessages] = useState<Record<string, ConversationMessage[]>>({});
  const aiReplyIndexRef = useRef(0);

  const selected = selectedId ? MOCK_NEGOTIATIONS.find((n) => n.id === selectedId) : null;
  const baseMessages = selectedId ? (MOCK_CONVERSATIONS[selectedId] ?? []) : [];
  const extras = selectedId ? (extraMessages[selectedId] ?? []) : [];
  const messages = [...baseMessages, ...extras];

  function handleSend() {
    const text = inputValue.trim();
    if (!text || !selectedId) return;

    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const userMsg: ConversationMessage = { type: "outgoing", content: text, timestamp: ts };
    const aiReply: ConversationMessage = {
      type: "ai",
      content:
        AI_AUTO_REPLIES[aiReplyIndexRef.current % AI_AUTO_REPLIES.length] ??
        AI_AUTO_REPLIES[0] ??
        "",
      timestamp: ts,
    };
    aiReplyIndexRef.current++;

    setExtraMessages((prev) => ({
      ...prev,
      [selectedId]: [...(prev[selectedId] ?? []), userMsg, aiReply],
    }));
    setInputValue("");
  }

  return (
    <PageWrapper title="AI Sales — Conversation" actions={<EtapaBadge label="Etapa 3" />}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "320px 1fr 300px",
          gap: 12,
          height: "calc(100vh - 140px)",
          minHeight: 500,
        }}
      >
        {/* ── Left: Negotiations list ─────────────────────────────────────── */}
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
          {MOCK_NEGOTIATIONS.map((n) => {
            const isActive = selectedId === n.id;
            const hasWarn = Object.values(n.guardrails).some((s) => s === "WARN" || s === "FAIL");

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
                      {n.company}
                    </div>
                    <div
                      style={{
                        fontSize: 9,
                        fontWeight: 700,
                        color: fsmStateColor(n.state),
                        padding: "1px 5px",
                        border: `1px solid ${fsmStateColor(n.state)}`,
                        borderRadius: 3,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {n.state}
                    </div>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--color-t3)", marginBottom: 6 }}>
                    {n.value}
                  </div>
                  <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                    {(["price", "stock", "discount", "sku", "fiscal"] as const).map((g) => {
                      const s = n.guardrails[g];
                      const iconMap = {
                        price: Tag,
                        stock: Package,
                        discount: Percent,
                        sku: FileCheck,
                        fiscal: Shield,
                      };
                      const Icon = iconMap[g];
                      const color = getGuardrailColor(s);
                      return <Icon key={g} size={10} color={color} aria-label={`${g}: ${s}`} />;
                    })}
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>

        {/* ── Center: Chat ────────────────────────────────────────────────── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0, minHeight: 0 }}>
          {selected ? (
            <Card style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
              {/* FSM header */}
              <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--color-s700)" }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "var(--color-t1)",
                    marginBottom: 4,
                  }}
                >
                  {selected.company}
                </div>
                <FsmStepper currentState={selected.state} />
              </div>

              {/* Messages */}
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
                {messages.map((m, idx) => (
                  <ChatMessage key={`${m.type}-${idx}`} type={m.type} timestamp={m.timestamp}>
                    <span>
                      {m.type === "ai" && "✦ "}
                      {m.content}
                    </span>
                    {m.guardrailsPassed === false && (
                      <div style={{ marginTop: 4, display: "flex", gap: 4 }}>
                        <GuardrailBadge
                          label="HITL"
                          icon={AlertTriangle}
                          status="WARN"
                          detail="Escalat pentru aprobare manuală"
                        />
                      </div>
                    )}
                  </ChatMessage>
                ))}
              </div>

              {/* Input */}
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

        {/* ── Right: Gold sidebar ─────────────────────────────────────────── */}
        <div style={{ overflowY: "auto" }}>
          {selected ? (
            <GoldSidebar negotiation={selected} />
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
