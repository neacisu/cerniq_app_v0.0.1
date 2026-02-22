import { cn } from "@/lib/utils.js";

type MessageType = "out" | "in" | "ai" | "system";

interface ChatMessageProps {
  type: MessageType;
  content: string;
  timestamp?: string;
  sender?: string;
}

const typeStyles: Record<MessageType, string> = {
  out: "bg-[oklch(.70_.18_72/18%)] border border-[oklch(.70_.18_72/25%)] text-[var(--color-t1)] ml-auto rounded-br-[3px]",
  in: "bg-[oklch(.18_.018_255)] border border-[oklch(.24_.018_255)] text-[var(--color-t1)] rounded-bl-[3px]",
  ai: "bg-[oklch(.57_.20_245/12%)] border border-[oklch(.57_.20_245/25%)] text-[var(--color-t1)] rounded-bl-[3px]",
  system:
    "bg-[oklch(.60_.22_148/10%)] border border-dashed border-[oklch(.60_.22_148/30%)] text-[oklch(.70_.20_148)] text-[11.5px] px-3 py-[7px] rounded-lg mx-auto max-w-[80%] text-center",
};

export function ChatMessage({
  type,
  content,
  timestamp,
  sender,
}: ChatMessageProps) {
  return (
    <div
      className={cn(
        "max-w-[70%] px-[13px] py-[9px] rounded-xl text-[13px] leading-[1.45] mb-1.5",
        typeStyles[type],
      )}
    >
      {sender && type !== "system" && (
        <div className="text-[0.7rem] font-medium text-[var(--color-t3)] mb-1">
          {sender}
        </div>
      )}
      <div className="text-[var(--color-t1)]">{content}</div>
      {timestamp && (
        <div className="text-[0.65rem] text-[var(--color-t4)] mt-1">
          {timestamp}
        </div>
      )}
    </div>
  );
}
