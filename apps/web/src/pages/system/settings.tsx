import * as Tabs from "@radix-ui/react-tabs";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody, Input, Button } from "@/components/ui/index.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { cn } from "@/lib/utils.js";

const apis = [
  { name: "ANAF", status: "ok" as const, key: "sk_••••••••••••a3f2" },
  { name: "Termene.ro", status: "ok" as const, key: "••••••••••••" },
  { name: "Hunter.io", status: "ok" as const, key: "••••••••••••" },
  { name: "TimelinesAI", status: "warning" as const, key: "••••••••••••" },
  { name: "Instantly.ai", status: "ok" as const, key: "••••••••••••" },
  { name: "Resend", status: "ok" as const, key: "re_••••••••••••" },
  { name: "xAI Grok", status: "ok" as const, key: "xai_••••••••••••" },
];

const planFeatures = [
  "Unlimited contacts",
  "AI enrichment",
  "Multi-channel outreach",
  "Analytics dashboard",
  "API access",
];

export function Settings() {
  return (
    <PageWrapper title="Settings">
      <Tabs.Root defaultValue="general" className="w-full">
        <Tabs.List className="flex gap-1 border-b border-s700 mb-6">
          {["general", "integrations", "team", "billing"].map((v) => (
            <Tabs.Trigger
              key={v}
              value={v}
              className={cn(
                "px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors",
                "data-[state=active]:border-b5 data-[state=active]:text-t1",
                "data-[state=inactive]:border-transparent data-[state=inactive]:text-t3 hover:text-t2",
              )}
            >
              {v}
            </Tabs.Trigger>
          ))}
        </Tabs.List>

        <Tabs.Content value="general">
          <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Config</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {["Company Name", "Domain", "Timezone", "Locale"].map((l) => (
                  <div key={l}>
                    <label className="text-xs text-t3 block mb-1">{l}</label>
                    <Input placeholder={l} />
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Automatic Thresholds</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {["Churn risk %", "NPS alert", "CLTV target (EUR)", "Contact interval (days)"].map(
                  (l) => (
                    <div key={l}>
                      <label className="text-xs text-t3 block mb-1">{l}</label>
                      <Input type="number" placeholder="0" />
                    </div>
                  ),
                )}
              </CardBody>
            </Card>
          </div>
        </Tabs.Content>

        <Tabs.Content value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apis.map((a) => (
              <Card key={a.name}>
                <CardBody className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <StatusDot status={a.status} />
                    <div>
                      <div className="font-medium text-t1">{a.name}</div>
                      <div className="text-xs text-t3 font-mono">{a.key}</div>
                    </div>
                  </div>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </CardBody>
              </Card>
            ))}
          </div>
        </Tabs.Content>

        <Tabs.Content value="team">
          <Card>
            <CardBody>
              <p className="text-t3 text-sm">Team management placeholder.</p>
            </CardBody>
          </Card>
        </Tabs.Content>

        <Tabs.Content value="billing">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-t1 mb-4">EUR 99/mo</div>
              <ul className="space-y-2">
                {planFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-t2">
                    <span className="text-ok">✓</span> {f}
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </PageWrapper>
  );
}
