import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import * as Icons from "lucide-react";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { navigation } from "@/config/navigation.js";
import { cn } from "@/lib/utils.js";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <aside
      className={cn(
        "h-screen flex flex-col border-r border-[var(--color-s700)] bg-[var(--color-s900)] transition-all duration-300",
        collapsed ? "w-16" : "w-60",
      )}
      style={{ transitionTimingFunction: "cubic-bezier(.4,0,.2,1)" }}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-[var(--color-s700)]">
        <CerniqLogo iconOnly={collapsed} size={28} />
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 overflow-y-auto py-3 px-2"
        aria-label="Main navigation"
      >
        {navigation.map((section) => (
          <div key={section.title} className="mb-4">
            {!collapsed && (
              <div className="px-3 py-1 text-[0.6rem] uppercase tracking-widest text-[var(--color-t4)] font-medium">
                {section.title}
              </div>
            )}
            {section.items.map((item) => {
              const IconComponent =
                (
                  Icons as unknown as Record<
                    string,
                    React.ComponentType<{ size?: number }>
                  >
                )[item.icon] ?? Icons.Circle;
              const isActive = location.pathname === item.path;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-[var(--radius-md)] text-sm transition-colors duration-150 relative",
                    isActive
                      ? "bg-[var(--color-b5)]/10 text-[var(--color-b5)]"
                      : "text-[var(--color-t2)] hover:bg-[var(--color-s800)] hover:text-[var(--color-t1)]",
                  )}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-[var(--color-b5)]" />
                  )}
                  <IconComponent size={18} />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate">{item.label}</span>
                      {item.badge && (
                        <span
                          className={cn(
                            "min-w-[20px] h-5 flex items-center justify-center rounded-full text-[0.65rem] font-bold px-1.5",
                            item.badge.type === "danger"
                              ? "bg-[var(--color-er)] text-white"
                              : "bg-[var(--color-wa)]/20 text-[var(--color-wa)] animate-[glow_2s_infinite]",
                          )}
                        >
                          {item.badge.count}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              );
            })}
          </div>
        ))}
      </nav>

      {/* User zone */}
      <div className="border-t border-[var(--color-s700)] p-3">
        {!collapsed && (
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-[var(--color-b5)]/20 flex items-center justify-center text-xs font-bold text-[var(--color-b5)]">
              AD
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-[var(--color-t1)] truncate">
                Admin Demo
              </div>
              <div className="text-[0.65rem] text-[var(--color-t3)]">owner</div>
            </div>
            <button
              className="p-1 rounded hover:bg-[var(--color-s800)]"
              aria-label="Logout"
            >
              <LogOut size={14} className="text-[var(--color-t3)]" />
            </button>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center p-2 rounded-[var(--radius-md)] hover:bg-[var(--color-s800)] text-[var(--color-t3)] transition-colors"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  );
}
