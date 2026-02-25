import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, Badge } from "@/components/ui/index.js";
import { cn } from "@/lib/utils.js";

const MOCK_TEMPLATES = [
  {
    id: "1",
    name: "Intro Agro",
    vars: ["company", "contact"],
    preview: "Bună {{contact}}, {{company}} a fost selectată pentru oferta noastră agro.",
  },
  {
    id: "2",
    name: "Follow-up",
    vars: ["contact", "brand"],
    preview: "Salut {{contact}}, am văzut că {{brand}} te interesează.",
  },
  {
    id: "3",
    name: "Reminder",
    vars: ["contact"],
    preview: "{{contact}}, îți reamintim oferta valabilă până vineri.",
  },
];

export function Templates() {
  const [sel, setSel] = useState("1");
  const t = MOCK_TEMPLATES.find((x) => x.id === sel) ?? MOCK_TEMPLATES[0];

  return (
    <PageWrapper title="Template Library">
      <div className="grid grid-cols-[240px_1fr] gap-4 min-h-[400px]">
        <Card className="overflow-hidden">
          <div className="p-2 space-y-1">
            {MOCK_TEMPLATES.map((x) => (
              <button
                key={x.id}
                onClick={() => setSel(x.id)}
                className={cn(
                  "w-full text-left px-3 py-2 rounded-[var(--radius-md)] text-sm",
                  sel === x.id
                    ? "bg-[var(--color-b5)]/20 text-[var(--color-b5)] border border-[var(--color-b5)]/40"
                    : "text-[var(--color-t2)] hover:bg-[var(--color-s800)]",
                )}
              >
                {x.name}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardBody>
            <h3 className="font-semibold text-[var(--color-t1)] mb-2">{t.name}</h3>
            <div className="flex flex-wrap gap-1 mb-3">
              {t.vars.map((v) => (
                <Badge key={v} variant="brand">{`{{${v}}}`}</Badge>
              ))}
            </div>
            <pre className="p-4 rounded-[var(--radius-md)] bg-[var(--color-s950)] text-[var(--color-t2)] font-mono text-sm overflow-x-auto">
              {t.preview}
            </pre>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
