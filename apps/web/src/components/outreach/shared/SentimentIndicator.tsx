import { cn } from "@/lib/utils.js";

type Variant = "icon" | "bar" | "compact";

interface SentimentIndicatorProps {
  readonly score: number | null;
  readonly showLabel?: boolean;
  readonly showScore?: boolean;
  readonly variant?: Variant;
  readonly className?: string;
}

function getSentimentConfig(score: number | null) {
  if (score === null)
    return { label: "Necunoscut", icon: "–", colorClass: "text-gray-400", barColor: "bg-gray-600" };
  if (score >= 50)
    return { label: "Pozitiv", icon: "👍", colorClass: "text-green-400", barColor: "bg-green-500" };
  if (score >= 0)
    return { label: "Neutru", icon: "–", colorClass: "text-yellow-400", barColor: "bg-yellow-500" };
  if (score >= -50)
    return {
      label: "Negativ",
      icon: "👎",
      colorClass: "text-orange-400",
      barColor: "bg-orange-500",
    };
  return { label: "Foarte Negativ", icon: "⚠", colorClass: "text-red-400", barColor: "bg-red-500" };
}

function normalizeScore(score: number | null): number {
  if (score === null) return 50;
  return Math.round(((score + 100) / 200) * 100);
}

function formatSignedScore(value: number): string {
  if (value > 0) {
    return `+${String(value)}`;
  }
  return String(value);
}

function sentimentTooltipTitle(label: string, score: number | null): string {
  if (score === null) {
    return label;
  }
  return `${label} (${String(score)})`;
}

export function SentimentIndicator({
  score,
  showLabel = false,
  showScore = false,
  variant = "icon",
  className,
}: Readonly<SentimentIndicatorProps>) {
  const config = getSentimentConfig(score);

  if (variant === "bar") {
    const pct = normalizeScore(score);
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="flex-1 h-1.5 bg-s700 rounded-full overflow-hidden">
          <div
            className={cn("h-full rounded-full", config.barColor)}
            style={{ width: `${pct}%` }}
          />
        </div>
        {showLabel && <span className={cn("text-xs", config.colorClass)}>{config.label}</span>}
        {showScore && score !== null && (
          <span className={cn("text-xs font-mono", config.colorClass)}>
            {formatSignedScore(score)}
          </span>
        )}
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <span
        className={cn("inline-flex items-center gap-0.5 text-xs", config.colorClass, className)}
      >
        {config.icon}
        {showScore && score !== null && (
          <span className="font-mono">{formatSignedScore(score)}</span>
        )}
      </span>
    );
  }

  return (
    <span
      className={cn("inline-flex items-center gap-1 text-sm", config.colorClass, className)}
      title={sentimentTooltipTitle(config.label, score)}
    >
      <span>{config.icon}</span>
      {showLabel && <span className="text-xs">{config.label}</span>}
      {showScore && score !== null && (
        <span className="text-xs font-mono">{formatSignedScore(score)}</span>
      )}
    </span>
  );
}
