import { Activity, Settings, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/auth-provider.js";
import { userAvatarInitials } from "@/lib/user-display.js";
import { NotificationBell } from "./NotificationBell.js";

export type HeaderProps = {
  /** Număr procese active (background); afișat ca badge pe butonul de panel. */
  activeBackgroundProcessCount?: number;
  /** Deschide panoul procese în fundal (furnizat de AppLayout). */
  onOpenBackgroundProcesses?: () => void;
};

export function Header({
  activeBackgroundProcessCount = 0,
  onOpenBackgroundProcesses,
}: HeaderProps = {}) {
  const location = useLocation();
  const navigate = useNavigate();
  const pathSegments = location.pathname.split("/").filter(Boolean);
  const currentPage = pathSegments[pathSegments.length - 1] ?? "dashboard";

  const { user } = useAuth();

  return (
    <header className="hdr">
      <div className="bc">
        <span>cerniq.app</span>
        <span className="t4">{">"}</span>
        <span className="bcc">{currentPage.replaceAll("-", " ")}</span>
      </div>

      <div className="flex ac g3">
        <NotificationBell />

        {onOpenBackgroundProcesses ? (
          <div className="relative">
            <button
              type="button"
              className="hb"
              aria-label="Procese în fundal"
              title="Procese în fundal (import, cozi, AI)"
              onClick={onOpenBackgroundProcesses}
            >
              <Activity size={18} />
              {activeBackgroundProcessCount > 0 ? (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full bg-sky-600 text-[10px] text-white flex items-center justify-center">
                  {activeBackgroundProcessCount > 99 ? "99+" : activeBackgroundProcessCount}
                </span>
              ) : null}
            </button>
          </div>
        ) : null}

        <button
          className="hb"
          aria-label="Settings"
          onClick={() => navigate("/settings")}
          type="button"
        >
          <Settings size={18} />
        </button>

        <div
          className="av"
          style={{ width: 32, height: 32, fontSize: 10 }}
          title={user?.name ?? user?.email ?? undefined}
          aria-label={user?.name ?? user?.email ?? "Profil utilizator"}
        >
          {user ? userAvatarInitials(user) : <User size={16} />}
        </div>
      </div>
    </header>
  );
}
