import { cn } from "@/lib/utils.js";

export function Separator({
  className,
  orientation = "horizontal",
}: {
  className?: string;
  orientation?: "horizontal" | "vertical";
}) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("h-full", className)}
        style={{
          width: 0,
          borderLeft: "1px solid oklch(0.22 0.018 255 / 60%)",
        }}
        role="separator"
      />
    );
  }
  return <hr className={cn("div", className)} />;
}
