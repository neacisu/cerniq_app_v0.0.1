import { useRef, useEffect } from "react";
import { MessageBubble } from "./MessageBubble";
import type { CommunicationLog } from "@/lib/etapa2-api";
import { cn } from "@/lib/utils";

interface ConversationTimelineProps {
  readonly messages: readonly CommunicationLog[];
  readonly isLoading?: boolean;
  readonly autoScroll?: boolean;
}

/** Skeleton rows alternate alignment fără `key={index}` sau template în `className`. */
const TIMELINE_LOADING_PLACEHOLDERS = [
  { key: "timeline-sk-start", justify: "justify-start" as const },
  { key: "timeline-sk-end", justify: "justify-end" as const },
  { key: "timeline-sk-start-2", justify: "justify-start" as const },
];

const TIMELINE_SCROLL_CONTAINER_CLASS = "space-y-1 p-4";
const TIMELINE_EMPTY_STATE_CLASS = "flex flex-col items-center justify-center py-12 text-t3";
const TIMELINE_LOADING_WRAPPER_CLASS = "space-y-4 p-4";
const TIMELINE_SKELETON_BAR_CLASS = "h-10 w-48 animate-pulse rounded-lg bg-s700";

function formatTimelineDayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString("ro-RO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

export function ConversationTimeline({
  messages,
  isLoading,
  autoScroll = true,
}: Readonly<ConversationTimelineProps>) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, autoScroll]);

  if (isLoading) {
    return (
      <div className={TIMELINE_LOADING_WRAPPER_CLASS}>
        {TIMELINE_LOADING_PLACEHOLDERS.map(({ key, justify }) => (
          <div key={key} className={cn("flex", justify)}>
            <div className={TIMELINE_SKELETON_BAR_CLASS} />
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className={TIMELINE_EMPTY_STATE_CLASS}>
        <p className="text-sm">Nicio comunicare înregistrată</p>
      </div>
    );
  }

  return (
    <div className={TIMELINE_SCROLL_CONTAINER_CLASS}>
      {messages.map((msg, index) => {
        const msgDate = formatTimelineDayLabel(msg.createdAt);
        const prev = index > 0 ? messages[index - 1] : undefined;
        const prevDate = prev ? formatTimelineDayLabel(prev.createdAt) : null;
        const showDateDivider = prevDate === null || msgDate !== prevDate;

        return (
          <div key={msg.id}>
            {showDateDivider && (
              <div className="my-3 flex items-center gap-2">
                <div className="h-px flex-1 bg-s700" />
                <span className="text-[11px] text-t3">{msgDate}</span>
                <div className="h-px flex-1 bg-s700" />
              </div>
            )}
            <MessageBubble
              direction={msg.direction}
              content={msg.contentPreview ?? "(conținut indisponibil)"}
              channel={msg.channel}
              status={msg.status}
              timestamp={msg.createdAt}
            />
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
