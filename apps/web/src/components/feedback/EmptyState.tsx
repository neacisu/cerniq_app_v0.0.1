import * as Icons from "lucide-react";

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
}

export function EmptyState({ icon = "ClipboardList", title, description }: EmptyStateProps) {
  const IconComponent =
    (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[icon] ??
    Icons.ClipboardList;

  return (
    <div className="emp">
      <div className="epi">
        <IconComponent size={24} />
      </div>
      <div className="ept">{title}</div>
      {description && <div className="epd">{description}</div>}
    </div>
  );
}
