import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardBody } from "@/components/ui/index.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";

const MOCK_QUEUE = [
  {
    id: "1",
    contact: "Ion Popescu",
    msg: "Bună ziua, vă contactăm în legătură cu oferta agro pentru firma dvs.",
    reason: "Tone prea formal",
  },
  {
    id: "2",
    contact: "Maria Ionescu",
    msg: "Salut! Avem o ofertă specială pentru cooperativa ta.",
    reason: "Variabilă {{company}} lipsă",
  },
  {
    id: "3",
    contact: "Elena Vasile",
    msg: "Bună Elena, îți trimitem detalii despre produsele noastre.",
    reason: "Risc de spam",
  },
];

export function Review() {
  const [queue, setQueue] = useState(MOCK_QUEUE);

  const handleApprove = (id: string) => {
    setQueue((p) => p.filter((x) => x.id !== id));
  };
  const handleReject = (id: string) => {
    setQueue((p) => p.filter((x) => x.id !== id));
  };

  return (
    <PageWrapper title="AI Message Review">
      {queue.length > 0 ? (
        <div className="space-y-4">
          {queue.map((item) => (
            <Card key={item.id}>
              <CardBody>
                <p className="text-sm text-[var(--color-t2)] mb-2">
                  → {item.contact}
                </p>
                <p className="text-[var(--color-t1)] mb-3">{item.msg}</p>
                <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-wa)]/10 border border-[var(--color-wa)]/30 text-sm text-[var(--color-wa)] mb-4">
                  {item.reason}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="success"
                    size="sm"
                    onClick={() => handleApprove(item.id)}
                  >
                    Aprobă & Trimite
                  </Button>
                  <Button variant="outline" size="sm">
                    Edit
                  </Button>
                  <Button
                    variant="danger"
                    size="sm"
                    onClick={() => handleReject(item.id)}
                  >
                    Respinge
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Coadă goală"
          description="Nu există mesaje în așteptarea revizuirii."
          icon="CheckCircle"
        />
      )}
    </PageWrapper>
  );
}
