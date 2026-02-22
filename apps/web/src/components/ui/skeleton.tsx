import { cn } from "@/lib/utils.js";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-[6px] bg-[var(--color-s700)] animate-[shimmer_1.8s_infinite]",
        "bg-gradient-to-r from-[var(--color-s700)] via-[var(--color-s600)] to-[var(--color-s700)]",
        "bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
