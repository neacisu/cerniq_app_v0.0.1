import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardBody, Input } from "@/components/ui/index.js";
import { ChatMessage } from "@/components/data/ChatMessage.js";
import { SBadge } from "@/components/ui/badge.js";
import { EtapaBadge } from "@/components/brand/EtapaBadge.js";
import { cn } from "@/lib/utils.js";
import { api } from "@/lib/api.js";
import { toast } from "sonner";

type NegotiationRow = {
  id: string;
  currentState?: string;
  companyName?: string | null;
  totalValue?: string | number | null;
  leadId?: string;
};

type ListResponse = {
  success?: boolean;
  data?: NegotiationRow[];
  meta?: { total?: number; page?: number; limit?: number; pages?: number };
};

type AiMessageRow = {
  id?: string;
  role?: string;
  content?: string | null;
  createdAt?: string;
};

type MessagesResponse = {
  success?: boolean;
  data?: AiMessageRow[];
};

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

export function Negotiations() {
  const [selected, setSelected] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const listQuery = useQuery({
    queryKey: ["negotiation", "list"],
    queryFn: () => api.get<ListResponse>("/api/v1/negotiation?page=1&limit=100"),
  });

  const negotiations = listQuery.data?.data ?? [];

  const messagesQuery = useQuery({
    queryKey: ["negotiation", "messages", selected],
    queryFn: () => api.get<MessagesResponse>(`/api/v1/negotiation/${selected}/messages?limit=80`),
    enabled: Boolean(selected),
  });

  const msgs = useMemo(() => {
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
    const text = input.trim();
    if (!text || !selected) return;
    toast.info(
      "Trimiterea mesajelor din UI nu are încă endpoint POST pe API — folosiți workerii/canalul configurat sau extindeți negotiation routes.",
    );
    setInput("");
  }

  const err = listQuery.error instanceof Error ? listQuery.error.message : null;

  return (
    <PageWrapper title="Negotiations" actions={<EtapaBadge label="Etapa 3" />}>
      {err ? (
        <p className="text-sm text-er mb-4" role="alert">
          {err}
        </p>
      ) : null}
      <div className="flex min-h-100 gap-4">
        <div className={cn("w-80 shrink-0 space-y-2", selected && "max-[768px]:hidden")}>
          {listQuery.isLoading ? (
            <p className="text-sm text-t3">Se încarcă negocierile…</p>
          ) : negotiations.length === 0 ? (
            <p className="text-sm text-t3">Nicio negociere în tenant.</p>
          ) : (
            negotiations.map((n) => (
              <Card
                key={n.id}
                className={cn("cursor-pointer", selected === n.id && "border-b5")}
                onClick={() => setSelected(n.id)}
              >
                <CardBody className="py-3">
                  <div className="font-medium text-t1">{n.companyName ?? n.leadId ?? n.id}</div>
                  <div className="flex justify-between items-center mt-1">
                    <SBadge status={n.currentState ?? "DISCOVERY"} />
                    <span className="text-xs text-t3">{formatMoney(n.totalValue)}</span>
                  </div>
                </CardBody>
              </Card>
            ))
          )}
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
                  {messagesQuery.isLoading ? (
                    <p className="text-xs text-t3">Se încarcă mesajele…</p>
                  ) : msgs.length === 0 ? (
                    <p className="text-xs text-t3">
                      Niciun mesaj în conversațiile AI pentru această negociere.
                    </p>
                  ) : (
                    msgs.map((m, i) => (
                      <ChatMessage key={`${m.type}-${i}`} type={m.type} timestamp={m.timestamp}>
                        {m.content}
                      </ChatMessage>
                    ))
                  )}
                </div>
                <div className="flex gap-2 mt-auto">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Mesaj (UI — așteaptă endpoint POST pe API)"
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
