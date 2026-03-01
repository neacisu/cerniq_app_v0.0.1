import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Button } from "@/components/ui/button.js";
import { Badge } from "@/components/ui/badge.js";
import { InputField } from "@/components/forms/InputField.js";
import { SelectField } from "@/components/forms/SelectField.js";
import { toast } from "@/components/ui/toast-api.js";

type Integration = {
  key: string;
  name: string;
  group: string;
  defaultUrl: string;
  description: string;
};

const INTEGRATIONS: Integration[] = [
  {
    key: "anaf",
    name: "ANAF",
    group: "Fiscal",
    defaultUrl: "https://api.anaf.ro",
    description: "API ANAF pentru verificare date fiscale si bilant",
  },
  {
    key: "termene",
    name: "Termene.ro",
    group: "Fiscal",
    defaultUrl: "https://api.termene.ro",
    description: "Date insolventa, litigii, termene legale",
  },
  {
    key: "onrc",
    name: "ONRC",
    group: "Risk",
    defaultUrl: "https://portal.onrc.ro",
    description: "Registrul Comertului - date de inregistrare",
  },
  {
    key: "hunter",
    name: "Hunter.io",
    group: "Email",
    defaultUrl: "https://api.hunter.io",
    description: "Email finder si verificare email",
  },
  {
    key: "zerobounce",
    name: "ZeroBounce",
    group: "Email",
    defaultUrl: "https://api.zerobounce.net",
    description: "Validare email in bulk si real-time",
  },
  {
    key: "xai",
    name: "xAI / Grok",
    group: "AI",
    defaultUrl: "https://api.x.ai",
    description: "AI structurare date si analiza",
  },
  {
    key: "nominatim",
    name: "Nominatim",
    group: "Geo",
    defaultUrl: "https://nominatim.openstreetmap.org",
    description: "Geocodare adrese si validare locatie",
  },
  {
    key: "hlr",
    name: "HLR Lookup",
    group: "Phone",
    defaultUrl: "https://api.hlrlookup.com",
    description: "Validare numere de telefon",
  },
];

const GROUPS = ["Fiscal", "Risk", "Email", "AI", "Geo", "Phone"] as const;

type IntegrationState = {
  url: string;
  status: "connected" | "disconnected";
};

function getInitialState(): Record<string, IntegrationState> {
  const state: Record<string, IntegrationState> = {};
  for (const i of INTEGRATIONS) {
    state[i.key] = { url: i.defaultUrl, status: "disconnected" };
  }
  return state;
}

export function SettingsIntegrations() {
  const [config, setConfig] = useState<Record<string, IntegrationState>>(getInitialState);
  const [mode, setMode] = useState("production");

  const updateUrl = (key: string, url: string) => {
    setConfig((prev) => ({ ...prev, [key]: { ...prev[key], url } }));
  };

  const toggleStatus = (key: string) => {
    setConfig((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        status: prev[key].status === "connected" ? "disconnected" : "connected",
      },
    }));
  };

  const handleSave = () => {
    toast.success("Configuratia integrarilor a fost salvata");
  };

  return (
    <PageWrapper title="Settings - Integrations">
      <div className="mb-4 rounded-lg border border-[var(--color-b5)]/30 bg-[var(--color-b5)]/5 p-3 text-sm text-[var(--color-t2)]">
        Configurare servicii externe. Modificarile sunt locale pana la implementarea API-ului de
        setari.
      </div>

      <div className="mb-6 max-w-xs">
        <SelectField
          label="Mod de operare"
          value={mode}
          onChange={setMode}
          options={[
            { label: "Production", value: "production" },
            { label: "Staging", value: "staging" },
            { label: "Sandbox", value: "sandbox" },
          ]}
        />
      </div>

      {GROUPS.map((group) => {
        const items = INTEGRATIONS.filter((i) => i.group === group);
        return (
          <div key={group} className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-[var(--color-t2)]">{group}</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((integration) => {
                const state = config[integration.key];
                return (
                  <Card key={integration.key}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <button
                          type="button"
                          className="cursor-pointer"
                          onClick={() => toggleStatus(integration.key)}
                        >
                          <Badge variant={state.status === "connected" ? "brand" : "warning"}>
                            {state.status === "connected" ? "Conectat" : "Deconectat"}
                          </Badge>
                        </button>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <p className="mb-3 text-xs text-[var(--color-t3)]">
                        {integration.description}
                      </p>
                      <InputField
                        label="URL API"
                        value={state.url}
                        onChange={(val) => updateUrl(integration.key, val)}
                      />
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="flex justify-end">
        <Button onClick={handleSave}>Salveaza configuratia</Button>
      </div>
    </PageWrapper>
  );
}
