import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/index.js";
import { importOutreachLeads, type OutreachImportLeadRow } from "@/lib/etapa2-api.js";
import { parseLeadsCsv } from "@/pages/etapa2/leads-import-parse.js";
import { toast } from "sonner";

export function LeadsImport() {
  const qc = useQueryClient();
  const mutation = useMutation({
    mutationFn: (rows: OutreachImportLeadRow[]) => importOutreachLeads(rows),
    onSuccess: async (res) => {
      const d = res.data;
      toast.success(
        `Import: ${d.created} create, ${d.rejectedNoContact} fără contact, ${d.rejectedDuplicate} duplicate, ${d.errors} erori`,
      );
      await qc.invalidateQueries({ queryKey: ["etapa2", "leads"] });
    },
    onError: () => toast.error("Eroare la import"),
  });

  return (
    <PageWrapper
      title="Import leads (CSV)"
      subtitle="Primul rând = antet: denumire, email, telefon, judet, cui (separator ; sau ,). Minim: denumire + (email sau telefon)."
      actions={
        <Link to="/outreach/leads" className="text-sm text-b5 hover:underline">
          ← Înapoi la leads
        </Link>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>Încarcă fișier CSV</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <input
            type="file"
            accept=".csv,.txt"
            className="text-sm text-t2"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const text = await f.text();
              try {
                const rows = parseLeadsCsv(text);
                if (rows.length === 0) {
                  toast.error("Nu s-au găsit rânduri valide.");
                  return;
                }
                mutation.mutate(rows);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Parse CSV eșuat");
              }
            }}
          />
          <p className="text-xs text-t3">
            Preview: primele 10 rânduri sunt validate doar în browser; trimitere către API.
          </p>
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
