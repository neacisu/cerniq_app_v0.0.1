import { Link, useParams } from "react-router-dom";
import { PageWrapper } from "@/components/layout/PageWrapper.js";
import { Card, CardBody } from "@/components/ui/index.js";
import { Skeleton } from "@/components/ui/skeleton.js";
import {
  useOutreachLeads,
  useOutreachPhone,
  usePhoneAnalytics,
  usePhoneHealthCheck,
} from "@/hooks/use-etapa2.js";
import { PhoneReputationDashboard } from "@/components/outreach/phones/PhoneReputationDashboard.js";
import type { OutreachLead, PhoneStatus } from "@/lib/etapa2-api.js";
import { toast } from "sonner";
import { cn } from "@/lib/utils.js";

const STATUS_CONFIG: Record<PhoneStatus, { label: string; color: string }> = {
  ACTIVE: { label: "Activ", color: "text-green-400" },
  PAUSED: { label: "Pauzat", color: "text-yellow-400" },
  OFFLINE: { label: "Offline", color: "text-gray-400" },
  BANNED: { label: "Banat", color: "text-red-500" },
  RECONNECTING: { label: "Reconectare", color: "text-blue-400" },
};

function quotaBarColorClass(quotaPercentage: number, isEnabled: boolean): string {
  const pct = quotaPercentage;
  if (pct >= 100 || !isEnabled) return "bg-red-500";
  if (pct >= 90) return "bg-amber-400";
  return "bg-green-500";
}

