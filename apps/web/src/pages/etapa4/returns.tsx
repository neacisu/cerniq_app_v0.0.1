import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button } from "@/components/ui/index.js";
import { Card, CardBody } from "@/components/ui/card.js";
import { SBadge } from "@/components/ui/badge.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";

const INITIAL_RMAS = [
  {
    id: "RMA-001",
    company: "SC AgroSud SRL",
    status: "PENDING",
    reason: "Produs defect",
    date: "2025-02-20",
    value: "EUR 450",
  },
  {
    id: "RMA-002",
    company: "Cooperativa Agriland",
    status: "APPROVED",
    reason: "Livrare greșită",
    date: "2025-02-19",
    value: "EUR 230",
  },
  {
    id: "RMA-003",
    company: "OUAI Ialomita Nord",
    status: "PENDING",
    reason: "Ambalaj deteriorat",
    date: "2025-02-18",
    value: "EUR 120",
  },
];

export function Returns() {
  const [rmas, setRmas] = useState(INITIAL_RMAS);

  const handleApprove = (id: string) => setRmas((prev) => prev.filter((r) => r.id !== id));

  return (
    <PageWrapper title="Returns RMA">
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-s700)] bg-[var(--color-s900)]/80 p-4">
          <div className="text-2xl font-bold text-[var(--color-t1)]">{rmas.length}</div>
          <div className="text-sm text-[var(--color-t3)]">Active RMAs</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-s700)] bg-[var(--color-s900)]/80 p-4">
          <div className="text-2xl font-bold text-[var(--color-wa)]">
            {rmas.filter((r) => r.status === "PENDING").length}
          </div>
          <div className="text-sm text-[var(--color-t3)]">Pending</div>
        </div>
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-s700)] bg-[var(--color-s900)]/80 p-4">
          <div className="text-2xl font-bold text-[var(--color-ok)]">EUR 800</div>
          <div className="text-sm text-[var(--color-t3)]">Total Value</div>
        </div>
      </div>

      {rmas.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rmas.map((r) => (
            <Card key={r.id}>
              <CardBody>
                <div className="flex justify-between items-start mb-2">
                  <span className="font-mono text-sm text-[var(--color-t3)]">{r.id}</span>
                  <SBadge status={r.status} />
                </div>
                <div className="font-medium text-[var(--color-t1)] mb-1">{r.company}</div>
                <p className="text-sm text-[var(--color-t3)] mb-2">{r.reason}</p>
                <div className="flex justify-between text-xs text-[var(--color-t3)] mb-4">
                  <span>{r.date}</span>
                  <span className="font-medium text-[var(--color-t2)]">{r.value}</span>
                </div>
                <div className="flex gap-2">
                  {r.status === "PENDING" && (
                    <Button
                      variant="success"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleApprove(r.id)}
                    >
                      Approve
                    </Button>
                  )}
                  <Button variant="outline" size="sm" className="flex-1">
                    Details
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Nicio cerere RMA" description="Toate cererile au fost procesate." />
      )}
    </PageWrapper>
  );
}
