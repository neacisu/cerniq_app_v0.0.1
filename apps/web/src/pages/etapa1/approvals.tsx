import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardBody, Badge } from "@/components/ui/index.js";
import { ProgressBar } from "@/components/data/ProgressBar.js";
import { EmptyState } from "@/components/feedback/EmptyState.js";
import { cn } from "@/lib/utils.js";

const MOCK_APPROVALS = [
  {
    id: "1",
    company: "OUAI Ialomita Nord",
    reason: "CUI nevalidat ANAF",
    confidence: 34,
    urgency: "HIGH" as const,
  },
  {
    id: "2",
    company: "Cooperativa Agriland",
    reason: "Termene lipsă",
    confidence: 72,
    urgency: "MED" as const,
  },
  {
    id: "3",
    company: "SC AgroSud SRL",
    reason: "Revenue estimat incert",
    confidence: 58,
    urgency: "LOW" as const,
  },
];

const urgencyBorder: Record<string, string> = {
  HIGH: "border-[var(--color-er)]",
  MED: "border-[var(--color-wa)]",
  LOW: "border-[var(--color-in)]",
};

export function Approvals() {
  const hasItems = MOCK_APPROVALS.length > 0;

  return (
    <PageWrapper title="HITL Approvals">
      {hasItems ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {MOCK_APPROVALS.map((a) => (
            <Card key={a.id} className={cn("border-l-4", urgencyBorder[a.urgency])}>
              <CardBody>
                <div className="flex justify-between items-start mb-3">
                  <h3 className="font-semibold text-[var(--color-t1)]">{a.company}</h3>
                  <Badge
                    variant={
                      a.urgency === "HIGH" ? "error" : a.urgency === "MED" ? "warning" : "info"
                    }
                  >
                    {a.urgency}
                  </Badge>
                </div>
                <p className="text-sm text-[var(--color-t3)] mb-3">{a.reason}</p>
                <ProgressBar value={a.confidence} />
                <div className="flex gap-2">
                  <Button variant="success" size="sm" className="flex-1">
                    Aprobă
                  </Button>
                  <Button variant="danger" size="sm" className="flex-1">
                    Respinge
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState title="Inbox gol" description="Nu există aprobări în așteptare." />
      )}
    </PageWrapper>
  );
}
