import { cn } from "@/lib/utils.js";

export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  return (
    <div
      className={cn(
        "bg-[var(--color-s700)]",
        orientation === "horizontal" ? "h-px w-full" : "w-px h-full",
        className,
      )}
      role="separator"
    />
  );
}
