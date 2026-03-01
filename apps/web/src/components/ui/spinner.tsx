import { cn } from "@/lib/utils.js";

export function Spinner({ className, size = 20 }: { className?: string; size?: number }) {
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-[var(--color-s600)] border-t-[var(--color-b5)]",
        className,
      )}
      style={{ width: size, height: size }}
      role="status"
      aria-label="Loading"
    />
  );
}
