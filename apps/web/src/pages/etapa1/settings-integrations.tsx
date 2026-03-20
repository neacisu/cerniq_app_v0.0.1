import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import { Badge } from "@/components/ui/badge.js";

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

export function SettingsIntegrations() {
  return (
    <PageWrapper title="Settings - Integrations">
      <div className="mb-4 rounded-lg border border-b5/30 bg-b5/5 p-3 text-sm text-t2">
        Configuratiile runtime pentru integrari sunt administrate operational prin OpenBao,
        variabile de mediu si manifestele de deploy. Interfata din Etapa 1 este read-only si
        afiseaza doar punctele de integrare sustinute de platforma.
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <Badge variant="brand">Production managed</Badge>
        <Badge variant="info">Staging managed</Badge>
        <Badge variant="warning">Tenant UI disabled</Badge>
      </div>

      {GROUPS.map((group) => {
        const items = INTEGRATIONS.filter((i) => i.group === group);
        return (
          <div key={group} className="mb-6">
            <h3 className="mb-3 text-sm font-semibold text-t2">{group}</h3>
            <div className="grid gap-4 lg:grid-cols-2">
              {items.map((integration) => {
                return (
                  <Card key={integration.key}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{integration.name}</CardTitle>
                        <Badge variant="info">Managed centrally</Badge>
                      </div>
                    </CardHeader>
                    <CardBody>
                      <p className="mb-3 text-xs text-t3">{integration.description}</p>
                      <div className="rounded-lg border border-s700 bg-s900/40 p-3">
                        <div className="mb-1 text-[11px] uppercase tracking-[0.08em] text-t3">
                          Endpoint operational
                        </div>
                        <div className="font-mono text-sm text-t1">{integration.defaultUrl}</div>
                      </div>
                    </CardBody>
                  </Card>
                );
              })}
            </div>
          </div>
        );
      })}
    </PageWrapper>
  );
}
