import { useState, useRef } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardBody, Input } from "@/components/ui/index.js";
import { ChatMessage } from "@/components/data/ChatMessage.js";
import { SBadge } from "@/components/ui/badge.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";

const MOCK_NEGOTIATIONS = [
  { id: "1", company: "SC AgroSud SRL", status: "NEGOTIATION", value: "EUR 23K" },
  { id: "2", company: "Cooperativa Agriland", status: "PROPOSAL", value: "EUR 12K" },
  { id: "3", company: "OUAI Ialomita Nord", status: "CLOSING", value: "EUR 8K" },
  { id: "4", company: "SC Ferma Dunarea SA", status: "DISCOVERY", value: "EUR 45K" },
];

const BASE_MESSAGES: Record<
  string,
  Array<{ type: "outgoing" | "incoming" | "ai" | "system"; content: string; timestamp?: string }>
> = {
  "1": [
    { type: "outgoing", content: "Bună, am trimis oferta.", timestamp: "10:32" },
    { type: "incoming", content: "Mulțumesc, o analizez.", timestamp: "10:45" },
    {
      type: "ai",
      content: "✦ Sugestie: menționează livrare în 48h și discount sezonier.",
      timestamp: "10:46",
    },
  ],
  "2": [
    {
      type: "ai",
      content: "✦ Lead calificat: scor 8.2/10. Ofertă standard recomandată.",
      timestamp: "09:00",
    },
    {
      type: "outgoing",
      content: "Bună ziua! Vă trimitem oferta pentru sezonul 2026.",
      timestamp: "09:02",
    },
    { type: "incoming", content: "Mulțumesc, analizăm.", timestamp: "09:30" },
  ],
  "3": [
    { type: "incoming", content: "Confirmăm comanda conform ultimei oferte.", timestamp: "14:00" },
    {
      type: "ai",
      content: "✦ Toate guardrailele PASS. Tranziție FSM → PROFORMA_SENT.",
      timestamp: "14:00",
    },
  ],
  "4": [
    {
      type: "ai",
      content: "✦ Lead nou. Profil Gold complet. Context window inițializat.",
      timestamp: "15:00",
    },
    { type: "outgoing", content: "Bună ziua! Mulțumim pentru interes.", timestamp: "15:01" },
  ],
};

const AI_REPLIES = [
  "✦ Am recepționat mesajul. Analizez contextul și istoricul clientului...",
  "✦ Recomand o abordare consultativă. Limita discount aprobat automat: 15%.",
  "✦ Guardrail M71 verificat: prețul propus este în parametri.",
  "✦ Context actualizat. Propun tranziție FSM la etapa următoare.",
  "✦ Am identificat pattern sezonier. Recomand bundle Sezon 2026.",
];

export function Negotiations() {
  const [selected, setSelected] = useState<string | null>(null);
  const [extra, setExtra] = useState<Record<string, (typeof BASE_MESSAGES)["1"]>>({});
  const [input, setInput] = useState("");
  const aiIdxRef = useRef(0);

  const msgs = selected ? [...(BASE_MESSAGES[selected] ?? []), ...(extra[selected] ?? [])] : [];

  function handleSend() {
    const text = input.trim();
    if (!text || !selected) return;
    const now = new Date();
    const ts = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;
    setExtra((prev) => ({
      ...prev,
      [selected]: [
        ...(prev[selected] ?? []),
        { type: "outgoing", content: text, timestamp: ts },
        {
          type: "ai",
          content: AI_REPLIES[aiIdxRef.current % AI_REPLIES.length] ?? AI_REPLIES[0] ?? "",
          timestamp: ts,
        },
      ],
    }));
    aiIdxRef.current += 1;
    setInput("");
  }

  return (
    <PageWrapper title="Negotiations" actions={<EtapaBadge label="Etapa 3" />}>
      <div className="flex min-h-100 gap-4">
        <div className={cn("w-80 shrink-0 space-y-2", selected && "max-[768px]:hidden")}>
          {MOCK_NEGOTIATIONS.map((n) => (
            <Card
              key={n.id}
              className={cn("cursor-pointer", selected === n.id && "border-b5")}
              onClick={() => setSelected(n.id)}
            >
              <CardBody className="py-3">
                <div className="font-medium text-t1">{n.company}</div>
                <div className="flex justify-between items-center mt-1">
                  <SBadge status={n.status} />
                  <span className="text-xs text-t3">{n.value}</span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div className={cn("flex-1 min-w-0", !selected && "max-[768px]:hidden")}>
          {selected ? (
            <Card style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              <CardBody style={{ display: "flex", flexDirection: "column", flex: 1 }}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-4 self-start"
                  onClick={() => setSelected(null)}
                >
                  ← Back
                </Button>
                <div className="mb-4 flex-1 space-y-3 overflow-y-auto max-h-96">
                  {msgs.map((m, i) => (
                    <ChatMessage key={`${m.type}-${i}`} type={m.type} timestamp={m.timestamp}>
                      {m.content}
                    </ChatMessage>
                  ))}
                </div>
                <div className="flex gap-2 mt-auto">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Scrie mesajul sau comandă AI..."
                    className="flex-1"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && input.trim()) handleSend();
                    }}
                  />
                  <Button size="sm" disabled={!input.trim()} onClick={handleSend}>
                    Trimite
                  </Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-t3">
              Selectează o negociere
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
