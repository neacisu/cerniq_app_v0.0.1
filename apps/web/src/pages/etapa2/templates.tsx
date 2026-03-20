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
      <div className="grid min-h-100 grid-cols-[240px_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="p-2 space-y-1">
            {MOCK_TEMPLATES.map((x) => (
              <button
                key={x.id}
                onClick={() => setSel(x.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm",
                  sel === x.id ? "border border-b5/40 bg-b5/20 text-b5" : "text-t2 hover:bg-s800",
                )}
              >
                {x.name}
              </button>
            ))}
          </div>
        </Card>
        <Card>
          <CardBody>
            <h3 className="mb-2 font-semibold text-t1">{t.name}</h3>
            <div className="flex flex-wrap gap-1 mb-3">
              {t.vars.map((v) => (
                <Badge key={v} variant="brand">{`{{${v}}}`}</Badge>
              ))}
            </div>
            <pre className="overflow-x-auto rounded-md bg-s950 p-4 font-mono text-sm text-t2">
              {t.preview}
            </pre>
          </CardBody>
        </Card>
      </div>
    </PageWrapper>
  );
}
