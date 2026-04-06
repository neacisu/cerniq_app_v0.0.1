import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import * as Icons from "lucide-react";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { getNavigationForRole } from "@/config/navigation-helpers.js";
import { mergeNavBadges } from "@/config/navigation-badge-merge.js";
import { useAuth } from "@/providers/auth-provider.js";
import { userAvatarInitials } from "@/lib/user-display.js";
import { useDashboardKpiStream } from "@/hooks/use-dashboard-kpi-stream.js";
import { fetchDashboardStats } from "@/lib/etapa1-api.js";
import { fetchReviewStats } from "@/lib/etapa2-api.js";
import { LIVE_QUERY } from "@/pages/dashboard/constants.js";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { sseConnected } = useDashboardKpiStream(true);

  const statsQuery = useQuery({
    queryKey: ["etapa1", "dashboard", "stats"],
    queryFn: fetchDashboardStats,
    refetchInterval: sseConnected ? false : LIVE_QUERY.refetchInterval,
    staleTime: LIVE_QUERY.staleTime,
    retry: LIVE_QUERY.retry,
  });

  const reviewStatsQuery = useQuery({
    queryKey: ["etapa2", "reviews", "stats"],
    queryFn: fetchReviewStats,
    refetchInterval: sseConnected ? false : LIVE_QUERY.refetchInterval,
    staleTime: LIVE_QUERY.staleTime,
    retry: LIVE_QUERY.retry,
  });

  const navigation = useMemo(() => {
    const base = getNavigationForRole(user?.role);
    const dash = statsQuery.data?.data;
    const hitlPending = Number(dash?.hitl?.pending ?? 0);
    const hitlOverdue = Number(dash?.hitl?.overdue ?? 0);
    const byStatus = reviewStatsQuery.data?.data?.byStatus;
    const reviewPending = Number(byStatus?.PENDING ?? 0);

    const badgeByPath: Partial<Record<string, { count: number; type: "danger" | "warning" }>> = {};
    if (hitlPending > 0) {
      badgeByPath["/approvals"] = {
        count: hitlPending,
        type: hitlOverdue > 0 ? "danger" : "warning",
      };
    }
    if (reviewPending > 0) {
      badgeByPath["/outreach/review"] = { count: reviewPending, type: "warning" };
    }
    return mergeNavBadges(base, badgeByPath);
  }, [user?.role, statsQuery.data, reviewStatsQuery.data]);

  return (
    <aside className={`sb${collapsed ? " col" : ""}`}>
      <div className="sbl">
        <CerniqLogo iconOnly={collapsed} size={28} />
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="hb" aria-label="Collapse sidebar">
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      <nav className="sbn" aria-label="Main navigation">
        {navigation.map((section) => (
          <div key={section.title} className="sbs">
            {!collapsed && <div className="sbsl">{section.title}</div>}
            {section.items.map((item) => {
              const IconComponent =
                (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[
                  item.icon
                ] ?? Icons.Circle;
              const isActive = location.pathname === item.path;

              return (
                <NavLink key={item.path} to={item.path} className={`ni${isActive ? " act" : ""}`}>
                  <IconComponent size={16} />
                  {!collapsed && (
                    <>
                      <span className="f1 trunc">{item.label}</span>
                      {item.badge && (
                        <span className={`nb ${item.badge.type === "danger" ? "dn" : "nw"}`}>
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

      <div className="sbu">
        {collapsed ? (
          <button
            onClick={() => setCollapsed(false)}
            className="hb"
            style={{ width: "100%", justifyContent: "center" }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        ) : (
          <>
            <div className="av">{userAvatarInitials(user)}</div>
            <div className="f1 mw0">
              <div className="t1 trunc" style={{ fontSize: 13, fontWeight: 500 }}>
                {user?.name ?? user?.email ?? "User"}
              </div>
              <div className="t3" style={{ fontSize: 10.5 }}>
                {user?.role ?? ""}
              </div>
            </div>
            <button
              className="hb"
              aria-label="Logout"
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              <LogOut size={14} />
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
