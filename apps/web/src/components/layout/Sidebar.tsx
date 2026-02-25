import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, LogOut } from "lucide-react";
import * as Icons from "lucide-react";
import { CerniqLogo } from "@/components/brand/CerniqLogo.js";
import { navigation } from "@/config/navigation.js";
import { useAuth } from "@/providers/auth-provider.js";

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

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
        {!collapsed ? (
          <>
            <div className="av">AD</div>
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
        ) : (
          <button
            onClick={() => setCollapsed(false)}
            className="hb"
            style={{ width: "100%", justifyContent: "center" }}
            aria-label="Expand sidebar"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </aside>
  );
}
