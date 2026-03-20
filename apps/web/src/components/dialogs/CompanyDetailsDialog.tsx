import { useState } from "react";
import { Button } from "@/components/ui/button.js";

type TabKey = "general" | "financial" | "contact" | "enrichment";

type CompanyDetailsDialogProps = {
  readonly open: boolean;
  readonly company: Record<string, unknown> | null;
  readonly onClose: () => void;
};

const tabs: { key: TabKey; label: string }[] = [
  { key: "general", label: "General" },
  { key: "financial", label: "Financial" },
  { key: "contact", label: "Contact" },
  { key: "enrichment", label: "Enrichment" },
];

export function CompanyDetailsDialog({
  open,
  company,
  onClose,
}: Readonly<CompanyDetailsDialogProps>) {
  const [tab, setTab] = useState<TabKey>("general");
  if (!open || !company) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4">
      <div className="w-full max-w-3xl rounded-lg border border-s600 bg-s900 p-5">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-t1">{String(company.denumire ?? "-")}</h3>
            <p className="text-xs text-t3">CUI: {String(company.cui ?? "-")}</p>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Inchide
          </Button>
        </div>
        <div className="mb-4 flex gap-2">
          {tabs.map((item) => (
            <Button
              key={item.key}
              size="sm"
              variant={tab === item.key ? "primary" : "outline"}
              onClick={() => setTab(item.key)}
            >
              {item.label}
            </Button>
          ))}
        </div>
        <div className="rounded-md border border-s700 p-3 text-sm text-t2">
          {tab === "general" ? <pre>{JSON.stringify(company, null, 2)}</pre> : null}
          {tab === "financial" ? (
            <pre>{JSON.stringify(company.metadata ?? {}, null, 2)}</pre>
          ) : null}
          {tab === "contact" ? (
            <pre>{JSON.stringify({ email: company.email, phone: company.phone }, null, 2)}</pre>
          ) : null}
          {tab === "enrichment" ? (
            <pre>{JSON.stringify(company.metadata ?? {}, null, 2)}</pre>
          ) : null}
        </div>
      </div>
    </div>
  );
}
