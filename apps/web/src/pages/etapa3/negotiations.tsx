import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardBody, Input } from "@/components/ui/index.js";
import { ChatMessage } from "@/components/data/ChatMessage.js";
import { SBadge } from "@/components/ui/badge.js";
import { cn } from "@/lib/utils.js";

const MOCK_NEGOTIATIONS = [
  {
    id: "1",
    company: "SC AgroSud SRL",
    status: "NEGOTIATION",
    value: "EUR 23K",
  },
  {
    id: "2",
    company: "Cooperativa Agriland",
    status: "PROPOSAL",
    value: "EUR 12K",
  },
  {
    id: "3",
    company: "OUAI Ialomita Nord",
    status: "OBJECTION_HANDLING",
    value: "EUR 8K",
  },
  {
    id: "4",
    company: "SC Ferma Dunarea SA",
    status: "CLOSING",
    value: "EUR 45K",
  },
];

const MOCK_MESSAGES = [
  {
    type: "outgoing" as const,
    content: "Bună, am trimis oferta.",
    timestamp: "10:32",
  },
  {
    type: "incoming" as const,
    content: "Mulțumesc, o analizez.",
    timestamp: "10:45",
  },
  {
    type: "ai" as const,
    content: "Sugestie: menționează livrare în 48h.",
    timestamp: "10:46",
  },
  { type: "system" as const, content: "Conversație activă" },
];

export function Negotiations() {
  const [selected, setSelected] = useState<string | null>(null);

  return (
    <PageWrapper title="Negotiations">
      <div className="flex gap-4 min-h-[400px]">
        <div
          className={cn(
            "w-80 shrink-0 space-y-2",
            selected && "max-[768px]:hidden",
          )}
        >
          {MOCK_NEGOTIATIONS.map((n) => (
            <Card
              key={n.id}
              className={cn(
                "cursor-pointer",
                selected === n.id && "border-[var(--color-b5)]",
              )}
              onClick={() => setSelected(n.id)}
            >
              <CardBody className="py-3">
                <div className="font-medium text-[var(--color-t1)]">
                  {n.company}
                </div>
                <div className="flex justify-between items-center mt-1">
                  <SBadge status={n.status} />
                  <span className="text-xs text-[var(--color-t3)]">
                    {n.value}
                  </span>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>

        <div
          className={cn("flex-1 min-w-0", !selected && "max-[768px]:hidden")}
        >
          {selected ? (
            <Card>
              <CardBody>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-4"
                  onClick={() => setSelected(null)}
                >
                  ← Back
                </Button>
                <div className="space-y-3 mb-4 max-h-[280px] overflow-y-auto">
                  {MOCK_MESSAGES.map((m, i) => (
                    <ChatMessage key={i} type={m.type} timestamp={m.timestamp}>
                      {m.content}
                    </ChatMessage>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="Scrie mesajul..." className="flex-1" />
                  <Button size="sm">Trimite</Button>
                </div>
              </CardBody>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-[var(--color-t3)] text-sm">
              Selectează o negociere
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
}
