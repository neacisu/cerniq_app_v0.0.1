import { cn } from "@/lib/utils";
import type { MessageDirection, MessageStatus, LeadChannel } from "@/lib/etapa2-api";
import { ChannelIcon } from "@/components/outreach/shared/ChannelIcon";

const STATUS_CONFIG: Record<MessageStatus, { icon: string; colorClass: string; label: string }> = {
  QUEUED: { icon: "🕐", colorClass: "text-gray-400", label: "În coadă" },
  SENT: { icon: "✓", colorClass: "text-gray-400", label: "Trimis" },
  DELIVERED: { icon: "✓✓", colorClass: "text-gray-400", label: "Livrat" },
  READ: { icon: "✓✓", colorClass: "text-blue-400", label: "Citit" },
  REPLIED: { icon: "↩✓✓", colorClass: "text-green-400", label: "Răspuns primit" },
  OPENED: { icon: "👁", colorClass: "text-blue-400", label: "Deschis" },
  BOUNCED: { icon: "⚠", colorClass: "text-red-400", label: "Respins" },
  FAILED: { icon: "✗", colorClass: "text-red-400", label: "Eșuat" },
};

interface MessageStatusIconProps {
  readonly status: MessageStatus;
  readonly className?: string;
}

export function MessageStatusIcon({ status, className }: Readonly<MessageStatusIconProps>) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.SENT;
  return (
    <span className={cn("text-xs", config.colorClass, className)} title={config.label}>
      {config.icon}
    </span>
  );
}

interface MessageBubbleProps {
  readonly direction: MessageDirection;
  readonly content: string | null;
  readonly channel: LeadChannel;
  readonly status?: MessageStatus;
  readonly timestamp: string;
  readonly templateName?: string;
  readonly isAI?: boolean;
  readonly className?: string;
}

function bubbleAvatarGlyph(isOutbound: boolean, isAI: boolean): string {
  if (!isOutbound) {
    return "👤";
  }
  return isAI ? "🤖" : "👤";
}

export function MessageBubble({
  direction,
  content,
  channel,
  status,
  timestamp,
  templateName,
  isAI = false,
  className,
}: Readonly<MessageBubbleProps>) {
  const isOutbound = direction === "OUTBOUND";
  const avatarGlyph = bubbleAvatarGlyph(isOutbound, isAI);
  const ts = new Date(timestamp).toLocaleTimeString("ro-RO", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div
      className={cn(
        "flex items-end gap-2 max-w-[80%]",
        isOutbound ? "ml-auto flex-row-reverse" : "mr-auto",
        className,
      )}
    >
      <div
        className={cn(
          "w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0",
          isOutbound ? "bg-b5/20 text-b5" : "bg-s700 text-t2",
        )}
      >
        {avatarGlyph}
      </div>
      <div
        className={cn(
          "rounded-lg px-3 py-2 text-sm max-w-full",
          isOutbound ? "bg-b5/20 text-t1 rounded-br-none" : "bg-s700 text-t1 rounded-bl-none",
        )}
      >
        {templateName && <p className="text-[10px] text-t3 mb-1 italic">{templateName}</p>}
        <div className="flex items-start gap-1">
          <ChannelIcon channel={channel} size="xs" />
          <p className="break-words">{content ?? "(fără conținut)"}</p>
        </div>
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className="text-[10px] text-t3">{ts}</span>
          {isOutbound && status && <MessageStatusIcon status={status} />}
          {isAI && <span className="text-[10px] text-blue-400">AI</span>}
        </div>
      </div>
    </div>
  );
}
