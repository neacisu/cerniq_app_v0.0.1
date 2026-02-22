import { cn } from "@/lib/utils.js";

type MessageType = "out" | "in" | "ai" | "system";

interface ChatMessageProps {
  type: MessageType;
  content: string;
  timestamp?: string;
  sender?: string;
}

const typeStyles: Record<MessageType, string> = {
  out: "bg-[var(--color-b5)]/20 border-[var(--color-b5)]/30 ml-8",
  in: "bg-[var(--color-s800)] border-[var(--color-s600)] mr-8",
  ai: "bg-[var(--color-in)]/10 border-[var(--color-in)]/30 mr-8",
  system:
    "bg-[var(--color-s800)]/50 border-[var(--color-s700)] mx-auto max-w-[80%] text-center text-xs italic",
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
        "p-3 rounded-[var(--radius-md)] border text-sm",
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