function renderAllocatedLeadsSection(leadsLoading: boolean, leads: OutreachLead[]) {
  if (leadsLoading) {
    return <Skeleton className="h-24 w-full" />;
  }
  if (leads.length === 0) {
    return <p className="text-sm text-t3">Niciun lead nu are acest telefon alocat.</p>;
  }
  return (
    <ul className="divide-y divide-s600">
      {leads.map((lead) => (
        <li key={lead.id} className="py-2 first:pt-0">
          <Link
            to={`/outreach/leads/${lead.id}`}
            className="flex justify-between text-sm hover:text-b5"
          >
            <span className="font-medium text-t1">{lead.company?.name ?? "—"}</span>
            <span className="text-t3">{lead.currentState}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Aliniat la `recentMessages` din răspunsul GET /phones/:id. */
type PhoneRecentMessageRow = {
  id: string;
  channel: string;
  direction: string;
  createdAt: string;
  contentPreview?: string | null;
  status: string;
};

function renderPhoneMessageHistory(messages: readonly PhoneRecentMessageRow[]) {
  if (messages.length === 0) {
    return <p className="text-sm text-t3">Niciun mesaj înregistrat pentru acest telefon.</p>;
  }
  return (
    <ul className="space-y-2 max-h-96 overflow-y-auto">
      {messages.map((m) => (
        <li key={m.id} className="rounded border border-s600 bg-s800/50 px-3 py-2 text-sm">
          <div className="flex justify-between text-xs text-t3">
            <span>
              {m.channel} · {m.direction}
            </span>
            <span>{new Date(m.createdAt).toLocaleString("ro-RO")}</span>
          </div>
          <p className="mt-1 text-t1 line-clamp-2">{m.contentPreview ?? "(fără preview)"}</p>
          <p className="text-xs text-t3 mt-0.5">{m.status}</p>
        </li>
      ))}
    </ul>
  );
}

export function PhoneDetail() {
  const { phoneId } = useParams<{ phoneId: string }>();
  const { data: phoneRes, isLoading: phoneLoading } = useOutreachPhone(phoneId);
  const { data: analyticsRes } = usePhoneAnalytics({ period: "30d", phoneId });
  const { data: leadsRes, isLoading: leadsLoading } = useOutreachLeads({
    assignedPhone: phoneId,
    limit: 50,
  });
  const { mutateAsync: healthCheck } = usePhoneHealthCheck();

  const phone = phoneRes?.data;
  const leads = leadsRes?.data ?? [];

  if (phoneLoading || !phoneId) {
    return (
      <PageWrapper title="Telefon">
        <Skeleton className="h-10 w-full max-w-md mb-4" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </PageWrapper>
    );
  }

  if (!phone) {
    return (
      <PageWrapper title="Telefon negăsit">
        <p className="text-t3">Telefonul nu există sau nu ai acces.</p>
        <Link to="/outreach/phones" className="text-b5 mt-4 inline-block">
          ← Înapoi la telefoane
        </Link>
      </PageWrapper>
    );
  }

  const cfg = STATUS_CONFIG[phone.status] ?? STATUS_CONFIG.OFFLINE;
  const pct = phone.quotaPercentage ?? 0;
  const barColor = quotaBarColorClass(pct, phone.isEnabled);
  const history = [...(phone.quotaHistory ?? [])].sort((a, b) =>
    a.usageDate.localeCompare(b.usageDate),
  );
  const maxMsgs = Math.max(1, ...history.map((d) => d.messagesSent));

  return (
    <PageWrapper title={phone.label}>
      <nav className="mb-4 flex flex-wrap gap-2 text-sm text-t3">
        <Link to="/outreach" className="hover:text-b5">
          Outreach
        </Link>
        <span>/</span>
        <Link to="/outreach/phones" className="hover:text-b5">
          Telefoane
        </Link>
        <span>/</span>
        <span className="text-t1">{phone.label}</span>
      </nav>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-t3">{phone.phoneNumber}</p>
          <p className={cn("text-sm font-medium", cfg.color)}>{cfg.label}</p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            className="rounded-md border border-s600 bg-s800 px-3 py-1.5 text-sm text-t1 hover:bg-s700"
            onClick={async () => {
              try {
                await healthCheck(phone.id);
                toast.success("Health check declanșat");
              } catch {
                toast.error("Eroare health check");
              }
            }}
          >
            Health check
          </button>
        </div>
      </div>

      <PhoneReputationDashboard phone={phone} phoneAnalytics={analyticsRes?.data ?? null} />

      <div className="grid gap-6 lg:grid-cols-2 mt-6">
        <Card>
          <CardBody className="p-5 space-y-4">
            <h2 className="text-lg font-semibold text-t1">Operațional</h2>
            <p className="text-xs text-t3 mb-2">
              Reputație și utilizare cotă: vezi panoul de mai sus. Aici: prioritate, ultim health
              check, bară cotă.
            </p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-t3">Prioritate</span>
                <p className="font-mono text-t1">{phone.priority}</p>
              </div>
              <div>
                <span className="text-t3">Ultim health check</span>
                <p className="text-t1 text-xs">
                  {phone.lastHealthCheckAt
                    ? new Date(phone.lastHealthCheckAt).toLocaleString("ro-RO")
                    : "—"}
                </p>
              </div>
            </div>
            <div>
              <div className="relative h-2 w-full overflow-hidden rounded-full bg-s600">
                <div
                  className={cn("h-full rounded-full transition-all", barColor)}
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-t3">{pct}% cotă contacte noi</p>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <h2 className="text-lg font-semibold text-t1 mb-4">Mesaje trimise (7 zile)</h2>
            {history.length === 0 ? (
              <p className="text-sm text-t3">Nu există încă date de utilizare.</p>
            ) : (
              <div className="flex h-40 items-end gap-1">
                {history.map((d) => (
                  <div
                    key={d.usageDate}
                    className="flex flex-1 flex-col items-center gap-1"
                    title={`${d.usageDate}: ${d.messagesSent} mesaje`}
                  >
                    <div
                      className="w-full min-w-[8px] rounded-t bg-b5/80"
                      style={{ height: `${Math.max(8, (d.messagesSent / maxMsgs) * 100)}%` }}
                    />
                    <span className="rotate-45 text-[9px] text-t3 origin-top-left whitespace-nowrap">
                      {d.usageDate.slice(5)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardBody className="p-5">
          <h2 className="text-lg font-semibold text-t1 mb-4">
            Lead-uri alocate ({leadsLoading ? "…" : leads.length})
          </h2>
          {renderAllocatedLeadsSection(leadsLoading, leads)}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardBody className="p-5">
          <h2 className="text-lg font-semibold text-t1 mb-4">Istoric mesaje (telefon)</h2>
          {renderPhoneMessageHistory(phone.recentMessages ?? [])}
        </CardBody>
      </Card>
    </PageWrapper>
  );
}
