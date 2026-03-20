import { useState } from "react";
import { Button } from "@/components/ui/index.js";
import { useOutreachSettings, usePatchOutreachSettings } from "@/hooks/use-etapa2.js";
import type { OutreachSettings } from "@/lib/etapa2-api.js";
import { toast } from "sonner";

export function OutreachSettingsPage() {
  const { data, isLoading } = useOutreachSettings();
  const s = data?.data;

  if (isLoading || !s) {
    return <div className="p-6 text-t2 text-sm">Se încarcă setările outreach…</div>;
  }

  /** Remontare când serverul trimite un nou snapshot (ex. după PATCH + invalidare) — fără useEffect + setState. */
  return <OutreachSettingsForm key={s.updatedAt} initial={s} />;
}

type OutreachSettingsFormProps = {
  readonly initial: OutreachSettings;
};

function OutreachSettingsForm({ initial }: OutreachSettingsFormProps) {
  const patch = usePatchOutreachSettings();

  const [businessHoursStart, setBusinessHoursStart] = useState(initial.businessHoursStart);
  const [businessHoursEnd, setBusinessHoursEnd] = useState(initial.businessHoursEnd);
  const [timezone, setTimezone] = useState(initial.timezone);
  const [dailyQuotaLimit, setDailyQuotaLimit] = useState(initial.dailyQuotaLimit);
  const [followupQuotaLimit, setFollowupQuotaLimit] = useState(initial.followupQuotaLimit);
  const [emailSignature, setEmailSignature] = useState(initial.emailSignature ?? "");
  const [waReplyTimeoutMinutes, setWaReplyTimeoutMinutes] = useState(initial.waReplyTimeoutMinutes);

  const handleSave = async () => {
    try {
      await patch.mutateAsync({
        businessHoursStart,
        businessHoursEnd,
        timezone,
        dailyQuotaLimit,
        followupQuotaLimit,
        emailSignature: emailSignature.trim() || null,
        waReplyTimeoutMinutes,
      });
      toast.success("Setări salvate");
    } catch {
      toast.error("Nu s-au putut salva setările");
    }
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-t1">Setări Outreach</h1>
        <p className="text-sm text-t3 mt-1">
          Ore program, fus orar, limite quota și semnătură email (per tenant).
        </p>
      </div>

      <div className="grid gap-4 rounded-lg border border-s600 bg-s850 p-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Oră start program (0–23)</span>
          <input
            type="number"
            min={0}
            max={23}
            value={businessHoursStart}
            onChange={(e) => setBusinessHoursStart(Number(e.target.value))}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Oră sfârșit program (0–24)</span>
          <input
            type="number"
            min={0}
            max={24}
            value={businessHoursEnd}
            onChange={(e) => setBusinessHoursEnd(Number(e.target.value))}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Fus orar (IANA)</span>
          <input
            type="text"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Limită contacte noi / zi (telefon)</span>
          <input
            type="number"
            min={1}
            value={dailyQuotaLimit}
            onChange={(e) => setDailyQuotaLimit(Number(e.target.value))}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Limită follow-up / zi (telefon)</span>
          <input
            type="number"
            min={1}
            value={followupQuotaLimit}
            onChange={(e) => setFollowupQuotaLimit(Number(e.target.value))}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Timeout răspuns WA (minute)</span>
          <input
            type="number"
            min={1}
            value={waReplyTimeoutMinutes}
            onChange={(e) => setWaReplyTimeoutMinutes(Number(e.target.value))}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-t3">Semnătură email (HTML simplu)</span>
          <textarea
            rows={4}
            value={emailSignature}
            onChange={(e) => setEmailSignature(e.target.value)}
            className="rounded-md border border-s600 bg-s700 px-3 py-2 text-t1 font-mono text-xs"
          />
        </label>
      </div>

      <Button onClick={() => void handleSave()} disabled={patch.isPending}>
        {patch.isPending ? "Se salvează…" : "Salvează"}
      </Button>
    </div>
  );
}
