import { useLocation, Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

export function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  return (
    <nav
      className="flex items-center gap-1 text-xs text-[var(--color-t3)] mb-4"
      aria-label="Breadcrumb"
    >
      <Link to="/" className="hover:text-[var(--color-t1)]">
        Home
      </Link>
      {segments.map((segment, i) => (
        <span key={segment} className="flex items-center gap-1">
          <ChevronRight size={12} />
          {i === segments.length - 1 ? (
            <span className="text-[var(--color-t1)] capitalize">
              {segment.replace(/-/g, " ")}
            </span>
          ) : (
            <Link
              to={`/${segments.slice(0, i + 1).join("/")}`}
              className="hover:text-[var(--color-t1)] capitalize"
            >
              {segment.replace(/-/g, " ")}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}
