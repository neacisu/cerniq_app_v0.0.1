import { cn } from "@/lib/utils.js";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-md)] bg-[var(--color-s700)] animate-[shimmer_2s_infinite]",
        "bg-gradient-to-r from-[var(--color-s700)] via-[var(--color-s600)] to-[var(--color-s700)]",
        "bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
