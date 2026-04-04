import { useState } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardHeader, CardTitle, CardBody, Input, Button } from "@/components/ui/index.js";
import { StatusDot } from "@/components/data/StatusDot.js";
import { cn } from "@/lib/utils.js";
import { toast } from "sonner";
import { Plus, Trash2, Shield, User } from "lucide-react";

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

/** Integrările reale sunt în OpenBao / mediu — UI afișează doar ghidul operațional. */
const INITIAL_APIS: ApiConfig[] = [
  {
    id: "openbao",
    name: "Secrets & integrări (OpenBao)",
    status: "warning",
    key: "—",
    description:
      "Cheile furnizorilor (LLM, ANAF, email, curier etc.) nu se editează din această pagină. Vezi etapa1/settings-integrations și runbook-ul de deployment.",
  },
];

const ROLE_COLORS: Record<TeamMember["role"], string> = {
  ADMIN: "text-amber-400",
  MANAGER: "text-blue-400",
  AGENT: "text-green-400",
  VIEWER: "text-t3",
};

const SETTINGS_GENERAL_LS = "cerniq_settings_general_v1";

function notifyRemoveMemberNotAvailable(_memberId: string) {
  toast.info("Gestionarea membrilor din API nu este încă disponibilă.");
}

const DEFAULT_GENERAL_FORM = {
  companyName: "",
  domain: "",
  timezone: "Europe/Bucharest",
  locale: "ro-RO",
  churnRisk: "",
  npsAlert: "",
  cltvTarget: "",
  contactInterval: "",
};

function readGeneralFormFromLocalStorage(): typeof DEFAULT_GENERAL_FORM {
  if (globalThis.localStorage === undefined) return DEFAULT_GENERAL_FORM;
  try {
    const raw = localStorage.getItem(SETTINGS_GENERAL_LS);
    if (!raw) return DEFAULT_GENERAL_FORM;
    const parsed = JSON.parse(raw) as Partial<typeof DEFAULT_GENERAL_FORM>;
    return { ...DEFAULT_GENERAL_FORM, ...parsed };
  } catch {
    return DEFAULT_GENERAL_FORM;
  }
}

export function Settings() {
  const [generalForm, setGeneralForm] = useState(readGeneralFormFromLocalStorage);

  const team: TeamMember[] = [];
  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [newMemberName, setNewMemberName] = useState("");
  const [newMemberRole, setNewMemberRole] = useState<TeamMember["role"]>("AGENT");

  function handleSaveGeneral() {
    try {
      localStorage.setItem(SETTINGS_GENERAL_LS, JSON.stringify(generalForm));
      toast.success(
        "Salvat doar în browser (localStorage). Nu există endpoint public pentru setări tenant-wide în API.",
      );
    } catch {
      toast.error("Nu s-a putut scrie localStorage.");
    }
  }

  function handleInviteMember() {
    if (!newMemberEmail.trim() || !newMemberName.trim()) {
      toast.error("Completează numele și emailul.");
      return;
    }
    toast.info(
      "Invitațiile de echipă necesită endpoint dedicat în API — momentan nu sunt persistate.",
    );
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
                <CardTitle>Praguri (note operaționale)</CardTitle>
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
          <p className="text-xs text-t3 mt-2">
            Pragurile de mai sus nu sunt încă validate sau trimise către workeri — sunt doar note
            locale până la cablarea unui API de configurare tenant.
          </p>
          <div className="mt-4 flex justify-end">
            <Button onClick={handleSaveGeneral}>Salvează local (browser)</Button>
          </div>
        </Tabs.Content>

        {/* ── Tab: Integrations ── */}
        <Tabs.Content value="integrations">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INITIAL_APIS.map((a) => (
              <Card key={a.id}>
                <CardBody className="space-y-2">
                  <div className="flex items-center gap-3">
                    <StatusDot status={a.status} />
                    <div>
                      <div className="font-medium text-t1">{a.name}</div>
                      <div className="text-xs text-t3">{a.description}</div>
                    </div>
                  </div>
                  <div className="font-mono text-xs text-t3 pl-7 pt-1">{a.key}</div>
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
                  {team.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-t3 text-sm">
                        Lista echipei va fi încărcată din API când există rute tenant/users.
                        Utilizatorul curent este în meniul din stânga (sesiune).
                      </td>
                    </tr>
                  ) : null}
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
                          onClick={() => notifyRemoveMemberNotAvailable(m.id)}
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
              <CardTitle>Facturare & plan</CardTitle>
            </CardHeader>
            <CardBody>
              <div className="text-2xl font-bold text-t1 mb-1">—</div>
              <div className="text-xs text-t3 mb-4">
                Nu există integrare cu un API de billing în această aplicație. Lista de funcții de
                plan nu este afișată aici pentru a evita conținut marketing fără sursă de adevăr.
              </div>
              <Button
                variant="outline"
                onClick={() =>
                  toast.info("Contactați echipa Cerniq pentru contract, facturare sau upgrade.")
                }
              >
                Contact comercial
              </Button>
            </CardBody>
          </Card>
        </Tabs.Content>
      </Tabs.Root>
    </PageWrapper>
  );
}
