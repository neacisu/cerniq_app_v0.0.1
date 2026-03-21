import { useEffect, useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Spinner } from "@/components/ui/spinner.js";
import { ImportMappingForm } from "@/components/forms/ImportMappingForm.js";
import { toast } from "@/components/ui/toast-api.js";
import { COLUMN_MAPPING_DEFINITIONS } from "@cerniq/shared-types";

const LOCAL_STORAGE_KEY = "cerniq_default_mapping_config";

const TARGET_FIELDS = COLUMN_MAPPING_DEFINITIONS.map((entry) => ({
  label: entry.label,
  value: entry.key,
}));

const SOURCE_COLUMNS = COLUMN_MAPPING_DEFINITIONS.map((entry) => entry.key);

function loadSavedConfig() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    // ignore
  }
  return undefined;
}

export function SettingsMappings() {
  const [ready, setReady] = useState(false);
  const [savedConfig, setSavedConfig] = useState<Record<string, unknown> | undefined>(
    loadSavedConfig,
  );

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 300);
    return () => clearTimeout(t);
  }, []);

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
          <div className="mb-4 rounded-lg border border-b5/30 bg-b5/5 p-3 text-sm text-t2">
            Configuratia default pentru mapping-uri. Aceste setari se vor aplica la importurile noi.
          </div>

          <ImportMappingForm
            sourceColumns={SOURCE_COLUMNS}
            targetFields={TARGET_FIELDS}
            initial={savedConfig as Parameters<typeof ImportMappingForm>[0]["initial"]}
            onSubmit={async (config) => {
              try {
                localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(config));
                setSavedConfig(config as unknown as Record<string, unknown>);
                toast.success("Mapping default salvat cu succes");
              } catch {
                toast.error("Eroare la salvarea mapping-ului default");
              }
            }}
          />
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
