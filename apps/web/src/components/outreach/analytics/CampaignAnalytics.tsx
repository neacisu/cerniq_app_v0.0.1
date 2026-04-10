/**
 * Metrici per campanie din tipul `OutreachCampaign` (sent, opens, replies, bounces).
 * „Delivery” nu există separat în tip — folosim raport trimise vs răspunsuri / deschideri ca proxy.
 */
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import type { OutreachCampaign } from "@/lib/etapa2-api.js";
import { cn } from "@/lib/utils.js";

export type CampaignAnalyticsProps = Readonly<{
  campaign: OutreachCampaign;
  className?: string;
}>;

function pct(part: number, total: number): string {
  if (total <= 0) return "0.0";
  return ((part / total) * 100).toFixed(1);
}

export function CampaignAnalytics(props: CampaignAnalyticsProps) {
  const { campaign, className } = props;
  const sent = Math.max(0, campaign.sent);
  const opens = Math.max(0, campaign.opens);
  const replies = Math.max(0, campaign.replies);
  const openRate = pct(opens, sent);
  const replyRate = pct(replies, sent);
  const bounceRate = campaign.bounceRate;

  const bars = [
    {
      label: "Open rate (deschideri / trimise)",
      pct: Number(openRate),
      color: "bg-[var(--color-in)]",
    },
    {
      label: "Reply rate (răspunsuri / trimise)",
      pct: Number(replyRate),
      color: "bg-[var(--color-ok)]",
    },
    {
      label: "Bounce rate (API)",
      pct: Math.min(100, bounceRate),
      color: "bg-[var(--color-er)]",
    },
  ];

  return (
    <Card className={cn(className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-t2">Analytics campanie</CardTitle>
      </CardHeader>
      <CardBody className="space-y-3 pt-0">
        <p className="text-[11px] text-t4">
          Baza: <code className="font-mono">OutreachCampaign</code> — nu include „delivered”
          separat; open/reply raportate la mesaje trimise.
        </p>
        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <div className="rounded-md bg-[var(--color-s800)] py-2">
            <div className="text-lg font-bold text-t1 tabular-nums">{sent}</div>
            <div className="text-t4">Trimise</div>
          </div>
          <div className="rounded-md bg-[var(--color-s800)] py-2">
            <div className="text-lg font-bold text-t1 tabular-nums">{opens}</div>
            <div className="text-t4">Deschideri</div>
          </div>
          <div className="rounded-md bg-[var(--color-s800)] py-2">
            <div className="text-lg font-bold text-t1 tabular-nums">{replies}</div>
            <div className="text-t4">Răspunsuri</div>
          </div>
        </div>
        <div className="space-y-2">
          {bars.map((b) => (
            <div key={b.label}>
              <div className="mb-0.5 flex justify-between text-[11px] text-t3">
                <span>{b.label}</span>
                <span className="tabular-nums text-t1">{b.pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-s700)]">
                <div
                  className={cn("h-full rounded-full transition-all", b.color)}
                  style={{ width: `${Math.min(100, b.pct)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}
