import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge.js";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card.js";
import type { ActivityEventType, ActivityFeedItem } from "@/hooks/use-etapa4.js";

const badgeTone: Record<
  ActivityEventType,
  { label: string; variant: "brand" | "ok" | "info" | "warning" }
> = {
  PAYMENT: { label: "PAYMENT", variant: "brand" },
  CREDIT: { label: "CREDIT", variant: "ok" },
  LOGISTICS: { label: "LOGISTICS", variant: "info" },
  RETURN: { label: "RETURN", variant: "warning" },
};

type Props = Readonly<{
  items: readonly ActivityFeedItem[];
  isLoading?: boolean;
}>;

function formatEventTime(iso: string | undefined): string {
  if (iso === undefined || iso === "") return "—";
  return new Date(iso).toLocaleString("ro-RO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function ActivityFeedList({ items }: Readonly<{ items: readonly ActivityFeedItem[] }>) {
  return (
    <ul
      className="max-h-[420px] overflow-y-auto divide-y divide-s800"
      aria-label="Flux activitate post-vânzare"
    >
      {items.map((ev) => {
        const b = badgeTone[ev.type];
        const time = formatEventTime(ev.at);
        return (
          <li key={ev.id} className="px-4 py-3 flex gap-3 items-start">
            <Badge variant={b.variant} className="shrink-0">
              {b.label}
            </Badge>
            <div className="min-w-0 flex-1">
              <div className="text-sm text-t1 font-medium leading-snug">{ev.title}</div>
              <div className="text-xs text-t3 mt-0.5">{ev.subtitle}</div>
            </div>
            <time className="shrink-0 text-[10px] text-t4 font-mono mt-0.5">{time}</time>
          </li>
        );
      })}
    </ul>
  );
}

export function PaymentActivityFeed({ items, isLoading }: Props) {
  let body: ReactNode;
  if (isLoading === true) {
    body = <p className="px-4 py-6 text-sm text-t3">Se încarcă evenimente…</p>;
  } else if (items.length === 0) {
    body = (
      <p className="px-4 py-6 text-sm text-t3">Nu există evenimente în ultimele liste încărcate.</p>
    );
  } else {
    body = <ActivityFeedList items={items} />;
  }

  return (
    <Card className="min-h-[320px]">
      <CardHeader>
        <CardTitle>Activitate recentă (E4)</CardTitle>
      </CardHeader>
      <CardBody className="p-0">{body}</CardBody>
    </Card>
  );
}
