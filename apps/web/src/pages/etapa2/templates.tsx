import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, Badge, Button } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import { useOutreachTemplates } from "@/hooks/use-etapa2.js";
import type { TemplateChannel, TemplateStatus } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

const STATUS_STYLE: Record<TemplateStatus, string> = {
  ACTIVE: "bg-green-900/30 text-green-400",
  DRAFT: "bg-s600 text-t3",
  ARCHIVED: "bg-s700 text-t4",
};

const CHANNEL_STYLE: Record<TemplateChannel, string> = {
  WHATSAPP: "text-green-400",
  EMAIL: "text-blue-400",
};

export function Templates() {
  const navigate = useNavigate();
  const [channelFilter, setChannelFilter] = useState<TemplateChannel | "ALL">("ALL");
  const [sel, setSel] = useState<string | null>(null);

  const params = channelFilter === "ALL" ? {} : { channel: channelFilter };
  const { data, isLoading } = useOutreachTemplates(params);
  const templates = data?.data ?? [];
  const selected = templates.find((t) => t.id === sel) ?? templates[0] ?? null;

  let mainContent: ReactNode;
  if (isLoading) {
    mainContent = <Skeleton className="h-80 rounded-lg" />;
  } else if (templates.length === 0) {
    mainContent = (
      <div className="flex flex-col items-center py-16 text-t3">
        <p className="font-medium text-t1">Niciun template</p>
        <Button size="sm" className="mt-4" onClick={() => navigate("/outreach/templates/new")}>
          Creează Template
        </Button>
      </div>
    );
  } else {
    mainContent = (
      <div className="grid min-h-[400px] grid-cols-[240px_1fr] gap-4">
        <Card className="overflow-hidden">
          <div className="p-2 space-y-1 overflow-y-auto max-h-[600px]">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => setSel(t.id)}
                className={cn(
                  "w-full rounded-md px-3 py-2 text-left text-sm",
                  sel === t.id || (!sel && t.id === templates[0]?.id)
                    ? "border border-b5/40 bg-b5/20 text-b5"
                    : "text-t2 hover:bg-s800",
                )}
              >
                <span className="block font-medium truncate">{t.name}</span>
                <span className={`text-[10px] ${CHANNEL_STYLE[t.channel]}`}>{t.channel}</span>
              </button>
            ))}
          </div>
        </Card>

        {selected ? (
          <Card>
            <CardBody>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-t1 text-lg">{selected.name}</h3>
                  {selected.description && (
                    <p className="text-sm text-t3 mt-0.5">{selected.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      STATUS_STYLE[selected.status],
                    )}
                  >
                    {selected.status}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/outreach/templates/${selected.id}/edit`)}
                  >
                    Editează
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 mb-3 flex-wrap">
                <Badge variant="brand">{selected.channel}</Badge>
                <Badge variant="neutral">{selected.templateType}</Badge>
                {selected.variables.map((v) => (
                  <Badge key={v} variant="neutral">{`{{${v}}}`}</Badge>
                ))}
              </div>

              {selected.subject && (
                <div className="mb-2">
                  <p className="text-xs text-t3 mb-0.5">Subiect</p>
                  <p className="text-sm text-t1">{selected.subject}</p>
                </div>
              )}

              <div>
                <p className="text-xs text-t3 mb-1">Corp mesaj</p>
                <pre className="overflow-x-auto rounded-md bg-s900 p-4 font-mono text-sm text-t2 whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selected.bodyTemplate}
                </pre>
              </div>
            </CardBody>
          </Card>
        ) : (
          <Card>
            <CardBody>
              <p className="text-t3 text-sm text-center py-8">Selectează un template</p>
            </CardBody>
          </Card>
        )}
      </div>
    );
  }

  return (
    <PageWrapper title="Template Library">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex gap-2">
          {(["ALL", "WHATSAPP", "EMAIL"] as const).map((ch) => (
            <button
              key={ch}
              onClick={() => setChannelFilter(ch)}
              className={cn(
                "rounded-md px-3 py-1.5 text-sm font-medium",
                channelFilter === ch ? "bg-b5 text-s950" : "bg-s800 text-t2 hover:bg-s700",
              )}
            >
              {ch === "ALL" ? "Toate" : ch}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => navigate("/outreach/templates/new")}>
          + Template Nou
        </Button>
      </div>

      {mainContent}
    </PageWrapper>
  );
}
