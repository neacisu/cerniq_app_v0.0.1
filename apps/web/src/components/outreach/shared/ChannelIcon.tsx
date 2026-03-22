import { cn } from "@/lib/utils";
import type { LeadChannel } from "@/lib/etapa2-api";

const CHANNEL_CONFIG: Record<LeadChannel, { label: string; icon: string; colorClass: string }> = {
  WHATSAPP: { label: "WhatsApp", icon: "💬", colorClass: "text-green-400" },
  EMAIL_COLD: { label: "Email Cold", icon: "✉", colorClass: "text-blue-400" },
  EMAIL_WARM: { label: "Email Cald", icon: "📧", colorClass: "text-amber-400" },
  PHONE: { label: "Telefon", icon: "📞", colorClass: "text-purple-400" },
  MANUAL: { label: "Manual", icon: "✋", colorClass: "text-gray-400" },
};

const SIZE_CLASSES = {
  xs: "text-[10px]",
  sm: "text-xs",
  default: "text-sm",
  lg: "text-base",
};

interface ChannelIconProps {
  readonly channel: LeadChannel;
  readonly size?: "xs" | "sm" | "default" | "lg";
  readonly showTooltip?: boolean;
  readonly className?: string;
}

export function ChannelIcon({
  channel,
  size = "default",
  showTooltip = true,
  className,
}: Readonly<ChannelIconProps>) {
  const config = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.MANUAL;
  const iconClassName = cn(
    "inline-flex items-center gap-1",
    SIZE_CLASSES[size],
    config.colorClass,
    className,
  );
  return (
    <span className={iconClassName} title={showTooltip ? config.label : undefined}>
      {config.icon}
    </span>
  );
}

export function ChannelBadge({
  channel,
  size = "default",
  className,
}: Readonly<Omit<ChannelIconProps, "showTooltip">>) {
  const config = CHANNEL_CONFIG[channel] ?? CHANNEL_CONFIG.MANUAL;
  const badgeClassName = cn(
    "inline-flex items-center gap-1 rounded px-2 py-0.5 bg-s700 font-medium",
    SIZE_CLASSES[size],
    config.colorClass,
    className,
  );
  return (
    <span className={badgeClassName}>
      <span>{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}
