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
        "border-none m-0",
        orientation === "horizontal"
          ? "h-0 w-full border-t border-[oklch(.22_.018_255/60%)]"
          : "w-0 h-full border-l border-[oklch(.22_.018_255/60%)]",
        className,
      )}
      role="separator"
    />
  );
}
