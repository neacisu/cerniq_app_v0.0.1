import { Link } from "react-router-dom";

type BreadcrumbItem = {
  label: string;
  to?: string;
};

export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-[var(--color-t3)]">
        {items.map((item, idx) => (
          <li key={`${item.label}-${idx}`} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="hover:text-[var(--color-t1)]">
                {item.label}
              </Link>
            ) : (
              <span className="text-[var(--color-t1)]">{item.label}</span>
            )}
            {idx < items.length - 1 ? <span>/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
