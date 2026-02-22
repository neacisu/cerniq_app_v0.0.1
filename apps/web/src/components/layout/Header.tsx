import { Bell, Settings, User } from "lucide-react";
import { useLocation } from "react-router-dom";

export function Header() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1] ?? "dashboard";

  return (
    <header className="hdr">
      <div className="bc">
        <span>cerniq.app</span>
        <span className="t4">&gt;</span>
        <span className="bcc">{currentPage.replace(/-/g, " ")}</span>
      </div>

      <div className="flex ac g3">
        <button className="hb" aria-label="Notifications">
          <Bell size={18} />
          <span className="nd" />
        </button>
        <button className="hb" aria-label="Settings">
          <Settings size={18} />
        </button>
        <div className="av" style={{ width: 32, height: 32, fontSize: 10 }}>
          <User size={16} />
        </div>
      </div>
    </header>
  );
}
