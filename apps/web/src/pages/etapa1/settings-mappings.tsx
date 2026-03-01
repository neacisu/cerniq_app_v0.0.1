import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { ImportMappingForm } from "@/components/forms/ImportMappingForm.js";
import { toast } from "@/components/ui/toast-api.js";

const SOURCE_COLUMNS = [
  "name",
  "company_name",
  "cui",
  "cif",
  "email",
  "phone",
  "address",
  "city",
  "county",
  "country",
  "website",
  "contact_person",
  "position",
  "revenue",
  "employees",
  "industry",
  "notes",
];

const TARGET_FIELDS = [
  { label: "Denumire companie", value: "companyName" },
  { label: "CUI / CIF", value: "cui" },
  { label: "Email", value: "email" },
  { label: "Telefon", value: "phone" },
  { label: "Adresa", value: "address" },
  { label: "Oras", value: "city" },
  { label: "Judet", value: "county" },
  { label: "Tara", value: "country" },
  { label: "Website", value: "website" },
  { label: "Persoana contact", value: "contactPerson" },
  { label: "Functie", value: "position" },
  { label: "Cifra afaceri", value: "revenue" },
  { label: "Nr. angajati", value: "employees" },
  { label: "Industrie / CAEN", value: "industry" },
  { label: "Note", value: "notes" },
];

export function SettingsMappings() {
  const [ready, setReady] = useState(false);

  useState(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  });

  if (!ready) {
    return (
      <PageWrapper title="Settings - Mappings">
        <div className="flex items-center justify-center py-20">
          <Spinner size={32} />
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Settings - Mappings">
      <Card>
        <CardHeader>
          <CardTitle>Configurare Mapping-uri Default</CardTitle>
        </CardHeader>
        <CardBody>
          <div className="mb-4 rounded-lg border border-[var(--color-b5)]/30 bg-[var(--color-b5)]/5 p-3 text-sm text-[var(--color-t2)]">
            Configuratia default pentru mapping-uri. Aceste setari se vor aplica la importurile noi.
          </div>

          <ImportMappingForm
            sourceColumns={SOURCE_COLUMNS}
            targetFields={TARGET_FIELDS}
            onSubmit={async () => {
              toast.success("Mapping default salvat cu succes");
            }}
          />
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
