/**
 * Health WA: combină `WaPhone` (detaliu) cu rând opțional din `PhoneAnalytics` (agregat perioadă).
 */
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import type { PhoneAnalytics, WaPhone } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

export type PhoneReputationDashboardProps = Readonly<{
  phone: WaPhone;
  /** Din `usePhoneAnalytics({ phoneId, period })` — poate fi încă în încărcare */
  phoneAnalytics?: PhoneAnalytics | null;
  className?: string;
}>;

function banRiskLabel(
  phone: WaPhone,
  row?: { bounceRate?: number; status?: string },
): {
  level: "low" | "med" | "high";
  text: string;
} {
  if (phone.status === "BANNED") return { level: "high", text: "Telefon marcat BANNED" };
  const br = row?.bounceRate ?? 0;
  if (br >= 20) return { level: "high", text: `Bounce rate ridicat (${br.toFixed(1)}%)` };
  if (br >= 8) return { level: "med", text: `Bounce rate moderat (${br.toFixed(1)}%)` };
  const pct = phone.quotaPercentage ?? 0;
  if (pct >= 95) return { level: "med", text: "Cotă aproape plină — risc de limitare" };
  return { level: "low", text: "Profil stabil pentru volumul curent" };
}

export function PhoneReputationDashboard({
  phone,
  phoneAnalytics,
  className,
}: PhoneReputationDashboardProps) {
  const row = phoneAnalytics?.phones?.find((p) => p.id === phone.id);
  const risk = banRiskLabel(phone, row);

  return (
    <Card className={cn(className)}>
      <CardHeader>
        <CardTitle className="text-base">Reputație & sănătate WA</CardTitle>
        <p className="text-xs text-t3">
          Detaliu: <code className="font-mono">GET /outreach/phones/:id</code>
          {phoneAnalytics ? (
            <>
              {" "}
              · Agregat: <code className="font-mono">GET /outreach/analytics/phones</code>
            </>
          ) : null}
        </p>
      </CardHeader>
      <CardBody className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-[var(--color-s700)] p-3">
          <div className="text-xs text-t3">Reputație (telefon)</div>
          <div className="text-2xl font-semibold tabular-nums text-[var(--color-b5)]">
            {phone.reputationScore}
          </div>
        </div>
        <div className="rounded-lg border border-[var(--color-s700)] p-3">
          <div className="text-xs text-t3">Utilizare cotă azi</div>
          <div className="text-lg font-medium text-t1 tabular-nums">
            {phone.currentUsage ?? 0} / {phone.dailyQuotaLimit}{" "}
            <span className="text-sm text-t3">({phone.quotaPercentage ?? 0}%)</span>
          </div>
        </div>
        {row ? (
          <>
            <div className="rounded-lg border border-[var(--color-s700)] p-3">
              <div className="text-xs text-t3">Mesaje trimise (perioadă analytics)</div>
              <div className="text-xl font-semibold tabular-nums">{row.messagesSent}</div>
            </div>
            <div className="rounded-lg border border-[var(--color-s700)] p-3">
              <div className="text-xs text-t3">Reply rate (analytics)</div>
              <div className="text-xl font-semibold tabular-nums">
                {(row.replyRate * 100).toFixed(1)}%
              </div>
            </div>
          </>
        ) : (
          <div className="sm:col-span-2 rounded-lg border border-dashed border-[var(--color-s600)] p-3 text-sm text-t3">
            Fără rând în PhoneAnalytics pentru acest ID în perioada curentă — încarcă{" "}
            <code className="font-mono">usePhoneAnalytics</code> cu același{" "}
            <code className="font-mono">phoneId</code>.
          </div>
        )}
        <div
          className={cn(
            "sm:col-span-2 rounded-lg border p-3",
            risk.level === "high" && "border-er/50 bg-er/10",
            risk.level === "med" && "border-[var(--color-wa)]/40 bg-[var(--color-wa)]/5",
            risk.level === "low" && "border-[var(--color-ok)]/30 bg-[var(--color-ok)]/5",
          )}
        >
          <div className="text-xs font-medium text-t3">Indicator risc (euristică UI)</div>
          <p className="mt-1 text-sm text-t1">{risk.text}</p>
        </div>
      </CardBody>
    </Card>
  );
}
