import { StatusDot } from "@/components/data/StatusDot.js";

type FeedItem = {
  status: "info" | "warning" | "error" | "success";
  text: string;
  time: string;
};

type ActivityFeedProps = Readonly<{
  items: readonly FeedItem[];
}>;

export function ActivityFeed({ items }: ActivityFeedProps) {
  if (items.length === 0) {
    return <p className="text-sm text-t3">Nu exista activitate recenta.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div
          key={`${item.time}-${item.status}-${item.text}`}
          className="flex items-center gap-3 text-sm"
        >
          <StatusDot status={item.status === "success" ? "ok" : item.status} />
          <span className="flex-1 text-t1">{item.text}</span>
          <span className="text-xs text-t3">{item.time}</span>
        </div>
      ))}
    </div>
  );
}
