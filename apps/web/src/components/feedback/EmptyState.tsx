import * as Icons from "lucide-react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({
  icon = "ClipboardList",
  title,
  description,
}: EmptyStateProps) {
  const IconComponent =
    (
      Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>
    )[icon] ?? Icons.ClipboardList;

  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
      <div className="w-12 h-12 rounded-xl bg-[oklch(.18_.018_255)] flex items-center justify-center text-[var(--color-t4)]">
        <IconComponent size={24} />
      </div>
      <h3 className="text-[15px] font-bold text-[var(--color-t2)] font-[var(--font-display)]">
        {title}
      </h3>
      {description && (
        <p className="text-[13px] text-[var(--color-t3)] max-w-[300px] leading-normal">
          {description}
        </p>
      )}
    </div>
  );
}
