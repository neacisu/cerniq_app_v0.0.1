import { StatusDot } from "@/components/data/StatusDot.js";

type FeedItem = {
  status: "info" | "warning" | "error" | "success";
  text: string;
  time: string;
};

export function ActivityFeed({ items }: { items: FeedItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-[var(--color-t3)]">Nu exista activitate recenta.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={`${item.time}-${idx}`} className="flex items-center gap-3 text-sm">
          <StatusDot status={item.status === "success" ? "ok" : item.status} />
          <span className="flex-1 text-[var(--color-t1)]">{item.text}</span>
          <span className="text-xs text-[var(--color-t3)]">{item.time}</span>
        </div>
      ))}
    </div>
  );
}
