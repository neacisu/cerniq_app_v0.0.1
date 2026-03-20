import { cn } from "@/lib/utils.js";

type SpinnerProps = Readonly<{
  className?: string;
  size?: number;
  label?: string;
}>;

export function Spinner({ className, size = 20, label = "Loading" }: SpinnerProps) {
  const accessibleLabel = label.trim() || "Loading";

  return (
    <output className="inline-grid place-items-center" aria-busy="true" aria-live="polite">
      <span
        aria-hidden="true"
        className={cn(
          "block animate-spin rounded-full border-2 border-s600 border-t-b5",
          className,
        )}
        style={{ width: size, height: size }}
      />
      <span className="sr-only">{accessibleLabel}</span>
    </output>
  );
}
