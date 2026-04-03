import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody, Input, Button } from "@/components/ui/index.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { cn } from "@/lib/utils.js";
import { toast } from "sonner";
import { Edit2, Plus, Trash2, Shield, User } from "lucide-react";

interface ApiConfig {
  id: string;
  name: string;
  status: "ok" | "warning" | "error";
  key: string;
  description: string;
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER" | "AGENT" | "VIEWER";
  status: "ACTIVE" | "PENDING" | "INACTIVE";
}

const INITIAL_APIS: ApiConfig[] = [
  {
    id: "infraq",
    name: "infraq.app (LLM)",
    status: "ok",
    key: "iq_••••••••••••3a9f",
    description: "QwQ-32B, Qwen2.5-14B, qwen3-embedding",
  },
  {
    id: "anaf",
    name: "ANAF SPV e-Factura",
    status: "ok",
    key: "sk_••••••••••••a3f2",
    description: "SPV OAuth2 + eFactura XML",
  },
  {
    id: "termene",
    name: "Termene.ro",
    status: "ok",
    key: "••••••••••••",
    description: "Bilanțuri + Dosare + Acționari",
  },
  {
    id: "hunter",
    name: "Hunter.io",
    status: "ok",
    key: "••••••••••••",
    description: "Email discover + verify",
  },
  {
    id: "timelines",
    name: "TimelinesAI (WhatsApp)",
    status: "warning",
    key: "••••••••••••",
    description: "WhatsApp Business API",
  },
  {
    id: "instantly",
    name: "Instantly.ai",
    status: "ok",
    key: "••••••••••••",
    description: "Email outreach sequences",
  },
  {
    id: "resend",
    name: "Resend",
    status: "ok",
    key: "re_••••••••••••",
    description: "Transactional email",
  },
  {
    id: "sameday",
    name: "Sameday Courier",
    status: "ok",
    key: "sd_••••••••••••",
    description: "AWB create + tracking",
  },
  {
    id: "revolut",
    name: "Revolut Business",
    status: "ok",
    key: "rvl_••••••••••••",
    description: "Reconciliere plăți",
  },
  {
    id: "docusign",
    name: "DocuSign",
    status: "warning",
    key: "dcs_••••••••••••",
    description: "Semnătură electronică contracte",
  },
];

const INITIAL_TEAM: TeamMember[] = [
  { id: "u1", name: "Alexandru Ionescu", email: "alex@cerniq.ro", role: "ADMIN", status: "ACTIVE" },
  { id: "u2", name: "Maria Popescu", email: "maria@cerniq.ro", role: "MANAGER", status: "ACTIVE" },
  {
    id: "u3",
    name: "Andrei Constantin",
    email: "andrei@cerniq.ro",
    role: "AGENT",
    status: "ACTIVE",
  },
  {
    id: "u4",
    name: "Elena Dumitrescu",
    email: "elena@cerniq.ro",
    role: "AGENT",
    status: "PENDING",
  },
];

const ROLE_COLORS: Record<TeamMember["role"], string> = {
  ADMIN: "text-amber-400",
  MANAGER: "text-blue-400",
  AGENT: "text-green-400",
  VIEWER: "text-t3",
};

const planFeatures = [
  "Unlimited contacts",
  "AI enrichment (infraq.app QwQ-32B)",
  "Multi-channel outreach (Email/WA/LI)",
  "Analytics dashboard",
  "E3/E4/E5 full pipeline",
  "DocuSign + Sameday + Revolut",
  "API access REST + WebSocket",
  "Prometheus + Grafana monitoring",
];

function handleSaveGeneral() {
  toast.success("Setări salvate cu succes!");
}

