import { Bell, Settings, User } from "lucide-react";
import { useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1] ?? "dashboard";

  return (
    <header className="h-14 border-b border-[var(--color-s700)] bg-[var(--color-s900)]/80 backdrop-blur-[20px] px-6 flex items-center justify-between sticky top-0 z-[var(--z-sticky)]">
      <div className="flex items-center gap-2 text-sm">
        <span className="text-[var(--color-t3)]">cerniq.app</span>
        <span className="text-[var(--color-t4)]">&gt;</span>
        <span className="text-[var(--color-t1)] capitalize">
          {currentPage.replace(/-/g, " ")}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <button
          className="relative p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-s800)] transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} className="text-[var(--color-t2)]" />
          <span className="absolute top-1.5 right-1.5 w-[7px] h-[7px] rounded-full bg-[var(--color-er)]" />
        </button>
        <button
          className="p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-s800)] transition-colors"
          aria-label="Settings"
        >
          <Settings size={18} className="text-[var(--color-t2)]" />
        </button>
        <div className="w-8 h-8 rounded-full bg-[var(--color-b5)]/20 flex items-center justify-center">
          <User size={16} className="text-[var(--color-b5)]" />
        </div>
      </div>
    </header>
  );
}
