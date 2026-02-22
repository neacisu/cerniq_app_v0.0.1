import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Button, Card, CardBody } from "@/components/ui/index.js";

const MOCK_SEQUENCES = [
  {
    id: "1",
    name: "Agro Intro WA+Email",
    steps: ["WA-1", "Email-1", "WA-2"],
    leads: 1200,
    rate: 28,
    conversions: 45,
    active: true,
  },
  {
    id: "2",
    name: "Follow-up Cold",
    steps: ["Email-1", "Email-2", "WA-1"],
    leads: 800,
    rate: 18,
    conversions: 22,
    active: false,
  },
  {
    id: "3",
    name: "Re-engagement",
    steps: ["WA-1", "Email-1"],
    leads: 340,
    rate: 32,
    conversions: 18,
    active: true,
  },
];

export function Sequences() {
  const [active, setActive] = useState<Record<string, boolean>>(
    Object.fromEntries(MOCK_SEQUENCES.map((s) => [s.id, s.active])),
  );

  return (
    <PageWrapper title="Sequences">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {MOCK_SEQUENCES.map((seq) => (
          <Card key={seq.id}>
            <CardBody>
              <h3 className="font-semibold text-[var(--color-t1)] mb-2">
                {seq.name}
              </h3>
              <div className="flex flex-wrap gap-1 mb-3">
                {seq.steps.map((s, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded bg-[var(--color-s700)] text-[var(--color-t2)]"
                  >
                    {s}
                  </span>
                ))}
              </div>
              <div className="flex gap-4 text-xs text-[var(--color-t3)] mb-4">
                <span>{seq.leads} leads</span>
                <span>{seq.rate}% rate</span>
                <span>{seq.conversions} conv.</span>
              </div>
              <Button
                variant={active[seq.id] ? "danger" : "success"}
                size="sm"
                onClick={() =>
                  setActive((p) => ({ ...p, [seq.id]: !p[seq.id] }))
                }
              >
                {active[seq.id] ? "Pause" : "Activate"}
              </Button>
            </CardBody>
          </Card>
        ))}
      </div>
    </PageWrapper>
  );
}
