type MessageType = "outgoing" | "incoming" | "system" | "ai";

const typeClass: Record<MessageType, string> = {
  outgoing: "mb mo",
  incoming: "mb mi",
  system: "ms",
  ai: "mb mai",
};

interface ChatMessageProps {
  type: MessageType;
  children: React.ReactNode;
  timestamp?: string;
}

export function ChatMessage({ type, children, timestamp }: ChatMessageProps) {
  return (
    <div className={typeClass[type]}>
      <div>{children}</div>
      {timestamp && (
        <div className="t3" style={{ fontSize: 10, marginTop: 4 }}>
          {timestamp}
        </div>
      )}
    </div>
  );
}
