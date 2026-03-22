import { useEffect, useState } from "react";

interface SlaTimerProps {
  readonly slaDueAt: string;
  readonly priority?: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "Expirat";
  const totalSeconds = Math.floor(ms / 1000);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function resolveSlaColorClass(
  isExpired: boolean,
  isUrgent: boolean,
  priority: NonNullable<SlaTimerProps["priority"]>,
): string {
  if (isExpired) {
    return "text-red-400 bg-red-900/20";
  }
  if (isUrgent || priority === "URGENT") {
    return "text-orange-400 bg-orange-900/20 animate-pulse";
  }
  if (priority === "HIGH") {
    return "text-yellow-400 bg-yellow-900/20";
  }
  return "text-t2 bg-s700";
}

export function SlaTimer({ slaDueAt, priority = "MEDIUM" }: Readonly<SlaTimerProps>) {
  const [remaining, setRemaining] = useState(() => new Date(slaDueAt).getTime() - Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(new Date(slaDueAt).getTime() - Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, [slaDueAt]);

  const isExpired = remaining <= 0;
  const isUrgent = remaining < 15 * 60 * 1000 && !isExpired;

  const colorClass = resolveSlaColorClass(isExpired, isUrgent, priority);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-mono font-medium ${colorClass}`}
      title={`SLA: ${new Date(slaDueAt).toLocaleString("ro-RO")}`}
    >
      {isExpired ? "⏰ Expirat" : `⏱ ${formatCountdown(remaining)}`}
    </span>
  );
}
