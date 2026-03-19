import { Link } from "react-router-dom";

type BreadcrumbItem = {
  readonly label: string;
  readonly to?: string;
};

export function Breadcrumbs({ items }: { readonly items: readonly BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-2 text-xs text-t3">
        {items.map((item, idx) => (
          <li key={`${item.to ?? "current"}-${item.label}`} className="flex items-center gap-2">
            {item.to ? (
              <Link to={item.to} className="hover:text-t1">
                {item.label}
              </Link>
            ) : (
              <span className="text-t1">{item.label}</span>
            )}
            {idx < items.length - 1 ? <span>/</span> : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
