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
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="p-4 rounded-full bg-[var(--color-s800)] mb-4">
        <IconComponent size={32} />
      </div>
      <h3 className="text-lg font-semibold text-[var(--color-t1)] mb-2">
        {title}
      </h3>
      {description && (
        <p className="text-sm text-[var(--color-t3)] max-w-md">{description}</p>
      )}
    </div>
  );
}