export function Settings() {
  const [generalForm, setGeneralForm] = useState({
    companyName: "Cerniq SRL",
    domain: "cerniq.ro",
    timezone: "Europe/Bucharest",
    locale: "ro-RO",
    churnRisk: "40",
    npsAlert: "7",
    cltvTarget: "5000",
    contactInterval: "30",
  });

  const [apis, setApis] = useState<ApiConfig[]>(INITIAL_APIS);
  const [editingApi, setEditingApi] = useState<string | null>(null);
  const [editKey, setEditKey] = useState("");
  const [team, setTeam] = useState<TeamMember[]>(INITIAL_TEAM);
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("AGENT");

  function handleEditApiStart(api: ApiConfig) {
    setEditingApi(api.id);
    setEditKey("");
  }

  function handleSaveApi(apiId: string) {
    if (!editKey.trim()) {
      toast.error("Cheia API nu poate fi goală.");
      return;
    }
    setApis((prev) =>
      prev.map((a) =>
        a.id === apiId
          ? { ...a, key: `${editKey.slice(0, 4)}••••••••••••`, status: "ok" as const }
          : a,
      ),
    );
    setEditingApi(null);
    setEditKey("");
    toast.success(`API ${apis.find((a) => a.id === apiId)?.name} actualizat!`);
  }

  function handleCancelEdit() {
    setEditingApi(null);
    setEditKey("");
  }

  function handleInviteMember() {
    if (!newMemberEmail.trim() || !newMemberName.trim()) {
      toast.error("Completează numele și emailul.");
      return;
    }
    const newMember: TeamMember = {
      id: `u${Date.now()}`,
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      status: "PENDING",
    };
    setTeam((prev) => [...prev, newMember]);
    setNewMemberEmail("");
    setNewMemberName("");
    toast.success(`Invitație trimisă la ${newMemberEmail}`);
  }

  function handleRemoveMember(memberId: string) {
    const member = team.find((m) => m.id === memberId);
    setTeam((prev) => prev.filter((m) => m.id !== memberId));
    toast.success(`${member?.name ?? "Membru"} eliminat din echipă.`);
  }

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

        {/* ── Tab: General ── */}
        <Tabs.Content value="general">
          <div className="grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <Card>
              <CardHeader>
                <CardTitle>Tenant Config</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {(
                  [
                    ["companyName", "Company Name"],
                    ["domain", "Domain"],
                    ["timezone", "Timezone"],
                    ["locale", "Locale"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs text-t3 block mb-1">{label}</label>
                    <Input
                      value={generalForm[field]}
                      onChange={(e) =>
                        setGeneralForm((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      placeholder={label}
                    />
                  </div>
                ))}
              </CardBody>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Praguri Automate</CardTitle>
              </CardHeader>
              <CardBody className="space-y-3">
                {(
                  [
                    ["churnRisk", "Churn risk %"],
                    ["npsAlert", "NPS alert (min)"],
                    ["cltvTarget", "CLTV target (EUR)"],
                    ["contactInterval", "Contact interval (zile)"],
                  ] as const
                ).map(([field, label]) => (
                  <div key={field}>
                    <label className="text-xs text-t3 block mb-1">{label}</label>
                    <Input
                      type="number"
                      value={generalForm[field]}
                      onChange={(e) =>
                        setGeneralForm((prev) => ({ ...prev, [field]: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                ))}
              </CardBody>
            </Card>
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveGeneral}>Salvează Setările</Button>
          </div>
        </Tabs.Content>

        {/* ── Tab: Integrations ── */}
        <Tabs.Content value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {apis.map((a) => (
              <Card key={a.id}>
                <CardBody className="space-y-2">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <StatusDot status={a.status} />
                      <div>
                        <div className="font-medium text-t1">{a.name}</div>
                        <div className="text-xs text-t3">{a.description}</div>
                      </div>
                    </div>
                    {editingApi !== a.id && (
                      <Button size="sm" variant="outline" onClick={() => handleEditApiStart(a)}>
                        <Edit2 size={13} className="mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                  {editingApi === a.id ? (
                    <div className="space-y-2 pt-1">
                      <Input
                        type="password"
                        placeholder="Noua cheie API..."
                        value={editKey}
                        onChange={(e) => setEditKey(e.target.value)}
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => handleSaveApi(a.id)}>
                          Salvează
                        </Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                          Anulează
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="font-mono text-xs text-t3 pl-7">{a.key}</div>
                  )}
                </CardBody>
              </Card>
            ))}
          </div>
        </Tabs.Content>

        {/* ── Tab: Team ── */}
        <Tabs.Content value="team">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Invită Membru Nou</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="grid grid-cols-3 gap-3 max-[700px]:grid-cols-1">
                <div>
                  <label htmlFor="team-name" className="text-xs text-t3 block mb-1">
                    Nume
                  </label>
                  <Input
                    id="team-name"
                    placeholder="Prenume Nume"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="team-email" className="text-xs text-t3 block mb-1">
                    Email
                  </label>
                  <Input
                    id="team-email"
                    type="email"
                    placeholder="user@cerniq.ro"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="team-role" className="text-xs text-t3 block mb-1">
                    Rol
                  </label>
                  <select
                    id="team-role"
                    className="w-full rounded border border-s700 bg-s800 px-3 py-2 text-sm text-t1"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as TeamMember["role"])}
                  >
                    <option value="ADMIN">Admin</option>
                    <option value="MANAGER">Manager</option>
                    <option value="AGENT">Agent</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <Button onClick={handleInviteMember} className="flex items-center gap-2">
                  <Plus size={14} />
                  Trimite Invitație
                </Button>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Echipă ({team.length} membri)</CardTitle>
            </CardHeader>
            <CardBody className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-s700 text-left text-t3">
                    <th className="px-5 py-3">Membru</th>
                    <th className="px-5 py-3">Rol</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Acțiuni</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((m) => (
                    <tr key={m.id} className="border-b border-s700 last:border-0 hover:bg-s800/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-t3" />
                          <div>
                            <div className="font-medium text-t1">{m.name}</div>
                            <div className="text-xs text-t3">{m.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "flex items-center gap-1 text-xs font-semibold",
                            ROLE_COLORS[m.role],
                          )}
                        >
                          <Shield size={11} />
                          {m.role}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <span
                          className={cn(
                            "text-xs font-medium px-2 py-0.5 rounded-full",
                            m.status === "ACTIVE" && "bg-ok/20 text-ok",
                            m.status === "PENDING" && "bg-amber-500/20 text-amber-400",
                            m.status === "INACTIVE" && "bg-er/20 text-er",
                          )}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(m.id)}
                          className="text-er/70 hover:text-er transition-colors"
                          aria-label={`Elimină ${m.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardBody>
          </Card>
        </Tabs.Content>

        {/* ── Tab: Billing ── */}
        <Tabs.Content value="billing">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Pro Plan</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-t1 mb-1">EUR 499/mo</div>
              <div className="text-xs text-t3 mb-4">Facturare lunară · Anulare oricând</div>
              <ul className="space-y-2 mb-6">
                {planFeatures.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-t2">
                    <span className="text-ok">✓</span> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant="outline"
                onClick={() =>
                  toast.info("Contactați echipa Cerniq pentru upgrade sau modificare plan.")
                }
              >
                Modifică Plan
              </Button>
            </CardBody>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </PageWrapper>
  );
}
